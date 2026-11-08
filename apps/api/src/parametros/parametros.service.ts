import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { parametros, type Db } from '@clinica/database';
import { PARAMETROS_PADRAO, type ChaveParametro } from '@clinica/shared';
import type { Transacao } from '../auditoria/auditoria.service';
import { DB } from '../database/database.module';

// Parâmetro alterado pela coordenação, com o valor padrão como reserva. Fora da
// classe para quem não injeta o serviço, como o prontuário (RF15).
export async function numeroDoParametro(
  banco: Db | Transacao,
  chave: ChaveParametro,
): Promise<number> {
  const [linha] = await banco
    .select({ valor: parametros.valor })
    .from(parametros)
    .where(eq(parametros.chave, chave));
  const valor = Number(linha?.valor);
  return Number.isFinite(valor) && linha ? valor : PARAMETROS_PADRAO[chave];
}

@Injectable()
export class ParametrosService {
  constructor(@Inject(DB) private readonly db: Db) {}

  numero(chave: ChaveParametro): Promise<number> {
    return numeroDoParametro(this.db, chave);
  }
}
