import { Module } from '@nestjs/common';
import { ConfirmacaoController } from './confirmacao.controller';
import { ConfirmacaoService } from './confirmacao.service';
import { SessoesController } from './sessoes.controller';
import { SessoesService } from './sessoes.service';

@Module({
  controllers: [SessoesController, ConfirmacaoController],
  providers: [SessoesService, ConfirmacaoService],
})
export class AgendamentoModule {}
