import { Module } from '@nestjs/common';
import { CasosModule } from '../casos/casos.module';
import { RevogacaoController } from './revogacao.controller';
import { RevogacaoService } from './revogacao.service';
import { TermoController } from './termo.controller';
import { TermoService } from './termo.service';
import { InscricaoController } from './inscricao.controller';
import { InscricaoService } from './inscricao.service';

@Module({
  imports: [CasosModule],
  controllers: [InscricaoController, TermoController, RevogacaoController],
  providers: [InscricaoService, TermoService, RevogacaoService],
})
export class InscricaoModule {}
