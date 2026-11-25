import { Module } from '@nestjs/common';
import { FilaModule } from '../fila/fila.module';
import { DesligamentosController } from './desligamentos.controller';
import { DesligamentosService } from './desligamentos.service';
import { FaltasEstagiarioController } from './faltas-estagiario.controller';
import { FaltasEstagiarioService } from './faltas-estagiario.service';
import { FaltasSemestreService } from './faltas-semestre.service';
import { SinalizacoesController } from './sinalizacoes.controller';
import { SinalizacoesService } from './sinalizacoes.service';
import { FaltasController } from './faltas.controller';
import { FaltasService } from './faltas.service';

// Controle de assiduidade e alertas (CP9).
@Module({
  imports: [FilaModule],
  controllers: [
    FaltasController,
    DesligamentosController,
    FaltasEstagiarioController,
    SinalizacoesController,
  ],
  providers: [
    FaltasService,
    DesligamentosService,
    FaltasEstagiarioService,
    FaltasSemestreService,
    SinalizacoesService,
  ],
  exports: [FaltasService, DesligamentosService],
})
export class AssiduidadeModule {}
