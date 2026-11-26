import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  prontuarios,
  transferenciasCaso,
  usuarios,
  type Db,
} from '@clinica/database';
import type {
  HistoricoEvolucoes,
  RegistroHistoricoEvolucao,
  SessaoHistoricoEvolucao,
} from '@clinica/shared';
import { aliasedTable, and, asc, eq, gte, lt } from 'drizzle-orm';
import { DB } from '../../database/database.module';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { PoliticaProntuario } from './politica-prontuario';
import { ProntuariosService } from './prontuarios.service';

const anterior = aliasedTable(usuarios, 'estagiario_anterior');
const novo = aliasedTable(usuarios, 'estagiario_novo');
const supervisorAnterior = aliasedTable(usuarios, 'supervisor_anterior');
const supervisorNovo = aliasedTable(usuarios, 'supervisor_novo');
const CAMPOS = [
  ['humorAparencia', 'Humor e aparência'],
  ['conteudoTrabalhado', 'Conteúdo trabalhado'],
  ['tecnicasUtilizadas', 'Técnicas utilizadas'],
  ['intervencoesEncaminhamentos', 'Intervenções e encaminhamentos'],
  ['planoProximaSessao', 'Plano para a próxima sessão'],
  ['queixa', 'Queixa'],
  ['planejamento', 'Planejamento'],
] as const;

@Injectable()
export class HistoricoEvolucoesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly politica: PoliticaProntuario,
    private readonly prontuariosService: ProntuariosService,
  ) {}

  async consultar(
    id: string,
    ciclo: number | undefined,
    usuario: UsuarioAutenticado,
  ): Promise<HistoricoEvolucoes> {
    // Confere antes de revelar até mesmo a existência dos ciclos (RF55/RF56).
    const origem = await this.politica.exigirAcesso(
      usuario,
      id,
      'consultar_historico_evolucoes',
      'leitura',
    );
    const ciclos = await this.db
      .select({
        id: prontuarios.id,
        numero: prontuarios.cicloAtendimento,
        desde: prontuarios.criadoEm,
      })
      .from(prontuarios)
      .where(eq(prontuarios.casoId, origem.casoId))
      .orderBy(asc(prontuarios.cicloAtendimento));
    const atual = ciclos[ciclos.length - 1];
    const escolhido = ciclos.find((c) => c.numero === (ciclo ?? atual.numero));
    if (!escolhido)
      throw new NotFoundException(
        'Ciclo de atendimento não encontrado neste caso.',
      );
    // Reutiliza a leitura autorizada e a decifragem das versões do RF28/RF29.
    // Também revalida o vínculo ao ler o ciclo selecionado.
    const p = await this.prontuariosService.consultar(escolhido.id, usuario);
    const seguinte = ciclos.find((c) => c.numero > escolhido.numero);
    const transferencias = await this.db
      .select({
        id: transferenciasCaso.id,
        em: transferenciasCaso.transferidoEm,
        estagiarioAnterior: anterior.nome,
        estagiarioNovo: novo.nome,
        supervisorAnterior: supervisorAnterior.nome,
        supervisorNovo: supervisorNovo.nome,
      })
      .from(transferenciasCaso)
      .leftJoin(
        anterior,
        eq(anterior.id, transferenciasCaso.estagiarioAnteriorId),
      )
      .leftJoin(novo, eq(novo.id, transferenciasCaso.estagiarioNovoId))
      .leftJoin(
        supervisorAnterior,
        eq(supervisorAnterior.id, transferenciasCaso.supervisorAnteriorId),
      )
      .leftJoin(
        supervisorNovo,
        eq(supervisorNovo.id, transferenciasCaso.supervisorNovoId),
      )
      .where(
        and(
          eq(transferenciasCaso.casoId, origem.casoId),
          gte(transferenciasCaso.transferidoEm, escolhido.desde),
          seguinte
            ? lt(transferenciasCaso.transferidoEm, seguinte.desde)
            : undefined,
        ),
      )
      .orderBy(
        asc(transferenciasCaso.transferidoEm),
        asc(transferenciasCaso.id),
      );
    return {
      prontuarioId: escolhido.id,
      ciclo: escolhido.numero,
      ciclos: ciclos.map((c) => ({
        numero: c.numero,
        atual: c.numero === atual.numero,
      })),
      transferencias: transferencias.map((t) => ({
        ...t,
        em: t.em.toISOString(),
      })),
      sessoes: p.sessoes
        .filter((s) => s.evolucao)
        .map((s): SessaoHistoricoEvolucao => {
          const e = s.evolucao!;
          return {
            id: s.id,
            evolucaoId: e.id,
            numero: s.numeroNoCiclo,
            inicio: s.inicio.toISOString(),
            autor: e.registradaPor,
            validacao: {
              situacao: e.validacao.situacao,
              ultima: e.validacao.ultima && {
                por: e.validacao.ultima.por,
                em: e.validacao.ultima.em.toISOString(),
              },
              mudanca: e.validacao.mudanca && {
                tipo: e.validacao.mudanca.tipo,
                em: e.validacao.mudanca.em.toISOString(),
              },
            },
            registros: [
              ...e.versoes.map((v): RegistroHistoricoEvolucao => ({
                id: `${e.id}:versao:${v.versao}`,
                tipo: v.versao === 1 ? 'original' : 'correcao',
                versao: v.versao,
                autor: v.autor,
                em: v.em.toISOString(),
                motivo: v.motivo,
                campos: CAMPOS.filter(([campo]) => v[campo] !== null).map(
                  ([campo, rotulo]) => ({ rotulo, texto: v[campo] }),
                ),
              })),
              ...e.complementos.map((c): RegistroHistoricoEvolucao => ({
                id: c.id,
                tipo: 'complemento',
                versao: null,
                autor: c.autor,
                em: c.em.toISOString(),
                motivo: null,
                campos: [{ rotulo: 'Complemento', texto: c.texto }],
              })),
            ].sort(
              (a, b) =>
                a.em.localeCompare(b.em) ||
                (a.versao ?? Number.MAX_SAFE_INTEGER) -
                  (b.versao ?? Number.MAX_SAFE_INTEGER) ||
                a.id.localeCompare(b.id),
            ),
          };
        })
        .sort(
          (a, b) =>
            a.inicio.localeCompare(b.inicio) || a.id.localeCompare(b.id),
        ),
    };
  }
}
