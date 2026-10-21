import { Global, Module } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';

@Global()
@Module({ providers: [AuditoriaService], exports: [AuditoriaService] })
export class AuditoriaModule {}
