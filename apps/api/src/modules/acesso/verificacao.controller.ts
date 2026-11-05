import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import {
  conferenciaCodigoSchema,
  pedidoCodigoSchema,
  type ConferenciaCodigo,
  type PedidoCodigo,
} from '@clinica/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { COOKIE_VERIFICACAO, opcoesCookieSessao } from './cookie-sessao';
import {
  LimiteConferenciasGuard,
  LimitePedidosDeCodigoGuard,
} from './limite-verificacao.guard';
import { MENSAGEM_SEM_VERIFICACAO } from './verificacao.guard';
import { VerificacaoService } from './verificacao.service';

// Verificação de identidade do paciente ou do responsável (RF52). Rotas
// públicas: o paciente e o responsável não têm conta.
@Controller('verificacao')
export class VerificacaoController {
  constructor(
    private readonly verificacao: VerificacaoService,
    private readonly config: ConfigService,
  ) {}

  @Post('codigo')
  @HttpCode(202)
  @UseGuards(LimitePedidosDeCodigoGuard)
  pedirCodigo(
    @Body(new ZodValidationPipe(pedidoCodigoSchema)) dados: PedidoCodigo,
  ) {
    return this.verificacao.pedirCodigo(dados);
  }

  @Post('conferir')
  @HttpCode(200)
  @UseGuards(LimiteConferenciasGuard)
  async conferir(
    @Body(new ZodValidationPipe(conferenciaCodigoSchema))
    dados: ConferenciaCodigo,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, atual } = await this.verificacao.conferir(dados);
    res.cookie(COOKIE_VERIFICACAO, token, this.opcoesCookie());
    return atual;
  }

  // A inscrição liberada e o fim do prazo da verificação, para a página
  // pública saber se a pessoa já confirmou a identidade.
  @Get()
  async atual(@Req() req: Request) {
    const token = this.token(req);
    const atual = token ? await this.verificacao.atual(token) : null;
    if (!atual) throw new UnauthorizedException(MENSAGEM_SEM_VERIFICACAO);
    return atual;
  }

  @Post('encerrar')
  @HttpCode(204)
  async encerrar(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = this.token(req);
    if (token) await this.verificacao.encerrar(token);
    res.clearCookie(COOKIE_VERIFICACAO, this.opcoesCookie());
  }

  private token(req: Request) {
    return (req.cookies as Record<string, string> | undefined)?.[
      COOKIE_VERIFICACAO
    ];
  }

  private opcoesCookie() {
    return opcoesCookieSessao(this.config.getOrThrow<string>('WEB_URL'));
  }
}
