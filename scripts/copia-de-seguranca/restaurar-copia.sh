#!/usr/bin/env bash
# Restaura uma cópia feita por fazer-copia.sh (RNF53) num banco vazio: confere o
# ambiente e o hash, decifra e roda o pg_restore numa transação só, que é desfeita
# se algo falhar. As permissões não voltam com a cópia (--no-privileges): depois,
# o migrador da versão em uso aplica as migrations e as permissões do clinica_app.
#
# Uso: restaurar-copia.sh <arquivo .dump.gpg>
# Variáveis:
#   AMBIENTE             (opcional) recusa a cópia de outro ambiente, que tem
#                        outra CHAVE_DADOS e voltaria com os dados ilegíveis
#   SENHA_CHAVE_COPIAS   (opcional) a senha da chave privada, se ela tiver uma
#   GNUPGHOME            onde está a chave privada das cópias
#   e o acesso ao banco descrito em comum.sh: PGDATABASE é o banco vazio
set -euo pipefail
source "$(dirname "$0")/comum.sh"

arquivo="${1:?Uso: restaurar-copia.sh <arquivo .dump.gpg>}"

if [ -n "${AMBIENTE:-}" ]; then
  case "$(basename "$arquivo")" in
    "clinica-$AMBIENTE-"*) ;;
    *)
      echo "A cópia $(basename "$arquivo") não é do ambiente $AMBIENTE." >&2
      exit 1
      ;;
  esac
fi

(cd "$(dirname "$arquivo")" && sha256sum --check --quiet "$(basename "$arquivo").sha256")

# O pg_tables enxerga todas as tabelas, mesmo as em que o usuário não tem
# privilégio, ao contrário do information_schema.
tabelas=$(no_banco psql -tAc "select count(*) from pg_tables
  where schemaname not in ('pg_catalog', 'information_schema')")
if [ "$tabelas" != "0" ]; then
  echo "O banco $PGDATABASE tem $tabelas tabelas. Restaure num banco vazio." >&2
  exit 1
fi

decifrar() {
  if [ -n "${SENHA_CHAVE_COPIAS:-}" ]; then
    gpg --batch --quiet --pinentry-mode loopback --passphrase-fd 3 \
      --decrypt "$arquivo" 3<<<"$SENHA_CHAVE_COPIAS"
  else
    gpg --batch --quiet --decrypt "$arquivo"
  fi
}

decifrar |
  no_banco pg_restore --no-owner --no-privileges --exit-on-error --single-transaction \
    --dbname "$PGDATABASE"

echo "Cópia restaurada em $PGDATABASE: $(basename "$arquivo")"
