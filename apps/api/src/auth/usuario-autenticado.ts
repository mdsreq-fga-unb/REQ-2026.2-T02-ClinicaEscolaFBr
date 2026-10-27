import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Perfil } from '@clinica/shared';

// Usuário da sessão, preenchido em req.usuario pela sessão de login (RF50).
export type UsuarioAutenticado = { id: string; nome: string; perfil: Perfil };

export const UsuarioAtual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<{ usuario?: UsuarioAutenticado }>().usuario,
);

// Recusa com 401 a requisição sem sessão; o PerfisGuard trata o perfil depois.
@Injectable()
export class AutenticadoGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{ usuario?: unknown }>();
    if (!req.usuario) throw new UnauthorizedException('Sessão encerrada.');
    return true;
  }
}
