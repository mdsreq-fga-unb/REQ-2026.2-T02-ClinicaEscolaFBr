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
  inArray,
  ne,
} from 'drizzle-orm';
import {
  atribuicoesSupervisor,
  casos,
  decisoesPrioridade,
  inscricoes,
  prontuarios,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import {
  CORES,
  type CasoAguardando,
  type CasoDoSupervisor,
  type CasoJaDistribuido,
  type Cor,
  type EstagiarioDisponivel,
  type ResultadoDistribuicao,
  type ResultadoVinculo,
  type SupervisorDisponivel,
} from '@clinica/shared';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { decifrar } from '../../common/criptografia';
import { DB } from '../../database/database.module';
import { ParametrosService } from '../../parametros/parametros.service';

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

  // RF18: casos triados sem supervisor, por prioridade clínica e, na mesma
  // prioridade, da inscrição mais antiga para a mais recente. Sem a queixa.
  async aguardandoDistribuicao(): Promise<CasoAguardando[]> {
    const linhas = await this.db
      .select({
        casoId: casos.id,
        inscricaoId: inscricoes.id,
        numero: inscricoes.numero,
        nome: inscricoes.nomeCompleto,
        dataInscricao: inscricoes.criadaEm,
      })
      .from(casos)
      .innerJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
      .where(eq(casos.situacao, 'aguardando_distribuicao'));
    const semSupervisor = await this.semAtribuicao(linhas.map((l) => l.casoId));
    // Só casos triados: a prioridade clínica confirmada é o que os torna casos (RF6).
    const cores = await this.prioridades(linhas.map((l) => l.inscricaoId));
    return linhas
      .filter((l) => semSupervisor.has(l.casoId) && cores.has(l.inscricaoId))
      .map((l) => ({
        casoId: l.casoId,
        numero: l.numero,
        nome: l.nome,
        prioridade: cores.get(l.inscricaoId)!,
        dataInscricao: l.dataInscricao.toISOString(),
      }))
      .sort(
        (a, b) =>
          CORES.indexOf(a.prioridade) - CORES.indexOf(b.prioridade) ||
          a.dataInscricao.localeCompare(b.dataInscricao) ||
          a.numero.localeCompare(b.numero),
      );
  }

  // Casos, entre os informados, sem atribuição de supervisor vigente.
  private async semAtribuicao(casoIds: string[]) {
    if (casoIds.length === 0) return new Set<string>();
    const comSupervisor = await this.db
      .select({ casoId: atribuicoesSupervisor.casoId })
      .from(atribuicoesSupervisor)
      .where(
        and(
          inArray(atribuicoesSupervisor.casoId, casoIds),
          eq(atribuicoesSupervisor.vigente, true),
        ),
      );
    const ocupados = new Set(comSupervisor.map((c) => c.casoId));
    return new Set(casoIds.filter((id) => !ocupados.has(id)));
  }

  // Casos ativos de um supervisor: atribuição vigente e caso não encerrado.
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
          ne(casos.situacao, 'encerrado'),
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
  // prontuário do ciclo, quando já existem.
  async meusCasos(usuario: UsuarioAutenticado): Promise<CasoDoSupervisor[]> {
    const linhas = await this.db
      .select({
        casoId: casos.id,
        inscricaoId: inscricoes.id,
        numero: inscricoes.numero,
        nome: inscricoes.nomeCompleto,
        estagiario: estagiario.nome,
        prontuarioId: prontuarios.id,
      })
      .from(atribuicoesSupervisor)
      .innerJoin(casos, eq(casos.id, atribuicoesSupervisor.casoId))
      .innerJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
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
          eq(atribuicoesSupervisor.supervisorId, usuario.id),
          eq(atribuicoesSupervisor.vigente, true),
          ne(casos.situacao, 'encerrado'),
        ),
      )
      .orderBy(asc(inscricoes.criadaEm));
    const cores = await this.prioridades(linhas.map((l) => l.inscricaoId));
    return linhas.map((l) => ({
      casoId: l.casoId,
      numero: l.numero,
      nome: l.nome,
      prioridade: cores.get(l.inscricaoId) ?? null,
      estagiario: l.estagiario,
      prontuarioId: l.prontuarioId,
    }));
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

        const [escolhido] = await tx
          .select({ id: usuarios.id, nome: usuarios.nome })
          .from(usuarios)
          .where(
            and(
              eq(usuarios.id, estagiarioId),
              eq(usuarios.perfil, 'estagiario'),
              eq(usuarios.situacao, 'ativo'),
            ),
          );
        if (!escolhido) {
          throw new UnprocessableEntityException(
            'Estagiário com conta ativa não encontrado.',
          );
        }

        const [vinculo] = await tx
          .insert(vinculosEstagiario)
          .values({ casoId, estagiarioId, vinculadoPor: autor.id })
          .returning();

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
}
