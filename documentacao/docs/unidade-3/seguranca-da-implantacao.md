# Segurança da implantação

Procedimentos de segurança que só se completam com o sistema publicado, exigidos pelo [RNF51](../unidade-2/requisitos/nao-funcionais.md#rnf51) (criptografia dos dados) e pelo [RNF52](../unidade-2/requisitos/nao-funcionais.md#rnf52) (registro de acessos ao prontuário). A parte que dá para testar sem o sistema publicado já é verificada no CI. O restante é conferido na validação e na produção, os dois ambientes do Coolify descritos em [Implantação](implantacao.md), e a evidência entra nas issues com `/rnf`.

A cópia de segurança (RNF53) tem a sua própria página, "Cópia de segurança e restauração", criada na [#172](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/172).

## O que o CI já verifica

| Verificação | Onde | RNF |
| --- | --- | --- |
| Dados de saúde gravados cifrados e legíveis só com a chave | Testes da API que citam o RNF51 | RNF51 |
| Nenhuma chave, senha ou token no repositório, em todo o histórico | Workflow "Segredos" (gitleaks, com as exceções do `.gitleaks.toml`) | RNF51 |
| Troca da chave sem perda de dados, inclusive nas tabelas que só aceitam inserção, registrada com o responsável; chaves inválidas ou iguais recusadas antes de mexer no banco | `troca-de-chave.spec.ts` | RNF51 |
| Registros de acesso ao prontuário gravados, sem poder ser alterados nem apagados | Testes da API que citam o RNF52 | RNF52 |
| Usuário da aplicação no banco só insere e consulta os registros que não podem mudar, inclusive em tabelas novas com o mesmo gatilho | `usuario-da-aplicacao.spec.ts` | RNF52 |
| A suíte e2e inteira passa com a API conectada como `clinica_app` | Job "e2e" do CI | RNF52 |

## Usuário da aplicação no banco (RNF52)

As migrations rodam com o dono do banco. A API se conecta com outro usuário, o `clinica_app`, que lê e grava os dados, mas só **insere e consulta** as tabelas com o gatilho que impede alterar ou apagar o registro: os acessos ao prontuário, a auditoria, as evoluções e as decisões de prioridade. Uma tabela nova com esse gatilho entra sozinha.

Na VPS, nada disso é feito à mão: a cada deploy, o serviço **migrador** aplica as migrations, roda o `packages/database/sql/usuario-da-aplicacao.sql` e define a senha do `clinica_app` com a `SENHA_CLINICA_APP` do Coolify. Se o script faltar na imagem, o migrador falha, e a API anterior continua no ar.

**Virada de cada ambiente para o `clinica_app`**, uma vez só, depois que esta mudança entrar:

1. Faça o merge. O deploy roda o migrador, que cria o `clinica_app` com a senha.
2. No Coolify, troque a `DATABASE_URL_API` do ambiente para o `clinica_app`: `postgresql://clinica_app:<SENHA_CLINICA_APP>@banco:5432/clinica`.
3. Faça o redeploy do recurso e confira a entrada no sistema e a abertura de um prontuário.

Comece pela validação e só depois faça na produção.

**Evidência:** a saída das permissões da tabela de acessos, mostrando só `a` (inserir) e `r` (consultar) para o `clinica_app`. Na VPS, pelo socket do contêiner, sem senha:

```bash
docker exec banco-<uuid> psql -U clinica -d clinica -c '\dp acessos_prontuario'
```

Registre com `/rnf RNF52 <link>` nas issues do RF55 e do RF66. A consulta dos registros pela coordenação (RF56) completa o RNF52 quando for construída.

No desenvolvimento, sem o migrador, rode o script com o dono do banco depois de cada `pnpm db:migrate`: `psql "$DATABASE_URL" -f packages/database/sql/usuario-da-aplicacao.sql`.

## HTTPS e TLS (RNF51)

Depois de cada implantação, rode o workflow **Verificar implantação** (aba Actions, "Run workflow") e escolha o ambiente: validação, produção ou os dois. Ele confere, no endereço do site e no da API de cada ambiente, que:

- o acesso por HTTP é redirecionado para HTTPS, no mesmo endereço;
- o TLS 1.2 ou superior é aceito;
- o TLS 1.0 e 1.1 são recusados;
- o certificado é válido para o domínio.

O OpenSSL 3 não oferece TLS 1.0 e 1.1 no nível de segurança padrão, e aí a sonda falharia no próprio cliente, parecendo uma recusa do servidor. Por isso, as sondas antigas usam `SECLEVEL=0`, e o workflow começa por um autoteste contra servidores do badssl.com que **aceitam** essas versões: se o cliente não conseguir negociar com eles, a execução falha. A recusa também só conta depois de o servidor responder ao TLS 1.2, para um erro de rede não passar por recusa.

O mesmo script roda no terminal, com o OpenSSL 3: `bash scripts/implantacao/verificar-https.sh --autoteste` e depois `bash scripts/implantacao/verificar-https.sh <domínio>`.

## Gestão e troca da chave dos dados (RNF51)

- **Onde fica a chave:** a `CHAVE_DADOS` de cada ambiente fica só nas variáveis do Coolify e numa cópia fora da VPS, nunca no repositório (o workflow "Segredos" confere) e nunca no banco. **Quem guarda a cópia fora da VPS ainda precisa ser decidido com a FBr:** um cofre da coordenação, com pelo menos duas pessoas, garante que a chave não se perca, e acesso só do responsável técnico designado pela FBr reduz quem pode ler os dados. A pergunta vai para a reunião de 06/11.
- **Troca:** pelo menos uma vez por ano, e na hora se houver suspeita de vazamento. Faça na validação antes da produção. O contêiner da API só tem a URL do `clinica_app`, que não pode desligar os gatilhos, e parar o recurso inteiro no Coolify derruba também o banco. Por isso, a troca roda num contêiner avulso da imagem da API, com o dono do banco e com só a API parada:
    1. Gere a chave nova com o comando do Passo 7 do README (`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`).
    2. Na VPS, pare só o contêiner da API, para nada ser gravado durante a troca: `docker stop api-<uuid>`. O site continua no ar, mas sem conseguir entrar.
    3. Leia as chaves e a senha do banco sem deixá-las no histórico do shell, e rode a troca na rede do recurso (o UUID do recurso no Coolify), com a imagem da API em uso:

        ```bash
        read -rs CHAVE_DADOS_ANTIGA && read -rs CHAVE_DADOS_NOVA && read -rs SENHA_BANCO
        export CHAVE_DADOS_ANTIGA CHAVE_DADOS_NOVA
        export DATABASE_URL="postgresql://clinica:${SENHA_BANCO}@banco:5432/clinica"
        docker run --rm --network <uuid> \
          -e DATABASE_URL -e CHAVE_DADOS_ANTIGA -e CHAVE_DADOS_NOVA -e RESPONSAVEL="Nome" \
          "$(docker inspect -f '{{.Config.Image}}' api-<uuid>)" node dist/scripts/trocar-chave-dados.js
        unset CHAVE_DADOS_ANTIGA CHAVE_DADOS_NOVA SENHA_BANCO DATABASE_URL
        ```

        Antes de mexer no banco, o script recusa uma chave que não tenha 32 bytes, uma chave nova igual à antiga e a troca com a API ainda conectada. A troca é feita numa transação só: se algum valor não decifrar com a chave antiga, nada é alterado. Ela fica registrada na auditoria (`trocar_chave_dados`), com a data, o responsável, as colunas e a quantidade de valores, sem nenhum dado.
    4. No Coolify, troque a `CHAVE_DADOS` do ambiente pela nova e faça o redeploy. Entre no sistema e abra um prontuário para conferir que os dados continuam legíveis.
    5. Guarde a chave nova junto da cópia das chaves fora da VPS. As cópias de segurança anteriores continuam com a chave antiga: guarde-a até a última delas expirar.

## Evidência do RNF51 e do RNF52 no D4.5

Nas issues, o RNF51 e o RNF52 só ficam verificados com os testes **e** o registro da implantação (convenção em [Boas práticas de utilização do GitHub](../unidade-1/gestao/boas-praticas-github.md#verificacao-dos-rnfs-d45)). Na implantação, registre numa ata, ou num comentário com os links:

- **RNF51:** a execução do "Verificar implantação" do ambiente, a do "Segredos" na `main` e a troca de chave feita na validação. Comente `/rnf RNF51 <link>` nas issues que têm o RNF51.
- **RNF52:** as permissões do `clinica_app` e a consulta do RF56. Comente `/rnf RNF52 <link>`.
