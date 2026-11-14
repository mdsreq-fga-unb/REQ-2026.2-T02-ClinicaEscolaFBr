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
  eq,
  gt,
  asc,
  desc,
  inArray,
  isNull,
  lte,
} from 'drizzle-orm';
import {
  atribuicoesSupervisor,
  cancelamentosSessao,
  casos,
  inscricoes,
  prontuarios,
  sessoesAtendimento,
  evolucoes,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import { cifrar, decifrar } from '../../common/criptografia';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import {
  LIMITE_FALTAS_CICLO,
  SECOES_ANAMNESE,
  SESSOES_POR_FECHAMENTO_AVALIATIVO,
  STATUS_SESSAO_EM_ABERTO,
  type Anamnese,
  type CancelamentoDaSessao,
  type ClassificacaoCancelamento,
  type Contrato,
  type Evolucao,
  type OrigemCancelamento,
} from '@clinica/shared';
import { DB } from '../../database/database.module';
import { acoesDeCancelamento } from '../agendamento/acoes-cancelamento';
import { DesligamentosService } from '../assiduidade/desligamentos.service';
import { FaltasService } from '../assiduidade/faltas.service';
import { PoliticaProntuario } from './politica-prontuario';

const estagiario = aliasedTable(usuarios, 'estagiario');

// O que as listas mostram do cancelamento (RF15, RF16): a classificação e a origem,
// sem a justificativa (RNF51).
const colunasDoCancelamento = {
  classificacaoCancelamento: cancelamentosSessao.classificacao,
  origemCancelamento: cancelamentosSessao.origem,
};
const cancelamentoDaSessao = (
  classificacao: ClassificacaoCancelamento | null,
  origem: OrigemCancelamento | null,
): CancelamentoDaSessao | null =>
  classificacao && origem ? { classificacao, origem } : null;
const supervisor = aliasedTable(usuarios, 'supervisor');

// A anamnese fica num JSON cifrado com as seis seções (DF37). O registro antigo, de
// texto único, aparece como a queixa principal, e as outras seções como não informadas.
function anamneseDoTexto(texto: string): Anamnese {
  const vazia = Object.fromEntries(
    SECOES_ANAMNESE.map(([secao]) => [secao, null]),
  ) as Record<keyof Anamnese, string | null>;
  try {
    const dados: unknown = JSON.parse(texto);
    if (
      dados &&
      typeof dados === 'object' &&
      typeof (dados as Anamnese).queixaPrincipal === 'string'
    )
      return { ...vazia, ...(dados as Anamnese) };
  } catch {
    // Texto livre do registro antigo.
  }
  return { ...vazia, queixaPrincipal: texto };
}

// O fechamento avaliativo vem a cada 10 sessões realizadas no ciclo (RF28, DF23).
const fechamentoAvaliativo = (numeroNoCiclo: number) =>
  numeroNoCiclo > 0 && numeroNoCiclo % SESSOES_POR_FECHAMENTO_AVALIATIVO === 0;

@Injectable()
export class ProntuariosService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly politica: PoliticaProntuario,
    private readonly config: ConfigService,
    private readonly auditoria: AuditoriaService,
    private readonly faltas: FaltasService,
    private readonly desligamentos: DesligamentosService,
  ) {}

  // Prontuário com o conteúdo clínico, para o estagiário e o supervisor do caso e,
  // em qualquer caso, para a coordenação (RF55, DF32).
  async consultar(id: string, usuario: UsuarioAutenticado) {
    const prontuario = await this.politica.exigirAcesso(
      usuario,
      id,
      'consultar_prontuario',
      'leitura',
    );
    const caso = await this.resumoDoCaso(prontuario.casoId);
    const chave = this.config.getOrThrow<string>('CHAVE_DADOS');
    const abrir = (valor: string | null) =>
      valor ? decifrar(valor, chave) : null;
    // Registros antigos têm só o autor dos dados iniciais, que vale para as duas partes.
    const anamnesePor = prontuario.anamnesePor ?? prontuario.dadosIniciaisPor;
    const contratoPor = prontuario.contratoPor ?? prontuario.dadosIniciaisPor;
    const autores = new Map(
      (
        await this.db
          .select({ id: usuarios.id, nome: usuarios.nome })
          .from(usuarios)
          .where(
            inArray(
              usuarios.id,
              [anamnesePor, contratoPor].filter((id): id is string => !!id),
            ),
          )
      ).map((autor) => [autor.id, autor.nome]),
    );
    const temContrato =
      !!prontuario.dataAssinaturaContrato || !!prontuario.contratoCifrado;
    // A queixa da inscrição preenche a anamnese (RF69, RF1). Vai só para o estagiário
    // responsável, que passou pela política acima, e só enquanto a anamnese não existe:
    // as outras respostas da triagem (RF4) não entram.
    const queixaDaInscricao =
      usuario.perfil === 'estagiario' && !prontuario.anamneseCifrada
        ? await this.queixaDaInscricao(prontuario.casoId)
        : null;
    const [historicoEstagiarios, historicoSupervisores] = await Promise.all([
      this.db
        .select({
          nome: estagiario.nome,
          desde: vinculosEstagiario.vinculadoEm,
          vigente: vinculosEstagiario.vigente,
        })
        .from(vinculosEstagiario)
        .innerJoin(
          estagiario,
          eq(estagiario.id, vinculosEstagiario.estagiarioId),
        )
        .where(eq(vinculosEstagiario.casoId, prontuario.casoId))
        .orderBy(asc(vinculosEstagiario.vinculadoEm)),
      this.db
        .select({
          nome: supervisor.nome,
          desde: atribuicoesSupervisor.atribuidoEm,
          vigente: atribuicoesSupervisor.vigente,
        })
        .from(atribuicoesSupervisor)
        .innerJoin(
          supervisor,
          eq(supervisor.id, atribuicoesSupervisor.supervisorId),
        )
        .where(eq(atribuicoesSupervisor.casoId, prontuario.casoId))
        .orderBy(asc(atribuicoesSupervisor.atribuidoEm)),
    ]);
    const sessoes = await this.db
      .select({
        id: sessoesAtendimento.id,
        inicio: sessoesAtendimento.inicio,
        termino: sessoesAtendimento.termino,
        estagiarioId: sessoesAtendimento.estagiarioId,
        estagiario: estagiario.nome,
        status: sessoesAtendimento.status,
        ...colunasDoCancelamento,
      })
      .from(sessoesAtendimento)
      .innerJoin(estagiario, eq(estagiario.id, sessoesAtendimento.estagiarioId))
      .leftJoin(
        cancelamentosSessao,
        eq(cancelamentosSessao.sessaoId, sessoesAtendimento.id),
      )
      .where(
        and(
          eq(sessoesAtendimento.casoId, prontuario.casoId),
          eq(sessoesAtendimento.cicloAtendimento, prontuario.cicloAtendimento),
        ),
      )
      .orderBy(asc(sessoesAtendimento.inicio));
    const evolucoesRows = await this.db
      .select({
        id: evolucoes.id,
        sessaoId: evolucoes.sessaoId,
        queixa: evolucoes.queixaCifrada,
        planejamento: evolucoes.planejamentoCifrado,
        humorAparencia: evolucoes.humorAparenciaCifrado,
        conteudoTrabalhado: evolucoes.conteudoTrabalhadoCifrado,
        tecnicasUtilizadas: evolucoes.tecnicasUtilizadasCifrado,
        intervencoesEncaminhamentos:
          evolucoes.intervencoesEncaminhamentosCifrado,
        planoProximaSessao: evolucoes.planoProximaSessaoCifrado,
        registradaPor: evolucoes.registradaPor,
        registradaEm: evolucoes.registradaEm,
        autor: usuarios.nome,
      })
      .from(evolucoes)
      .innerJoin(usuarios, eq(usuarios.id, evolucoes.registradaPor))
      .where(eq(evolucoes.prontuarioId, id))
      .orderBy(asc(evolucoes.registradaEm));
    // Quem abre o prontuário pode justificar a falta ou é a coordenação: vê o motivo.
    const faltasDoCiclo = await this.faltas.doCiclo(
      prontuario.casoId,
      prontuario.cicloAtendimento,
      true,
    );
    // Número de cada sessão realizada no ciclo, na ordem em que aconteceram (RF28).
    const numeroNoCiclo = new Map(
      sessoes
        .filter((sessao) => sessao.status === 'realizada')
        .map((sessao, indice) => [sessao.id, indice + 1]),
    );
    const sessoesRealizadas = numeroNoCiclo.size;
    const [canceladas, sessoesAReagendar] = await Promise.all([
      this.desligamentos.canceladasPorDesligamento(prontuario.casoId),
      this.desligamentos.sessoesAReagendar(prontuario.casoId),
    ]);
    return {
      id: prontuario.id,
      cicloAtendimento: prontuario.cicloAtendimento,
      criadoEm: prontuario.criadoEm,
      ...caso,
      dadosIniciais: {
        anamnese: prontuario.anamneseCifrada
          ? {
              ...anamneseDoTexto(decifrar(prontuario.anamneseCifrada, chave)),
              registradaEm: prontuario.anamneseEm ?? prontuario.dadosIniciaisEm,
              registradaPor: anamnesePor
                ? (autores.get(anamnesePor) ?? null)
                : null,
            }
          : null,
        contrato: temContrato
          ? {
              // Texto livre só nos registros anteriores à DF41.
              textoLivre: abrir(prontuario.contratoCifrado),
              dataAssinatura: prontuario.dataAssinaturaContrato,
              aceiteTclePesquisa: prontuario.aceiteTclePesquisa,
              viaGuardada: prontuario.viaContratoGuardada,
              registradoEm: prontuario.contratoEm ?? prontuario.dadosIniciaisEm,
              registradoPor: contratoPor
                ? (autores.get(contratoPor) ?? null)
                : null,
            }
          : null,
        queixaDaInscricao,
      },
      historicoResponsaveis: {
        estagiarios: historicoEstagiarios,
        supervisores: historicoSupervisores,
      },
      // A contagem é a do ciclo deste prontuário, o mesmo das sessões listadas.
      faltasNoCiclo: await this.faltas.contar(
        prontuario.casoId,
        undefined,
        prontuario.cicloAtendimento,
      ),
      // Os botões de falta seguem a regra da API (vínculo e atribuição vigentes),
      // e não o estagiário de cada sessão.
      acoesFalta: await this.faltas.acoesPermitidas(prontuario.casoId, usuario),
      // O cancelamento segue a mesma ideia (RF15, RF16).
      acoesCancelamento: await acoesDeCancelamento(
        this.db,
        prontuario.casoId,
        usuario,
      ),
      // Sessões canceladas pelo desligamento que ficaram para reagendar (RF38).
      sessoesAReagendar,
      sessoes: sessoes.map(
        ({ classificacaoCancelamento, origemCancelamento, ...sessao }) => ({
          ...sessao,
          cancelamento: cancelamentoDaSessao(
            classificacaoCancelamento,
            origemCancelamento,
          ),
          falta: faltasDoCiclo.get(sessao.id) ?? null,
          canceladaPorDesligamento: canceladas.has(sessao.id),
          numeroNoCiclo: numeroNoCiclo.get(sessao.id) ?? null,
          evolucao: (() => {
            const evolucao = evolucoesRows.find(
              (e) => e.sessaoId === sessao.id,
            );
            if (!evolucao) return null;
            return {
              id: evolucao.id,
              humorAparencia: abrir(evolucao.humorAparencia),
              conteudoTrabalhado: abrir(evolucao.conteudoTrabalhado),
              tecnicasUtilizadas: abrir(evolucao.tecnicasUtilizadas),
              intervencoesEncaminhamentos: abrir(
                evolucao.intervencoesEncaminhamentos,
              ),
              planoProximaSessao: abrir(evolucao.planoProximaSessao),
              // Evoluções anteriores à DF38, com os rótulos antigos.
              queixa: abrir(evolucao.queixa),
              planejamento: abrir(evolucao.planejamento),
              registradaPor: evolucao.autor,
              registradaEm: evolucao.registradaEm,
            };
          })(),
        }),
      ),
      sessoesRealizadas,
      fechamentoAvaliativoPendente: fechamentoAvaliativo(sessoesRealizadas),
      alta: null,
      relatorioFinal: null,
    };
  }

  // Provisório: nenhum RF define ainda quem marca a sessão como realizada. Até o
  // registro de presença do Ciclo 4 (RF14 e RF34), o estagiário responsável marca,
  // depois do término, para poder registrar a evolução (RF28).
  async marcarSessaoRealizada(
    id: string,
    sessaoId: string,
    usuario: UsuarioAutenticado,
  ) {
    const prontuario = await this.politica.exigirAcesso(
      usuario,
      id,
      'marcar_sessao_realizada',
      'registro_estagiario',
    );
    return this.db.transaction(async (tx) => {
      const [sessao] = await tx
        .select()
        .from(sessoesAtendimento)
        .where(
          and(
            eq(sessoesAtendimento.id, sessaoId),
            eq(sessoesAtendimento.casoId, prontuario.casoId),
            eq(
              sessoesAtendimento.cicloAtendimento,
              prontuario.cicloAtendimento,
            ),
            eq(sessoesAtendimento.estagiarioId, usuario.id),
          ),
        )
        .for('update');
      if (!sessao) throw new NotFoundException('Sessão não encontrada.');
      if (sessao.termino.getTime() > Date.now())
        throw new ConflictException('A sessão ainda não terminou.');
      if (sessao.status === 'realizada') return { realizada: true };
      const [atualizada] = await tx
        .update(sessoesAtendimento)
        .set({ status: 'realizada' })
        .where(
          and(
            eq(sessoesAtendimento.id, sessaoId),
            inArray(sessoesAtendimento.status, STATUS_SESSAO_EM_ABERTO),
          ),
        )
        .returning({ id: sessoesAtendimento.id });
      if (!atualizada)
        throw new ConflictException(
          'A sessão não pode ser marcada como realizada.',
        );
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          operacao: 'marcar_sessao_realizada',
          entidade: 'sessoes_atendimento',
          entidadeId: sessaoId,
        },
        tx,
      );
      return { realizada: true };
    });
  }

  // Evolução da sessão realizada, na ficha da DF38 (RF28). Sessão de outro paciente ou
  // de outro estagiário, ou estagiário sem vínculo vigente: 403; sessão ainda não
  // realizada: 422; segunda evolução da mesma sessão: 409.
  async registrarEvolucao(
    id: string,
    sessaoId: string,
    dados: Evolucao,
    usuario: UsuarioAutenticado,
  ) {
    const prontuario = await this.politica.exigirAcesso(
      usuario,
      id,
      'registrar_evolucao',
      'registro_estagiario',
    );
    const chave = this.config.getOrThrow<string>('CHAVE_DADOS');
    const cifrarOpcional = (texto: string | null) =>
      texto ? cifrar(texto, chave) : null;
    return this.db.transaction(async (tx) => {
      // O vínculo é conferido de novo dentro da transação, travado, para uma
      // transferência no meio não deixar passar o registro.
      const [vinculo] = await tx
        .select({ id: vinculosEstagiario.id })
        .from(vinculosEstagiario)
        .where(
          and(
            eq(vinculosEstagiario.casoId, prontuario.casoId),
            eq(vinculosEstagiario.estagiarioId, usuario.id),
            eq(vinculosEstagiario.vigente, true),
          ),
        )
        .for('update');
      const [sessao] = await tx
        .select()
        .from(sessoesAtendimento)
        .where(
          and(
            eq(sessoesAtendimento.id, sessaoId),
            eq(sessoesAtendimento.casoId, prontuario.casoId),
            eq(
              sessoesAtendimento.cicloAtendimento,
              prontuario.cicloAtendimento,
            ),
          ),
        )
        .for('update');
      if (!vinculo || !sessao || sessao.estagiarioId !== usuario.id)
        throw new ForbiddenException(
          'Você não pode registrar evolução nesta sessão.',
        );
      if (sessao.status !== 'realizada')
        throw new UnprocessableEntityException(
          'Só a sessão realizada aceita o registro de evolução.',
        );
      const [registro] = await tx
        .insert(evolucoes)
        .values({
          prontuarioId: id,
          sessaoId,
          humorAparenciaCifrado: cifrar(dados.humorAparencia, chave),
          conteudoTrabalhadoCifrado: cifrar(dados.conteudoTrabalhado, chave),
          tecnicasUtilizadasCifrado: cifrar(dados.tecnicasUtilizadas, chave),
          intervencoesEncaminhamentosCifrado: cifrarOpcional(
            dados.intervencoesEncaminhamentos,
          ),
          planoProximaSessaoCifrado: cifrar(dados.planoProximaSessao, chave),
          registradaPor: usuario.id,
        })
        .onConflictDoNothing()
        .returning({ id: evolucoes.id });
      if (!registro)
        throw new ConflictException('A sessão já tem uma evolução original.');
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          operacao: 'registrar_evolucao_sessao',
          entidade: 'evolucoes',
          entidadeId: registro.id,
        },
        tx,
      );
      // O aviso vem pelo número desta sessão entre as realizadas do ciclo, e não pelo
      // total no momento do registro: não se repete nas evoluções seguintes.
      const anteriores = await tx
        .select({ id: sessoesAtendimento.id })
        .from(sessoesAtendimento)
        .where(
          and(
            eq(sessoesAtendimento.casoId, prontuario.casoId),
            eq(
              sessoesAtendimento.cicloAtendimento,
              prontuario.cicloAtendimento,
            ),
            eq(sessoesAtendimento.status, 'realizada'),
            lte(sessoesAtendimento.inicio, sessao.inicio),
          ),
        );
      const numeroNoCiclo = anteriores.length;
      return {
        id: registro.id,
        registrada: true,
        numeroNoCiclo,
        fechamentoAvaliativo: fechamentoAvaliativo(numeroNoCiclo),
      };
    });
  }

  // Anamnese nas seis seções da ficha da clínica (RF69, DF37), registrada uma vez.
  async registrarAnamnese(
    id: string,
    dados: Anamnese,
    usuario: UsuarioAutenticado,
  ) {
    await this.politica.exigirAcesso(
      usuario,
      id,
      'registrar_anamnese',
      'registro_estagiario',
    );
    const chave = this.config.getOrThrow<string>('CHAVE_DADOS');
    return this.db.transaction(async (tx) => {
      const [atualizado] = await tx
        .update(prontuarios)
        .set({
          anamneseCifrada: cifrar(JSON.stringify(dados), chave),
          anamnesePor: usuario.id,
          anamneseEm: new Date(),
        })
        .where(and(eq(prontuarios.id, id), isNull(prontuarios.anamneseCifrada)))
        .returning({ id: prontuarios.id });
      if (!atualizado)
        throw new ConflictException('A anamnese já foi registrada.');
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          operacao: 'registrar_anamnese_prontuario',
          entidade: 'prontuarios',
          entidadeId: id,
          dadosNovos: { autorId: usuario.id },
        },
        tx,
      );
      return { registrada: true };
    });
  }

  // Contrato da Clínica Escola, assinado em papel (RF69, DF41), registrado uma vez.
  async registrarContrato(
    id: string,
    dados: Contrato,
    usuario: UsuarioAutenticado,
  ) {
    await this.politica.exigirAcesso(
      usuario,
      id,
      'registrar_contrato',
      'registro_estagiario',
    );
    return this.db.transaction(async (tx) => {
      const [atualizado] = await tx
        .update(prontuarios)
        .set({
          dataAssinaturaContrato: dados.dataAssinaturaContrato,
          aceiteTclePesquisa: dados.aceiteTclePesquisa,
          viaContratoGuardada: dados.viaContratoGuardada,
          contratoPor: usuario.id,
          contratoEm: new Date(),
        })
        .where(
          and(
            eq(prontuarios.id, id),
            isNull(prontuarios.dataAssinaturaContrato),
            isNull(prontuarios.contratoCifrado),
          ),
        )
        .returning({ id: prontuarios.id });
      if (!atualizado)
        throw new ConflictException(
          'O contrato terapêutico já foi registrado.',
        );
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          operacao: 'registrar_contrato_prontuario',
          entidade: 'prontuarios',
          entidadeId: id,
          dadosNovos: { autorId: usuario.id },
        },
        tx,
      );
      return { registrado: true };
    });
  }

  private async queixaDaInscricao(casoId: string) {
    const [linha] = await this.db
      .select({ queixa: inscricoes.queixaCifrada })
      .from(casos)
      .innerJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
      .where(eq(casos.id, casoId));
    return linha?.queixa
      ? decifrar(linha.queixa, this.config.getOrThrow<string>('CHAVE_DADOS'))
      : null;
  }

  // Dados cadastrais e administrativos, sem conteúdo clínico, para a secretaria e a
  // coordenação (RF55). Faltas e contribuição social entram com o RF34 e o RF41.
  // Só a coordenação recebe o id do prontuário, para abri-lo; para a secretaria, nem a
  // existência do prontuário é revelada (RNF25).
  async dadosAdministrativos(casoId: string, usuario: UsuarioAutenticado) {
    const caso = await this.resumoDoCaso(casoId);
    const [linha] = await this.db
      .select({
        celular: inscricoes.celular,
        email: inscricoes.email,
        canalPreferencial: inscricoes.canalPreferencial,
        responsavelLegal: inscricoes.responsavelLegal,
      })
      .from(casos)
      .innerJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
      .where(eq(casos.id, casoId));
    const [proxima] = await this.db
      .select({ inicio: sessoesAtendimento.inicio })
      .from(sessoesAtendimento)
      .where(
        and(
          eq(sessoesAtendimento.casoId, casoId),
          inArray(sessoesAtendimento.status, STATUS_SESSAO_EM_ABERTO),
          gt(sessoesAtendimento.inicio, new Date()),
        ),
      )
      .orderBy(asc(sessoesAtendimento.inicio))
      .limit(1);
    // Sessões do ciclo com as faltas (RF34, RF35): a secretaria registra e justifica a
    // falta por aqui. Nenhum conteúdo clínico entra na resposta (RF55).
    const [{ ciclo }] = await this.db
      .select({ ciclo: casos.cicloAtendimento })
      .from(casos)
      .where(eq(casos.id, casoId));
    const sessoes = await this.db
      .select({
        id: sessoesAtendimento.id,
        inicio: sessoesAtendimento.inicio,
        termino: sessoesAtendimento.termino,
        estagiario: estagiario.nome,
        status: sessoesAtendimento.status,
        ...colunasDoCancelamento,
      })
      .from(sessoesAtendimento)
      .innerJoin(estagiario, eq(estagiario.id, sessoesAtendimento.estagiarioId))
      .leftJoin(
        cancelamentosSessao,
        eq(cancelamentosSessao.sessaoId, sessoesAtendimento.id),
      )
      .where(
        and(
          eq(sessoesAtendimento.casoId, casoId),
          eq(sessoesAtendimento.cicloAtendimento, ciclo),
        ),
      )
      .orderBy(asc(sessoesAtendimento.inicio));
    const coordenacao = usuario.perfil === 'coordenacao';
    const [
      faltasDoCiclo,
      faltasNoCiclo,
      desligamentos,
      canceladas,
      sessoesAReagendar,
      vinculos,
    ] = await Promise.all([
      this.faltas.doCiclo(casoId, ciclo, true),
      this.faltas.contar(casoId, undefined, ciclo),
      // O motivo da reversão só vai para a coordenação, que reverte (RF38).
      this.desligamentos.doCiclo(casoId, ciclo, coordenacao),
      this.desligamentos.canceladasPorDesligamento(casoId),
      this.desligamentos.sessoesAReagendar(casoId),
      // Vínculos do caso, do mais antigo ao mais recente: o primeiro marca o início
      // do ciclo; o último dá o estagiário do caso desligado (RF37).
      this.db
        .select({
          nome: estagiario.nome,
          vinculadoEm: vinculosEstagiario.vinculadoEm,
        })
        .from(vinculosEstagiario)
        .innerJoin(
          estagiario,
          eq(estagiario.id, vinculosEstagiario.estagiarioId),
        )
        .where(eq(vinculosEstagiario.casoId, casoId))
        .orderBy(asc(vinculosEstagiario.vinculadoEm)),
    ]);
    const vigente = desligamentos.find((d) => d.revertidoEm === null);
    const dados = {
      ...caso,
      ...linha,
      proximaSessao: proxima?.inicio ?? null,
      cicloAtendimento: ciclo,
      faltasNoCiclo,
      cicloDesde: vinculos[0]?.vinculadoEm ?? null,
      ultimoEstagiario: vinculos.at(-1)?.nome ?? null,
      // Desligamento por faltas só com o alerta pendente (RF36, RF37), pela
      // secretaria ou pela coordenação.
      podeDesligar:
        (usuario.perfil === 'secretaria' || coordenacao) &&
        caso.situacao === 'em_atendimento' &&
        faltasNoCiclo.faltas >= LIMITE_FALTAS_CICLO,
      desligamentos,
      // Para o diálogo da reversão (RF38): a vaga ainda livre devolve o paciente ao
      // mesmo estagiário.
      vagaDoDesligamento:
        coordenacao && vigente
          ? await this.desligamentos.vagaDoDesligamento(vigente.id)
          : null,
      sessoesAReagendar,
      // A secretaria cancela por aqui (RF15, RF16).
      acoesCancelamento: await acoesDeCancelamento(this.db, casoId, usuario),
      sessoes: sessoes.map(
        ({ classificacaoCancelamento, origemCancelamento, ...sessao }) => ({
          ...sessao,
          cancelamento: cancelamentoDaSessao(
            classificacaoCancelamento,
            origemCancelamento,
          ),
          falta: faltasDoCiclo.get(sessao.id) ?? null,
          canceladaPorDesligamento: canceladas.has(sessao.id),
        }),
      ),
    };
    if (usuario.perfil !== 'coordenacao') return dados;
    const [prontuario] = await this.db
      .select({ id: prontuarios.id })
      .from(prontuarios)
      .where(eq(prontuarios.casoId, casoId))
      .orderBy(desc(prontuarios.cicloAtendimento))
      .limit(1);
    return { ...dados, prontuarioId: prontuario?.id ?? null };
  }

  private async resumoDoCaso(casoId: string) {
    const [linha] = await this.db
      .select({
        casoId: casos.id,
        situacao: casos.situacao,
        numeroInscricao: inscricoes.numero,
        nome: inscricoes.nomeCompleto,
        dataNascimento: inscricoes.dataNascimento,
        estagiario: estagiario.nome,
        supervisor: supervisor.nome,
        vinculadoEm: vinculosEstagiario.vinculadoEm,
      })
      .from(casos)
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
      .where(eq(casos.id, casoId));
    if (!linha) throw new NotFoundException('Paciente não encontrado.');
    return linha;
  }
}
