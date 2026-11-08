import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { aliasedTable, and, asc, eq, gt, lt } from 'drizzle-orm';
import {
  casos,
  inscricoes,
  linksConfirmacao,
  sessoesAtendimento,
  usuarios,
  type Db,
} from '@clinica/database';
import type {
  SessaoDoLink,
  SessoesSemConfirmacao,
  StatusSessao,
} from '@clinica/shared';
import {
  AuditoriaService,
  type Transacao,
} from '../../auditoria/auditoria.service';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { DB } from '../../database/database.module';
import { ParametrosService } from '../../parametros/parametros.service';
import { hashToken } from '../acesso/credenciais';
import { MINUTO } from './horario';

const estagiario = aliasedTable(usuarios, 'estagiario');

// A mesma resposta para o link inexistente, vencido ou de sessão que não está mais em
// aberto: nenhuma recusa diz qual foi o motivo nem mostra dados da sessão (RNF59).
export const LINK_INVALIDO =
  'Este link não é mais válido. Para falar sobre a sua sessão, procure a secretaria da Clínica Escola.';
const PRAZO_ENCERRADO =
  'O prazo para confirmar a presença pelo site terminou. Se você vai à sessão, procure a secretaria da Clínica Escola.';
const JA_CONFIRMADA = 'A presença nesta sessão já foi confirmada.';

// Último instante para o paciente confirmar: o início menos o prazo (RF14, DF45).
export const prazoDeConfirmacao = (inicio: Date, prazoHoras: number) =>
  new Date(inicio.getTime() - prazoHoras * 60 * MINUTO);

const estaEmAberto = (
  status: StatusSessao,
): status is 'agendada' | 'confirmada' =>
  status === 'agendada' || status === 'confirmada';

export const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0];

// Confirmação de presença (RF14): pelo link público, sem login (RNF15), ou pela
// secretaria, quando o paciente confirma por telefone. A lista de sessões sem
// confirmação é uma consulta, e nenhuma falta é criada aqui (RF34).
@Injectable()
export class ConfirmacaoService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly auditoria: AuditoriaService,
    private readonly parametros: ParametrosService,
  ) {}

  async consultarPeloLink(token: string): Promise<SessaoDoLink> {
    const prazos = await this.prazos();
    const sessao = await this.sessaoDoLink(this.db, token);
    return this.dadosDoLink(sessao, prazos);
  }

  async confirmarPeloLink(token: string): Promise<SessaoDoLink> {
    const prazos = await this.prazos();
    const { prazoHoras } = prazos;
    return this.db.transaction(async (tx) => {
      const sessao = await this.sessaoDoLink(tx, token, true);
      if (sessao.status === 'confirmada') {
        throw new ConflictException(JA_CONFIRMADA);
      }
      const agora = new Date();
      if (agora > prazoDeConfirmacao(sessao.inicio, prazoHoras)) {
        throw new UnprocessableEntityException(PRAZO_ENCERRADO);
      }
      await this.confirmar(tx, sessao.id, agora, 'link', null);
      return this.dadosDoLink({ ...sessao, status: 'confirmada' }, prazos);
    });
  }

  // Sessões futuras agendadas cujo prazo de confirmação já terminou.
  async semConfirmacao(): Promise<SessoesSemConfirmacao> {
    const prazoHoras = await this.parametros.numero('prazo_confirmacao_horas');
    const agora = new Date();
    const linhas = await this.db
      .select({
        id: sessoesAtendimento.id,
        casoId: sessoesAtendimento.casoId,
        paciente: inscricoes.nomeCompleto,
        responsavelLegal: inscricoes.responsavelLegal,
        estagiario: estagiario.nome,
        inicio: sessoesAtendimento.inicio,
        termino: sessoesAtendimento.termino,
        canalPreferencial: inscricoes.canalPreferencial,
      })
      .from(sessoesAtendimento)
      .innerJoin(casos, eq(casos.id, sessoesAtendimento.casoId))
      .innerJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
      .innerJoin(estagiario, eq(estagiario.id, sessoesAtendimento.estagiarioId))
      .where(
        and(
          eq(sessoesAtendimento.status, 'agendada'),
          gt(sessoesAtendimento.inicio, agora),
          lt(
            sessoesAtendimento.inicio,
            new Date(agora.getTime() + prazoHoras * 60 * MINUTO),
          ),
        ),
      )
      .orderBy(asc(sessoesAtendimento.inicio));
    return {
      prazoHoras,
      sessoes: linhas.map((s) => ({
        ...s,
        inicio: s.inicio.toISOString(),
        termino: s.termino.toISOString(),
      })),
    };
  }

  // Confirmação recebida por telefone: vale também depois do prazo do link, até o
  // início da sessão.
  async registrarPelaSecretaria(id: string, autor: UsuarioAutenticado) {
    return this.db.transaction(async (tx) => {
      const [sessao] = await tx
        .select({
          id: sessoesAtendimento.id,
          inicio: sessoesAtendimento.inicio,
          status: sessoesAtendimento.status,
        })
        .from(sessoesAtendimento)
        .where(eq(sessoesAtendimento.id, id))
        .for('update');
      if (!sessao) throw new NotFoundException('Sessão não encontrada.');
      if (sessao.status === 'confirmada') {
        throw new ConflictException(JA_CONFIRMADA);
      }
      const agora = new Date();
      if (sessao.status !== 'agendada' || sessao.inicio <= agora) {
        throw new UnprocessableEntityException(
          'Só é possível registrar a confirmação de sessão agendada que ainda não começou.',
        );
      }
      await this.confirmar(tx, id, agora, 'secretaria', autor.id);
      return { status: 'confirmada', confirmadaEm: agora.toISOString() };
    });
  }

  // Lidos antes da transação, que bloqueia a sessão.
  private async prazos() {
    const [prazoHoras, antecedenciaMinimaMinutos] = await Promise.all([
      this.parametros.numero('prazo_confirmacao_horas'),
      this.parametros.numero('antecedencia_minima_cancelamento_minutos'),
    ]);
    return { prazoHoras, antecedenciaMinimaMinutos };
  }

  // O link não confirma nem cancela depois do início da sessão nem depois de usado,
  // vencido ou de a sessão sair de "agendada" ou "confirmada" (RNF59). O
  // cancelamento pelo link (RF15) também passa por aqui.
  async sessaoDoLink(banco: Db | Transacao, token: string, bloquear = false) {
    const consulta = banco
      .select({
        id: sessoesAtendimento.id,
        casoId: sessoesAtendimento.casoId,
        inicio: sessoesAtendimento.inicio,
        status: sessoesAtendimento.status,
        nome: inscricoes.nomeCompleto,
        expiraEm: linksConfirmacao.expiraEm,
        usadoEm: linksConfirmacao.usadoEm,
      })
      .from(linksConfirmacao)
      .innerJoin(
        sessoesAtendimento,
        eq(sessoesAtendimento.id, linksConfirmacao.sessaoId),
      )
      .innerJoin(casos, eq(casos.id, sessoesAtendimento.casoId))
      .innerJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
      .where(eq(linksConfirmacao.tokenHash, hashToken(token)));
    const [sessao] = await (bloquear
      ? consulta.for('update', { of: sessoesAtendimento })
      : consulta);
    const agora = new Date();
    if (
      !sessao ||
      sessao.usadoEm ||
      sessao.expiraEm <= agora ||
      sessao.inicio <= agora ||
      !estaEmAberto(sessao.status)
    ) {
      throw new NotFoundException(LINK_INVALIDO);
    }
    return { ...sessao, status: sessao.status };
  }

  private dadosDoLink(
    sessao: {
      inicio: Date;
      status: 'agendada' | 'confirmada';
      nome: string;
    },
    {
      prazoHoras,
      antecedenciaMinimaMinutos,
    }: { prazoHoras: number; antecedenciaMinimaMinutos: number },
  ): SessaoDoLink {
    const prazo = prazoDeConfirmacao(sessao.inicio, prazoHoras);
    return {
      primeiroNome: primeiroNome(sessao.nome),
      inicio: sessao.inicio.toISOString(),
      situacao: sessao.status,
      prazoConfirmacao: prazo.toISOString(),
      podeConfirmar: sessao.status === 'agendada' && new Date() <= prazo,
      antecedenciaMinimaMinutos,
    };
  }

  // Sem usuário, o autor na auditoria é o paciente, pelo link (RNF10).
  private async confirmar(
    tx: Transacao,
    sessaoId: string,
    agora: Date,
    canal: 'link' | 'secretaria',
    usuarioId: string | null,
  ) {
    await tx
      .update(sessoesAtendimento)
      .set({ status: 'confirmada', confirmadaEm: agora, confirmadaPor: canal })
      .where(eq(sessoesAtendimento.id, sessaoId));
    await this.auditoria.registrar(
      {
        usuarioId,
        operacao: 'confirmar_presenca',
        entidade: 'sessoes_atendimento',
        entidadeId: sessaoId,
        dadosAnteriores: { status: 'agendada' },
        dadosNovos: {
          status: 'confirmada',
          confirmadaEm: agora.toISOString(),
          canal,
          ...(usuarioId ? {} : { autor: 'paciente' }),
        },
      },
      tx,
    );
  }
}
