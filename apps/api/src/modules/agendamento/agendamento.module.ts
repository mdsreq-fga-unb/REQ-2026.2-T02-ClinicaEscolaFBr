import { Module } from '@nestjs/common';
import { AdministrativoModule } from '../administrativo/administrativo.module';
import { AssiduidadeModule } from '../assiduidade/assiduidade.module';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';
import { AvisosCancelamentoService } from './avisos-cancelamento.service';
import { CancelamentoService } from './cancelamento.service';
import { CancelamentosController } from './cancelamentos.controller';
import { ConfirmacaoController } from './confirmacao.controller';
import { ConfirmacaoService } from './confirmacao.service';
import { SessoesController } from './sessoes.controller';
import { SessoesService } from './sessoes.service';

// O cancelamento fora do prazo vira falta pelo FaltasService (RF15, RF35). O
// agendamento consulta a contribuição pendente (RF43).
@Module({
  imports: [AssiduidadeModule, AdministrativoModule],
  controllers: [
    SessoesController,
    ConfirmacaoController,
    AgendaController,
    CancelamentosController,
  ],
  providers: [
    SessoesService,
    ConfirmacaoService,
    CancelamentoService,
    AvisosCancelamentoService,
    AgendaService,
  ],
})
export class AgendamentoModule {}
