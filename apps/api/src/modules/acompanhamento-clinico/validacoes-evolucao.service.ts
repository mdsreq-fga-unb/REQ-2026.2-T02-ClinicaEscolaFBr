import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import {
  atribuicoesSupervisor,
  complementosEvolucao,
  correcoesEvolucao,
  evolucoes,
  usuarios,
  validacoesEvolucao,
  type Db,
} from '@clinica/database';
import {
  situacaoDaValidacao,
  type MudancaDaEvolucao,
  type ValidacaoEvolucao,
} from '@clinica/shared';
import {
  AuditoriaService,
  type Transacao,
} from '../../auditoria/auditoria.service';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { DB } from '../../database/database.module';
import { PoliticaProntuario } from './politica-prontuario';
import { travarEvolucao } from './trava-evolucao';

// Situação da validação de cada evolução (RF67), pelas datas das validações, das
// correções (RF29) e dos complementos (RF30).
export async function validacoesDasEvolucoes(
  banco: Db | Transacao,
  evolucaoIds: string[],
) {
  const situacoes = new Map<string, ValidacaoEvolucao<Date>>();
  if (evolucaoIds.length === 0) return situacoes;
  const validacoes = await banco
    .select({
      evolucaoId: validacoesEvolucao.evolucaoId,
      por: usuarios.nome,
      em: validacoesEvolucao.validadaEm,
    })
    .from(validacoesEvolucao)
    .innerJoin(usuarios, eq(usuarios.id, validacoesEvolucao.validadaPor))
    .where(inArray(validacoesEvolucao.evolucaoId, evolucaoIds))
    .orderBy(desc(validacoesEvolucao.validadaEm));
  const correcoes = await banco
    .select({
      evolucaoId: correcoesEvolucao.evolucaoId,
      em: correcoesEvolucao.corrigidaEm,
    })
    .from(correcoesEvolucao)
    .where(inArray(correcoesEvolucao.evolucaoId, evolucaoIds));
  const complementos = await banco
    .select({
      evolucaoId: complementosEvolucao.evolucaoId,
      em: complementosEvolucao.registradoEm,
    })
    .from(complementosEvolucao)
    .where(inArray(complementosEvolucao.evolucaoId, evolucaoIds));
  for (const id of evolucaoIds) {
    const da = (linha: { evolucaoId: string }) => linha.evolucaoId === id;
    const mudancas: MudancaDaEvolucao<Date>[] = [
      ...correcoes
        .filter(da)
        .map(({ em }) => ({ tipo: 'correcao' as const, em })),
      ...complementos
        .filter(da)
        .map(({ em }) => ({ tipo: 'complemento' as const, em })),
    ];
    situacoes.set(
      id,
      situacaoDaValidacao(
        validacoes.filter(da).map(({ por, em }) => ({ por, em })),
        mudancas,
      ),
    );
  }
  return situacoes;
}

// Validação da evolução pelo supervisor do caso (RF67).
@Injectable()
export class ValidacoesEvolucaoService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly politica: PoliticaProntuario,
    private readonly auditoria: AuditoriaService,
  ) {}

  // Só o supervisor com a atribuição vigente no caso valida: os demais recebem 403,
  // igual para prontuário inexistente (RNF25). Já validada e sem mudança depois: 409.
  async validar(
    prontuarioId: string,
    evolucaoId: string,
    usuario: UsuarioAutenticado,
  ) {
    const prontuario = await this.politica.exigirAcesso(
      usuario,
      prontuarioId,
      'validar_evolucao',
      'escrita',
      usuario.perfil === 'supervisor',
    );
    const [evolucao] = await this.db
      .select({ id: evolucoes.id })
      .from(evolucoes)
      .where(
        and(
          eq(evolucoes.id, evolucaoId),
          eq(evolucoes.prontuarioId, prontuarioId),
        ),
      );
    if (!evolucao) throw new NotFoundException('Evolução não encontrada.');

    return this.db.transaction(async (tx) => {
      // A mesma trava das correções e dos complementos: nenhum entra entre a leitura
      // da situação e a validação.
      await travarEvolucao(tx, evolucaoId);
      const [atribuicao] = await tx
        .select({ id: atribuicoesSupervisor.id })
        .from(atribuicoesSupervisor)
        .where(
          and(
            eq(atribuicoesSupervisor.casoId, prontuario.casoId),
            eq(atribuicoesSupervisor.supervisorId, usuario.id),
            eq(atribuicoesSupervisor.vigente, true),
          ),
        );
      if (!atribuicao)
        throw new ForbiddenException('Você não tem acesso a este prontuário.');
      const atual = (await validacoesDasEvolucoes(tx, [evolucaoId])).get(
        evolucaoId,
      )!;
      if (atual.situacao === 'validada')
        throw new ConflictException({
          message: 'Esta evolução já está validada.',
          validacao: atual,
        });
      const [registro] = await tx
        .insert(validacoesEvolucao)
        .values({
          evolucaoId,
          validadaPor: usuario.id,
          // Depois da trava, e não o início da transação.
          validadaEm: sql`clock_timestamp()`,
        })
        .returning({
          id: validacoesEvolucao.id,
          em: validacoesEvolucao.validadaEm,
        });
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          operacao: 'validar_evolucao_sessao',
          entidade: 'validacoes_evolucao',
          entidadeId: registro.id,
          dadosNovos: { evolucaoId },
        },
        tx,
      );
      return {
        id: registro.id,
        evolucaoId,
        situacao: 'validada' as const,
        ultima: { por: usuario.nome, em: registro.em },
        mudanca: null,
      };
    });
  }
}
