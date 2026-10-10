const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function api<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(`${BASE}${caminho}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!resposta.ok) throw new Error(`Erro ${resposta.status} em ${caminho}`);
  return resposta.json() as Promise<T>;
}
