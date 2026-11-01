#!/usr/bin/env bash
# Acesso ao banco usado pelos scripts da cópia de segurança (RNF53), sempre sem a
# senha na linha de comando, onde ela apareceria no ps e no histórico do shell:
#
#   CONTEINER_BANCO  nome do contêiner do Postgres (na VPS, banco-<uuid>). Os
#                    comandos rodam dentro dele, pelo socket, sem senha, e com o
#                    pg_dump da mesma versão do servidor.
#   sem ele          as variáveis padrão do Postgres: PGHOST, PGPORT e a senha em
#                    PGPASSWORD ou num PGPASSFILE com permissão 0600.
#
# PGUSER e PGDATABASE valem nos dois casos (padrão: clinica e clinica).
export PGUSER="${PGUSER:-clinica}"
export PGDATABASE="${PGDATABASE:-clinica}"

# Roda um comando do Postgres (psql, pg_dump, pg_restore) no banco configurado.
no_banco() {
  if [ -n "${CONTEINER_BANCO:-}" ]; then
    docker exec -i -e "PGUSER=$PGUSER" -e "PGDATABASE=$PGDATABASE" "$CONTEINER_BANCO" "$@"
  else
    "$@"
  fi
}
