import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  JANELA_VERIFICACAO_MINUTOS,
  LIMITE_VERIFICACAO_PADRAO,
  LimiteConferenciasGuard,
  LimitePedidosDeCodigoGuard,
} from './limite-verificacao.guard';

const contexto = (ip: string) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ ip }) }),
  }) as unknown as ExecutionContext;

describe('Limite por origem da verificação de identidade (RF52, RNF6)', () => {
  afterEach(() => jest.useRealTimers());

  it('recusa com 429 os pedidos de código acima do limite, só para aquela origem (RF52, RNF6)', () => {
    const guard = new LimitePedidosDeCodigoGuard(new ConfigService({}));
    for (let i = 0; i < LIMITE_VERIFICACAO_PADRAO; i += 1) {
      expect(guard.canActivate(contexto('10.0.0.1'))).toBe(true);
    }
    expect(() => guard.canActivate(contexto('10.0.0.1'))).toThrow(
      expect.objectContaining({ status: 429 }),
    );
    expect(guard.canActivate(contexto('10.0.0.2'))).toBe(true);
  });

  it('libera a origem de novo depois da janela de 10 minutos (RF52)', () => {
    jest.useFakeTimers();
    const guard = new LimiteConferenciasGuard(
      new ConfigService({ LIMITE_VERIFICACAO_POR_ORIGEM: '2' }),
    );
    guard.canActivate(contexto('10.0.0.1'));
    guard.canActivate(contexto('10.0.0.1'));
    expect(() => guard.canActivate(contexto('10.0.0.1'))).toThrow();
    jest.advanceTimersByTime(JANELA_VERIFICACAO_MINUTOS * 60_000 + 1);
    expect(guard.canActivate(contexto('10.0.0.1'))).toBe(true);
  });

  it('pedidos de código e conferências têm contagens separadas (RF52)', () => {
    const config = new ConfigService({ LIMITE_VERIFICACAO_POR_ORIGEM: '1' });
    const pedidos = new LimitePedidosDeCodigoGuard(config);
    const conferencias = new LimiteConferenciasGuard(config);
    expect(pedidos.canActivate(contexto('10.0.0.1'))).toBe(true);
    expect(conferencias.canActivate(contexto('10.0.0.1'))).toBe(true);
    expect(() => pedidos.canActivate(contexto('10.0.0.1'))).toThrow();
  });
});
