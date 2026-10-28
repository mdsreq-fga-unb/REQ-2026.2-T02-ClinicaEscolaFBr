#!/usr/bin/env bash
# Confere se o banco restaurado tem os mesmos dados do banco de origem (RNF53):
# para cada tabela, o número de linhas e um hash do conteúdo. Usado no teste de
# restauração do CI e depois de cada teste de restauração da implantação.
#
# Uso: conferir-restauracao.sh <url do banco de origem> <url do banco restaurado>
# TABELAS_COM_DADOS (opcional): tabelas que precisam ter linhas, separadas por
# espaço, para o teste não passar com um banco vazio.
set -euo pipefail

origem="${1:?Uso: conferir-restauracao.sh <origem> <restaurado>}"
restaurado="${2:?Uso: conferir-restauracao.sh <origem> <restaurado>}"

tabelas=$(psql "$origem" -tAc "select table_schema || '.' || table_name
  from information_schema.tables
  where table_type = 'BASE TABLE'
    and table_schema not in ('pg_catalog', 'information_schema')
  order by 1")

resumo() {
  psql "$1" -tAc "select count(*) || ' ' || coalesce(md5(string_agg(t::text, '|' order by t::text)), '-')
    from $2 t"
}

falhas=0
relatorio="| Tabela | Linhas | Conteúdo |"$'\n'"| --- | --- | --- |"
for tabela in $tabelas; do
  a=$(resumo "$origem" "$tabela")
  b=$(resumo "$restaurado" "$tabela" 2>/dev/null || echo "ausente")
  if [ "$a" = "$b" ]; then situacao="igual"; else situacao="DIFERENTE"; falhas=$((falhas + 1)); fi
  relatorio+=$'\n'"| $tabela | ${a%% *} | $situacao |"
done

for tabela in ${TABELAS_COM_DADOS:-}; do
  linhas=$(psql "$origem" -tAc "select count(*) from $tabela")
  if [ "$linhas" = "0" ]; then
    echo "A tabela $tabela está vazia na origem: o teste não cobre os dados dela." >&2
    falhas=$((falhas + 1))
  fi
done

echo "$relatorio"
if [ "$falhas" -gt 0 ] || [ -z "$tabelas" ]; then
  echo "Restauração com diferenças: $falhas." >&2
  exit 1
fi
echo "Todas as tabelas restauradas iguais à origem."
