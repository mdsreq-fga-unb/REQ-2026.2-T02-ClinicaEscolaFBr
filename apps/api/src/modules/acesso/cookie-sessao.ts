import type { CookieOptions } from 'express';

export const COOKIE_SESSAO = 'sessao';

// Cookie da sessão (RNF50): httpOnly e SameSite=Lax. Fica Secure quando o sistema
// roda em HTTPS, para também funcionar em http://localhost no desenvolvimento.
export const opcoesCookieSessao = (webUrl: string): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: webUrl.startsWith('https://'),
  path: '/',
});
