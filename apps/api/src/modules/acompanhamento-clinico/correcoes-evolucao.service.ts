import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import {
  alteracoesParametro,
  correcoesEvolucao,
  evolucoes,
  parametrosSemestre,
  sessoesAtendimento,
  usuarios,
  type Db,
} from '@clinica/database';
import {
  correcaoNoPrazo,
  DATA_LIMITE_CORRECAO,
  esquemaDaCorrecao,
  hojeEmBrasilia,
  semestreDaData,
  semestreDaSessao,
  type DataLimiteCorrecao,
} from '@clinica/shared';
import {
  AuditoriaService,
  type Transacao,
} from '../../auditoria/auditoria.service';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { cifrar, decifrar } from '../../common/criptografia';
import { DB } from '../../database/database.module';
import { PoliticaProntuario } from './politica-prontuario';

type Leitor = Db | Transacao;

// "2026-11-30" -> "30/11/2026", para a mensagem do prazo encerrado.
const dataBr = (data: string) => data.split('-').reverse().join('/');

// Data-limite registrada para o semestre, ou null se ainda não há (RF29).
export async function dataLimiteDoSemestre(banco: Leitor, semestre: string) {
  const [linha] = await banco
    .select({ valor: parametrosSemestre.valor })
    .from(parametrosSemestre)
    .where(
      and(
        eq(parametrosSemestre.semestre, semestre),
        eq(parametrosSemestre.chave, DATA_LIMITE_CORRECAO),
      ),
    );
  return linha?.valor ?? null;
}

// Correções das evoluções (versões 2 em diante), abertas, por evolução e da mais
// recente para a mais antiga.
export async function correcoesDasEvolucoes(
  banco: Leitor,
  evolucaoIds: string[],
  chave: string,
) {
  const porEvolucao = new Map<
    string,
    {
      versao: number;
      queixa: string | null;
      planejamento: string | null;
      humorAparencia: string | null;
      conteudoTrabalhado: string | null;
      tecnicasUtilizadas: string | null;
      intervencoesEncaminhamentos: string | null;
      planoProximaSessao: string | null;
      motivo: string;
      autor: string;
      em: Date;
    }[]
  >();
  if (evolucaoIds.length === 0) return porEvolucao;
  const abrir = (valor: string | null) =>
    valor ? decifrar(valor, chave) : null;
  const linhas = await banco
    .select({
      evolucaoId: correcoesEvolucao.evolucaoId,
      versao: correcoesEvolucao.versao,
      queixa: correcoesEvolucao.queixaCifrada,
      planejamento: correcoesEvolucao.planejamentoCifrado,
      humorAparencia: correcoesEvolucao.humorAparenciaCifrado,
      conteudoTrabalhado: correcoesEvolucao.conteudoTrabalhadoCifrado,
      tecnicasUtilizadas: correcoesEvolucao.tecnicasUtilizadasCifrado,
      intervencoesEncaminhamentos:
        correcoesEvolucao.intervencoesEncaminhamentosCifrado,
      planoProximaSessao: correcoesEvolucao.planoProximaSessaoCifrado,
      motivo: correcoesEvolucao.motivoCifrado,
      autor: usuarios.nome,
      em: correcoesEvolucao.corrigidaEm,
    })
    .from(correcoesEvolucao)
    .innerJoin(usuarios, eq(usuarios.id, correcoesEvolucao.corrigidaPor))
    .where(inArray(correcoesEvolucao.evolucaoId, evolucaoIds))
    .orderBy(desc(correcoesEvolucao.versao));
  for (const { evolucaoId, ...linha } of linhas) {
    const lista = porEvolucao.get(evolucaoId) ?? [];
    lista.push({
      versao: linha.versao,
      queixa: abrir(linha.queixa),
      planejamento: abrir(linha.planejamento),
      humorAparencia: abrir(linha.humorAparencia),
      conteudoTrabalhado: abrir(linha.conteudoTrabalhado),
      tecnicasUtilizadas: abrir(linha.tecnicasUtilizadas),
      intervencoesEncaminhamentos: abrir(linha.intervencoesEncaminhamentos),
      planoProximaSessao: abrir(linha.planoProximaSessao),
      motivo: decifrar(linha.motivo, chave),
      autor: linha.autor,
      em: linha.em,
    });
    porEvolucao.set(evolucaoId, lista);
  }
  return porEvolucao;
}

// Correção de evolução registrada (RF29) e data-limite por semestre, registrada
// pela coordenação.
@Injectable()
export class CorrecoesEvolucaoService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly politica: PoliticaProntuario,
    private readonly config: ConfigService,
    private readonly auditoria: AuditoriaService,
  ) {}

  // Só o estagiário autor, com vínculo vigente, e o supervisor do caso corrigem; a
  // coordenação só lê. Sem permissão: 403, igual para prontuário inexistente
  // (RNF25). Sem motivo ou campo acima do limite: 400, nada gravado. Depois da
  // data-limite do semestre da sessão: 422, para os dois perfis.
  async corrigir(
    prontuarioId: string,
    evolucaoId: string,
    corpo: unknown,
    usuario: UsuarioAutenticado,
  ) {
    await this.politica.exigirAcesso(
      usuario,
      prontuarioId,
      'corrigir_evolucao',
      'escrita',
    );
    const [evolucao] = await this.db
      .select({
        id: evolucoes.id,
        registradaPor: evolucoes.registradaPor,
        fichaAntiga: sql<boolean>`${evolucoes.humorAparenciaCifrado} is null`,
        inicioSessao: sessoesAtendimento.inicio,
      })
      .from(evolucoes)
      .innerJoin(
        sessoesAtendimento,
        eq(sessoesAtendimento.id, evolucoes.sessaoId),
      )
      .where(
        and(
          eq(evolucoes.id, evolucaoId),
          eq(evolucoes.prontuarioId, prontuarioId),
        ),
      );
    if (!evolucao) throw new NotFoundException('Evolução não encontrada.');
    // O estagiário só corrige o que ele mesmo registrou; depois de uma
    // transferência, o novo estagiário não corrige as evoluções do anterior.
    if (
      usuario.perfil === 'estagiario' &&
      evolucao.registradaPor !== usuario.id
    )
      throw new ForbiddenException(
        'Você só pode corrigir as evoluções que registrou.',
      );
    const resultado = esquemaDaCorrecao(evolucao.fichaAntiga).safeParse(corpo);
    if (!resultado.success)
      throw new BadRequestException(resultado.error.issues);
    const dados = resultado.data;

    const semestre = semestreDaSessao(evolucao.inicioSessao);
    const chave = this.config.getOrThrow<string>('CHAVE_DADOS');
    const cifrarOpcional = (texto: string | null | undefined) =>
      texto ? cifrar(texto, chave) : null;

    return this.db.transaction(async (tx) => {
      // O prazo é lido dentro da transação, para uma mudança da data no meio não
      // deixar passar a correção.
      const dataLimite = await dataLimiteDoSemestre(tx, semestre);
      if (!correcaoNoPrazo(dataLimite))
        throw new UnprocessableEntityException({
          message: `O prazo para corrigir evoluções deste semestre terminou em ${dataBr(dataLimite!)}.`,
          dataLimite,
        });
      // Trava a evolução para calcular a versão seguinte: o FOR UPDATE pediria a
      // permissão de UPDATE, que o usuário da aplicação não tem nas evoluções.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`correcao_evolucao:${evolucaoId}`}, 0))`,
      );
      const [ultima] = await tx
        .select({ versao: correcoesEvolucao.versao })
        .from(correcoesEvolucao)
        .where(eq(correcoesEvolucao.evolucaoId, evolucaoId))
        .orderBy(desc(correcoesEvolucao.versao))
        .limit(1);
      const versao = (ultima?.versao ?? 1) + 1;
      const [registro] = await tx
        .insert(correcoesEvolucao)
        .values({
          evolucaoId,
          versao,
          ...('queixa' in dados
            ? {
                queixaCifrada: cifrar(dados.queixa, chave),
                planejamentoCifrado: cifrar(dados.planejamento, chave),
              }
            : {
                humorAparenciaCifrado: cifrar(dados.humorAparencia, chave),
                conteudoTrabalhadoCifrado: cifrar(
                  dados.conteudoTrabalhado,
                  chave,
                ),
                tecnicasUtilizadasCifrado: cifrar(
                  dados.tecnicasUtilizadas,
                  chave,
                ),
                intervencoesEncaminhamentosCifrado: cifrarOpcional(
                  dados.intervencoesEncaminhamentos,
                ),
                planoProximaSessaoCifrado: cifrar(
                  dados.planoProximaSessao,
                  chave,
                ),
              }),
          motivoCifrado: cifrar(dados.motivo, chave),
          corrigidaPor: usuario.id,
        })
        .returning({
          id: correcoesEvolucao.id,
          corrigidaEm: correcoesEvolucao.corrigidaEm,
        });
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          operacao: 'corrigir_evolucao_sessao',
          entidade: 'correcoes_evolucao',
          entidadeId: registro.id,
          dadosNovos: { evolucaoId, versao },
        },
        tx,
      );
      return {
        id: registro.id,
        evolucaoId,
        versao,
        corrigidaPor: usuario.nome,
        corrigidaEm: registro.corrigidaEm,
        motivo: dados.motivo,
      };
    });
  }

  // Data-limite do semestre vigente, com a última alteração (RF29).
  async consultarDataLimite(
    banco: Leitor = this.db,
    semestre = semestreDaData(hojeEmBrasilia()),
  ): Promise<DataLimiteCorrecao> {
    const [ultima] = await banco
      .select({
        valorAnterior: alteracoesParametro.valorAnterior,
        valorNovo: alteracoesParametro.valorNovo,
        por: usuarios.nome,
        em: alteracoesParametro.alteradoEm,
      })
      .from(alteracoesParametro)
      .innerJoin(usuarios, eq(usuarios.id, alteracoesParametro.alteradoPor))
      .where(
        eq(alteracoesParametro.chave, `${DATA_LIMITE_CORRECAO}:${semestre}`),
      )
      .orderBy(
        desc(alteracoesParametro.alteradoEm),
        desc(alteracoesParametro.id),
      )
      .limit(1);
    const dataLimite = await dataLimiteDoSemestre(banco, semestre);
    return {
      semestre,
      dataLimite,
      pendente: dataLimite === null,
      ultimaAlteracao: ultima
        ? { ...ultima, em: ultima.em.toISOString() }
        : null,
    };
  }

  // A coordenação registra a data-limite do semestre vigente: o valor vigente e o
  // histórico (valor anterior, novo, autor e data/hora) na mesma transação.
  registrarDataLimite(dataLimite: string, autorId: string) {
    const semestre = semestreDaData(hojeEmBrasilia());
    const chaveHistorico = `${DATA_LIMITE_CORRECAO}:${semestre}`;
    return this.db.transaction(async (tx) => {
      // Na primeira gravação do semestre ainda não há linha para travar: a trava
      // pela chave impede duas gravações com o mesmo "sem valor anterior".
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${chaveHistorico}, 0))`,
      );
      const anterior = await dataLimiteDoSemestre(tx, semestre);
      if (anterior !== dataLimite) {
        await tx
          .insert(parametrosSemestre)
          .values({
            semestre,
            chave: DATA_LIMITE_CORRECAO,
            valor: dataLimite,
            alteradoPor: autorId,
          })
          .onConflictDoUpdate({
            target: [parametrosSemestre.semestre, parametrosSemestre.chave],
            set: {
              valor: dataLimite,
              alteradoPor: autorId,
              alteradoEm: sql`now()`,
            },
          });
        await tx.insert(alteracoesParametro).values({
          chave: chaveHistorico,
          valorAnterior: anterior,
          valorNovo: dataLimite,
          alteradoPor: autorId,
        });
        await this.auditoria.registrar(
          {
            usuarioId: autorId,
            operacao: 'registrar_data_limite_correcao',
            entidade: 'parametros_semestre',
            entidadeId: chaveHistorico,
            dadosAnteriores: anterior ? { dataLimite: anterior } : null,
            dadosNovos: { dataLimite },
          },
          tx,
        );
      }
      return this.consultarDataLimite(tx, semestre);
    });
  }
}
