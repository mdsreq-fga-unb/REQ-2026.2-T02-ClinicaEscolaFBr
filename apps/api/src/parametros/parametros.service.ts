import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { parametros, type Db } from '@clinica/database';
import { PARAMETROS_PADRAO, type ChaveParametro } from '@clinica/shared';
import { DB } from '../database/database.module';

// Lê os parâmetros alterados pela coordenação, com o valor padrão como reserva.
@Injectable()
export class ParametrosService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async numero(chave: ChaveParametro): Promise<number> {
    const [linha] = await this.db
      .select({ valor: parametros.valor })
      .from(parametros)
      .where(eq(parametros.chave, chave));
    const valor = Number(linha?.valor);
    return Number.isFinite(valor) && linha ? valor : PARAMETROS_PADRAO[chave];
  }
}
