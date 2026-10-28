# Boas práticas de utilização do GitHub

Este documento define o fluxo de trabalho para alterações no código, na documentação e na configuração do projeto Clínica Escola FBr.

## Princípios do processo FDD

O projeto utiliza o **Feature-Driven Development (FDD)**. Portanto, o trabalho deve ser organizado em funcionalidades pequenas, identificáveis e entregáveis. Cada alteração deve ter um objetivo claro, estar relacionada a uma funcionalidade, correção ou tarefa de manutenção e ser revisada antes de entrar na branch de integração.

O FDD não determina uma convenção específica de branches, mensagens de commit ou pull requests. Assim, as regras deste documento complementam o FDD e não entram em conflito com ele.

## Branch de destino

As alterações devem ser integradas à branch de desenvolvimento mais atualizada:

1. Use `develop` quando ela existir no repositório.
2. Caso `develop` não exista, use `main`.

Não faça alterações diretamente em `develop` ou `main`, mesmo quando a mudança for apenas na documentação ou no GitHub Pages.

> Importante: a branch `gh-pages` é a branch de publicação do site do MkDocs no GitHub Pages. Ela não deve ser alterada manualmente, deletada, force-push, reescrita ou usada como branch de desenvolvimento. O conteúdo do site deve ser gerado a partir da branch de trabalho e publicado pelo fluxo do GitHub Pages, sem edição direta na `gh-pages`.

## Fluxo de trabalho

### 1. Atualizar a branch de destino

Antes de criar uma branch, confirme que sua cópia local está atualizada:

```bash
git fetch origin
git switch develop       # use main se develop não existir
git pull origin develop
```

Quando o destino for `main`, substitua `develop` por `main` nos comandos.

### 2. Criar uma branch por alteração

Toda modificação deve ser feita em uma branch nova, criada a partir da branch de destino atualizada. Prefira nomes curtos, em minúsculas, usando hífens e, quando houver, o identificador da issue:

```text
feature/123-cadastro-paciente
fix/145-validacao-agendamento
docs/152-boas-praticas-github
chore/160-atualizar-configuracao
```

Os prefixos devem indicar a natureza da alteração. Em trabalhos FDD, o nome deve facilitar a identificação da funcionalidade correspondente.

```bash
git switch -c docs/152-boas-praticas-github
```

Uma branch deve tratar de uma alteração coerente. Evite reunir funcionalidades, correções e mudanças documentais sem relação na mesma branch.

### 3. Desenvolver e validar

Durante o trabalho:

- mantenha o escopo da branch alinhado à issue ou funcionalidade;
- faça commits pequenos e coerentes;
- atualize a documentação afetada junto com o código, quando necessário;
- execute os testes, verificações e a documentação local antes de abrir a PR;
- não inclua segredos, credenciais, dados pessoais ou arquivos gerados.

Para a documentação MkDocs, valide a construção localmente:

```bash
mkdocs build --strict
```

### 3.1 Configurar a validação local de commits

Depois de clonar o repositório, cada integrante deve executar uma vez:

```bash
./setup-hooks.sh
```

Esse comando configura o Git para usar o hook versionado em `.githooks/commit-msg`. A partir daí, mensagens fora do formato `tipo: descrição` serão rejeitadas antes do commit. A configuração é local à cópia do repositório e deve ser repetida após um novo clone.

### 3.2 Validação no GitHub Actions

O workflow `.github/workflows/validate-commits.yaml` valida automaticamente as mensagens dos commits enviados para uma pull request e para as branches `main` e `develop`. Essa validação no servidor é a regra oficial e continua funcionando mesmo quando o hook local não estiver configurado.

### 4. Revisar os arquivos antes do commit

Antes de qualquer commit, confira exatamente o que será enviado e procure arquivos que devem permanecer apenas no ambiente local:

```bash
git status --short
git diff
git diff --cached
git ls-files --others --exclude-standard
git check-ignore -v .venv node_modules __pycache__ .env
```

Não adicione diretórios como `.venv/`, `node_modules/`, `__pycache__/`, arquivos `.env`, credenciais, logs, builds ou arquivos temporários. Se um arquivo indevido já estiver no stage, remova-o sem apagar o arquivo local:

```bash
git restore --staged caminho/do/arquivo
```

Depois, adicione somente os arquivos necessários:

```bash
git add caminho/do/arquivo
git status --short
```

### 5. Criar commits no padrão do projeto

Use o formato recomendado pelo guia de [Padrões de commits](https://github.com/iuricode/padroes-de-commits):

```text
tipo: descrição curta
```

Tipos mais comuns:

| Tipo       | Uso                                              |
| ---------- | ------------------------------------------------ |
| `feat`     | Nova funcionalidade                              |
| `fix`      | Correção de defeito                              |
| `docs`     | Documentação                                     |
| `test`     | Criação ou alteração de testes                   |
| `refactor` | Refatoração sem mudança de comportamento         |
| `style`    | Formatação ou estilo sem mudança de lógica       |
| `build`    | Dependências e arquivos de build                 |
| `ci`       | Integração ou entrega contínua                   |
| `chore`    | Manutenção e configuração                        |
| `cleanup`  | Limpeza de código                                |
| `remove`   | Remoção de arquivos ou funcionalidades obsoletas |

Exemplos:

```bash
git commit -m "docs: Atualiza guia do GitHub"
git commit -m "feat: Permite confirmar presença"
git commit -m "fix: Corrige fila de espera"
```

A primeira linha deve ser objetiva e, conforme a referência adotada, preferencialmente ter no máximo quatro palavras na descrição. Use o corpo do commit quando for necessário explicar contexto, impacto ou instruções futuras.

### 6. Enviar a branch e abrir a PR

Envie a branch para o repositório remoto:

```bash
git push -u origin nome-da-branch
```

Depois, abra uma pull request para `develop` ou, se ela não existir, para `main`. A PR deve:

- seguir o template de PR do repositório;
- usar o título no padrão: `branch de destino <- branch com alterações | descrição breve`;
- explicar o que foi alterado e o impacto esperado;
- relacionar a issue ou funcionalidade FDD quando fizer sentido;
- adicionar autores, revisores e tags adequados;
- preencher as seções de mudanças e issues relacionadas, quando aplicáveis.

Exemplos válidos de título:

```text
develop <- feature/123-cadastro-paciente | adiciona cadastro de paciente
develop <- docs/152-boas-praticas-github | atualiza guia do GitHub
main <- fix/145-validacao-agendamento | corrige validação de agendamento
```

O título deve manter a ordem `destino <- origem | resumo`. Em outras palavras, a primeira parte indica a branch alvo e a segunda identifica a branch que contém as alterações, seguida de uma descrição curta do conteúdo da PR.

Não faça merge da própria PR sem a revisão exigida pelo grupo.

### 7. Revisar, aprovar e encerrar

Toda PR deve ser revisada por pelo menos um integrante do grupo que não seja o autor da alteração. O revisor deve verificar o escopo, a implementação, a documentação, os testes, a ausência de arquivos indevidos e a aderência ao processo FDD.

Após a revisão:

1. O autor resolve os comentários e atualiza a branch, se necessário.
2. O revisor aprova a PR somente quando os pontos estiverem resolvidos.
3. A PR é integrada à branch de destino conforme as permissões e regras do repositório.
4. A branch de trabalho é apagada após o merge.

Se a PR for atualizada depois da aprovação de forma relevante, ela deve passar por nova conferência do revisor.

## Acompanhamento automático das features

O workflow **Feature Status** mantém o campo "Estado da feature (FDD)" de cada issue de feature e o Status do [Project](https://github.com/orgs/mdsreq-fga-unb/projects/124) de acordo com o que a equipe já registra. Uma issue de feature é reconhecida pelo título no formato "CP<n> — ...", com ou sem o rótulo `requirements`. Nada volta para trás sozinho. Fechar a issue quando ela chega a "Concluído" e devolvê-la a "Em Construção" quando é reaberta ficam com os workflows nativos do Project.

| O que acontece | Efeito na issue | Status no Project |
| --- | --- | --- |
| A issue ganha o milestone de um ciclo | Ciclo e CP preenchidos no Project | Planejado |
| Todos os critérios [B] do DoR marcados e o registro do DoR preenchido | Estado "Em design" | Em Design |
| D1 completo (inspeção de design) | Estado "Design inspecionado" | Em Construção |
| PR que declara a issue aberta | — | Em Construção |
| PR aprovada por outro integrante da equipe | D3.1 marcado, com o link da revisão | Em Construção |
| PR mesclada na `main` | D4.3 marcado, com o link da PR | Em Validação |
| D6.1 marcado (aceite da FBr) | Estado "Aceita" | Concluído, e o Project fecha a issue |

As três linhas de PR só valem quando:

- a PR **declara** a issue com "Refs", "Closes", "Fixes" ou "Resolves" (por exemplo, "Refs #48" ou "Closes #45, #46"). Um "#N" solto, como na lista de issues relacionadas de uma PR de documentação, não conta;
- a PR mexe no código do produto (`apps/` ou `packages/`);
- a feature já tem o DoR aprovado. Sem ele, o DoD não é avaliado, e o workflow só deixa um aviso no log.

Comandos em comentário, aceitos só de integrantes da equipe:

- `/de-acordo`: confirma a inspeção de design e marca o D1.8. A inspeção precisa estar registrada num comentário com o cabeçalho "## Inspeção de design (DoD 1)", e o `/de-acordo` precisa vir de alguém diferente de quem a registrou.
- `/demonstrada <link da ata>`: marca o D5.1.
- `/aceite <link da ata ou da mensagem da FBr>`: marca o D6.1.
- `/rnf <RNF> <link da evidência>`: registra a verificação de um RNF que não é teste automático, para o D4.5 (veja a seção abaixo).

Os demais critérios continuam sendo marcados por quem tem a evidência. A PR de feature (título `feat:`) precisa declarar a issue da feature; sem isso, o check "PR cita a issue da feature" falha. O workflow usa o segredo `PROJECT_TOKEN` do repositório; sem ele, apenas avisa e não altera nada.

### Verificação dos RNFs (D4.5)

O D4.5 pede que cada RNF que restringe a feature esteja verificado no patamar exigido: a meta completa ou, para os RNFs evolutivos, o [patamar mínimo de lançamento](../../unidade-2/requisitos/backlog.md#patamar-minimo-de-lancamento-dos-rnfs-evolutivos). O Feature Status monta essa verificação sozinho a partir dos testes que passam na `main` e dos registros feitos com `/rnf`.

**1. Cite o RF e o RNF no nome do teste.** Um teste é evidência de um RNF quando o nome completo dele (o `describe` mais o `it` ou o `test`) cita o código do RNF e o código do RF da feature, entre parênteses:

```ts
describe('Restrição de acesso ao prontuário (RF55)', () => {
  it('o registro de acessos não pode ser alterado nem apagado (RNF52)', ...);
});
```

```ts
test('inscrição sem violações WCAG 2.2 AA em 320px (RF1, RNF56, RNF58)', ...);
```

- Vale para os testes da API (Jest), do web (Vitest) e de ponta a ponta (Playwright).
- O RF pode estar no `describe` e o RNF no teste, ou os dois no mesmo nome.
- O RF é obrigatório para que o teste de uma feature não sirva de evidência para outra que tem o mesmo RNF.
- Só cite um RNF quando o teste verifica de fato a meta dele (ou o patamar mínimo, se for evolutivo). Um teste que só passa pela funcionalidade não é evidência do RNF.
- **RNFs que pedem mais de um tipo de verificação** só contam com evidência de todas as origens exigidas, listadas em `ORIGENS_EXIGIDAS`, no `rnfs.cjs`. A origem é o relatório dos testes (`api`, `web`, `e2e` ou `leitor-de-tela`) ou `registro`, um `/rnf` com a evidência do que teste nenhum cobre. Com parte das evidências, a tabela da issue mostra o que falta, e o D4.5 continua aberto.

    | RNF | Evidências exigidas |
    | --- | --- |
    | RNF10 | api (auditoria de cada operação) e registro (inspeção de que a interface não altera nem apaga os registros) |
    | RNF22 | e2e (as 3 interações) e registro (teste de tarefa com pessoas) |
    | RNF24 | e2e (teclado e contraste) e leitor de tela |
    | RNF25 | api (respostas negadas sem conteúdo) e registro (inspeção da interface com registros completos e incompletos, antes e depois da transferência) |
    | RNF51 | api (criptografia no banco) e registro (HTTPS, TLS, chaves e troca de chave na implantação) |
    | RNF52 | api (registros que não se alteram) e registro (permissões do banco e consulta do RF56) |
    | RNF56 | e2e (axe) e leitor de tela |

    Nos RNFs evolutivos, a evidência é a do patamar mínimo de lançamento, da [tabela do backlog](../../unidade-2/requisitos/backlog.md#patamar-minimo-de-lancamento-dos-rnfs-evolutivos). O RNF57, por exemplo, conta com o teste do contorno de pelo menos 2 px em todos os elementos interativos; o contraste de 3:1, o alto contraste e os tamanhos de texto são o refinamento posterior.

    Nos outros RNFs, um `/rnf` vale sozinho, como verificação assumida por um integrante. Nestes, o registro é a parte que os testes não cobrem, e os testes continuam exigidos.

**2. Registre com `/rnf` o que não é teste automático.** Inspeção, relatório, teste manual ou teste de restauração da cópia de segurança entram por um comentário na issue da feature, com o link da evidência:

```text
/rnf RNF53 https://link-do-relatorio-ou-da-ata
```

Um comentário pode registrar vários RNFs com a mesma evidência (`/rnf RNF56 RNF57 <link>`). O comando só vale de integrantes da equipe e precisa do link.

**Testes com leitor de tela.** Os testes que usam o VoiceOver de verdade ficam em `apps/web/e2e/leitor-de-tela/` e rodam no workflow "Leitor de tela", num runner macOS: toda semana, a cada merge que mexe nas telas cobertas e nas PRs que mexem nelas. Eles seguem a mesma regra de nome e entram no D4.5 sozinhos: o Feature Status junta o relatório desse workflow ao do CI, e a evidência leva o link da execução do VoiceOver. Para rodar no seu computador, use `pnpm --filter @clinica/web test:leitor-de-tela`, que assume o controle do VoiceOver e do teclado enquanto roda.

**3. O que acontece sozinho:**

| Quando | O que o workflow faz |
| --- | --- |
| Em toda PR de código | O job "Relatório de RNFs" do CI lista, no resumo da execução, os RNFs verificados pelos testes que passaram. |
| O CI da `main` termina com sucesso | Em cada feature integrada (D4.3 marcado), o Feature Status cria ou atualiza o comentário "Verificação dos RNFs (D4.5)", com a situação e a evidência de cada RNF. |
| Alguém comenta `/rnf` | A tabela da feature é atualizada na hora. Se a feature ainda não foi integrada, o registro fica guardado para a avaliação depois do D4.3. |
| Todos os RNFs da feature têm evidência | O D4.5 é marcado. |

Os RNFs de cada feature vêm da seção "RNFs que restringem a feature" da issue (ou de "Requisito(s) relacionado(s)", nas issues convertidas à mão). Um intervalo como "RNF56 a RNF58" vale por todos os códigos entre eles. Mantenha essa seção completa: um RNF que não está nela não é cobrado.

## Checklist rápido

- [ ] A branch foi criada a partir de `develop` atualizada ou de `main` atualizada.
- [ ] A alteração está concentrada em uma funcionalidade, correção ou tarefa coerente.
- [ ] Código e documentação foram validados.
- [ ] O stage não contém `.venv/`, `node_modules/`, segredos ou arquivos gerados.
- [ ] A mensagem do commit segue `tipo: descrição`.
- [ ] A PR aponta para a branch de destino correta e usa o template.
- [ ] Revisores, autores, tags e issues foram adicionados quando aplicável.
- [ ] Pelo menos um integrante revisou e aprovou a PR.
- [ ] A branch foi removida após o merge.
