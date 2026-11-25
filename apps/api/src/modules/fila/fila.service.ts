import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  atribuicoesSupervisor,
  casos,
  decisoesPrioridade,
  inscricoes,
  type Db,
} from '@clinica/database';
import { CORES, corSchema, type Cor, type FilaEspera } from '@clinica/shared';
import { and, asc, desc, eq, inArray, notExists } from 'drizzle-orm';
import { DB } from '../../database/database.module';
import { semRevogacao } from '../../common/consentimento';
import { decifrar } from '../../common/criptografia';

@Injectable()
export class FilaService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly config: ConfigService,
  ) {}

  // Consulta a decisão vigente e o caso no mesmo snapshot; posições não são persistidas.
  async ordenada(db: Pick<Db, 'select' | 'selectDistinctOn'> = this.db) {
    const vigente = db
      .selectDistinctOn([decisoesPrioridade.inscricaoId], {
        inscricaoId: decisoesPrioridade.inscricaoId,
        corCifrada: decisoesPrioridade.corCifrada,
      })
      .from(decisoesPrioridade)
      .orderBy(
        decisoesPrioridade.inscricaoId,
        desc(decisoesPrioridade.decididaEm),
        desc(decisoesPrioridade.id),
      )
      .as('vigente');
    const linhas = await db
      .select({
        inscricaoId: inscricoes.id,
        casoId: casos.id,
        numero: inscricoes.numero,
        nome: inscricoes.nomeCompleto,
        criadaEm: inscricoes.criadaEm,
        entradaEm: casos.entradaNaFilaEm,
        situacao: casos.situacao,
        supervisorId: atribuicoesSupervisor.supervisorId,
        corCifrada: vigente.corCifrada,
      })
      .from(casos)
      .innerJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
      .innerJoin(vigente, eq(vigente.inscricaoId, inscricoes.id))
      .leftJoin(
        atribuicoesSupervisor,
        and(
          eq(atribuicoesSupervisor.casoId, casos.id),
          eq(atribuicoesSupervisor.vigente, true),
        ),
      )
      .where(
        inArray(casos.situacao, [
          'aguardando_distribuicao',
          'aguardando_vinculo',
          'aguardando_vaga',
        ]),
      );
    const chave = this.config.getOrThrow<string>('CHAVE_DADOS');
    return linhas
      .map((l) => ({
        inscricaoId: l.inscricaoId,
        casoId: l.casoId,
        numero: l.numero,
        nome: l.nome,
        prioridade: corSchema.parse(decifrar(l.corCifrada, chave)),
        entradaEm: l.entradaEm.toISOString(),
        dataInscricao: l.criadaEm.toISOString(),
        situacao: l.situacao,
        supervisorId: l.supervisorId,
      }))
      .sort(
        (a, b) =>
          CORES.indexOf(a.prioridade) - CORES.indexOf(b.prioridade) ||
          a.entradaEm.localeCompare(b.entradaEm) ||
          a.numero.localeCompare(b.numero),
      )
      .map((l, i) => ({ ...l, posicao: i + 1 }));
  }

  async listar(): Promise<FilaEspera> {
    const [ordenados, pendentes] = await Promise.all([
      this.ordenada(),
      this.db
        .select({
          inscricaoId: inscricoes.id,
          numero: inscricoes.numero,
          nome: inscricoes.nomeCompleto,
          criadaEm: inscricoes.criadaEm,
        })
        .from(inscricoes)
        .where(
          and(
            semRevogacao(inscricoes.id),
            notExists(
              this.db
                .select({ id: decisoesPrioridade.id })
                .from(decisoesPrioridade)
                .where(eq(decisoesPrioridade.inscricaoId, inscricoes.id)),
            ),
          ),
        )
        .orderBy(asc(inscricoes.criadaEm), asc(inscricoes.numero)),
    ]);
    return {
      inscritos: ordenados.map(
        ({
          inscricaoId,
          casoId,
          numero,
          nome,
          prioridade,
          entradaEm,
          posicao,
        }) => ({
          inscricaoId,
          casoId,
          numero,
          nome,
          prioridade,
          entradaEm,
          posicao,
        }),
      ),
      pendentes: pendentes.map((l) => ({
        ...l,
        criadaEm: l.criadaEm.toISOString(),
      })),
    };
  }

  async posicaoDaInscricao(
    inscricaoId: string,
    db: Pick<Db, 'select' | 'selectDistinctOn'> = this.db,
  ) {
    return (
      (await this.ordenada(db)).find((i) => i.inscricaoId === inscricaoId)
        ?.posicao ?? null
    );
  }

  async proximoElegivel(supervisorId: string) {
    return (
      (await this.proximosElegiveis([supervisorId])).get(supervisorId) ?? null
    );
  }

  // O próximo inscrito de cada supervisor, com uma ordenação só: a ordenação
  // decifra todas as prioridades, e refazê-la para cada supervisor com vaga
  // multiplicava esse custo (#268).
  async proximosElegiveis(supervisorIds: string[]) {
    const procurados = new Set(supervisorIds);
    const proximos = new Map<
      string,
      { numero: string; nome: string; prioridade: Cor; naFilaDesde: string }
    >();
    if (!procurados.size) return proximos;
    for (const i of await this.ordenada()) {
      if (
        i.situacao !== 'aguardando_vinculo' ||
        !i.supervisorId ||
        !procurados.has(i.supervisorId) ||
        proximos.has(i.supervisorId)
      )
        continue;
      proximos.set(i.supervisorId, {
        numero: i.numero,
        nome: i.nome,
        prioridade: i.prioridade,
        naFilaDesde: i.entradaEm,
      });
    }
    return proximos;
  }
}
