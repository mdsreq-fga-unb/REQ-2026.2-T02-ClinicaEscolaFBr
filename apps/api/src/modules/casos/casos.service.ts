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
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  ne,
  notInArray,
} from 'drizzle-orm';
import {
  atribuicoesSupervisor,
  casos,
  decisoesPrioridade,
  desligamentosPorFaltas,
  inscricoes,
  prontuarios,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import {
  LIMITE_LISTA_PACIENTES,
  type CasoAguardando,
  type CasoDoSupervisor,
  type CasoJaDistribuido,
  type Cor,
  type EstagiarioDisponivel,
  type ListaDePacientes,
  type ResponsaveisDoCaso,
  type ResultadoDistribuicao,
  type ResultadoVinculo,
  type SituacaoCaso,
  type SupervisorDisponivel,
} from '@clinica/shared';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { escaparLike } from '../../common/busca';
import { decifrar } from '../../common/criptografia';
import { DB } from '../../database/database.module';
import { ParametrosService } from '../../parametros/parametros.service';
import { FilaService } from '../fila/fila.service';
import { DesligamentosService } from '../assiduidade/desligamentos.service';

const estagiario = aliasedTable(usuarios, 'estagiario');
const supervisor = aliasedTable(usuarios, 'supervisor');

// Violação de índice único (23505), direto ou embrulhada pelo Drizzle.
const violaUnico = (erro: unknown) => {
  const e = erro as { code?: string; cause?: { code?: string } };
  return e?.code === '23505' || e?.cause?.code === '23505';
};

// Distribuição de casos (CP5): lista dos casos aguardando (RF18), distribuição
// a supervisor (RF20) e vínculo do estagiário responsável (RF21), que cria o
// prontuário do ciclo na mesma transação (RF66).
@Injectable()
export class CasosService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly auditoria: AuditoriaService,
    private readonly parametros: ParametrosService,
    private readonly config: ConfigService,
    private readonly desligamentos: DesligamentosService,
    private readonly fila: FilaService,
  ) {}

  // Prioridade clínica vigente de cada inscrição: a decisão mais recente (RNF5).
  // A cor fica cifrada no banco (RNF51) e é aberta aqui.
  private async prioridades(inscricaoIds: string[]) {
    const vigentes = new Map<string, Cor>();
    if (inscricaoIds.length === 0) return vigentes;
    const chave = this.config.getOrThrow<string>('CHAVE_DADOS');
    const decisoes = await this.db
      .select({
        inscricaoId: decisoesPrioridade.inscricaoId,
        corCifrada: decisoesPrioridade.corCifrada,
      })
      .from(decisoesPrioridade)
      .where(inArray(decisoesPrioridade.inscricaoId, inscricaoIds))
      .orderBy(
        desc(decisoesPrioridade.decididaEm),
        desc(decisoesPrioridade.id),
      );
    for (const d of decisoes) {
      if (!vigentes.has(d.inscricaoId)) {
        vigentes.set(d.inscricaoId, decifrar(d.corCifrada, chave) as Cor);
      }
    }
    return vigentes;
  }

  // RF18 usa a mesma ordem do RF7, restringindo aos casos sem supervisor.
  async aguardandoDistribuicao(): Promise<CasoAguardando[]> {
    return (await this.fila.ordenada())
      .filter(
        (i) => i.situacao === 'aguardando_distribuicao' && !i.supervisorId,
      )
      .map(({ casoId, numero, nome, prioridade, dataInscricao }) => ({
        casoId,
        numero,
        nome,
        prioridade,
        dataInscricao,
      }));
  }

  // Casos ativos de um supervisor: atribuição vigente e caso em andamento. O caso
  // desligado por faltas não está em atendimento e não conta no limite (DF17); o
  // que aguarda vaga conta, porque volta ao atendimento (RF38).
  private async casosAtivos(tx: Pick<Db, 'select'>, supervisorId?: string) {
    return tx
      .select({
        supervisorId: atribuicoesSupervisor.supervisorId,
        total: count(),
      })
      .from(atribuicoesSupervisor)
      .innerJoin(casos, eq(casos.id, atribuicoesSupervisor.casoId))
      .where(
        and(
          eq(atribuicoesSupervisor.vigente, true),
          notInArray(casos.situacao, ['encerrado', 'desligado_por_faltas']),
          supervisorId
            ? eq(atribuicoesSupervisor.supervisorId, supervisorId)
            : undefined,
        ),
      )
      .groupBy(atribuicoesSupervisor.supervisorId);
  }

  // RF20: supervisores ativos com os casos ativos em relação ao limite (DF17).
  async supervisoresDisponiveis(): Promise<SupervisorDisponivel[]> {
    const limite = await this.parametros.numero('limite_casos_supervisor');
    const [lista, totais] = await Promise.all([
      this.db
        .select({ id: usuarios.id, nome: usuarios.nome })
        .from(usuarios)
        .where(
          and(
            eq(usuarios.perfil, 'supervisor'),
            eq(usuarios.situacao, 'ativo'),
          ),
        )
        .orderBy(asc(usuarios.nome)),
      this.casosAtivos(this.db),
    ]);
    const porSupervisor = new Map(totais.map((t) => [t.supervisorId, t.total]));
    return lista.map((s) => {
      const casosAtivos = porSupervisor.get(s.id) ?? 0;
      return {
        id: s.id,
        nome: s.nome,
        casosAtivos,
        limite,
        noLimite: casosAtivos >= limite,
      };
    });
  }

  // RF20: a coordenação atribui o caso pendente a um supervisor abaixo do limite.
  // A linha do supervisor fica bloqueada durante a contagem, para que duas
  // distribuições simultâneas não passem do limite.
  async distribuir(
    casoId: string,
    supervisorId: string,
    autor: UsuarioAutenticado,
  ): Promise<ResultadoDistribuicao> {
    const limite = await this.parametros.numero('limite_casos_supervisor');
    try {
      return await this.db.transaction(async (tx) => {
        const [caso] = await tx
          .select({
            id: casos.id,
            situacao: casos.situacao,
            numero: inscricoes.numero,
            paciente: inscricoes.nomeCompleto,
          })
          .from(casos)
          .innerJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
          .where(eq(casos.id, casoId))
          .for('update', { of: casos });
        if (!caso) throw new NotFoundException('Caso não encontrado.');

        const [atual] = await tx
          .select({
            nome: supervisor.nome,
            desde: atribuicoesSupervisor.atribuidoEm,
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
        if (atual) {
          const corpo: CasoJaDistribuido = {
            message: `Este caso já tem supervisor: ${atual.nome}. Para mudar o supervisor, use a transferência de caso.`,
            supervisor: atual.nome,
            desde: atual.desde.toISOString(),
          };
          throw new ConflictException(corpo);
        }
        if (caso.situacao !== 'aguardando_distribuicao') {
          throw new ConflictException(
            'Este caso não está aguardando distribuição.',
          );
        }

        const [escolhido] = await tx
          .select({ id: usuarios.id, nome: usuarios.nome })
          .from(usuarios)
          .where(
            and(
              eq(usuarios.id, supervisorId),
              eq(usuarios.perfil, 'supervisor'),
              eq(usuarios.situacao, 'ativo'),
            ),
          )
          .for('update');
        if (!escolhido) {
          throw new UnprocessableEntityException(
            'Supervisor ativo não encontrado.',
          );
        }
        const [ativos] = await this.casosAtivos(tx, supervisorId);
        if ((ativos?.total ?? 0) >= limite) {
          throw new UnprocessableEntityException(
            `${escolhido.nome} já tem ${limite} casos ativos, o limite de casos por supervisor. Escolha outro supervisor.`,
          );
        }

        const [atribuicao] = await tx
          .insert(atribuicoesSupervisor)
          .values({ casoId, supervisorId, atribuidoPor: autor.id })
          .returning();
        await tx
          .update(casos)
          .set({ situacao: 'aguardando_vinculo' })
          .where(eq(casos.id, casoId));
        await this.auditoria.registrar(
          {
            usuarioId: autor.id,
            operacao: 'distribuir_caso',
            entidade: 'atribuicoes_supervisor',
            entidadeId: atribuicao.id,
            // Responsável anterior e novo (RNF18): o caso não tinha supervisor.
            dadosAnteriores: { supervisorId: null, situacao: caso.situacao },
            dadosNovos: {
              casoId,
              supervisorId,
              situacao: 'aguardando_vinculo',
            },
          },
          tx,
        );
        return {
          casoId,
          numero: caso.numero,
          paciente: caso.paciente,
          supervisor: escolhido.nome,
        };
      });
    } catch (erro) {
      // Outra distribuição do mesmo caso entrou antes (índice único da vigência).
      if (violaUnico(erro)) {
        throw new ConflictException(
          'Este caso acabou de ser distribuído por outra pessoa.',
        );
      }
      throw erro;
    }
  }

  // RF21: casos sob a responsabilidade do supervisor, com o estagiário e o
  // prontuário do ciclo, quando já existem. O caso desligado por faltas continua na
  // lista, com a data em que o vínculo foi encerrado (RF37).
  async meusCasos(usuario: UsuarioAutenticado): Promise<CasoDoSupervisor[]> {
    // RF23: o estagiário vê só os casos com vínculo vigente dele; o supervisor, os
    // casos com atribuição vigente dele, que já incluem os dos seus estagiários (o
    // filtro por estagiário é da tela). Os dois deixam de ver o caso ao perder o
    // vínculo ou a atribuição (transferência, RF25; desligamento, RF37).
    const doEstagiario = usuario.perfil === 'estagiario';
    const linhas = await this.db
      .select({
        casoId: casos.id,
        inscricaoId: inscricoes.id,
        numero: inscricoes.numero,
        nome: inscricoes.nomeCompleto,
        situacao: casos.situacao,
        ciclo: casos.cicloAtendimento,
        estagiarioId: vinculosEstagiario.estagiarioId,
        estagiario: estagiario.nome,
        supervisor: supervisor.nome,
        prontuarioId: prontuarios.id,
      })
      .from(atribuicoesSupervisor)
      .innerJoin(casos, eq(casos.id, atribuicoesSupervisor.casoId))
      .innerJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
      .leftJoin(
        supervisor,
        eq(supervisor.id, atribuicoesSupervisor.supervisorId),
      )
      .leftJoin(
        vinculosEstagiario,
        and(
          eq(vinculosEstagiario.casoId, casos.id),
          eq(vinculosEstagiario.vigente, true),
        ),
      )
      .leftJoin(estagiario, eq(estagiario.id, vinculosEstagiario.estagiarioId))
      .leftJoin(
        prontuarios,
        and(
          eq(prontuarios.casoId, casos.id),
          eq(prontuarios.cicloAtendimento, casos.cicloAtendimento),
        ),
      )
      .where(
        and(
          eq(atribuicoesSupervisor.vigente, true),
          ne(casos.situacao, 'encerrado'),
          doEstagiario
            ? eq(vinculosEstagiario.estagiarioId, usuario.id)
            : eq(atribuicoesSupervisor.supervisorId, usuario.id),
        ),
      )
      .orderBy(asc(inscricoes.criadaEm));
    const cores = await this.prioridades(linhas.map((l) => l.inscricaoId));
    const desligados = linhas.filter(
      (l) => l.situacao === 'desligado_por_faltas',
    );
    const idsDesligados = desligados.map((l) => l.casoId);
    const decisoes = idsDesligados.length
      ? await this.db
          .select({
            casoId: desligamentosPorFaltas.casoId,
            decididoEm: desligamentosPorFaltas.decididoEm,
          })
          .from(desligamentosPorFaltas)
          .where(
            and(
              inArray(desligamentosPorFaltas.casoId, idsDesligados),
              isNull(desligamentosPorFaltas.revertidoEm),
            ),
          )
      : [];
    // O estagiário do último vínculo de cada caso desligado (RF37).
    const anteriores = idsDesligados.length
      ? await this.db
          .selectDistinctOn([vinculosEstagiario.casoId], {
            casoId: vinculosEstagiario.casoId,
            id: estagiario.id,
            nome: estagiario.nome,
          })
          .from(vinculosEstagiario)
          .innerJoin(
            estagiario,
            eq(estagiario.id, vinculosEstagiario.estagiarioId),
          )
          .where(inArray(vinculosEstagiario.casoId, idsDesligados))
          .orderBy(
            vinculosEstagiario.casoId,
            desc(vinculosEstagiario.vinculadoEm),
          )
      : [];
    return linhas.map((l) => {
      const decisao = decisoes.find((d) => d.casoId === l.casoId);
      const anterior = decisao
        ? anteriores.find((a) => a.casoId === l.casoId)
        : undefined;
      return {
        casoId: l.casoId,
        numero: l.numero,
        nome: l.nome,
        prioridade: cores.get(l.inscricaoId) ?? null,
        estagiario: l.estagiario,
        estagiarioId: l.estagiarioId,
        estagiarioAnterior: anterior?.nome ?? null,
        estagiarioAnteriorId: anterior?.id ?? null,
        supervisor: l.supervisor,
        prontuarioId: l.prontuarioId,
        situacao: l.situacao,
        vinculoEncerradoEm: decisao?.decididoEm.toISOString() ?? null,
      };
    });
  }

  // RF21: só estagiários com conta ativa (RF54 retira os desativados), com os
  // pacientes em atendimento de cada um.
  async estagiariosDisponiveis(): Promise<EstagiarioDisponivel[]> {
    const [lista, vinculos] = await Promise.all([
      this.db
        .select({ id: usuarios.id, nome: usuarios.nome })
        .from(usuarios)
        .where(
          and(
            eq(usuarios.perfil, 'estagiario'),
            eq(usuarios.situacao, 'ativo'),
          ),
        )
        .orderBy(asc(usuarios.nome)),
      this.db
        .select({
          estagiarioId: vinculosEstagiario.estagiarioId,
          total: count(),
        })
        .from(vinculosEstagiario)
        .innerJoin(casos, eq(casos.id, vinculosEstagiario.casoId))
        .where(
          and(
            eq(vinculosEstagiario.vigente, true),
            eq(casos.situacao, 'em_atendimento'),
          ),
        )
        .groupBy(vinculosEstagiario.estagiarioId),
    ]);
    const porEstagiario = new Map(
      vinculos.map((v) => [v.estagiarioId, v.total]),
    );
    return lista.map((e) => ({
      id: e.id,
      nome: e.nome,
      pacientesEmAtendimento: porEstagiario.get(e.id) ?? 0,
    }));
  }

  // RF21: o supervisor responsável vincula um estagiário ativo ao caso. O vínculo,
  // a criação do prontuário do ciclo (RF66) e a auditoria entram juntos.
  async vincularEstagiario(
    casoId: string,
    estagiarioId: string,
    autor: UsuarioAutenticado,
  ): Promise<ResultadoVinculo> {
    try {
      return await this.db.transaction(async (tx) => {
        const [caso] = await tx
          .select({
            id: casos.id,
            situacao: casos.situacao,
            ciclo: casos.cicloAtendimento,
            numero: inscricoes.numero,
            paciente: inscricoes.nomeCompleto,
          })
          .from(casos)
          .innerJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
          .where(eq(casos.id, casoId))
          .for('update', { of: casos });
        if (!caso) throw new NotFoundException('Caso não encontrado.');

        const [responsavel] = await tx
          .select({ id: atribuicoesSupervisor.id })
          .from(atribuicoesSupervisor)
          .where(
            and(
              eq(atribuicoesSupervisor.casoId, casoId),
              eq(atribuicoesSupervisor.supervisorId, autor.id),
              eq(atribuicoesSupervisor.vigente, true),
            ),
          );
        if (!responsavel) {
          throw new ForbiddenException(
            'Só o supervisor responsável pelo caso pode vincular o estagiário.',
          );
        }
        if (caso.situacao === 'encerrado') {
          throw new ConflictException('Este caso está encerrado.');
        }
        // Um vínculo novo devolveria o caso desligado ao atendimento sem registrar a
        // reversão (RF38). O caso que aguarda vaga já foi revertido e aceita.
        if (caso.situacao === 'desligado_por_faltas') {
          throw new ConflictException(
            'Caso desligado por faltas: só a coordenação reverte o desligamento.',
          );
        }

        const [atual] = await tx
          .select({ id: vinculosEstagiario.id })
          .from(vinculosEstagiario)
          .where(
            and(
              eq(vinculosEstagiario.casoId, casoId),
              eq(vinculosEstagiario.vigente, true),
            ),
          );
        if (atual) {
          throw new ConflictException(
            'Este caso já tem estagiário responsável. Para trocar, use a transferência de caso.',
          );
        }

        // A linha do estagiário fica bloqueada até o fim, para que uma desativação
        // simultânea não deixe o caso com uma conta desativada (RF21, RF54): o
        // vínculo que chega durante a desativação relê a conta e é recusado. A
        // desativação que começa depois do vínculo espera ele terminar e segue;
        // trocar o estagiário de um caso já vinculado é a transferência (RF25).
        const [escolhido] = await tx
          .select({ id: usuarios.id, nome: usuarios.nome })
          .from(usuarios)
          .where(
            and(
              eq(usuarios.id, estagiarioId),
              eq(usuarios.perfil, 'estagiario'),
              eq(usuarios.situacao, 'ativo'),
            ),
          )
          .for('update');
        if (!escolhido) {
          throw new UnprocessableEntityException(
            'Estagiário com conta ativa não encontrado.',
          );
        }

        const [vinculo] = await tx
          .insert(vinculosEstagiario)
          .values({ casoId, estagiarioId, vinculadoPor: autor.id })
          .returning();
        // O paciente novo ocupa a vaga liberada por um desligamento (RF37).
        const vagaOcupada = await this.desligamentos.ocuparVaga(
          tx,
          estagiarioId,
          vinculo.id,
        );

        // Um prontuário por caso e ciclo (RF66): se ele já existe no ciclo, o
        // vínculo passa a usá-lo, sem criar outro.
        const [criado] = await tx
          .insert(prontuarios)
          .values({
            casoId,
            cicloAtendimento: caso.ciclo,
            vinculoOrigemId: vinculo.id,
          })
          .onConflictDoNothing()
          .returning({ id: prontuarios.id });
        const prontuarioId =
          criado?.id ??
          (
            await tx
              .select({ id: prontuarios.id })
              .from(prontuarios)
              .where(
                and(
                  eq(prontuarios.casoId, casoId),
                  eq(prontuarios.cicloAtendimento, caso.ciclo),
                ),
              )
          )[0].id;

        await tx
          .update(casos)
          .set({ situacao: 'em_atendimento' })
          .where(eq(casos.id, casoId));
        await this.auditoria.registrar(
          {
            usuarioId: autor.id,
            operacao: 'vincular_estagiario',
            entidade: 'vinculos_estagiario',
            entidadeId: vinculo.id,
            dadosAnteriores: { estagiarioId: null, situacao: caso.situacao },
            dadosNovos: {
              casoId,
              estagiarioId,
              situacao: 'em_atendimento',
              prontuarioId,
              prontuarioCriado: Boolean(criado),
              vagaOcupada,
            },
          },
          tx,
        );
        return {
          casoId,
          numero: caso.numero,
          paciente: caso.paciente,
          estagiario: escolhido.nome,
          prontuarioId,
        };
      });
    } catch (erro) {
      if (violaUnico(erro)) {
        throw new ConflictException(
          'Este caso acabou de receber um estagiário responsável.',
        );
      }
      throw erro;
    }
  }

  // Responsáveis vigentes de cada caso: o supervisor da atribuição vigente e o
  // estagiário do vínculo vigente (RF22). Sem dado clínico (RNF17).
  private consultaDeResponsaveis() {
    return this.db
      .select({
        casoId: casos.id,
        situacao: casos.situacao,
        numero: inscricoes.numero,
        nome: inscricoes.nomeCompleto,
        supervisorId: atribuicoesSupervisor.supervisorId,
        supervisor: supervisor.nome,
        estagiarioId: vinculosEstagiario.estagiarioId,
        estagiario: estagiario.nome,
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
      .leftJoin(
        vinculosEstagiario,
        and(
          eq(vinculosEstagiario.casoId, casos.id),
          eq(vinculosEstagiario.vigente, true),
        ),
      )
      .leftJoin(estagiario, eq(estagiario.id, vinculosEstagiario.estagiarioId));
  }

  // Nome, número só para quem pode vê-lo, responsáveis e situação (RNF17).
  private paraResposta(
    l: {
      casoId: string;
      nome: string;
      numero: string;
      situacao: SituacaoCaso;
      supervisor: string | null;
      estagiario: string | null;
    },
    usuario: UsuarioAutenticado,
  ): ResponsaveisDoCaso {
    return {
      casoId: l.casoId,
      nome: l.nome,
      ...(usuario.perfil === 'secretaria' ? {} : { numero: l.numero }),
      situacao: l.situacao,
      supervisor: l.supervisor ?? null,
      estagiario: l.estagiario ?? null,
    };
  }

  // RF22: lista de Pacientes da secretaria e da coordenação, com os responsáveis
  // de cada caso. O número da inscrição vem só para a coordenação (RNF17). Busca um
  // a mais que o limite para saber se a lista foi cortada, sem contar a tabela
  // inteira (RNF21).
  async listaDePacientes(
    busca: string | undefined,
    usuario: UsuarioAutenticado,
  ): Promise<ListaDePacientes> {
    const linhas = await this.consultaDeResponsaveis()
      .where(
        busca
          ? ilike(inscricoes.nomeCompleto, `%${escaparLike(busca)}%`)
          : undefined,
      )
      .orderBy(asc(inscricoes.nomeCompleto), asc(casos.id))
      .limit(LIMITE_LISTA_PACIENTES + 1);
    return {
      pacientes: linhas
        .slice(0, LIMITE_LISTA_PACIENTES)
        .map((l) => this.paraResposta(l, usuario)),
      cortada: linhas.length > LIMITE_LISTA_PACIENTES,
    };
  }

  // RF22: secretaria e coordenação consultam qualquer caso; o estagiário e o
  // supervisor, só os que têm vínculo ou atribuição vigente nele. Para quem não
  // tem acesso, o caso inexistente responde como o negado, sem revelar o que
  // existe (RNF25).
  async responsaveis(
    casoId: string,
    usuario: UsuarioAutenticado,
  ): Promise<ResponsaveisDoCaso> {
    const [linha] = await this.consultaDeResponsaveis().where(
      eq(casos.id, casoId),
    );
    const amplo =
      usuario.perfil === 'secretaria' || usuario.perfil === 'coordenacao';
    if (!linha && amplo) throw new NotFoundException('Caso não encontrado.');
    const permitido =
      amplo ||
      (!!linha &&
        ((usuario.perfil === 'estagiario' &&
          linha.estagiarioId === usuario.id) ||
          (usuario.perfil === 'supervisor' &&
            linha.supervisorId === usuario.id)));
    if (!permitido) {
      // A tentativa fica registrada, como no acesso negado ao prontuário (RNF52):
      // é o que a tela de acesso negado da prancha 4-1 informa.
      await this.auditoria.registrar({
        usuarioId: usuario.id,
        operacao: 'consultar_responsaveis_negada',
        entidade: 'casos',
        entidadeId: casoId,
      });
      throw new ForbiddenException('Você não tem acesso a este caso.');
    }
    return this.paraResposta(linha, usuario);
  }
}
