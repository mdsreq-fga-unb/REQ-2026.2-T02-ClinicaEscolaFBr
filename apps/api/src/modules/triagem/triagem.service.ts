import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  decisoesPrioridade,
  casos,
  inscricoes,
  usuarios,
  type Db,
} from '@clinica/database';
import { asc, desc, eq, notExists, sql } from 'drizzle-orm';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { cifrar, decifrar } from '../../common/criptografia';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { DB } from '../../database/database.module';

@Injectable()
export class TriagemService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly config: ConfigService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async listarPendentes(ordem: 'antigas' | 'recentes' = 'antigas') {
    const chave = this.config.getOrThrow<string>('CHAVE_DADOS');
    const linhas = await this.db
      .select({
        id: inscricoes.id,
        numero: inscricoes.numero,
        criadaEm: inscricoes.criadaEm,
        queixa: inscricoes.queixaCifrada,
        percepcaoUrgencia: inscricoes.percepcaoUrgenciaCifrada,
        historicoRelevante: inscricoes.historicoRelevanteCifrado,
      })
      .from(inscricoes)
      .where(
        notExists(
          this.db
            .select({ id: decisoesPrioridade.id })
            .from(decisoesPrioridade)
            .where(eq(decisoesPrioridade.inscricaoId, inscricoes.id)),
        ),
      )
      .orderBy(
        ordem === 'recentes'
          ? desc(inscricoes.criadaEm)
          : asc(inscricoes.criadaEm),
        asc(inscricoes.id),
      );

    const agora = Date.now();
    return linhas.map((linha) => ({
      id: linha.id,
      numero: linha.numero,
      criadaEm: linha.criadaEm.toISOString(),
      diasAguardando: Math.floor(
        (agora - linha.criadaEm.getTime()) / 86_400_000,
      ),
      declaracaoInteressado: {
        queixa: linha.queixa ? decifrar(linha.queixa, chave) : null,
        percepcaoUrgencia: linha.percepcaoUrgencia
          ? decifrar(linha.percepcaoUrgencia, chave)
          : null,
        historicoRelevante: linha.historicoRelevante
          ? decifrar(linha.historicoRelevante, chave)
          : null,
      },
    }));
  }

  async listarClassificadas() {
    const chave = this.config.getOrThrow<string>('CHAVE_DADOS');
    const decisoes = await this.db
      .select({
        id: decisoesPrioridade.id,
        inscricaoId: decisoesPrioridade.inscricaoId,
        corCifrada: decisoesPrioridade.corCifrada,
        decididaEm: decisoesPrioridade.decididaEm,
        decisor: usuarios.nome,
        numero: inscricoes.numero,
      })
      .from(decisoesPrioridade)
      .innerJoin(inscricoes, eq(inscricoes.id, decisoesPrioridade.inscricaoId))
      .innerJoin(usuarios, eq(usuarios.id, decisoesPrioridade.decididaPor))
      .orderBy(
        asc(decisoesPrioridade.inscricaoId),
        desc(decisoesPrioridade.decididaEm),
        desc(decisoesPrioridade.id),
      );
    const historico = new Map<string, typeof decisoes>();
    for (const decisao of decisoes) {
      const lista = historico.get(decisao.inscricaoId) ?? [];
      lista.push(decisao);
      historico.set(decisao.inscricaoId, lista);
    }
    return [...historico.entries()].map(
      ([inscricaoId, decisoesDaInscricao]) => {
        const vigente = decisoesDaInscricao[0];
        return {
          id: inscricaoId,
          numero: vigente.numero,
          prioridade: decifrar(vigente.corCifrada, chave),
          decididaEm: vigente.decididaEm.toISOString(),
          historico: decisoesDaInscricao.map((decisao) => ({
            prioridade: decifrar(decisao.corCifrada, chave),
            decisor: decisao.decisor,
            decididaEm: decisao.decididaEm.toISOString(),
          })),
        };
      },
    );
  }

  async registrarPrioridade(
    inscricaoId: string,
    cor: string,
    usuario: UsuarioAutenticado,
  ) {
    const chave = this.config.getOrThrow<string>('CHAVE_DADOS');
    return this.db.transaction(async (tx) => {
      const [inscricao] = await tx
        .select({ id: inscricoes.id })
        .from(inscricoes)
        .where(eq(inscricoes.id, inscricaoId))
        .for('update');
      if (!inscricao) throw new NotFoundException('Inscrição não encontrada.');

      const [anterior] = await tx
        .select({
          id: decisoesPrioridade.id,
          decididaEm: decisoesPrioridade.decididaEm,
        })
        .from(decisoesPrioridade)
        .where(eq(decisoesPrioridade.inscricaoId, inscricaoId))
        .orderBy(
          desc(decisoesPrioridade.decididaEm),
          desc(decisoesPrioridade.id),
        )
        .limit(1);

      const [decisao] = await tx
        .insert(decisoesPrioridade)
        .values({
          inscricaoId,
          corCifrada: cifrar(cor, chave),
          decididaPor: usuario.id,
          decisaoAnteriorId: anterior?.id ?? null,
          decididaEm: anterior
            ? sql`greatest(clock_timestamp(), ${anterior.decididaEm.toISOString()}::timestamptz + interval '1 millisecond')`
            : sql`clock_timestamp()`,
        })
        .returning({
          id: decisoesPrioridade.id,
          decididaEm: decisoesPrioridade.decididaEm,
        });

      if (!anterior) {
        await tx
          .insert(casos)
          .values({ inscricaoId, situacao: 'aguardando_distribuicao' })
          .onConflictDoNothing({ target: casos.inscricaoId });
      }

      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          operacao: anterior
            ? 'reclassificar_prioridade_clinica'
            : 'registrar_prioridade_clinica',
          entidade: 'decisoes_prioridade',
          entidadeId: decisao.id,
          dadosAnteriores: anterior ? { decisaoAnteriorId: anterior.id } : null,
          dadosNovos: { decisaoId: decisao.id, inscricaoId },
        },
        tx,
      );
      return { id: decisao.id, decididaEm: decisao.decididaEm.toISOString() };
    });
  }
}
