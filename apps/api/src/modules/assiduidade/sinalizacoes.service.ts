import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import {
  atribuicoesSupervisor,
  cancelamentosSessao,
  decisoesReprovacao,
  reclassificacoesFalta,
  sessoesAtendimento,
  sinalizacoesReprovacao,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import type {
  ConsultaSinalizacoes,
  DecisaoDaSinalizacao,
  EstagiarioNoSemestre,
  RegistroDecisao,
  SinalizacaoReprovacao,
  Sinalizacoes,
} from '@clinica/shared';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { cifrar, decifrar } from '../../common/criptografia';
import { DB } from '../../database/database.module';
import {
  faltaDoSupervisor,
  FaltasEstagiarioService,
  SEM_ACESSO,
} from './faltas-estagiario.service';
import { FaltasSemestreService } from './faltas-semestre.service';

const ENCERRADA_SEM_DECISAO =
  'Esta sinalização foi encerrada sem decisão, porque a contagem ficou abaixo do limite. Se a contagem voltar a 3 no semestre, uma nova sinalização é gerada.';

// Sinalizações de reprovação do estagiário por faltas (RF63), para o supervisor do
// estagiário e a coordenação (RNF35), e a decisão institucional da coordenação
// sobre elas (RF64). A sinalização é gerada e encerrada sem decisão na transação
// da ausência (RF16) ou da reclassificação (RF40).
@Injectable()
export class SinalizacoesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly auditoria: AuditoriaService,
    private readonly faltas: FaltasEstagiarioService,
    private readonly semestre: FaltasSemestreService,
    private readonly config: ConfigService,
  ) {}

  // As abertas vão para os supervisores que têm o estagiário hoje (definição única
  // da CP4, apontamento 2 da inspeção). O histórico ("todas") segue a mesma lista
  // do RF39, que inclui os estagiários com falta registrada num caso do
  // supervisor. A contagem e as sessões são as do RF40, com o mesmo recorte do
  // supervisor, e a contagem é a atual, mesmo depois do encerramento.
  async consultar(
    { situacao, estagiarioId }: ConsultaSinalizacoes,
    usuario: UsuarioAutenticado,
  ): Promise<Sinalizacoes> {
    const supervisor = usuario.perfil === 'supervisor';
    const visiveis = await this.faltas.estagiarios(usuario);
    if (estagiarioId && !visiveis.some((e) => e.id === estagiarioId)) {
      if (supervisor) {
        await this.auditoria.registrar({
          usuarioId: usuario.id,
          operacao: 'consultar_sinalizacoes_reprovacao_negada',
          entidade: 'usuarios',
          entidadeId: estagiarioId,
        });
        throw new ForbiddenException(SEM_ACESSO);
      }
      throw new NotFoundException('Estagiário não encontrado.');
    }
    let ids = estagiarioId ? [estagiarioId] : visiveis.map((e) => e.id);
    if (supervisor && situacao === 'abertas') {
      const hoje = new Set(
        (await this.faltas.estagiariosDeHoje(usuario.id)).map((e) => e.id),
      );
      ids = ids.filter((id) => hoje.has(id));
    }
    if (ids.length === 0) return { sinalizacoes: [] };

    const linhas = await this.db
      .select({
        id: sinalizacoesReprovacao.id,
        estagiarioId: sinalizacoesReprovacao.estagiarioId,
        nome: usuarios.nome,
        semestre: sinalizacoesReprovacao.semestre,
        geradaEm: sinalizacoesReprovacao.geradaEm,
        encerradaEm: sinalizacoesReprovacao.encerradaEm,
        motivoEncerramento: sinalizacoesReprovacao.motivoEncerramento,
        faltaReclassificadaInicio: sessoesAtendimento.inicio,
        // O mesmo recorte das sessões (RF40, RNF35): para o supervisor, a data
        // da falta reclassificada só sai se ela é de um caso dele no momento do
        // registro da ausência.
        faltaReclassificadaVisivel: supervisor
          ? sql<boolean>`${faltaDoSupervisor(this.db, usuario.id)}`
          : sql<boolean>`true`,
        reclassificadaEm: reclassificacoesFalta.reclassificadaEm,
      })
      .from(sinalizacoesReprovacao)
      .innerJoin(usuarios, eq(usuarios.id, sinalizacoesReprovacao.estagiarioId))
      .leftJoin(
        reclassificacoesFalta,
        eq(reclassificacoesFalta.id, sinalizacoesReprovacao.reclassificacaoId),
      )
      .leftJoin(
        cancelamentosSessao,
        eq(cancelamentosSessao.id, reclassificacoesFalta.cancelamentoId),
      )
      .leftJoin(
        sessoesAtendimento,
        eq(sessoesAtendimento.id, cancelamentosSessao.sessaoId),
      )
      .where(
        and(
          inArray(sinalizacoesReprovacao.estagiarioId, ids),
          situacao === 'abertas'
            ? isNull(sinalizacoesReprovacao.encerradaEm)
            : undefined,
        ),
      )
      .orderBy(desc(sinalizacoesReprovacao.geradaEm));

    const supervisores = await this.supervisoresDeHoje([
      ...new Set(linhas.map((l) => l.estagiarioId)),
    ]);
    const decisoes = await this.decisoes(
      linhas.map((l) => l.id),
      usuario.perfil === 'coordenacao',
    );
    const contagens = new Map<string, EstagiarioNoSemestre>();
    const sinalizacoes: SinalizacaoReprovacao[] = [];
    for (const l of linhas) {
      const chave = `${l.estagiarioId}|${l.semestre}`;
      if (!contagens.has(chave)) {
        const { estagiarios } = await this.semestre.consultar(
          { semestre: l.semestre, estagiarioId: l.estagiarioId },
          usuario,
        );
        contagens.set(chave, estagiarios[0]);
      }
      const contagem = contagens.get(chave)!;
      sinalizacoes.push({
        id: l.id,
        estagiario: { id: l.estagiarioId, nome: l.nome },
        semestre: l.semestre,
        geradaEm: l.geradaEm.toISOString(),
        encerradaEm: l.encerradaEm?.toISOString() ?? null,
        motivoEncerramento: l.motivoEncerramento,
        faltaReclassificada:
          l.faltaReclassificadaInicio && l.reclassificadaEm
            ? {
                inicio: l.faltaReclassificadaVisivel
                  ? l.faltaReclassificadaInicio.toISOString()
                  : null,
                em: l.reclassificadaEm.toISOString(),
              }
            : null,
        faltas: contagem.faltas,
        faltasDeOutrosSupervisores: contagem.faltasDeOutrosSupervisores,
        sessoes: contagem.linhas
          .filter((f) => !f.reclassificada)
          .map((f) => f.inicio)
          .reverse(),
        supervisores: supervisores.get(l.estagiarioId) ?? [],
        decisoes: decisoes.get(l.id) ?? [],
      });
    }
    // As abertas primeiro; em cada grupo, da mais recente para a mais antiga.
    sinalizacoes.sort(
      (a, b) =>
        Number(a.encerradaEm !== null) - Number(b.encerradaEm !== null) ||
        b.geradaEm.localeCompare(a.geradaEm),
    );
    return { sinalizacoes };
  }

  // Os supervisores com cada estagiário hoje: atribuição vigente num caso em que o
  // estagiário tem o vínculo vigente (CP4). Um estagiário pode ter mais de um.
  // A coordenação registra a decisão institucional sobre a sinalização (RF64). A
  // primeira decisão encerra a sinalização aberta; numa sinalização já decidida, a
  // decisão nova fica ao lado da anterior. A sinalização encerrada porque a
  // contagem ficou abaixo do limite não recebe decisão (apontamento 1 da
  // inspeção). A linha da sinalização fica travada até o fim da transação (D1.3):
  // duas decisões ao mesmo tempo não a encerram duas vezes, e uma reclassificação
  // que a encerraria espera a decisão terminar.
  async registrarDecisao(
    sinalizacaoId: string,
    { decisao, justificativa }: RegistroDecisao,
    usuario: UsuarioAutenticado,
  ): Promise<DecisaoDaSinalizacao> {
    return this.db.transaction(async (tx) => {
      const [sinalizacao] = await tx
        .select({
          encerradaEm: sinalizacoesReprovacao.encerradaEm,
          motivo: sinalizacoesReprovacao.motivoEncerramento,
        })
        .from(sinalizacoesReprovacao)
        .where(eq(sinalizacoesReprovacao.id, sinalizacaoId))
        .for('update');
      if (!sinalizacao) {
        throw new NotFoundException('Sinalização não encontrada.');
      }
      if (sinalizacao.motivo === 'contagem_abaixo_do_limite') {
        throw new ConflictException(ENCERRADA_SEM_DECISAO);
      }
      const [gravada] = await tx
        .insert(decisoesReprovacao)
        .values({
          sinalizacaoId,
          decisao,
          justificativaCifrada: cifrar(justificativa, this.chave()),
          decididaPor: usuario.id,
        })
        .returning({
          id: decisoesReprovacao.id,
          em: decisoesReprovacao.decididaEm,
        });
      const aberta = sinalizacao.encerradaEm === null;
      if (aberta) {
        await tx
          .update(sinalizacoesReprovacao)
          .set({ encerradaEm: sql`now()`, motivoEncerramento: 'decisao' })
          .where(eq(sinalizacoesReprovacao.id, sinalizacaoId));
      }
      // A auditoria guarda a decisão e só que a justificativa foi informada, como
      // os outros motivos da CP9 (apontamento 3).
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          operacao: 'registrar_decisao_reprovacao',
          entidade: 'sinalizacoes_reprovacao',
          entidadeId: sinalizacaoId,
          dadosAnteriores: { situacao: aberta ? 'aberta' : 'decidida' },
          dadosNovos: {
            situacao: 'decidida',
            decisao,
            decisaoId: gravada.id,
            justificativaInformada: true,
          },
        },
        tx,
      );
      return {
        id: gravada.id,
        decisao,
        justificativa,
        por: usuario.nome,
        em: gravada.em.toISOString(),
      };
    });
  }

  // As decisões de cada sinalização, da mais antiga para a mais recente. A
  // justificativa só sai para a coordenação (apontamento 2 da inspeção).
  private async decisoes(sinalizacaoIds: string[], comJustificativa: boolean) {
    const porSinalizacao = new Map<string, DecisaoDaSinalizacao[]>();
    if (sinalizacaoIds.length === 0) return porSinalizacao;
    const linhas = await this.db
      .select({
        id: decisoesReprovacao.id,
        sinalizacaoId: decisoesReprovacao.sinalizacaoId,
        decisao: decisoesReprovacao.decisao,
        justificativaCifrada: decisoesReprovacao.justificativaCifrada,
        por: usuarios.nome,
        em: decisoesReprovacao.decididaEm,
      })
      .from(decisoesReprovacao)
      .innerJoin(usuarios, eq(usuarios.id, decisoesReprovacao.decididaPor))
      .where(inArray(decisoesReprovacao.sinalizacaoId, sinalizacaoIds))
      .orderBy(asc(decisoesReprovacao.decididaEm), asc(decisoesReprovacao.id));
    for (const l of linhas) {
      porSinalizacao.set(l.sinalizacaoId, [
        ...(porSinalizacao.get(l.sinalizacaoId) ?? []),
        {
          id: l.id,
          decisao: l.decisao,
          justificativa: comJustificativa
            ? decifrar(l.justificativaCifrada, this.chave())
            : null,
          por: l.por,
          em: l.em.toISOString(),
        },
      ]);
    }
    return porSinalizacao;
  }

  private chave() {
    return this.config.getOrThrow<string>('CHAVE_DADOS');
  }

  private async supervisoresDeHoje(estagiarioIds: string[]) {
    const porEstagiario = new Map<string, string[]>();
    if (estagiarioIds.length === 0) return porEstagiario;
    const linhas = await this.db
      .selectDistinct({
        estagiarioId: vinculosEstagiario.estagiarioId,
        nome: usuarios.nome,
      })
      .from(atribuicoesSupervisor)
      .innerJoin(
        vinculosEstagiario,
        and(
          eq(vinculosEstagiario.casoId, atribuicoesSupervisor.casoId),
          eq(vinculosEstagiario.vigente, true),
        ),
      )
      .innerJoin(usuarios, eq(usuarios.id, atribuicoesSupervisor.supervisorId))
      .where(
        and(
          eq(atribuicoesSupervisor.vigente, true),
          inArray(vinculosEstagiario.estagiarioId, estagiarioIds),
        ),
      );
    for (const l of linhas) {
      porEstagiario.set(l.estagiarioId, [
        ...(porEstagiario.get(l.estagiarioId) ?? []),
        l.nome,
      ]);
    }
    for (const nomes of porEstagiario.values()) {
      nomes.sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }
    return porEstagiario;
  }
}
