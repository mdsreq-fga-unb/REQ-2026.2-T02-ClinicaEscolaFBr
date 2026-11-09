import {
  Controller,
  Get,
  Global,
  INestApplication,
  Module,
  UseGuards,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { eq, sql } from 'drizzle-orm';
import request from 'supertest';
import {
  auditoria,
  codigosVerificacao,
  inscricoes,
  limitesCodigoVerificacao,
  verificacoesIdentidade,
  type Db,
} from '@clinica/database';
import {
  MENSAGEM_CODIGO_INVALIDO,
  MENSAGEM_CODIGO_PEDIDO,
} from '@clinica/shared';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import { DB } from '../../database/database.module';
import { EmailService } from '../../notificacoes/email.service';
import { ParametrosModule } from '../../parametros/parametros.module';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { AcessoModule } from './acesso.module';
import { InscricaoVerificada, VerificacaoGuard } from './verificacao.guard';
import { VerificacaoService } from './verificacao.service';

// Rota de exemplo do paciente, como as do RF8 e da CP10 vão usar o guard.
@Controller('teste-paciente')
@UseGuards(VerificacaoGuard)
class RotaDoPaciente {
  @Get()
  dados(@InscricaoVerificada() inscricaoId: string) {
    return { inscricaoId };
  }
}

const enviar = jest.fn<Promise<unknown>, [string, string, string]>();

// Verificação de identidade do paciente ou do responsável (RF52, RNF6).
describe('Verificação de identidade do paciente ou do responsável (RF52, RNF6)', () => {
  let app: INestApplication;
  let db: Db;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;

  beforeAll(async () => {
    ({ db, limpar, fechar } = await criarBancoDeTeste());

    @Global()
    @Module({
      providers: [
        { provide: DB, useValue: db },
        { provide: EmailService, useValue: { enviar } },
      ],
      exports: [DB, EmailService],
    })
    class InfraDeTeste {}

    @Module({ imports: [AcessoModule], controllers: [RotaDoPaciente] })
    class PacienteDeTeste {}

    const modulo = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              WEB_URL: 'http://localhost:3000',
              CHAVE_DADOS: CHAVE_TESTE,
              // Todos os testes vêm da mesma origem; o limite por origem tem
              // teste próprio (limite-verificacao.guard.spec.ts).
              LIMITE_VERIFICACAO_POR_ORIGEM: '100000',
            }),
          ],
        }),
        InfraDeTeste,
        AuditoriaModule,
        ParametrosModule,
        AcessoModule,
        PacienteDeTeste,
      ],
    }).compile();
    app = modulo.createNestApplication();
    app.use(cookieParser());
    await app.init();
  }, 60_000);

  let ana: { id: string; numero: string; cpf: string };
  let bia: { id: string; numero: string; cpf: string };

  beforeEach(async () => {
    await limpar();
    enviar.mockReset();
    enviar.mockResolvedValue(undefined);
    ana = await inscrever({
      numero: '2026-00487',
      cpf: '52998224725',
      email: 'ana@exemplo.com',
    });
    bia = await inscrever({
      numero: '2026-00488',
      cpf: '11144477735',
      email: 'bia@exemplo.com',
    });
  });

  afterAll(async () => {
    await app.close();
    await fechar();
  });

  async function inscrever(dados: {
    numero: string;
    cpf: string;
    email: string | null;
    criadaEm?: Date;
  }) {
    const [inscricao] = await db
      .insert(inscricoes)
      .values({
        numero: dados.numero,
        nomeCompleto: 'Pessoa Fictícia',
        dataNascimento: '1990-01-01',
        cpf: dados.cpf,
        rg: '1234567',
        endereco: 'Rua Fictícia, 1',
        estadoCivil: 'solteiro',
        canalPreferencial: dados.email ? 'email' : 'ligacao',
        email: dados.email,
        celular: dados.email ? null : '61999999999',
        criadaEm: dados.criadaEm ?? new Date(),
      })
      .returning();
    return { id: inscricao.id, numero: inscricao.numero, cpf: inscricao.cpf };
  }

  const servidor = () => app.getHttpServer();
  const pedir = (identificador: string) =>
    request(servidor()).post('/verificacao/codigo').send({ identificador });
  const conferir = (identificador: string, codigo: string) =>
    request(servidor())
      .post('/verificacao/conferir')
      .send({ identificador, codigo });
  const cookieDe = (res: request.Response) =>
    ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  const dadosDoPaciente = (cookie: string[] = []) =>
    request(servidor()).get('/teste-paciente').set('Cookie', cookie);

  // O e-mail sai sem a resposta esperar por ele.
  async function codigoEnviadoPara(email: string) {
    for (let i = 0; i < 50; i++) {
      const chamada = enviar.mock.calls
        .filter(([para]) => para === email)
        .at(-1);
      if (chamada) return /(\d{6})<\/p>/.exec(chamada[2])![1];
      await new Promise((pronto) => setTimeout(pronto, 10));
    }
    throw new Error(`Nenhum código enviado para ${email}`);
  }
  // Espera a busca, a gravação e o envio feitos depois da resposta.
  const semEnvio = () => app.get(VerificacaoService).emCurso;
  const outroCodigo = (codigo: string) =>
    String((Number(codigo) + 1) % 1_000_000).padStart(6, '0');
  // Volta no tempo o envio e a janela do limite, como se tivesse passado o tempo.
  const voltarLimites = (segundos: number) =>
    db.update(limitesCodigoVerificacao).set({
      ultimoEnvioEm: sql`${limitesCodigoVerificacao.ultimoEnvioEm} - make_interval(secs => ${segundos})`,
      janelaInicio: sql`${limitesCodigoVerificacao.janelaInicio} - make_interval(secs => ${segundos})`,
      bloqueadoAte: sql`${limitesCodigoVerificacao.bloqueadoAte} - make_interval(secs => ${segundos})`,
    });

  async function verificar(identificador: string, email: string) {
    await pedir(identificador).expect(202);
    const codigo = await codigoEnviadoPara(email);
    const res = await conferir(identificador, codigo).expect(200);
    return cookieDe(res);
  }

  it('CPF e código enviado ao e-mail, informado em até 10 minutos, liberam só a inscrição desse paciente (RF52, RNF6)', async () => {
    const res = await pedir('529.982.247-25').expect(202);
    expect(res.body).toEqual({ message: MENSAGEM_CODIGO_PEDIDO });
    const codigo = await codigoEnviadoPara('ana@exemplo.com');
    expect(codigo).toMatch(/^\d{6}$/);
    expect(enviar).toHaveBeenCalledTimes(1);

    const conferido = await conferir('52998224725', codigo).expect(200);
    expect(conferido.body).toEqual({
      numero: '2026-00487',
      expiraEm: expect.any(String),
    });
    const cookie = cookieDe(conferido);
    expect(cookie.join(';')).toMatch(/verificacao=.+HttpOnly/i);
    expect(cookie.join(';')).toMatch(/SameSite=Lax/i);

    const paciente = await dadosDoPaciente(cookie).expect(200);
    expect(paciente.body).toEqual({ inscricaoId: ana.id });
    const atual = await request(servidor())
      .get('/verificacao')
      .set('Cookie', cookie)
      .expect(200);
    expect(atual.body.numero).toBe('2026-00487');
  });

  it('o número da inscrição também serve de identificador (RF52)', async () => {
    const cookie = await verificar('2026-00488', 'bia@exemplo.com');
    const paciente = await dadosDoPaciente(cookie).expect(200);
    expect(paciente.body).toEqual({ inscricaoId: bia.id });
  });

  it('sem verificação, as rotas do paciente respondem 401 sem nenhum dado da inscrição (RF52, RNF6)', async () => {
    const res = await dadosDoPaciente().expect(401);
    expect(JSON.stringify(res.body)).not.toContain(ana.id);
    await request(servidor()).get('/verificacao').expect(401);
    await dadosDoPaciente(['verificacao=token-inventado']).expect(401);
  });

  it('CPF ou número sem inscrição recebem a mesma resposta, sem envio, e nenhum código é aceito (RF52, RNF6)', async () => {
    for (const identificador of ['390.533.447-05', '2026-09999']) {
      const res = await pedir(identificador).expect(202);
      expect(res.body).toEqual({ message: MENSAGEM_CODIGO_PEDIDO });
      const conferido = await conferir(identificador, '123456').expect(400);
      expect(conferido.body.message).toBe(MENSAGEM_CODIGO_INVALIDO);
      expect(cookieDe(conferido)).toEqual([]);
    }
    await semEnvio();
    expect(enviar).not.toHaveBeenCalled();
  });

  it('inscrição sem e-mail não recebe código, e a resposta é a mesma de qualquer pedido (RF52, DF24)', async () => {
    await inscrever({ numero: '2026-00489', cpf: '39053344705', email: null });
    const res = await pedir('2026-00489').expect(202);
    expect(res.body).toEqual({ message: MENSAGEM_CODIGO_PEDIDO });
    await semEnvio();
    expect(enviar).not.toHaveBeenCalled();
    expect(await db.select().from(codigosVerificacao)).toHaveLength(0);
  });

  it('código expirado, depois de 10 minutos, é recusado com a mensagem genérica (RF52, RNF6)', async () => {
    await pedir('2026-00487').expect(202);
    const codigo = await codigoEnviadoPara('ana@exemplo.com');
    await db.update(codigosVerificacao).set({
      expiraEm: sql`now() - interval '1 minute'`,
    });
    const res = await conferir('2026-00487', codigo).expect(400);
    expect(res.body.message).toBe(MENSAGEM_CODIGO_INVALIDO);
    expect(cookieDe(res)).toEqual([]);
  });

  it('código já utilizado é recusado (RF52, RNF6)', async () => {
    await pedir('2026-00487').expect(202);
    const codigo = await codigoEnviadoPara('ana@exemplo.com');
    await conferir('2026-00487', codigo).expect(200);
    const res = await conferir('2026-00487', codigo).expect(400);
    expect(res.body.message).toBe(MENSAGEM_CODIGO_INVALIDO);
  });

  it('conferências simultâneas com o código certo liberam uma verificação só (RF52, RNF6)', async () => {
    await pedir('2026-00487').expect(202);
    const codigo = await codigoEnviadoPara('ana@exemplo.com');
    const respostas = await Promise.all(
      Array.from({ length: 4 }, () => conferir('2026-00487', codigo)),
    );
    expect(respostas.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      200, 400, 400, 400,
    ]);
    expect(await db.select().from(verificacoesIdentidade)).toHaveLength(1);
  });

  it('na quinta tentativa incorreta, o código é invalidado e nem o correto passa a ser aceito (RF52, RNF6)', async () => {
    await pedir('2026-00487').expect(202);
    const codigo = await codigoEnviadoPara('ana@exemplo.com');
    for (let i = 0; i < 5; i++) {
      const res = await conferir('2026-00487', outroCodigo(codigo)).expect(400);
      expect(res.body.message).toBe(MENSAGEM_CODIGO_INVALIDO);
    }
    const [registro] = await db.select().from(codigosVerificacao);
    expect(registro.invalidadoEm).not.toBeNull();
    await conferir('2026-00487', codigo).expect(400);
  });

  it('com 4 tentativas incorretas, o código correto ainda é aceito (RF52, RNF6)', async () => {
    await pedir('2026-00487').expect(202);
    const codigo = await codigoEnviadoPara('ana@exemplo.com');
    for (let i = 0; i < 4; i++) {
      await conferir('2026-00487', outroCodigo(codigo)).expect(400);
    }
    await conferir('2026-00487', codigo).expect(200);
  });

  it('novo código pedido antes de 60 segundos é recusado com o tempo restante; depois disso, o novo invalida o anterior (RF52, RNF6)', async () => {
    await pedir('2026-00487').expect(202);
    const primeiro = await codigoEnviadoPara('ana@exemplo.com');

    const cedo = await pedir('2026-00487').expect(429);
    expect(cedo.body.segundosRestantes).toBeGreaterThan(50);
    expect(cedo.body.segundosRestantes).toBeLessThanOrEqual(60);
    expect(cedo.body.message).toMatch(/Aguarde \d+ segundos/);

    await voltarLimites(61);
    enviar.mockClear();
    await pedir('2026-00487').expect(202);
    const segundo = await codigoEnviadoPara('ana@exemplo.com');
    if (segundo !== primeiro) {
      await conferir('2026-00487', primeiro).expect(400);
    }
    await conferir('2026-00487', segundo).expect(200);
  });

  it('depois de 3 códigos em 60 minutos, o quarto pedido é recusado e o bloqueio dura 60 minutos (RF52, RNF6)', async () => {
    for (let i = 0; i < 3; i++) {
      await pedir('529.982.247-25').expect(202);
      await voltarLimites(61);
    }
    // Passou 1 minuto desde o 3º envio, que bloqueou por 60 minutos.
    const bloqueado = await pedir('52998224725').expect(429);
    const ate = new Date(bloqueado.body.bloqueadoAte).getTime();
    const esperado = Date.now() + 60 * 60_000 - 61_000;
    expect(Math.abs(ate - esperado)).toBeLessThan(10_000);
    expect(bloqueado.body.segundosRestantes).toBeUndefined();

    await voltarLimites(58 * 60);
    await pedir('52998224725').expect(429);
    await voltarLimites(2 * 60);
    await pedir('52998224725').expect(202);
  });

  it('o limite de pedidos vale igual para CPF sem inscrição, sem revelar se ela existe (RF52, RNF6)', async () => {
    for (let i = 0; i < 3; i++) {
      await pedir('390.533.447-05').expect(202);
      await voltarLimites(61);
    }
    const res = await pedir('39053344705').expect(429);
    expect(res.body.bloqueadoAte).toEqual(expect.any(String));
  });

  it('conhecer o CPF ou o número de outra inscrição não dá acesso a ela (RF52, RNF6)', async () => {
    await pedir('2026-00487').expect(202);
    const codigoDaAna = await codigoEnviadoPara('ana@exemplo.com');
    await pedir('2026-00488').expect(202);
    // O código da Ana não vale para a inscrição da Bia.
    await conferir('2026-00488', codigoDaAna).expect(400);
    const cookie = cookieDe(
      await conferir('2026-00487', codigoDaAna).expect(200),
    );
    const paciente = await dadosDoPaciente(cookie).expect(200);
    expect(paciente.body.inscricaoId).not.toBe(bia.id);
  });

  it('pelo CPF com mais de uma inscrição, o código vai para o e-mail da mais recente (RF52)', async () => {
    const antiga = await inscrever({
      numero: '2025-00001',
      cpf: '39053344705',
      email: 'antiga@exemplo.com',
      criadaEm: new Date('2025-03-01T12:00:00Z'),
    });
    const recente = await inscrever({
      numero: '2026-00490',
      cpf: '39053344705',
      email: 'recente@exemplo.com',
    });
    const cookie = await verificar('390.533.447-05', 'recente@exemplo.com');
    const paciente = await dadosDoPaciente(cookie).expect(200);
    expect(paciente.body.inscricaoId).toBe(recente.id);
    expect(paciente.body.inscricaoId).not.toBe(antiga.id);
    expect(enviar).not.toHaveBeenCalledWith(
      'antiga@exemplo.com',
      expect.anything(),
      expect.anything(),
    );
  });

  it('a verificação vale 15 minutos e termina quando a pessoa encerra a consulta (RF52)', async () => {
    const cookie = await verificar('2026-00487', 'ana@exemplo.com');
    await dadosDoPaciente(cookie).expect(200);
    await request(servidor())
      .post('/verificacao/encerrar')
      .set('Cookie', cookie)
      .expect(204);
    await dadosDoPaciente(cookie).expect(401);

    enviar.mockClear();
    await voltarLimites(61);
    const outro = await verificar('2026-00487', 'ana@exemplo.com');
    await db.update(verificacoesIdentidade).set({
      expiraEm: sql`now() - interval '1 second'`,
    });
    await dadosDoPaciente(outro).expect(401);
  });

  it('alternar o CPF e o número não passa de 3 códigos por inscrição em 60 minutos (RF52, RNF6)', async () => {
    for (const identificador of [
      '529.982.247-25',
      '2026-00487',
      '52998224725',
      '2026-00487',
    ]) {
      await pedir(identificador).expect(202);
      await semEnvio();
      await voltarLimites(61);
    }
    expect(
      enviar.mock.calls.filter(([para]) => para === 'ana@exemplo.com'),
    ).toHaveLength(3);
    expect(
      await db
        .select()
        .from(codigosVerificacao)
        .where(eq(codigosVerificacao.inscricaoId, ana.id)),
    ).toHaveLength(3);
  });

  it('o código pedido pelo número invalida o que foi pedido pelo CPF: só um vale por vez (RF52, RNF6)', async () => {
    await pedir('52998224725').expect(202);
    const peloCpf = await codigoEnviadoPara('ana@exemplo.com');
    enviar.mockClear();
    await pedir('2026-00487').expect(202);
    const peloNumero = await codigoEnviadoPara('ana@exemplo.com');
    await conferir('52998224725', peloCpf).expect(400);
    await conferir('2026-00487', peloNumero).expect(200);
  });

  it('a verificação concluída fica na auditoria, com a inscrição e sem usuário (RF52, RNF10)', async () => {
    await verificar('2026-00487', 'ana@exemplo.com');
    const registros = await db
      .select()
      .from(auditoria)
      .where(eq(auditoria.operacao, 'verificar_identidade'));
    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({
      usuarioId: null,
      entidade: 'inscricoes',
      entidadeId: ana.id,
    });
  });

  it('o CPF, o código e o token não ficam gravados em texto nas tabelas da verificação (RF52, RNF6)', async () => {
    await pedir('529.982.247-25').expect(202);
    const codigo = await codigoEnviadoPara('ana@exemplo.com');
    const cookie = cookieDe(await conferir('52998224725', codigo).expect(200));
    const token = /verificacao=([^;]+)/.exec(cookie.join(';'))![1];
    const gravado = JSON.stringify([
      await db.select().from(codigosVerificacao),
      await db.select().from(limitesCodigoVerificacao),
      await db.select().from(verificacoesIdentidade),
    ]);
    expect(gravado).not.toContain(ana.cpf);
    expect(gravado).not.toContain(`"${codigo}"`);
    expect(gravado).not.toContain(decodeURIComponent(token));
  });

  it('identificador em formato inválido e código sem 6 números são recusados antes de qualquer envio (RF52)', async () => {
    await pedir('abc').expect(400);
    await pedir('5299822472').expect(400);
    await conferir('2026-00487', '12345').expect(400);
    await semEnvio();
    expect(enviar).not.toHaveBeenCalled();
    expect(await db.select().from(limitesCodigoVerificacao)).toHaveLength(0);
  });

  it('falha no envio do e-mail não muda a resposta do pedido (RF52)', async () => {
    enviar.mockRejectedValue(new Error('SMTP fora do ar'));
    const res = await pedir('2026-00487').expect(202);
    expect(res.body).toEqual({ message: MENSAGEM_CODIGO_PEDIDO });
  });
});
