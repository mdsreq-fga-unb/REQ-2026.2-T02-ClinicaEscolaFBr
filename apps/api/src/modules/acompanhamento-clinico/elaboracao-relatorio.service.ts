import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, asc, desc, eq } from 'drizzle-orm';
import {
  atribuicoesSupervisor,
  casos,
  evolucoes,
  relatoriosFinais,
  sessoesAtendimento,
  usuarios,
  versoesRelatorio,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import {
  decisaoRelatorioSchema,
  envioRelatorioSchema,
  foraDaFaixaDoRelatorio,
  hojeEmBrasilia,
  rascunhoRelatorioSchema,
  SECOES_RELATORIO,
  type ElaboracaoDoRelatorio,
  type RascunhoRelatorio,
  type SecoesRelatorio,
  type SessaoDoRelatorio,
} from '@clinica/shared';
import {
  AuditoriaService,
  type Transacao,
} from '../../auditoria/auditoria.service';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { cifrar, decifrar } from '../../common/criptografia';
import { DB } from '../../database/database.module';
import { PoliticaProntuario } from './politica-prontuario';
import {
  PRONTUARIO_INEXISTENTE,
  RelatoriosFinaisService,
} from './relatorios-finais.service';

type SessaoComEvolucao = SessaoDoRelatorio & { evolucaoId: string | null };

const secoesDe = (dados: RascunhoRelatorio): SecoesRelatorio =>
  Object.fromEntries(
    SECOES_RELATORIO.map(([secao]) => [secao, dados[secao]]),
  ) as SecoesRelatorio;

// Elaboração do relatório final pelo estagiário responsável, envio e decisão do
// supervisor do caso (RF33). As tabelas e as travas do banco são as da migration 0024.
@Injectable()
export class ElaboracaoRelatorioService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly relatorios: RelatoriosFinaisService,
    private readonly politica: PoliticaProntuario,
    private readonly config: ConfigService,
    private readonly auditoria: AuditoriaService,
  ) {}

  private chave() {
    return this.config.getOrThrow<string>('CHAVE_DADOS');
  }

  // Sessões realizadas do ciclo, numeradas na ordem, com a evolução de cada uma.
  private async sessoesDoCiclo(
    banco: Db | Transacao,
    casoId: string,
    ciclo: number,
  ): Promise<SessaoComEvolucao[]> {
    const linhas = await banco
      .select({
        id: sessoesAtendimento.id,
        inicio: sessoesAtendimento.inicio,
        evolucaoId: evolucoes.id,
      })
      .from(sessoesAtendimento)
      .leftJoin(evolucoes, eq(evolucoes.sessaoId, sessoesAtendimento.id))
      .where(
        and(
          eq(sessoesAtendimento.casoId, casoId),
          eq(sessoesAtendimento.cicloAtendimento, ciclo),
          eq(sessoesAtendimento.status, 'realizada'),
        ),
      )
      .orderBy(asc(sessoesAtendimento.inicio));
    return linhas.map((linha, indice) => ({
      id: linha.id,
      numero: indice + 1,
      data: hojeEmBrasilia(linha.inicio),
      temEvolucao: linha.evolucaoId !== null,
      evolucaoId: linha.evolucaoId,
    }));
  }

  // GET: o ciclo, as lacunas e o texto das versões, para o estagiário responsável, o
  // supervisor do caso e a coordenação (RF55). A secretaria não lê a elaboração. O
  // rascunho é só do estagiário.
  async consultar(
    casoId: string,
    ciclo: number | undefined,
    usuario: UsuarioAutenticado,
  ): Promise<ElaboracaoDoRelatorio> {
    const alvo = await this.relatorios.doCiclo(casoId, ciclo);
    const prontuario = await this.politica.exigirAcesso(
      usuario,
      alvo?.prontuarioId ?? PRONTUARIO_INEXISTENTE,
      'consultar_elaboracao_relatorio_final',
      'leitura',
    );
    const { caso, ciclo: cicloDoRelatorio } = alvo!;
    const [sessoes, linhas, responsaveis] = await Promise.all([
      this.sessoesDoCiclo(this.db, casoId, cicloDoRelatorio),
      this.relatorios.versoesDoProntuario(prontuario.id),
      this.responsaveis(casoId),
    ]);
    const chave = this.chave();
    const estagiario = usuario.perfil === 'estagiario';
    const semEvolucoes = !sessoes.some((s) => s.temEvolucao);
    const emRevisao = linhas.some((v) => v.estado === 'em_revisao');
    const aprovado = linhas.some((v) => v.estado === 'aprovado');
    return {
      casoId,
      prontuarioId: prontuario.id,
      ciclo: cicloDoRelatorio,
      paciente: caso.paciente,
      solicitante: caso.responsavelLegal,
      ...responsaveis,
      sessoes: sessoes.map(({ id, numero, data, temEvolucao }) => ({
        id,
        numero,
        data,
        temEvolucao,
      })),
      semEvolucoes,
      exigeJustificativa: foraDaFaixaDoRelatorio(sessoes.length),
      versoes: linhas
        .filter((v) => estagiario || v.estado !== 'rascunho')
        .map((v) => {
          const texto = JSON.parse(
            decifrar(v.secoesCifradas, chave),
          ) as Partial<SecoesRelatorio>;
          return {
            versao: v.versao,
            estado: v.estado,
            autor: v.autor ?? '',
            enviadaEm: v.enviadaEm?.toISOString() ?? null,
            secoes: Object.fromEntries(
              SECOES_RELATORIO.map(([secao]) => [secao, texto[secao] ?? '']),
            ) as SecoesRelatorio,
            justificativaExcecao: v.justificativaExcecaoCifrada
              ? decifrar(v.justificativaExcecaoCifrada, chave)
              : null,
            origem: v.origem,
            observacoes: v.observacoesCifradas
              ? decifrar(v.observacoesCifradas, chave)
              : null,
          };
        }),
      acoes: {
        elaborar: estagiario && !semEvolucoes && !emRevisao && !aprovado,
        decidir: usuario.perfil === 'supervisor' && emRevisao,
      },
    };
  }

  private async responsaveis(casoId: string) {
    const [[estagiario], [supervisor]] = await Promise.all([
      this.db
        .select({ nome: usuarios.nome })
        .from(vinculosEstagiario)
        .innerJoin(usuarios, eq(usuarios.id, vinculosEstagiario.estagiarioId))
        .where(
          and(
            eq(vinculosEstagiario.casoId, casoId),
            eq(vinculosEstagiario.vigente, true),
          ),
        ),
      this.db
        .select({ nome: usuarios.nome, crp: usuarios.crp })
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
      estagiario: estagiario?.nome ?? null,
      supervisor: supervisor ?? null,
    };
  }

  // PUT: grava o rascunho, com seções em branco ou não (RF33).
  salvarRascunho(
    casoId: string,
    ciclo: number | undefined,
    corpo: unknown,
    usuario: UsuarioAutenticado,
  ) {
    return this.gravar(casoId, ciclo, corpo, usuario, false);
  }

  // POST: fixa o texto enviado como versão em revisão, com as sessões e as evoluções
  // de origem, disponível ao supervisor do caso (RF33).
  enviar(
    casoId: string,
    ciclo: number | undefined,
    corpo: unknown,
    usuario: UsuarioAutenticado,
  ) {
    return this.gravar(casoId, ciclo, corpo, usuario, true);
  }

  // Só o estagiário com vínculo vigente: 403 para os demais, igual para caso
  // inexistente (RNF25). Campo em branco no envio, ou sem a justificativa fora da
  // faixa: 400 com o campo. Ciclo sem evoluções: 422. Em revisão ou aprovado: 409.
  private async gravar(
    casoId: string,
    ciclo: number | undefined,
    corpo: unknown,
    usuario: UsuarioAutenticado,
    envio: boolean,
  ) {
    const alvo = await this.relatorios.doCiclo(casoId, ciclo);
    const prontuario = await this.politica.exigirAcesso(
      usuario,
      alvo?.prontuarioId ?? PRONTUARIO_INEXISTENTE,
      envio ? 'enviar_relatorio_final' : 'salvar_rascunho_relatorio_final',
      'registro_estagiario',
      usuario.perfil === 'estagiario',
    );
    const resultado = (
      envio ? envioRelatorioSchema : rascunhoRelatorioSchema
    ).safeParse(corpo);
    if (!resultado.success)
      throw new BadRequestException(resultado.error.issues);
    const dados = resultado.data;
    const chave = this.chave();

    return this.db.transaction(async (tx) => {
      // O caso fica travado e o vínculo é conferido de novo, para uma transferência ou
      // um encerramento no meio não deixar passar o registro.
      await tx
        .select({ id: casos.id })
        .from(casos)
        .where(eq(casos.id, casoId))
        .for('update');
      const [vinculo] = await tx
        .select({ id: vinculosEstagiario.id })
        .from(vinculosEstagiario)
        .where(
          and(
            eq(vinculosEstagiario.casoId, casoId),
            eq(vinculosEstagiario.estagiarioId, usuario.id),
            eq(vinculosEstagiario.vigente, true),
          ),
        );
      if (!vinculo)
        throw new ForbiddenException('Você não tem acesso a este prontuário.');
      const sessoes = await this.sessoesDoCiclo(tx, casoId, alvo!.ciclo);
      if (!sessoes.some((s) => s.temEvolucao))
        throw new UnprocessableEntityException({
          message: `Não é possível gerar o relatório: o ciclo ${alvo!.ciclo} não tem evoluções registradas.`,
          semEvolucoes: true,
        });
      const foraDaFaixa = foraDaFaixaDoRelatorio(sessoes.length);
      if (envio && foraDaFaixa && !dados.justificativaExcecao)
        throw new BadRequestException([
          {
            path: ['justificativaExcecao'],
            message: 'Informe a justificativa.',
          },
        ]);

      await tx
        .insert(relatoriosFinais)
        .values({ prontuarioId: prontuario.id })
        .onConflictDoNothing();
      const [relatorio] = await tx
        .select({ id: relatoriosFinais.id })
        .from(relatoriosFinais)
        .where(eq(relatoriosFinais.prontuarioId, prontuario.id))
        .for('update');
      const versoes = await tx
        .select({
          id: versoesRelatorio.id,
          versao: versoesRelatorio.versao,
          estado: versoesRelatorio.estado,
        })
        .from(versoesRelatorio)
        .where(eq(versoesRelatorio.relatorioId, relatorio.id))
        .orderBy(desc(versoesRelatorio.versao));
      if (versoes.some((v) => v.estado === 'em_revisao'))
        throw new ConflictException(
          'O relatório está em revisão pelo supervisor.',
        );
      if (versoes.some((v) => v.estado === 'aprovado'))
        throw new ConflictException('O relatório deste ciclo já foi aprovado.');

      const agora = new Date();
      const valores = {
        secoesCifradas: cifrar(JSON.stringify(secoesDe(dados)), chave),
        // Dentro da faixa não há exceção a justificar.
        justificativaExcecaoCifrada:
          foraDaFaixa && dados.justificativaExcecao
            ? cifrar(dados.justificativaExcecao, chave)
            : null,
        // Depois de uma transferência, o rascunho passa a ser de quem o elabora.
        autorId: usuario.id,
        atualizadaEm: agora,
        ...(envio
          ? {
              estado: 'em_revisao' as const,
              enviadaEm: agora,
              origem: {
                sessoes: sessoes.map((s) => s.id),
                evolucoes: sessoes.flatMap((s) => s.evolucaoId ?? []),
              },
            }
          : {}),
      };
      const rascunho = versoes.find((v) => v.estado === 'rascunho');
      const [registro] = rascunho
        ? await tx
            .update(versoesRelatorio)
            .set(valores)
            .where(eq(versoesRelatorio.id, rascunho.id))
            .returning()
        : await tx
            .insert(versoesRelatorio)
            .values({
              ...valores,
              relatorioId: relatorio.id,
              versao: (versoes[0]?.versao ?? 0) + 1,
            })
            .returning();
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          operacao: envio
            ? 'enviar_relatorio_final'
            : 'salvar_rascunho_relatorio_final',
          entidade: 'versoes_relatorio',
          entidadeId: registro.id,
          dadosNovos: { versao: registro.versao, estado: registro.estado },
        },
        tx,
      );
      return {
        versao: registro.versao,
        estado: registro.estado,
        enviadaEm: registro.enviadaEm?.toISOString() ?? null,
      };
    });
  }

  // Decisão do supervisor do caso sobre a versão em revisão (RF33): a aprovação fixa a
  // versão; a devolução exige as observações e libera um rascunho novo. Os demais
  // recebem 403; versão que não está em revisão, 409.
  async decidir(
    casoId: string,
    ciclo: number | undefined,
    versao: number,
    corpo: unknown,
    usuario: UsuarioAutenticado,
  ) {
    const alvo = await this.relatorios.doCiclo(casoId, ciclo);
    const prontuario = await this.politica.exigirAcesso(
      usuario,
      alvo?.prontuarioId ?? PRONTUARIO_INEXISTENTE,
      'decidir_relatorio_final',
      'escrita',
      usuario.perfil === 'supervisor',
    );
    const resultado = decisaoRelatorioSchema.safeParse(corpo);
    if (!resultado.success)
      throw new BadRequestException(resultado.error.issues);
    const { decisao, observacoes } = resultado.data;
    const estado = decisao === 'aprovar' ? 'aprovado' : 'devolvido';

    return this.db.transaction(async (tx) => {
      const [relatorio] = await tx
        .select({ id: relatoriosFinais.id })
        .from(relatoriosFinais)
        .where(eq(relatoriosFinais.prontuarioId, prontuario.id))
        .for('update');
      const [registro] = relatorio
        ? await tx
            .update(versoesRelatorio)
            .set({
              estado,
              decididaPor: usuario.id,
              decididaEm: new Date(),
              observacoesCifradas: observacoes
                ? cifrar(observacoes, this.chave())
                : null,
            })
            .where(
              and(
                eq(versoesRelatorio.relatorioId, relatorio.id),
                eq(versoesRelatorio.versao, versao),
                eq(versoesRelatorio.estado, 'em_revisao'),
              ),
            )
            .returning()
        : [];
      if (!registro)
        throw new ConflictException('Esta versão não está em revisão.');
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          operacao:
            decisao === 'aprovar'
              ? 'aprovar_relatorio_final'
              : 'devolver_relatorio_final',
          entidade: 'versoes_relatorio',
          entidadeId: registro.id,
          dadosNovos: { versao: registro.versao, estado: registro.estado },
        },
        tx,
      );
      return {
        versao: registro.versao,
        estado: registro.estado,
        decisao: {
          por: usuario.nome,
          em: registro.decididaEm!.toISOString(),
          observacoes,
        },
      };
    });
  }
}
