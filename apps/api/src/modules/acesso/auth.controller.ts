import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { loginSchema, type Login } from '@clinica/shared';
import {
  AutenticadoGuard,
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../auth/usuario-autenticado';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { COOKIE_SESSAO, opcoesCookieSessao } from './cookie-sessao';
import { SessoesService } from './sessoes.service';

// Entrada, sessão e saída do sistema (RF50 e RF51).
@Controller('auth')
export class AuthController {
  constructor(
    private readonly sessoes: SessoesService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(200)
  async entrar(
    @Body(new ZodValidationPipe(loginSchema)) dados: Login,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, usuario } = await this.sessoes.entrar(dados);
    res.cookie(COOKIE_SESSAO, token, this.opcoesCookie());
    return usuario;
  }

  @Get('sessao')
  @UseGuards(AutenticadoGuard)
  sessao(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return usuario;
  }

  @Post('logout')
  @HttpCode(204)
  async sair(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req.cookies as Record<string, string> | undefined)?.[
      COOKIE_SESSAO
    ];
    if (token) await this.sessoes.sair(token);
    res.clearCookie(COOKIE_SESSAO, this.opcoesCookie());
  }

  private opcoesCookie() {
    return opcoesCookieSessao(this.config.getOrThrow<string>('WEB_URL'));
  }
}
