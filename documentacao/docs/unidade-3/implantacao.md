# Implantação

O sistema roda na VPS da FBr, no [Coolify](https://coolify.io/) da clínica, em dois ambientes do projeto **FBr Clínica Escola**. Cada um é implantado sozinho a cada merge na sua branch, pelo workflow **Implantação** do GitHub Actions.

| Ambiente | Branch | Site | API | Dados |
| --- | --- | --- | --- | --- |
| Produção (`production`) | `main` | [clinica.fbr.edu.br](https://clinica.fbr.edu.br) | `api.clinica.fbr.edu.br` | Os da clínica, quando a FBr começar a usar |
| Validação (`validacao`) | `development` | [validacao.clinica.fbr.edu.br](https://validacao.clinica.fbr.edu.br) | `api.validacao.clinica.fbr.edu.br` | Só fictícios: uma faixa no topo de todas as páginas avisa disso |

A web e a API de cada ambiente ficam no mesmo site (`fbr.edu.br`), que é a condição para o cookie da sessão (`SameSite=Lax`) chegar à API ([#161](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/161)).

## Fluxo das branches

1. As PRs de feature, correção e documentação vão para a `development` ([Boas práticas de utilização do GitHub](../unidade-1/gestao/boas-praticas-github.md#branch-de-destino)). O merge implanta a validação, onde a equipe e a FBr conferem a mudança. A `development` é a versão integrada: o merge marca o D4.3 da feature, e os testes que passam nela contam para o D4.5.
2. Quando a validação estiver conferida, alguém abre a PR `main <- development`. Depois do merge, o deploy da produção espera a aprovação do Joaquim ou do Gabriel no ambiente `producao` do GitHub, na execução do workflow, e só então sobe.

As duas branches têm as mesmas regras de proteção: PR com aprovação de outro integrante e os checks obrigatórios do CI.

## Como o deploy acontece

O workflow `.github/workflows/implantacao.yml` roda a cada push na `main` ou na `development`:

1. Compila a imagem da API (`apps/api/Dockerfile`) e a da web (`apps/web/Dockerfile`) e publica as duas no GHCR (`ghcr.io/mdsreq-fga-unb/clinica-api` e `clinica-web`), com a etiqueta da branch e a do commit. A imagem da web é compilada por ambiente, porque o endereço da API e o nome do ambiente entram no build do Next.
2. Pede o deploy ao Coolify, que sobe o compose do ambiente ([`implantacao/docker-compose.yml`](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/blob/main/implantacao/docker-compose.yml)):
    - **banco:** Postgres 17, sem porta exposta, com os dados num volume;
    - **migrador:** a mesma imagem da API, que aplica as migrations com o dono do banco e sai. A API só sobe se ele terminar sem erro;
    - **api** e **web:** atrás do proxy do Coolify, com HTTPS. A API escuta na porta 3333 e a web na 3000, e o domínio de cada uma no Coolify leva essa porta (`https://api.clinica.fbr.edu.br:3333`), que o proxy usa e que não aparece no endereço.
3. Espera a API publicada responder no `/health` com o commit da execução. Se o migrador falhar, a API anterior continua no ar, e o workflow falha.

O resumo da execução, na aba Actions, mostra o commit que entrou no ar.

## Configuração

Nenhum segredo fica no repositório. Os valores ficam no GitHub e no Coolify:

| Onde | O quê |
| --- | --- |
| GitHub, variáveis do repositório | `COOLIFY_URL`, só `https://<nome do painel>`, sem barra no fim, porta ou caminho, e `COOLIFY_IP`, o IP da VPS: o pedido de deploy vai direto a ela, porque o Cloudflare na frente do painel barra os IPs do GitHub Actions |
| GitHub, segredo do repositório | `COOLIFY_TOKEN`: token do Coolify que só pode pedir deploy |
| GitHub, ambientes `producao` e `validacao` | `COOLIFY_UUID` (o recurso no Coolify), `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_AMBIENTE` e `WEB_URL` |
| Coolify, variáveis de cada ambiente | `SENHA_BANCO`, `SENHA_CLINICA_APP`, `DATABASE_URL_API`, `WEB_URL`, `CHAVE_DADOS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `SMTP_EHLO`, `SALTOS_DE_PROXY` e, só na validação, `INSCRICAO_ABERTA=true` |
| VPS, Docker do `root` | Login no GHCR (`docker login ghcr.io`) com um token clássico só de leitura de pacotes (`read:packages`), porque as imagens são privadas. Quando o token expirar, o Coolify deixa de baixar as imagens novas, e o deploy falha até alguém fazer o login de novo |
| Cloudflare, zona `fbr.edu.br` | Os quatro registros dos endereços acima, apontando para a VPS. Só o `clinica.fbr.edu.br` passa pelo proxy do Cloudflare: o certificado gratuito dele cobre um nível de subdomínio (`*.fbr.edu.br`), então os outros três vão direto à VPS, e o certificado deles é do Let's Encrypt, emitido pelo proxy do Coolify, como no `api.sistema.fbr.edu.br`. Nos dois caminhos, o TLS mínimo é o 1.2 |

Cada ambiente tem a sua `CHAVE_DADOS` ([RNF51](../unidade-2/requisitos/nao-funcionais.md#rnf51)). Sem ela, os dados de saúde ficam ilegíveis, inclusive nas cópias de segurança. Por isso, guarde uma cópia de cada uma fora da VPS, no cofre de senhas da coordenação.

**E-mail.** Os convites (RF53) e os códigos de verificação (RF52) saem pelo relay SMTP do Google Workspace da FBr (`smtp-relay.gmail.com`), o mesmo do sistema da FBr. Ele aceita o envio pelo IP da VPS, sem usuário e senha, e pede que a conexão se apresente com o domínio (`SMTP_EHLO`). O remetente é um endereço `@fbr.edu.br`.

**Proxy.** Na frente da API fica só o proxy do Coolify, por isso `SALTOS_DE_PROXY=1`. Assim, o limite de inscrições por origem (RF1) vale para cada visitante, e não para todos juntos, e ninguém consegue se passar por outra origem mandando o próprio `X-Forwarded-For`. Se a API passar a ficar atrás do Cloudflare, o valor vira 2.

**Inscrição pública.** A inscrição coleta dados de saúde e só abre ao público com o termo de consentimento (RF57), do Ciclo 4. Até lá, a produção sobe sem `INSCRICAO_ABERTA`, e a inscrição fica fechada: a API recusa as inscrições novas, e a página de inscrição mostra só o aviso e os contatos de emergência. A entrada da equipe funciona normalmente. A validação tem `INSCRICAO_ABERTA=true`, com dados fictícios. Quando o RF57 entrar na produção, basta pôr `INSCRICAO_ABERTA=true` no ambiente `production` do Coolify e reiniciar o recurso, sem compilar as imagens de novo.

## Primeira conta da coordenação

Um ambiente novo começa sem usuários. A primeira conta da coordenação é criada uma vez, no terminal do contêiner da API, pelo painel do Coolify:

```bash
NOME="Nome da coordenadora" EMAIL=coordenacao@fbr.edu.br node dist/scripts/primeira-coordenacao.js
```

A pessoa recebe o convite por e-mail e cria a própria senha. Os demais usuários são cadastrados por ela (RF53). O script recusa o pedido se o ambiente já tiver uma conta da coordenação. Se o e-mail não sair, ele mostra o link do convite para quem rodou o comando repassar. Esse link dá acesso à conta da coordenação. Por isso, repasse só por um canal privado, direto à pessoa, e confirme que ela ativou a conta logo depois. O link vale uma vez só e expira no prazo dos convites (parâmetro `validade_convite_horas`).

**Mesma VPS.** A produção e a validação dividem a VPS, e com ela a CPU. Testes de carga, como os do RNF12 e do RNF21, só rodam contra a validação fora do horário de uso da clínica, para não pesar na produção.

## Pendências

- **Usuário da aplicação no banco (RNF52):** quando a [#174](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/174) entrar, o migrador passa a aplicar as permissões do `clinica_app` com a `SENHA_CLINICA_APP`. A partir daí, a `DATABASE_URL_API` passa a usar esse usuário, e não o dono do banco.
- **Cópia de segurança (RNF53):** depois da [#172](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/172), falta agendar a cópia diária de cada banco na VPS e definir com a FBr o destino fora do servidor.
