// Texto digitado numa busca com ILIKE: "%" e "_" valem como letras, e não como
// curingas (o caractere de escape padrão do Postgres é a barra invertida).
export const escaparLike = (texto: string) => texto.replace(/[\\%_]/g, '\\$&');
