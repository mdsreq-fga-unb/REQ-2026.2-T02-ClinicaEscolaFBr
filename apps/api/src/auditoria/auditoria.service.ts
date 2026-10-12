import { Inject, Injectable } from '@nestjs/common';
import { auditoria, type Db } from '@clinica/database';
import { DB } from '../database/database.module';

type Evento = typeof auditoria.$inferInsert;

@Injectable()
export class AuditoriaService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async registrar(evento: Evento) {
    await this.db.insert(auditoria).values(evento);
  }
}
