import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { casos, inscricoes, type Db } from '@clinica/database';
import type { SituacaoInscricao } from '@clinica/shared';
import { eq } from 'drizzle-orm';
import { DB } from '../../database/database.module';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { FilaService } from './fila.service';
@Injectable()
export class ConsultaFilaService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly fila: FilaService,
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
        const situacao: SituacaoInscricao['situacao'] = !estado
          ? 'aguardando_triagem'
          : estado === 'em_atendimento'
            ? 'em_atendimento'
            : estado === 'encerrado' || estado === 'desligado_por_faltas'
              ? 'procure_secretaria'
              : 'na_fila';
        const posicao =
          situacao === 'na_fila'
            ? await this.fila.posicaoDaInscricao(inscricao.id, tx)
            : null;
        if (situacao === 'na_fila' && posicao === null)
          throw new ServiceUnavailableException(
            'Não foi possível consultar a situação. Tente novamente.',
          );
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
          posicao,
          consultadaEm: new Date().toISOString(),
        };
      },
      { isolationLevel: 'repeatable read' },
    );
  }
}
