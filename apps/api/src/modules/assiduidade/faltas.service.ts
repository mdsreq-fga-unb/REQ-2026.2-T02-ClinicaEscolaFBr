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
  asc,
  count,
  eq,
  inArray,
  isNull,
  max,
  notInArray,
} from 'drizzle-orm';
import {
  atribuicoesSupervisor,
  casos,
  faltasPaciente,
  inscricoes,
  prontuarios,
  sessoesAtendimento,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import {
  LIMITE_FALTAS_CICLO,
  STATUS_SESSAO_EM_ABERTO,
  type AlertaFaltas,
  type AlertasFaltas,
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
const retirador = aliasedTable(usuarios, 'retirador');

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
        contagem: await this.contar(sessao.casoId, tx, sessao.ciclo),
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
    return this.contar(sessao.casoId, tx, sessao.ciclo);
  }

  // RF35: faltas de um ciclo, consecutivas ou não, sem as retiradas da contagem na
  // reversão (RF38). A justificativa não muda a contagem. Sem o ciclo, conta o
  // vigente do caso; o prontuário e o registro da falta passam o ciclo deles.
  async contar(
    casoId: string,
    tx?: Transacao,
    ciclo?: number,
  ): Promise<ContagemFaltas> {
    const banco = tx ?? this.db;
    const [{ total }] = await banco
      .select({ total: count() })
      .from(faltasPaciente)
      .innerJoin(casos, eq(casos.id, faltasPaciente.casoId))
      .where(
        and(
          eq(faltasPaciente.casoId, casoId),
          eq(faltasPaciente.cicloAtendimento, ciclo ?? casos.cicloAtendimento),
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
        retiradaPor: retirador.nome,
        retiradaEm: faltasPaciente.retiradaEm,
      })
      .from(faltasPaciente)
      .leftJoin(registrador, eq(registrador.id, faltasPaciente.registradaPor))
      .leftJoin(retirador, eq(retirador.id, faltasPaciente.retiradaPor))
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
          retiradaPor: f.retiradaPor,
          retiradaEm: f.retiradaEm?.toISOString() ?? null,
        },
      ]),
    );
  }

  // RF36: casos em atendimento com o limite de faltas atingido no ciclo, para a
  // secretaria e a coordenação (todos) e o estagiário (só os casos dele). À parte, o
  // aviso da 1ª falta (RF35), só para a secretaria e o estagiário responsável, até a
  // sessão seguinte do paciente terminar. Sem tabela: o alerta existe enquanto a
  // condição vale, e some quando o desligamento (RF37) tira o caso do atendimento.
  async alertas(usuario: UsuarioAutenticado): Promise<AlertasFaltas> {
    const vazio = { limite: [], primeiraFalta: [] };
    if (usuario.perfil === 'supervisor') return vazio;
    const contagens = await this.db
      .select({
        casoId: faltasPaciente.casoId,
        faltas: count(),
        ultimaFalta: max(sessoesAtendimento.inicio),
      })
      .from(faltasPaciente)
      .innerJoin(
        casos,
        and(
          eq(casos.id, faltasPaciente.casoId),
          eq(casos.cicloAtendimento, faltasPaciente.cicloAtendimento),
        ),
      )
      .innerJoin(
        sessoesAtendimento,
        eq(sessoesAtendimento.id, faltasPaciente.sessaoId),
      )
      .where(
        and(
          isNull(faltasPaciente.retiradaEm),
          eq(casos.situacao, 'em_atendimento'),
          usuario.perfil === 'estagiario'
            ? inArray(
                faltasPaciente.casoId,
                this.db
                  .select({ casoId: vinculosEstagiario.casoId })
                  .from(vinculosEstagiario)
                  .where(
                    and(
                      eq(vinculosEstagiario.estagiarioId, usuario.id),
                      eq(vinculosEstagiario.vigente, true),
                    ),
                  ),
              )
            : undefined,
        ),
      )
      .groupBy(faltasPaciente.casoId);

    const noLimite = contagens.filter((c) => c.faltas >= LIMITE_FALTAS_CICLO);
    let naPrimeira =
      usuario.perfil === 'coordenacao'
        ? []
        : contagens.filter((c) => c.faltas === 1);
    // A 1ª falta deixa de avisar quando a sessão seguinte termina: realizada, com
    // falta ou cancelada.
    if (naPrimeira.length) {
      const encerradas = await this.db
        .select({
          casoId: sessoesAtendimento.casoId,
          inicio: sessoesAtendimento.inicio,
        })
        .from(sessoesAtendimento)
        .where(
          and(
            inArray(
              sessoesAtendimento.casoId,
              naPrimeira.map((c) => c.casoId),
            ),
            notInArray(sessoesAtendimento.status, STATUS_SESSAO_EM_ABERTO),
          ),
        );
      naPrimeira = naPrimeira.filter(
        (c) =>
          !encerradas.some(
            (s) => s.casoId === c.casoId && s.inicio > c.ultimaFalta!,
          ),
      );
    }

    const casoIds = [...noLimite, ...naPrimeira].map((c) => c.casoId);
    if (casoIds.length === 0) return vazio;
    const dados = await this.db
      .select({
        casoId: casos.id,
        nome: inscricoes.nomeCompleto,
        prontuarioId: prontuarios.id,
      })
      .from(casos)
      .innerJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
      .leftJoin(
        prontuarios,
        and(
          eq(prontuarios.casoId, casos.id),
          eq(prontuarios.cicloAtendimento, casos.cicloAtendimento),
        ),
      )
      .where(inArray(casos.id, casoIds));
    const alerta = (c: (typeof contagens)[number]): AlertaFaltas => {
      const caso = dados.find((d) => d.casoId === c.casoId)!;
      return {
        casoId: c.casoId,
        nome: caso.nome,
        faltas: c.faltas,
        ultimaFalta: c.ultimaFalta!.toISOString(),
        prontuarioId: caso.prontuarioId,
      };
    };
    const porNome = (a: AlertaFaltas, b: AlertaFaltas) =>
      a.nome.localeCompare(b.nome, 'pt-BR');
    return {
      limite: noLimite.map(alerta).sort(porNome),
      primeiraFalta: naPrimeira.map(alerta).sort(porNome),
    };
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
    if (!(await this.ehResponsavel(tx, casoId, usuario, perfis)))
      throw new ForbiddenException(SEM_PERMISSAO);
  }

  // O que o usuário pode fazer com as faltas do caso, pela mesma regra das rotas,
  // para a tela mostrar só os botões que a API aceita.
  async acoesPermitidas(casoId: string, usuario: UsuarioAutenticado) {
    const [registrar, justificar] = await Promise.all([
      this.ehResponsavel(this.db, casoId, usuario, ['secretaria']),
      this.ehResponsavel(this.db, casoId, usuario, [
        'secretaria',
        'supervisor',
      ]),
    ]);
    return { registrar, justificar };
  }

  private async ehResponsavel(
    banco: Db | Transacao,
    casoId: string,
    usuario: UsuarioAutenticado,
    perfis: ('secretaria' | 'supervisor')[],
  ): Promise<boolean> {
    if (usuario.perfil === 'secretaria' && perfis.includes('secretaria'))
      return true;
    if (usuario.perfil === 'estagiario') {
      const [vinculo] = await banco
        .select({ id: vinculosEstagiario.id })
        .from(vinculosEstagiario)
        .where(
          and(
            eq(vinculosEstagiario.casoId, casoId),
            eq(vinculosEstagiario.estagiarioId, usuario.id),
            eq(vinculosEstagiario.vigente, true),
          ),
        );
      if (vinculo) return true;
    }
    if (usuario.perfil === 'supervisor' && perfis.includes('supervisor')) {
      const [atribuicao] = await banco
        .select({ id: atribuicoesSupervisor.id })
        .from(atribuicoesSupervisor)
        .where(
          and(
            eq(atribuicoesSupervisor.casoId, casoId),
            eq(atribuicoesSupervisor.supervisorId, usuario.id),
            eq(atribuicoesSupervisor.vigente, true),
          ),
        );
      if (atribuicao) return true;
    }
    return false;
  }
}
