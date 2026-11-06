import { Module } from '@nestjs/common';
import { FaltasController } from './faltas.controller';
import { FaltasService } from './faltas.service';

// Controle de assiduidade e alertas (CP9).
@Module({
  controllers: [FaltasController],
  providers: [FaltasService],
  exports: [FaltasService],
})
export class AssiduidadeModule {}
