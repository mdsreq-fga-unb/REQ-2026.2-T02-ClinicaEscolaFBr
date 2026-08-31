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
- explicar o que foi alterado e o impacto esperado;
- relacionar a issue ou funcionalidade FDD quando fizer sentido;
- adicionar autores, revisores e tags adequados;
- preencher as seções de mudanças e issues relacionadas, quando aplicáveis.

Não faça merge da própria PR sem a revisão exigida pelo grupo.

### 7. Revisar, aprovar e encerrar

Toda PR deve ser revisada por pelo menos um integrante do grupo que não seja o autor da alteração. O revisor deve verificar o escopo, a implementação, a documentação, os testes, a ausência de arquivos indevidos e a aderência ao processo FDD.

Após a revisão:

1. O autor resolve os comentários e atualiza a branch, se necessário.
2. O revisor aprova a PR somente quando os pontos estiverem resolvidos.
3. A PR é integrada à branch de destino conforme as permissões e regras do repositório.
4. A branch de trabalho é apagada após o merge.

Se a PR for atualizada depois da aprovação de forma relevante, ela deve passar por nova conferência do revisor.

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
