import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { COOKIE_SESSAO } from './cookie-sessao';
import { SessoesService } from './sessoes.service';

// Guard global: lê o cookie de sessão e preenche req.usuario (RF50). Não bloqueia
// nada; quem recusa a requisição sem sessão é o AutenticadoGuard de cada rota.
@Injectable()
export class SessaoGuard implements CanActivate {
  constructor(private readonly sessoes: SessoesService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { usuario?: UsuarioAutenticado }>();
    const token = (req.cookies as Record<string, string> | undefined)?.[
      COOKIE_SESSAO
    ];
    if (token) {
      const usuario = await this.sessoes.validar(token);
      if (usuario) req.usuario = usuario;
    }
    return true;
  }
}
