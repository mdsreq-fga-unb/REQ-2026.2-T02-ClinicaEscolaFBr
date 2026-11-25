import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, asc, eq, gt, inArray, isNull, lt, or } from 'drizzle-orm';
import {
  cancelamentosSessao,
  casos,
  inscricoes,
  sessoesAtendimento,
  type Db,
} from '@clinica/database';
import type {
  AvisoManual,
  AvisoPendente,
  AvisoRegistrado,
  MotivoAvisoPendente,
} from '@clinica/shared';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { DB } from '../../database/database.module';
import { exigirConsentimento, semRevogacao } from '../../common/consentimento';
import { mensagemDaAusencia } from './aviso-cancelamento';
import { formatarCelular, linkDoWhatsapp, MINUTO } from './horario';

// O `envio_pendente` parado há mais que isto é de um processo que caiu entre o
// commit do RF16 e o envio do e-mail.
const ENVIO_PARADO_HA = 5 * MINUTO;
// Depois de 7 dias da sessão, o aviso não serve mais e sai da lista.
const JANELA_DO_AVISO = 7 * 24 * 60 * MINUTO;

const JA_AVISADO =
  'O aviso deste cancelamento já foi registrado por outra pessoa da secretaria.';
const SEM_AVISO_PENDENTE =
  'Este cancelamento não tem aviso pendente ao paciente.';
const SEM_CELULAR =
  'O paciente não tem celular cadastrado. Avise por outro contato da ficha.';

// Aviso ao paciente do cancelamento por ausência do estagiário (RF17), quando o
// e-mail não chegou: o paciente sem e-mail, a falha no envio ou o envio parado. A
// secretaria envia a mensagem pronta pelo WhatsApp ou avisa por outro contato da
// ficha e registra, como no agendamento (DF24).
@Injectable()
export class AvisosCancelamentoService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly auditoria: AuditoriaService,
  ) {}

  async pendentes(): Promise<AvisoPendente[]> {
    const agora = Date.now();
    const linhas = await this.db
      .select({
        id: cancelamentosSessao.id,
        casoId: casos.id,
        paciente: inscricoes.nomeCompleto,
        celular: inscricoes.celular,
        inicio: sessoesAtendimento.inicio,
        aviso: cancelamentosSessao.avisoPaciente,
      })
      .from(cancelamentosSessao)
      .innerJoin(
        sessoesAtendimento,
        eq(sessoesAtendimento.id, cancelamentosSessao.sessaoId),
      )
      .innerJoin(casos, eq(casos.id, sessoesAtendimento.casoId))
      .innerJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
      .where(
        and(
          eq(cancelamentosSessao.classificacao, 'ausencia_estagiario'),
          semRevogacao(inscricoes.id),
          isNull(cancelamentosSessao.avisoManualEm),
          or(
            inArray(cancelamentosSessao.avisoPaciente, [
              'sem_email',
              'email_nao_enviado',
            ]),
            and(
              eq(cancelamentosSessao.avisoPaciente, 'envio_pendente'),
              lt(
                cancelamentosSessao.registradoEm,
                new Date(agora - ENVIO_PARADO_HA),
              ),
            ),
          ),
          gt(sessoesAtendimento.inicio, new Date(agora - JANELA_DO_AVISO)),
        ),
      )
      .orderBy(asc(sessoesAtendimento.inicio));
    return linhas.map((l) => {
      const mensagem = mensagemDaAusencia(l.paciente, l.inicio);
      return {
        id: l.id,
        casoId: l.casoId,
        paciente: l.paciente,
        inicio: l.inicio.toISOString(),
        motivo: l.aviso as MotivoAvisoPendente,
        mensagem,
        celular: l.celular ? formatarCelular(l.celular) : null,
        url: l.celular ? linkDoWhatsapp(l.celular, mensagem) : null,
      };
    });
  }

  // Uma vez só: com duas pessoas da secretaria no mesmo aviso, a segunda recebe 409.
  async registrar(
    id: string,
    { canal }: AvisoManual,
    autor: UsuarioAutenticado,
  ): Promise<AvisoRegistrado> {
    const [referencia] = await this.db
      .select({ casoId: sessoesAtendimento.casoId })
      .from(cancelamentosSessao)
      .innerJoin(
        sessoesAtendimento,
        eq(sessoesAtendimento.id, cancelamentosSessao.sessaoId),
      )
      .where(eq(cancelamentosSessao.id, id));
    if (!referencia)
      throw new NotFoundException('Cancelamento não encontrado.');
    return this.db.transaction(async (tx) => {
      await exigirConsentimento(tx, referencia.casoId);
      const [cancelamento] = await tx
        .select({
          aviso: cancelamentosSessao.avisoPaciente,
          avisoManualEm: cancelamentosSessao.avisoManualEm,
          celular: inscricoes.celular,
        })
        .from(cancelamentosSessao)
        .innerJoin(
          sessoesAtendimento,
          eq(sessoesAtendimento.id, cancelamentosSessao.sessaoId),
        )
        .innerJoin(casos, eq(casos.id, sessoesAtendimento.casoId))
        .innerJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
        .where(eq(cancelamentosSessao.id, id))
        .for('update', { of: cancelamentosSessao });
      if (!cancelamento) {
        throw new NotFoundException('Cancelamento não encontrado.');
      }
      if (cancelamento.avisoManualEm) throw new ConflictException(JA_AVISADO);
      if (!cancelamento.aviso || cancelamento.aviso === 'email_enviado') {
        throw new UnprocessableEntityException(SEM_AVISO_PENDENTE);
      }
      if (canal === 'whatsapp' && !cancelamento.celular) {
        throw new UnprocessableEntityException(SEM_CELULAR);
      }
      const agora = new Date();
      const [registrado] = await tx
        .update(cancelamentosSessao)
        .set({
          avisoManualEm: agora,
          avisoManualPor: autor.id,
          avisoManualCanal: canal,
        })
        .where(
          and(
            eq(cancelamentosSessao.id, id),
            isNull(cancelamentosSessao.avisoManualEm),
          ),
        )
        .returning({ id: cancelamentosSessao.id });
      if (!registrado) throw new ConflictException(JA_AVISADO);
      await this.auditoria.registrar(
        {
          usuarioId: autor.id,
          operacao: 'registrar_aviso_paciente',
          entidade: 'cancelamentos_sessao',
          entidadeId: id,
          dadosAnteriores: {
            avisoPaciente: cancelamento.aviso,
            avisoManualEm: null,
          },
          dadosNovos: {
            avisoManualEm: agora.toISOString(),
            avisoManualCanal: canal,
          },
        },
        tx,
      );
      return { avisoManualEm: agora.toISOString(), canal };
    });
  }
}
