import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import {
  auditoria,
  convitesAtivacao,
  sessoesLogin,
  usuarios,
  type Db,
} from '@clinica/database';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import type { EmailService } from '../../notificacoes/email.service';
import { ParametrosService } from '../../parametros/parametros.service';
import { criarBancoDeTeste } from '../../test-utils/banco-de-teste';
import { conferirSenha, gerarToken } from './credenciais';
import { UsuariosService } from './usuarios.service';

describe('UsuariosService (RF53 e RF54)', () => {
  let db: Db;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  let servico: UsuariosService;
  let emails: { para: string; html: string }[];
  let falharEmail: boolean;
  const coordenacao = {
    id: '',
    nome: 'Helena Duarte',
    perfil: 'coordenacao' as const,
  };

  const tokenDoUltimoEmail = () => {
    const link = /\/ativacao\/([\w-]+)/.exec(emails.at(-1)!.html);
    return link![1];
  };

  beforeAll(async () => {
    ({ db, limpar, fechar } = await criarBancoDeTeste());
  }, 60_000);

  afterAll(() => fechar());

  beforeEach(async () => {
    await limpar();
    emails = [];
    falharEmail = false;
    const email = {
      enviar: jest.fn(async (para: string, _assunto: string, html: string) => {
        if (falharEmail) throw new Error('SMTP fora do ar');
        emails.push({ para, html });
      }),
    } as unknown as EmailService;
    const config = new ConfigService({ WEB_URL: 'http://localhost:3000' });
    servico = new UsuariosService(
      db,
      new AuditoriaService(db),
      email,
      new ParametrosService(db),
      config,
    );
    const [helena] = await db
      .insert(usuarios)
      .values({
        nome: 'Helena Duarte',
        email: 'helena@fbr.edu.br',
        perfil: 'coordenacao',
        situacao: 'ativo',
      })
      .returning();
    coordenacao.id = helena.id;
  });

  it('cadastra o usuário como pendente, registra a auditoria e envia o convite', async () => {
    const { id, situacao } = await servico.cadastrar(
      { nome: 'Pedro Lima', email: 'pedro@fbr.edu.br', perfil: 'estagiario' },
      coordenacao,
    );
    expect(situacao).toBe('pendente_ativacao');
    expect(emails).toHaveLength(1);
    expect(emails[0].para).toBe('pedro@fbr.edu.br');
    expect(emails[0].html).toContain('Estagiário');
    expect(emails[0].html).toContain('72 horas');

    const [convite] = await db
      .select()
      .from(convitesAtivacao)
      .where(eq(convitesAtivacao.usuarioId, id));
    const horas =
      (convite.expiraEm.getTime() - convite.criadoEm.getTime()) / 3_600_000;
    expect(Math.round(horas)).toBe(72);
    expect(convite.tokenHash).not.toBe(tokenDoUltimoEmail());

    const [registro] = await db
      .select()
      .from(auditoria)
      .where(eq(auditoria.entidadeId, id));
    expect(registro).toMatchObject({
      usuarioId: coordenacao.id,
      operacao: 'cadastrar_usuario',
    });
  });

  it('dois cadastros simultâneos com o mesmo e-mail: um entra e o outro recebe 409', async () => {
    const dados = {
      nome: 'Pedro Lima',
      email: 'pedro@fbr.edu.br',
      perfil: 'estagiario' as const,
    };
    const resultados = await Promise.allSettled([
      servico.cadastrar(dados, coordenacao),
      servico.cadastrar(dados, coordenacao),
    ]);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(resultados.find((r) => r.status === 'rejected')).toMatchObject({
      reason: { status: 409 },
    });
  });

  it('se o e-mail do convite falhar, o cadastro vale e avisa que o convite não saiu', async () => {
    falharEmail = true;
    const resultado = await servico.cadastrar(
      { nome: 'Pedro Lima', email: 'pedro@fbr.edu.br', perfil: 'estagiario' },
      coordenacao,
    );
    expect(resultado).toMatchObject({
      situacao: 'pendente_ativacao',
      conviteEnviado: false,
    });

    falharEmail = false;
    await servico.reenviarConvite(resultado.id, coordenacao);
    expect(emails.map((e) => e.para)).toEqual(['pedro@fbr.edu.br']);
  });

  it('se o e-mail do reenvio falhar, responde 503 para a coordenação tentar de novo', async () => {
    const { id } = await servico.cadastrar(
      { nome: 'Pedro Lima', email: 'pedro@fbr.edu.br', perfil: 'estagiario' },
      coordenacao,
    );
    falharEmail = true;
    await expect(
      servico.reenviarConvite(id, coordenacao),
    ).rejects.toMatchObject({ status: 503 });
  });

  it('recusa e-mail já cadastrado', async () => {
    await expect(
      servico.cadastrar(
        { nome: 'Outra', email: 'helena@fbr.edu.br', perfil: 'secretaria' },
        coordenacao,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('ativa a conta com a senha guardada só como hash e não aceita o link de novo (RF53, RNF49)', async () => {
    const { id } = await servico.cadastrar(
      { nome: 'Ana Costa', email: 'ana@fbr.edu.br', perfil: 'estagiario' },
      coordenacao,
    );
    const token = tokenDoUltimoEmail();
    await expect(servico.conviteValido(token)).resolves.toMatchObject({
      nome: 'Ana Costa',
      perfil: 'estagiario',
    });

    await servico.ativar({
      token,
      senha: 'senhaSegura1',
      confirmacao: 'senhaSegura1',
    });
    const [ana] = await db.select().from(usuarios).where(eq(usuarios.id, id));
    expect(ana.situacao).toBe('ativo');
    expect(ana.senhaHash).not.toContain('senhaSegura1');
    await expect(conferirSenha('senhaSegura1', ana.senhaHash!)).resolves.toBe(
      true,
    );

    await expect(servico.conviteValido(token)).rejects.toMatchObject({
      status: 410,
    });
  });

  it('dois envios simultâneos do mesmo link: só o primeiro ativa a conta', async () => {
    const { id } = await servico.cadastrar(
      { nome: 'Ana Costa', email: 'ana@fbr.edu.br', perfil: 'estagiario' },
      coordenacao,
    );
    const token = tokenDoUltimoEmail();
    const resultados = await Promise.allSettled([
      servico.ativar({ token, senha: 'primeira1', confirmacao: 'primeira1' }),
      servico.ativar({ token, senha: 'segunda22', confirmacao: 'segunda22' }),
    ]);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(resultados.find((r) => r.status === 'rejected')).toMatchObject({
      reason: { status: 410 },
    });
    const [ana] = await db.select().from(usuarios).where(eq(usuarios.id, id));
    const vencedora =
      resultados[0].status === 'fulfilled' ? 'primeira1' : 'segunda22';
    await expect(conferirSenha(vencedora, ana.senhaHash!)).resolves.toBe(true);
  });

  it('a desativação feita durante a ativação prevalece', async () => {
    const { id } = await servico.cadastrar(
      { nome: 'Ana Costa', email: 'ana@fbr.edu.br', perfil: 'estagiario' },
      coordenacao,
    );
    // A ativação confere o link e começa a calcular o hash; a desativação chega antes da gravação.
    const ativacao = servico.ativar({
      token: tokenDoUltimoEmail(),
      senha: 'senhaSegura1',
      confirmacao: 'senhaSegura1',
    });
    await new Promise((r) => setImmediate(r));
    await servico.desativar(id, coordenacao);
    await expect(ativacao).rejects.toMatchObject({ status: 410 });
    const [ana] = await db.select().from(usuarios).where(eq(usuarios.id, id));
    expect(ana).toMatchObject({ situacao: 'desativado', senhaHash: null });
  });

  it('recusa convite vencido (mais de 72 horas)', async () => {
    const [joao] = await db
      .insert(usuarios)
      .values({ nome: 'João', email: 'joao@fbr.edu.br', perfil: 'estagiario' })
      .returning();
    const { token, hash } = gerarToken();
    await db.insert(convitesAtivacao).values({
      usuarioId: joao.id,
      tokenHash: hash,
      expiraEm: new Date(Date.now() - 3_600_000),
    });
    await expect(
      servico.ativar({
        token,
        senha: 'senhaSegura1',
        confirmacao: 'senhaSegura1',
      }),
    ).rejects.toMatchObject({ status: 410 });
  });

  it('o reenvio invalida o convite anterior', async () => {
    const { id } = await servico.cadastrar(
      { nome: 'Carla Souza', email: 'carla@fbr.edu.br', perfil: 'supervisor' },
      coordenacao,
    );
    const antigo = tokenDoUltimoEmail();
    await servico.reenviarConvite(id, coordenacao);
    const novo = tokenDoUltimoEmail();
    await expect(servico.conviteValido(antigo)).rejects.toMatchObject({
      status: 410,
    });
    await expect(servico.conviteValido(novo)).resolves.toMatchObject({
      nome: 'Carla Souza',
    });
  });

  it('desativa o usuário, revoga as sessões e mantém os registros', async () => {
    const [estagiario] = await db
      .insert(usuarios)
      .values({
        nome: 'Bruno',
        email: 'bruno@fbr.edu.br',
        perfil: 'estagiario',
        situacao: 'ativo',
      })
      .returning();
    await db.insert(sessoesLogin).values({
      usuarioId: estagiario.id,
      tokenHash: gerarToken().hash,
      expiraEm: new Date(Date.now() + 1_800_000),
    });
    await db.insert(auditoria).values({
      usuarioId: estagiario.id,
      operacao: 'registro_antigo',
      entidade: 'x',
    });

    await servico.desativar(estagiario.id, coordenacao);

    const [bruno] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, estagiario.id));
    expect(bruno.situacao).toBe('desativado');
    const [sessao] = await db
      .select()
      .from(sessoesLogin)
      .where(eq(sessoesLogin.usuarioId, estagiario.id));
    expect(sessao.revogadaEm).not.toBeNull();
    const registros = await db
      .select()
      .from(auditoria)
      .where(eq(auditoria.usuarioId, estagiario.id));
    expect(registros).toHaveLength(1);

    const [lista] = await servico.listar({ situacao: 'desativado' });
    expect(lista).toMatchObject({ nome: 'Bruno', situacao: 'desativado' });
    expect(lista.desativadoEm).not.toBeNull();
  });

  it('não deixa a coordenação desativar a própria conta', async () => {
    await expect(
      servico.desativar(coordenacao.id, coordenacao),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('não deixa desativar a última conta ativa da coordenação (RF54)', async () => {
    const [outra] = await db
      .insert(usuarios)
      .values({
        nome: 'Roberto Lima',
        email: 'roberto@fbr.edu.br',
        perfil: 'coordenacao',
        situacao: 'ativo',
      })
      .returning();
    const autor = {
      id: outra.id,
      nome: outra.nome,
      perfil: 'coordenacao' as const,
    };
    // Com duas contas ativas, uma pode desativar a outra.
    await servico.desativar(coordenacao.id, autor);
    // Restou só a conta de quem desativou; outra coordenação desativada não muda isso.
    const [terceira] = await db
      .insert(usuarios)
      .values({
        nome: 'Clara Nunes',
        email: 'clara@fbr.edu.br',
        perfil: 'coordenacao',
        situacao: 'pendente_ativacao',
      })
      .returning();
    await expect(
      servico.desativar(outra.id, {
        id: terceira.id,
        nome: terceira.nome,
        perfil: 'coordenacao',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('na busca, % e _ valem como letras, e não como curingas (RF53)', async () => {
    await servico.cadastrar(
      { nome: 'Ana Costa', email: 'ana@fbr.edu.br', perfil: 'estagiario' },
      coordenacao,
    );
    expect(await servico.listar({ busca: '%' })).toEqual([]);
    expect(await servico.listar({ busca: '_na' })).toEqual([]);
    expect(await servico.listar({ busca: 'Ana' })).toHaveLength(1);
  });

  it('lista com busca e filtros, mostrando o convite pendente', async () => {
    await servico.cadastrar(
      { nome: 'Pedro Lima', email: 'pedro@fbr.edu.br', perfil: 'estagiario' },
      coordenacao,
    );
    const pendentes = await servico.listar({ situacao: 'pendente_ativacao' });
    expect(pendentes.map((u) => u.nome)).toEqual(['Pedro Lima']);
    expect(pendentes[0].conviteEnviadoEm).not.toBeNull();
    expect(await servico.listar({ busca: 'helena' })).toHaveLength(1);
    expect(await servico.listar({ perfil: 'supervisor' })).toHaveLength(0);
  });
});
