import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  JANELA_MINUTOS,
  LIMITE_PADRAO as LIMITE_INSCRICOES,
  LimiteDeEnviosGuard,
} from './limite-de-envios.guard';

const novoGuard = () => new LimiteDeEnviosGuard(new ConfigService({}));

const contexto = (ip: string, chaveEnvio: string) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ ip, body: { chaveEnvio } }) }),
  }) as unknown as ExecutionContext;

describe('Limite de envios da inscrição pública (RF1)', () => {
  afterEach(() => jest.useRealTimers());

  it('o limite pode ser ajustado por LIMITE_INSCRICOES_POR_ORIGEM', () => {
    const guard = new LimiteDeEnviosGuard(
      new ConfigService({ LIMITE_INSCRICOES_POR_ORIGEM: '1' }),
    );
    expect(guard.canActivate(contexto('10.0.0.1', 'a'))).toBe(true);
    expect(() => guard.canActivate(contexto('10.0.0.1', 'b'))).toThrow();
  });

  it('recusa com 429 a inscrição nova depois do limite, só para aquela origem', () => {
    const guard = novoGuard();
    for (let i = 0; i < LIMITE_INSCRICOES; i += 1) {
      expect(guard.canActivate(contexto('10.0.0.1', `chave-${i}`))).toBe(true);
    }
    expect(() => guard.canActivate(contexto('10.0.0.1', 'nova'))).toThrow(
      expect.objectContaining({ status: 429 }),
    );
    expect(guard.canActivate(contexto('10.0.0.2', 'nova'))).toBe(true);
  });

  it('o reenvio da mesma inscrição não gasta o limite', () => {
    const guard = novoGuard();
    for (let i = 0; i < LIMITE_INSCRICOES; i += 1) {
      guard.canActivate(contexto('10.0.0.1', `chave-${i}`));
    }
    expect(guard.canActivate(contexto('10.0.0.1', 'chave-0'))).toBe(true);
  });

  it('a janela de tempo libera novos envios', () => {
    jest.useFakeTimers();
    const guard = novoGuard();
    for (let i = 0; i < LIMITE_INSCRICOES; i += 1) {
      guard.canActivate(contexto('10.0.0.1', `chave-${i}`));
    }
    jest.advanceTimersByTime(JANELA_MINUTOS * 60_000 + 1);
    expect(guard.canActivate(contexto('10.0.0.1', 'nova'))).toBe(true);
  });
});
