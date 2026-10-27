import { Module } from '@nestjs/common';
import { SessoesController } from './sessoes.controller';
import { SessoesService } from './sessoes.service';

@Module({
  controllers: [SessoesController],
  providers: [SessoesService],
})
export class AgendamentoModule {}
