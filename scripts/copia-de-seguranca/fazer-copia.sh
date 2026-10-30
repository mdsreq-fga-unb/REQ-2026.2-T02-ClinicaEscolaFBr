#!/usr/bin/env bash
# Cópia de segurança completa do banco de um ambiente (RNF53): pg_dump no formato
# custom, cifrada com a chave pública do gpg e com o hash SHA-256 ao lado, para
# conferir a cópia antes de restaurar. Apaga as cópias do ambiente com mais de
# RETENCAO_DIAS dias e registra cada execução, com sucesso ou falha, num log.
#
# Variáveis:
#   AMBIENTE              producao ou validacao: vai no nome da cópia, porque cada
#                         ambiente tem a sua CHAVE_DADOS e uma cópia não serve no outro
#   DESTINATARIO_COPIAS   a chave pública do gpg que cifra as cópias (e-mail ou
#                         impressão digital). A chave privada fica fora do servidor
#   DESTINO_COPIAS        pasta das cópias; na implantação, um destino fora do servidor
#   RETENCAO_DIAS         dias que cada cópia é mantida (padrão: 30)
#   e o acesso ao banco descrito em comum.sh (na VPS, CONTEINER_BANCO)
#
# Precisa de gpg e sha256sum, e do pg_dump quando não usa CONTEINER_BANCO.
# Procedimento completo: documentacao/docs/unidade-3/copia-de-seguranca.md
set -euo pipefail
# A cópia e o log só podem ser lidos pelo dono.
umask 077
source "$(dirname "$0")/comum.sh"

: "${AMBIENTE:?Informe AMBIENTE (producao ou validacao).}"
: "${DESTINATARIO_COPIAS:?Informe DESTINATARIO_COPIAS, a chave pública que cifra as cópias.}"
: "${DESTINO_COPIAS:?Informe DESTINO_COPIAS, a pasta das cópias.}"
RETENCAO_DIAS="${RETENCAO_DIAS:-30}"

mkdir -p "$DESTINO_COPIAS"
log="$DESTINO_COPIAS/copias-$AMBIENTE.log"
registrar() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" >>"$log"; }

nome="clinica-$AMBIENTE-$(date -u +%Y%m%dT%H%M%SZ).dump.gpg"
parcial="$DESTINO_COPIAS/.$nome.parcial"
# Sem o registro da falha, um agendamento quebrado passaria despercebido.
trap 'saida=$?; rm -f "$parcial" "$parcial.sha256"; [ "$saida" -eq 0 ] || registrar "FALHOU (saída $saida) $nome"' EXIT

no_banco pg_dump --format=custom |
  gpg --batch --yes --quiet --trust-model always --auto-key-locate local \
    --encrypt --recipient "$DESTINATARIO_COPIAS" --output "$parcial"

# O hash é gerado antes de a cópia ganhar o nome final, e a cópia é a última a
# ser renomeada: um arquivo com o nome final sempre tem o hash ao lado.
printf '%s  %s\n' "$(sha256sum "$parcial" | cut -d' ' -f1)" "$nome" >"$parcial.sha256"
mv "$parcial.sha256" "$DESTINO_COPIAS/$nome.sha256"
mv "$parcial" "$DESTINO_COPIAS/$nome"

find "$DESTINO_COPIAS" -maxdepth 1 -name "clinica-$AMBIENTE-*.dump.gpg*" \
  -mtime +"$RETENCAO_DIAS" -delete
# Restos de uma execução interrompida à força (kill -9), que o trap não apaga.
find "$DESTINO_COPIAS" -maxdepth 1 -name ".clinica-$AMBIENTE-*.parcial*" \
  -mmin +1440 -delete

registrar "ok $nome $(wc -c <"$DESTINO_COPIAS/$nome") bytes"
echo "$DESTINO_COPIAS/$nome"
