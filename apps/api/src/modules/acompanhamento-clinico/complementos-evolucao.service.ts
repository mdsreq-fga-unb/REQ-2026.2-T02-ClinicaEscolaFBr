import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import {
  casos,
  complementosEvolucao,
  evolucoes,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import {
  avisoSemComplemento,
  complementoEvolucaoSchema,
} from '@clinica/shared';
import {
  AuditoriaService,
  type Transacao,
} from '../../auditoria/auditoria.service';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { cifrar, decifrar } from '../../common/criptografia';
import { DB } from '../../database/database.module';
import { PoliticaProntuario } from './politica-prontuario';

type Complemento = {
  tipo: 'complemento';
  id: string;
  texto: string;
  autor: string;
  em: Date;
};

// Complementos das evoluções, abertos, por evolução e em ordem cronológica (RF30).
export async function complementosDasEvolucoes(
  banco: Db | Transacao,
  evolucaoIds: string[],
  chave: string,
) {
  const porEvolucao = new Map<string, Complemento[]>();
  if (evolucaoIds.length === 0) return porEvolucao;
  const linhas = await banco
    .select({
      id: complementosEvolucao.id,
      evolucaoId: complementosEvolucao.evolucaoId,
      texto: complementosEvolucao.textoCifrado,
      autor: usuarios.nome,
      em: complementosEvolucao.registradoEm,
    })
    .from(complementosEvolucao)
    .innerJoin(usuarios, eq(usuarios.id, complementosEvolucao.registradoPor))
    .where(inArray(complementosEvolucao.evolucaoId, evolucaoIds))
    .orderBy(
      asc(complementosEvolucao.registradoEm),
      asc(complementosEvolucao.id),
    );
  for (const { evolucaoId, texto, ...linha } of linhas) {
    const lista = porEvolucao.get(evolucaoId) ?? [];
    lista.push({
      tipo: 'complemento',
      ...linha,
      texto: decifrar(texto, chave),
    });
    porEvolucao.set(evolucaoId, lista);
  }
  return porEvolucao;
}

// Complemento de evolução da sessão (RF30).
@Injectable()
export class ComplementosEvolucaoService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly politica: PoliticaProntuario,
    private readonly config: ConfigService,
    private readonly auditoria: AuditoriaService,
  ) {}

  // Só o estagiário responsável, com vínculo vigente, registra: os demais recebem 403,
  // igual para prontuário inexistente (RNF25). Texto vazio ou acima do limite: 400, com
  // o campo. Caso fora de atendimento (alta, desligamento): 422, com a situação.
  async registrar(
    prontuarioId: string,
    evolucaoId: string,
    corpo: unknown,
    usuario: UsuarioAutenticado,
  ) {
    const prontuario = await this.politica.exigirAcesso(
      usuario,
      prontuarioId,
      'complementar_evolucao',
      'escrita',
      usuario.perfil === 'estagiario',
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
    const resultado = complementoEvolucaoSchema.safeParse(corpo);
    if (!resultado.success)
      throw new BadRequestException(resultado.error.issues);
    const { texto } = resultado.data;
    const chave = this.config.getOrThrow<string>('CHAVE_DADOS');

    return this.db.transaction(async (tx) => {
      // O caso fica travado e o vínculo é conferido de novo, para uma alta, um
      // desligamento ou uma transferência no meio não deixar passar o registro.
      const [caso] = await tx
        .select({ situacao: casos.situacao })
        .from(casos)
        .where(eq(casos.id, prontuario.casoId))
        .for('update');
      const aviso = avisoSemComplemento(caso.situacao);
      if (aviso)
        throw new UnprocessableEntityException({
          message: aviso,
          situacao: caso.situacao,
        });
      const [vinculo] = await tx
        .select({ id: vinculosEstagiario.id })
        .from(vinculosEstagiario)
        .where(
          and(
            eq(vinculosEstagiario.casoId, prontuario.casoId),
            eq(vinculosEstagiario.estagiarioId, usuario.id),
            eq(vinculosEstagiario.vigente, true),
          ),
        );
      if (!vinculo)
        throw new ForbiddenException('Você não tem acesso a este prontuário.');
      const [registro] = await tx
        .insert(complementosEvolucao)
        .values({
          evolucaoId,
          textoCifrado: cifrar(texto, chave),
          registradoPor: usuario.id,
          // O instante da gravação, e não o do início da transação, que pode ter
          // esperado a trava do caso: a ordem dos complementos é a real.
          registradoEm: sql`clock_timestamp()`,
        })
        .returning({
          id: complementosEvolucao.id,
          em: complementosEvolucao.registradoEm,
        });
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          operacao: 'complementar_evolucao_sessao',
          entidade: 'complementos_evolucao',
          entidadeId: registro.id,
          dadosNovos: { evolucaoId },
        },
        tx,
      );
      return {
        tipo: 'complemento' as const,
        id: registro.id,
        evolucaoId,
        texto,
        autor: usuario.nome,
        em: registro.em,
      };
    });
  }
}
