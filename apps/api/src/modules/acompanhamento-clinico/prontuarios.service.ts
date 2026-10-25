import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { aliasedTable, and, eq, gt, asc, desc } from 'drizzle-orm';
import {
  atribuicoesSupervisor,
  casos,
  inscricoes,
  prontuarios,
  sessoesAtendimento,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import { decifrar } from '../../common/criptografia';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
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
      },
    };
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
