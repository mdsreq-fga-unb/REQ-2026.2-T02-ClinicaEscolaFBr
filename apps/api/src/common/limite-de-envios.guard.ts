import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

// Inscrições novas aceitas por endereço de origem numa janela de 10 minutos. O
// limite vem de LIMITE_INSCRICOES_POR_ORIGEM (padrão de 20).
export const LIMITE_PADRAO = 20;
export const JANELA_MINUTOS = 10;
// Limite de endereços guardados em memória.
const MAX_ORIGENS = 10_000;

// Limita os envios da inscrição pública (RF1) por endereço de origem, para que
// ninguém encha a fila com inscrições falsas. Conta só chaves de envio novas: o
// reenvio da mesma inscrição, depois de perder a resposta, não gasta o limite.
// A contagem fica na memória: zera quando a API reinicia e não é dividida entre
// instâncias, o que basta enquanto a API roda numa instância só. Atrás de proxy,
// configure SALTOS_DE_PROXY para a origem ser o visitante, e não o proxy.
@Injectable()
export class LimiteDeEnviosGuard implements CanActivate {
  private readonly envios = new Map<string, Map<string, number>>();
  private readonly limite: number;

  constructor(config: ConfigService) {
    this.limite =
      Number(config.get('LIMITE_INSCRICOES_POR_ORIGEM')) || LIMITE_PADRAO;
  }

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const origem = req.ip ?? 'desconhecida';
    const enviada = (req.body as { chaveEnvio?: unknown } | undefined)
      ?.chaveEnvio;
    const chave = typeof enviada === 'string' ? enviada : '';
    const agora = Date.now();
    const desde = agora - JANELA_MINUTOS * 60_000;

    const daOrigem = this.envios.get(origem) ?? new Map<string, number>();
    for (const [k, em] of daOrigem) if (em <= desde) daOrigem.delete(k);
    if (daOrigem.has(chave)) return true;
    if (daOrigem.size >= this.limite) {
      throw new HttpException(
        'Muitas inscrições enviadas deste local em pouco tempo. Tente de novo em alguns minutos ou procure a recepção da Clínica Escola.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    daOrigem.set(chave, agora);
    this.envios.delete(origem);
    this.envios.set(origem, daOrigem);
    if (this.envios.size > MAX_ORIGENS) {
      const maisAntiga = this.envios.keys().next().value;
      if (maisAntiga !== undefined) this.envios.delete(maisAntiga);
    }
    return true;
  }
}
