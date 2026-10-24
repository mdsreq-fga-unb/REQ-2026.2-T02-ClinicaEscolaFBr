import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// Criptografia em repouso dos dados de saúde (RNF51): AES-256-GCM, com a chave
// fora do banco e do repositório (variável CHAVE_DADOS, 32 bytes em base64).
// Formato gravado no banco: "v1.<iv>.<tag>.<texto cifrado>", tudo em base64.
const VERSAO = 'v1';

function lerChave(chaveBase64: string): Buffer {
  const chave = Buffer.from(chaveBase64, 'base64');
  if (chave.length !== 32) {
    throw new Error('CHAVE_DADOS deve ter 32 bytes em base64');
  }
  return chave;
}

export function cifrar(texto: string, chaveBase64: string): string {
  const iv = randomBytes(12);
  const cifra = createCipheriv('aes-256-gcm', lerChave(chaveBase64), iv);
  const conteudo = Buffer.concat([cifra.update(texto, 'utf8'), cifra.final()]);
  const tag = cifra.getAuthTag();
  return [VERSAO, iv, tag, conteudo]
    .map((parte) =>
      typeof parte === 'string' ? parte : parte.toString('base64'),
    )
    .join('.');
}

export function decifrar(valor: string, chaveBase64: string): string {
  const [versao, iv, tag, conteudo] = valor.split('.');
  if (versao !== VERSAO || !iv || !tag || conteudo === undefined) {
    throw new Error('Valor cifrado em formato desconhecido');
  }
  const decifra = createDecipheriv(
    'aes-256-gcm',
    lerChave(chaveBase64),
    Buffer.from(iv, 'base64'),
  );
  decifra.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([
    decifra.update(Buffer.from(conteudo, 'base64')),
    decifra.final(),
  ]).toString('utf8');
}
