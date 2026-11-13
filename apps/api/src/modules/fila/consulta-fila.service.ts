import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { casos, inscricoes, type Db } from '@clinica/database';
import type { SituacaoInscricao } from '@clinica/shared';
import { eq } from 'drizzle-orm';
import { DB } from '../../database/database.module';
import { AuditoriaService } from '../../auditoria/auditoria.service';
@Injectable()
export class ConsultaFilaService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly auditoria: AuditoriaService,
  ) {}
  async consultar(
    alvo: { id: string } | { numero: string },
    usuarioId?: string,
  ): Promise<SituacaoInscricao> {
    return this.db.transaction(
      async (tx) => {
        const [inscricao] = await tx
          .select({
            id: inscricoes.id,
            numero: inscricoes.numero,
            situacao: casos.situacao,
          })
          .from(inscricoes)
          .leftJoin(casos, eq(casos.inscricaoId, inscricoes.id))
          .where(
            'id' in alvo
              ? eq(inscricoes.id, alvo.id)
              : eq(inscricoes.numero, alvo.numero),
          );
        if (!inscricao)
          throw new NotFoundException(
            'Inscrição não encontrada. Confira o número informado.',
          );
        const estado = inscricao.situacao;
        // DF55: a consulta informa só a situação; a ordenação permanece interna ao RF7.
        const situacao: SituacaoInscricao['situacao'] =
          estado === 'em_atendimento'
            ? 'em_atendimento'
            : estado === 'encerrado' || estado === 'desligado_por_faltas'
              ? 'procure_secretaria'
              : 'em_triagem';
        await this.auditoria.registrar(
          {
            usuarioId: usuarioId ?? null,
            operacao: 'consultar_situacao_inscricao',
            entidade: 'inscricoes',
            entidadeId: inscricao.id,
            dadosNovos: { origem: usuarioId ? 'secretaria' : 'paciente' },
          },
          tx,
        );
        return {
          numero: inscricao.numero,
          situacao,
          consultadaEm: new Date().toISOString(),
        };
      },
      { isolationLevel: 'repeatable read' },
    );
  }
}
