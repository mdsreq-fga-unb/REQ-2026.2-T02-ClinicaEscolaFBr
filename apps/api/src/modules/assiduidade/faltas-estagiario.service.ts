import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  desc,
  eq,
  exists,
  gt,
  gte,
  isNull,
  lt,
  lte,
  or,
  type SQL,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  atribuicoesSupervisor,
  cancelamentosSessao,
  reclassificacoesFalta,
  sessoesAtendimento,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import type {
  ConsultaFaltasEstagiario,
  EstagiarioComFaltas,
  FaltasDoEstagiario,
} from '@clinica/shared';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { DB } from '../../database/database.module';
import { inicioDoDia, MINUTO } from '../agendamento/horario';

export const SEM_ACESSO =
  'Você não tem acesso à relação de faltas deste estagiário. Esta consulta é do supervisor responsável pelo estagiário e da coordenação.';

// Relação de faltas do estagiário (RF39), para o supervisor e a coordenação
// (RNF35). Só lê: a contagem do semestre é do RF40, e a reprovação, do RF63.
@Injectable()
export class FaltasEstagiarioService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly auditoria: AuditoriaService,
  ) {}

  // As sessões canceladas por ausência real do estagiário (RF16) no período, pelo
  // início da sessão, em dias inteiros de Brasília. O cancelamento para remarcar
  // (administrativo) não é falta. A consulta não passa pela inscrição, e o motivo
  // da ausência não sai do banco: nem o paciente nem o motivo chegam à resposta. A
  // ausência reclassificada pela coordenação (RF40) continua na lista, marcada, e
  // sai da contagem; o motivo da reclassificação fica na consulta do semestre.
  async consultar(
    { estagiarioId, inicio, fim }: ConsultaFaltasEstagiario,
    usuario: UsuarioAutenticado,
  ): Promise<FaltasDoEstagiario> {
    const supervisor = usuario.perfil === 'supervisor';
    if (supervisor && estagiarioId) {
      const deles = await this.estagiarios(usuario);
      if (!deles.some((e) => e.id === estagiarioId)) {
        // A tentativa fica registrada, como na agenda do estagiário (RF11).
        await this.auditoria.registrar({
          usuarioId: usuario.id,
          operacao: 'consultar_faltas_estagiario_negada',
          entidade: 'usuarios',
          entidadeId: estagiarioId,
        });
        throw new ForbiddenException(SEM_ACESSO);
      }
    }
    const reclassificador = alias(usuarios, 'reclassificador');
    const linhas = await this.db
      .select({
        id: cancelamentosSessao.id,
        estagiarioId: usuarios.id,
        estagiario: usuarios.nome,
        inicio: sessoesAtendimento.inicio,
        registradaEm: cancelamentosSessao.registradoEm,
        reclassificadaEm: reclassificacoesFalta.reclassificadaEm,
        reclassificadaPor: reclassificador.nome,
      })
      .from(cancelamentosSessao)
      .innerJoin(
        sessoesAtendimento,
        eq(sessoesAtendimento.id, cancelamentosSessao.sessaoId),
      )
      .innerJoin(usuarios, eq(usuarios.id, sessoesAtendimento.estagiarioId))
      .leftJoin(
        reclassificacoesFalta,
        eq(reclassificacoesFalta.cancelamentoId, cancelamentosSessao.id),
      )
      .leftJoin(
        reclassificador,
        eq(reclassificador.id, reclassificacoesFalta.reclassificadaPor),
      )
      .where(
        and(
          eq(cancelamentosSessao.classificacao, 'ausencia_estagiario'),
          gte(sessoesAtendimento.inicio, inicioDoDia(inicio)),
          lt(
            sessoesAtendimento.inicio,
            new Date(inicioDoDia(fim).getTime() + 24 * 60 * MINUTO),
          ),
          estagiarioId
            ? eq(sessoesAtendimento.estagiarioId, estagiarioId)
            : undefined,
          supervisor ? faltaDoSupervisor(this.db, usuario.id) : undefined,
        ),
      )
      .orderBy(desc(sessoesAtendimento.inicio), asc(usuarios.nome));
    return {
      inicio,
      fim,
      faltas: linhas.map((l) => ({
        id: l.id,
        estagiario: { id: l.estagiarioId, nome: l.estagiario },
        inicio: l.inicio.toISOString(),
        registradaEm: l.registradaEm.toISOString(),
        reclassificada: l.reclassificadaEm
          ? {
              por: l.reclassificadaPor ?? '',
              em: l.reclassificadaEm.toISOString(),
              motivo: null,
            }
          : null,
      })),
    };
  }

  // O campo "Estagiário" e a autorização da consulta usam a mesma lista. Para o
  // supervisor: os estagiários dele hoje (definição única da CP4: vínculo vigente
  // num caso com a atribuição vigente dele) e os que têm falta registrada enquanto
  // o caso era dele, para a consulta continuar depois de uma transferência (RF25).
  // Para a coordenação, todos (RNF35).
  async estagiarios(
    usuario: UsuarioAutenticado,
  ): Promise<EstagiarioComFaltas[]> {
    if (usuario.perfil !== 'supervisor') {
      return this.db
        .select({ id: usuarios.id, nome: usuarios.nome })
        .from(usuarios)
        .where(eq(usuarios.perfil, 'estagiario'))
        .orderBy(asc(usuarios.nome));
    }
    const [hoje, comFaltas] = await Promise.all([
      this.db
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
            eq(atribuicoesSupervisor.supervisorId, usuario.id),
            eq(atribuicoesSupervisor.vigente, true),
          ),
        ),
      this.db
        .selectDistinct({ id: usuarios.id, nome: usuarios.nome })
        .from(cancelamentosSessao)
        .innerJoin(
          sessoesAtendimento,
          eq(sessoesAtendimento.id, cancelamentosSessao.sessaoId),
        )
        .innerJoin(usuarios, eq(usuarios.id, sessoesAtendimento.estagiarioId))
        .where(
          and(
            eq(cancelamentosSessao.classificacao, 'ausencia_estagiario'),
            faltaDoSupervisor(this.db, usuario.id),
          ),
        ),
    ]);
    const porId = new Map(
      [...hoje, ...comFaltas].map((e) => [e.id, e] as const),
    );
    return [...porId.values()].sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR'),
    );
  }
}

// A falta é do supervisor que tinha o caso no momento do registro da ausência:
// nesse momento o estagiário da sessão tinha o vínculo com o caso e era
// supervisionado por ele. Pela data da sessão, uma ausência registrada antes de
// uma transferência iria para o novo supervisor, que nunca supervisionou aquele
// estagiário (RNF35). A atribuição encerrada continua valendo para o passado,
// pela `encerradaEm` (RF48).
export function faltaDoSupervisor(db: Db, supervisorId: string): SQL {
  return exists(
    db
      .select({ id: atribuicoesSupervisor.id })
      .from(atribuicoesSupervisor)
      .where(
        and(
          eq(atribuicoesSupervisor.casoId, sessoesAtendimento.casoId),
          eq(atribuicoesSupervisor.supervisorId, supervisorId),
          lte(
            atribuicoesSupervisor.atribuidoEm,
            cancelamentosSessao.registradoEm,
          ),
          or(
            isNull(atribuicoesSupervisor.encerradaEm),
            gt(
              atribuicoesSupervisor.encerradaEm,
              cancelamentosSessao.registradoEm,
            ),
          ),
        ),
      ),
  );
}
