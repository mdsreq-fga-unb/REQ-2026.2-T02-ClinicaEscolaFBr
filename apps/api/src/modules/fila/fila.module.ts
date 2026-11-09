import { Module } from '@nestjs/common';
import { FilaController } from './fila.controller';
import { FilaService } from './fila.service';
@Module({
  controllers: [FilaController],
  providers: [FilaService],
  exports: [FilaService],
})
export class FilaModule {}
