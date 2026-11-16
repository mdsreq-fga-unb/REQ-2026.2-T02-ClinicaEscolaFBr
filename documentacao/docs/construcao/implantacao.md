# Implantação e segurança

O sistema roda na VPS da FBr, no [Coolify](https://coolify.io/) da clínica, em dois ambientes do projeto **FBr Clínica Escola**. Cada um é implantado sozinho a cada merge na sua branch, pelo workflow **Implantação** do GitHub Actions.

| Ambiente | Branch | Site | API | Dados |
| --- | --- | --- | --- | --- |
| Produção (`production`) | `main` | [clinica.fbr.edu.br](https://clinica.fbr.edu.br) | `api.clinica.fbr.edu.br` | Os da clínica, quando a FBr começar a usar |
| Validação (`validacao`) | `development` | [validacao.clinica.fbr.edu.br](https://validacao.clinica.fbr.edu.br) | `api.validacao.clinica.fbr.edu.br` | Só fictícios: uma faixa no topo de todas as páginas avisa disso |

A web e a API de cada ambiente ficam no mesmo site (`fbr.edu.br`), que é a condição para o cookie da sessão (`SameSite=Lax`) chegar à API ([#161](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/161)).

## Fluxo das branches

1. As PRs de feature, correção e documentação vão para a `development` ([Boas práticas de utilização do GitHub](../processo/boas-praticas-github.md#branch-de-destino)). O merge implanta a validação, onde a equipe e a FBr conferem a mudança. A `development` é a versão integrada: o merge marca o D4.3 da feature, e os testes que passam nela contam para o D4.5.
2. Quando a validação estiver conferida, alguém abre a PR `main <- development`. Depois do merge, o deploy da produção espera a aprovação do Joaquim ou do Gabriel no ambiente `producao` do GitHub, na execução do workflow, e só então sobe.

As duas branches têm as mesmas regras de proteção: PR com aprovação de outro integrante e os checks obrigatórios do CI.

## Como o deploy acontece

O workflow `.github/workflows/implantacao.yml` roda a cada push na `main` ou na `development`:

1. Compila a imagem da API (`apps/api/Dockerfile`) e a da web (`apps/web/Dockerfile`) e publica as duas no GHCR (`ghcr.io/mdsreq-fga-unb/clinica-api` e `clinica-web`), com a etiqueta da branch e a do commit. A imagem da web é compilada por ambiente, porque o endereço da API e o nome do ambiente entram no build do Next.
2. Pede o deploy ao Coolify, que sobe o compose do ambiente ([`implantacao/docker-compose.yml`](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/blob/main/implantacao/docker-compose.yml)):
    - **banco:** Postgres 17, sem porta exposta, com os dados num volume;
    - **migrador:** a mesma imagem da API, que aplica as migrations com o dono do banco e sai. A API só sobe se ele terminar sem erro;
    - **api** e **web:** atrás do proxy do Coolify, com HTTPS. A API escuta na porta 3333 e a web na 3000, e o domínio de cada uma no Coolify leva essa porta (`https://api.clinica.fbr.edu.br:3333`), que o proxy usa e que não aparece no endereço.
3. Espera a API publicada responder no `/health` com o commit da execução.

O Coolify recria todos os contêineres do ambiente a cada deploy (`docker compose up --force-recreate`), então o sistema fica fora do ar por alguns segundos. Se o migrador falhar, a API nova não sobe e a anterior já foi parada: o ambiente fica fora do ar, e o workflow falha. Para voltar, corrija o erro ou reverta a PR na branch do ambiente, e o merge implanta de novo.

O resumo da execução, na aba Actions, mostra o commit que entrou no ar.

## Configuração

Nenhum segredo fica no repositório. Os valores ficam no GitHub e no Coolify:

| Onde | O quê |
| --- | --- |
| GitHub, variáveis do repositório | `COOLIFY_URL`, só `https://<nome do painel>`, sem barra no fim, porta ou caminho, e `COOLIFY_IP`, o IP da VPS: o pedido de deploy vai direto a ela, porque o Cloudflare na frente do painel barra os IPs do GitHub Actions |
| GitHub, segredo do repositório | `COOLIFY_TOKEN`: token do Coolify que só pode pedir deploy |
| GitHub, ambientes `producao` e `validacao` | `COOLIFY_UUID` (o recurso no Coolify), `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_AMBIENTE` e `WEB_URL` |
| Coolify, variáveis de cada ambiente | `SENHA_BANCO`, `SENHA_CLINICA_APP`, `DATABASE_URL_API`, `WEB_URL`, `CHAVE_DADOS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `SMTP_EHLO`, `SALTOS_DE_PROXY`, `AMBIENTE_APLICACAO` (`validacao` na validação e `producao` na produção) e, só na validação, `INSCRICAO_ABERTA=true` |
| VPS, Docker do `root` | Login no GHCR (`docker login ghcr.io`) com um token clássico só de leitura de pacotes (`read:packages`), porque as imagens são privadas. O token é da conta `jj-viana` (Joaquim) e vence em 27/01/2027. Quando ele vencer, ou quando a conta perder o acesso à organização, o Coolify deixa de baixar as imagens novas, e o workflow falha na espera pela versão nova até alguém fazer o login de novo com outro token. O ideal é trocar por um token de uma conta que continue na organização depois do semestre |
| Cloudflare, zona `fbr.edu.br` | Os quatro registros dos endereços acima, apontando para a VPS. Só o `clinica.fbr.edu.br` passa pelo proxy do Cloudflare: o certificado gratuito dele cobre um nível de subdomínio (`*.fbr.edu.br`), então os outros três vão direto à VPS, e o certificado deles é do Let's Encrypt, emitido pelo proxy do Coolify, como no `api.sistema.fbr.edu.br`. Nos dois caminhos, o TLS mínimo é o 1.2 |

Cada ambiente tem a sua `CHAVE_DADOS` ([RNF51](../requisitos/nao-funcionais.md#rnf51)). Sem ela, os dados de saúde ficam ilegíveis, inclusive nas cópias de segurança. Por isso, guarde uma cópia de cada uma fora da VPS, no cofre de senhas da coordenação.

**E-mail.** Os convites (RF53) e os códigos de verificação (RF52) saem pelo relay SMTP do Google Workspace da FBr (`smtp-relay.gmail.com`), o mesmo do sistema da FBr. Ele aceita o envio pelo IP da VPS, sem usuário e senha, e pede que a conexão se apresente com o domínio (`SMTP_EHLO`). O remetente é um endereço `@fbr.edu.br`.

**Proxy.** Na frente da API fica só o proxy do Coolify, por isso `SALTOS_DE_PROXY=1`. Assim, o limite de inscrições por origem (RF1) vale para cada visitante, e não para todos juntos, e ninguém consegue se passar por outra origem mandando o próprio `X-Forwarded-For`. Se a API passar a ficar atrás do Cloudflare, o valor vira 2.

**Inscrição pública.** A inscrição coleta dados de saúde. Na validação, configurar **`AMBIENTE_APLICACAO=validacao` antes do merge da RF57**, junto de `INSCRICAO_ABERTA=true`, para testes com dados fictícios enquanto o termo for provisório. Joaquim, responsável pela implantação, deve confirmar essa configuração no Coolify antes do merge; sua aplicação não é feita por esta alteração de código. O compose repassa a variável à API e adota `producao` quando ausente. Isso é necessário porque o contêiner usa `NODE_ENV=production` também na validação. Em produção, manter `AMBIENTE_APLICACAO=producao`: abrir `INSCRICAO_ABERTA=true` só permite inscrições quando a versão vigente do termo também estiver aprovada (`provisoria=false`). O texto 0.1 continua provisório e o R4.4 permanece pendente; não libera inscrições reais. Até a aprovação, manter a inscrição pública fechada. A entrada da equipe permanece disponível. A configuração muda no Coolify e exige reiniciar o recurso; a publicação de um novo texto aprovado exige uma nova migration, preservando as versões e os aceites anteriores.

## Primeira conta da coordenação

Um ambiente novo começa sem usuários. A primeira conta da coordenação é criada uma vez, no terminal do contêiner da API, pelo painel do Coolify:

```bash
NOME="Nome da coordenadora" EMAIL=coordenacao@fbr.edu.br node dist/scripts/primeira-coordenacao.js
```

A pessoa recebe o convite por e-mail e cria a própria senha. Os demais usuários são cadastrados por ela (RF53). O script recusa o pedido se o ambiente já tiver uma conta da coordenação. Se o e-mail não sair, ele mostra o link do convite para quem rodou o comando repassar. Esse link dá acesso à conta da coordenação. Por isso, repasse só por um canal privado, direto à pessoa, e confirme que ela ativou a conta logo depois. O link vale uma vez só e expira no prazo dos convites (parâmetro `validade_convite_horas`).

**Mesma VPS.** A produção e a validação dividem a VPS, e com ela a CPU. Testes de carga, como os do RNF12 e do RNF21, só rodam contra a validação fora do horário de uso da clínica, para não pesar na produção.

## Segurança da implantação (RNF51 e RNF52) { #seguranca-da-implantacao }

Procedimentos de segurança que só se completam com o sistema publicado, exigidos pelo [RNF51](../requisitos/nao-funcionais.md#rnf51) (criptografia dos dados) e pelo [RNF52](../requisitos/nao-funcionais.md#rnf52) (registro de acessos ao prontuário). A parte que dá para testar sem o sistema publicado já é verificada no CI. O restante é conferido na validação e na produção, e a evidência entra nas issues com `/rnf`. A cópia de segurança (RNF53) tem a sua própria página, [Cópia de segurança e restauração](copia-de-seguranca.md).

### O que o CI já verifica { #o-que-o-ci-ja-verifica }

| Verificação | Onde | RNF |
| --- | --- | --- |
| Dados de saúde gravados cifrados e legíveis só com a chave | Testes da API que citam o RNF51 | RNF51 |
| Nenhuma chave, senha ou token no repositório, em todo o histórico | Workflow "Segredos" (gitleaks, com as exceções do `.gitleaks.toml`) | RNF51 |
| Troca da chave sem perda de dados, inclusive nas tabelas que só aceitam inserção, registrada com o responsável; chaves inválidas ou iguais recusadas antes de mexer no banco | `troca-de-chave.spec.ts` | RNF51 |
| Registros de acesso ao prontuário gravados, sem poder ser alterados nem apagados | Testes da API que citam o RNF52 | RNF52 |
| Usuário da aplicação no banco só insere e consulta os registros que não podem mudar, inclusive em tabelas novas com o mesmo gatilho | `usuario-da-aplicacao.spec.ts` | RNF52 |
| A suíte e2e inteira passa com a API conectada como `clinica_app` | Job "e2e" do CI | RNF52 |

### Usuário da aplicação no banco (RNF52) { #usuario-da-aplicacao-no-banco-rnf52 }

As migrations rodam com o dono do banco. A API se conecta com outro usuário, o `clinica_app`, que lê e grava os dados, mas só **insere e consulta** as tabelas com o gatilho que impede alterar ou apagar o registro: os acessos ao prontuário, a auditoria, as evoluções e as decisões de prioridade. Uma tabela nova com esse gatilho entra sozinha.

Na VPS, nada disso é feito à mão: a cada deploy, o serviço **migrador** aplica as migrations, roda o `packages/database/sql/usuario-da-aplicacao.sql` e define a senha do `clinica_app` com a `SENHA_CLINICA_APP` do Coolify. Se o script faltar na imagem, o migrador falha, e a API não sobe: o ambiente fica fora do ar até um deploy que passe ([Implantação](#como-o-deploy-acontece)).

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

### HTTPS e TLS (RNF51) { #https-e-tls-rnf51 }

Depois de cada implantação, rode o workflow **Verificar implantação** (aba Actions, "Run workflow") e escolha o ambiente: validação, produção ou os dois. Ele confere, no endereço do site e no da API de cada ambiente, que:

- o acesso por HTTP é redirecionado para HTTPS, no mesmo endereço;
- o TLS 1.2 ou superior é aceito;
- o TLS 1.0 e 1.1 são recusados;
- o certificado é válido para o domínio.

O OpenSSL 3 não oferece TLS 1.0 e 1.1 no nível de segurança padrão, e aí a sonda falharia no próprio cliente, parecendo uma recusa do servidor. Por isso, as sondas antigas usam `SECLEVEL=0`, e o workflow começa por um autoteste contra servidores do badssl.com que **aceitam** essas versões: se o cliente não conseguir negociar com eles, a execução falha. A recusa também só conta depois de o servidor responder ao TLS 1.2, para um erro de rede não passar por recusa.

O mesmo script roda no terminal, com o OpenSSL 3: `bash scripts/implantacao/verificar-https.sh --autoteste` e depois `bash scripts/implantacao/verificar-https.sh <domínio>`.

### Gestão e troca da chave dos dados (RNF51) { #gestao-e-troca-da-chave-dos-dados-rnf51 }

- **Onde fica a chave:** a `CHAVE_DADOS` de cada ambiente fica só nas variáveis do Coolify e numa cópia fora da VPS, nunca no repositório (o workflow "Segredos" confere) e nunca no banco. **Quem guarda a cópia fora da VPS ainda precisa ser decidido com a FBr:** um cofre da coordenação, com pelo menos duas pessoas, garante que a chave não se perca, e acesso só do responsável técnico designado pela FBr reduz quem pode ler os dados. A pergunta foi levada à FBr em 06/11/2026.
- **Troca:** pelo menos uma vez por ano, e na hora se houver suspeita de vazamento. Faça na validação antes da produção. O contêiner da API só tem a URL do `clinica_app`, que não pode desligar os gatilhos, e parar o recurso inteiro no Coolify derruba também o banco. Por isso, a troca roda num contêiner avulso da imagem da API, com o dono do banco e com só a API parada:
    1. Gere a chave nova com o comando do Passo 7 do README (`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`).
    2. Na VPS, pare só o contêiner da API, para nada ser gravado durante a troca: `docker stop api-<uuid>`. O site continua no ar, mas sem conseguir entrar. **Não mescle nada na branch do ambiente até o passo 4:** um deploy no meio da troca subiria a API de novo, com a chave antiga.
    3. Leia as chaves e a senha do banco sem deixá-las no histórico do shell, e rode a troca na rede do recurso (o UUID do recurso no Coolify), com a imagem da API em uso:

        ```bash
        read -rsp 'Chave antiga: ' CHAVE_DADOS_ANTIGA; echo
        read -rsp 'Chave nova: ' CHAVE_DADOS_NOVA; echo
        read -rsp 'Senha do banco (SENHA_BANCO): ' SENHA_BANCO; echo
        export CHAVE_DADOS_ANTIGA CHAVE_DADOS_NOVA
        export DATABASE_URL="postgresql://clinica:${SENHA_BANCO}@banco:5432/clinica"
        docker run --rm --network <uuid> \
          -e DATABASE_URL -e CHAVE_DADOS_ANTIGA -e CHAVE_DADOS_NOVA -e RESPONSAVEL="Nome" \
          "$(docker inspect -f '{{.Image}}' api-<uuid>)" node dist/scripts/trocar-chave-dados.js
        unset CHAVE_DADOS_ANTIGA CHAVE_DADOS_NOVA SENHA_BANCO DATABASE_URL
        ```

        O `{{.Image}}` é o identificador da imagem em execução, e não a etiqueta, que pode já apontar para uma versão mais nova. Antes de mexer no banco, o script recusa uma chave que não tenha 32 bytes, uma chave nova igual à antiga e a troca com qualquer outra conexão aberta no banco, como a da API, esteja ela com o dono ou com o `clinica_app`. A troca é feita numa transação só: se algum valor não decifrar com a chave antiga, nada é alterado. Ela fica registrada na auditoria (`trocar_chave_dados`), com a data, o responsável, as colunas e a quantidade de valores, sem nenhum dado.
    4. No Coolify, troque a `CHAVE_DADOS` do ambiente pela nova e faça o redeploy. Entre no sistema e abra um prontuário para conferir que os dados continuam legíveis.
    5. Guarde a chave nova junto da cópia das chaves fora da VPS. As cópias de segurança anteriores continuam com a chave antiga: guarde-a até a última delas expirar.

### Evidência do RNF51 e do RNF52 no D4.5 { #evidencia-do-rnf51-e-do-rnf52-no-d45 }

Nas issues, o RNF51 e o RNF52 só ficam verificados com os testes **e** o registro da implantação (convenção em [Boas práticas de utilização do GitHub](../processo/boas-praticas-github.md#verificacao-dos-rnfs-d45)). Na implantação, registre numa ata, ou num comentário com os links:

- **RNF51:** a execução do "Verificar implantação" do ambiente, a do "Segredos" na `main` e a troca de chave feita na validação. Comente `/rnf RNF51 <link>` nas issues que têm o RNF51.
- **RNF52:** as permissões do `clinica_app` e a consulta do RF56. Comente `/rnf RNF52 <link>`.

## Pendências

- **Usuário da aplicação no banco (RNF52):** desde a [#174](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/174), o migrador aplica as permissões do `clinica_app` com a `SENHA_CLINICA_APP`. Falta fazer, em cada ambiente, a [virada da `DATABASE_URL_API` para o `clinica_app`](#usuario-da-aplicacao-no-banco-rnf52).
- **Cópia de segurança (RNF53):** seguindo a página [Cópia de segurança e restauração](copia-de-seguranca.md), falta criar o par de chaves das cópias, agendar a cópia diária de cada banco na VPS e combinar com a FBr quem guarda as chaves. A FBr cuida das cópias e do destino fora do servidor ([DF46](../requisitos/decisoes-fbr.md#df46)).
