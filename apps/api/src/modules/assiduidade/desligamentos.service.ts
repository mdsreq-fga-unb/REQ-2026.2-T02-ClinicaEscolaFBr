import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  aliasedTable,
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  sql,
} from 'drizzle-orm';
import {
  atribuicoesSupervisor,
  cancelamentosSessao,
  casos,
  desligamentoFaltas,
  desligamentosPorFaltas,
  faltasPaciente,
  inscricoes,
  sessoesAtendimento,
  usuarios,
  vagasLiberadas,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import {
  LIMITE_FALTAS_CICLO,
  STATUS_SESSAO_EM_ABERTO,
  type DesligamentoDoCaso,
  type ResultadoDesligamento,
  type ResultadoReversao,
  type ReversaoDesligamento,
  type SessaoAReagendar,
  type VagaLiberada,
} from '@clinica/shared';
import {
  AuditoriaService,
  type Transacao,
} from '../../auditoria/auditoria.service';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { cifrar, decifrar } from '../../common/criptografia';
import { FilaService } from '../fila/fila.service';
import { DB } from '../../database/database.module';

const SEM_ALERTA =
  'Este paciente não tem alerta de limite de faltas pendente: o desligamento por faltas só é possível com o limite atingido.';

const estagiario = aliasedTable(usuarios, 'estagiario');
const supervisor = aliasedTable(usuarios, 'supervisor');
const decisor = aliasedTable(usuarios, 'decisor');
const revisor = aliasedTable(usuarios, 'revisor');

// Data de hoje em Brasília (AAAA-MM-DD): a data da decisão é o dia do registro.
const hojeEmBrasilia = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
    new Date(),
  );

// Desligamento do paciente por faltas (RF37), vaga liberada aguardando realocação e
// reversão pela coordenação (RF38). Cada operação é uma transação só, com o caso
// travado, para que dois pedidos simultâneos não gerem dois desligamentos, duas
// vagas ou duas reversões.
@Injectable()
export class DesligamentosService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly config: ConfigService,
    private readonly auditoria: AuditoriaService,
    private readonly fila: FilaService,
  ) {}

  // RF37: a secretaria ou a coordenação desliga o paciente com o alerta do RF36
  // pendente. Encerra o vínculo, cancela as sessões futuras e libera a vaga.
  async desligar(
    casoId: string,
    usuario: UsuarioAutenticado,
  ): Promise<ResultadoDesligamento> {
    return this.db.transaction(async (tx) => {
      const [caso] = await tx
        .select({
          id: casos.id,
          situacao: casos.situacao,
          ciclo: casos.cicloAtendimento,
        })
        .from(casos)
        .where(eq(casos.id, casoId))
        .for('update');
      if (!caso) throw new NotFoundException('Paciente não encontrado.');
      if (caso.situacao !== 'em_atendimento') {
        throw new UnprocessableEntityException(SEM_ALERTA);
      }
      const faltas = await tx
        .select({ id: faltasPaciente.id })
        .from(faltasPaciente)
        .where(
          and(
            eq(faltasPaciente.casoId, casoId),
            eq(faltasPaciente.cicloAtendimento, caso.ciclo),
            isNull(faltasPaciente.retiradaEm),
          ),
        );
      if (faltas.length < LIMITE_FALTAS_CICLO) {
        throw new UnprocessableEntityException(SEM_ALERTA);
      }
      const [vinculo] = await tx
        .select({
          id: vinculosEstagiario.id,
          estagiarioId: vinculosEstagiario.estagiarioId,
          estagiario: estagiario.nome,
        })
        .from(vinculosEstagiario)
        .innerJoin(
          estagiario,
          eq(estagiario.id, vinculosEstagiario.estagiarioId),
        )
        .where(
          and(
            eq(vinculosEstagiario.casoId, casoId),
            eq(vinculosEstagiario.vigente, true),
          ),
        );
      const [atribuicao] = await tx
        .select({ supervisorId: atribuicoesSupervisor.supervisorId })
        .from(atribuicoesSupervisor)
        .where(
          and(
            eq(atribuicoesSupervisor.casoId, casoId),
            eq(atribuicoesSupervisor.vigente, true),
          ),
        );
      if (!vinculo || !atribuicao) {
        throw new ConflictException(
          'O caso está sem estagiário ou supervisor responsável.',
        );
      }

      const [desligamento] = await tx
        .insert(desligamentosPorFaltas)
        .values({
          casoId,
          cicloAtendimento: caso.ciclo,
          dataDecisao: hojeEmBrasilia(),
          decididoPor: usuario.id,
        })
        .returning({ id: desligamentosPorFaltas.id });
      await tx.insert(desligamentoFaltas).values(
        faltas.map((f) => ({
          desligamentoId: desligamento.id,
          faltaId: f.id,
        })),
      );
      await tx
        .update(vinculosEstagiario)
        // now() é o mesmo instante da transação e do decidido_em (RF48).
        .set({ vigente: false, encerradoEm: sql`now()` })
        .where(eq(vinculosEstagiario.id, vinculo.id));

      // Sessões futuras canceladas pelo desligamento: não geram falta nem contam
      // como ausência do estagiário, e ficam ligadas a ele para o RF38. A trava
      // espera um cancelamento em andamento por outro caminho (RF15, RF16); a
      // sessão que ele cancelou sai da lista, e o conflito no sessao_id é ignorado.
      const agora = new Date();
      const futuras = await tx
        .select({
          id: sessoesAtendimento.id,
          inicio: sessoesAtendimento.inicio,
        })
        .from(sessoesAtendimento)
        .where(
          and(
            eq(sessoesAtendimento.casoId, casoId),
            inArray(sessoesAtendimento.status, STATUS_SESSAO_EM_ABERTO),
            gt(sessoesAtendimento.inicio, agora),
          ),
        )
        .for('update');
      let canceladas: string[] = [];
      if (futuras.length) {
        const inseridos = await tx
          .insert(cancelamentosSessao)
          .values(
            futuras.map((s) => ({
              sessaoId: s.id,
              origem: usuario.perfil as 'secretaria' | 'coordenacao',
              classificacao: 'desligamento' as const,
              registradoPor: usuario.id,
              antecedenciaMinutos: Math.floor(
                (s.inicio.getTime() - agora.getTime()) / 60_000,
              ),
              desligamentoId: desligamento.id,
            })),
          )
          .onConflictDoNothing({ target: cancelamentosSessao.sessaoId })
          .returning({ sessaoId: cancelamentosSessao.sessaoId });
        canceladas = inseridos.map((c) => c.sessaoId);
      }
      if (canceladas.length) {
        await tx
          .update(sessoesAtendimento)
          .set({ status: 'cancelada' })
          .where(inArray(sessoesAtendimento.id, canceladas));
      }

      const [vaga] = await tx
        .insert(vagasLiberadas)
        .values({
          desligamentoId: desligamento.id,
          estagiarioId: vinculo.estagiarioId,
          supervisorId: atribuicao.supervisorId,
        })
        .returning({ id: vagasLiberadas.id });
      await tx
        .update(casos)
        .set({ situacao: 'desligado_por_faltas' })
        .where(eq(casos.id, casoId));
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          operacao: 'desligar_por_faltas',
          entidade: 'desligamentos_por_faltas',
          entidadeId: desligamento.id,
          dadosAnteriores: {
            situacao: caso.situacao,
            estagiarioId: vinculo.estagiarioId,
          },
          dadosNovos: {
            casoId,
            situacao: 'desligado_por_faltas',
            faltas: faltas.map((f) => f.id),
            sessoesCanceladas: canceladas,
            vagaId: vaga.id,
          },
        },
        tx,
      );
      return {
        desligamentoId: desligamento.id,
        estagiario: vinculo.estagiario,
        sessoesCanceladas: canceladas.length,
      };
    });
  }

  // RF37: vagas liberadas que ainda aguardam um paciente novo. A coordenação vê
  // todas; o supervisor, as dos casos que supervisionava. O próximo inscrito
  // elegível vem da ordenação central do RF7.
  async vagasAbertas(usuario: UsuarioAutenticado): Promise<VagaLiberada[]> {
    const linhas = await this.db
      .select({
        id: vagasLiberadas.id,
        supervisorId: vagasLiberadas.supervisorId,
        estagiario: estagiario.nome,
        supervisor: supervisor.nome,
        liberadaEm: vagasLiberadas.liberadaEm,
      })
      .from(vagasLiberadas)
      .innerJoin(estagiario, eq(estagiario.id, vagasLiberadas.estagiarioId))
      .innerJoin(supervisor, eq(supervisor.id, vagasLiberadas.supervisorId))
      .where(
        and(
          isNull(vagasLiberadas.ocupadaEm),
          isNull(vagasLiberadas.encerradaEm),
          usuario.perfil === 'supervisor'
            ? eq(vagasLiberadas.supervisorId, usuario.id)
            : undefined,
        ),
      )
      .orderBy(asc(vagasLiberadas.liberadaEm));
    const proximos = new Map(
      await Promise.all(
        [...new Set(linhas.map((v) => v.supervisorId))].map(
          async (id) => [id, await this.fila.proximoElegivel(id)] as const,
        ),
      ),
    );
    return linhas.map((v) => ({
      id: v.id,
      estagiario: v.estagiario,
      supervisor: v.supervisor,
      liberadaEm: v.liberadaEm.toISOString(),
      proximoInscrito: proximos.get(v.supervisorId) ?? null,
    }));
  }

  // RF37 e RF21: o vínculo de um paciente novo ocupa a vaga aberta mais antiga do
  // mesmo estagiário. Só o vínculo do RF21 chama este método; a transferência (RF25)
  // e a reversão (RF38) não ocupam vaga.
  async ocuparVaga(tx: Transacao, estagiarioId: string, vinculoId: string) {
    const [vaga] = await tx
      .select({ id: vagasLiberadas.id })
      .from(vagasLiberadas)
      .where(
        and(
          eq(vagasLiberadas.estagiarioId, estagiarioId),
          isNull(vagasLiberadas.ocupadaEm),
          isNull(vagasLiberadas.encerradaEm),
        ),
      )
      .orderBy(asc(vagasLiberadas.liberadaEm))
      .limit(1)
      .for('update');
    if (!vaga) return null;
    await tx
      .update(vagasLiberadas)
      .set({ ocupadaEm: new Date(), ocupadaPorVinculoId: vinculoId })
      .where(eq(vagasLiberadas.id, vaga.id));
    return vaga.id;
  }

  // RF38: só a coordenação reverte, com o motivo e as faltas que deixam de contar.
  // Com a vaga livre e o estagiário ativo, o caso volta ao atendimento com o mesmo
  // estagiário; senão, fica aguardando vaga, sem tocar no vínculo do paciente novo.
  async reverter(
    desligamentoId: string,
    dados: ReversaoDesligamento,
    usuario: UsuarioAutenticado,
  ): Promise<ResultadoReversao> {
    const [alvo] = await this.db
      .select({ casoId: desligamentosPorFaltas.casoId })
      .from(desligamentosPorFaltas)
      .where(eq(desligamentosPorFaltas.id, desligamentoId));
    if (!alvo) throw new NotFoundException('Desligamento não encontrado.');

    const resultado = await this.db.transaction(async (tx) => {
      const [caso] = await tx
        .select({ id: casos.id, situacao: casos.situacao })
        .from(casos)
        .where(eq(casos.id, alvo.casoId))
        .for('update');
      const [desligamento] = await tx
        .select({
          id: desligamentosPorFaltas.id,
          ciclo: desligamentosPorFaltas.cicloAtendimento,
          revertidoEm: desligamentosPorFaltas.revertidoEm,
        })
        .from(desligamentosPorFaltas)
        .where(eq(desligamentosPorFaltas.id, desligamentoId))
        .for('update');
      if (desligamento.revertidoEm) {
        throw new ConflictException('Este desligamento já foi revertido.');
      }

      const contando = await tx
        .select({ id: faltasPaciente.id })
        .from(faltasPaciente)
        .where(
          and(
            eq(faltasPaciente.casoId, caso.id),
            eq(faltasPaciente.cicloAtendimento, desligamento.ciclo),
            isNull(faltasPaciente.retiradaEm),
          ),
        );
      const retiradas = [...new Set(dados.faltasRetiradas)];
      if (retiradas.some((id) => !contando.some((f) => f.id === id))) {
        // Mesmo formato dos erros de validação (ZodValidationPipe), com o campo.
        throw new BadRequestException([
          {
            path: ['faltasRetiradas'],
            message: 'Escolha só faltas deste paciente que contam no ciclo.',
          },
        ]);
      }
      const contagemResultante = contando.length - retiradas.length;
      if (contagemResultante >= LIMITE_FALTAS_CICLO && !dados.manterContagem) {
        throw new UnprocessableEntityException({
          message: `O paciente volta com ${contagemResultante} faltas no ciclo, com o limite atingido. Confirme para reverter assim.`,
          contagemResultante,
        });
      }

      const agora = new Date();
      await tx
        .update(desligamentosPorFaltas)
        .set({
          revertidoPor: usuario.id,
          revertidoEm: agora,
          motivoReversaoCifrado: cifrar(
            dados.motivo,
            this.config.getOrThrow<string>('CHAVE_DADOS'),
          ),
        })
        .where(eq(desligamentosPorFaltas.id, desligamentoId));
      if (retiradas.length) {
        await tx
          .update(faltasPaciente)
          .set({ retiradaPor: usuario.id, retiradaEm: agora })
          .where(
            and(
              inArray(faltasPaciente.id, retiradas),
              isNull(faltasPaciente.retiradaEm),
            ),
          );
      }

      const [vaga] = await tx
        .select({
          id: vagasLiberadas.id,
          estagiarioId: vagasLiberadas.estagiarioId,
          estagiario: estagiario.nome,
          estagiarioAtivo: estagiario.situacao,
          ocupadaEm: vagasLiberadas.ocupadaEm,
          encerradaEm: vagasLiberadas.encerradaEm,
        })
        .from(vagasLiberadas)
        .innerJoin(estagiario, eq(estagiario.id, vagasLiberadas.estagiarioId))
        .where(eq(vagasLiberadas.desligamentoId, desligamentoId))
        .for('update', { of: vagasLiberadas });
      const volta =
        vaga &&
        !vaga.ocupadaEm &&
        !vaga.encerradaEm &&
        vaga.estagiarioAtivo === 'ativo';
      let vinculoId: string | null = null;
      if (volta) {
        // Vínculo novo, e não o antigo reativado: o histórico de responsáveis
        // continua com o vínculo encerrado pelo desligamento (RF27).
        const [vinculo] = await tx
          .insert(vinculosEstagiario)
          .values({
            casoId: caso.id,
            estagiarioId: vaga.estagiarioId,
            vinculadoPor: usuario.id,
          })
          .returning({ id: vinculosEstagiario.id });
        vinculoId = vinculo.id;
      }
      if (vaga && !vaga.ocupadaEm && !vaga.encerradaEm) {
        await tx
          .update(vagasLiberadas)
          .set({ encerradaEm: agora })
          .where(eq(vagasLiberadas.id, vaga.id));
      }
      const situacao = volta ? 'em_atendimento' : 'aguardando_vaga';
      await tx.update(casos).set({ situacao }).where(eq(casos.id, caso.id));
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          operacao: 'reverter_desligamento',
          entidade: 'desligamentos_por_faltas',
          entidadeId: desligamentoId,
          dadosAnteriores: { situacao: caso.situacao },
          // O texto do motivo fica só cifrado no desligamento, nunca na auditoria.
          dadosNovos: {
            situacao,
            motivoInformado: true,
            faltasRetiradas: retiradas,
            vinculoId,
            contagemResultante,
          },
        },
        tx,
      );
      return {
        situacao,
        estagiario: volta ? vaga.estagiario : null,
      } as const;
    });
    return {
      ...resultado,
      sessoesAReagendar: (await this.sessoesAReagendar(alvo.casoId)).length,
    };
  }

  // RF38: sessões futuras canceladas por um desligamento já revertido, até o caso
  // ter uma sessão nova agendada depois da reversão (RF10).
  async sessoesAReagendar(casoId: string): Promise<SessaoAReagendar[]> {
    const revertidos = await this.db
      .select({
        id: desligamentosPorFaltas.id,
        revertidoEm: desligamentosPorFaltas.revertidoEm,
      })
      .from(desligamentosPorFaltas)
      .where(
        and(
          eq(desligamentosPorFaltas.casoId, casoId),
          isNotNull(desligamentosPorFaltas.revertidoEm),
        ),
      )
      .orderBy(desc(desligamentosPorFaltas.revertidoEm))
      .limit(1);
    const ultimo = revertidos[0];
    if (!ultimo) return [];
    const [nova] = await this.db
      .select({ id: sessoesAtendimento.id })
      .from(sessoesAtendimento)
      .where(
        and(
          eq(sessoesAtendimento.casoId, casoId),
          gt(sessoesAtendimento.agendadaEm, ultimo.revertidoEm!),
        ),
      )
      .limit(1);
    if (nova) return [];
    const linhas = await this.db
      .select({
        id: sessoesAtendimento.id,
        inicio: sessoesAtendimento.inicio,
        termino: sessoesAtendimento.termino,
        estagiario: estagiario.nome,
      })
      .from(cancelamentosSessao)
      .innerJoin(
        sessoesAtendimento,
        eq(sessoesAtendimento.id, cancelamentosSessao.sessaoId),
      )
      .innerJoin(estagiario, eq(estagiario.id, sessoesAtendimento.estagiarioId))
      .where(
        and(
          eq(cancelamentosSessao.desligamentoId, ultimo.id),
          gt(sessoesAtendimento.inicio, new Date()),
        ),
      )
      .orderBy(asc(sessoesAtendimento.inicio));
    return linhas.map((s) => ({
      id: s.id,
      inicio: s.inicio.toISOString(),
      termino: s.termino.toISOString(),
      estagiario: s.estagiario,
    }));
  }

  // Desligamentos do ciclo, com a reversão, para o histórico do caso. O motivo da
  // reversão só vai para a coordenação, que reverte.
  async doCiclo(
    casoId: string,
    ciclo: number,
    comMotivo: boolean,
  ): Promise<DesligamentoDoCaso[]> {
    const linhas = await this.db
      .select({
        id: desligamentosPorFaltas.id,
        decididoPor: decisor.nome,
        decididoEm: desligamentosPorFaltas.decididoEm,
        dataDecisao: desligamentosPorFaltas.dataDecisao,
        revertidoPor: revisor.nome,
        revertidoEm: desligamentosPorFaltas.revertidoEm,
        motivo: desligamentosPorFaltas.motivoReversaoCifrado,
      })
      .from(desligamentosPorFaltas)
      .leftJoin(decisor, eq(decisor.id, desligamentosPorFaltas.decididoPor))
      .leftJoin(revisor, eq(revisor.id, desligamentosPorFaltas.revertidoPor))
      .where(
        and(
          eq(desligamentosPorFaltas.casoId, casoId),
          eq(desligamentosPorFaltas.cicloAtendimento, ciclo),
        ),
      )
      .orderBy(desc(desligamentosPorFaltas.decididoEm));
    if (linhas.length === 0) return [];
    const ids = linhas.map((l) => l.id);
    const [fundamentos, situacao] = await Promise.all([
      this.db
        .select({
          desligamentoId: desligamentoFaltas.desligamentoId,
          inicio: sessoesAtendimento.inicio,
        })
        .from(desligamentoFaltas)
        .innerJoin(
          faltasPaciente,
          eq(faltasPaciente.id, desligamentoFaltas.faltaId),
        )
        .innerJoin(
          sessoesAtendimento,
          eq(sessoesAtendimento.id, faltasPaciente.sessaoId),
        )
        .where(inArray(desligamentoFaltas.desligamentoId, ids))
        .orderBy(asc(sessoesAtendimento.inicio)),
      this.db
        .select({ situacao: casos.situacao })
        .from(casos)
        .where(eq(casos.id, casoId)),
    ]);
    const chave = this.config.getOrThrow<string>('CHAVE_DADOS');
    return linhas.map((l, indice) => ({
      id: l.id,
      decididoPor: l.decididoPor ?? 'responsável não identificado',
      decididoEm: l.decididoEm.toISOString(),
      dataDecisao: l.dataDecisao,
      faltas: fundamentos
        .filter((f) => f.desligamentoId === l.id)
        .map((f) => f.inicio.toISOString()),
      revertidoPor: l.revertidoPor,
      revertidoEm: l.revertidoEm?.toISOString() ?? null,
      motivoReversao: comMotivo && l.motivo ? decifrar(l.motivo, chave) : null,
      // Só o mais recente pode estar pendente: o caso aguarda vaga desde ele.
      pendenteDeVaga:
        indice === 0 &&
        l.revertidoEm !== null &&
        situacao[0]?.situacao === 'aguardando_vaga',
    }));
  }

  // Vaga do desligamento vigente ainda livre, com o estagiário ativo: a reversão
  // devolve o paciente a ele. Mostrado no diálogo da reversão (RF38).
  async vagaDoDesligamento(desligamentoId: string) {
    const [vaga] = await this.db
      .select({
        estagiario: estagiario.nome,
        situacaoEstagiario: estagiario.situacao,
        ocupadaEm: vagasLiberadas.ocupadaEm,
        encerradaEm: vagasLiberadas.encerradaEm,
      })
      .from(vagasLiberadas)
      .innerJoin(estagiario, eq(estagiario.id, vagasLiberadas.estagiarioId))
      .where(eq(vagasLiberadas.desligamentoId, desligamentoId));
    if (!vaga) return null;
    return {
      estagiario: vaga.estagiario,
      livre:
        !vaga.ocupadaEm &&
        !vaga.encerradaEm &&
        vaga.situacaoEstagiario === 'ativo',
    };
  }

  // Sessões do ciclo canceladas pelo desligamento, para o selo "Cancelada ·
  // desligamento por faltas" na lista de sessões.
  async canceladasPorDesligamento(casoId: string) {
    const linhas = await this.db
      .select({ sessaoId: cancelamentosSessao.sessaoId })
      .from(cancelamentosSessao)
      .innerJoin(
        sessoesAtendimento,
        eq(sessoesAtendimento.id, cancelamentosSessao.sessaoId),
      )
      .where(
        and(
          eq(sessoesAtendimento.casoId, casoId),
          eq(cancelamentosSessao.classificacao, 'desligamento'),
        ),
      );
    return new Set(linhas.map((l) => l.sessaoId));
  }

  // Reversões que encontraram a vaga ocupada ou o estagiário desativado: o caso
  // aguarda um estagiário, vinculado pelo supervisor (RF21). A coordenação
  // acompanha na Distribuição.
  async aguardandoVaga() {
    const linhas = await this.db
      .select({
        casoId: casos.id,
        numero: inscricoes.numero,
        nome: inscricoes.nomeCompleto,
        supervisor: supervisor.nome,
      })
      .from(casos)
      .innerJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
      .leftJoin(
        atribuicoesSupervisor,
        and(
          eq(atribuicoesSupervisor.casoId, casos.id),
          eq(atribuicoesSupervisor.vigente, true),
        ),
      )
      .leftJoin(
        supervisor,
        eq(supervisor.id, atribuicoesSupervisor.supervisorId),
      )
      .where(eq(casos.situacao, 'aguardando_vaga'))
      .orderBy(asc(inscricoes.criadaEm));
    return linhas;
  }
}
