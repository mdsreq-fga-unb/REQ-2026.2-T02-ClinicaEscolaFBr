import { Module } from '@nestjs/common';
import { AdministrativoModule } from '../administrativo/administrativo.module';
import { FilaModule } from '../fila/fila.module';
import { AssiduidadeModule } from '../assiduidade/assiduidade.module';
import { CasosController } from './casos.controller';
import { CasosService } from './casos.service';
import { TransferenciaService } from './transferencia.service';

@Module({
  imports: [AssiduidadeModule, FilaModule, AdministrativoModule],
  controllers: [CasosController],
  providers: [CasosService, TransferenciaService],
})
export class CasosModule {}
