import { Module } from '@nestjs/common';
import { AssiduidadeModule } from '../assiduidade/assiduidade.module';
import { CancelamentoService } from './cancelamento.service';
import { ConfirmacaoController } from './confirmacao.controller';
import { ConfirmacaoService } from './confirmacao.service';
import { SessoesController } from './sessoes.controller';
import { SessoesService } from './sessoes.service';

// O cancelamento fora do prazo vira falta pelo FaltasService (RF15, RF35).
@Module({
  imports: [AssiduidadeModule],
  controllers: [SessoesController, ConfirmacaoController],
  providers: [SessoesService, ConfirmacaoService, CancelamentoService],
})
export class AgendamentoModule {}
