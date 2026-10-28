#!/usr/bin/env bash
# Confere a comunicação do sistema publicado (RNF51): HTTP redirecionado para
# HTTPS, TLS 1.2 ou superior aceito e TLS 1.0 e 1.1 recusados. Usado na
# homologação e na produção; o resultado é a evidência registrada com /rnf.
#
# Uso: verificar-https.sh <domínio>   (por exemplo, clinica.exemplo.br)
set -uo pipefail

dominio="${1:?Uso: verificar-https.sh <domínio>}"
falhas=0
conferir() {
  if [ "$2" = "ok" ]; then echo "✅ $1"; else echo "❌ $1"; falhas=$((falhas + 1)); fi
}

# 1. HTTP responde com redirecionamento para o mesmo endereço em HTTPS.
resposta=$(curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 15 "http://$dominio/")
codigo=${resposta%% *}
destino=${resposta#* }
case "$codigo $destino" in
  30[1278]\ https://*) conferir "HTTP redireciona para HTTPS ($codigo → $destino)" ok ;;
  *) conferir "HTTP redireciona para HTTPS (recebido: $resposta)" falha ;;
esac

# 2. Versões do TLS: 1.2 e 1.3 aceitas; 1.0 e 1.1 recusadas.
tls() {
  echo | openssl s_client -connect "$dominio:443" -servername "$dominio" "$1" >/dev/null 2>&1
}
if tls -tls1_2 || tls -tls1_3; then conferir "TLS 1.2 ou superior aceito" ok; else conferir "TLS 1.2 ou superior aceito" falha; fi
if tls -tls1_1; then conferir "TLS 1.1 recusado" falha; else conferir "TLS 1.1 recusado" ok; fi
if tls -tls1; then conferir "TLS 1.0 recusado" falha; else conferir "TLS 1.0 recusado" ok; fi

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
