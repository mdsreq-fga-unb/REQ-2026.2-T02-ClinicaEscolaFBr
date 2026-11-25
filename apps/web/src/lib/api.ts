const BASE = process.env.NEXT_PUBLIC_API_URL;

// Erro da API com o status HTTP, a mensagem e o corpo enviados pelo servidor.
export class ErroApi extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
    readonly corpo: Record<string, unknown> | null = null,
  ) {
    super(mensagem);
  }
}

// Avisado a cada 401 de rota que não é a própria consulta da sessão. A área
// interna usa isso para conferir a sessão de novo e levar à entrada quando ela
// expirou (RNF50), inclusive nas ações que chamam a API fora do React Query.
let aoRecusarSessao: (() => void) | null = null;
export function quandoRecusarSessao(funcao: (() => void) | null) {
  aoRecusarSessao = funcao;
}
const ROTAS_DA_SESSAO = ["/auth/sessao", "/auth/login", "/auth/logout"];

export async function api<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(`${BASE}${caminho}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const mensagem =
      typeof corpo?.message === "string"
        ? corpo.message
        : `Erro ${resposta.status} em ${caminho}`;
    if (resposta.status === 401 && !ROTAS_DA_SESSAO.includes(caminho)) {
      aoRecusarSessao?.();
    }
    throw new ErroApi(resposta.status, mensagem, corpo);
  }
  if (resposta.status === 204) return undefined as T;
  return resposta.json() as Promise<T>;
}
