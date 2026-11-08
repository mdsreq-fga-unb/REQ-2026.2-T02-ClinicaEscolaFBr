import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import {
  cancelamentosSessao,
  casos,
  inscricoes,
  linksConfirmacao,
  sessoesAtendimento,
  type Db,
} from '@clinica/database';
import {
  STATUS_SESSAO_EM_ABERTO,
  type AusenciaEstagiario,
  type AvisoAoPaciente,
  type Cancelamento,
  type CancelamentoPeloLink,
  type ClassificacaoCancelamento,
  type OrigemCancelamento,
  type ResultadoCancelamento,
  type SessaoCanceladaPeloLink,
  type StatusSessao,
} from '@clinica/shared';
import {
  AuditoriaService,
  type Transacao,
} from '../../auditoria/auditoria.service';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { cifrar } from '../../common/criptografia';
import { DB } from '../../database/database.module';
import { EmailService } from '../../notificacoes/email.service';
import { ParametrosService } from '../../parametros/parametros.service';
import { FaltasService } from '../assiduidade/faltas.service';
import { acoesDeCancelamento } from './acoes-cancelamento';
import {
  ConfirmacaoService,
  LINK_INVALIDO,
  primeiroNome,
} from './confirmacao.service';
import { dataBrasilia, diaDaSemana, horaBrasilia, MINUTO } from './horario';

const SESSAO_INICIADA =
  'Esta sessão já começou e não pode mais ser cancelada. Se o paciente não compareceu, registre a falta.';
const NAO_CANCELAVEL: Partial<Record<StatusSessao, string>> = {
  cancelada: 'Esta sessão já foi cancelada.',
  realizada: 'Esta sessão já foi realizada e não pode ser cancelada.',
  falta_paciente:
    'A falta do paciente já foi registrada nesta sessão, que não pode mais ser cancelada.',
};
const SEM_ACESSO =
  'Você não tem acesso a esta sessão. Ela só pode ser cancelada pelo estagiário responsável pelo caso, pelo supervisor dele e pela secretaria.';
const SO_SECRETARIA =
  'O cancelamento pedido pelo paciente é registrado pela secretaria.';

const escaparHtml = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

type SessaoACancelar = {
  id: string;
  casoId: string;
  inicio: Date;
  status: StatusSessao;
};

// Cancelamento de sessão (RF15 e RF16). O status, o registro do cancelamento, o uso
// do link, a auditoria (RNF10) e, fora do prazo, a falta (RF35) saem na mesma
// transação. O aviso ao paciente sai depois do commit: se falhar, o cancelamento
// continua valendo e a tela avisa.
@Injectable()
export class CancelamentoService {
  private readonly logger = new Logger(CancelamentoService.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly auditoria: AuditoriaService,
    private readonly parametros: ParametrosService,
    private readonly confirmacao: ConfirmacaoService,
    private readonly faltas: FaltasService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  // Pelo link, sem login (RF15, RNF15). Depois disso, o link não permite mais nada
  // (RNF59): o uso é marcado com UPDATE condicional, e quem chegar depois recebe a
  // mesma resposta do link inválido.
  async cancelarPeloLink(
    token: string,
    dados: CancelamentoPeloLink,
  ): Promise<SessaoCanceladaPeloLink> {
    const minimo = await this.parametros.numero(
      'antecedencia_minima_cancelamento_minutos',
    );
    return this.db.transaction(async (tx) => {
      const sessao = await this.confirmacao.sessaoDoLink(tx, token, true);
      const agora = new Date();
      const [link] = await tx
        .update(linksConfirmacao)
        .set({ usadoEm: agora })
        .where(
          and(
            eq(linksConfirmacao.sessaoId, sessao.id),
            isNull(linksConfirmacao.usadoEm),
          ),
        )
        .returning({ id: linksConfirmacao.id });
      if (!link) throw new NotFoundException(LINK_INVALIDO);
      const { classificacao } = await this.registrar(tx, sessao, agora, {
        origem: 'link',
        classificacao: this.pelaAntecedencia(sessao.inicio, agora, minimo),
        justificativa: dados.justificativa,
        usuario: null,
      });
      return {
        primeiroNome: primeiroNome(sessao.nome),
        inicio: sessao.inicio.toISOString(),
        situacao: 'cancelada',
        contaComoFalta: classificacao === 'fora_do_prazo',
      };
    });
  }

  // Pela equipe (RF15): o pedido do paciente, pela secretaria, ou o administrativo,
  // para remarcar, pela secretaria ou pelo estagiário responsável.
  async cancelar(
    id: string,
    dados: Cancelamento,
    usuario: UsuarioAutenticado,
  ): Promise<ResultadoCancelamento> {
    const minimo = await this.parametros.numero(
      'antecedencia_minima_cancelamento_minutos',
    );
    const resultado = await this.db.transaction(async (tx) => {
      const sessao = await this.sessao(tx, id);
      const acoes = await acoesDeCancelamento(tx, sessao.casoId, usuario);
      if (dados.tipo === 'pedido_paciente' && !acoes.pedidoPaciente) {
        throw new ForbiddenException(
          acoes.administrativo ? SO_SECRETARIA : SEM_ACESSO,
        );
      }
      if (dados.tipo === 'administrativo' && !acoes.administrativo) {
        throw new ForbiddenException(SEM_ACESSO);
      }
      const agora = new Date();
      return this.registrar(tx, sessao, agora, {
        origem: this.origem(usuario),
        classificacao:
          dados.tipo === 'administrativo'
            ? 'administrativo'
            : this.pelaAntecedencia(sessao.inicio, agora, minimo),
        justificativa: dados.justificativa,
        usuario,
      });
    });
    // O administrativo muda a sessão sem o pedido do paciente, que precisa saber.
    const avisoAoPaciente =
      dados.tipo === 'administrativo'
        ? await this.avisarPaciente(id, 'remarcar')
        : null;
    return { ...resultado, avisoAoPaciente };
  }

  // Ausência real do estagiário (RF16), registrada por ele, pelo supervisor do caso
  // ou pela secretaria. Fica guardada para as faltas do estagiário (RF39, RF40).
  async registrarAusencia(
    id: string,
    dados: AusenciaEstagiario,
    usuario: UsuarioAutenticado,
  ): Promise<ResultadoCancelamento> {
    const resultado = await this.db.transaction(async (tx) => {
      const sessao = await this.sessao(tx, id);
      const acoes = await acoesDeCancelamento(tx, sessao.casoId, usuario);
      if (!acoes.ausenciaEstagiario) throw new ForbiddenException(SEM_ACESSO);
      return this.registrar(tx, sessao, new Date(), {
        origem: this.origem(usuario),
        classificacao: 'ausencia_estagiario',
        justificativa: dados.justificativa,
        usuario,
      });
    });
    return {
      ...resultado,
      avisoAoPaciente: await this.avisarPaciente(id, 'ausencia'),
    };
  }

  private async sessao(tx: Transacao, id: string): Promise<SessaoACancelar> {
    const [sessao] = await tx
      .select({
        id: sessoesAtendimento.id,
        casoId: sessoesAtendimento.casoId,
        inicio: sessoesAtendimento.inicio,
        status: sessoesAtendimento.status,
      })
      .from(sessoesAtendimento)
      .where(eq(sessoesAtendimento.id, id))
      .for('update');
    if (!sessao) throw new NotFoundException('Sessão não encontrada.');
    return sessao;
  }

  // A antecedência é o tempo entre o registro e o início da sessão. Com o mínimo de
  // 60 minutos e a sessão às 14h00, até as 13h00 fica no prazo; a partir das
  // 13h00min01s, fora (DF20).
  private pelaAntecedencia(
    inicio: Date,
    agora: Date,
    minimo: number,
  ): ClassificacaoCancelamento {
    return inicio.getTime() - agora.getTime() >= minimo * MINUTO
      ? 'no_prazo'
      : 'fora_do_prazo';
  }

  private origem(usuario: UsuarioAutenticado): OrigemCancelamento {
    return usuario.perfil;
  }

  private async registrar(
    tx: Transacao,
    sessao: SessaoACancelar,
    agora: Date,
    dados: {
      origem: OrigemCancelamento;
      classificacao: ClassificacaoCancelamento;
      justificativa: string;
      usuario: UsuarioAutenticado | null;
    },
  ) {
    if (!STATUS_SESSAO_EM_ABERTO.includes(sessao.status)) {
      throw new UnprocessableEntityException(
        NAO_CANCELAVEL[sessao.status] ?? SESSAO_INICIADA,
      );
    }
    if (sessao.inicio <= agora) {
      throw new UnprocessableEntityException(SESSAO_INICIADA);
    }
    const antecedenciaMinutos = Math.floor(
      (sessao.inicio.getTime() - agora.getTime()) / MINUTO,
    );
    const [atualizada] = await tx
      .update(sessoesAtendimento)
      .set({ status: 'cancelada' })
      .where(
        and(
          eq(sessoesAtendimento.id, sessao.id),
          inArray(sessoesAtendimento.status, STATUS_SESSAO_EM_ABERTO),
        ),
      )
      .returning({ id: sessoesAtendimento.id });
    if (!atualizada) throw new ConflictException(NAO_CANCELAVEL.cancelada);
    const usuarioId = dados.usuario?.id ?? null;
    const [cancelamento] = await tx
      .insert(cancelamentosSessao)
      .values({
        sessaoId: sessao.id,
        origem: dados.origem,
        classificacao: dados.classificacao,
        justificativaCifrada: cifrar(
          dados.justificativa,
          this.config.getOrThrow<string>('CHAVE_DADOS'),
        ),
        registradoPor: usuarioId,
        registradoEm: agora,
        antecedenciaMinutos,
      })
      .returning({ id: cancelamentosSessao.id });
    // Cancelada pela equipe, a sessão também não aceita mais nada pelo link (RNF59).
    await tx
      .update(linksConfirmacao)
      .set({ usadoEm: agora })
      .where(
        and(
          eq(linksConfirmacao.sessaoId, sessao.id),
          isNull(linksConfirmacao.usadoEm),
        ),
      );
    // A justificativa pode trazer informação de saúde e não entra na auditoria (RNF51).
    await this.auditoria.registrar(
      {
        usuarioId,
        operacao: 'cancelar_sessao',
        entidade: 'sessoes_atendimento',
        entidadeId: sessao.id,
        dadosAnteriores: { status: sessao.status },
        dadosNovos: {
          status: 'cancelada',
          cancelamentoId: cancelamento.id,
          origem: dados.origem,
          classificacao: dados.classificacao,
          antecedenciaMinutos,
          justificativaInformada: true,
          ...(usuarioId ? {} : { autor: 'paciente' }),
        },
      },
      tx,
    );
    if (dados.classificacao === 'fora_do_prazo') {
      await this.faltas.registrarCancelamentoForaDoPrazo(
        tx,
        sessao.id,
        dados.usuario ?? { pacientePeloLink: true },
      );
    }
    return {
      classificacao: dados.classificacao,
      antecedenciaMinutos,
      inicio: sessao.inicio.toISOString(),
    };
  }

  // Aviso por e-mail, sem o motivo do cancelamento (CFP art. 9º). Sem e-mail, a tela
  // diz que o paciente ainda não foi avisado: o aviso à secretaria com a mensagem
  // pronta do WhatsApp é do RF17, no Ciclo 5.
  private async avisarPaciente(
    sessaoId: string,
    motivo: 'remarcar' | 'ausencia',
  ): Promise<AvisoAoPaciente> {
    const [paciente] = await this.db
      .select({
        nome: inscricoes.nomeCompleto,
        email: inscricoes.email,
        inicio: sessoesAtendimento.inicio,
      })
      .from(sessoesAtendimento)
      .innerJoin(casos, eq(casos.id, sessoesAtendimento.casoId))
      .innerJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
      .where(eq(sessoesAtendimento.id, sessaoId));
    if (!paciente?.email) return 'sem_email';
    const { inicio } = paciente;
    try {
      await this.email.enviar(
        paciente.email,
        'Sessão cancelada na Clínica Escola FBr',
        `<p>Olá, ${escaparHtml(primeiroNome(paciente.nome))}.</p>
<p>A sua sessão na Clínica Escola de Psicologia da FBr de ${diaDaSemana(inicio)}, ${dataBrasilia(inicio)}, às ${horaBrasilia(inicio)}, foi cancelada pela clínica. Este cancelamento não conta como falta.</p>
<p>${
          motivo === 'remarcar'
            ? 'O novo horário será enviado em seguida, por este e-mail.'
            : 'A secretaria vai entrar em contato para marcar outro horário.'
        }</p>`,
      );
      return 'email_enviado';
    } catch (erro) {
      this.logger.error(`Aviso do cancelamento ${sessaoId} não enviado`, erro);
      return 'email_nao_enviado';
    }
  }
}
