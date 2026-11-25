import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  lt,
  min,
  notInArray,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  alteracoesParametro,
  casos,
  inscricoes,
  pagamentosContribuicao,
  parametros,
  sessoesAtendimento,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import {
  formatarCentavos,
  PARAMETROS_PADRAO,
  prazoDaContribuicao,
  type CicloAnteriorContribuicao,
  type ContribuicaoDoPaciente,
  type CorrecaoContribuicao,
  type FiltroContribuicoes,
  type RegistroContribuicao,
  type SituacaoContribuicao,
  type ValorContribuicao,
  type VersaoContribuicao,
} from '@clinica/shared';
import {
  AuditoriaService,
  type Transacao,
} from '../../auditoria/auditoria.service';
import { FORA_DA_PRIMEIRA_SESSAO } from '../../common/contribuicao-pendente';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { DB } from '../../database/database.module';
import { numeroDoParametro } from '../../parametros/parametros.service';

const VALOR = 'valor_contribuicao_centavos';
type Leitor = Db | Transacao;
type CasoDoPagamento = { id: string; ciclo: number; entradaNaFilaEm: Date };

const SEM_VINCULO =
  'A contribuição só é devida depois do vínculo do paciente com um estagiário.';
const JA_PAGO = 'Este ciclo já tem pagamento registrado.';

// Violação de unique (23505), direto ou embrulhada pelo Drizzle.
const violaUnico = (erro: unknown) => {
  const e = erro as { code?: string; cause?: { code?: string } };
  return e?.code === '23505' || e?.cause?.code === '23505';
};

// Campos do pagamento que entram na auditoria (RNF36).
const dadosDaVersao = (v: VersaoContribuicao) => ({
  versao: v.versao,
  valorCentavos: v.valorCentavos,
  pagoEm: v.pagoEm,
  forma: v.forma,
});

// Contribuição social do paciente (RF41): o registro do pagamento recebido pela
// secretaria, a correção versionada e o valor, parâmetro da coordenação. Nada
// passa pela API como cobrança: o sistema só registra o que já foi pago.
@Injectable()
export class ContribuicaoService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly auditoria: AuditoriaService,
  ) {}

  async situacao(casoId: string): Promise<SituacaoContribuicao> {
    return this.montarSituacao(this.db, await this.caso(this.db, casoId));
  }

  // Situação da contribuição dos pacientes em atendimento, no ciclo atual de cada
  // caso (RF42). "Pendente" é o caso sem pagamento no ciclo; "efetivada" traz a
  // data do pagamento da versão vigente. Na pendente, o prazo é o mesmo da ficha
  // (RF41), contado do primeiro vínculo depois da última entrada na fila.
  async listar({
    situacao,
  }: FiltroContribuicoes): Promise<ContribuicaoDoPaciente[]> {
    const lista = await this.db
      .select({
        id: casos.id,
        ciclo: casos.cicloAtendimento,
        entradaNaFilaEm: casos.entradaNaFilaEm,
        paciente: inscricoes.nomeCompleto,
      })
      .from(casos)
      .innerJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
      .where(eq(casos.situacao, 'em_atendimento'))
      .orderBy(asc(inscricoes.nomeCompleto));
    if (lista.length === 0) return [];
    const ids = lista.map((c) => c.id);

    // Versão vigente do pagamento do ciclo atual de cada caso: a de maior número.
    const pagamentos = await this.db
      .selectDistinctOn([pagamentosContribuicao.casoId], {
        casoId: pagamentosContribuicao.casoId,
        pagoEm: pagamentosContribuicao.pagoEm,
      })
      .from(pagamentosContribuicao)
      .innerJoin(
        casos,
        and(
          eq(casos.id, pagamentosContribuicao.casoId),
          eq(casos.cicloAtendimento, pagamentosContribuicao.cicloAtendimento),
        ),
      )
      .where(inArray(pagamentosContribuicao.casoId, ids))
      .orderBy(
        pagamentosContribuicao.casoId,
        desc(pagamentosContribuicao.versao),
      );
    const pagoEm = new Map(pagamentos.map((p) => [p.casoId, p.pagoEm]));

    // Primeira sessão do ciclo atual, sem as canceladas nem as faltas do
    // paciente, como na indicação da agenda.
    const primeiras = await this.db
      .select({
        casoId: sessoesAtendimento.casoId,
        inicio: min(sessoesAtendimento.inicio),
      })
      .from(sessoesAtendimento)
      .innerJoin(
        casos,
        and(
          eq(casos.id, sessoesAtendimento.casoId),
          eq(casos.cicloAtendimento, sessoesAtendimento.cicloAtendimento),
        ),
      )
      .where(
        and(
          inArray(sessoesAtendimento.casoId, ids),
          notInArray(sessoesAtendimento.status, [...FORA_DA_PRIMEIRA_SESSAO]),
        ),
      )
      .groupBy(sessoesAtendimento.casoId);
    const primeira = new Map(primeiras.map((p) => [p.casoId, p.inicio]));

    const resultado: ContribuicaoDoPaciente[] = [];
    for (const caso of lista) {
      const pago = pagoEm.get(caso.id) ?? null;
      const atual = pago ? 'efetivada' : 'pendente';
      if (situacao && situacao !== atual) continue;
      const vinculadoEm = pago
        ? null
        : await this.primeiroVinculo(this.db, caso);
      const inicio = primeira.get(caso.id);
      resultado.push({
        casoId: caso.id,
        paciente: caso.paciente,
        situacao: atual,
        primeiraSessao: inicio ? new Date(inicio).toISOString() : null,
        pagoEm: pago,
        prazoAte: vinculadoEm ? prazoDaContribuicao(vinculadoEm) : null,
      });
    }
    return resultado;
  }

  // O caso fica travado até o fim da transação: dois registros ao mesmo tempo
  // esperam a vez, e o segundo encontra o primeiro e recebe o 409. O unique de
  // (caso, ciclo, versão) segura o que escapar da trava.
  async registrar(
    casoId: string,
    dados: RegistroContribuicao,
    usuario: UsuarioAutenticado,
  ): Promise<SituacaoContribuicao> {
    try {
      return await this.db.transaction(async (tx) => {
        const caso = await this.caso(tx, casoId, true);
        if (!(await this.primeiroVinculo(tx, caso))) {
          throw new UnprocessableEntityException(SEM_VINCULO);
        }
        const [vigente] = await this.versoes(tx, caso);
        if (vigente) this.jaPago(vigente.pagoEm);

        // O valor vem do parâmetro, lido nesta transação, e fica copiado na linha.
        // Se não é o valor que a secretaria viu na tela, a coordenação mudou o
        // parâmetro com o formulário aberto: nada é gravado, e a tela pede nova
        // confirmação com o valor atual.
        const valorCentavos = await numeroDoParametro(tx, VALOR);
        if (valorCentavos !== dados.valorEsperadoCentavos) {
          throw new ConflictException({
            statusCode: 409,
            codigo: 'valor_alterado',
            message: `O valor da contribuição mudou para ${formatarCentavos(valorCentavos)}. Confira e confirme o pagamento de novo.`,
            valorAtualCentavos: valorCentavos,
          });
        }
        const [pagamento] = await tx
          .insert(pagamentosContribuicao)
          .values({
            casoId: caso.id,
            cicloAtendimento: caso.ciclo,
            versao: 1,
            valorCentavos,
            pagoEm: dados.pagoEm,
            forma: dados.forma,
            registradoPor: usuario.id,
          })
          .returning({ id: pagamentosContribuicao.id });
        await this.auditoria.registrar(
          {
            usuarioId: usuario.id,
            operacao: 'registrar_contribuicao',
            entidade: 'pagamentos_contribuicao',
            entidadeId: pagamento.id,
            dadosAnteriores: null,
            dadosNovos: {
              casoId: caso.id,
              cicloAtendimento: caso.ciclo,
              versao: 1,
              valorCentavos,
              pagoEm: dados.pagoEm,
              forma: dados.forma,
            },
          },
          tx,
        );
        return this.montarSituacao(tx, caso);
      });
    } catch (erro) {
      if (!violaUnico(erro)) throw erro;
      const caso = await this.caso(this.db, casoId);
      const [vigente] = await this.versoes(this.db, caso);
      return this.jaPago(vigente?.pagoEm);
    }
  }

  // A correção é a versão seguinte, com o motivo; a anterior continua guardada e
  // consultável (RNF36).
  async corrigir(
    casoId: string,
    dados: CorrecaoContribuicao,
    usuario: UsuarioAutenticado,
  ): Promise<SituacaoContribuicao> {
    try {
      return await this.db.transaction(async (tx) => {
        const caso = await this.caso(tx, casoId, true);
        const [vigente] = await this.versoes(tx, caso);
        if (!vigente) {
          throw new UnprocessableEntityException(
            'Este ciclo ainda não tem pagamento registrado para corrigir.',
          );
        }
        // A secretaria corrige a versão que abriu. Se outra pessoa corrigiu antes,
        // a correção é recusada, para não desfazer a outra sem perceber.
        if (vigente.versao !== dados.versaoEsperada)
          this.desatualizada(vigente.versao);
        if (
          vigente.valorCentavos === dados.valorCentavos &&
          vigente.pagoEm === dados.pagoEm &&
          vigente.forma === dados.forma
        ) {
          throw new UnprocessableEntityException(
            'A correção precisa mudar o valor, a data ou a forma de pagamento.',
          );
        }
        const versao = vigente.versao + 1;
        const [pagamento] = await tx
          .insert(pagamentosContribuicao)
          .values({
            casoId: caso.id,
            cicloAtendimento: caso.ciclo,
            versao,
            valorCentavos: dados.valorCentavos,
            pagoEm: dados.pagoEm,
            forma: dados.forma,
            motivoCorrecao: dados.motivo,
            registradoPor: usuario.id,
          })
          .returning({ id: pagamentosContribuicao.id });
        await this.auditoria.registrar(
          {
            usuarioId: usuario.id,
            operacao: 'corrigir_contribuicao',
            entidade: 'pagamentos_contribuicao',
            entidadeId: pagamento.id,
            dadosAnteriores: { casoId: caso.id, ...dadosDaVersao(vigente) },
            dadosNovos: {
              casoId: caso.id,
              cicloAtendimento: caso.ciclo,
              versao,
              valorCentavos: dados.valorCentavos,
              pagoEm: dados.pagoEm,
              forma: dados.forma,
              motivo: dados.motivo,
            },
          },
          tx,
        );
        return this.montarSituacao(tx, caso);
      });
    } catch (erro) {
      if (!violaUnico(erro)) throw erro;
      const caso = await this.caso(this.db, casoId);
      const [vigente] = await this.versoes(this.db, caso);
      return this.desatualizada(vigente?.versao ?? dados.versaoEsperada);
    }
  }

  // O valor vigente e todas as alterações dele, da mais recente para a mais
  // antiga. Nada é cortado por data: o RNF36 pede o histórico disponível à
  // coordenação por pelo menos 24 meses, e a tabela só recebe inserções.
  async valor(banco: Leitor = this.db): Promise<ValorContribuicao> {
    const alteracoes = await banco
      .select({
        valorAnterior: alteracoesParametro.valorAnterior,
        valorNovo: alteracoesParametro.valorNovo,
        por: usuarios.nome,
        em: alteracoesParametro.alteradoEm,
      })
      .from(alteracoesParametro)
      .innerJoin(usuarios, eq(usuarios.id, alteracoesParametro.alteradoPor))
      .where(eq(alteracoesParametro.chave, VALOR))
      .orderBy(
        desc(alteracoesParametro.alteradoEm),
        desc(alteracoesParametro.id),
      );
    const historico = alteracoes.map((a) => ({
      ...a,
      em: a.em.toISOString(),
    }));
    return {
      valorCentavos: await numeroDoParametro(banco, VALOR),
      ultimaAlteracao: historico[0] ?? null,
      alteracoes: historico,
    };
  }

  // A mudança grava o valor vigente e o histórico na mesma transação, com o valor
  // anterior, o novo, o autor e a data/hora. Os pagamentos já registrados guardam
  // o próprio valor e não mudam.
  alterarValor(
    valorCentavos: number,
    autorId: string,
  ): Promise<ValorContribuicao> {
    return this.db.transaction(async (tx) => {
      const [linha] = await tx
        .select({ valor: parametros.valor })
        .from(parametros)
        .where(eq(parametros.chave, VALOR))
        .for('update');
      const anterior =
        linha?.valor ?? String(PARAMETROS_PADRAO.valor_contribuicao_centavos);
      const valor = String(valorCentavos);
      if (anterior !== valor) {
        await tx
          .insert(parametros)
          .values({ chave: VALOR, valor, alteradoPor: autorId })
          .onConflictDoUpdate({
            target: parametros.chave,
            set: { valor, alteradoPor: autorId, alteradoEm: sql`now()` },
          });
        await tx.insert(alteracoesParametro).values({
          chave: VALOR,
          valorAnterior: anterior,
          valorNovo: valor,
          alteradoPor: autorId,
        });
        await this.auditoria.registrar(
          {
            usuarioId: autorId,
            operacao: 'alterar_valor_contribuicao',
            entidade: 'parametros',
            entidadeId: VALOR,
            dadosAnteriores: { valorCentavos: Number(anterior) },
            dadosNovos: { valorCentavos },
          },
          tx,
        );
      }
      return this.valor(tx);
    });
  }

  private async caso(
    banco: Leitor,
    casoId: string,
    travar = false,
  ): Promise<CasoDoPagamento> {
    const consulta = banco
      .select({
        id: casos.id,
        ciclo: casos.cicloAtendimento,
        entradaNaFilaEm: casos.entradaNaFilaEm,
      })
      .from(casos)
      .where(eq(casos.id, casoId));
    const [caso] = travar ? await consulta.for('update') : await consulta;
    if (!caso) throw new NotFoundException('Caso não encontrado.');
    return caso;
  }

  // O prazo conta do primeiro vínculo criado depois da última entrada do caso na
  // fila (RF7): a transferência (RF25) cria outro vínculo, mas não muda a entrada
  // na fila e não reinicia o prazo; a volta à fila (RF43) muda, e o prazo
  // recomeça no vínculo seguinte.
  private async primeiroVinculo(banco: Leitor, caso: CasoDoPagamento) {
    const [vinculo] = await banco
      .select({ vinculadoEm: vinculosEstagiario.vinculadoEm })
      .from(vinculosEstagiario)
      .where(
        and(
          eq(vinculosEstagiario.casoId, caso.id),
          gte(vinculosEstagiario.vinculadoEm, caso.entradaNaFilaEm),
        ),
      )
      .orderBy(asc(vinculosEstagiario.vinculadoEm))
      .limit(1);
    return vinculo?.vinculadoEm ?? null;
  }

  // Versões do ciclo atual do caso, da vigente (maior número) para a mais antiga.
  private async versoes(
    banco: Leitor,
    caso: CasoDoPagamento,
  ): Promise<VersaoContribuicao[]> {
    const linhas = await this.linhasDoPagamento(
      banco,
      and(
        eq(pagamentosContribuicao.casoId, caso.id),
        eq(pagamentosContribuicao.cicloAtendimento, caso.ciclo),
      ),
    );
    return linhas.map((l) => l.versao);
  }

  // Pagamentos dos ciclos anteriores do caso, só para consulta (RNF36), do ciclo
  // mais recente para o mais antigo, cada um com a versão vigente e as
  // anteriores. Sem corte por data: tudo o que foi registrado continua aqui.
  private async ciclosAnteriores(
    banco: Leitor,
    caso: CasoDoPagamento,
  ): Promise<CicloAnteriorContribuicao[]> {
    const linhas = await this.linhasDoPagamento(
      banco,
      and(
        eq(pagamentosContribuicao.casoId, caso.id),
        lt(pagamentosContribuicao.cicloAtendimento, caso.ciclo),
      ),
    );
    const ciclos: CicloAnteriorContribuicao[] = [];
    for (const { ciclo, versao } of linhas) {
      const atual = ciclos.at(-1);
      if (atual?.cicloAtendimento === ciclo) atual.anteriores.push(versao);
      else
        ciclos.push({
          cicloAtendimento: ciclo,
          vigente: versao,
          anteriores: [],
        });
    }
    return ciclos;
  }

  // Versões do pagamento com o ciclo, do ciclo mais recente para o mais antigo e,
  // em cada ciclo, da vigente (maior número) para a mais antiga.
  private async linhasDoPagamento(
    banco: Leitor,
    filtro: SQL | undefined,
  ): Promise<{ ciclo: number; versao: VersaoContribuicao }[]> {
    const linhas = await banco
      .select({
        ciclo: pagamentosContribuicao.cicloAtendimento,
        versao: pagamentosContribuicao.versao,
        valorCentavos: pagamentosContribuicao.valorCentavos,
        pagoEm: pagamentosContribuicao.pagoEm,
        forma: pagamentosContribuicao.forma,
        motivoCorrecao: pagamentosContribuicao.motivoCorrecao,
        registradoPor: usuarios.nome,
        registradoEm: pagamentosContribuicao.registradoEm,
      })
      .from(pagamentosContribuicao)
      .innerJoin(
        usuarios,
        eq(usuarios.id, pagamentosContribuicao.registradoPor),
      )
      .where(filtro)
      .orderBy(
        desc(pagamentosContribuicao.cicloAtendimento),
        desc(pagamentosContribuicao.versao),
      );
    return linhas.map(({ ciclo, ...l }) => ({
      ciclo,
      versao: { ...l, registradoEm: l.registradoEm.toISOString() },
    }));
  }

  private async montarSituacao(
    banco: Leitor,
    caso: CasoDoPagamento,
  ): Promise<SituacaoContribuicao> {
    const [vinculadoEm, versoes, ciclosAnteriores, valorAtualCentavos] =
      await Promise.all([
        this.primeiroVinculo(banco, caso),
        this.versoes(banco, caso),
        this.ciclosAnteriores(banco, caso),
        numeroDoParametro(banco, VALOR),
      ]);
    const [vigente = null, ...anteriores] = versoes;
    return {
      casoId: caso.id,
      cicloAtendimento: caso.ciclo,
      situacao: vigente ? 'efetivada' : 'pendente',
      prazo: vinculadoEm
        ? {
            vinculadoEm: vinculadoEm.toISOString(),
            ate: prazoDaContribuicao(vinculadoEm),
          }
        : null,
      valorAtualCentavos,
      vigente,
      anteriores,
      ciclosAnteriores,
    };
  }

  // 409 com a data do pagamento vigente, para a tela mostrar no aviso.
  private jaPago(pagoEm: string | undefined): never {
    throw new ConflictException({
      statusCode: 409,
      codigo: 'ja_pago',
      message: JA_PAGO,
      pagoEm: pagoEm ?? null,
    });
  }

  // 409 com a versão atual, quando outra pessoa corrigiu antes.
  private desatualizada(versaoAtual: number): never {
    throw new ConflictException({
      statusCode: 409,
      codigo: 'versao_desatualizada',
      message: `O pagamento foi corrigido por outra pessoa agora e está na versão ${versaoAtual}. Confira a versão atual antes de corrigir de novo.`,
      versaoAtual,
    });
  }
}
