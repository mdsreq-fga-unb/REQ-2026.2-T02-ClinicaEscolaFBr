import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { aliasedTable, and, asc, desc, eq, min } from 'drizzle-orm';
import {
  casos,
  entregasRelatorio,
  impressoesRelatorio,
  inscricoes,
  prontuarios,
  relatoriosFinais,
  sessoesAtendimento,
  usuarios,
  versoesRelatorio,
  type Db,
} from '@clinica/database';
import {
  hojeEmBrasilia,
  SECOES_RELATORIO,
  type EntregaRegistrada,
  type EntregaRelatorio,
  type ImpressaoDoRelatorio,
  type RelatorioFinalDoCiclo,
  type RelatorioParaImpressao,
  type SecoesRelatorio,
  type VersaoDoRelatorio,
} from '@clinica/shared';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { decifrar } from '../../common/criptografia';
import { DB } from '../../database/database.module';
import { PoliticaProntuario } from './politica-prontuario';

const autor = aliasedTable(usuarios, 'autor');
const decisor = aliasedTable(usuarios, 'decisor');

// Nenhum prontuário tem este id: a política registra a tentativa e nega, com a
// mesma resposta do relatório que existe e não é do usuário (RNF25).
export const PRONTUARIO_INEXISTENTE = '00000000-0000-0000-0000-000000000000';

// Quem imprime a versão aprovada (RF33): o estagiário responsável e o supervisor
// do caso, na finalização em PDF, e a secretaria, para a entrega. A coordenação
// só consulta as versões.
const PERFIS_DA_IMPRESSAO = new Set(['estagiario', 'supervisor', 'secretaria']);

// Relatório final do ciclo (RF33): a consulta das versões e a impressão e a
// entrega da versão aprovada. A elaboração do rascunho, o envio e a decisão do
// supervisor ficam no ElaboracaoRelatorioService.
@Injectable()
export class RelatoriosFinaisService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly politica: PoliticaProntuario,
    private readonly config: ConfigService,
    private readonly auditoria: AuditoriaService,
  ) {}

  // O caso e o prontuário do ciclo pedido, ou do ciclo atual do caso.
  async doCiclo(casoId: string, ciclo?: number) {
    const [caso] = await this.db
      .select({
        id: casos.id,
        ciclo: casos.cicloAtendimento,
        paciente: inscricoes.nomeCompleto,
        responsavelLegal: inscricoes.responsavelLegal,
      })
      .from(casos)
      .innerJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
      .where(eq(casos.id, casoId));
    if (!caso) return null;
    const cicloPedido = ciclo ?? caso.ciclo;
    const [prontuario] = await this.db
      .select({ id: prontuarios.id })
      .from(prontuarios)
      .where(
        and(
          eq(prontuarios.casoId, casoId),
          eq(prontuarios.cicloAtendimento, cicloPedido),
        ),
      );
    return { caso, ciclo: cicloPedido, prontuarioId: prontuario?.id ?? null };
  }

  async versoesDoProntuario(prontuarioId: string) {
    return this.db
      .select({
        id: versoesRelatorio.id,
        versao: versoesRelatorio.versao,
        estado: versoesRelatorio.estado,
        secoesCifradas: versoesRelatorio.secoesCifradas,
        justificativaExcecaoCifrada:
          versoesRelatorio.justificativaExcecaoCifrada,
        origem: versoesRelatorio.origem,
        enviadaEm: versoesRelatorio.enviadaEm,
        decididaEm: versoesRelatorio.decididaEm,
        observacoesCifradas: versoesRelatorio.observacoesCifradas,
        autor: autor.nome,
        decisor: decisor.nome,
      })
      .from(versoesRelatorio)
      .innerJoin(
        relatoriosFinais,
        eq(relatoriosFinais.id, versoesRelatorio.relatorioId),
      )
      .leftJoin(autor, eq(autor.id, versoesRelatorio.autorId))
      .leftJoin(decisor, eq(decisor.id, versoesRelatorio.decididaPor))
      .where(eq(relatoriosFinais.prontuarioId, prontuarioId))
      .orderBy(desc(versoesRelatorio.versao));
  }

  private chave() {
    return this.config.getOrThrow<string>('CHAVE_DADOS');
  }

  // GET /casos/:id/relatorio-final: as versões, para o estagiário responsável, o
  // supervisor do caso e a coordenação; para a secretaria, só a versão aprovada,
  // sem as observações (RF33, RF55). Nulo quando o ciclo não tem relatório.
  async consultar(
    casoId: string,
    ciclo: number | undefined,
    usuario: UsuarioAutenticado,
  ): Promise<RelatorioFinalDoCiclo | null> {
    const alvo = await this.doCiclo(casoId, ciclo);
    const administrativo =
      usuario.perfil === 'secretaria' || usuario.perfil === 'coordenacao';
    // Sem prontuário no ciclo, sem relatório: a secretaria e a coordenação recebem a
    // resposta vazia, e o caso inexistente tem a mesma resposta, para não revelar
    // quais casos existem (RNF25). A consulta fica no registro de acessos (RNF52).
    if (!alvo?.prontuarioId && administrativo) {
      await this.politica.registrarSemProntuario(
        usuario,
        'consultar_relatorio_final',
      );
      return null;
    }
    const prontuarioId = alvo?.prontuarioId ?? PRONTUARIO_INEXISTENTE;
    await this.politica.exigirAcesso(
      usuario,
      prontuarioId,
      'consultar_relatorio_final',
      'relatorio_final',
    );
    const linhas = await this.versoesDoProntuario(prontuarioId);
    if (!alvo || linhas.length === 0) return null;

    const secretaria = usuario.perfil === 'secretaria';
    const chave = this.chave();
    const visiveis = secretaria
      ? linhas.filter((v) => v.estado === 'aprovado')
      : linhas;
    const versoes: VersaoDoRelatorio[] = visiveis.map((v) => ({
      versao: v.versao,
      estado: v.estado,
      autor: v.autor ?? '',
      enviadaEm: v.enviadaEm?.toISOString() ?? null,
      decisao:
        v.decididaEm && v.decisor
          ? {
              por: v.decisor,
              em: v.decididaEm.toISOString(),
              observacoes:
                !secretaria && v.observacoesCifradas
                  ? decifrar(v.observacoesCifradas, chave)
                  : null,
            }
          : null,
    }));

    const aprovada = linhas.find((v) => v.estado === 'aprovado');
    const impressoes = aprovada ? await this.impressoes(aprovada.id) : [];
    const entrega = aprovada
      ? await this.entrega(aprovada.id, aprovada.versao)
      : null;
    return {
      casoId,
      ciclo: alvo.ciclo,
      paciente: alvo.caso.paciente,
      responsavelLegal: alvo.caso.responsavelLegal,
      versoes,
      aprovada:
        aprovada && aprovada.decididaEm
          ? {
              versao: aprovada.versao,
              aprovadaPor: aprovada.decisor ?? '',
              aprovadaEm: aprovada.decididaEm.toISOString(),
            }
          : null,
      impressoes,
      entrega,
    };
  }

  private async impressoes(versaoId: string): Promise<ImpressaoDoRelatorio[]> {
    const linhas = await this.db
      .select({ por: usuarios.nome, em: impressoesRelatorio.impressaEm })
      .from(impressoesRelatorio)
      .innerJoin(usuarios, eq(usuarios.id, impressoesRelatorio.impressaPor))
      .where(eq(impressoesRelatorio.versaoId, versaoId))
      .orderBy(desc(impressoesRelatorio.impressaEm));
    return linhas.map((l) => ({ por: l.por, em: l.em.toISOString() }));
  }

  private async entrega(
    versaoId: string,
    versao: number,
  ): Promise<EntregaRegistrada | null> {
    const [linha] = await this.db
      .select({
        entregueA: entregasRelatorio.entregueA,
        entregueEm: entregasRelatorio.entregueEm,
        registradaPor: usuarios.nome,
        registradaEm: entregasRelatorio.registradaEm,
      })
      .from(entregasRelatorio)
      .innerJoin(usuarios, eq(usuarios.id, entregasRelatorio.registradaPor))
      .where(eq(entregasRelatorio.versaoId, versaoId));
    return linha
      ? {
          versao,
          entregueA: linha.entregueA,
          entregueEm: linha.entregueEm,
          registradaPor: linha.registradaPor,
          registradaEm: linha.registradaEm.toISOString(),
        }
      : null;
  }

  // A versão pedida, se for a aprovada, depois da política de acesso. A versão
  // inexistente, a não aprovada e o perfil sem a operação têm a mesma resposta.
  private async exigirAprovada(
    casoId: string,
    ciclo: number | undefined,
    versao: number | null,
    usuario: UsuarioAutenticado,
    operacao: string,
    perfilPermitido: boolean,
  ) {
    const alvo = await this.doCiclo(casoId, ciclo);
    const prontuarioId = alvo?.prontuarioId ?? PRONTUARIO_INEXISTENTE;
    const linhas = alvo?.prontuarioId
      ? await this.versoesDoProntuario(alvo.prontuarioId)
      : [];
    const aprovada = linhas.find(
      (v) =>
        v.estado === 'aprovado' && (versao === null || v.versao === versao),
    );
    await this.politica.exigirAcesso(
      usuario,
      prontuarioId,
      operacao,
      'relatorio_final',
      perfilPermitido && !!aprovada,
    );
    // A política já negou quando não há caso ou versão aprovada.
    return { alvo: alvo!, aprovada: aprovada! };
  }

  // Versão para impressão (RF33): só a aprovada, com os campos das assinaturas.
  async paraImpressao(
    casoId: string,
    ciclo: number | undefined,
    versao: number,
    usuario: UsuarioAutenticado,
  ): Promise<RelatorioParaImpressao> {
    const { alvo, aprovada } = await this.exigirAprovada(
      casoId,
      ciclo,
      versao,
      usuario,
      'abrir_impressao_relatorio_final',
      PERFIS_DA_IMPRESSAO.has(usuario.perfil),
    );
    const [inicio] = await this.db
      .select({ primeira: min(sessoesAtendimento.inicio) })
      .from(sessoesAtendimento)
      .where(
        and(
          eq(sessoesAtendimento.casoId, casoId),
          eq(sessoesAtendimento.cicloAtendimento, alvo.ciclo),
          eq(sessoesAtendimento.status, 'realizada'),
        ),
      );
    const texto = JSON.parse(
      decifrar(aprovada.secoesCifradas, this.chave()),
    ) as Partial<SecoesRelatorio>;
    const secoes = Object.fromEntries(
      SECOES_RELATORIO.map(([secao]) => [secao, texto[secao] ?? '']),
    ) as SecoesRelatorio;
    return {
      casoId,
      ciclo: alvo.ciclo,
      versao: aprovada.versao,
      paciente: alvo.caso.paciente,
      solicitante: alvo.caso.responsavelLegal,
      estagiario: aprovada.autor ?? '',
      supervisor: { nome: aprovada.decisor ?? '' },
      inicioAcompanhamento: inicio?.primeira
        ? hojeEmBrasilia(new Date(inicio.primeira))
        : null,
      secoes,
      aprovadaEm: aprovada.decididaEm!.toISOString(),
    };
  }

  // Registra quem imprimiu a versão aprovada e quando (RF33), no momento em que
  // a página abre a impressão do navegador.
  async registrarImpressao(
    casoId: string,
    ciclo: number | undefined,
    versao: number,
    usuario: UsuarioAutenticado,
  ): Promise<ImpressaoDoRelatorio> {
    const { aprovada } = await this.exigirAprovada(
      casoId,
      ciclo,
      versao,
      usuario,
      'imprimir_relatorio_final',
      PERFIS_DA_IMPRESSAO.has(usuario.perfil),
    );
    return this.db.transaction(async (tx) => {
      const [impressao] = await tx
        .insert(impressoesRelatorio)
        .values({ versaoId: aprovada.id, impressaPor: usuario.id })
        .returning();
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          operacao: 'imprimir_relatorio_final',
          entidade: 'impressoes_relatorio',
          entidadeId: impressao.id,
          dadosNovos: { versao: aprovada.versao },
        },
        tx,
      );
      return { por: usuario.nome, em: impressao.impressaEm.toISOString() };
    });
  }

  // Entrega presencial da via assinada (RF33): só a secretaria, só a versão
  // aprovada, depois de impressa, uma vez por versão.
  async registrarEntrega(
    casoId: string,
    ciclo: number | undefined,
    dados: EntregaRelatorio,
    usuario: UsuarioAutenticado,
  ): Promise<EntregaRegistrada> {
    const { alvo, aprovada } = await this.exigirAprovada(
      casoId,
      ciclo,
      null,
      usuario,
      'registrar_entrega_relatorio_final',
      usuario.perfil === 'secretaria',
    );
    if (await this.entrega(aprovada.id, aprovada.versao))
      throw new ConflictException(
        'A entrega deste relatório já foi registrada.',
      );
    const [impressa] = await this.db
      .select({ id: impressoesRelatorio.id })
      .from(impressoesRelatorio)
      .where(eq(impressoesRelatorio.versaoId, aprovada.id))
      .orderBy(asc(impressoesRelatorio.impressaEm))
      .limit(1);
    if (!impressa)
      throw new ConflictException(
        'Imprima o relatório antes de registrar a entrega.',
      );
    if (dados.entregueEm < hojeEmBrasilia(aprovada.decididaEm!))
      throw new BadRequestException(
        'A data da entrega não pode ser anterior à aprovação do relatório.',
      );
    if (dados.entregueA === 'responsavel_legal' && !alvo.caso.responsavelLegal)
      throw new BadRequestException(
        'A inscrição do paciente não tem responsável legal.',
      );

    try {
      return await this.db.transaction(async (tx) => {
        const [entrega] = await tx
          .insert(entregasRelatorio)
          .values({
            versaoId: aprovada.id,
            viaAssinada: dados.viaAssinada,
            entregueA: dados.entregueA,
            entregueEm: dados.entregueEm,
            registradaPor: usuario.id,
          })
          .returning();
        await this.auditoria.registrar(
          {
            usuarioId: usuario.id,
            operacao: 'registrar_entrega_relatorio_final',
            entidade: 'entregas_relatorio',
            entidadeId: entrega.id,
            dadosNovos: {
              versao: aprovada.versao,
              viaAssinada: true,
              entregueA: dados.entregueA,
              entregueEm: dados.entregueEm,
            },
          },
          tx,
        );
        return {
          versao: aprovada.versao,
          entregueA: entrega.entregueA,
          entregueEm: entrega.entregueEm,
          registradaPor: usuario.nome,
          registradaEm: entrega.registradaEm.toISOString(),
        };
      });
    } catch (erro) {
      // Duas entregas ao mesmo tempo: a restrição única fica com a primeira.
      if (
        erro instanceof Error &&
        /entregas_relatorio_versao_id_unique/.test(
          `${erro.message} ${String((erro as { cause?: unknown }).cause)}`,
        )
      )
        throw new ConflictException(
          'A entrega deste relatório já foi registrada.',
        );
      throw erro;
    }
  }
}
