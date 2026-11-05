import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, hkdfSync, randomInt, timingSafeEqual } from 'node:crypto';
import { and, count, desc, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';
import {
  codigosVerificacao,
  inscricoes,
  limitesCodigoVerificacao,
  verificacoesIdentidade,
  type Db,
} from '@clinica/database';
import {
  CODIGOS_POR_JANELA,
  MENSAGEM_CODIGO_INVALIDO,
  MENSAGEM_CODIGO_PEDIDO,
  MINUTOS_BLOQUEIO_ENVIOS,
  MINUTOS_JANELA_ENVIOS,
  MINUTOS_VALIDADE_CODIGO,
  MINUTOS_VERIFICACAO,
  SEGUNDOS_ENTRE_ENVIOS,
  TENTATIVAS_POR_CODIGO,
  type ConferenciaCodigo,
  type Identificador,
  type PedidoCodigo,
  type VerificacaoAtual,
} from '@clinica/shared';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { DB } from '../../database/database.module';
import { EmailService } from '../../notificacoes/email.service';
import { gerarToken, hashToken } from './credenciais';

const depois = (a: Date, ms: number) => new Date(a.getTime() + ms);
const MINUTO = 60_000;

// Verificação de identidade do paciente ou do responsável (RF52, RNF6), pelo
// CPF ou pelo número da inscrição e por um código enviado só ao e-mail da
// inscrição (DF24, DF40). Nenhuma resposta revela se a inscrição existe.
@Injectable()
export class VerificacaoService {
  private readonly logger = new Logger(VerificacaoService.name);
  // Chave do HMAC do identificador e do código, derivada da CHAVE_DADOS para não
  // exigir outra variável na implantação. Se a CHAVE_DADOS for trocada, os
  // códigos e as verificações em curso deixam de valer, e a pessoa pede outro
  // código; os limites recomeçam.
  private readonly chave: Buffer;

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly auditoria: AuditoriaService,
    private readonly email: EmailService,
    config: ConfigService,
  ) {
    this.chave = Buffer.from(
      hkdfSync(
        'sha256',
        Buffer.from(config.getOrThrow<string>('CHAVE_DADOS'), 'base64'),
        Buffer.alloc(0),
        'clinica-escola:rf52:verificacao',
        32,
      ),
    );
  }

  private hmac(texto: string) {
    return createHmac('sha256', this.chave).update(texto).digest('hex');
  }

  private chaveDe({ tipo, valor }: Identificador) {
    return this.hmac(`${tipo}:${valor}`);
  }

  private hashCodigo(identificadorChave: string, codigo: string) {
    return this.hmac(`codigo:${identificadorChave}:${codigo}`);
  }

  // Pedido de código. Os limites valem pelo identificador informado, exista ou
  // não a inscrição, para o 429 também não revelar nada (decisão 2 do projeto).
  // Depois da reserva, a resposta sai sem esperar a busca da inscrição, a
  // gravação do código e o e-mail: o tempo dela é o mesmo, exista ou não a
  // inscrição, tenha ou não e-mail (decisão 5 do projeto).
  async pedirCodigo({ identificador }: PedidoCodigo) {
    const chave = this.chaveDe(identificador);
    await this.reservarEnvio(chave);
    this.emCurso = this.gerarEEnviar(identificador, chave).catch((erro) =>
      this.logger.error('Falha ao gerar o código de verificação', erro),
    );
    return { message: MENSAGEM_CODIGO_PEDIDO };
  }

  // Último envio em segundo plano, para os testes esperarem por ele.
  emCurso: Promise<unknown> = Promise.resolve();

  private async gerarEEnviar(identificador: Identificador, chave: string) {
    const inscricao = await this.buscarInscricao(identificador);
    if (!inscricao?.email) return;
    const email = inscricao.email;
    const codigo = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const agora = new Date();
    const c = codigosVerificacao;
    const gerado = await this.db.transaction(async (tx) => {
      // Um pedido por vez para a mesma inscrição, pelo CPF ou pelo número.
      await tx
        .select({ id: inscricoes.id })
        .from(inscricoes)
        .where(eq(inscricoes.id, inscricao.id))
        .for('update');
      // No máximo 3 códigos por inscrição em 60 minutos, somando o CPF e o
      // número: alternar os dois identificadores não dobra as tentativas.
      const [{ total }] = await tx
        .select({ total: count() })
        .from(c)
        .where(
          and(
            eq(c.inscricaoId, inscricao.id),
            gt(c.criadoEm, depois(agora, -MINUTOS_JANELA_ENVIOS * MINUTO)),
          ),
        );
      if (total >= CODIGOS_POR_JANELA) return false;
      // O código novo invalida o anterior da inscrição, venha do CPF ou do
      // número: só um código vale por vez (RF52).
      await tx
        .update(c)
        .set({ invalidadoEm: agora })
        .where(
          and(
            eq(c.inscricaoId, inscricao.id),
            isNull(c.usadoEm),
            isNull(c.invalidadoEm),
          ),
        );
      await tx.insert(c).values({
        inscricaoId: inscricao.id,
        identificadorChave: chave,
        codigoHash: this.hashCodigo(chave, codigo),
        expiraEm: depois(agora, MINUTOS_VALIDADE_CODIGO * MINUTO),
        criadoEm: agora,
      });
      return true;
    });
    if (gerado) await this.enviarCodigo(inscricao.id, email, codigo);
  }

  // Reserva o envio numa única operação: um a cada 60 segundos e 3 em 60
  // minutos; o 3º envio bloqueia novos pedidos por 60 minutos.
  private async reservarEnvio(chave: string) {
    const agora = new Date();
    const instante = sql`${agora.toISOString()}::timestamptz`;
    const t = limitesCodigoVerificacao;
    const janelaVencida = sql`${t.janelaInicio} <= ${depois(agora, -MINUTOS_JANELA_ENVIOS * MINUTO).toISOString()}::timestamptz`;
    const envios = sql`CASE WHEN ${janelaVencida} THEN 1 ELSE ${t.enviosNaJanela} + 1 END`;
    const [reservado] = await this.db
      .insert(t)
      .values({
        identificadorChave: chave,
        ultimoEnvioEm: agora,
        janelaInicio: agora,
        enviosNaJanela: 1,
      })
      .onConflictDoUpdate({
        target: t.identificadorChave,
        set: {
          ultimoEnvioEm: agora,
          janelaInicio: sql`CASE WHEN ${janelaVencida} THEN ${instante} ELSE ${t.janelaInicio} END`,
          enviosNaJanela: envios,
          bloqueadoAte: sql`CASE WHEN ${envios} >= ${CODIGOS_POR_JANELA} THEN ${depois(agora, MINUTOS_BLOQUEIO_ENVIOS * MINUTO).toISOString()}::timestamptz ELSE NULL END`,
        },
        setWhere: and(
          or(isNull(t.bloqueadoAte), lte(t.bloqueadoAte, agora)),
          lte(t.ultimoEnvioEm, depois(agora, -SEGUNDOS_ENTRE_ENVIOS * 1_000)),
        ),
      })
      .returning({ identificadorChave: t.identificadorChave });
    if (reservado) return;

    const [limite] = await this.db
      .select()
      .from(t)
      .where(eq(t.identificadorChave, chave));
    if (limite?.bloqueadoAte && limite.bloqueadoAte > agora) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message:
            'Muitos pedidos de código. Por segurança, novos pedidos para este CPF ou número ficam suspensos por um tempo. Se precisar antes, procure a secretaria.',
          bloqueadoAte: limite.bloqueadoAte.toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const liberaEm = limite
      ? depois(limite.ultimoEnvioEm, SEGUNDOS_ENTRE_ENVIOS * 1_000)
      : agora;
    const segundosRestantes = Math.max(
      1,
      Math.ceil((liberaEm.getTime() - agora.getTime()) / 1_000),
    );
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: `Aguarde ${segundosRestantes} segundos para pedir um novo código.`,
        segundosRestantes,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  // Pelo número, a inscrição dele; pelo CPF, a mais recente, que é a que está
  // na fila (decisão 3 do projeto).
  private async buscarInscricao(identificador: Identificador) {
    const [inscricao] = await this.db
      .select({ id: inscricoes.id, email: inscricoes.email })
      .from(inscricoes)
      .where(
        identificador.tipo === 'numero'
          ? eq(inscricoes.numero, identificador.valor)
          : eq(inscricoes.cpf, identificador.valor),
      )
      .orderBy(desc(inscricoes.criadaEm))
      .limit(1);
    return inscricao;
  }

  private async enviarCodigo(
    inscricaoId: string,
    email: string,
    codigo: string,
  ) {
    try {
      await this.email.enviar(
        email,
        'Código para consultar sua inscrição na Clínica Escola FBr',
        `<p>Olá.</p>
<p>Use o código abaixo para confirmar sua identidade e consultar a inscrição na Clínica Escola de Psicologia da FBr:</p>
<p style="font-size: 24px; font-weight: bold; letter-spacing: 4px">${codigo}</p>
<p>O código vale por ${MINUTOS_VALIDADE_CODIGO} minutos e só pode ser usado uma vez. Não informe este código a ninguém: a clínica não pede o código por telefone.</p>
<p>Se você não pediu o código, ignore esta mensagem.</p>`,
      );
    } catch (erro) {
      this.logger.error(
        `Código de verificação não enviado para a inscrição ${inscricaoId}`,
        erro,
      );
    }
  }

  // Conferência do código. Qualquer falha devolve a mesma mensagem.
  async conferir({ identificador, codigo }: ConferenciaCodigo) {
    const chave = this.chaveDe(identificador);
    const hashInformado = this.hashCodigo(chave, codigo);
    const agora = new Date();
    const c = codigosVerificacao;

    // A tentativa é reservada antes da comparação, como no RF50: conferências
    // simultâneas não passam de 5 tentativas no mesmo código.
    const [reservado] = await this.db
      .update(c)
      .set({ tentativasFalhas: sql`${c.tentativasFalhas} + 1` })
      .where(
        and(
          eq(c.identificadorChave, chave),
          isNull(c.usadoEm),
          isNull(c.invalidadoEm),
          gt(c.expiraEm, agora),
          sql`${c.tentativasFalhas} < ${TENTATIVAS_POR_CODIGO}`,
        ),
      )
      .returning();
    if (!reservado) throw this.codigoInvalido();

    const confere = timingSafeEqual(
      Buffer.from(reservado.codigoHash, 'hex'),
      Buffer.from(hashInformado, 'hex'),
    );
    if (!confere) {
      // Na 5ª tentativa errada, o código deixa de valer, até para o correto.
      if (reservado.tentativasFalhas >= TENTATIVAS_POR_CODIGO) {
        await this.db
          .update(c)
          .set({ invalidadoEm: new Date() })
          .where(and(eq(c.id, reservado.id), isNull(c.invalidadoEm)));
      }
      throw this.codigoInvalido();
    }

    const { token, hash } = gerarToken();
    const expiraEm = depois(new Date(), MINUTOS_VERIFICACAO * MINUTO);
    const usado = await this.db.transaction(async (tx) => {
      // O UPDATE condicional deixa passar só uma conferência simultânea.
      const [marcado] = await tx
        .update(c)
        .set({
          usadoEm: new Date(),
          tentativasFalhas: sql`${c.tentativasFalhas} - 1`,
        })
        .where(
          and(
            eq(c.id, reservado.id),
            isNull(c.usadoEm),
            isNull(c.invalidadoEm),
          ),
        )
        .returning({ id: c.id });
      if (!marcado) return false;
      await tx.insert(verificacoesIdentidade).values({
        inscricaoId: reservado.inscricaoId,
        tokenHash: hash,
        expiraEm,
      });
      await this.auditoria.registrar(
        {
          operacao: 'verificar_identidade',
          entidade: 'inscricoes',
          entidadeId: reservado.inscricaoId,
        },
        tx,
      );
      return true;
    });
    if (!usado) throw this.codigoInvalido();
    const [{ numero }] = await this.db
      .select({ numero: inscricoes.numero })
      .from(inscricoes)
      .where(eq(inscricoes.id, reservado.inscricaoId));
    const atual: VerificacaoAtual = {
      numero,
      expiraEm: expiraEm.toISOString(),
    };
    return { token, atual };
  }

  // Inscrição de uma verificação dentro do prazo e não encerrada, ou null.
  async validar(token: string) {
    const [verificacao] = await this.db
      .select({
        inscricaoId: verificacoesIdentidade.inscricaoId,
        numero: inscricoes.numero,
        expiraEm: verificacoesIdentidade.expiraEm,
      })
      .from(verificacoesIdentidade)
      .innerJoin(
        inscricoes,
        eq(inscricoes.id, verificacoesIdentidade.inscricaoId),
      )
      .where(
        and(
          eq(verificacoesIdentidade.tokenHash, hashToken(token)),
          isNull(verificacoesIdentidade.encerradaEm),
          gt(verificacoesIdentidade.expiraEm, new Date()),
        ),
      );
    return verificacao ?? null;
  }

  async atual(token: string): Promise<VerificacaoAtual | null> {
    const verificacao = await this.validar(token);
    return verificacao
      ? {
          numero: verificacao.numero,
          expiraEm: verificacao.expiraEm.toISOString(),
        }
      : null;
  }

  async encerrar(token: string) {
    await this.db
      .update(verificacoesIdentidade)
      .set({ encerradaEm: new Date() })
      .where(
        and(
          eq(verificacoesIdentidade.tokenHash, hashToken(token)),
          isNull(verificacoesIdentidade.encerradaEm),
        ),
      );
  }

  private codigoInvalido() {
    return new BadRequestException(MENSAGEM_CODIGO_INVALIDO);
  }
}
