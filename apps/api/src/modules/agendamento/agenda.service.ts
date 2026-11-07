import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { and, asc, eq, gte, inArray, lt } from 'drizzle-orm';
import {
  atribuicoesSupervisor,
  cancelamentosSessao,
  casos,
  inscricoes,
  prontuarios,
  sessoesAtendimento,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import {
  STATUS_PADRAO_DA_AGENDA,
  type AcoesCancelamento,
  type AgendaDoEstagiario,
  type ConsultaAgenda,
  type EstagiarioDoSupervisor,
} from '@clinica/shared';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { DB } from '../../database/database.module';
import { numeroDoParametro } from '../../parametros/parametros.service';
import { acoesDeCancelamento } from './acoes-cancelamento';
import { inicioDoDia, MINUTO } from './horario';

const SEM_ACESSO =
  'Você não tem acesso à agenda deste estagiário. Você pode ver só a agenda dos estagiários que você supervisiona.';

// Agenda de sessões do estagiário (RF11), separada da consulta de horários livres do
// agendamento (GET /sessoes/agenda, RF10), que não mostra o nome dos pacientes.
// O estagiário vê só a própria agenda. O supervisor vê a dos estagiários dele, só
// com as sessões dos casos que ele supervisiona (RNF16).
@Injectable()
export class AgendaService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly auditoria: AuditoriaService,
  ) {}

  // "Estagiário do supervisor" (definição única da CP4): vínculo vigente num caso
  // com a atribuição vigente do supervisor.
  async estagiariosDoSupervisor(
    supervisorId: string,
  ): Promise<EstagiarioDoSupervisor[]> {
    return this.db
      .selectDistinct({ id: usuarios.id, nome: usuarios.nome })
      .from(atribuicoesSupervisor)
      .innerJoin(
        vinculosEstagiario,
        and(
          eq(vinculosEstagiario.casoId, atribuicoesSupervisor.casoId),
          eq(vinculosEstagiario.vigente, true),
        ),
      )
      .innerJoin(usuarios, eq(usuarios.id, vinculosEstagiario.estagiarioId))
      .where(
        and(
          eq(atribuicoesSupervisor.supervisorId, supervisorId),
          eq(atribuicoesSupervisor.vigente, true),
        ),
      )
      .orderBy(asc(usuarios.nome));
  }

  async consultar(
    filtro: ConsultaAgenda,
    usuario: UsuarioAutenticado,
  ): Promise<AgendaDoEstagiario> {
    const supervisor = usuario.perfil === 'supervisor';
    const estagiarioId = supervisor ? filtro.estagiarioId : usuario.id;
    if (!estagiarioId) throw new BadRequestException('Escolha o estagiário.');
    if (supervisor) {
      const dele = await this.estagiariosDoSupervisor(usuario.id);
      if (!dele.some((e) => e.id === estagiarioId)) {
        // A tentativa fica registrada, como no acesso negado ao prontuário (RNF52).
        await this.auditoria.registrar({
          usuarioId: usuario.id,
          operacao: 'consultar_agenda_negada',
          entidade: 'usuarios',
          entidadeId: estagiarioId,
        });
        throw new ForbiddenException(SEM_ACESSO);
      }
    }
    const [estagiario] = await this.db
      .select({ id: usuarios.id, nome: usuarios.nome })
      .from(usuarios)
      .where(eq(usuarios.id, estagiarioId));

    const condicoes = [
      eq(sessoesAtendimento.estagiarioId, estagiarioId),
      inArray(
        sessoesAtendimento.status,
        filtro.status ?? STATUS_PADRAO_DA_AGENDA,
      ),
      gte(sessoesAtendimento.inicio, inicioDoDia(filtro.de)),
      lt(
        sessoesAtendimento.inicio,
        new Date(inicioDoDia(filtro.ate).getTime() + 24 * 60 * MINUTO),
      ),
    ];
    const consulta = this.db
      .select({
        id: sessoesAtendimento.id,
        casoId: sessoesAtendimento.casoId,
        paciente: inscricoes.nomeCompleto,
        inicio: sessoesAtendimento.inicio,
        termino: sessoesAtendimento.termino,
        status: sessoesAtendimento.status,
        classificacao: cancelamentosSessao.classificacao,
        origem: cancelamentosSessao.origem,
        prontuarioId: prontuarios.id,
      })
      .from(sessoesAtendimento)
      .innerJoin(casos, eq(casos.id, sessoesAtendimento.casoId))
      .innerJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
      .leftJoin(
        cancelamentosSessao,
        eq(cancelamentosSessao.sessaoId, sessoesAtendimento.id),
      )
      .leftJoin(
        prontuarios,
        and(
          eq(prontuarios.casoId, sessoesAtendimento.casoId),
          eq(prontuarios.cicloAtendimento, sessoesAtendimento.cicloAtendimento),
        ),
      );
    const linhas = await (
      supervisor
        ? consulta.innerJoin(
            atribuicoesSupervisor,
            and(
              eq(atribuicoesSupervisor.casoId, sessoesAtendimento.casoId),
              eq(atribuicoesSupervisor.supervisorId, usuario.id),
              eq(atribuicoesSupervisor.vigente, true),
            ),
          )
        : consulta
    )
      .where(and(...condicoes))
      .orderBy(asc(sessoesAtendimento.inicio));

    // As ações seguem as regras das rotas, caso a caso.
    const acoesPorCaso = new Map<string, AcoesCancelamento>();
    for (const casoId of new Set(linhas.map((l) => l.casoId))) {
      acoesPorCaso.set(
        casoId,
        await acoesDeCancelamento(this.db, casoId, usuario),
      );
    }
    return {
      estagiario,
      de: filtro.de,
      ate: filtro.ate,
      antecedenciaMinimaMinutos: await numeroDoParametro(
        this.db,
        'antecedencia_minima_cancelamento_minutos',
      ),
      sessoes: linhas.map(({ classificacao, origem, ...s }) => {
        const acoes = acoesPorCaso.get(s.casoId)!;
        return {
          ...s,
          inicio: s.inicio.toISOString(),
          termino: s.termino.toISOString(),
          cancelamento:
            classificacao && origem ? { classificacao, origem } : null,
          acoes: {
            pedidoPaciente: acoes.pedidoPaciente,
            administrativo: acoes.administrativo,
            ausenciaEstagiario: acoes.ausenciaEstagiario,
            // A falta é registrada pelo estagiário com vínculo vigente (RF34); o
            // supervisor não registra.
            registrarFalta:
              usuario.perfil === 'estagiario' && acoes.administrativo,
          },
        };
      }),
    };
  }
}
