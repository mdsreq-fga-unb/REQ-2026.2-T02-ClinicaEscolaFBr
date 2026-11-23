import { Module } from '@nestjs/common';
import { ContribuicaoPendenteController } from './contribuicao-pendente.controller';
import { ContribuicaoPendenteService } from './contribuicao-pendente.service';
import { ContribuicaoController } from './contribuicao.controller';
import { ContribuicaoService } from './contribuicao.service';

// Registros administrativos do atendimento (CP10): a contribuição social (RF41) e
// o bloqueio do agendamento e a perda da vaga pela contribuição pendente (RF43).
@Module({
  controllers: [ContribuicaoController, ContribuicaoPendenteController],
  providers: [ContribuicaoService, ContribuicaoPendenteService],
  exports: [ContribuicaoService, ContribuicaoPendenteService],
})
export class AdministrativoModule {}
