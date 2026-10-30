#!/usr/bin/env bash
# Confere a comunicação do sistema publicado (RNF51): HTTP redirecionado para
# HTTPS no mesmo endereço, TLS 1.2 ou superior aceito e TLS 1.0 e 1.1 recusados.
# Usado na validação e na produção; o resultado é a evidência registrada com /rnf.
#
# Uso: verificar-https.sh <domínio>   (por exemplo, validacao.clinica.fbr.edu.br)
#      verificar-https.sh --autoteste
#
# O OpenSSL 3 não oferece TLS 1.0 e 1.1 no nível de segurança padrão: sem o
# SECLEVEL=0, a sonda falha no próprio cliente e parece uma recusa do servidor.
# O --autoteste confere que este cliente consegue negociar essas versões, contra
# servidores do badssl.com que as aceitam. Rode-o antes, para a recusa valer.
set -uo pipefail

OPENSSL="${OPENSSL:-openssl}"
ANTIGAS=(-cipher 'DEFAULT:@SECLEVEL=0')
# O s_client não tem limite de tempo para conectar: sem ele, uma porta bloqueada
# trava a verificação.
LIMITE=()
command -v timeout >/dev/null && LIMITE=(timeout 20)

# Tenta o aperto de mão TLS com o servidor; sai com 0 se ele aceitou.
sonda() {
  local servidor="$1" porta="$2"
  shift 2
  echo | ${LIMITE[@]+"${LIMITE[@]}"} "$OPENSSL" s_client -connect "$servidor:$porta" -servername "$servidor" "$@" >/dev/null 2>&1
}

if [ "${1:-}" = "--autoteste" ]; then
  falhou=0
  for alvo in "tls-v1-0.badssl.com 1010 -tls1" "tls-v1-1.badssl.com 1011 -tls1_1"; do
    read -r servidor porta versao <<<"$alvo"
    if sonda "$servidor" "$porta" "$versao" "${ANTIGAS[@]}"; then
      echo "✅ O cliente negocia $versao ($servidor aceitou)"
    else
      echo "❌ O cliente não negociou $versao com $servidor, que aceita essa versão"
      falhou=1
    fi
  done
  exit "$falhou"
fi

dominio="${1:?Uso: verificar-https.sh <domínio> | --autoteste}"
falhas=0
conferir() {
  if [ "$2" = "ok" ]; then echo "✅ $1"; else echo "❌ $1"; falhas=$((falhas + 1)); fi
}

# 1. HTTP responde com redirecionamento para o mesmo endereço em HTTPS.
resposta=$(curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 15 "http://$dominio/")
codigo=${resposta%% *}
destino=${resposta#* }
case "$codigo $destino" in
  30[1278]\ "https://$dominio" | 30[1278]\ "https://$dominio/"*)
    conferir "HTTP redireciona para HTTPS no mesmo endereço ($codigo → $destino)" ok ;;
  *) conferir "HTTP redireciona para HTTPS no mesmo endereço (recebido: $resposta)" falha ;;
esac

# 2. Versões do TLS: 1.2 e 1.3 aceitas; 1.0 e 1.1 recusadas. A recusa só vale
#    se o servidor respondeu ao TLS 1.2: senão, pode ser erro de rede ou de DNS.
if sonda "$dominio" 443 -tls1_2 || sonda "$dominio" 443 -tls1_3; then
  conferir "TLS 1.2 ou superior aceito" ok
  for versao in -tls1_1 -tls1; do
    nome=$([ "$versao" = -tls1 ] && echo "TLS 1.0" || echo "TLS 1.1")
    if sonda "$dominio" 443 "$versao" "${ANTIGAS[@]}"; then
      conferir "$nome recusado" falha
    else
      conferir "$nome recusado" ok
    fi
  done
else
  conferir "TLS 1.2 ou superior aceito (sem resposta; TLS 1.0 e 1.1 não conferidos)" falha
fi

# 3. O certificado é válido para o domínio.
if curl -sS -o /dev/null --max-time 15 "https://$dominio/"; then
  conferir "Certificado válido para $dominio" ok
else
  conferir "Certificado válido para $dominio" falha
fi

if [ "$falhas" -gt 0 ]; then
  echo "Falhas: $falhas." >&2
  exit 1
fi
echo "Comunicação conforme o RNF51."
