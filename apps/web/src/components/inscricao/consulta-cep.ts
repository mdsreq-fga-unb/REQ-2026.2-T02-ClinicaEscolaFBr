// Consulta do CEP na inscrição (RF1, DF75): o bairro e a cidade precisam estar
// exatamente como no CEP, porque a diferença causa problema na nota fiscal da FBr.
// Usa o ViaCEP, serviço público e gratuito, direto do navegador. Só o CEP é
// enviado; nenhum outro dado da inscrição sai do formulário.

export type ResultadoCep =
  | { tipo: "encontrado"; logradouro: string; bairro: string; cidadeUf: string }
  | { tipo: "nao_encontrado" }
  | { tipo: "falha" };

const TEMPO_LIMITE_MS = 5000;

export async function consultarCep(
  cep: string,
  buscar: typeof fetch = fetch,
): Promise<ResultadoCep> {
  const digitos = cep.replace(/\D/g, "");
  if (digitos.length !== 8) return { tipo: "nao_encontrado" };
  try {
    const resposta = await buscar(`https://viacep.com.br/ws/${digitos}/json/`, {
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
    if (resposta.status === 400) return { tipo: "nao_encontrado" };
    if (!resposta.ok) return { tipo: "falha" };
    const dados = (await resposta.json()) as Record<string, unknown>;
    if (dados.erro) return { tipo: "nao_encontrado" };
    const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const cidade = texto(dados.localidade);
    const uf = texto(dados.uf);
    if (!cidade || !uf) return { tipo: "falha" };
    return {
      tipo: "encontrado",
      logradouro: texto(dados.logradouro),
      bairro: texto(dados.bairro),
      cidadeUf: `${cidade}/${uf}`,
    };
  } catch {
    return { tipo: "falha" };
  }
}
