import { Module } from '@nestjs/common';
import { FilaModule } from '../fila/fila.module';
import { AssiduidadeModule } from '../assiduidade/assiduidade.module';
import { CasosController } from './casos.controller';
import { CasosService } from './casos.service';

@Module({
  imports: [AssiduidadeModule, FilaModule],
  controllers: [CasosController],
  providers: [CasosService],
})
export class CasosModule {}
