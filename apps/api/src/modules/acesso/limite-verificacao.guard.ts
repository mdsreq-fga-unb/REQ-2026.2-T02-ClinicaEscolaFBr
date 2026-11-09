import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

// Pedidos de código e conferências aceitos por endereço de origem numa janela
// de 10 minutos, em cada rota (RF52, RNF6). O limite vem de
// LIMITE_VERIFICACAO_POR_ORIGEM (padrão de 30). Ele se soma aos limites por
// identificador e por inscrição, para que ninguém peça códigos para muitas
// inscrições de uma vez e tente adivinhar todos eles.
export const LIMITE_VERIFICACAO_PADRAO = 30;
export const JANELA_VERIFICACAO_MINUTOS = 10;
// Limite de endereços guardados em memória.
const MAX_ORIGENS = 10_000;

// A contagem fica na memória, como no limite da inscrição (RF1): zera quando a
// API reinicia e basta enquanto a API roda numa instância só. Atrás de proxy,
// SALTOS_DE_PROXY faz a origem ser o visitante.
class LimitePorOrigem implements CanActivate {
  private readonly pedidos = new Map<string, number[]>();
  private readonly limite: number;

  constructor(config: ConfigService) {
    this.limite =
      Number(config.get('LIMITE_VERIFICACAO_POR_ORIGEM')) ||
      LIMITE_VERIFICACAO_PADRAO;
  }

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const origem = req.ip ?? 'desconhecida';
    const agora = Date.now();
    const desde = agora - JANELA_VERIFICACAO_MINUTOS * 60_000;
    const recentes = (this.pedidos.get(origem) ?? []).filter(
      (em) => em > desde,
    );
    if (recentes.length >= this.limite) {
      throw new HttpException(
        'Muitas tentativas deste local em pouco tempo. Tente de novo em alguns minutos ou procure a secretaria da Clínica Escola.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recentes.push(agora);
    this.pedidos.delete(origem);
    this.pedidos.set(origem, recentes);
    if (this.pedidos.size > MAX_ORIGENS) {
      const maisAntiga = this.pedidos.keys().next().value;
      if (maisAntiga !== undefined) this.pedidos.delete(maisAntiga);
    }
    return true;
  }
}

// Cada rota tem a sua contagem: os pedidos de código não gastam as conferências.
@Injectable()
export class LimitePedidosDeCodigoGuard extends LimitePorOrigem {
  constructor(config: ConfigService) {
    super(config);
  }
}

@Injectable()
export class LimiteConferenciasGuard extends LimitePorOrigem {
  constructor(config: ConfigService) {
    super(config);
  }
}
