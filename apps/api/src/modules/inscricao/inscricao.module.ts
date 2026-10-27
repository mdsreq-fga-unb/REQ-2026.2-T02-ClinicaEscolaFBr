import { Module } from '@nestjs/common';
import { InscricaoController } from './inscricao.controller';
import { InscricaoService } from './inscricao.service';

@Module({ controllers: [InscricaoController], providers: [InscricaoService] })
export class InscricaoModule {}
