import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  aliasedTable,
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  notExists,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  atribuicoesSupervisor,
  cancelamentosSessao,
  casos,
  inscricoes,
  pagamentosContribuicao,
  perdasVaga,
  sessoesAtendimento,
  usuarios,
  vagasLiberadas,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import {
  prazoDaContribuicao,
  prazoVencido,
  STATUS_SESSAO_EM_ABERTO,
  type BloqueioContribuicao,
  type ContribuicaoNoAgendamento,
  type Perfil,
  type PerdaVagaDoCaso,
  type PrazoContribuicaoVencido,
  type ResultadoPerdaVaga,
} from '@clinica/shared';
import {
  AuditoriaService,
  type Transacao,
} from '../../auditoria/auditoria.service';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { DB } from '../../database/database.module';

type Leitor = Db | Transacao;
type CasoDoCiclo = { id: string; ciclo: number };

const estagiario = aliasedTable(usuarios, 'estagiario');
const confirmador = aliasedTable(usuarios, 'confirmador');

// Situações em que o caso está de volta à fila de espera (RF7).
const NA_FILA = ['aguardando_distribuicao', 'aguardando_vinculo'] as const;

// Violação de unique (23505), direto ou embrulhada pelo Drizzle.
const violaUnico = (erro: unknown) => {
  const e = erro as { code?: string; cause?: { code?: string } };
  return e?.code === '23505' || e?.cause?.code === '23505';
};

// O caso tem pagamento registrado no ciclo atual (RF41): qualquer versão vale,
// porque a correção não apaga o pagamento.
const pagamentoDoCiclo = (banco: Leitor) =>
  banco
    .select({ id: pagamentosContribuicao.id })
    .from(pagamentosContribuicao)
    .where(
      and(
        eq(pagamentosContribuicao.casoId, casos.id),
        eq(pagamentosContribuicao.cicloAtendimento, casos.cicloAtendimento),
      ),
    );

// Primeiro vínculo depois da última entrada do caso na fila: o início do prazo,
// como no RF41. A transferência (RF25) não o reinicia; a perda da vaga, sim.
const primeiroVinculo = sql<Date | string | null>`(
  select min(v.vinculado_em) from vinculos_estagiario v
  where v.caso_id = ${casos.id} and v.vinculado_em >= ${casos.entradaNaFilaEm}
)`;

const comoData = (valor: Date | string) =>
  valor instanceof Date ? valor : new Date(valor);

// Contribuição social pendente (RF43): o bloqueio do agendamento da 2ª sessão em
// diante, o aviso do prazo vencido e a confirmação da perda da vaga, que devolve
// o caso à fila (DF33). A situação é a mesma do RF41: pendente é o caso sem
// pagamento registrado no ciclo atual.
@Injectable()
export class ContribuicaoPendenteService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly auditoria: AuditoriaService,
  ) {}

  // Recusa o agendamento (422) quando o caso já tem uma sessão realizada no
  // ciclo e a contribuição está pendente. A 1ª sessão nunca é bloqueada. O
  // pagamento é lido a cada agendamento, e o registro libera o próximo na hora.
  async recusarAgendamento(caso: CasoDoCiclo, paciente: string) {
    const [situacao] = await this.noAgendamento([caso], 'secretaria');
    if (!situacao?.[1].bloqueia) return;
    const corpo: BloqueioContribuicao & { statusCode: number } = {
      statusCode: 422,
      codigo: 'contribuicao_pendente',
      message: `A contribuição social de ${paciente} está pendente. A partir da 2ª sessão, o agendamento exige o pagamento registrado.`,
    };
    throw new UnprocessableEntityException(corpo);
  }

  // Situação de cada caso para o "Agendar sessão". A data do pagamento só vai
  // para a secretaria, que registra o pagamento; o estagiário vê só a situação.
  async noAgendamento(
    lista: CasoDoCiclo[],
    perfil: Perfil,
  ): Promise<[string, ContribuicaoNoAgendamento][]> {
    if (lista.length === 0) return [];
    const ids = lista.map((c) => c.id);
    const [pagamentos, realizadas] = await Promise.all([
      this.db
        .select({
          casoId: pagamentosContribuicao.casoId,
          ciclo: pagamentosContribuicao.cicloAtendimento,
          pagoEm: pagamentosContribuicao.pagoEm,
        })
        .from(pagamentosContribuicao)
        .where(inArray(pagamentosContribuicao.casoId, ids))
        // A versão vigente é a de maior número; ela fica por último no mapa.
        .orderBy(asc(pagamentosContribuicao.versao)),
      this.db
        .selectDistinct({
          casoId: sessoesAtendimento.casoId,
          ciclo: sessoesAtendimento.cicloAtendimento,
        })
        .from(sessoesAtendimento)
        .where(
          and(
            inArray(sessoesAtendimento.casoId, ids),
            eq(sessoesAtendimento.status, 'realizada'),
          ),
        ),
    ]);
    const pagoEm = new Map(
      pagamentos.map((p) => [`${p.casoId}:${p.ciclo}`, p.pagoEm]),
    );
    const comRealizada = new Set(
      realizadas.map((s) => `${s.casoId}:${s.ciclo}`),
    );
    return lista.map((c) => {
      const chave = `${c.id}:${c.ciclo}`;
      const data = pagoEm.get(chave) ?? null;
      return [
        c.id,
        {
          situacao: data ? 'efetivada' : 'pendente',
          bloqueia: !data && comRealizada.has(chave),
          pagoEm: perfil === 'secretaria' ? data : null,
        },
      ];
    });
  }

  // Casos em atendimento com o prazo vencido sem pagamento, do prazo mais antigo
  // para o mais recente: o aviso à secretaria e à coordenação.
  async prazosVencidos(): Promise<PrazoContribuicaoVencido[]> {
    const linhas = await this.consultaPendentes(this.db);
    return linhas
      .filter((l) => l.ate !== null && prazoVencido(l.ate))
      .sort((a, b) => a.ate!.localeCompare(b.ate!))
      .map((l) => ({
        casoId: l.casoId,
        numero: l.numero,
        nome: l.nome,
        estagiario: l.estagiario,
        vinculadoEm: l.vinculadoEm!.toISOString(),
        ate: l.ate!,
      }));
  }

  // O prazo vencido de um caso, para o aviso ao estagiário e ao supervisor, que
  // não confirmam a perda da vaga.
  async vencimento(
    casoId: string,
  ): Promise<{ vinculadoEm: string; ate: string } | null> {
    const [linha] = await this.consultaPendentes(this.db, eq(casos.id, casoId));
    if (!linha?.ate || !prazoVencido(linha.ate)) return null;
    return { vinculadoEm: linha.vinculadoEm!.toISOString(), ate: linha.ate };
  }

  // Para a ficha: a prévia da perda (aviso e diálogo) ou a perda já confirmada.
  async doCaso(casoId: string): Promise<PerdaVagaDoCaso> {
    const [caso] = await this.db
      .select({
        situacao: casos.situacao,
        entradaNaFilaEm: casos.entradaNaFilaEm,
      })
      .from(casos)
      .where(eq(casos.id, casoId));
    if (!caso) throw new NotFoundException('Caso não encontrado.');

    const [vencido] =
      caso.situacao === 'em_atendimento'
        ? await this.consultaPendentes(this.db, eq(casos.id, casoId))
        : [];
    let previa: PerdaVagaDoCaso['previa'] = null;
    if (vencido?.ate && prazoVencido(vencido.ate)) {
      const futuras = await this.db
        .select({ inicio: sessoesAtendimento.inicio })
        .from(sessoesAtendimento)
        .where(this.sessoesFuturas(casoId, new Date()))
        .orderBy(asc(sessoesAtendimento.inicio));
      previa = {
        estagiario: vencido.estagiario,
        vinculadoEm: vencido.vinculadoEm!.toISOString(),
        ate: vencido.ate,
        sessoesFuturas: futuras.map((s) => s.inicio.toISOString()),
      };
    }

    // A perda só aparece enquanto o caso está na fila por causa dela: a entrada
    // na fila é o instante da confirmação, gravados na mesma transação.
    let confirmada: PerdaVagaDoCaso['confirmada'] = null;
    if ((NA_FILA as readonly string[]).includes(caso.situacao)) {
      const [perda] = await this.db
        .select({
          confirmadaPor: confirmador.nome,
          confirmadaEm: perdasVaga.confirmadaEm,
          sessoesCanceladas: perdasVaga.sessoesCanceladas,
          estagiario: estagiario.nome,
        })
        .from(perdasVaga)
        .innerJoin(confirmador, eq(confirmador.id, perdasVaga.confirmadaPor))
        .innerJoin(estagiario, eq(estagiario.id, perdasVaga.estagiarioId))
        .where(eq(perdasVaga.casoId, casoId))
        .orderBy(desc(perdasVaga.confirmadaEm))
        .limit(1);
      if (
        perda &&
        perda.confirmadaEm.getTime() === caso.entradaNaFilaEm.getTime()
      ) {
        confirmada = {
          ...perda,
          confirmadaEm: perda.confirmadaEm.toISOString(),
        };
      }
    }
    return {
      previa,
      confirmada,
      naFilaDesde: caso.entradaNaFilaEm.toISOString(),
    };
  }

  // Confirmação da perda da vaga (RF43, DF33), numa transação só, com o caso
  // travado: encerra o vínculo e a atribuição do supervisor, cancela as sessões
  // futuras como administrativas, libera a vaga do estagiário e devolve o caso à
  // fila com a mesma prioridade e a entrada na fila de agora.
  async confirmar(
    casoId: string,
    usuario: UsuarioAutenticado,
  ): Promise<ResultadoPerdaVaga> {
    try {
      return await this.db.transaction(async (tx) => {
        const [caso] = await tx
          .select({
            id: casos.id,
            situacao: casos.situacao,
            ciclo: casos.cicloAtendimento,
          })
          .from(casos)
          .where(eq(casos.id, casoId))
          .for('update');
        if (!caso) throw new NotFoundException('Caso não encontrado.');
        if (caso.situacao !== 'em_atendimento') {
          throw new ConflictException(
            'Este paciente não está em atendimento: não há vaga a perder.',
          );
        }
        const [pendente] = await this.consultaPendentes(
          tx,
          eq(casos.id, casoId),
        );
        if (!pendente) {
          throw new ConflictException({
            statusCode: 409,
            codigo: 'ja_pago',
            message:
              'A contribuição deste ciclo já foi paga: o paciente não perde a vaga.',
          });
        }
        if (!pendente.ate || !prazoVencido(pendente.ate)) {
          throw new ConflictException({
            statusCode: 409,
            codigo: 'prazo_em_aberto',
            message: pendente.ate
              ? `O prazo da contribuição vai até ${pendente.ate.split('-').reverse().join('/')}. A perda da vaga só pode ser confirmada depois dele.`
              : 'O prazo da contribuição ainda não começou.',
          });
        }
        const [vinculo] = await tx
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
          );
        const [atribuicao] = await tx
          .select({
            id: atribuicoesSupervisor.id,
            supervisorId: atribuicoesSupervisor.supervisorId,
          })
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

        // Sessões futuras canceladas como administrativas: não geram falta do
        // paciente nem contam como ausência do estagiário. A trava espera um
        // cancelamento em andamento por outro caminho; o conflito é ignorado.
        const agora = new Date();
        const futuras = await tx
          .select({
            id: sessoesAtendimento.id,
            inicio: sessoesAtendimento.inicio,
          })
          .from(sessoesAtendimento)
          .where(this.sessoesFuturas(casoId, agora))
          .for('update');
        let canceladas: string[] = [];
        if (futuras.length) {
          const inseridos = await tx
            .insert(cancelamentosSessao)
            .values(
              futuras.map((s) => ({
                sessaoId: s.id,
                origem: usuario.perfil as 'secretaria' | 'coordenacao',
                classificacao: 'administrativo' as const,
                registradoPor: usuario.id,
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

        const [perda] = await tx
          .insert(perdasVaga)
          .values({
            casoId,
            cicloAtendimento: caso.ciclo,
            vinculoId: vinculo.id,
            estagiarioId: vinculo.estagiarioId,
            supervisorId: atribuicao.supervisorId,
            vinculadoEm: pendente.vinculadoEm!,
            prazoAte: pendente.ate,
            sessoesCanceladas: canceladas.length,
            confirmadaPor: usuario.id,
            confirmadaEm: sql`now()`,
          })
          .returning({ id: perdasVaga.id });
        // now() é o mesmo instante em toda a transação: o fim do vínculo e da
        // atribuição (RF48), a confirmação e a nova entrada na fila.
        await tx
          .update(vinculosEstagiario)
          .set({ vigente: false, encerradoEm: sql`now()` })
          .where(eq(vinculosEstagiario.id, vinculo.id));
        await tx
          .update(atribuicoesSupervisor)
          .set({ vigente: false, encerradaEm: sql`now()` })
          .where(eq(atribuicoesSupervisor.id, atribuicao.id));
        const [vaga] = await tx
          .insert(vagasLiberadas)
          .values({
            perdaVagaId: perda.id,
            estagiarioId: vinculo.estagiarioId,
            supervisorId: atribuicao.supervisorId,
          })
          .returning({ id: vagasLiberadas.id });
        const [volta] = await tx
          .update(casos)
          .set({
            situacao: 'aguardando_distribuicao',
            entradaNaFilaEm: sql`now()`,
          })
          .where(eq(casos.id, casoId))
          .returning({ entradaNaFilaEm: casos.entradaNaFilaEm });
        await this.auditoria.registrar(
          {
            usuarioId: usuario.id,
            operacao: 'confirmar_perda_vaga',
            entidade: 'perdas_vaga',
            entidadeId: perda.id,
            dadosAnteriores: {
              situacao: caso.situacao,
              estagiarioId: vinculo.estagiarioId,
              supervisorId: atribuicao.supervisorId,
            },
            dadosNovos: {
              casoId,
              situacao: 'aguardando_distribuicao',
              prazoAte: pendente.ate,
              sessoesCanceladas: canceladas,
              vagaId: vaga.id,
              entradaNaFilaEm: volta.entradaNaFilaEm.toISOString(),
            },
          },
          tx,
        );
        return {
          estagiario: pendente.estagiario,
          sessoesCanceladas: canceladas.length,
          naFilaDesde: volta.entradaNaFilaEm.toISOString(),
        };
      });
    } catch (erro) {
      // Outra confirmação do mesmo vínculo entrou antes (unique do vínculo).
      if (violaUnico(erro)) {
        throw new ConflictException(
          'A perda da vaga deste paciente acabou de ser confirmada por outra pessoa.',
        );
      }
      throw erro;
    }
  }

  // Casos em atendimento, com estagiário vigente e sem pagamento no ciclo, com o
  // início e o fim do prazo. O fim fica vazio enquanto não há vínculo no período.
  private async consultaPendentes(banco: Leitor, filtro?: SQL) {
    const linhas = await banco
      .select({
        casoId: casos.id,
        numero: inscricoes.numero,
        nome: inscricoes.nomeCompleto,
        estagiario: estagiario.nome,
        primeiroVinculo,
      })
      .from(casos)
      .innerJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
      .innerJoin(
        vinculosEstagiario,
        and(
          eq(vinculosEstagiario.casoId, casos.id),
          eq(vinculosEstagiario.vigente, true),
        ),
      )
      .innerJoin(estagiario, eq(estagiario.id, vinculosEstagiario.estagiarioId))
      .where(
        and(
          eq(casos.situacao, 'em_atendimento'),
          notExists(pagamentoDoCiclo(banco)),
          filtro,
        ),
      );
    return linhas.map((l) => {
      const vinculadoEm = l.primeiroVinculo
        ? comoData(l.primeiroVinculo)
        : null;
      return {
        casoId: l.casoId,
        numero: l.numero,
        nome: l.nome,
        estagiario: l.estagiario,
        vinculadoEm,
        ate: vinculadoEm ? prazoDaContribuicao(vinculadoEm) : null,
      };
    });
  }

  private sessoesFuturas(casoId: string, agora: Date) {
    return and(
      eq(sessoesAtendimento.casoId, casoId),
      inArray(sessoesAtendimento.status, STATUS_SESSAO_EM_ABERTO),
      gt(sessoesAtendimento.inicio, agora),
    );
  }
}
