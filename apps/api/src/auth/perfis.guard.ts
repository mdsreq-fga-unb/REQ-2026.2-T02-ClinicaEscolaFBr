import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Perfil } from '@clinica/shared';
import { PERFIS_KEY } from './perfis.decorator';

// Bloqueia rotas marcadas com @Perfis(...) para quem não tem o perfil.
// Quem preenche req.usuario é a sessão de login, construída na feature do RF50.
@Injectable()
export class PerfisGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const exigidos = this.reflector.getAllAndOverride<Perfil[]>(PERFIS_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!exigidos?.length) return true;
    const usuario = ctx.switchToHttp().getRequest().usuario as
      { perfil: Perfil } | undefined;
    return !!usuario && exigidos.includes(usuario.perfil);
  }
}
