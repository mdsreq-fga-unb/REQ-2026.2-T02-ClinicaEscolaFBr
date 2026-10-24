const BASE = process.env.NEXT_PUBLIC_API_URL;

// Erro da API com o status HTTP e a mensagem enviada pelo servidor.
export class ErroApi extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

export async function api<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(`${BASE}${caminho}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => null)) as {
      message?: unknown;
    } | null;
    const mensagem =
      typeof corpo?.message === "string"
        ? corpo.message
        : `Erro ${resposta.status} em ${caminho}`;
    throw new ErroApi(resposta.status, mensagem);
  }
  if (resposta.status === 204) return undefined as T;
  return resposta.json() as Promise<T>;
}
