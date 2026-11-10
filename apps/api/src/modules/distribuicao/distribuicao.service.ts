import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { casos, transferenciasCasos } from '@clinica/database';
import { TransferirCasoDto } from '@clinica/shared';

@Injectable()
export class DistribuicaoService {
  // Substitua 'DATABASE_CONNECTION' pelo token real de injeção de dependência usado no seu projeto
  constructor(@Inject('DATABASE_CONNECTION') private readonly db: any) {}

  async transferirCaso(
    dto: TransferirCasoDto,
    usuarioLogadoId: string,
    perfilUsuario: string,
  ) {
    if (!['SUPERVISOR', 'COORDENACAO'].includes(perfilUsuario)) {
      throw new ForbiddenException(
        'Apenas supervisores ou coordenação podem transferir casos.',
      );
    }

    const caso = await this.db.query.casos.findFirst({
      where: eq(casos.id, dto.casoId),
    });

    if (!caso) {
      throw new NotFoundException('Caso não encontrado.');
    }

    return await this.db.transaction(async (tx: any) => {
      const estagiarioOrigemId = caso.estagiarioResponsavelId;

      await tx
        .update(casos)
        .set({ estagiarioResponsavelId: dto.estagiarioDestinoId })
        .where(eq(casos.id, dto.casoId));

      const [transferencia] = await tx
        .insert(transferenciasCasos)
        .values({
          casoId: dto.casoId,
          estagiarioOrigemId,
          estagiarioDestinoId: dto.estagiarioDestinoId,
          autorizadoPorId: usuarioLogadoId,
          motivo: dto.motivo,
        })
        .returning();

      return transferencia;
    });
  }
}
