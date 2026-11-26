import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import {
  atribuicoesSupervisor,
  cancelamentosSessao,
  reclassificacoesFalta,
  sessoesAtendimento,
  sinalizacoesReprovacao,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import type {
  ConsultaSinalizacoes,
  EstagiarioNoSemestre,
  SinalizacaoReprovacao,
  Sinalizacoes,
} from '@clinica/shared';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { DB } from '../../database/database.module';
import {
  faltaDoSupervisor,
  FaltasEstagiarioService,
  SEM_ACESSO,
} from './faltas-estagiario.service';
import { FaltasSemestreService } from './faltas-semestre.service';

// Sinalizações de reprovação do estagiário por faltas (RF63), para o supervisor do
// estagiário e a coordenação (RNF35). Só leitura: a sinalização é gerada e
// encerrada na transação da ausência (RF16) ou da reclassificação (RF40), e a
// decisão é do RF64.
@Injectable()
export class SinalizacoesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly auditoria: AuditoriaService,
    private readonly faltas: FaltasEstagiarioService,
    private readonly semestre: FaltasSemestreService,
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
