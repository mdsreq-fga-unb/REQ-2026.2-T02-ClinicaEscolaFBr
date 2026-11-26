import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  acessosProntuario,
  casos,
  inscricoes,
  prontuarios,
  usuarios,
  type Db,
} from '@clinica/database';
import {
  TAMANHO_PAGINA_ACESSOS,
  type FiltroAcessos,
  type ListaAcessosProntuario,
  type OperacaoAcesso,
} from '@clinica/shared';
import { and, count, desc, eq, gte, ilike, lt } from 'drizzle-orm';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { DB } from '../../database/database.module';

// Nomes gravados pela política, inclusive os legados. Novas operações devem ser
// classificadas aqui na mesma PR que as introduzir (projeto RF56, #251).
export const OPERACOES_PRONTUARIO: Record<
  string,
  Exclude<OperacaoAcesso, 'acesso_negado'>
> = {
  consultar_prontuario: 'visualizacao',
  consultar_historico_evolucoes: 'visualizacao',
  registrar_dados_iniciais: 'criacao',
  registrar_anamnese: 'criacao',
  registrar_contrato: 'criacao',
  registrar_evolucao: 'criacao',
  marcar_sessao_realizada: 'alteracao',
  corrigir_evolucao: 'alteracao',
  complementar_evolucao: 'criacao',
  validar_evolucao: 'alteracao',
  // Relatório final (RF33): a consulta e a página de impressão são leitura; a
  // impressão e a entrega criam registros.
  consultar_relatorio_final: 'visualizacao',
  abrir_impressao_relatorio_final: 'visualizacao',
  imprimir_relatorio_final: 'criacao',
  registrar_entrega_relatorio_final: 'criacao',
  // Elaboração, envio e decisão do relatório final (RF33).
  consultar_elaboracao_relatorio_final: 'visualizacao',
  salvar_rascunho_relatorio_final: 'alteracao',
  enviar_relatorio_final: 'criacao',
  decidir_relatorio_final: 'alteracao',
};

export function tipoDeAcesso(
  operacao: string,
  permitido: boolean,
): OperacaoAcesso {
  if (!permitido) return 'acesso_negado';
  const tipo = Object.hasOwn(OPERACOES_PRONTUARIO, operacao)
    ? OPERACOES_PRONTUARIO[operacao]
    : undefined;
  if (!tipo)
    throw new InternalServerErrorException(
      'Não foi possível classificar o registro de acesso.',
    );
  return tipo;
}

// % e _ digitados são caracteres do nome, não curingas da pesquisa SQL.
const trecho = (nome: string) => `%${nome.replace(/[\\%_]/g, '\\$&')}%`;

@Injectable()
export class AcessosProntuarioService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly auditoria: AuditoriaService,
  ) {}

  async consultar(
    filtro: FiltroAcessos,
    usuarioId: string,
  ): Promise<ListaAcessosProntuario> {
    const fimExclusivo = filtro.fim
      ? new Date(`${filtro.fim}T00:00:00-03:00`)
      : undefined;
    if (fimExclusivo) fimExclusivo.setUTCDate(fimExclusivo.getUTCDate() + 1);
    const condicao = and(
      filtro.pacienteId ? eq(inscricoes.id, filtro.pacienteId) : undefined,
      filtro.usuarioId
        ? eq(acessosProntuario.usuarioId, filtro.usuarioId)
        : undefined,
      filtro.paciente
        ? ilike(inscricoes.nomeCompleto, trecho(filtro.paciente))
        : undefined,
      filtro.usuario ? ilike(usuarios.nome, trecho(filtro.usuario)) : undefined,
      filtro.inicio
        ? gte(
            acessosProntuario.criadoEm,
            new Date(`${filtro.inicio}T00:00:00-03:00`),
          )
        : undefined,
      fimExclusivo ? lt(acessosProntuario.criadoEm, fimExclusivo) : undefined,
    );
    return this.db.transaction(
      async (tx) => {
        // Projeção explícita: nenhuma coluna clínica é carregada nem decifrada.
        const linhas = await tx
          .select({
            id: acessosProntuario.id,
            dataHora: acessosProntuario.criadoEm,
            usuario: usuarios.nome,
            perfil: acessosProntuario.perfil,
            paciente: inscricoes.nomeCompleto,
            operacao: acessosProntuario.operacao,
            permitido: acessosProntuario.permitido,
          })
          .from(acessosProntuario)
          .innerJoin(usuarios, eq(usuarios.id, acessosProntuario.usuarioId))
          .leftJoin(
            prontuarios,
            eq(prontuarios.id, acessosProntuario.prontuarioId),
          )
          .leftJoin(casos, eq(casos.id, prontuarios.casoId))
          .leftJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
          .where(condicao)
          .orderBy(desc(acessosProntuario.criadoEm), desc(acessosProntuario.id))
          .limit(TAMANHO_PAGINA_ACESSOS)
          .offset((filtro.pagina - 1) * TAMANHO_PAGINA_ACESSOS);
        const [contagem] = await tx
          .select({ total: count() })
          .from(acessosProntuario)
          .innerJoin(usuarios, eq(usuarios.id, acessosProntuario.usuarioId))
          .leftJoin(
            prontuarios,
            eq(prontuarios.id, acessosProntuario.prontuarioId),
          )
          .leftJoin(casos, eq(casos.id, prontuarios.casoId))
          .leftJoin(inscricoes, eq(inscricoes.id, casos.inscricaoId))
          .where(condicao);
        const acessos = linhas.map(
          ({ permitido, operacao, dataHora, ...linha }) => ({
            ...linha,
            dataHora: dataHora.toISOString(),
            operacao: tipoDeAcesso(operacao, permitido),
          }),
        );
        await this.auditoria.registrar(
          {
            usuarioId,
            operacao: 'consultar_registro_acessos',
            entidade: 'acessos_prontuario',
            dadosNovos: { pagina: filtro.pagina, total: contagem.total },
          },
          tx,
        );
        return {
          acessos,
          total: contagem.total,
          pagina: filtro.pagina,
          tamanhoPagina: TAMANHO_PAGINA_ACESSOS,
        };
      },
      { isolationLevel: 'repeatable read' },
    );
  }
}
