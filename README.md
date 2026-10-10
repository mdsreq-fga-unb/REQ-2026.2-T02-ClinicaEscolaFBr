# Clínica Escola FBr

Sistema web responsivo para digitalização e gestão da **Clínica Escola de Psicologia da Faculdade Brasília (FBr)**.

📚 **Documentação do projeto (GitHub Pages):** <https://mdsreq-fga-unb.github.io/REQ-2026.2-T02-ClinicaEscolaFBr/>

---

## Sumário

- [Sobre o projeto](#sobre-o-projeto)
- [Tecnologias](#tecnologias)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Como rodar o projeto (passo a passo)](#como-rodar-o-projeto-passo-a-passo)
  - [Passo 1 — Instalar o Git](#passo-1--instalar-o-git)
  - [Passo 2 — Instalar o Node.js 24](#passo-2--instalar-o-nodejs-24)
  - [Passo 3 — Instalar o pnpm](#passo-3--instalar-o-pnpm)
  - [Passo 4 — Instalar o Docker](#passo-4--instalar-o-docker)
  - [Passo 5 — Baixar o projeto](#passo-5--baixar-o-projeto)
  - [Passo 6 — Instalar as dependências](#passo-6--instalar-as-dependências)
  - [Passo 7 — Criar os arquivos de configuração](#passo-7--criar-os-arquivos-de-configuração)
  - [Passo 8 — Ligar o banco de dados](#passo-8--ligar-o-banco-de-dados)
  - [Passo 9 — Preparar o banco](#passo-9--preparar-o-banco)
  - [Passo 10 — Rodar o sistema](#passo-10--rodar-o-sistema)
  - [Passo 11 — Desligar tudo](#passo-11--desligar-tudo)
- [Rotina do dia a dia](#rotina-do-dia-a-dia)
- [Comandos disponíveis](#comandos-disponíveis)
- [Como rodar a documentação localmente](#como-rodar-a-documentação-localmente)
- [Como contribuir](#como-contribuir)
- [Problemas comuns](#problemas-comuns)
- [Equipe](#equipe)

---

## Sobre o projeto

A Clínica Escola de Psicologia da Faculdade Brasília oferta aproximadamente **100 vagas por semestre** de atendimento psicológico gratuito à comunidade de Santa Maria/DF e entorno. Hoje, toda a operação é feita de forma manual e presencial (fichas em papel e planilha Excel), o que gera:

- demora na confirmação de atendimentos;
- faltas e cancelamentos sem aviso;
- horários ociosos de estagiários;
- baixa visibilidade da fila de espera;
- dificuldade de geração de indicadores;
- riscos no tratamento de dados sensíveis.

O **Clínica Escola FBr** digitaliza as etapas permitidas pela regulação — inscrição, triagem, agendamento, confirmação de presença, registro clínico e emissão de documentos — **sem alterar o caráter presencial do atendimento psicológico**, conforme exigido pelo Conselho Regional de Psicologia.

O sistema atende a cinco públicos:

- **Pacientes e responsáveis:** inscrição on-line, consulta da posição na fila e confirmação de presença;
- **Secretaria:** gestão de inscrições, triagem e fila de espera;
- **Estagiários:** agendamento, registro de evolução e prontuário;
- **Supervisores:** acompanhamento e supervisão dos casos;
- **Coordenação:** indicadores, relatórios e gestão geral da clínica.

O MVP reúne 53 dos 68 requisitos funcionais declarados (ver o [Backlog de Produto](https://mdsreq-fga-unb.github.io/REQ-2026.2-T02-ClinicaEscolaFBr/unidade-2/requisitos/backlog/)).

---

## Tecnologias

| Parte                      | Tecnologia                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------- |
| Organização do repositório | Monorepo com **Turborepo** e **pnpm**                                                 |
| Site (front-end)           | **Next.js** + Tailwind CSS + shadcn/ui                                                |
| API (back-end)             | **NestJS**, com um módulo por Área de features do FDD                                 |
| Banco de dados             | **PostgreSQL 17** + Drizzle ORM                                                       |
| Contratos entre site e API | **Zod** (pacote `@clinica/shared`)                                                    |
| Testes                     | Jest (API), Vitest (site), Playwright + axe (acessibilidade WCAG 2.2 AA)              |
| Ambiente local             | **Docker** (PostgreSQL + Mailpit, que captura os e-mails enviados em desenvolvimento) |
| Documentação               | MkDocs Material, publicada no GitHub Pages                                            |
| Integração contínua        | GitHub Actions                                                                        |

---

## Estrutura do repositório

```text
├── apps/
│   ├── web/              Site (Next.js): portal público do paciente e área interna
│   └── api/              API (NestJS): regras de negócio
│       └── src/modules/  Um módulo por Área do FDD (inscrição, triagem, fila, agendamento...)
├── packages/
│   ├── shared/           Contratos (validações e tipos) usados pelo site e pela API
│   ├── database/         Tabelas do banco e migrations
│   ├── eslint-config/    Regras de qualidade de código compartilhadas
│   └── typescript-config/ Configurações de TypeScript compartilhadas
├── documentacao/         Site de documentação (MkDocs)
│   ├── docs/             Páginas da documentação (Unidades 1, 2...)
│   ├── overrides/        Personalizações do tema
│   └── mkdocs.yml        Configuração do site de documentação
├── .githooks/            Validações automáticas feitas antes de cada commit
├── .github/              Workflows (CI, deploy da documentação) e template de PR
├── docker-compose.yml    Banco de dados e Mailpit para desenvolvimento
├── .env.example          Modelo das configurações locais da API
├── package.json          Comandos do projeto (pnpm dev, pnpm test...)
└── turbo.json            Configuração do Turborepo
```

---

## Como rodar o projeto (passo a passo)

Este tutorial parte do zero: mesmo que você nunca tenha usado Docker, Node.js ou pnpm, é só seguir os passos na ordem. Cada passo tem instruções separadas para **macOS**, **Linux** (Ubuntu/Debian) e **Windows**.

> **Onde digitar os comandos**
>
> - **macOS:** aplicativo **Terminal** (ou o terminal do VS Code).
> - **Linux:** aplicativo **Terminal**.
> - **Windows:** **PowerShell** (procure "PowerShell" no menu Iniciar). Quando o passo disser "como administrador", clique com o botão direito em PowerShell e escolha **Executar como administrador**.
>
> Copie um comando por vez, cole no terminal e aperte **Enter**. Espere terminar antes de passar para o próximo.

**Resumo do que você vai instalar** (só na primeira vez):

| Ferramenta     | Para que serve                                                           |
| -------------- | ------------------------------------------------------------------------ |
| **Git**        | Baixar o projeto e enviar suas alterações                                |
| **Node.js 24** | Executar o site e a API (ambos são JavaScript/TypeScript)                |
| **pnpm**       | Instalar as bibliotecas do projeto e rodar os comandos dele              |
| **Docker**     | Rodar o banco de dados sem precisar instalá-lo diretamente no computador |

---

### Passo 1 — Instalar o Git

Confira se você já tem o Git:

```bash
git --version
```

Se aparecer algo como `git version 2.x.x`, pode pular para o Passo 2.

<details>
<summary><strong>macOS</strong></summary>

```bash
xcode-select --install
```

Uma janela vai abrir pedindo para instalar as ferramentas de desenvolvedor. Clique em **Instalar** e espere terminar.

</details>

<details>
<summary><strong>Linux (Ubuntu/Debian)</strong></summary>

```bash
sudo apt update && sudo apt install -y git curl
```

O `sudo` pede a sua senha do computador (ela não aparece enquanto você digita — é normal).

</details>

<details>
<summary><strong>Windows</strong></summary>

```powershell
winget install -e --id Git.Git
```

Feche e abra o PowerShell de novo depois da instalação. Se o comando `winget` não existir, baixe o instalador em <https://git-scm.com/download/win> e avance com as opções padrão.

</details>

---

### Passo 2 — Instalar o Node.js 24

O projeto exige o **Node.js 24**. Confira a versão que você tem:

```bash
node --version
```

Se aparecer `v24.x.x`, pode pular para o Passo 3.

<details>
<summary><strong>macOS e Linux</strong> (usando o nvm, que permite ter várias versões do Node)</summary>

1. Instale o nvm:

   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
   ```

2. **Feche o terminal e abra um novo** (para ele reconhecer o nvm).
3. Instale o Node 24 e deixe-o como padrão:

   ```bash
   nvm install 24
   ```

   ```bash
   nvm alias default 24
   ```

4. Confira: `node --version` deve mostrar `v24.x.x`.

> Já tem o nvm e outras versões do Node? Dentro da pasta do projeto, `nvm use` escolhe sozinho a versão certa, porque o arquivo `.nvmrc` diz qual é.

</details>

<details>
<summary><strong>Windows</strong></summary>

```powershell
winget install -e --id OpenJS.NodeJS.LTS
```

Feche e abra o PowerShell de novo e confira: `node --version` deve mostrar `v24.x.x`. Se o `winget` não existir, baixe o instalador **LTS** em <https://nodejs.org> e avance com as opções padrão.

</details>

---

### Passo 3 — Instalar o pnpm

O **pnpm** instala as bibliotecas do projeto. O comando é igual nos três sistemas:

```bash
npm install -g pnpm@10
```

Confira: `pnpm --version` deve mostrar `10.x.x`.

> **Windows:** se aparecer o erro _"a execução de scripts foi desabilitada neste sistema"_, rode o comando abaixo, confirme com `S` (ou `Y`) e tente de novo:
>
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
> ```

---

### Passo 4 — Instalar o Docker

**O que é o Docker, em uma frase:** ele roda programas (como o banco de dados PostgreSQL) dentro de "caixinhas" isoladas, chamadas contêineres. Assim ninguém precisa instalar e configurar o PostgreSQL na mão, e o banco fica igual na máquina de todo mundo.

Confira se você já tem o Docker funcionando:

```bash
docker --version
```

```bash
docker compose version
```

Se os dois mostrarem uma versão, pode pular para o Passo 5.

<details>
<summary><strong>macOS</strong></summary>

1. Baixe o **Docker Desktop** em <https://www.docker.com/products/docker-desktop/>. Escolha a versão do seu processador:
   - **Apple Silicon** (M1, M2, M3, M4…) ou **Intel**. Para saber qual é o seu: menu → **Sobre este Mac** → linha "Chip" ou "Processador".
2. Abra o arquivo baixado e arraste o Docker para a pasta **Aplicativos**.
3. Abra o **Docker** pela pasta Aplicativos. Aceite os termos de uso (o uso para estudo é gratuito) e digite sua senha se ele pedir.
4. Espere o ícone da baleia 🐳 na barra de menus parar de se mexer. No rodapé do Docker Desktop deve aparecer **Engine running**.
5. **Abra um terminal novo** e confira com `docker --version`.

> Se o terminal disser que o comando `docker` não existe mesmo com o Docker Desktop aberto, veja [Problemas comuns](#problemas-comuns).

</details>

<details>
<summary><strong>Linux (Ubuntu/Debian)</strong></summary>

1. Instale o Docker com o script oficial:

   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

2. Permita que seu usuário use o Docker sem `sudo`:

   ```bash
   sudo usermod -aG docker $USER
   ```

3. **Saia da sua sessão e entre de novo** (ou reinicie o computador) para a permissão valer.
4. Confira com `docker --version` e `docker compose version`.

</details>

<details>
<summary><strong>Windows</strong></summary>

O Docker no Windows precisa do **WSL 2** (um Linux que roda dentro do Windows).

1. Abra o PowerShell **como administrador** e instale o WSL:

   ```powershell
   wsl --install
   ```

2. **Reinicie o computador.** Na volta, uma janela do Ubuntu pode abrir pedindo um nome de usuário e uma senha — crie os dois (podem ser simples, é só para o Linux interno).
3. Instale o Docker Desktop (PowerShell normal):

   ```powershell
   winget install -e --id Docker.DockerDesktop
   ```

   Se o `winget` não existir, baixe em <https://www.docker.com/products/docker-desktop/>.

4. Abra o **Docker Desktop** pelo menu Iniciar, aceite os termos e, se ele perguntar, mantenha marcada a opção **Use WSL 2**.
5. Espere aparecer **Engine running** no rodapé do Docker Desktop.
6. Feche e abra o PowerShell de novo e confira com `docker --version`.

</details>

> **Importante:** o Docker Desktop (macOS e Windows) precisa estar **aberto** sempre que você for rodar o projeto.

---

### Passo 5 — Baixar o projeto

Escolha a pasta onde o projeto vai ficar (por exemplo, `Documentos`) e baixe o repositório:

```bash
git clone https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr.git
```

Entre na pasta do projeto — **todos os próximos comandos são rodados dentro dela**:

```bash
cd REQ-2026.2-T02-ClinicaEscolaFBr
```

> Se você usa chave SSH no GitHub, pode clonar com `git clone git@github.com:mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr.git`.

---

### Passo 6 — Instalar as dependências

```bash
pnpm install
```

Esse comando baixa todas as bibliotecas do site, da API e dos pacotes compartilhados. Pode demorar alguns minutos na primeira vez.

Ele também **ativa as validações automáticas do Git** na sua máquina (pasta `.githooks/`): a partir de agora, o Git recusa mensagens de commit fora do padrão do projeto. Você não precisa configurar mais nada.

> Se aparecer o aviso _"Ignored build scripts"_, rode `pnpm approve-builds`, selecione os pacotes listados (barra de espaço) e confirme com Enter.

---

### Passo 7 — Criar os arquivos de configuração

O projeto lê configurações (endereço do banco, portas…) de arquivos chamados `.env`. Eles **não vão para o GitHub**: cada pessoa cria os seus a partir dos modelos `.env.example`, que já vêm com os valores certos para desenvolvimento.

<details open>
<summary><strong>macOS e Linux</strong></summary>

```bash
cp .env.example .env
```

```bash
cp apps/web/.env.example apps/web/.env.local
```

</details>

<details>
<summary><strong>Windows</strong></summary>

```powershell
Copy-Item .env.example .env
```

```powershell
Copy-Item apps\web\.env.example apps\web\.env.local
```

</details>

---

### Passo 8 — Ligar o banco de dados

Com o Docker aberto, rode (igual nos três sistemas):

```bash
docker compose up -d
```

Na primeira vez, o Docker baixa as imagens do PostgreSQL e do Mailpit (pode levar alguns minutos). O `-d` faz tudo rodar em segundo plano, liberando o terminal.

Confira se os dois serviços estão no ar:

```bash
docker compose ps
```

Os dois (`postgres` e `mailpit`) devem aparecer com **Up** (e `healthy` depois de alguns segundos).

| Serviço      | Para que serve                                                                                             | Endereço                                              |
| ------------ | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **postgres** | Banco de dados do sistema                                                                                  | `localhost:5432` (usuário `clinica`, senha `clinica`) |
| **mailpit**  | Caixa de entrada falsa: todo e-mail enviado pelo sistema aparece aqui, e nenhum chega a pessoas de verdade | <http://localhost:8025>                               |

---

### Passo 9 — Preparar o banco

Primeiro, compile os pacotes compartilhados do projeto:

```bash
pnpm build
```

Depois, crie as tabelas no banco aplicando as **migrations** (arquivos que descrevem as tabelas, guardados em `packages/database/drizzle/`):

```bash
pnpm db:migrate
```

---

### Passo 10 — Rodar o sistema

```bash
pnpm dev
```

Esse comando liga o site e a API ao mesmo tempo. Deixe esse terminal aberto enquanto estiver usando o sistema. Quando aparecerem os endereços, abra no navegador:

| O quê                                                          | Endereço                                                        |
| -------------------------------------------------------------- | --------------------------------------------------------------- |
| Portal público (paciente)                                      | <http://localhost:3000/inscricao>                               |
| Área interna (secretaria, estagiário, supervisor, coordenação) | <http://localhost:3000/painel>                                  |
| Verificação da API e do banco                                  | <http://localhost:3333/health> (deve mostrar `{"status":"ok"}`) |
| Documentação da API (Swagger)                                  | <http://localhost:3333/docs>                                    |
| E-mails enviados (Mailpit)                                     | <http://localhost:8025>                                         |

Pronto: se todos os endereços abriram, o projeto está funcionando na sua máquina. 🎉

Para rodar os testes, abra **outro terminal** na pasta do projeto:

```bash
pnpm test
```

Testes de acessibilidade (abrem as páginas num navegador automático):

```bash
pnpm --filter @clinica/web exec playwright install --with-deps chromium
```

```bash
pnpm --filter @clinica/web test:e2e
```

O primeiro comando baixa o navegador de testes e só precisa ser rodado uma vez.

---

### Passo 11 — Desligar tudo

1. No terminal onde o `pnpm dev` está rodando, aperte **Ctrl + C**.
2. Desligue o banco e o Mailpit:

   ```bash
   docker compose down
   ```

Os dados do banco **continuam guardados** para a próxima vez. Se quiser apagar tudo e começar o banco do zero, use `docker compose down -v` (o `-v` apaga os dados).

---

## Rotina do dia a dia

Depois da primeira configuração, o dia a dia fica assim:

```bash
git pull
```

```bash
pnpm install
```

```bash
docker compose up -d
```

```bash
pnpm db:migrate
```

```bash
pnpm dev
```

- `git pull` traz as alterações da equipe;
- `pnpm install` instala bibliotecas novas, se alguém tiver adicionado;
- `pnpm db:migrate` aplica tabelas novas, se alguém tiver criado;
- no macOS e no Windows, lembre de abrir o **Docker Desktop** antes do `docker compose up -d`.

---

## Comandos disponíveis

Todos rodados na raiz do projeto:

| Comando                               | O que faz                                                                               |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| `pnpm dev`                            | Liga o site e a API em modo de desenvolvimento                                          |
| `pnpm build`                          | Compila todo o projeto                                                                  |
| `pnpm test`                           | Roda os testes                                                                          |
| `pnpm lint`                           | Verifica a qualidade do código                                                          |
| `pnpm typecheck`                      | Verifica os tipos do TypeScript                                                         |
| `pnpm format`                         | Formata o código automaticamente                                                        |
| `pnpm db:migrate`                     | Aplica as migrations no banco                                                           |
| `pnpm db:generate`                    | Gera uma migration nova depois de alterar as tabelas em `packages/database/src/schema/` |
| `pnpm docs:serve`                     | Abre o site de documentação localmente                                                  |
| `pnpm --filter @clinica/web test:e2e` | Testes de acessibilidade no navegador                                                   |

---

## Como rodar a documentação localmente

A documentação fica em `documentacao/` e usa o MkDocs, que é feito em **Python**. Você só precisa disto se for editar a documentação.

1. Instale o Python 3 (macOS: já vem instalado ou use `brew install python`; Linux: `sudo apt install -y python3 python3-venv`; Windows: `winget install -e --id Python.Python.3.12`).
2. Crie um ambiente Python isolado e instale o MkDocs:

<details open>
<summary><strong>macOS e Linux</strong></summary>

```bash
python3 -m venv .venv
```

```bash
source .venv/bin/activate
```

```bash
pip install mkdocs-material pymdown-extensions
```

</details>

<details>
<summary><strong>Windows</strong></summary>

```powershell
py -m venv .venv
```

```powershell
.venv\Scripts\Activate.ps1
```

```powershell
pip install mkdocs-material pymdown-extensions
```

</details>

3. Sirva a documentação:

   ```bash
   pnpm docs:serve
   ```

4. Acesse <http://localhost:8000>.

Nas próximas vezes, basta ativar o ambiente (`source .venv/bin/activate` ou `.venv\Scripts\Activate.ps1`) e rodar `pnpm docs:serve`.

O site publicado é atualizado **automaticamente** quando uma alteração em `documentacao/` chega à branch `main`.

---

## Como contribuir

1. **Nunca faça commit direto na `main`.** Crie uma branch a partir da `main` atualizada:

   ```bash
   git checkout main
   ```

   ```bash
   git pull
   ```

   ```bash
   git checkout -b tipo/descricao-curta
   ```

   Exemplos de nomes: `feat/inscricao-on-line`, `fix/conflito-agendamento`, `docs/licoes-aprendidas`.

2. **Mensagens de commit** seguem o padrão `tipo: descrição curta`, **sem escopo** entre parênteses. Tipos aceitos: `feat`, `fix`, `docs`, `test`, `refactor`, `style`, `build`, `ci`, `chore`, `cleanup`, `remove`.

   ```bash
   git commit -m "feat: adiciona formulário de inscrição on-line"
   ```

   O Git recusa automaticamente mensagens fora do padrão, e o GitHub valida de novo na PR.

3. **Envie a branch** (o `-u` liga sua branch local à branch de mesmo nome no GitHub):

   ```bash
   git push -u origin tipo/descricao-curta
   ```

4. **Abra um Pull Request** para a `main` preenchendo o template. O CI verifica automaticamente o código e as mensagens de commit; a PR só entra depois da revisão de outro integrante.

**Onde fica cada coisa ao construir uma feature:**

- regras de negócio na API: módulo da Área em `apps/api/src/modules/`;
- telas: `apps/web/src/app/(publico)/` (portal do paciente) ou `apps/web/src/app/(interno)/` (área interna);
- validações e tipos compartilhados: `packages/shared/src/`;
- tabelas: `packages/database/src/schema/`, sempre com `pnpm db:generate` no mesmo PR.

Mais orientações em [Boas práticas de utilização do GitHub](https://mdsreq-fga-unb.github.io/REQ-2026.2-T02-ClinicaEscolaFBr/unidade-1/gestao/boas-praticas-github/).

---

## Problemas comuns

<details>
<summary><strong>macOS: o Docker Desktop está aberto, mas o terminal diz que o comando <code>docker</code> não existe</strong></summary>

O Docker Desktop às vezes não cria o atalho do comando no terminal. Aponte o terminal direto para a pasta onde o Docker guarda o comando:

```bash
echo 'export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"' >> ~/.zshrc
```

Feche **todos** os terminais (no VS Code, apague o terminal na lixeira ou reabra o VS Code), abra um novo e confira com `docker --version`.

</details>

<details>
<summary><strong>"Unsupported engine: wanted node >=24"</strong></summary>

O terminal está usando outra versão do Node. Rode `nvm use 24` (e `nvm alias default 24` para virar padrão), reinstale o pnpm com `npm install -g pnpm@10` e confira com `node --version`. No Windows, instale o Node 24 pelo Passo 2.

</details>

<details>
<summary><strong>"Cannot connect to the Docker daemon" ou "error during connect"</strong></summary>

O Docker não está ligado. No macOS e no Windows, abra o **Docker Desktop** e espere aparecer **Engine running**. No Linux, rode `sudo systemctl start docker`.

</details>

<details>
<summary><strong>"port is already allocated" ou "address already in use" (porta 5432, 3000 ou 3333)</strong></summary>

Outro programa já está usando a porta. Os casos mais comuns:

- **5432:** você tem um PostgreSQL instalado diretamente no computador. Desligue-o (macOS com Homebrew: `brew services stop postgresql`; Linux: `sudo systemctl stop postgresql`; Windows: pare o serviço "postgresql" em **Serviços**).
- **3000 ou 3333:** já existe um `pnpm dev` rodando em outro terminal. Feche-o com Ctrl + C.

</details>

<details>
<summary><strong>Aviso "The requested image's platform (linux/amd64) does not match" (Mac com Apple Silicon)</strong></summary>

É só um aviso: o serviço funciona normalmente. Para tentar baixar a versão nativa, rode `docker compose rm -sf mailpit`, depois `docker image rm axllent/mailpit` e `docker compose up -d`.

</details>

<details>
<summary><strong>A API não sobe e mostra um erro de validação de variáveis (DATABASE_URL, WEB_URL...)</strong></summary>

Falta o arquivo `.env` na raiz. Refaça o [Passo 7](#passo-7--criar-os-arquivos-de-configuração).

</details>

<details>
<summary><strong>O commit foi recusado com "Mensagem de commit invalida"</strong></summary>

A mensagem não seguiu o padrão `tipo: descrição`. Exemplo correto: `git commit -m "fix: corrige cálculo da posição na fila"`. Veja os tipos aceitos em [Como contribuir](#como-contribuir).

</details>

<details>
<summary><strong>Windows: "a execução de scripts foi desabilitada neste sistema"</strong></summary>

Rode `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` no PowerShell, confirme e tente de novo.

</details>

<details>
<summary><strong>Quero apagar o banco e começar do zero</strong></summary>

```bash
docker compose down -v
```

```bash
docker compose up -d
```

```bash
pnpm db:migrate
```

</details>

---

## Equipe

| Integrante        | Papel no projeto                                                     |
| ----------------- | -------------------------------------------------------------------- |
| Gabriel Barbaceli | Gestão do projeto e coordenação dos Líderes de Feature; base técnica |
| Joaquim José      | Líder de Arquitetura e governança do processo                        |
| Luís Henrique     | Líder de Requisitos                                                  |
| Maria Clara       | Analista de Stakeholders e apoio à Arquitetura                       |
| Nicolas Costa     | Analista de Viabilidade                                              |
| Jônatas Farias    | Analista de Negócio                                                  |

Todos atuam como **Líderes de Feature** dos conjuntos de features sob sua responsabilidade. A divisão completa está na [composição da equipe](https://mdsreq-fga-unb.github.io/REQ-2026.2-T02-ClinicaEscolaFBr/unidade-1/gestao/equipe-comunicacao/) e no [Backlog de Produto](https://mdsreq-fga-unb.github.io/REQ-2026.2-T02-ClinicaEscolaFBr/unidade-2/requisitos/backlog/).
