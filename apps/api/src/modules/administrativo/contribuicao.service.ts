import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, asc, desc, eq, gte, sql } from 'drizzle-orm';
import {
  alteracoesParametro,
  casos,
  pagamentosContribuicao,
  parametros,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import {
  PARAMETROS_PADRAO,
  prazoDaContribuicao,
  type CorrecaoContribuicao,
  type RegistroContribuicao,
  type SituacaoContribuicao,
  type ValorContribuicao,
  type VersaoContribuicao,
} from '@clinica/shared';
import {
  AuditoriaService,
  type Transacao,
} from '../../auditoria/auditoria.service';
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
        const valorCentavos = await numeroDoParametro(tx, VALOR);
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
      throw new ConflictException(
        'O pagamento foi corrigido por outra pessoa agora. Confira a versão atual antes de corrigir de novo.',
      );
    }
  }

  async valor(banco: Leitor = this.db): Promise<ValorContribuicao> {
    const [ultima] = await banco
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
      )
      .limit(1);
    return {
      valorCentavos: await numeroDoParametro(banco, VALOR),
      ultimaAlteracao: ultima
        ? { ...ultima, em: ultima.em.toISOString() }
        : null,
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
    const linhas = await banco
      .select({
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
      .where(
        and(
          eq(pagamentosContribuicao.casoId, caso.id),
          eq(pagamentosContribuicao.cicloAtendimento, caso.ciclo),
        ),
      )
      .orderBy(desc(pagamentosContribuicao.versao));
    return linhas.map((l) => ({
      ...l,
      registradoEm: l.registradoEm.toISOString(),
    }));
  }

  private async montarSituacao(
    banco: Leitor,
    caso: CasoDoPagamento,
  ): Promise<SituacaoContribuicao> {
    const [vinculadoEm, versoes, valorAtualCentavos] = await Promise.all([
      this.primeiroVinculo(banco, caso),
      this.versoes(banco, caso),
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
    };
  }

  // 409 com a data do pagamento vigente, para a tela mostrar no aviso.
  private jaPago(pagoEm: string | undefined): never {
    throw new ConflictException({
      statusCode: 409,
      message: JA_PAGO,
      pagoEm: pagoEm ?? null,
    });
  }
}
