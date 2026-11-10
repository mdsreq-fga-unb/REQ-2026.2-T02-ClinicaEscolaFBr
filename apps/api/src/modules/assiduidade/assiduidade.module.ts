import { Module } from '@nestjs/common';
import { FilaModule } from '../fila/fila.module';
import { DesligamentosController } from './desligamentos.controller';
import { DesligamentosService } from './desligamentos.service';
import { FaltasController } from './faltas.controller';
import { FaltasService } from './faltas.service';

// Controle de assiduidade e alertas (CP9).
@Module({
  imports: [FilaModule],
  controllers: [FaltasController, DesligamentosController],
  providers: [FaltasService, DesligamentosService],
  exports: [FaltasService, DesligamentosService],
})
export class AssiduidadeModule {}
