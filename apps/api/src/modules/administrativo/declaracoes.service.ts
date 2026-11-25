import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  autorizacoesMenor,
  casos,
  emissoesDeclaracao,
  inscricoes,
  sessoesAtendimento,
  usuarios,
  type Db,
} from '@clinica/database';
import {
  hojeEmBrasilia,
  menorDeIdade,
  type AutorizacaoMenor,
  type CanalDeclaracao,
  type DeclaracaoComparecimento,
  type RecusaDeclaracao,
  type RegistroAutorizacaoMenor,
  type SessaoComPresenca,
  type StatusSessao,
} from '@clinica/shared';
import { and, desc, eq, type SQL } from 'drizzle-orm';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { DB } from '../../database/database.module';
import { dataBrasilia } from '../agendamento/horario';

export const SEM_PERMISSAO_DECLARACAO =
  'Você não pode emitir esta declaração. A declaração é emitida só para as sessões da própria inscrição, pelo paciente ou responsável com identidade confirmada, ou pela secretaria.';

// Motivo da sessão sem presença registrada (RF45), com a data da sessão.
function semPresenca(status: StatusSessao, inicio: Date): string {
  const data = dataBrasilia(inicio);
  const situacao =
    status === 'falta_paciente'
      ? `A sessão de ${data} foi registrada como falta.`
      : status === 'cancelada'
        ? `A sessão de ${data} foi cancelada.`
        : `A sessão de ${data} ainda não tem presença registrada.`;
  return `${situacao} A declaração de comparecimento só é emitida para sessão com presença registrada.`;
}

const recusa = (corpo: RecusaDeclaracao) =>
  new UnprocessableEntityException(corpo);

type Solicitante =
  | { canal: 'verificacao'; inscricaoId: string }
  | { canal: 'secretaria'; usuario: UsuarioAutenticado };

// Sessões com presença registrada (RF44) e a declaração de comparecimento
// (RF45). Só as sessões de status "realizada" entram, de todos os ciclos de
// atendimento, e nenhuma resposta tem dado clínico (RNF6).
@Injectable()
export class DeclaracoesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly auditoria: AuditoriaService,
  ) {}

  // Rota do paciente ou do responsável: só a inscrição liberada pela
  // verificação de identidade (RF52, RNF6). Sem caso, a lista é vazia.
  sessoesDaInscricao(inscricaoId: string): Promise<SessaoComPresenca[]> {
    return this.listar(eq(casos.inscricaoId, inscricaoId));
  }

  // Rota da secretaria, para a ficha do paciente.
  async sessoesDoCaso(casoId: string): Promise<SessaoComPresenca[]> {
    await this.buscarCaso(casoId);
    return this.listar(eq(casos.id, casoId));
  }

  // Emissão pelo paciente ou pelo responsável (RF45): só sessão da inscrição
  // verificada. Sessão de outra inscrição, ou que não existe, recebe o mesmo 403,
  // para a resposta não revelar se a sessão existe, e a tentativa é registrada
  // (RNF39).
  emitirPelaVerificacao(sessaoId: string, inscricaoId: string) {
    return this.emitir(sessaoId, { canal: 'verificacao', inscricaoId });
  }

  // Emissão pela equipe (RF45): só a secretaria. Os outros perfis recebem 403, e
  // a tentativa é registrada (RNF39) — por isso a rota não usa o PerfisGuard.
  async emitirPelaEquipe(sessaoId: string, usuario: UsuarioAutenticado) {
    if (usuario.perfil !== 'secretaria') {
      await this.registrarNegada(sessaoId, 'secretaria', usuario.id, null);
      throw new ForbiddenException(SEM_PERMISSAO_DECLARACAO);
    }
    return this.emitir(sessaoId, { canal: 'secretaria', usuario });
  }

  // Situação da autorização de menor na ficha do paciente (RF45).
  async autorizacaoDoCaso(casoId: string): Promise<AutorizacaoMenor> {
    const caso = await this.buscarCaso(casoId);
    return this.situacaoAutorizacao(caso.inscricaoId);
  }

  // Registro, pela secretaria, da entrega da autorização assinada (RF45). Uma por
  // inscrição: um novo registro corrige a data, e a auditoria guarda a anterior.
  async registrarAutorizacao(
    casoId: string,
    { entregueEm }: RegistroAutorizacaoMenor,
    usuario: UsuarioAutenticado,
  ): Promise<AutorizacaoMenor> {
    const caso = await this.buscarCaso(casoId);
    const [inscricao] = await this.db
      .select({ dataNascimento: inscricoes.dataNascimento })
      .from(inscricoes)
      .where(eq(inscricoes.id, caso.inscricaoId));
    if (!menorDeIdade(inscricao.dataNascimento)) {
      throw new ConflictException(
        'O paciente não é menor de idade, e a autorização não se aplica.',
      );
    }
    await this.db.transaction(async (tx) => {
      const [anterior] = await tx
        .select({ entregueEm: autorizacoesMenor.entregueEm })
        .from(autorizacoesMenor)
        .where(eq(autorizacoesMenor.inscricaoId, caso.inscricaoId))
        .for('update');
      if (anterior?.entregueEm === entregueEm) return;
      await tx
        .insert(autorizacoesMenor)
        .values({
          inscricaoId: caso.inscricaoId,
          entregueEm,
          registradoPor: usuario.id,
        })
        .onConflictDoUpdate({
          target: autorizacoesMenor.inscricaoId,
          set: {
            entregueEm,
            registradoPor: usuario.id,
            registradoEm: new Date(),
          },
        });
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          operacao: 'registrar_autorizacao_menor',
          entidade: 'inscricoes',
          entidadeId: caso.inscricaoId,
          dadosAnteriores: anterior
            ? { entregueEm: anterior.entregueEm }
            : null,
          dadosNovos: { entregueEm },
        },
        tx,
      );
    });
    return this.situacaoAutorizacao(caso.inscricaoId);
  }

  private async emitir(
    sessaoId: string,
    solicitante: Solicitante,
  ): Promise<DeclaracaoComparecimento> {
    const [sessao] = await this.db
      .select({
        id: sessoesAtendimento.id,
        inicio: sessoesAtendimento.inicio,
        termino: sessoesAtendimento.termino,
        status: sessoesAtendimento.status,
        inscricaoId: casos.inscricaoId,
        paciente: inscricoes.nomeCompleto,
        dataNascimento: inscricoes.dataNascimento,
      })
      .from(sessoesAtendimento)
      .innerJoin(casos, eq(casos.id, sessoesAtendimento.casoId))
      .innerJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
      .where(eq(sessoesAtendimento.id, sessaoId));

    if (
      solicitante.canal === 'verificacao' &&
      sessao?.inscricaoId !== solicitante.inscricaoId
    ) {
      await this.registrarNegada(
        sessaoId,
        'verificacao',
        null,
        solicitante.inscricaoId,
      );
      throw new ForbiddenException(SEM_PERMISSAO_DECLARACAO);
    }
    if (!sessao) throw new NotFoundException('Sessão não encontrada.');

    if (sessao.status !== 'realizada') {
      throw recusa({
        motivo: 'sem_presenca',
        message: semPresenca(sessao.status, sessao.inicio),
      });
    }

    // Menor de idade: a declaração sai só com a autorização registrada, pelo
    // responsável ou pela secretaria, que a entrega ao responsável.
    if (menorDeIdade(sessao.dataNascimento, hojeEmBrasilia())) {
      const [autorizacao] = await this.db
        .select({ id: autorizacoesMenor.id })
        .from(autorizacoesMenor)
        .where(eq(autorizacoesMenor.inscricaoId, sessao.inscricaoId));
      if (!autorizacao) {
        throw recusa({
          motivo: 'autorizacao_pendente',
          message:
            solicitante.canal === 'secretaria'
              ? 'A Autorização para Acompanhamento Psicoterapêutico de Crianças e Adolescentes ainda não foi registrada. Registre a entrega na ficha do paciente antes de emitir a declaração.'
              : 'A Autorização para Acompanhamento Psicoterapêutico de Crianças e Adolescentes ainda não foi registrada. Procure a secretaria da clínica.',
        });
      }
    }

    const emitidaPor =
      solicitante.canal === 'secretaria' ? solicitante.usuario.id : null;
    const emissao = await this.db.transaction(async (tx) => {
      const [emissao] = await tx
        .insert(emissoesDeclaracao)
        .values({
          sessaoId,
          inscricaoId: sessao.inscricaoId,
          canal: solicitante.canal,
          emitidaPor,
        })
        .returning();
      await this.auditoria.registrar(
        {
          usuarioId: emitidaPor,
          operacao: 'emitir_declaracao',
          entidade: 'emissoes_declaracao',
          entidadeId: emissao.id,
          dadosNovos: {
            tipo: 'emissao',
            canal: solicitante.canal,
            sessaoId,
            inscricaoId: sessao.inscricaoId,
          },
        },
        tx,
      );
      return emissao;
    });

    return {
      emissaoId: emissao.id,
      emitidaEm: emissao.emitidaEm.toISOString(),
      paciente: sessao.paciente,
      sessao: {
        id: sessao.id,
        inicio: sessao.inicio.toISOString(),
        termino: sessao.termino.toISOString(),
      },
    };
  }

  // Tentativa negada (RNF39): quem tentou, a sessão pedida e o canal, sem
  // nenhum dado do paciente.
  private registrarNegada(
    sessaoId: string,
    canal: CanalDeclaracao,
    usuarioId: string | null,
    inscricaoVerificada: string | null,
  ) {
    return this.auditoria.registrar({
      usuarioId,
      operacao: 'emitir_declaracao_negada',
      entidade: 'sessoes_atendimento',
      entidadeId: sessaoId,
      dadosNovos: { tipo: 'emissao', canal, inscricaoVerificada },
    });
  }

  private async situacaoAutorizacao(
    inscricaoId: string,
  ): Promise<AutorizacaoMenor> {
    const [linha] = await this.db
      .select({
        dataNascimento: inscricoes.dataNascimento,
        responsavelLegal: inscricoes.responsavelLegal,
        entregueEm: autorizacoesMenor.entregueEm,
        registradoPor: usuarios.nome,
        registradoEm: autorizacoesMenor.registradoEm,
      })
      .from(inscricoes)
      .leftJoin(
        autorizacoesMenor,
        eq(autorizacoesMenor.inscricaoId, inscricoes.id),
      )
      .leftJoin(usuarios, eq(usuarios.id, autorizacoesMenor.registradoPor))
      .where(eq(inscricoes.id, inscricaoId));
    return {
      menor: menorDeIdade(linha.dataNascimento),
      responsavelLegal: linha.responsavelLegal,
      autorizacao:
        linha.entregueEm && linha.registradoEm
          ? {
              entregueEm: linha.entregueEm,
              registradoPor: linha.registradoPor ?? '',
              registradoEm: linha.registradoEm.toISOString(),
            }
          : null,
    };
  }

  private async buscarCaso(casoId: string) {
    const [caso] = await this.db
      .select({ id: casos.id, inscricaoId: casos.inscricaoId })
      .from(casos)
      .where(eq(casos.id, casoId));
    if (!caso) throw new NotFoundException('Paciente não encontrado.');
    return caso;
  }

  private async listar(filtro: SQL): Promise<SessaoComPresenca[]> {
    const linhas = await this.db
      .select({
        id: sessoesAtendimento.id,
        inicio: sessoesAtendimento.inicio,
        estagiario: usuarios.nome,
      })
      .from(sessoesAtendimento)
      .innerJoin(casos, eq(casos.id, sessoesAtendimento.casoId))
      .innerJoin(usuarios, eq(usuarios.id, sessoesAtendimento.estagiarioId))
      .where(and(filtro, eq(sessoesAtendimento.status, 'realizada')))
      .orderBy(desc(sessoesAtendimento.inicio));
    return linhas.map((s) => ({
      id: s.id,
      inicio: s.inicio.toISOString(),
      estagiario: s.estagiario,
    }));
  }
}
