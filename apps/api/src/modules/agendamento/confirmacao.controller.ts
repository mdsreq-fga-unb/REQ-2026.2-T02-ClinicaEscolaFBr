import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import {
  cancelamentoPeloLinkSchema,
  type CancelamentoPeloLink,
} from '@clinica/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { CancelamentoService } from './cancelamento.service';
import { ConfirmacaoService } from './confirmacao.service';

// Rotas públicas do link da sessão: o paciente confirma (RF14) ou cancela (RF15) sem
// login (RNF15), e o token imprevisível é o que protege a sessão (RNF59).
@Controller('confirmacao')
export class ConfirmacaoController {
  constructor(
    private readonly confirmacao: ConfirmacaoService,
    private readonly cancelamento: CancelamentoService,
  ) {}

  @Get(':token')
  @Header('Cache-Control', 'no-store')
  consultar(@Param('token') token: string) {
    return this.confirmacao.consultarPeloLink(token);
  }

  @Post(':token/confirmar')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  confirmar(@Param('token') token: string) {
    return this.confirmacao.confirmarPeloLink(token);
  }

  @Post(':token/cancelar')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  cancelar(
    @Param('token') token: string,
    @Body(new ZodValidationPipe(cancelamentoPeloLinkSchema))
    dados: CancelamentoPeloLink,
  ) {
    return this.cancelamento.cancelarPeloLink(token, dados);
  }
}
