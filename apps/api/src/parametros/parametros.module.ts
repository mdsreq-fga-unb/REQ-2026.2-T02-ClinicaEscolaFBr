import { Global, Module } from '@nestjs/common';
import { ParametrosService } from './parametros.service';

@Global()
@Module({ providers: [ParametrosService], exports: [ParametrosService] })
export class ParametrosModule {}
