import {
  BadRequestException,
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
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  notExists,
  sql,
} from 'drizzle-orm';
import {
  atribuicoesSupervisor,
  cancelamentosSessao,
  casos,
  encerramentosAlta,
  evolucoes,
  reaberturasCaso,
  sessoesAtendimento,
  usuarios,
  vagasLiberadas,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import {
  hojeEmBrasilia,
  semestreDaData,
  STATUS_SESSAO_EM_ABERTO,
  type PedidoAlta,
  type ReaberturaCaso,
  type RegistroAlta,
  type ResultadoReabertura,
  type SituacaoAlta,
} from '@clinica/shared';
import {
  AuditoriaService,
  type Transacao,
} from '../../auditoria/auditoria.service';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { cifrar, decifrar } from '../../common/criptografia';
import { DB } from '../../database/database.module';

const pedinte = aliasedTable(usuarios, 'pedinte');
const confirmador = aliasedTable(usuarios, 'confirmador');
const reabridor = aliasedTable(usuarios, 'reabridor');
const pedinteReabertura = aliasedTable(usuarios, 'pedinte_reabertura');

const SEM_ACESSO =
  'Você não pode registrar esta ação. Só o estagiário responsável registra a alta, só o supervisor do caso a confirma e só a coordenação reabre o caso.';

// Encerramento do caso por alta (RF68, prancha 6-5). O estagiário responsável
// pede, o supervisor do caso confirma e só a coordenação reabre. A confirmação
// faz, na mesma transação, o que o desligamento por faltas (RF37) faz: encerra o
// vínculo do estagiário, cancela as sessões futuras e libera a vaga, mas com a
// situação e o registro próprios, sem contar falta de ninguém. A atribuição do
// supervisor continua vigente: ele segue responsável pelo histórico do caso e
// pode pedir a reabertura, e o caso encerrado não conta no limite dele.
@Injectable()
export class AltaService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly config: ConfigService,
    private readonly auditoria: AuditoriaService,
  ) {}

  private get chave() {
    return this.config.getOrThrow<string>('CHAVE_DADOS');
  }

  // Situação da alta na ficha do caso. Veem a secretaria, a coordenação, o
  // supervisor do caso e o estagiário com o vínculo vigente.
  async situacao(
    casoId: string,
    usuario: UsuarioAutenticado,
  ): Promise<SituacaoAlta> {
    const { caso, estagiarioId, supervisorId, supervisor } =
      await this.responsaveis(this.db, casoId);
    const papel = this.papel(usuario, estagiarioId, supervisorId);
    if (!papel) {
      await this.registrarNegada(casoId, usuario, 'consultar_alta');
      throw new ForbiddenException('Você não tem acesso a este caso.');
    }
    const comMotivo = usuario.perfil !== 'secretaria';
    const registros = await this.registros(casoId, comMotivo);
    const pedidoAberto = registros.find((r) => !r.confirmadaEm) ?? null;
    const historico = registros.filter((r) => r.confirmadaEm);
    const vigente =
      caso.situacao === 'encerrado_por_alta'
        ? (historico.find((r) => !r.reabertura) ?? null)
        : null;
    const bloqueioReabertura = vigente
      ? this.bloqueioReabertura(vigente.dataAlta, caso.ciclo, vigente.ciclo)
      : null;

    const [realizadas] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(sessoesAtendimento)
      .where(
        and(
          eq(sessoesAtendimento.casoId, casoId),
          eq(sessoesAtendimento.cicloAtendimento, caso.ciclo),
          eq(sessoesAtendimento.status, 'realizada'),
        ),
      );
    let sessoesSemEvolucao = 0;
    if (papel === 'estagiario' || papel === 'supervisor') {
      const [linha] = await this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(sessoesAtendimento)
        .where(
          and(
            eq(sessoesAtendimento.casoId, casoId),
            eq(sessoesAtendimento.cicloAtendimento, caso.ciclo),
            eq(sessoesAtendimento.status, 'realizada'),
            notExists(
              this.db
                .select({ id: evolucoes.id })
                .from(evolucoes)
                .where(eq(evolucoes.sessaoId, sessoesAtendimento.id)),
            ),
          ),
        );
      sessoesSemEvolucao = linha?.total ?? 0;
    }

    const pedidoPorOpcoes: SituacaoAlta['pedidoPorOpcoes'] = [];
    if (vigente && usuario.perfil === 'coordenacao') {
      pedidoPorOpcoes.push({
        id: vigente.pedidaPorId,
        nome: vigente.pedidaPor,
        papel: 'estagiario',
      });
      if (supervisorId && supervisor && supervisorId !== vigente.pedidaPorId) {
        pedidoPorOpcoes.push({
          id: supervisorId,
          nome: supervisor,
          papel: 'supervisor',
        });
      }
    }

    return {
      situacao: caso.situacao,
      ciclo: caso.ciclo,
      sessoesRealizadas: realizadas?.total ?? 0,
      pedidoAberto: pedidoAberto && this.semIds(pedidoAberto),
      historico: historico.map((r) => this.semIds(r)),
      acoes: {
        pedir:
          papel === 'estagiario' &&
          caso.situacao === 'em_atendimento' &&
          !pedidoAberto,
        confirmar:
          papel === 'supervisor' &&
          caso.situacao === 'em_atendimento' &&
          !!pedidoAberto,
        reabrir:
          usuario.perfil === 'coordenacao' && !!vigente && !bloqueioReabertura,
      },
      supervisor,
      sessoesSemEvolucao,
      bloqueioReabertura,
      pedidoPorOpcoes,
    };
  }

  // Pedido da alta pelo estagiário responsável. O caso continua em atendimento
  // até a confirmação do supervisor.
  async pedir(casoId: string, dados: PedidoAlta, usuario: UsuarioAutenticado) {
    await this.exigir(casoId, usuario, 'estagiario', 'pedir_alta');
    return this.db.transaction(async (tx) => {
      const { caso, estagiarioId } = await this.responsaveis(tx, casoId, true);
      // Conferido de novo, travado: uma transferência no meio muda o responsável.
      if (estagiarioId !== usuario.id) throw new ForbiddenException(SEM_ACESSO);
      if (caso.situacao !== 'em_atendimento') {
        throw new UnprocessableEntityException(
          'Só o caso em atendimento pode ser encerrado por alta.',
        );
      }
      const [pedido] = await tx
        .insert(encerramentosAlta)
        .values({
          casoId,
          cicloAtendimento: caso.ciclo,
          dataAlta: dados.dataAlta,
          motivoCifrado: cifrar(dados.motivo, this.chave),
          pedidaPor: usuario.id,
        })
        .onConflictDoNothing()
        .returning({ id: encerramentosAlta.id });
      if (!pedido) {
        throw new ConflictException(
          'Este caso já tem uma alta aguardando a confirmação do supervisor.',
        );
      }
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          operacao: 'pedir_alta',
          entidade: 'encerramentos_alta',
          entidadeId: pedido.id,
          // O motivo fica só cifrado na alta, nunca na auditoria.
          dadosNovos: {
            casoId,
            dataAlta: dados.dataAlta,
            motivoInformado: true,
          },
        },
        tx,
      );
      return { id: pedido.id };
    });
  }

  // Confirmação pelo supervisor do caso: encerra o caso por alta.
  async confirmar(casoId: string, usuario: UsuarioAutenticado) {
    await this.exigir(casoId, usuario, 'supervisor', 'confirmar_alta');
    return this.db.transaction(async (tx) => {
      const { caso, vinculoId, estagiarioId, supervisorId } =
        await this.responsaveis(tx, casoId, true);
      if (supervisorId !== usuario.id) throw new ForbiddenException(SEM_ACESSO);
      const [pedido] = await tx
        .select({
          id: encerramentosAlta.id,
          dataAlta: encerramentosAlta.dataAlta,
        })
        .from(encerramentosAlta)
        .where(
          and(
            eq(encerramentosAlta.casoId, casoId),
            isNull(encerramentosAlta.confirmadaEm),
          ),
        )
        .for('update');
      if (!pedido) {
        throw new ConflictException(
          'Não há alta aguardando confirmação neste caso.',
        );
      }
      if (caso.situacao !== 'em_atendimento' || !vinculoId || !estagiarioId) {
        throw new UnprocessableEntityException(
          'Só o caso em atendimento, com estagiário vinculado, pode ser encerrado por alta.',
        );
      }

      const agora = new Date();
      await tx
        .update(encerramentosAlta)
        .set({ confirmadaPor: usuario.id, confirmadaEm: agora })
        .where(eq(encerramentosAlta.id, pedido.id));
      // O fim do vínculo é o que o RF48 usa para deixar de contar o caso.
      await tx
        .update(vinculosEstagiario)
        .set({ vigente: false, encerradoEm: agora })
        .where(eq(vinculosEstagiario.id, vinculoId));

      // Sessões futuras: canceladas como administrativas, que não contam como
      // falta do paciente nem do estagiário (RF16, RF39). A sessão que outro
      // caminho cancelou no meio fica de fora pelo conflito no sessao_id.
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
              origem: 'supervisor' as const,
              classificacao: 'administrativo' as const,
              justificativaCifrada: cifrar(
                'Caso encerrado por alta.',
                this.chave,
              ),
              registradoPor: usuario.id,
              registradoEm: agora,
              antecedenciaMinutos: Math.floor(
                (s.inicio.getTime() - agora.getTime()) / 60_000,
              ),
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
        .values({ altaId: pedido.id, estagiarioId, supervisorId: usuario.id })
        .returning({ id: vagasLiberadas.id });
      await tx
        .update(casos)
        .set({ situacao: 'encerrado_por_alta' })
        .where(eq(casos.id, casoId));
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          operacao: 'confirmar_alta',
          entidade: 'encerramentos_alta',
          entidadeId: pedido.id,
          dadosAnteriores: { situacao: caso.situacao, estagiarioId },
          dadosNovos: {
            casoId,
            situacao: 'encerrado_por_alta',
            dataAlta: pedido.dataAlta,
            sessoesCanceladas: canceladas,
            vagaId: vaga.id,
          },
        },
        tx,
      );
      return { sessoesCanceladas: canceladas.length };
    });
  }

  // Reabertura pela coordenação, a pedido do estagiário da alta ou do supervisor
  // do caso, só no mesmo semestre e no mesmo ciclo. Com o estagiário ainda ativo,
  // o caso volta a ele, num vínculo novo (o encerrado continua no histórico);
  // senão, aguarda vínculo, com o supervisor mantido.
  async reabrir(
    casoId: string,
    dados: ReaberturaCaso,
    usuario: UsuarioAutenticado,
  ): Promise<ResultadoReabertura> {
    await this.exigir(casoId, usuario, 'coordenacao', 'reabrir_caso');
    return this.db.transaction(async (tx) => {
      const { caso, supervisorId, supervisor } = await this.responsaveis(
        tx,
        casoId,
        true,
      );
      const [alta] = await tx
        .select({
          id: encerramentosAlta.id,
          ciclo: encerramentosAlta.cicloAtendimento,
          dataAlta: encerramentosAlta.dataAlta,
          estagiarioId: encerramentosAlta.pedidaPor,
          estagiario: pedinte.nome,
          estagiarioSituacao: pedinte.situacao,
        })
        .from(encerramentosAlta)
        .innerJoin(pedinte, eq(pedinte.id, encerramentosAlta.pedidaPor))
        .where(
          and(
            eq(encerramentosAlta.casoId, casoId),
            isNotNull(encerramentosAlta.confirmadaEm),
            notExists(
              tx
                .select({ id: reaberturasCaso.id })
                .from(reaberturasCaso)
                .where(
                  eq(reaberturasCaso.encerramentoId, encerramentosAlta.id),
                ),
            ),
          ),
        )
        .orderBy(desc(encerramentosAlta.confirmadaEm))
        .limit(1);
      if (caso.situacao !== 'encerrado_por_alta' || !alta) {
        throw new ConflictException('Este caso não está encerrado por alta.');
      }
      const bloqueio = this.bloqueioReabertura(
        alta.dataAlta,
        caso.ciclo,
        alta.ciclo,
      );
      if (bloqueio) throw new UnprocessableEntityException(bloqueio);
      if (
        dados.pedidaPor !== alta.estagiarioId &&
        dados.pedidaPor !== supervisorId
      ) {
        throw new BadRequestException([
          {
            path: ['pedidaPor'],
            message:
              'Escolha o estagiário da alta ou o supervisor do caso como quem pediu.',
          },
        ]);
      }

      const [reabertura] = await tx
        .insert(reaberturasCaso)
        .values({
          encerramentoId: alta.id,
          pedidaPor: dados.pedidaPor,
          reabertaPor: usuario.id,
          motivoCifrado: cifrar(dados.motivo, this.chave),
        })
        .returning({ id: reaberturasCaso.id });

      const volta = alta.estagiarioSituacao === 'ativo';
      let vinculoId: string | null = null;
      if (volta) {
        const [vinculo] = await tx
          .insert(vinculosEstagiario)
          .values({
            casoId,
            estagiarioId: alta.estagiarioId,
            vinculadoPor: usuario.id,
          })
          .returning({ id: vinculosEstagiario.id });
        vinculoId = vinculo.id;
      }
      // A vaga da alta que ninguém ocupou deixa de estar aberta: o caso volta a
      // ocupá-la. Se outro paciente já a ocupou, ela fica como está.
      await tx
        .update(vagasLiberadas)
        .set({ encerradaEm: new Date() })
        .where(
          and(
            eq(vagasLiberadas.altaId, alta.id),
            isNull(vagasLiberadas.ocupadaEm),
            isNull(vagasLiberadas.encerradaEm),
          ),
        );
      const situacao = volta ? 'em_atendimento' : 'aguardando_vinculo';
      await tx.update(casos).set({ situacao }).where(eq(casos.id, casoId));
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          operacao: 'reabrir_caso',
          entidade: 'reaberturas_caso',
          entidadeId: reabertura.id,
          dadosAnteriores: { situacao: caso.situacao },
          dadosNovos: {
            casoId,
            encerramentoId: alta.id,
            situacao,
            pedidaPor: dados.pedidaPor,
            vinculoId,
            motivoInformado: true,
          },
        },
        tx,
      );
      return {
        situacao,
        estagiario: volta ? alta.estagiario : null,
        supervisor,
      };
    });
  }

  // Reabertura só no semestre e no ciclo da alta: depois, é inscrição nova (RF1).
  private bloqueioReabertura(
    dataAlta: string,
    cicloAtual: number,
    cicloAlta: number,
  ): string | null {
    const semestreAlta = semestreDaData(dataAlta);
    if (semestreAlta !== semestreDaData(hojeEmBrasilia())) {
      return `Este caso foi encerrado por alta no semestre ${semestreAlta} e não pode ser reaberto. Para voltar ao atendimento, o paciente precisa fazer uma nova inscrição.`;
    }
    if (cicloAtual !== cicloAlta) {
      return 'A alta é de outro ciclo de atendimento, e o caso não pode ser reaberto por ela.';
    }
    return null;
  }

  private papel(
    usuario: UsuarioAutenticado,
    estagiarioId: string | null,
    supervisorId: string | null,
  ) {
    if (usuario.perfil === 'secretaria' || usuario.perfil === 'coordenacao')
      return usuario.perfil;
    if (usuario.perfil === 'supervisor' && supervisorId === usuario.id)
      return 'supervisor';
    if (usuario.perfil === 'estagiario' && estagiarioId === usuario.id)
      return 'estagiario';
    return null;
  }

  private async responsaveis(
    banco: Db | Transacao,
    casoId: string,
    travar = false,
  ) {
    const consulta = banco
      .select({
        id: casos.id,
        situacao: casos.situacao,
        ciclo: casos.cicloAtendimento,
      })
      .from(casos)
      .where(eq(casos.id, casoId));
    const [caso] = await (travar ? consulta.for('update') : consulta);
    if (!caso) throw new NotFoundException('Caso não encontrado.');
    const [[vinculo], [atribuicao]] = await Promise.all([
      banco
        .select({
          id: vinculosEstagiario.id,
          estagiarioId: vinculosEstagiario.estagiarioId,
        })
        .from(vinculosEstagiario)
        .where(
          and(
            eq(vinculosEstagiario.casoId, casoId),
            eq(vinculosEstagiario.vigente, true),
          ),
        ),
      banco
        .select({
          supervisorId: atribuicoesSupervisor.supervisorId,
          nome: usuarios.nome,
        })
        .from(atribuicoesSupervisor)
        .innerJoin(
          usuarios,
          eq(usuarios.id, atribuicoesSupervisor.supervisorId),
        )
        .where(
          and(
            eq(atribuicoesSupervisor.casoId, casoId),
            eq(atribuicoesSupervisor.vigente, true),
          ),
        ),
    ]);
    return {
      caso,
      vinculoId: vinculo?.id ?? null,
      estagiarioId: vinculo?.estagiarioId ?? null,
      supervisorId: atribuicao?.supervisorId ?? null,
      supervisor: atribuicao?.nome ?? null,
    };
  }

  private async registros(casoId: string, comMotivo: boolean) {
    const altas = await this.db
      .select({
        id: encerramentosAlta.id,
        ciclo: encerramentosAlta.cicloAtendimento,
        dataAlta: encerramentosAlta.dataAlta,
        motivoCifrado: encerramentosAlta.motivoCifrado,
        pedidaPorId: encerramentosAlta.pedidaPor,
        pedidaPor: pedinte.nome,
        pedidaEm: encerramentosAlta.pedidaEm,
        confirmadaPor: confirmador.nome,
        confirmadaEm: encerramentosAlta.confirmadaEm,
      })
      .from(encerramentosAlta)
      // Os dois como leftJoin: um innerJoin seguido de leftJoin de dois apelidos
      // da mesma tabela faz o Drizzle tipar o resultado como never.
      .leftJoin(pedinte, eq(pedinte.id, encerramentosAlta.pedidaPor))
      .leftJoin(
        confirmador,
        eq(confirmador.id, encerramentosAlta.confirmadaPor),
      )
      .where(eq(encerramentosAlta.casoId, casoId))
      .orderBy(desc(encerramentosAlta.pedidaEm));
    const reaberturas = await this.db
      .select({
        encerramentoId: reaberturasCaso.encerramentoId,
        reabertaEm: reaberturasCaso.reabertaEm,
        reabertaPor: reabridor.nome,
        pedidaPor: pedinteReabertura.nome,
        motivoCifrado: reaberturasCaso.motivoCifrado,
      })
      .from(reaberturasCaso)
      .innerJoin(
        encerramentosAlta,
        eq(encerramentosAlta.id, reaberturasCaso.encerramentoId),
      )
      .innerJoin(reabridor, eq(reabridor.id, reaberturasCaso.reabertaPor))
      .innerJoin(
        pedinteReabertura,
        eq(pedinteReabertura.id, reaberturasCaso.pedidaPor),
      )
      .where(eq(encerramentosAlta.casoId, casoId));
    const abrir = (valor: string) =>
      comMotivo ? decifrar(valor, this.chave) : null;
    return altas.map((l) => {
      const r = reaberturas.find((x) => x.encerramentoId === l.id);
      return {
        id: l.id,
        ciclo: l.ciclo,
        pedidaPorId: l.pedidaPorId,
        dataAlta: l.dataAlta,
        motivo: abrir(l.motivoCifrado),
        pedidaPor: l.pedidaPor ?? '',
        pedidaEm: l.pedidaEm.toISOString(),
        confirmadaPor: l.confirmadaPor,
        confirmadaEm: l.confirmadaEm?.toISOString() ?? null,
        reabertura: r
          ? {
              pedidaPor: r.pedidaPor,
              reabertaPor: r.reabertaPor,
              reabertaEm: r.reabertaEm.toISOString(),
              motivo: abrir(r.motivoCifrado),
            }
          : null,
      };
    });
  }

  private semIds({
    ciclo: _ciclo,
    pedidaPorId: _pedidaPorId,
    ...registro
  }: RegistroAlta & { ciclo: number; pedidaPorId: string }): RegistroAlta {
    return registro;
  }

  // Quem pode cada ação, conferido antes da transação: assim a tentativa negada
  // fica na auditoria, sem ser desfeita pelo rollback (prancha 6-5).
  private async exigir(
    casoId: string,
    usuario: UsuarioAutenticado,
    papel: 'estagiario' | 'supervisor' | 'coordenacao',
    operacao: string,
  ) {
    const { estagiarioId, supervisorId } = await this.responsaveis(
      this.db,
      casoId,
    );
    if (this.papel(usuario, estagiarioId, supervisorId) !== papel) {
      await this.registrarNegada(casoId, usuario, operacao);
      throw new ForbiddenException(SEM_ACESSO);
    }
  }

  // Tentativa negada, sem o motivo.
  private registrarNegada(
    casoId: string,
    usuario: UsuarioAutenticado,
    operacao: string,
  ) {
    return this.auditoria.registrar({
      usuarioId: usuario.id,
      operacao: `${operacao}_negada`,
      entidade: 'casos',
      entidadeId: casoId,
    });
  }
}
