import {
  ConflictException,
  ForbiddenException,
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
  count,
  eq,
  gt,
  inArray,
  notInArray,
  sql,
} from 'drizzle-orm';
import {
  atribuicoesSupervisor,
  cancelamentosSessao,
  casos,
  inscricoes,
  prontuarios,
  sessoesAtendimento,
  transferenciasCaso,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import {
  STATUS_SESSAO_EM_ABERTO,
  type EstagiarioDisponivel,
  type OpcoesTransferencia,
  type ResultadoTransferencia,
  type SituacaoCaso,
  type Transferencia,
} from '@clinica/shared';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { cifrar } from '../../common/criptografia';
import { DB } from '../../database/database.module';
import { ParametrosService } from '../../parametros/parametros.service';
import { CasosService } from './casos.service';

type Transacao = Parameters<Parameters<Db['transaction']>[0]>[0];
type Leitura = Pick<Db, 'select' | 'selectDistinct'>;

const estagiario = aliasedTable(usuarios, 'estagiario');
const supervisor = aliasedTable(usuarios, 'supervisor');
const outroCaso = aliasedTable(atribuicoesSupervisor, 'outro_caso');

// Casos ativos: em atendimento, aguardando o vínculo com o estagiário ou
// aguardando vaga depois de uma reversão (RF38). O caso ainda sem supervisor é
// distribuído (RF20), e o encerrado ou desligado não tem responsável a trocar.
const SITUACOES_TRANSFERIVEIS: SituacaoCaso[] = [
  'em_atendimento',
  'aguardando_vinculo',
  'aguardando_vaga',
];

const PECA_A_COORDENACAO =
  'Para passar o caso a outro supervisor, ou a um estagiário de outro supervisor, peça a transferência à coordenação.';

// Violação de índice único (23505), direto ou embrulhada pelo Drizzle.
const violaUnico = (erro: unknown) => {
  const e = erro as { code?: string; cause?: { code?: string } };
  return e?.code === '23505' || e?.cause?.code === '23505';
};

// Transferência de caso (RF25). O supervisor responsável troca o estagiário por
// outro estagiário dele; a coordenação troca o supervisor e, se indicar, o
// estagiário, ou só o estagiário. A troca encerra o vínculo e a atribuição
// vigentes e cria os novos, e assim o responsável anterior perde o acesso ao
// prontuário e o novo passa a ver todo o histórico (RF55, RF27).
@Injectable()
export class TransferenciaService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly auditoria: AuditoriaService,
    private readonly parametros: ParametrosService,
    private readonly config: ConfigService,
    private readonly casosService: CasosService,
  ) {}

  // Caso com o número, o paciente e os responsáveis vigentes.
  private async caso(tx: Leitura, casoId: string) {
    const [linha] = await tx
      .select({
        id: casos.id,
        situacao: casos.situacao,
        ciclo: casos.cicloAtendimento,
        numero: inscricoes.numero,
        paciente: inscricoes.nomeCompleto,
      })
      .from(casos)
      .innerJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
      .where(eq(casos.id, casoId));
    if (!linha) throw new NotFoundException('Caso não encontrado.');
    const [atribuicao] = await tx
      .select({
        id: atribuicoesSupervisor.id,
        supervisorId: atribuicoesSupervisor.supervisorId,
        nome: supervisor.nome,
      })
      .from(atribuicoesSupervisor)
      .innerJoin(
        supervisor,
        eq(supervisor.id, atribuicoesSupervisor.supervisorId),
      )
      .where(
        and(
          eq(atribuicoesSupervisor.casoId, casoId),
          eq(atribuicoesSupervisor.vigente, true),
        ),
      );
    const [vinculo] = await tx
      .select({
        id: vinculosEstagiario.id,
        estagiarioId: vinculosEstagiario.estagiarioId,
        nome: estagiario.nome,
      })
      .from(vinculosEstagiario)
      .innerJoin(estagiario, eq(estagiario.id, vinculosEstagiario.estagiarioId))
      .where(
        and(
          eq(vinculosEstagiario.casoId, casoId),
          eq(vinculosEstagiario.vigente, true),
        ),
      );
    return { ...linha, atribuicao, vinculo };
  }

  // Quem pode abrir a transferência deste caso: a coordenação, ou o supervisor
  // responsável, desde que o caso já tenha estagiário (sem ele, é o vínculo, RF21).
  private conferir(
    caso: Awaited<ReturnType<TransferenciaService['caso']>>,
    usuario: UsuarioAutenticado,
  ) {
    if (
      usuario.perfil === 'supervisor' &&
      caso.atribuicao?.supervisorId !== usuario.id
    ) {
      throw new ForbiddenException(
        'Só o supervisor responsável pelo caso pode transferi-lo.',
      );
    }
    if (caso.situacao === 'aguardando_distribuicao') {
      throw new UnprocessableEntityException(
        'Este caso ainda não tem supervisor: use a distribuição de casos.',
      );
    }
    if (!SITUACOES_TRANSFERIVEIS.includes(caso.situacao)) {
      throw new UnprocessableEntityException(
        'Só um caso ativo pode ser transferido.',
      );
    }
    if (usuario.perfil === 'supervisor' && !caso.vinculo) {
      throw new UnprocessableEntityException(
        'Este caso ainda não tem estagiário responsável: use "Vincular estagiário".',
      );
    }
  }

  // Pacientes em atendimento de cada estagiário, como no vínculo (RF21).
  private async pacientesEmAtendimento(tx: Leitura) {
    const linhas = await tx
      .select({ estagiarioId: vinculosEstagiario.estagiarioId, total: count() })
      .from(vinculosEstagiario)
      .innerJoin(casos, eq(casos.id, vinculosEstagiario.casoId))
      .where(
        and(
          eq(vinculosEstagiario.vigente, true),
          eq(casos.situacao, 'em_atendimento'),
        ),
      )
      .groupBy(vinculosEstagiario.estagiarioId);
    return new Map(linhas.map((l) => [l.estagiarioId, l.total]));
  }

  // "Estagiário do supervisor" (definição única da CP4): tem vínculo vigente num
  // caso cuja atribuição vigente é desse supervisor. Só contas ativas.
  private async estagiariosDoSupervisor(tx: Leitura, supervisorId: string) {
    return tx
      .selectDistinct({ id: usuarios.id, nome: usuarios.nome })
      .from(outroCaso)
      .innerJoin(
        vinculosEstagiario,
        and(
          eq(vinculosEstagiario.casoId, outroCaso.casoId),
          eq(vinculosEstagiario.vigente, true),
        ),
      )
      .innerJoin(usuarios, eq(usuarios.id, vinculosEstagiario.estagiarioId))
      .where(
        and(
          eq(outroCaso.supervisorId, supervisorId),
          eq(outroCaso.vigente, true),
          eq(usuarios.situacao, 'ativo'),
        ),
      )
      .orderBy(asc(usuarios.nome));
  }

  async opcoes(
    casoId: string,
    usuario: UsuarioAutenticado,
  ): Promise<OpcoesTransferencia> {
    const caso = await this.caso(this.db, casoId);
    this.conferir(caso, usuario);
    const atual = caso.vinculo?.estagiarioId;
    const candidatos =
      usuario.perfil === 'supervisor'
        ? await this.estagiariosDoSupervisor(this.db, usuario.id)
        : await this.db
            .select({ id: usuarios.id, nome: usuarios.nome })
            .from(usuarios)
            .where(
              and(
                eq(usuarios.perfil, 'estagiario'),
                eq(usuarios.situacao, 'ativo'),
              ),
            )
            .orderBy(asc(usuarios.nome));
    const pacientes = await this.pacientesEmAtendimento(this.db);
    const estagiarios: EstagiarioDisponivel[] = candidatos
      .filter((e) => e.id !== atual)
      .map((e) => ({
        id: e.id,
        nome: e.nome,
        pacientesEmAtendimento: pacientes.get(e.id) ?? 0,
      }));
    const supervisores =
      usuario.perfil === 'coordenacao'
        ? (await this.casosService.supervisoresDisponiveis()).filter(
            (s) => s.id !== caso.atribuicao?.supervisorId,
          )
        : [];
    return {
      casoId,
      numero: caso.numero,
      paciente: caso.paciente,
      supervisorAtual: caso.atribuicao
        ? { id: caso.atribuicao.supervisorId, nome: caso.atribuicao.nome }
        : null,
      estagiarioAtual: caso.vinculo
        ? { id: caso.vinculo.estagiarioId, nome: caso.vinculo.nome }
        : null,
      estagiarios,
      supervisores,
    };
  }

  // Conta ativa com o perfil esperado, travada até o fim da transação, para uma
  // desativação simultânea não deixar o caso com uma conta desativada (RF54).
  private async ativo(
    tx: Transacao,
    id: string,
    perfil: 'estagiario' | 'supervisor',
  ) {
    const [pessoa] = await tx
      .select({ id: usuarios.id, nome: usuarios.nome })
      .from(usuarios)
      .where(
        and(
          eq(usuarios.id, id),
          eq(usuarios.perfil, perfil),
          eq(usuarios.situacao, 'ativo'),
        ),
      )
      .for('update');
    if (!pessoa) {
      throw new UnprocessableEntityException(
        perfil === 'supervisor'
          ? 'Supervisor ativo não encontrado.'
          : 'Estagiário com conta ativa não encontrado.',
      );
    }
    return pessoa;
  }

  async transferir(
    casoId: string,
    dados: Transferencia,
    autor: UsuarioAutenticado,
  ): Promise<ResultadoTransferencia> {
    if (autor.perfil === 'supervisor' && dados.supervisorId) {
      throw new ForbiddenException(PECA_A_COORDENACAO);
    }
    const limite = await this.parametros.numero('limite_casos_supervisor');
    const chave = this.config.getOrThrow<string>('CHAVE_DADOS');
    try {
      return await this.db.transaction(async (tx) => {
        // A linha do caso fica travada: duas transferências, ou uma transferência e
        // um desligamento (RF37), não passam ao mesmo tempo.
        await tx
          .select({ id: casos.id })
          .from(casos)
          .where(eq(casos.id, casoId))
          .for('update');
        const caso = await this.caso(tx, casoId);
        this.conferir(caso, autor);

        const supervisorAnterior = caso.atribuicao?.supervisorId ?? null;
        const estagiarioAnterior = caso.vinculo?.estagiarioId ?? null;
        const trocaSupervisor =
          !!dados.supervisorId && dados.supervisorId !== supervisorAnterior;
        const trocaEstagiario =
          !!dados.estagiarioId && dados.estagiarioId !== estagiarioAnterior;
        if (!trocaSupervisor && !trocaEstagiario) {
          throw new UnprocessableEntityException(
            'Escolha um responsável diferente do atual.',
          );
        }

        let novoSupervisor: { id: string; nome: string } | null = null;
        if (trocaSupervisor) {
          novoSupervisor = await this.ativo(
            tx,
            dados.supervisorId!,
            'supervisor',
          );
          // Supervisor no limite de casos não recebe o caso (DF17), como no RF20.
          const [ativos] = await tx
            .select({ total: count() })
            .from(atribuicoesSupervisor)
            .innerJoin(casos, eq(casos.id, atribuicoesSupervisor.casoId))
            .where(
              and(
                eq(atribuicoesSupervisor.supervisorId, novoSupervisor.id),
                eq(atribuicoesSupervisor.vigente, true),
                notInArray(casos.situacao, [
                  'encerrado',
                  'desligado_por_faltas',
                ]),
              ),
            );
          if ((ativos?.total ?? 0) >= limite) {
            throw new UnprocessableEntityException(
              `${novoSupervisor.nome} já tem ${limite} casos ativos, o limite de casos por supervisor. Escolha outro supervisor.`,
            );
          }
        }

        let novoEstagiario: { id: string; nome: string } | null = null;
        if (trocaEstagiario) {
          novoEstagiario = await this.ativo(
            tx,
            dados.estagiarioId!,
            'estagiario',
          );
          if (autor.perfil === 'supervisor') {
            const deles = await this.estagiariosDoSupervisor(tx, autor.id);
            if (!deles.some((e) => e.id === novoEstagiario!.id)) {
              throw new ForbiddenException(
                `Esse estagiário não está sob a sua supervisão. ${PECA_A_COORDENACAO}`,
              );
            }
          }
        }

        // Novo supervisor: a atribuição anterior deixa de valer e nasce a nova.
        let atribuicaoNova: string | null = null;
        if (novoSupervisor) {
          if (caso.atribuicao) {
            await tx
              .update(atribuicoesSupervisor)
              // now() é o mesmo instante da transação e do transferido_em (RF48).
              .set({ vigente: false, encerradaEm: sql`now()` })
              .where(eq(atribuicoesSupervisor.id, caso.atribuicao.id));
          }
          [{ id: atribuicaoNova }] = await tx
            .insert(atribuicoesSupervisor)
            .values({
              casoId,
              supervisorId: novoSupervisor.id,
              atribuidoPor: autor.id,
            })
            .returning({ id: atribuicoesSupervisor.id });
        }

        // O vínculo anterior se encerra quando o estagiário muda e também quando o
        // supervisor muda sem um novo estagiário: os responsáveis anteriores perdem
        // o acesso, e o caso aguarda o vínculo pelo novo supervisor.
        const encerraVinculo =
          !!caso.vinculo && (trocaEstagiario || trocaSupervisor);
        if (encerraVinculo) {
          await tx
            .update(vinculosEstagiario)
            .set({ vigente: false, encerradoEm: sql`now()` })
            .where(eq(vinculosEstagiario.id, caso.vinculo!.id));
        }
        let vinculoNovo: string | null = null;
        if (novoEstagiario) {
          [{ id: vinculoNovo }] = await tx
            .insert(vinculosEstagiario)
            .values({
              casoId,
              estagiarioId: novoEstagiario.id,
              vinculadoPor: autor.id,
            })
            .returning({ id: vinculosEstagiario.id });
          // O prontuário é um por caso e ciclo (RF66): se o caso ainda não tinha
          // estagiário, ele nasce agora; se já tinha, o novo estagiário usa o mesmo.
          await tx
            .insert(prontuarios)
            .values({
              casoId,
              cicloAtendimento: caso.ciclo,
              vinculoOrigemId: vinculoNovo,
            })
            .onConflictDoNothing();
        }
        const situacao: SituacaoCaso = novoEstagiario
          ? 'em_atendimento'
          : encerraVinculo
            ? 'aguardando_vinculo'
            : caso.situacao;
        if (situacao !== caso.situacao) {
          await tx.update(casos).set({ situacao }).where(eq(casos.id, casoId));
        }

        // Sessões futuras do estagiário anterior: canceladas como administrativas,
        // sem falta para ninguém, com a origem de quem transferiu, para reagendar
        // com o novo estagiário. A trava espera um cancelamento em andamento por
        // outro caminho (RF15, RF16), e o conflito na sessão é ignorado.
        let canceladas: string[] = [];
        let reagendar: string[] = [];
        if (encerraVinculo) {
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
                eq(sessoesAtendimento.estagiarioId, estagiarioAnterior!),
                inArray(sessoesAtendimento.status, STATUS_SESSAO_EM_ABERTO),
                gt(sessoesAtendimento.inicio, agora),
              ),
            )
            .for('update');
          if (futuras.length) {
            const inseridos = await tx
              .insert(cancelamentosSessao)
              .values(
                futuras.map((s) => ({
                  sessaoId: s.id,
                  origem: autor.perfil as 'supervisor' | 'coordenacao',
                  classificacao: 'administrativo' as const,
                  registradoPor: autor.id,
                  antecedenciaMinutos: Math.floor(
                    (s.inicio.getTime() - agora.getTime()) / 60_000,
                  ),
                })),
              )
              .onConflictDoNothing({ target: cancelamentosSessao.sessaoId })
              .returning({ sessaoId: cancelamentosSessao.sessaoId });
            canceladas = inseridos.map((c) => c.sessaoId);
            reagendar = futuras
              .filter((s) => canceladas.includes(s.id))
              .map((s) => s.inicio.toISOString())
              .sort();
          }
          if (canceladas.length) {
            await tx
              .update(sessoesAtendimento)
              .set({ status: 'cancelada' })
              .where(inArray(sessoesAtendimento.id, canceladas));
          }
        }

        const [transferencia] = await tx
          .insert(transferenciasCaso)
          .values({
            casoId,
            tipo: novoSupervisor ? 'supervisor' : 'estagiario',
            supervisorAnteriorId: novoSupervisor ? supervisorAnterior : null,
            supervisorNovoId: novoSupervisor?.id ?? null,
            estagiarioAnteriorId: encerraVinculo ? estagiarioAnterior : null,
            estagiarioNovoId: novoEstagiario?.id ?? null,
            atribuicaoAnteriorId: novoSupervisor
              ? (caso.atribuicao?.id ?? null)
              : null,
            vinculoAnteriorId: encerraVinculo ? caso.vinculo!.id : null,
            motivoCifrado: cifrar(dados.motivo, chave),
            transferidoPor: autor.id,
          })
          .returning({ id: transferenciasCaso.id });

        // Responsáveis anterior e novo na auditoria (RNF16, RNF18). O motivo fica
        // só cifrado na transferência, porque pode trazer informação de saúde.
        await this.auditoria.registrar(
          {
            usuarioId: autor.id,
            operacao: 'transferir_caso',
            entidade: 'transferencias_caso',
            entidadeId: transferencia.id,
            dadosAnteriores: {
              supervisorId: supervisorAnterior,
              estagiarioId: estagiarioAnterior,
              situacao: caso.situacao,
            },
            dadosNovos: {
              casoId,
              supervisorId: novoSupervisor?.id ?? supervisorAnterior,
              estagiarioId:
                novoEstagiario?.id ??
                (encerraVinculo ? null : estagiarioAnterior),
              situacao,
              atribuicaoId: atribuicaoNova,
              vinculoId: vinculoNovo,
              sessoesCanceladas: canceladas,
            },
          },
          tx,
        );

        return {
          casoId,
          numero: caso.numero,
          paciente: caso.paciente,
          supervisor: novoSupervisor?.nome ?? caso.atribuicao?.nome ?? null,
          estagiario:
            novoEstagiario?.nome ??
            (encerraVinculo ? null : (caso.vinculo?.nome ?? null)),
          sessoesCanceladas: canceladas.length,
          sessoesAReagendar: reagendar,
        };
      });
    } catch (erro) {
      if (violaUnico(erro)) {
        throw new ConflictException(
          'Este caso acabou de ser alterado por outra pessoa. Abra a transferência de novo.',
        );
      }
      throw erro;
    }
  }
}
