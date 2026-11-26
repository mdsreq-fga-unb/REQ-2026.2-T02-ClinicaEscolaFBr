import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, asc, eq, gte, inArray, isNull, lt, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  cancelamentosSessao,
  reclassificacoesFalta,
  sessoesAtendimento,
  usuarios,
  type Db,
} from '@clinica/database';
import {
  hojeEmBrasilia,
  limitesDoSemestre,
  semestreDaData,
  semestreDaSessao,
  type ConsultaFaltasSemestre,
  type EstagiarioNoSemestre,
  type FaltasNoSemestre,
  type ReclassificacaoFalta,
  type ResultadoReclassificacao,
} from '@clinica/shared';
import {
  AuditoriaService,
  type Transacao,
} from '../../auditoria/auditoria.service';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { cifrar, decifrar } from '../../common/criptografia';
import { DB } from '../../database/database.module';
import { inicioDoDia } from '../agendamento/horario';
import {
  FaltasEstagiarioService,
  faltaDoSupervisor,
  SEM_ACESSO,
} from './faltas-estagiario.service';

const NAO_RECLASSIFICAVEL =
  'Só uma ausência do estagiário ainda não reclassificada pode ser reclassificada.';

// Trava a contagem de faltas do estagiário até o fim da transação (apontamento 3
// da inspeção do RF40). Duas ausências do mesmo estagiário registradas ao mesmo
// tempo, em sessões diferentes, travam sessões diferentes; sem esta trava, cada
// transação contaria sem ver a outra, e a 3ª falta passaria sem a sinalização de
// reprovação (RF63). O `no key update` não segura as inserções que só apontam
// para o usuário, como a auditoria.
export async function travarFaltasDoEstagiario(
  tx: Transacao,
  estagiarioId: string,
) {
  await tx
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.id, estagiarioId))
    .for('no key update');
}

// Faltas do estagiário que contam: ausências reais (RF16) sem reclassificação,
// numa sessão do semestre, pela data da sessão em Brasília.
export async function contarFaltasNoSemestre(
  banco: Db | Transacao,
  estagiarioId: string,
  semestre: string,
) {
  const { inicio, fimExclusivo } = limitesDoSemestre(semestre);
  const [{ total }] = await banco
    .select({ total: sql<number>`count(*)::int` })
    .from(cancelamentosSessao)
    .innerJoin(
      sessoesAtendimento,
      eq(sessoesAtendimento.id, cancelamentosSessao.sessaoId),
    )
    .leftJoin(
      reclassificacoesFalta,
      eq(reclassificacoesFalta.cancelamentoId, cancelamentosSessao.id),
    )
    .where(
      and(
        eq(cancelamentosSessao.classificacao, 'ausencia_estagiario'),
        isNull(reclassificacoesFalta.id),
        eq(sessoesAtendimento.estagiarioId, estagiarioId),
        gte(sessoesAtendimento.inicio, inicioDoDia(inicio)),
        lt(sessoesAtendimento.inicio, inicioDoDia(fimExclusivo)),
      ),
    );
  return total;
}

// Contagem das faltas do estagiário no semestre (RF40), para o supervisor e a
// coordenação, pela mesma autorização do RF39 (RNF35). A contagem é calculada na
// consulta, e não guardada: é a soma de registros que não mudam, o cancelamento e
// a reclassificação.
@Injectable()
export class FaltasSemestreService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly auditoria: AuditoriaService,
    private readonly config: ConfigService,
    private readonly faltas: FaltasEstagiarioService,
  ) {}

  // Para o supervisor, a contagem de cada estagiário é a do semestre inteiro, em
  // todos os casos, porque o limite do RF63 vale para todas as faltas dele. As
  // linhas com a data e o horário são só as dos casos dele, e as outras aparecem
  // apenas como um número (apontamento 1 da inspeção). A coordenação vê tudo,
  // inclusive o motivo da reclassificação.
  async consultar(
    { semestre, estagiarioId }: ConsultaFaltasSemestre,
    usuario: UsuarioAutenticado,
  ): Promise<FaltasNoSemestre> {
    const supervisor = usuario.perfil === 'supervisor';
    const visiveis = await this.faltas.estagiarios(usuario);
    if (estagiarioId && !visiveis.some((e) => e.id === estagiarioId)) {
      if (supervisor) {
        await this.auditoria.registrar({
          usuarioId: usuario.id,
          operacao: 'consultar_faltas_estagiario_negada',
          entidade: 'usuarios',
          entidadeId: estagiarioId,
        });
        throw new ForbiddenException(SEM_ACESSO);
      }
      throw new NotFoundException('Estagiário não encontrado.');
    }
    const escolhidos = estagiarioId
      ? visiveis.filter((e) => e.id === estagiarioId)
      : visiveis;
    const ausencias = escolhidos.length
      ? await this.ausencias(
          escolhidos.map((e) => e.id),
          supervisor ? usuario.id : null,
        )
      : [];

    const vigente = semestreDaData(hojeEmBrasilia());
    const semestres = [
      ...new Set([vigente, semestre, ...ausencias.map((a) => a.semestre)]),
    ].sort((a, b) => b.localeCompare(a));

    const coordenacao = !supervisor;
    const estagiarios: EstagiarioNoSemestre[] = escolhidos.map((e) => {
      const doSemestre = ausencias.filter(
        (a) => a.estagiarioId === e.id && a.semestre === semestre,
      );
      const contam = doSemestre.filter((a) => !a.reclassificadaEm);
      return {
        estagiario: e,
        faltas: contam.length,
        faltasDeOutrosSupervisores: contam.filter((a) => !a.visivel).length,
        linhas: doSemestre
          .filter((a) => a.visivel)
          .map((a) => ({
            id: a.id,
            inicio: a.inicio.toISOString(),
            registradaEm: a.registradaEm.toISOString(),
            reclassificada: a.reclassificadaEm
              ? {
                  por: a.reclassificadaPor ?? '',
                  em: a.reclassificadaEm.toISOString(),
                  motivo:
                    coordenacao && a.motivoCifrado
                      ? decifrar(a.motivoCifrado, this.chave())
                      : null,
                }
              : null,
          })),
      };
    });
    // Quem tem mais faltas aparece primeiro, como na prancha 7-1.
    estagiarios.sort(
      (a, b) =>
        b.faltas - a.faltas ||
        a.estagiario.nome.localeCompare(b.estagiario.nome, 'pt-BR'),
    );
    return { semestre, semestres, estagiarios };
  }

  // A coordenação reclassifica uma ausência do estagiário registrada por engano
  // como cancelamento administrativo para remarcação, com motivo. A ausência sai da
  // contagem, e a nova contagem do semestre da sessão é devolvida.
  async reclassificar(
    cancelamentoId: string,
    { motivo }: ReclassificacaoFalta,
    usuario: UsuarioAutenticado,
  ): Promise<ResultadoReclassificacao> {
    return this.db.transaction(async (tx) => {
      const [falta] = await tx
        .select({
          classificacao: cancelamentosSessao.classificacao,
          estagiarioId: sessoesAtendimento.estagiarioId,
          inicio: sessoesAtendimento.inicio,
        })
        .from(cancelamentosSessao)
        .innerJoin(
          sessoesAtendimento,
          eq(sessoesAtendimento.id, cancelamentosSessao.sessaoId),
        )
        .where(eq(cancelamentosSessao.id, cancelamentoId));
      if (!falta) throw new NotFoundException('Falta não encontrada.');
      if (falta.classificacao !== 'ausencia_estagiario') {
        throw new ConflictException(NAO_RECLASSIFICAVEL);
      }
      await travarFaltasDoEstagiario(tx, falta.estagiarioId);
      // Com a trava, uma segunda reclassificação da mesma falta espera a primeira
      // terminar e cai aqui; o `unique` do banco continua como garantia.
      const [anterior] = await tx
        .select({ id: reclassificacoesFalta.id })
        .from(reclassificacoesFalta)
        .where(eq(reclassificacoesFalta.cancelamentoId, cancelamentoId));
      if (anterior) throw new ConflictException(NAO_RECLASSIFICAVEL);

      const [reclassificacao] = await tx
        .insert(reclassificacoesFalta)
        .values({
          cancelamentoId,
          motivoCifrado: cifrar(motivo, this.chave()),
          reclassificadaPor: usuario.id,
        })
        .returning({ id: reclassificacoesFalta.id });
      // Como a justificativa e a reversão da CP9, a auditoria guarda só que o
      // motivo foi informado, e não o texto.
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          operacao: 'reclassificar_falta_estagiario',
          entidade: 'cancelamentos_sessao',
          entidadeId: cancelamentoId,
          dadosAnteriores: { classificacao: 'ausencia_estagiario' },
          dadosNovos: {
            classificacao: 'administrativo',
            reclassificacaoId: reclassificacao.id,
            motivoInformado: true,
          },
        },
        tx,
      );
      const semestre = semestreDaSessao(falta.inicio);
      return {
        estagiarioId: falta.estagiarioId,
        semestre,
        faltas: await contarFaltasNoSemestre(tx, falta.estagiarioId, semestre),
      };
    });
  }

  // Todas as ausências dos estagiários, em todos os semestres: a lista dos
  // semestres sai delas. `visivel` diz se a linha é de um caso do supervisor no
  // momento do registro, pela mesma regra do RF39.
  private async ausencias(
    estagiarioIds: string[],
    supervisorId: string | null,
  ) {
    const reclassificador = alias(usuarios, 'reclassificador');
    const linhas = await this.db
      .select({
        id: cancelamentosSessao.id,
        estagiarioId: sessoesAtendimento.estagiarioId,
        inicio: sessoesAtendimento.inicio,
        registradaEm: cancelamentosSessao.registradoEm,
        visivel: supervisorId
          ? sql<boolean>`${faltaDoSupervisor(this.db, supervisorId)}`
          : sql<boolean>`true`,
        reclassificadaEm: reclassificacoesFalta.reclassificadaEm,
        reclassificadaPor: reclassificador.nome,
        motivoCifrado: reclassificacoesFalta.motivoCifrado,
      })
      .from(cancelamentosSessao)
      .innerJoin(
        sessoesAtendimento,
        eq(sessoesAtendimento.id, cancelamentosSessao.sessaoId),
      )
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
          inArray(sessoesAtendimento.estagiarioId, estagiarioIds),
        ),
      )
      .orderBy(asc(sessoesAtendimento.inicio));
    return linhas
      .map((l) => ({ ...l, semestre: semestreDaSessao(l.inicio) }))
      .reverse();
  }

  private chave() {
    return this.config.getOrThrow<string>('CHAVE_DADOS');
  }
}
