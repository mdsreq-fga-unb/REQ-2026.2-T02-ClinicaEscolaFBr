import { Module } from '@nestjs/common';
import { TermoController } from './termo.controller';
import { TermoService } from './termo.service';
import { InscricaoController } from './inscricao.controller';
import { InscricaoService } from './inscricao.service';

@Module({
  controllers: [InscricaoController, TermoController],
  providers: [InscricaoService, TermoService],
})
export class InscricaoModule {}
