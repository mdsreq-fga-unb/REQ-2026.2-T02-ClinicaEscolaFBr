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
    throw new ErroApi(resposta.status, mensagem, corpo);
  }
  if (resposta.status === 204) return undefined as T;
  return resposta.json() as Promise<T>;
}
