#!/usr/bin/env bash
# Cópia de segurança completa do banco (RNF53): pg_dump no formato custom,
# cifrada com gpg (AES-256) e com o hash SHA-256 ao lado, para conferir a cópia
# antes de restaurar. Apaga as cópias com mais de RETENCAO_DIAS dias.
#
# Variáveis:
#   DATABASE_URL    banco de origem
#   CHAVE_COPIAS    senha que cifra as cópias (guardada fora do servidor)
#   DESTINO_COPIAS  pasta das cópias; em produção, um disco ou bucket fora do servidor
#   RETENCAO_DIAS   dias que cada cópia é mantida (padrão: 30)
#
# Precisa de pg_dump (da mesma versão do servidor), gpg e sha256sum. A imagem
# postgres:17 do docker-compose.yml tem os três. Procedimento completo:
# documentacao/docs/unidade-3/copia-de-seguranca.md
set -euo pipefail

: "${DATABASE_URL:?Informe DATABASE_URL, o banco de origem.}"
: "${CHAVE_COPIAS:?Informe CHAVE_COPIAS, a senha que cifra as cópias.}"
: "${DESTINO_COPIAS:?Informe DESTINO_COPIAS, a pasta das cópias.}"
RETENCAO_DIAS="${RETENCAO_DIAS:-30}"

mkdir -p "$DESTINO_COPIAS"
nome="clinica-$(date -u +%Y%m%dT%H%M%SZ).dump.gpg"
parcial="$DESTINO_COPIAS/.$nome.parcial"
trap 'rm -f "$parcial"' EXIT

# A cópia só ganha o nome final depois de completa: uma falha no meio não deixa
# um arquivo que pareça uma cópia válida.
pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" |
  gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 3 \
    --symmetric --cipher-algo AES256 --output "$parcial" 3<<<"$CHAVE_COPIAS"
mv "$parcial" "$DESTINO_COPIAS/$nome"
(cd "$DESTINO_COPIAS" && sha256sum "$nome" >"$nome.sha256")

find "$DESTINO_COPIAS" -maxdepth 1 -name 'clinica-*.dump.gpg*' \
  -mtime +"$RETENCAO_DIAS" -delete

echo "$DESTINO_COPIAS/$nome"
