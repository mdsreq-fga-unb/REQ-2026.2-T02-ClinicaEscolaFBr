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
import { aliasedTable, and, asc, eq, gt, ilike, lt, ne, or } from 'drizzle-orm';
import {
  casos,
  inscricoes,
  linksConfirmacao,
  sessoesAtendimento,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import type {
  Agendamento,
  BlocoAgenda,
  BuscaPacientes,
  ConflitoAgendamento,
  FiltroAgenda,
  PacienteAgendavel,
  ResultadoAgendamento,
} from '@clinica/shared';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { DB } from '../../database/database.module';
import { EmailService } from '../../notificacoes/email.service';
import { ParametrosService } from '../../parametros/parametros.service';
import { gerarToken } from '../acesso/credenciais';
import {
  celularParaWhatsapp,
  dataBrasilia,
  diaDaSemana,
  formatarCelular,
  horaBrasilia,
  inicioDoDia,
  MINUTO,
} from './horario';

const estagiario = aliasedTable(usuarios, 'estagiario');

// O link de confirmação vale até o prazo de confirmação do RF14 (padrão de 12 horas
// antes do início). O parâmetro e a página de confirmação entram com o RF14, no Ciclo 4.
const PRAZO_CONFIRMACAO_HORAS = 12;

const SEM_VINCULO =
  'Este paciente ainda não tem estagiário vinculado. Não é possível agendar sessão para ele agora. O vínculo é feito pelo supervisor do caso.';
const NAO_RESPONSAVEL =
  'Só o estagiário responsável pelo paciente pode agendar a sessão.';

const escaparHtml = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Violação das restrições de exclusão do banco (23P01), direto ou embrulhada pelo Drizzle.
const violaExclusao = (erro: unknown) => {
  const e = erro as { code?: string; cause?: { code?: string } };
  return e?.code === '23P01' || e?.cause?.code === '23P01';
};

type Intervalo = { inicio: Date; termino: Date; fim: Date };
type SessaoExistente = {
  casoId: string;
  estagiarioId: string;
  inicio: Date;
  termino: Date;
  fimIntervaloAnotacoes: Date;
};

@Injectable()
export class SessoesService {
  private readonly logger = new Logger(SessoesService.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly auditoria: AuditoriaService,
    private readonly email: EmailService,
    private readonly parametros: ParametrosService,
    private readonly config: ConfigService,
  ) {}

  // Pacientes para a busca da tela (RF10). O estagiário vê só os próprios pacientes.
  async buscarPacientes(
    { busca }: BuscaPacientes,
    usuario: UsuarioAutenticado,
  ): Promise<PacienteAgendavel[]> {
    const linhas = await this.db
      .select({
        casoId: casos.id,
        nome: inscricoes.nomeCompleto,
        estagiarioId: estagiario.id,
        estagiarioNome: estagiario.nome,
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
      .where(
        and(
          ne(casos.situacao, 'encerrado'),
          busca ? ilike(inscricoes.nomeCompleto, `%${busca}%`) : undefined,
          usuario.perfil === 'estagiario'
            ? eq(vinculosEstagiario.estagiarioId, usuario.id)
            : undefined,
        ),
      )
      .orderBy(asc(inscricoes.nomeCompleto))
      .limit(20);
    return linhas.map((l) => ({
      casoId: l.casoId,
      nome: l.nome,
      estagiario:
        l.estagiarioId && l.estagiarioNome
          ? { id: l.estagiarioId, nome: l.estagiarioNome }
          : null,
    }));
  }

  // Blocos ocupados do estagiário no dia, sem o nome dos pacientes (RF10).
  async agenda(
    { estagiarioId, data }: FiltroAgenda,
    usuario: UsuarioAutenticado,
  ): Promise<BlocoAgenda[]> {
    if (usuario.perfil === 'estagiario' && usuario.id !== estagiarioId) {
      throw new ForbiddenException(
        'O estagiário consulta só a própria agenda.',
      );
    }
    const inicio = inicioDoDia(data);
    const fim = new Date(inicio.getTime() + 24 * 60 * MINUTO);
    const sessoes = await this.db
      .select({
        inicio: sessoesAtendimento.inicio,
        termino: sessoesAtendimento.termino,
        fimIntervaloAnotacoes: sessoesAtendimento.fimIntervaloAnotacoes,
      })
      .from(sessoesAtendimento)
      .where(
        and(
          eq(sessoesAtendimento.estagiarioId, estagiarioId),
          eq(sessoesAtendimento.status, 'agendada'),
          lt(sessoesAtendimento.inicio, fim),
          gt(sessoesAtendimento.fimIntervaloAnotacoes, inicio),
        ),
      )
      .orderBy(asc(sessoesAtendimento.inicio));
    return sessoes.map((s) => ({
      inicio: s.inicio.toISOString(),
      termino: s.termino.toISOString(),
      fimIntervaloAnotacoes: s.fimIntervaloAnotacoes.toISOString(),
    }));
  }

  // Agendamento pela secretaria ou pelo estagiário responsável (RF10).
  async agendar(
    dados: Agendamento,
    autor: UsuarioAutenticado,
  ): Promise<ResultadoAgendamento> {
    const paciente = await this.buscarPaciente(dados.casoId);
    if (autor.perfil === 'estagiario' && paciente.estagiarioId !== autor.id) {
      throw new ForbiddenException(NAO_RESPONSAVEL);
    }
    if (!paciente.estagiarioId || !paciente.estagiarioNome) {
      throw new UnprocessableEntityException(SEM_VINCULO);
    }
    const estagiarioId = paciente.estagiarioId;

    const duracao = await this.parametros.numero('duracao_sessao_minutos');
    const anotacoes = await this.parametros.numero(
      'intervalo_anotacoes_minutos',
    );
    const inicio = new Date(dados.inicio);
    const termino = dados.termino
      ? new Date(dados.termino)
      : new Date(inicio.getTime() + duracao * MINUTO);
    if (termino <= inicio) {
      throw new UnprocessableEntityException(
        `O término precisa ser depois do início (${horaBrasilia(inicio)}).`,
      );
    }
    const novo: Intervalo = {
      inicio,
      termino,
      fim: new Date(termino.getTime() + anotacoes * MINUTO),
    };

    await this.recusarConflito(dados.casoId, estagiarioId, novo, anotacoes);

    const { token, hash } = gerarToken();
    const prazo = new Date(
      inicio.getTime() - PRAZO_CONFIRMACAO_HORAS * 60 * MINUTO,
    );
    // Sessão marcada em cima da hora: o link vale até o início.
    const expiraEm = prazo > new Date() ? prazo : inicio;
    // Dois agendamentos simultâneos passam pela consulta acima; as restrições de
    // exclusão do banco decidem (RNF9).
    const sessao = await this.db
      .transaction(async (tx) => {
        const [sessao] = await tx
          .insert(sessoesAtendimento)
          .values({
            casoId: dados.casoId,
            estagiarioId,
            inicio,
            termino,
            fimIntervaloAnotacoes: novo.fim,
            status: 'agendada',
            agendadaPor: autor.id,
          })
          .returning();
        await tx
          .insert(linksConfirmacao)
          .values({ sessaoId: sessao.id, tokenHash: hash, expiraEm });
        await this.auditoria.registrar(
          {
            usuarioId: autor.id,
            operacao: 'agendar_sessao',
            entidade: 'sessoes_atendimento',
            entidadeId: sessao.id,
            dadosNovos: {
              casoId: sessao.casoId,
              estagiarioId,
              inicio: inicio.toISOString(),
              termino: termino.toISOString(),
              fimIntervaloAnotacoes: novo.fim.toISOString(),
              status: sessao.status,
            },
          },
          tx,
        );
        return sessao;
      })
      .catch(async (erro: unknown) => {
        if (!violaExclusao(erro)) throw erro;
        await this.recusarConflito(dados.casoId, estagiarioId, novo, anotacoes);
        throw new ConflictException(
          'Conflito de horário. Escolha outro horário.',
        );
      });

    const link = `${this.config.getOrThrow<string>('WEB_URL')}/confirmacao/${token}`;
    const resultado: ResultadoAgendamento = {
      id: sessao.id,
      paciente: paciente.nome,
      estagiario: paciente.estagiarioNome,
      inicio: inicio.toISOString(),
      termino: termino.toISOString(),
      fimIntervaloAnotacoes: novo.fim.toISOString(),
      canal: paciente.canal,
      linkEnviadoPorEmail: false,
      whatsapp: null,
    };

    // Canal e-mail: o link sai depois do commit; se falhar, a sessão continua agendada
    // e a tela avisa. Canal WhatsApp ou ligação: a secretaria envia a mensagem (DF24).
    if (paciente.canal === 'email' && paciente.email) {
      try {
        await this.enviarLink(paciente.email, paciente.nome, inicio, link);
        resultado.linkEnviadoPorEmail = true;
      } catch (erro) {
        this.logger.error(`Link da sessão ${sessao.id} não enviado`, erro);
      }
    } else if (paciente.celular) {
      const mensagem = this.mensagemWhatsapp(paciente.nome, inicio, link);
      resultado.whatsapp = {
        celular: formatarCelular(paciente.celular),
        mensagem,
        url: `https://wa.me/${celularParaWhatsapp(paciente.celular)}?text=${encodeURIComponent(mensagem)}`,
      };
    }
    return resultado;
  }

  // Registra quando quem agendou abriu a mensagem pronta no WhatsApp (DF24).
  async registrarWhatsapp(id: string, autor: UsuarioAutenticado) {
    const [sessao] = await this.db
      .select({
        id: sessoesAtendimento.id,
        estagiarioId: sessoesAtendimento.estagiarioId,
        mensagemWhatsappEm: sessoesAtendimento.mensagemWhatsappEm,
      })
      .from(sessoesAtendimento)
      .where(eq(sessoesAtendimento.id, id));
    if (!sessao) throw new NotFoundException('Sessão não encontrada.');
    if (autor.perfil === 'estagiario' && sessao.estagiarioId !== autor.id) {
      throw new ForbiddenException(NAO_RESPONSAVEL);
    }
    const agora = new Date();
    await this.db.transaction(async (tx) => {
      await tx
        .update(sessoesAtendimento)
        .set({ mensagemWhatsappEm: agora })
        .where(eq(sessoesAtendimento.id, id));
      await this.auditoria.registrar(
        {
          usuarioId: autor.id,
          operacao: 'registrar_envio_whatsapp',
          entidade: 'sessoes_atendimento',
          entidadeId: id,
          dadosAnteriores: {
            mensagemWhatsappEm:
              sessao.mensagemWhatsappEm?.toISOString() ?? null,
          },
          dadosNovos: { mensagemWhatsappEm: agora.toISOString() },
        },
        tx,
      );
    });
    return { mensagemWhatsappEm: agora.toISOString() };
  }

  private async buscarPaciente(casoId: string) {
    const [linha] = await this.db
      .select({
        nome: inscricoes.nomeCompleto,
        email: inscricoes.email,
        celular: inscricoes.celular,
        canal: inscricoes.canalPreferencial,
        estagiarioId: estagiario.id,
        estagiarioNome: estagiario.nome,
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
      .where(eq(casos.id, casoId));
    if (!linha) throw new NotFoundException('Paciente não encontrado.');
    return linha;
  }

  // Sobreposição (RF10): para o estagiário, conta o bloco até o fim das anotações;
  // para o paciente, só a sessão. As desigualdades estritas deixam começar uma
  // sessão exatamente no fim do bloco anterior.
  private async recusarConflito(
    casoId: string,
    estagiarioId: string,
    novo: Intervalo,
    anotacoes: number,
  ) {
    const doDia = await this.sessoesDoDia(casoId, estagiarioId, novo.inicio);
    const doEstagiario = doDia.find(
      (s) =>
        s.estagiarioId === estagiarioId &&
        s.inicio < novo.fim &&
        s.fimIntervaloAnotacoes > novo.inicio,
    );
    const doPaciente = doDia.find(
      (s) =>
        s.casoId === casoId &&
        s.inicio < novo.termino &&
        s.termino > novo.inicio,
    );
    const conflito = doEstagiario ?? doPaciente;
    if (!conflito) return;

    const quando = `${dataBrasilia(conflito.inicio)} das ${horaBrasilia(conflito.inicio)} às ${horaBrasilia(conflito.termino)}`;
    let message: string;
    if (doEstagiario) {
      const [{ nome }] = await this.db
        .select({ nome: usuarios.nome })
        .from(usuarios)
        .where(eq(usuarios.id, estagiarioId));
      message = `Conflito de horário. ${nome} tem sessão em ${quando}, com anotações até ${horaBrasilia(conflito.fimIntervaloAnotacoes)}. Escolha outro horário.`;
    } else {
      message = `Conflito de horário. O paciente já tem sessão em ${quando}. Escolha outro horário.`;
    }
    const livre = this.primeiroHorarioLivre(
      doDia,
      casoId,
      estagiarioId,
      novo,
      anotacoes,
    );
    const corpo: ConflitoAgendamento = {
      message,
      conflito: doEstagiario ? 'estagiario' : 'paciente',
      blocoOcupado: {
        inicio: conflito.inicio.toISOString(),
        fim: (doEstagiario
          ? conflito.fimIntervaloAnotacoes
          : conflito.termino
        ).toISOString(),
      },
      primeiroHorarioLivre: livre?.toISOString() ?? null,
    };
    throw new ConflictException(corpo);
  }

  // Sessões agendadas do estagiário ou do paciente que tocam o dia do novo início.
  private sessoesDoDia(
    casoId: string,
    estagiarioId: string,
    referencia: Date,
  ): Promise<SessaoExistente[]> {
    const inicio = inicioDoDia(dataBrasilia(referencia, 'iso'));
    const fim = new Date(inicio.getTime() + 24 * 60 * MINUTO);
    return this.db
      .select({
        casoId: sessoesAtendimento.casoId,
        estagiarioId: sessoesAtendimento.estagiarioId,
        inicio: sessoesAtendimento.inicio,
        termino: sessoesAtendimento.termino,
        fimIntervaloAnotacoes: sessoesAtendimento.fimIntervaloAnotacoes,
      })
      .from(sessoesAtendimento)
      .where(
        and(
          eq(sessoesAtendimento.status, 'agendada'),
          or(
            eq(sessoesAtendimento.estagiarioId, estagiarioId),
            eq(sessoesAtendimento.casoId, casoId),
          ),
          lt(sessoesAtendimento.inicio, fim),
          gt(sessoesAtendimento.fimIntervaloAnotacoes, inicio),
        ),
      )
      .orderBy(asc(sessoesAtendimento.inicio));
  }

  // Primeiro início, a partir do pedido, em que uma sessão de mesma duração cabe no
  // mesmo dia sem conflito; null se não houver.
  private primeiroHorarioLivre(
    doDia: SessaoExistente[],
    casoId: string,
    estagiarioId: string,
    pedido: Intervalo,
    anotacoes: number,
  ): Date | null {
    const duracao = pedido.termino.getTime() - pedido.inicio.getTime();
    const dia = dataBrasilia(pedido.inicio, 'iso');
    let inicio = pedido.inicio;
    for (let i = 0; i <= doDia.length; i++) {
      const termino = new Date(inicio.getTime() + duracao);
      const fim = new Date(termino.getTime() + anotacoes * MINUTO);
      const bloqueio = doDia.find(
        (s) =>
          (s.estagiarioId === estagiarioId &&
            s.inicio < fim &&
            s.fimIntervaloAnotacoes > inicio) ||
          (s.casoId === casoId && s.inicio < termino && s.termino > inicio),
      );
      if (!bloqueio) {
        return dataBrasilia(inicio, 'iso') === dia ? inicio : null;
      }
      inicio =
        bloqueio.estagiarioId === estagiarioId
          ? bloqueio.fimIntervaloAnotacoes
          : bloqueio.termino;
    }
    return null;
  }

  private primeiroNome(nome: string) {
    return nome.trim().split(/\s+/)[0];
  }

  private mensagemWhatsapp(nome: string, inicio: Date, link: string) {
    return `Olá, ${this.primeiroNome(nome)}! Sua sessão na Clínica Escola de Psicologia da FBr está agendada para ${diaDaSemana(inicio)}, ${dataBrasilia(inicio)}, às ${horaBrasilia(inicio)}.
Confirme sua presença pelo link: ${link}`;
  }

  private async enviarLink(
    email: string,
    nome: string,
    inicio: Date,
    link: string,
  ) {
    await this.email.enviar(
      email,
      'Sessão agendada na Clínica Escola FBr',
      `<p>Olá, ${escaparHtml(this.primeiroNome(nome))}.</p>
<p>Sua sessão na Clínica Escola de Psicologia da FBr está agendada para ${diaDaSemana(inicio)}, ${dataBrasilia(inicio)}, às ${horaBrasilia(inicio)}. O atendimento é presencial, na clínica.</p>
<p>Confirme sua presença pelo link: <a href="${link}">${link}</a></p>
<p>A confirmação pode ser feita até ${PRAZO_CONFIRMACAO_HORAS} horas antes do início da sessão.</p>`,
    );
  }
}
