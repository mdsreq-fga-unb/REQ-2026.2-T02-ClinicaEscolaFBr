import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  casos,
  sessoesAtendimento,
  usuarios,
  type Db,
} from '@clinica/database';
import type { SessaoComPresenca } from '@clinica/shared';
import { and, desc, eq, type SQL } from 'drizzle-orm';
import { DB } from '../../database/database.module';

// Sessões com presença registrada (RF44): só as de status "realizada", de todos
// os ciclos de atendimento, da mais recente para a mais antiga. A resposta tem só
// a data e o horário de início e o nome do estagiário, sem dado clínico.
@Injectable()
export class DeclaracoesService {
  constructor(@Inject(DB) private readonly db: Db) {}

  // Rota do paciente ou do responsável: só a inscrição liberada pela
  // verificação de identidade (RF52, RNF6). Sem caso, a lista é vazia.
  sessoesDaInscricao(inscricaoId: string): Promise<SessaoComPresenca[]> {
    return this.listar(eq(casos.inscricaoId, inscricaoId));
  }

  // Rota da secretaria, para a ficha do paciente.
  async sessoesDoCaso(casoId: string): Promise<SessaoComPresenca[]> {
    const [caso] = await this.db
      .select({ id: casos.id })
      .from(casos)
      .where(eq(casos.id, casoId));
    if (!caso) throw new NotFoundException('Paciente não encontrado.');
    return this.listar(eq(casos.id, casoId));
  }

  private async listar(filtro: SQL): Promise<SessaoComPresenca[]> {
    const linhas = await this.db
      .select({
        inicio: sessoesAtendimento.inicio,
        estagiario: usuarios.nome,
      })
      .from(sessoesAtendimento)
      .innerJoin(casos, eq(casos.id, sessoesAtendimento.casoId))
      .innerJoin(usuarios, eq(usuarios.id, sessoesAtendimento.estagiarioId))
      .where(and(filtro, eq(sessoesAtendimento.status, 'realizada')))
      .orderBy(desc(sessoesAtendimento.inicio));
    return linhas.map((s) => ({
      inicio: s.inicio.toISOString(),
      estagiario: s.estagiario,
    }));
  }
}
