import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { versoesTermo, type Db } from '@clinica/database';
import type { TermoVigente } from '@clinica/shared';
import { desc, lte, sql } from 'drizzle-orm';
import { DB } from '../../database/database.module';
@Injectable()
export class TermoService {
  constructor(@Inject(DB) private readonly db: Db) {}
  async vigente(db: Pick<Db, 'select'> = this.db): Promise<TermoVigente> {
    const [termo] = await db
      .select()
      .from(versoesTermo)
      .where(lte(versoesTermo.vigenteDesde, sql`current_timestamp`))
      .orderBy(desc(versoesTermo.vigenteDesde), desc(versoesTermo.versao))
      .limit(1);
    if (!termo)
      throw new ServiceUnavailableException(
        'O termo está indisponível. Tente novamente mais tarde.',
      );
    return { ...termo, vigenteDesde: termo.vigenteDesde.toISOString() };
  }
}
