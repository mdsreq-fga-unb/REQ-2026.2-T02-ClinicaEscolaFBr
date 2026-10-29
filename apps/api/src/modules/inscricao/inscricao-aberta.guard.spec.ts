import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InscricaoAbertaGuard,
  INSCRICAO_FECHADA,
} from './inscricao-aberta.guard';

const guarda = (valor?: unknown) =>
  new InscricaoAbertaGuard(new ConfigService({ INSCRICAO_ABERTA: valor }));

describe('RF1: inscrição pública fechada até o termo de consentimento (RF57)', () => {
  it('fica aberta sem a variável', () => {
    expect(guarda(undefined).canActivate()).toBe(true);
  });

  it.each([true, 'true'])('fica aberta com INSCRICAO_ABERTA=%p', (valor) => {
    expect(guarda(valor).canActivate()).toBe(true);
  });

  it.each([false, 'false'])(
    'recusa as inscrições novas com INSCRICAO_ABERTA=%p',
    (valor) => {
      expect(() => guarda(valor).canActivate()).toThrow(
        new ForbiddenException(INSCRICAO_FECHADA),
      );
    },
  );
});
