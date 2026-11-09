import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { COOKIE_VERIFICACAO } from './cookie-sessao';
import { VerificacaoService } from './verificacao.service';

type ComVerificacao = Request & { inscricaoVerificada?: string };

export const MENSAGEM_SEM_VERIFICACAO =
  'Confirme sua identidade para consultar a inscrição.';

// Rotas do paciente ou do responsável (RF8 e CP10): só passam com uma
// verificação de identidade dentro do prazo (RF52, RNF6), e preenchem
// req.inscricaoVerificada com a única inscrição liberada. Sem verificação, a
// resposta é 401, sem nenhum dado.
@Injectable()
export class VerificacaoGuard implements CanActivate {
  constructor(private readonly verificacao: VerificacaoService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<ComVerificacao>();
    const token = (req.cookies as Record<string, string> | undefined)?.[
      COOKIE_VERIFICACAO
    ];
    const verificacao = token ? await this.verificacao.validar(token) : null;
    if (!verificacao) throw new UnauthorizedException(MENSAGEM_SEM_VERIFICACAO);
    req.inscricaoVerificada = verificacao.inscricaoId;
    return true;
  }
}

// Id da inscrição liberada pelo VerificacaoGuard.
export const InscricaoVerificada = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<ComVerificacao>().inscricaoVerificada,
);
