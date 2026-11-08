import { Module } from '@nestjs/common';
import { DesligamentosController } from './desligamentos.controller';
import { DesligamentosService } from './desligamentos.service';
import { FaltasController } from './faltas.controller';
import { FaltasService } from './faltas.service';

// Controle de assiduidade e alertas (CP9).
@Module({
  controllers: [FaltasController, DesligamentosController],
  providers: [FaltasService, DesligamentosService],
  exports: [FaltasService, DesligamentosService],
})
export class AssiduidadeModule {}
