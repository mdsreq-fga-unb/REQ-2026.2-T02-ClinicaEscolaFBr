# Implantação

O sistema roda na VPS da FBr, no [Coolify](https://coolify.io/) da clínica, em dois ambientes do projeto **FBr Clínica Escola**. Cada um é implantado sozinho a cada merge na sua branch, pelo workflow **Implantação** do GitHub Actions.

| Ambiente | Branch | Site | API | Dados |
| --- | --- | --- | --- | --- |
| Produção (`production`) | `main` | [clinica.fbr.edu.br](https://clinica.fbr.edu.br) | `api.clinica.fbr.edu.br` | Os da clínica, quando a FBr começar a usar |
| Validação (`validacao`) | `development` | [validacao.clinica.fbr.edu.br](https://validacao.clinica.fbr.edu.br) | `api.validacao.clinica.fbr.edu.br` | Só fictícios: uma faixa no topo de todas as páginas avisa disso |

A web e a API de cada ambiente ficam no mesmo site (`fbr.edu.br`), que é a condição para o cookie da sessão (`SameSite=Lax`) chegar à API ([#161](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/161)).

## Fluxo das branches

1. As PRs de feature, correção e documentação vão para a `development` ([Boas práticas de utilização do GitHub](../unidade-1/gestao/boas-praticas-github.md#branch-de-destino)). O merge implanta a validação, onde a equipe e a FBr conferem a mudança.
2. Quando a validação estiver conferida, alguém abre a PR `main <- development`. O merge dela implanta a produção.

As duas branches têm as mesmas regras de proteção: PR com aprovação de outro integrante e os checks obrigatórios do CI.

## Como o deploy acontece

O workflow `.github/workflows/implantacao.yml` roda a cada push na `main` ou na `development`:

1. Compila a imagem da API (`apps/api/Dockerfile`) e a da web (`apps/web/Dockerfile`) e publica as duas no GHCR (`ghcr.io/mdsreq-fga-unb/clinica-api` e `clinica-web`), com a etiqueta da branch e a do commit. A imagem da web é compilada por ambiente, porque o endereço da API e o nome do ambiente entram no build do Next.
2. Pede o deploy ao Coolify, que sobe o compose do ambiente ([`implantacao/docker-compose.yml`](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/blob/main/implantacao/docker-compose.yml)):
    - **banco:** Postgres 17, sem porta exposta, com os dados num volume;
    - **migrador:** a mesma imagem da API, que aplica as migrations com o dono do banco e sai. A API só sobe se ele terminar sem erro;
    - **api** e **web:** atrás do proxy do Coolify, com HTTPS.
3. Espera a API publicada responder no `/health` com o commit da execução. Se o migrador falhar, a API anterior continua no ar, e o workflow falha.

O resumo da execução, na aba Actions, mostra o commit que entrou no ar.

## Configuração

Nenhum segredo fica no repositório. Os valores ficam no GitHub e no Coolify:

| Onde | O quê |
| --- | --- |
| GitHub, variável do repositório | `COOLIFY_URL` |
| GitHub, segredo do repositório | `COOLIFY_TOKEN`: token do Coolify que só pode pedir deploy |
| GitHub, ambientes `producao` e `validacao` | `COOLIFY_UUID` (o recurso no Coolify), `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_AMBIENTE` e `WEB_URL` |
| Coolify, variáveis de cada ambiente | `SENHA_BANCO`, `SENHA_CLINICA_APP`, `DATABASE_URL_API`, `WEB_URL`, `CHAVE_DADOS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `SMTP_EHLO` e `SALTOS_DE_PROXY` |
| Cloudflare, zona `fbr.edu.br` | Os quatro registros dos endereços acima, apontando para a VPS. Só o `clinica.fbr.edu.br` passa pelo proxy do Cloudflare: o certificado gratuito dele cobre um nível de subdomínio (`*.fbr.edu.br`), então os outros três vão direto à VPS, e o certificado deles é do Let's Encrypt, emitido pelo proxy do Coolify, como no `api.sistema.fbr.edu.br`. Nos dois caminhos, o TLS mínimo é o 1.2 |

Cada ambiente tem a sua `CHAVE_DADOS` ([RNF51](../unidade-2/requisitos/nao-funcionais.md#rnf51)). Sem ela, os dados de saúde ficam ilegíveis, inclusive nas cópias de segurança. Por isso, guarde uma cópia de cada uma fora da VPS, no cofre de senhas da coordenação.

**E-mail.** Os convites (RF53) e os códigos de verificação (RF52) saem pelo relay SMTP do Google Workspace da FBr (`smtp-relay.gmail.com`), o mesmo do sistema da FBr. Ele aceita o envio pelo IP da VPS, sem usuário e senha, e pede que a conexão se apresente com o domínio (`SMTP_EHLO`). O remetente é um endereço `@fbr.edu.br`.

**Proxy.** Na frente da API fica só o proxy do Coolify, por isso `SALTOS_DE_PROXY=1`. Assim, o limite de inscrições por origem (RF1) vale para cada visitante, e não para todos juntos, e ninguém consegue se passar por outra origem mandando o próprio `X-Forwarded-For`. Se a API passar a ficar atrás do Cloudflare, o valor vira 2.

## Primeira conta da coordenação

Um ambiente novo começa sem usuários. A primeira conta da coordenação é criada uma vez, no terminal do contêiner da API, pelo painel do Coolify:

```bash
NOME="Nome da coordenadora" EMAIL=coordenacao@fbr.edu.br node dist/scripts/primeira-coordenacao.js
```

A pessoa recebe o convite por e-mail e cria a própria senha. Os demais usuários são cadastrados por ela (RF53). O script recusa o pedido se o ambiente já tiver uma conta da coordenação. Se o e-mail não sair, ele mostra o link do convite para quem rodou o comando repassar.

## Pendências

- **Usuário da aplicação no banco (RNF52):** quando a [#174](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/174) entrar, o migrador passa a aplicar as permissões do `clinica_app` com a `SENHA_CLINICA_APP`. A partir daí, a `DATABASE_URL_API` passa a usar esse usuário, e não o dono do banco.
- **Cópia de segurança (RNF53):** depois da [#172](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/172), falta agendar a cópia diária de cada banco na VPS e definir com a FBr o destino fora do servidor.
