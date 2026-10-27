import { Module } from '@nestjs/common';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import { CasosController } from './casos.controller';
import { CasosService } from './casos.service';

@Module({
  imports: [AuditoriaModule],
  controllers: [CasosController],
  providers: [CasosService],
})
export class CasosModule {}
