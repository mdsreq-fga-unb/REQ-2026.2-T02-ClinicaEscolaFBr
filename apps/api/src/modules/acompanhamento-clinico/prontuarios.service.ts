import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { aliasedTable, and, eq, gt, asc, desc, isNull } from 'drizzle-orm';
import {
  atribuicoesSupervisor,
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
import type { DadosIniciais } from '@clinica/shared';
import type { Evolucao } from '@clinica/shared';
import { DB } from '../../database/database.module';
import { PoliticaProntuario } from './politica-prontuario';

const estagiario = aliasedTable(usuarios, 'estagiario');
const supervisor = aliasedTable(usuarios, 'supervisor');

@Injectable()
export class ProntuariosService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly politica: PoliticaProntuario,
    private readonly config: ConfigService,
    private readonly auditoria: AuditoriaService,
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
    const [autorDadosIniciais] = prontuario.dadosIniciaisPor
      ? await this.db
          .select({ nome: usuarios.nome })
          .from(usuarios)
          .where(eq(usuarios.id, prontuario.dadosIniciaisPor))
      : [];
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
        status: sessoesAtendimento.status,
      })
      .from(sessoesAtendimento)
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
        registradaPor: evolucoes.registradaPor,
        registradaEm: evolucoes.registradaEm,
        autor: usuarios.nome,
      })
      .from(evolucoes)
      .innerJoin(usuarios, eq(usuarios.id, evolucoes.registradaPor))
      .where(eq(evolucoes.prontuarioId, id))
      .orderBy(asc(evolucoes.registradaEm));
    const sessoesRealizadas = sessoes.filter(
      (sessao) => sessao.status === 'realizada',
    ).length;
    return {
      id: prontuario.id,
      cicloAtendimento: prontuario.cicloAtendimento,
      criadoEm: prontuario.criadoEm,
      ...caso,
      dadosIniciais: {
        anamnese: abrir(prontuario.anamneseCifrada),
        contrato: abrir(prontuario.contratoCifrado),
        dataAssinaturaContrato: prontuario.dataAssinaturaContrato,
        registradoEm: prontuario.dadosIniciaisEm,
        registradoPor: autorDadosIniciais?.nome ?? null,
      },
      historicoResponsaveis: {
        estagiarios: historicoEstagiarios,
        supervisores: historicoSupervisores,
      },
      sessoes: sessoes.map((sessao) => ({
        ...sessao,
        evolucao: evolucoesRows.find((e) => e.sessaoId === sessao.id)
          ? (() => {
              const evolucao = evolucoesRows.find(
                (e) => e.sessaoId === sessao.id,
              )!;
              return {
                id: evolucao.id,
                queixa: abrir(evolucao.queixa),
                planejamento: abrir(evolucao.planejamento),
                registradaPor: evolucao.autor,
                registradaEm: evolucao.registradaEm,
              };
            })()
          : null,
      })),
      sessoesRealizadas,
      fechamentoAvaliativoPendente:
        sessoesRealizadas > 0 && sessoesRealizadas % 10 === 0,
      alta: null,
      relatorioFinal: null,
    };
  }

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
            eq(sessoesAtendimento.status, 'agendada'),
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
            eq(sessoesAtendimento.status, 'realizada'),
          ),
        )
        .for('update');
      if (!sessao)
        throw new NotFoundException(
          'Sessão realizada não encontrada neste ciclo.',
        );
      const [registro] = await tx
        .insert(evolucoes)
        .values({
          prontuarioId: id,
          sessaoId,
          queixaCifrada: cifrar(dados.queixa, chave),
          planejamentoCifrado: cifrar(dados.planejamento, chave),
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
      return { id: registro.id, registrada: true };
    });
  }

  async registrarDadosIniciais(
    id: string,
    dados: DadosIniciais,
    usuario: UsuarioAutenticado,
  ) {
    const prontuario = await this.politica.exigirAcesso(
      usuario,
      id,
      'registrar_dados_iniciais',
      'registro_estagiario',
    );
    const chave = this.config.getOrThrow<string>('CHAVE_DADOS');
    return this.db.transaction(async (tx) => {
      const [atualizado] = await tx
        .update(prontuarios)
        .set({
          anamneseCifrada: cifrar(dados.anamnese, chave),
          contratoCifrado: cifrar(dados.contrato, chave),
          dataAssinaturaContrato: dados.dataAssinaturaContrato,
          dadosIniciaisPor: usuario.id,
          dadosIniciaisEm: new Date(),
        })
        .where(
          and(
            eq(prontuarios.id, id),
            isNull(prontuarios.anamneseCifrada),
            isNull(prontuarios.contratoCifrado),
          ),
        )
        .returning({ id: prontuarios.id });
      if (!atualizado) {
        throw new ConflictException('Os dados iniciais já foram registrados.');
      }
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          operacao: 'registrar_dados_iniciais_prontuario',
          entidade: 'prontuarios',
          entidadeId: id,
          dadosNovos: { autorId: usuario.id },
        },
        tx,
      );
      return { registrado: true };
    });
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
          eq(sessoesAtendimento.status, 'agendada'),
          gt(sessoesAtendimento.inicio, new Date()),
        ),
      )
      .orderBy(asc(sessoesAtendimento.inicio))
      .limit(1);
    const dados = { ...caso, ...linha, proximaSessao: proxima?.inicio ?? null };
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
