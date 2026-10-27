import { randomBytes } from 'node:crypto';
import { cifrar, decifrar } from './criptografia';

describe('criptografia dos dados de saúde (RNF51)', () => {
  const chave = randomBytes(32).toString('base64');

  it('decifra o que foi cifrado', () => {
    const queixa = 'Tenho me sentido muito cansada há quatro meses.';
    expect(decifrar(cifrar(queixa, chave), chave)).toBe(queixa);
  });

  it('não grava o texto legível e gera cifras diferentes para o mesmo texto', () => {
    const a = cifrar('vermelha', chave);
    const b = cifrar('vermelha', chave);
    expect(a).not.toContain('vermelha');
    expect(a).not.toBe(b);
  });

  it('recusa a decifração com outra chave', () => {
    const outra = randomBytes(32).toString('base64');
    expect(() => decifrar(cifrar('histórico', chave), outra)).toThrow();
  });

  it('recusa valor adulterado', () => {
    const partes = cifrar('urgência alta', chave).split('.');
    partes[3] = Buffer.from('outro conteúdo').toString('base64');
    expect(() => decifrar(partes.join('.'), chave)).toThrow();
  });

  it('recusa etiqueta de autenticação encurtada', () => {
    const partes = cifrar('urgência alta', chave).split('.');
    partes[2] = Buffer.from(partes[2], 'base64')
      .subarray(0, 4)
      .toString('base64');
    expect(() => decifrar(partes.join('.'), chave)).toThrow();
  });

  it('recusa chave com tamanho diferente de 32 bytes', () => {
    expect(() =>
      cifrar('x', Buffer.from('curta').toString('base64')),
    ).toThrow();
  });
});
