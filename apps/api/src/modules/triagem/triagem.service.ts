import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  decisoesPrioridade,
  casos,
  inscricoes,
  usuarios,
  type Db,
} from '@clinica/database';
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  ne,
  notExists,
  or,
  sql,
} from 'drizzle-orm';
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

  private semDecisao() {
    return notExists(
      this.db
        .select({ id: decisoesPrioridade.id })
        .from(decisoesPrioridade)
        .where(eq(decisoesPrioridade.inscricaoId, inscricoes.id)),
    );
  }

  // Só o número de inscrições aguardando triagem, para o menu, sem as respostas.
  async contarPendentes() {
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(inscricoes)
      .where(this.semDecisao());
    return { total };
  }

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
      .where(this.semDecisao())
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

  // Uma inscrição da triagem, com a declaração do interessado e o histórico de
  // decisões de prioridade, para a tela da inscrição aberta (RF4, RF6). Vale o
  // mesmo recorte das duas listas: aguardando triagem ou com prioridade e caso
  // ainda não encerrado (RNF21).
  async detalhar(inscricaoId: string) {
    const chave = this.config.getOrThrow<string>('CHAVE_DADOS');
    const [linha] = await this.db
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
        and(
          eq(inscricoes.id, inscricaoId),
          or(
            this.semDecisao(),
            exists(
              this.db
                .select({ id: casos.id })
                .from(casos)
                .where(
                  and(
                    eq(casos.inscricaoId, inscricoes.id),
                    ne(casos.situacao, 'encerrado'),
                  ),
                ),
            ),
          ),
        ),
      );
    if (!linha) throw new NotFoundException('Inscrição não encontrada.');
    const decisoes = await this.db
      .select({
        corCifrada: decisoesPrioridade.corCifrada,
        decididaEm: decisoesPrioridade.decididaEm,
        decisor: usuarios.nome,
        perfilDecisor: usuarios.perfil,
      })
      .from(decisoesPrioridade)
      .innerJoin(usuarios, eq(usuarios.id, decisoesPrioridade.decididaPor))
      .where(eq(decisoesPrioridade.inscricaoId, inscricaoId))
      .orderBy(
        desc(decisoesPrioridade.decididaEm),
        desc(decisoesPrioridade.id),
      );
    const abrir = (valor: string | null) =>
      valor ? decifrar(valor, chave) : null;
    return {
      id: linha.id,
      numero: linha.numero,
      criadaEm: linha.criadaEm.toISOString(),
      diasAguardando: Math.floor(
        (Date.now() - linha.criadaEm.getTime()) / 86_400_000,
      ),
      declaracaoInteressado: {
        queixa: abrir(linha.queixa),
        percepcaoUrgencia: abrir(linha.percepcaoUrgencia),
        historicoRelevante: abrir(linha.historicoRelevante),
      },
      historico: decisoes.map((decisao) => ({
        prioridade: decifrar(decisao.corCifrada, chave),
        decisor: decisao.decisor,
        perfilDecisor: decisao.perfilDecisor,
        decididaEm: decisao.decididaEm.toISOString(),
      })),
    };
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
      // Casos encerrados saem da lista, para ela não crescer sem limite (RNF21).
      .innerJoin(casos, eq(casos.inscricaoId, decisoesPrioridade.inscricaoId))
      .where(ne(casos.situacao, 'encerrado'))
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
        .select({ id: inscricoes.id, criadaEm: inscricoes.criadaEm })
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
          .values({
            inscricaoId,
            situacao: 'aguardando_distribuicao',
            entradaNaFilaEm: inscricao.criadaEm,
          })
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
