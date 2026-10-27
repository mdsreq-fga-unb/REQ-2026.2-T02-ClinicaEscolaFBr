# RF1 e RF2 — implementação para revisão

## Base e escopo

Preparação local em 25–26/10/2026, na branch `codex/rf1-rf2-ciclo-3`, a partir de
`feat/rf50-autenticacao`, commit `5381bbcc39a7717b69a57caee37777ad947b1653` (PR #136).
Esse commit contém os ancestrais das PRs #134 (schema) e #135 (acesso), conferidos
com `git merge-base --is-ancestor`. As três PRs ainda estavam abertas na consulta.
O alvo inicial de revisão é `feat/rf50-autenticacao`; após a integração das
dependências, atualizar a base e conferir o diff antes de mudar o alvo para `main`.
Na conferência final de 26/10, a cabeça da #136 continuava em `5381bbcc`;
`main` avançou para `61f60032` com o merge da documentação #133. A branch de
implementação foi mantida sobre #136 para não misturar mudanças documentais dos colegas no diff.

Foram consultados as issues #88/#89 e seus comentários, as PRs #133–#136 e revisões,
RF1/RF2, RNF1/2/51/53/56/57/58, o projeto das features, o protótipo, DoR/DoD e AGENTS.
Decisões documentais: PR #133, commit `54330f51aa1c1c98ee22fb67075a4d87ad703260`.
As regras vigentes de DF24 prevalecem sobre a leitura anterior da ata: e-mail
continua permitido, inclusive como único contato; WhatsApp e ligação exigem celular.
O texto do protótipo sobre documentos/contatos foi ajustado às decisões vigentes.

A implementação inicial foi reaproveitada e adaptada. Não se copiou o schema
antigo, a migration `0002_boring_titanium_man.sql`, a criptografia antiga, a alteração
da rota `/` nem mudanças incidentais no RF66/RF69. A raiz continua encaminhando
para `/entrar`; `/inscricao` e `POST /inscricoes` são públicos. As demais rotas e
testes de acesso/autenticação foram preservados.

## Critérios implementados

| Critério | Implementação e evidência |
| --- | --- |
| Cadastro e contato | Contrato Zod compartilhado: obrigatórios, CPF com 11 números, RG com letras e pontuação, nascimento válido sem data futura, menor com responsável; contato válido correspondente ao canal; testes do contrato, HTTP e interface |
| Três etapas e revisão | Dados/contatos, triagem e revisão; editar preserva os valores; mudança invalida a confirmação anterior; nenhum envio antes da confirmação |
| Declarações para triagem | Queixa, percepção de urgência e histórico em texto livre, identificados como declarações do interessado |
| Erros | Resumo com foco, links para campos, `aria-invalid`/`aria-describedby`, mensagens textuais e preservação dos valores; falhas HTTP/rede/timeout não geram confirmação |
| Registro atômico | Inscrição e `AuditoriaService.registrar(..., tx)` na mesma transação; falha da auditoria desfaz a inscrição |
| RF2 | Resposta pública contém somente `numero` e `criadaEm`, após commit; tela mostra data/hora em Brasília, recebimento e ressalva sobre vaga/agendamento/início do atendimento |
| Impressão e privacidade | `window.print()`, CSS de impressão e PDFs produzidos pelo Playwright; comprovante sem nome, documentos, contatos ou dados clínicos; nenhuma rota pública de consulta |
| Emergência | CVV 188 e SAMU 192 visíveis em todas as etapas, inclusive após rolagem |

Os limites de comprimento são limites técnicos do formulário/payload, não critérios
de elegibilidade. Não há consulta externa de identidade, upload de documento,
proibição de novo cadastro pelo mesmo CPF, decisão clínica automática ou envio de SMS.

## Schema, criptografia e idempotência

Nenhuma migration ou definição de tabela foi alterada. As migrations oficiais
`0000_easy_khan.sql`, `0001_amazing_quicksilver.sql` e `0002_ciclo_3.sql` foram
aplicadas em PostgreSQL 17 limpo. As colunas são as oficiais: `celular`, `email`,
`queixaCifrada`, `percepcaoUrgenciaCifrada`, `historicoRelevanteCifrado`, entre outras.
Contato ausente é persistido como `null`, respeitando os CHECKs oficiais.

Os três campos de saúde passam por `cifrar` em `common/criptografia.ts`, com
`CHAVE_DADOS` (32 bytes em base64). Os testes inspecionam o valor `v1.*` no banco
e recuperam o original com `decifrar` da mesma rotina. Não existe uma segunda
convenção de criptografia. Chaves locais ficam em `.env` ignorado; a suíte nova
gera uma chave aleatória para dados fictícios. A auditoria registra apenas o
número e a referência interna, sem copiar dados pessoais/saúde. Erros do driver
não são registrados nem devolvidos pela operação pública.

O navegador gera `chaveEnvio` UUID e a mantém para repetir o mesmo conteúdo na
mesma página. A API utiliza essa chave como `inscricoes.id`, aproveitando a PK
oficial. `INSERT ... ON CONFLICT DO NOTHING` aguarda a transação concorrente;
quando o registro já existe, o servidor compara os dados normalizados e os campos
decifrados. Conteúdo idêntico retorna o comprovante original; conteúdo diferente
retorna 409. A repetição não acrescenta outra auditoria. Não foi necessário
adicionar `chaveEnvio`, `hashConteudo` nem uma tabela paralela ao schema.

O número utiliza `nextval('inscricoes_numero_seq')`, ano do banco em Brasília e
sequência preenchida com zeros até cinco posições: `AAAA-NNNNN`. A sequência é
global, sem reinício anual; pode ter lacunas em rollback ou reenvio. Acima de
99999, preserva os dígitos excedentes para não truncar nem colidir; não foi criado
um limite de inscrições. Isso deve ser mantido pelos futuros produtores de inscrição.

A proteção de reenvio vale para o mesmo conteúdo/chave. Recarregar/fechar a página
descarta o rascunho e a chave; uma nova inscrição intencional recebe outra chave.
Dados pessoais não são gravados em localStorage/sessionStorage. Edição após uma
resposta incerta representa um novo conteúdo; orientar o interessado a repetir
primeiro o envio original. Futuras correções institucionais da inscrição devem
preservar essa semântica ou adotar registro separado de idempotência em migration
coordenada, pois hoje a comparação usa o cadastro persistido.

## Verificação e reprodução

Ambiente: Windows, Node 24, pnpm 10.30.3, PostgreSQL 17 local e Chromium do Playwright.
Somente dados fictícios. Bancos separados `clinica_rf1_test_integracao` e
`clinica_rf1_test_e2e`; o banco antigo não foi migrado nem esvaziado.

| Execução | Resultado |
| --- | --- |
| `pnpm.cmd install --frozen-lockfile --store-dir ../.pnpm-store` | Concluída, lockfile preservado |
| `pnpm.cmd lint --force` | Aprovado; API sem avisos/erros |
| `pnpm.cmd typecheck --force` | Aprovado |
| `pnpm.cmd test --force` | 98 testes API + 18 web aprovados; zero ignorados |
| `pnpm.cmd build --force` | API, pacotes e Next aprovados; todas as rotas existentes preservadas |
| `pnpm.cmd --filter @clinica/api test:integration` | 46 testes aprovados no PostgreSQL real; zero ignorados; execução Jest sem cache |
| `pnpm.cmd --filter @clinica/web test:e2e` | 16 testes aprovados; zero ignorados; seis larguras, axe, teclado, offline, timeout real e perda de resposta após commit |
| Compilação MkDocs | Não executada: a instalação do tema falhou por timeout em files.pythonhosted.org em três tentativas, incluindo uma versão anterior. Repetir em ambiente com acesso ao download; não foi contada como aprovada |

Após o último ajuste de foco/fonte (incluindo foco no calendário nativo), os 18 testes web, lint web e build web foram
executados novamente. O comando raiz executa a suíte da equipe com PGlite e suas
migrations reais; o comando de integração repete a suíte RF1/RF2 no PostgreSQL
externo. Os 46 testes de integração repetidos não são 46 cenários adicionais aos
98 testes da API. Não há `skip` condicional para mascarar a ausência de banco.
Os seis PDFs foram extraídos e inspecionados: uma página cada, sem CPF, RG,
contatos ou declarações clínicas. O diff passou em `git diff --check`.

Para reproduzir, configurar `.env` a partir de `.env.example`, gerar uma chave
própria e configurar `apps/web/.env.local` a partir de `apps/web/.env.example`.
Instalar dependências, preparar banco descartável e executar `pnpm.cmd db:migrate`
e `pnpm.cmd build`. Instalar Chromium com
`pnpm.cmd --filter @clinica/web exec playwright install chromium`.

```powershell
$env:TEST_DATABASE_URL = 'postgresql://clinica:clinica@localhost:5432/clinica_rf1_test_integracao'
pnpm.cmd --filter @clinica/api test:integration
pnpm.cmd --filter @clinica/web test:e2e
```

**O teste de integração esvazia as tabelas do banco informado.** Ele recusa nomes
fora de `clinica_rf1_test_*`; use banco dedicado, nunca dados reais. O E2E usa a
API real e o banco de `DATABASE_URL`, que também deve ser exclusivo para testes.
O Playwright inicia/encerra seus próprios servidores e recusa reutilizar portas
ocupadas. Padrão: web 3000/API 3333; nesta máquina foram usados `E2E_WEB_PORT=3001`
e `E2E_API_PORT=3334`, com `NEXT_PUBLIC_API_URL=http://localhost:3334` na build.

A CI mantém as verificações existentes e adiciona PostgreSQL no job E2E,
integração explícita e artefatos Playwright. Aceita temporariamente PR com base
em `feat/rf50-autenticacao`, além de `main`. Não houve execução remota de CI,
push ou abertura de PR nesta preparação.

## RNFs e limites da evidência

| RNF | Evidência / limite |
| --- | --- |
| RNF1 | Erros textuais associados, foco e retenção dos dados, testados em Vitest e Playwright |
| RNF2 | Resposta mínima, ausência de dados no comprovante/URL/mensagens; testes de falha e impressão |
| RNF51 | AES-256-GCM oficial verificado em banco; chave fora do código. HTTPS/TLS e rotação operacional de chaves precisam de homologação/infraestrutura; não são comprovados por HTTP local |
| RNF53 | Não foi implantada nem testada rotina operacional de backup diário cifrado fora do servidor, restauração, RPO/RTO. Responsabilidade de infraestrutura/FBr ainda pendente; transação não substitui backup |
| RNF56 | Axe WCAG 2.2 A/AA, teclado, erros e capturas de tela; não equivale à avaliação completa com leitor de tela. Inspeção humana com NVDA/VoiceOver ainda necessária |
| RNF57 | Indicador de foco de 3 px, afastado 3 px, cor #002a3d, incluindo os segmentos nativos do campo de data; contraste calculado mínimo de 13,60:1 contra as superfícies usadas; teste de teclado verifica geometria/cor. Modos RF61 e níveis RF62 continuam dependências de seus responsáveis |
| RNF58 | Fluxos reais e capturas nas larguras 320, 360, 768, 1024, 1366 e 1920; verificações de overflow, controles acessíveis e aviso de emergência |

## Dependências e DoD

**A disponibilização pública da inscrição depende da conclusão da RF57 no Ciclo 4
e da aprovação institucional da FBr.** A etapa de revisão reserva um espaço
discreto para o termo/aceite futuro. A confirmação de envio do RF1 não é um
consentimento LGPD. Nenhum termo fictício ou aceite obrigatório foi criado.
RNF57 (foco) é um requisito diferente de RF57 (consentimento).

Outras pendências reais: integrar as PRs #134–#136 e atualizar a base se forem
alteradas; executar CI remota depois da autorização para publicar; revisão humana
independente, avaliação com leitor de tela e validações operacionais dos RNFs acima.

Nas issues #88 e #89, anexar este relatório, diff/commit e evidências dos testes
para D2.1–D2.4. Os comentários já registram a inspeção de design de 24/10 e o
“de acordo” de Jônatas; reconciliar o checklist formal com esses registros sem
inventar uma nova aprovação. Para D3.3–D3.5, oferecer os cenários de falha,
autorização, auditoria e criptografia ao revisor. D3.1, D3.2 e D3.6 dependem da
revisão de outro integrante; D3.7 depende dos apontamentos dessa revisão.
Não marcar D4 (merge/build compartilhada), D5 (demonstração) nem D6 (aceite FBr)
como concluídos com base apenas nestes testes locais. Usar `Refs #88` e `Refs #89`,
sem fechar as issues automaticamente.

Arquivos de produção: contrato/export em `packages/shared`; módulo, controller e
service em `apps/api/src/modules/inscricao`; página e componentes em
`apps/web/src`; configuração CSS do Next, variável de ambiente de exemplo e
passagem de `CHAVE_DADOS` no Turbo. Verificação: suíte API, Vitest, E2E,
Playwright, script de integração e CI. O restante do diff é esta documentação.
