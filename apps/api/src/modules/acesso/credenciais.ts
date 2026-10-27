import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';

// Senhas guardadas só como hash bcrypt (RNF49).
const CUSTO_BCRYPT = 12;

export const gerarHashSenha = (senha: string) =>
  bcrypt.hash(senha, CUSTO_BCRYPT);
export const conferirSenha = (senha: string, hash: string) =>
  bcrypt.compare(senha, hash);

// Tokens de convite e de sessão: 32 bytes aleatórios; o banco guarda só o SHA-256.
export const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export function gerarToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
}
