// Documentos e campos de cadastro: validação compartilhada pela tela e pela API, e
// as máscaras que a tela aplica enquanto a pessoa digita. O valor guardado é
// sempre o sem pontuação (só os números, e o "X" do RG).

export const soDigitos = (valor: string) => valor.replace(/\D/g, "");

// CPF com os dois dígitos verificadores certos. Sequências repetidas
// (000.000.000-00, 111.111.111-11...) passam na conta, mas não são CPFs.
export function cpfValido(valor: string): boolean {
  const cpf = soDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (tamanho: number) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i += 1)
      soma += Number(cpf[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}

// 000.000.000-00, preenchida aos poucos.
export function mascaraCpf(valor: string): string {
  const d = soDigitos(valor).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// 00000-000.
export function mascaraCep(valor: string): string {
  const d = soDigitos(valor).slice(0, 8);
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
}

// (00) 0000-0000 para fixo e (00) 00000-0000 para celular, com o DDD.
export function mascaraTelefone(valor: string): string {
  const d = soDigitos(valor).slice(0, 11);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = `(${d.slice(0, 2)}) `;
  const resto = d.slice(2);
  if (d.length <= 6) return ddd + resto;
  const corte = d.length === 11 ? 5 : 4;
  return `${ddd}${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

// O RG não tem formato nacional (cada estado numera de um jeito, e a nova
// Carteira de Identidade usa o CPF). Com só números (e o "X" do dígito), a
// máscara separa os milhares e, a partir de 8 caracteres, o dígito verificador:
// 3.456.789, 12.345.678-9. Com letras, como "MG-12.345.678", o RG fica como a
// pessoa digitou, porque o RF1 aceita o RG como está no documento.
const temLetras = (valor: string) => /[A-WYZa-wyz]/.test(valor);
export function rgParaEnvio(valor: string): string {
  if (temLetras(valor)) return valor.trim();
  return valor
    .toUpperCase()
    .replace(/[^0-9X]/g, "")
    .slice(0, 12);
}
export function mascaraRg(valor: string): string {
  if (temLetras(valor)) return valor.slice(0, 30);
  const d = rgParaEnvio(valor);
  const milhares = (texto: string) =>
    texto.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (d.length < 8) return milhares(d.replace(/X/g, ""));
  return `${milhares(d.slice(0, -1).replace(/X/g, ""))}-${d.slice(-1)}`;
}

// Opções fechadas da ficha de identificação: a tela mostra a lista, e a API só
// aceita um destes valores (ou o campo vazio, porque os dois são opcionais).
export const SEXOS = ["Feminino", "Masculino"] as const;
export const ESCOLARIDADES = [
  "Sem escolaridade",
  "Ensino fundamental incompleto",
  "Ensino fundamental completo",
  "Ensino médio incompleto",
  "Ensino médio completo",
  "Ensino técnico",
  "Ensino superior incompleto",
  "Ensino superior completo",
  "Pós-graduação",
] as const;
