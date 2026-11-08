import { Module } from '@nestjs/common';
import { AssiduidadeModule } from '../assiduidade/assiduidade.module';
import { CasosController } from './casos.controller';
import { CasosService } from './casos.service';

@Module({
  imports: [AssiduidadeModule],
  controllers: [CasosController],
  providers: [CasosService],
})
export class CasosModule {}
