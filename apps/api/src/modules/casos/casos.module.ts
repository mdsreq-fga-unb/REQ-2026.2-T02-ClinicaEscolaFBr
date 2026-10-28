import { Module } from '@nestjs/common';
import { CasosController } from './casos.controller';
import { CasosService } from './casos.service';

@Module({
  controllers: [CasosController],
  providers: [CasosService],
})
export class CasosModule {}
