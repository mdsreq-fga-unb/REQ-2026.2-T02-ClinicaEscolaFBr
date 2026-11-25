import type { NextFunction, Request, Response } from 'express';

const METODOS_QUE_ALTERAM = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const ORIGEM_RECUSADA = 'Requisição de origem não permitida.';
export const FORMATO_RECUSADO = 'Envie os dados em JSON.';

// Proteção contra a requisição forjada por outra página (CSRF). O cookie da
// sessão é SameSite=Lax, e o navegador trata todos os endereços *.fbr.edu.br
// como o mesmo site: uma página de outro sistema da FBr conseguiria enviar um
// formulário à API com o cookie de quem está logado. Por isso, nas requisições
// que alteram dados:
// - a origem informada pelo navegador tem de ser a da web (WEB_URL). Sem o
//   cabeçalho Origin, a requisição não veio de uma página (scripts e testes) e
//   não carrega a sessão de ninguém por engano;
// - o corpo tem de ser JSON. Um formulário HTML só envia texto ou
//   x-www-form-urlencoded, e o JSON exige a checagem de CORS do navegador.
// Atenção: a web manda Referrer-Policy: no-referrer, e com isso um POST feito na
// mesma origem sai com "Origin: null" e recebe 403. Hoje não acontece, porque a
// API fica em outro host. Se um dia a API for servida pela própria web (/api),
// é preciso aceitar a mesma origem aqui, ou todas as escritas quebram.
export function exigirOrigemDaWeb(webUrl: string) {
  const origemDaWeb = new URL(webUrl).origin;
  return (req: Request, res: Response, next: NextFunction) => {
    if (!METODOS_QUE_ALTERAM.has(req.method)) return next();
    const origem = req.headers.origin;
    if (origem !== undefined && origem !== origemDaWeb) {
      res.status(403).json({ statusCode: 403, message: ORIGEM_RECUSADA });
      return;
    }
    const tipo = req.headers['content-type'];
    if (tipo !== undefined && !/^application\/json\s*(;|$)/i.test(tipo)) {
      res.status(415).json({ statusCode: 415, message: FORMATO_RECUSADO });
      return;
    }
    next();
  };
}
