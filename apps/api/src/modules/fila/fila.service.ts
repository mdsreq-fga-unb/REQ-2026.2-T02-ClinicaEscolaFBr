import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, asc, desc, eq, inArray, notExists } from 'drizzle-orm';
import {
  atribuicoesSupervisor,
  casos,
  decisoesPrioridade,
  inscricoes,
  type Db,
} from '@clinica/database';
import { DB } from '../../database/database.module';
import { decifrar } from '../../common/criptografia';

const ORDEM = { vermelha: 0, amarela: 1, verde: 2 } as const;

@Injectable()
export class FilaService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly config: ConfigService,
  ) {}

  async listarParaDistribuicao() {
    const casosPendentes = await this.db
      .select({
        casoId: casos.id,
        numero: inscricoes.numero,
        nome: inscricoes.nomeCompleto,
        criadaEm: inscricoes.criadaEm,
        inscricaoId: inscricoes.id,
      })
      .from(casos)
      .innerJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
      .where(
        and(
          eq(casos.situacao, 'aguardando_distribuicao'),
          notExists(
            this.db
              .select({ id: atribuicoesSupervisor.id })
              .from(atribuicoesSupervisor)
              .where(
                and(
                  eq(atribuicoesSupervisor.casoId, casos.id),
                  eq(atribuicoesSupervisor.vigente, true),
                ),
              ),
          ),
        ),
      )
      .orderBy(asc(inscricoes.criadaEm), asc(inscricoes.id));
    if (!casosPendentes.length) return [];
    const ids = new Set(casosPendentes.map((c) => c.inscricaoId));
    const decisaoRows = await this.db
      .select({
        inscricaoId: decisoesPrioridade.inscricaoId,
        corCifrada: decisoesPrioridade.corCifrada,
        decididaEm: decisoesPrioridade.decididaEm,
        id: decisoesPrioridade.id,
      })
      .from(decisoesPrioridade)
      .where(inArray(decisoesPrioridade.inscricaoId, [...ids]))
      .orderBy(
        asc(decisoesPrioridade.inscricaoId),
        desc(decisoesPrioridade.decididaEm),
        desc(decisoesPrioridade.id),
      );
    const vigentes = new Map<string, string>();
    for (const decisao of decisaoRows)
      if (ids.has(decisao.inscricaoId) && !vigentes.has(decisao.inscricaoId)) {
        vigentes.set(
          decisao.inscricaoId,
          decifrar(
            decisao.corCifrada,
            this.config.getOrThrow<string>('CHAVE_DADOS'),
          ),
        );
      }
    return casosPendentes
      .map((caso) => ({
        casoId: caso.casoId,
        numero: caso.numero,
        nome: caso.nome,
        prioridade: vigentes.get(caso.inscricaoId) ?? null,
        criadaEm: caso.criadaEm.toISOString(),
      }))
      .sort((a, b) => {
        const aRank = a.prioridade
          ? ORDEM[a.prioridade as keyof typeof ORDEM]
          : 3;
        const bRank = b.prioridade
          ? ORDEM[b.prioridade as keyof typeof ORDEM]
          : 3;
        return (
          aRank - bRank ||
          a.criadaEm.localeCompare(b.criadaEm) ||
          a.casoId.localeCompare(b.casoId)
        );
      });
  }
}
