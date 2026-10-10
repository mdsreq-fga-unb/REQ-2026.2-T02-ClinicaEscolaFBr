import { Controller, Get, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Db } from '@clinica/database';
import { DB } from '../database/database.module';

@Controller('health')
export class HealthController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get()
  async verificar() {
    await this.db.execute(sql`select 1`);
    return { status: 'ok' };
  }
}
