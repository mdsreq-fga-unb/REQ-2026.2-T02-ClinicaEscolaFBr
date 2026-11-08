import { Controller, Get, Header, HttpCode, Param, Post } from '@nestjs/common';
import { ConfirmacaoService } from './confirmacao.service';

// Rotas públicas do link da sessão: o paciente confirma sem login (RNF15), e o token
// imprevisível é o que protege a sessão (RNF59).
@Controller('confirmacao')
export class ConfirmacaoController {
  constructor(private readonly confirmacao: ConfirmacaoService) {}

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
}
