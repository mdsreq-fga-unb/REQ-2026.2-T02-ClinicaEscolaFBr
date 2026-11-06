import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { aliasedTable, and, asc, count, eq, isNull } from 'drizzle-orm';
import {
  atribuicoesSupervisor,
  casos,
  faltasPaciente,
  sessoesAtendimento,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import {
  LIMITE_FALTAS_CICLO,
  STATUS_SESSAO_EM_ABERTO,
  type AvisoFaltas,
  type ContagemFaltas,
  type FaltaDaSessao,
  type JustificativaFalta,
  type RegistroFalta,
} from '@clinica/shared';
import {
  AuditoriaService,
  type Transacao,
} from '../../auditoria/auditoria.service';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { cifrar, decifrar } from '../../common/criptografia';
import { DB } from '../../database/database.module';

// Quem causou a falta: o usuário logado ou, no cancelamento pelo link do RF15, o
// próprio paciente, sem usuário (RNF10).
export type AutorDaFalta = UsuarioAutenticado | { pacientePeloLink: true };

const SEM_PERMISSAO =
  'Você não tem permissão para registrar ou justificar faltas deste paciente.';

const registrador = aliasedTable(usuarios, 'registrador');
const justificador = aliasedTable(usuarios, 'justificador');

const aviso = (faltas: number): AvisoFaltas =>
  faltas >= LIMITE_FALTAS_CICLO
    ? 'limite_atingido'
    : faltas === 1
      ? 'primeira_falta'
      : null;

// Controle de assiduidade (CP9): a falta do paciente (RF34) e a contagem no ciclo
// (RF35). A contagem não tem tabela: é calculada a partir das faltas, para nunca
// divergir delas (RNF32).
@Injectable()
export class FaltasService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly config: ConfigService,
    private readonly auditoria: AuditoriaService,
  ) {}

  // RF34: falta em sessão presencial já passada, agendada ou confirmada, pela
  // secretaria ou pelo estagiário responsável pelo caso.
  async registrarFalta(
    sessaoId: string,
    dados: RegistroFalta,
    usuario: UsuarioAutenticado,
  ) {
    return this.db.transaction(async (tx) => {
      const [sessao] = await tx
        .select({
          id: sessoesAtendimento.id,
          casoId: sessoesAtendimento.casoId,
          ciclo: sessoesAtendimento.cicloAtendimento,
          inicio: sessoesAtendimento.inicio,
          status: sessoesAtendimento.status,
        })
        .from(sessoesAtendimento)
        .where(eq(sessoesAtendimento.id, sessaoId))
        .for('update');
      if (!sessao) throw new NotFoundException('Sessão não encontrada.');
      await this.exigirResponsavel(tx, sessao.casoId, usuario, ['secretaria']);

      if (!STATUS_SESSAO_EM_ABERTO.includes(sessao.status)) {
        throw new UnprocessableEntityException(
          sessao.status === 'falta_paciente'
            ? 'A falta desta sessão já foi registrada.'
            : sessao.status === 'realizada'
              ? 'A sessão foi realizada e não aceita falta.'
              : 'A sessão foi cancelada e não aceita falta.',
        );
      }
      if (sessao.inicio.getTime() > Date.now()) {
        throw new UnprocessableEntityException(
          'A falta só pode ser registrada depois do início da sessão.',
        );
      }

      await tx
        .update(sessoesAtendimento)
        .set({ status: 'falta_paciente' })
        .where(eq(sessoesAtendimento.id, sessao.id));
      const agora = new Date();
      const [falta] = await tx
        .insert(faltasPaciente)
        .values({
          sessaoId: sessao.id,
          casoId: sessao.casoId,
          cicloAtendimento: sessao.ciclo,
          origem: 'falta',
          registradaPor: usuario.id,
          ...(dados.justificada && dados.motivo
            ? {
                justificada: true,
                motivoJustificativaCifrado: this.cifrar(dados.motivo),
                justificadaPor: usuario.id,
                justificadaEm: agora,
              }
            : {}),
        })
        .returning({ id: faltasPaciente.id });
      // O motivo pode trazer informação de saúde e não entra na auditoria (RNF51).
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          operacao: 'registrar_falta',
          entidade: 'faltas_paciente',
          entidadeId: falta.id,
          dadosAnteriores: { status: sessao.status },
          dadosNovos: {
            sessaoId: sessao.id,
            status: 'falta_paciente',
            justificada: !!dados.justificada,
            motivoInformado: !!dados.justificada,
          },
        },
        tx,
      );
      return {
        faltaId: falta.id,
        contagem: await this.contar(sessao.casoId, tx),
      };
    });
  }

  // RF34: justificativa feita depois, pela secretaria ou pelos responsáveis do caso.
  // Não muda a origem nem a contagem (RF35).
  async justificar(
    faltaId: string,
    dados: JustificativaFalta,
    usuario: UsuarioAutenticado,
  ) {
    return this.db.transaction(async (tx) => {
      const [falta] = await tx
        .select({
          id: faltasPaciente.id,
          casoId: faltasPaciente.casoId,
          justificada: faltasPaciente.justificada,
        })
        .from(faltasPaciente)
        .where(eq(faltasPaciente.id, faltaId))
        .for('update');
      if (!falta) throw new NotFoundException('Falta não encontrada.');
      await this.exigirResponsavel(tx, falta.casoId, usuario, [
        'secretaria',
        'supervisor',
      ]);
      if (falta.justificada) {
        throw new ConflictException('Esta falta já foi justificada.');
      }
      const [atualizada] = await tx
        .update(faltasPaciente)
        .set({
          justificada: true,
          motivoJustificativaCifrado: this.cifrar(dados.motivo),
          justificadaPor: usuario.id,
          justificadaEm: new Date(),
        })
        .where(
          and(
            eq(faltasPaciente.id, falta.id),
            isNull(faltasPaciente.justificadaEm),
          ),
        )
        .returning({ id: faltasPaciente.id });
      if (!atualizada) {
        throw new ConflictException('Esta falta já foi justificada.');
      }
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          operacao: 'justificar_falta',
          entidade: 'faltas_paciente',
          entidadeId: falta.id,
          dadosAnteriores: { justificada: false },
          dadosNovos: { justificada: true, motivoInformado: true },
        },
        tx,
      );
      return { justificada: true };
    });
  }

  // RF15 e RF35: o cancelamento fora do prazo vira falta, na mesma transação do
  // cancelamento. O RF15 muda o status da sessão; aqui entra só a falta.
  async registrarCancelamentoForaDoPrazo(
    tx: Transacao,
    sessaoId: string,
    autor: AutorDaFalta,
  ): Promise<ContagemFaltas> {
    const [sessao] = await tx
      .select({
        casoId: sessoesAtendimento.casoId,
        ciclo: sessoesAtendimento.cicloAtendimento,
      })
      .from(sessoesAtendimento)
      .where(eq(sessoesAtendimento.id, sessaoId));
    if (!sessao) throw new NotFoundException('Sessão não encontrada.');
    const peloLink = 'pacientePeloLink' in autor;
    const [falta] = await tx
      .insert(faltasPaciente)
      .values({
        sessaoId,
        casoId: sessao.casoId,
        cicloAtendimento: sessao.ciclo,
        origem: 'cancelamento_fora_do_prazo',
        registradaPor: peloLink ? null : autor.id,
        registradaPeloPaciente: peloLink,
      })
      .returning({ id: faltasPaciente.id });
    await this.auditoria.registrar(
      {
        usuarioId: peloLink ? null : autor.id,
        operacao: 'registrar_falta',
        entidade: 'faltas_paciente',
        entidadeId: falta.id,
        dadosNovos: {
          sessaoId,
          origem: 'cancelamento_fora_do_prazo',
          registradaPeloPaciente: peloLink,
        },
      },
      tx,
    );
    return this.contar(sessao.casoId, tx);
  }

  // RF35: faltas do ciclo vigente do caso, consecutivas ou não, sem as retiradas da
  // contagem na reversão (RF38). A justificativa não muda a contagem.
  async contar(casoId: string, tx?: Transacao): Promise<ContagemFaltas> {
    const banco = tx ?? this.db;
    const [{ total }] = await banco
      .select({ total: count() })
      .from(faltasPaciente)
      .innerJoin(casos, eq(casos.id, faltasPaciente.casoId))
      .where(
        and(
          eq(faltasPaciente.casoId, casoId),
          eq(faltasPaciente.cicloAtendimento, casos.cicloAtendimento),
          isNull(faltasPaciente.retiradaEm),
        ),
      );
    return { faltas: total, limite: LIMITE_FALTAS_CICLO, aviso: aviso(total) };
  }

  // Faltas de um ciclo, por sessão, para o prontuário e os dados administrativos. O
  // motivo só é aberto para quem pode justificar a falta e para a coordenação.
  async doCiclo(
    casoId: string,
    ciclo: number,
    comMotivo: boolean,
  ): Promise<Map<string, FaltaDaSessao>> {
    const linhas = await this.db
      .select({
        sessaoId: faltasPaciente.sessaoId,
        id: faltasPaciente.id,
        origem: faltasPaciente.origem,
        registradaPor: registrador.nome,
        registradaPeloPaciente: faltasPaciente.registradaPeloPaciente,
        registradaEm: faltasPaciente.registradaEm,
        justificada: faltasPaciente.justificada,
        motivo: faltasPaciente.motivoJustificativaCifrado,
        justificadaPor: justificador.nome,
        justificadaEm: faltasPaciente.justificadaEm,
        retiradaEm: faltasPaciente.retiradaEm,
      })
      .from(faltasPaciente)
      .leftJoin(registrador, eq(registrador.id, faltasPaciente.registradaPor))
      .leftJoin(
        justificador,
        eq(justificador.id, faltasPaciente.justificadaPor),
      )
      .where(
        and(
          eq(faltasPaciente.casoId, casoId),
          eq(faltasPaciente.cicloAtendimento, ciclo),
        ),
      )
      .orderBy(asc(faltasPaciente.registradaEm));
    const chave = this.config.getOrThrow<string>('CHAVE_DADOS');
    return new Map(
      linhas.map((f) => [
        f.sessaoId,
        {
          id: f.id,
          origem: f.origem,
          registradaPor: f.registradaPor,
          registradaPeloPaciente: f.registradaPeloPaciente,
          registradaEm: f.registradaEm.toISOString(),
          justificada: f.justificada,
          motivo: comMotivo && f.motivo ? decifrar(f.motivo, chave) : null,
          justificadaPor: f.justificadaPor,
          justificadaEm: f.justificadaEm?.toISOString() ?? null,
          retiradaDaContagem: f.retiradaEm !== null,
        },
      ]),
    );
  }

  private cifrar(texto: string) {
    return cifrar(texto, this.config.getOrThrow<string>('CHAVE_DADOS'));
  }

  // A secretaria registra e justifica a falta de qualquer paciente; o estagiário
  // responsável, só a dos casos com vínculo vigente dele; o supervisor responsável,
  // quando permitido, só a dos casos com atribuição vigente dele. Sem permissão, 403
  // sem dado da sessão.
  private async exigirResponsavel(
    tx: Transacao,
    casoId: string,
    usuario: UsuarioAutenticado,
    perfis: ('secretaria' | 'supervisor')[],
  ) {
    if (usuario.perfil === 'secretaria' && perfis.includes('secretaria'))
      return;
    if (usuario.perfil === 'estagiario') {
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
      if (vinculo) return;
    }
    if (usuario.perfil === 'supervisor' && perfis.includes('supervisor')) {
      const [atribuicao] = await tx
        .select({ id: atribuicoesSupervisor.id })
        .from(atribuicoesSupervisor)
        .where(
          and(
            eq(atribuicoesSupervisor.casoId, casoId),
            eq(atribuicoesSupervisor.supervisorId, usuario.id),
            eq(atribuicoesSupervisor.vigente, true),
          ),
        );
      if (atribuicao) return;
    }
    throw new ForbiddenException(SEM_PERMISSAO);
  }
}
