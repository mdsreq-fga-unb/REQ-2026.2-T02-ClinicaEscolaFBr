import { Inject, Injectable } from '@nestjs/common';
import { auditoria, type Db } from '@clinica/database';
import { DB } from '../database/database.module';

type Evento = typeof auditoria.$inferInsert;
export type Transacao = Parameters<Parameters<Db['transaction']>[0]>[0];

@Injectable()
export class AuditoriaService {
  constructor(@Inject(DB) private readonly db: Db) {}

  // Dentro de uma transação, o registro entra junto com a operação auditada.
  async registrar(evento: Evento, tx?: Transacao) {
    await (tx ?? this.db).insert(auditoria).values(evento);
  }
}
