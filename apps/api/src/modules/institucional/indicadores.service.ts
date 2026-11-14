import { Inject, Injectable } from '@nestjs/common';
import {
  alteracoesParametro,
  atribuicoesSupervisor,
  casos,
  desligamentosPorFaltas,
  inscricoes,
  parametrosSemestre,
  sessoesAtendimento,
  transferenciasCaso,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import {
  hojeEmBrasilia,
  semestreDaData,
  type ConsultaIndicadores,
  type Indicadores,
  type VagasOfertadas,
} from '@clinica/shared';
import {
  and,
  between,
  desc,
  eq,
  exists,
  gt,
  gte,
  isNull,
  lte,
  min,
  or,
  sql,
} from 'drizzle-orm';
import {
  AuditoriaService,
  type Transacao,
} from '../../auditoria/auditoria.service';
import { DB } from '../../database/database.module';
import {
  calcularIndicadores,
  fimDoDia,
  inicioDoDia,
} from './calculo-indicadores';

const VAGAS = 'vagas_ofertadas';
type Leitor = Db | Transacao;

// Indicadores operacionais e vagas ofertadas por semestre (RF48), só para a
// coordenação. Os indicadores são calculados na hora, sem tabela de resumo, numa
// transação só leitura: os quatro olham a mesma foto do banco.
@Injectable()
export class IndicadoresService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly auditoria: AuditoriaService,
  ) {}

  consultar(consulta: ConsultaIndicadores): Promise<Indicadores> {
    return this.db.transaction(
      async (tx) => {
        const agora = new Date();
        const referencia =
          consulta.fim === hojeEmBrasilia(agora)
            ? agora
            : fimDoDia(consulta.fim);
        const semestre = semestreDaData(hojeEmBrasilia(referencia));
        const de = inicioDoDia(consulta.inicio);
        const ate = fimDoDia(consulta.fim);
        // Início do vínculo seguinte do mesmo caso: é até onde vai o período de um
        // vínculo encerrado por transferência, mesmo que o seguinte esteja fora
        // da janela.
        const proximo = sql<Date | null>`(select min(v2.vinculado_em) from ${vinculosEstagiario} v2 where v2.caso_id = ${vinculosEstagiario.casoId} and v2.vinculado_em > ${vinculosEstagiario.vinculadoEm})`;
        const encerradoPorTransferencia = exists(
          tx
            .select({ um: sql`1` })
            .from(transferenciasCaso)
            .where(
              eq(transferenciasCaso.vinculoAnteriorId, vinculosEstagiario.id),
            ),
        );
        // O banco devolve só o que pode cruzar a janela da consulta, para o custo
        // não crescer com o histórico inteiro (RNF47):
        // - vínculos iniciados até o fim e ainda vigentes no início, ou encerrados
        //   por transferência (o período deles vai até o vínculo seguinte);
        // - atribuições vigentes na data de referência;
        // - desligamentos do intervalo;
        // - casos cuja primeira sessão realizada caiu no intervalo.
        const [
          vinculos,
          atribuicoes,
          desligamentos,
          primeirasSessoes,
          supervisores,
          vagas,
        ] = await Promise.all([
          tx
            .select({
              casoId: vinculosEstagiario.casoId,
              vinculadoEm: vinculosEstagiario.vinculadoEm,
              encerradoEm: vinculosEstagiario.encerradoEm,
              encerradoPorTransferencia:
                encerradoPorTransferencia.mapWith(Boolean),
              proximoVinculoEm: proximo.mapWith((v: string | Date | null) =>
                v === null ? null : new Date(v),
              ),
            })
            .from(vinculosEstagiario)
            .where(
              and(
                lte(vinculosEstagiario.vinculadoEm, ate),
                or(
                  isNull(vinculosEstagiario.encerradoEm),
                  gte(vinculosEstagiario.encerradoEm, de),
                  and(
                    encerradoPorTransferencia,
                    or(sql`${proximo} is null`, sql`${proximo} >= ${de}`),
                  ),
                ),
              ),
            ),
          tx
            .select({
              casoId: atribuicoesSupervisor.casoId,
              supervisorId: atribuicoesSupervisor.supervisorId,
              atribuidoEm: atribuicoesSupervisor.atribuidoEm,
              encerradaEm: atribuicoesSupervisor.encerradaEm,
            })
            .from(atribuicoesSupervisor)
            .where(
              and(
                lte(atribuicoesSupervisor.atribuidoEm, referencia),
                or(
                  isNull(atribuicoesSupervisor.encerradaEm),
                  gt(atribuicoesSupervisor.encerradaEm, referencia),
                ),
              ),
            ),
          tx
            .select({
              casoId: desligamentosPorFaltas.casoId,
              decididoEm: desligamentosPorFaltas.decididoEm,
              revertidoEm: desligamentosPorFaltas.revertidoEm,
            })
            .from(desligamentosPorFaltas)
            .where(between(desligamentosPorFaltas.decididoEm, de, ate)),
          tx
            .select({
              casoId: sessoesAtendimento.casoId,
              inscritaEm: inscricoes.criadaEm,
              realizadaEm: min(sessoesAtendimento.inicio).mapWith(
                (v: string | Date) => new Date(v),
              ),
            })
            .from(sessoesAtendimento)
            .innerJoin(casos, eq(casos.id, sessoesAtendimento.casoId))
            .innerJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
            .where(eq(sessoesAtendimento.status, 'realizada'))
            .groupBy(sessoesAtendimento.casoId, inscricoes.criadaEm)
            .having(between(min(sessoesAtendimento.inicio), de, ate)),
          tx
            .select({ id: usuarios.id, nome: usuarios.nome })
            .from(usuarios)
            .where(
              and(
                eq(usuarios.perfil, 'supervisor'),
                eq(usuarios.situacao, 'ativo'),
              ),
            ),
          this.totalDeVagas(semestre, tx),
        ]);
        return calcularIndicadores(
          {
            vinculos,
            atribuicoes,
            desligamentos,
            primeirasSessoes,
            supervisores,
            vagasOfertadas: vagas,
          },
          consulta,
          agora,
        );
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }

  private async totalDeVagas(semestre: string, banco: Leitor) {
    const [linha] = await banco
      .select({ valor: parametrosSemestre.valor })
      .from(parametrosSemestre)
      .where(
        and(
          eq(parametrosSemestre.semestre, semestre),
          eq(parametrosSemestre.chave, VAGAS),
        ),
      );
    return linha ? Number(linha.valor) : null;
  }

  async vagas(
    semestre: string,
    banco: Leitor = this.db,
  ): Promise<VagasOfertadas> {
    const [ultima] = await banco
      .select({
        valorAnterior: alteracoesParametro.valorAnterior,
        valorNovo: alteracoesParametro.valorNovo,
        por: usuarios.nome,
        em: alteracoesParametro.alteradoEm,
      })
      .from(alteracoesParametro)
      .innerJoin(usuarios, eq(usuarios.id, alteracoesParametro.alteradoPor))
      .where(eq(alteracoesParametro.chave, `${VAGAS}:${semestre}`))
      .orderBy(
        desc(alteracoesParametro.alteradoEm),
        desc(alteracoesParametro.id),
      )
      .limit(1);
    return {
      semestre,
      total: await this.totalDeVagas(semestre, banco),
      ultimaAlteracao: ultima
        ? { ...ultima, em: ultima.em.toISOString() }
        : null,
    };
  }

  // A mudança grava o valor vigente e o histórico na mesma transação, com o
  // valor anterior, o novo, o autor e a data/hora.
  registrarVagas(semestre: string, total: number, autorId: string) {
    return this.db.transaction(async (tx) => {
      // Trava a chave do semestre antes de ler o valor anterior: na primeira
      // gravação ainda não há linha para o FOR UPDATE bloquear, e duas gravações
      // ao mesmo tempo leriam o mesmo "sem valor anterior".
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${VAGAS}:${semestre}`}, 0))`,
      );
      const [atual] = await tx
        .select({ valor: parametrosSemestre.valor })
        .from(parametrosSemestre)
        .where(
          and(
            eq(parametrosSemestre.semestre, semestre),
            eq(parametrosSemestre.chave, VAGAS),
          ),
        )
        .for('update');
      const valor = String(total);
      if (atual?.valor !== valor) {
        await tx
          .insert(parametrosSemestre)
          .values({ semestre, chave: VAGAS, valor, alteradoPor: autorId })
          .onConflictDoUpdate({
            target: [parametrosSemestre.semestre, parametrosSemestre.chave],
            set: { valor, alteradoPor: autorId, alteradoEm: sql`now()` },
          });
        await tx.insert(alteracoesParametro).values({
          chave: `${VAGAS}:${semestre}`,
          valorAnterior: atual?.valor ?? null,
          valorNovo: valor,
          alteradoPor: autorId,
        });
        await this.auditoria.registrar(
          {
            usuarioId: autorId,
            operacao: 'registrar_vagas_ofertadas',
            entidade: 'parametros_semestre',
            entidadeId: `${VAGAS}:${semestre}`,
            dadosAnteriores: atual ? { total: Number(atual.valor) } : null,
            dadosNovos: { total },
          },
          tx,
        );
      }
      return this.vagas(semestre, tx);
    });
  }
}
