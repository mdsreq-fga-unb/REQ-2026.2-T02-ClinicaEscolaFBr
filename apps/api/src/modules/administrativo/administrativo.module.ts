import { Module } from '@nestjs/common';
import { ContribuicaoController } from './contribuicao.controller';
import { ContribuicaoService } from './contribuicao.service';

// Registros administrativos do atendimento (CP10): a contribuição social (RF41).
@Module({
  controllers: [ContribuicaoController],
  providers: [ContribuicaoService],
  exports: [ContribuicaoService],
})
export class AdministrativoModule {}
