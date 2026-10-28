#!/usr/bin/env bash
# Restaura uma cópia feita por fazer-copia.sh (RNF53) num banco vazio: confere o
# hash, decifra e roda o pg_restore numa transação só, que é desfeita se algo
# falhar. Depois, aplique as migrations da versão em produção (pnpm db:migrate).
#
# Uso: restaurar-copia.sh <arquivo .dump.gpg>
# Variáveis:
#   DATABASE_URL  banco de destino, vazio
#   CHAVE_COPIAS  a mesma senha usada na cópia
set -euo pipefail

arquivo="${1:?Uso: restaurar-copia.sh <arquivo .dump.gpg>}"
: "${DATABASE_URL:?Informe DATABASE_URL, o banco de destino (vazio).}"
: "${CHAVE_COPIAS:?Informe CHAVE_COPIAS, a senha que cifrou a cópia.}"

(cd "$(dirname "$arquivo")" && sha256sum --check --quiet "$(basename "$arquivo").sha256")

tabelas=$(psql "$DATABASE_URL" -tAc "select count(*) from information_schema.tables
  where table_schema not in ('pg_catalog', 'information_schema')")
if [ "$tabelas" != "0" ]; then
  echo "O banco de destino tem $tabelas tabelas. Restaure num banco vazio." >&2
  exit 1
fi

gpg --batch --quiet --pinentry-mode loopback --passphrase-fd 3 \
  --decrypt "$arquivo" 3<<<"$CHAVE_COPIAS" |
  pg_restore --no-owner --no-privileges --exit-on-error --single-transaction \
    --dbname "$DATABASE_URL"

echo "Cópia restaurada: $(basename "$arquivo")"
