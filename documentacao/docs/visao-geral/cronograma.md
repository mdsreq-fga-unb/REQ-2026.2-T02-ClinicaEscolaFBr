# Cronograma geral

Este é o cronograma único do projeto, do início ao fim, com o status de cada etapa. O detalhamento das atividades fica dentro de cada unidade, e cada linha leva até ele. As features de cada ciclo, com o Líder de Feature e as dependências, estão em [Features e backlog](backlog.md); o status de cada feature fica na sua issue e no [Project do repositório](https://github.com/orgs/mdsreq-fga-unb/projects/124).

O trabalho é organizado em **ciclos de 1 a 2 semanas**, e as unidades são marcos acadêmicos, e não fases isoladas do FDD. A justificativa dessa organização está no [planejamento das Unidades 2, 3 e 4 (6.2)](../unidade-1/gestao/cronograma.md#62-visao-macro-das-unidades-2-3-e-4). A equipe completa participa de todos os ciclos.

**Status:** **Encerrado** (etapa concluída), **Em andamento** (etapa atual) ou **Aguardando** (etapa ainda não iniciada). O status é revisado ao fim de cada ciclo, conforme a [atualização do planejamento](../unidade-1/gestao/cronograma.md#63-atualizacao-do-planejamento).

_Última atualização do status: 25/10/2026._

## Entregas

| Entrega | Data | Status | Conteúdo | Evidência |
| --- | --- | --- | --- | --- |
| Unidade 1 — Visão e planejamento | 07/09/2026 (apresentação em 08/09) | Encerrado | Cenário, solução proposta, estratégia de ESW, Engenharia de Requisitos e gestão do projeto | [Vídeo de apresentação](https://youtu.be/ysMmYmttAH8) |
| Unidade 2 — Requisitos e priorização | 13/10/2026 | Encerrado | Requisitos, priorização, MVP validado com a FBr, DoR, DoD e backlog | [Vídeo de apresentação](https://youtu.be/XUJEFZv7Pn8) e [release `unidade-2`](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/releases/tag/unidade-2) |
| [Unidade 3 — Construção do MVP](../unidade-3/index.md) | 17/11/2026 | Em andamento | Incrementos dos Ciclos 3 a 5, com todas as CPs do MVP com ao menos um incremento construído | — |
| Unidade 4 — Entrega final | 10/12/2026 | Aguardando | MVP integrado e aceito pela FBr | — |

## Etapas e ciclos

| Etapa | Período | Status | Fase(s) FDD predominante(s) | Atividades e resultados de ER | Entregável | Detalhamento |
| --- | --- | --- | --- | --- | --- | --- |
| Unidade 1 | 13/08 a 08/09/2026 | Encerrado | Concepção do projeto, antes dos ciclos | Prospecção e escolha do cliente, elicitação e descoberta com a Clínica Escola (entrevista de 26/08) e declaração da visão do produto. | Documento de visão publicado no site e apresentação da Unidade 1. | [Cronograma da Unidade 1 (6.1)](../unidade-1/gestao/cronograma.md#61-detalhamento-da-unidade-1) |
| Ciclo 1 | 15/09 a 29/09/2026 | Encerrado | Construir a Lista de Features / Declarar Requisitos | Elicitação e descoberta (necessidades, regras e restrições das 14 CPs), declaração (features e critérios de aceitação por CP), representação (atualização do modelo de domínio) e verificação e validação (revisão interna e verificação cruzada em pares: avaliação dos requisitos da equipe Umbra e recebimento da avaliação da equipe Sem Requisitos). | Features e RFs/RNFs das 14 CPs declarados e revisados. | [Cronograma da Unidade 2, Ciclo 1](../unidade-2/gestao/cronograma.md#ciclo-1) |
| Ciclo 2 | 29/09 a 13/10/2026 | Encerrado | Planejar por Feature | Análise e consenso (avaliação de valor de negócio com o cliente e de esforço técnico por RF, matriz 4×4 e priorização) e organização e atualização (DoR, DoD e rastreabilidade). | Escopo priorizado com o cliente (MVP validado em 08/10), DoR e DoD publicados e entrega da Unidade 2 em 13/10/2026. | [Cronograma da Unidade 2, Ciclo 2](../unidade-2/gestao/cronograma.md#ciclo-2) |
| Ciclo 3 | 14/10 a 27/10/2026 | Em andamento | Projetar por Feature / Construir por Feature | Representação (modelo detalhado e diagramas) e verificação e validação (inspeção de design, código e demonstração, conforme o [processo de validação da seção 7.3](../unidade-1/gestao/equipe-comunicacao.md#73-processo-de-validacao)). | Base técnica do projeto (concluída em 21/10, [PR #82](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/82)), DoR e [projeto das features](../unidade-3/projeto-features-ciclo-3.md) e incremento demonstrado com as 13 features do ciclo, começando pelos itens de base (acesso, inscrição, triagem e distribuição de casos). | [Cronograma da Unidade 3, Ciclo 3](../unidade-3/gestao/cronograma.md#ciclo-3) e [backlog do ciclo](backlog.md#ciclo-3) |
| Ciclo 4 | 28/10 a 10/11/2026 | Aguardando | Projetar por Feature / Construir por Feature | Idem ao Ciclo 3, com organização e atualização da rastreabilidade e dos relatórios de progresso. | Incremento demonstrado com as 20 features do ciclo. | [Cronograma da Unidade 3, Ciclo 4](../unidade-3/gestao/cronograma.md#ciclo-4) e [backlog do ciclo](backlog.md#ciclo-4) |
| Ciclo 5 | 11/11 a 17/11/2026 | Aguardando | Projetar por Feature / Construir por Feature | Idem ao Ciclo 3; consolidação dos incrementos construídos na Unidade 3. | Incremento com as 7 features do ciclo e todas as CPs do MVP com ao menos um incremento construído — entrega da Unidade 3 em 17/11/2026. | [Cronograma da Unidade 3, Ciclo 5](../unidade-3/gestao/cronograma.md#ciclo-5) e [backlog do ciclo](backlog.md#ciclo-5) |
| Ciclo 6 | 18/11 a 01/12/2026 | Aguardando | Projetar por Feature / Construir por Feature / Integração | Idem ao Ciclo 3, aplicado aos itens do ciclo; verificação e validação das pendências apontadas nas demonstrações anteriores; organização e atualização da rastreabilidade entre requisitos, features e entregas. | Construção do MVP concluída até 01/12/2026, com as 14 features do ciclo, os incrementos integrados e as pendências dos Ciclos 3 a 5 corrigidas. | [Backlog do Ciclo 6](backlog.md#ciclo-6) |
| Ciclo 7 | 02/12 a 10/12/2026 | Aguardando | Integração / Aceite Final | Verificação e validação final (demonstração integrada e aceite, conforme a seção 7.3). | Sem novas features: MVP aceito pela FBr e estabilizado, apresentação e entrega final da Unidade 4 em 10/12/2026. | [Backlog do Ciclo 7](backlog.md#ciclo-7) |

## Previsto e realizado

Compara o que cada etapa previa com o que foi entregue, a situação e o que ficou pendente. O Ciclo 3, em andamento, aparece marco a marco na tabela seguinte.

| Etapa | Previsto | Realizado | Situação | Pendências |
| --- | --- | --- | --- | --- |
| Unidade 1 | Documento de visão e apresentação até 08/09 | Documento publicado em 07/09 e apresentação em 08/09 | Concluída no prazo | — |
| Ciclo 1 | Features e RFs/RNFs das 14 CPs declarados e revisados até 29/09 | Features e requisitos declarados, com a verificação cruzada em pares e as correções incorporadas em 27/09 (versão 2.25) | Concluído no prazo | — |
| Ciclo 2 | MVP priorizado e validado com a FBr, DoR e DoD publicados e entrega da Unidade 2 em 13/10 | MVP validado em 08/10 e Unidade 2 entregue em 13/10 ([release `unidade-2`](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/releases/tag/unidade-2)) | Concluído no prazo | Correções das issues de avaliação da Unidade 2 (#99 a #110), tratadas no Ciclo 3 |

### Ciclo 3, marco a marco

_Situação em 25/10/2026._

| Marco | Previsto | Realizado | Situação | Pendências |
| --- | --- | --- | --- | --- |
| Planejamento e issues | 14/10 a 17/10 | Reunião de 15/10 e 14 issues de feature criadas; 13 depois da remoção do RF19 em 24/10 ([DF26](../unidade-2/requisitos/decisoes-fbr.md)) | Concluído no prazo | — |
| Base técnica | 15/10 a 21/10 | Concluída em 21/10 ([PR #82](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/82)) | Concluída no prazo | — |
| DoR | 19/10 a 21/10 | R8.1 marcado em 6 das 13 features: RF50, RF1, RF2, RF53, RF54 e RF55 | Atrasado | DoR do RF4, do RF6 e do RF66 (Luís Henrique), do RF18, do RF20 e do RF21 (Maria Clara) e do RF10 (Nicolas) |
| Design inspecionado (DoD 1) | 21/10 a 23/10 | Protótipos validados com a FBr em 23/10 e inspeção de design das 13 features em 24/10; "de acordo" do Líder registrado no RF50, no RF1 e no RF2 | Atrasado em 1 dia | "De acordo" dos demais Líderes; no RF53, no RF54 e no RF55, confirmação de outro integrante |
| Construção (DoD 2 a 4) | 23/10 a 27/10 | Schema do Ciclo 3 em revisão ([PR #134](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/134)); RF50 em revisão ([PR #136](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/136)); RF53, RF54 e RF55 construídos ([PR #135](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/135), em rascunho até o RF50 entrar) | Em andamento | 9 features sem PR em 25/10: RF1, RF2, RF4, RF6, RF10, RF18, RF20, RF21 e RF66 |
| Fechamento | 27/10 | — | Aguardando | Registro do fechamento, feature a feature |

## Pontos de controle por feature

Cada feature passa pelos marcos do FDD, registrados no checklist do [DoR e do DoD](../unidade-2/requisitos/dor-dod.md) da sua issue e acompanhados no [Project](https://github.com/orgs/mdsreq-fga-unb/projects/124). A tabela traz a data-limite de cada marco em cada ciclo de construção. Uma feature que perde um marco é avisada no grupo no mesmo dia, e outro integrante entra em par com o Líder.

| Marco | Evidência na issue | Ciclo 3 | Ciclo 4 | Ciclo 5 | Ciclo 6 |
| --- | --- | --- | --- | --- | --- |
| DoR aprovado | Checklist do DoR e registro da avaliação | 21/10 | 27/10 (avaliado no fechamento do Ciclo 3) | 10/11 | 17/11 |
| Design inspecionado (DoD 1) | Comentário da inspeção com o "de acordo" do Líder e do revisor | 23/10 | 31/10 | 12/11 | 21/11 |
| Código concluído e inspecionado (DoD 2 e 3) | PR aprovado por outro integrante, com os testes passando | 26/10 | 07/11 | 15/11 | 28/11 |
| Promovido para a versão integrada (DoD 4) | PR mesclado na `main` | 27/10 | 09/11 | 16/11 | 30/11 |
| Demonstrada (DoD 5) | Registro da reunião com a FBr | 28/10 a 10/11, com os incrementos do Ciclo 4 | 10/11 | 17/11 | 01/12 |

## Carga por Líder de Feature e ciclo

A carga vem da [escala de esforço](../unidade-2/requisitos/backlog.md#10212-escalas-adotadas) que a equipe usou para cada RF: esforço 1 vale até 2 horas, 2 vale de 2 a 6 horas, 3 vale de 6 a 12 horas e 4 vale mais de 12 horas, contadas aqui como 12 a 18 horas. Essas horas cobrem persistência, regra de negócio, interface e testes; inspeções, integração e correções ficam fora e são absorvidas pela folga de cada ciclo. Cada célula mostra a quantidade de features e a faixa de horas.

| Líder de Feature | Ciclo 3 (2 semanas) | Ciclo 4 (2 semanas) | Ciclo 5 (1 semana) | Ciclo 6 (2 semanas) |
| --- | --- | --- | --- | --- |
| Gabriel | 3 · 26 a 42 h | 5 · 30 a 54 h | 1 · 12 a 18 h | 2 · 18 a 30 h |
| Jônatas | 2 · 14 a 24 h | 3 · 14 a 30 h | 1 · 6 a 12 h | 1 · 12 a 18 h |
| Joaquim | 1 · 6 a 12 h | 2 · 12 a 20 h | 1 · 6 a 12 h | 2 · 12 a 24 h |
| Luís Henrique | 3 · 10 a 24 h | 3 · 20 a 36 h | 1 · 2 a 6 h | 5 · 16 a 38 h |
| Maria Clara | 3 · 14 a 30 h | 3 · 14 a 26 h | 1 · 2 a 6 h | 1 · 12 a 18 h |
| Nicolas | 1 · 12 a 18 h | 4 · 16 a 36 h | 2 · 4 a 12 h | 3 · 14 a 30 h |

**Ciclo 5.** O ciclo tem só uma semana, mas as 7 features ficam divididas entre os seis integrantes: cada um tem uma ou duas, e a maior carga é a do RF48 (Gabriel), de 12 a 18 horas.

**Maiores cargas.** As maiores cargas são as do Gabriel no Ciclo 4 (5 features, de 30 a 54 horas) e a do Luís Henrique no Ciclo 6 (5 features, de 16 a 38 horas). No fechamento de cada ciclo, a equipe confere essas cargas com o que foi realizado e, se um Líder ficar acima do que consegue fazer, passa uma feature para outro integrante do mesmo ciclo em vez de adiá-la.

## Fechamento dos ciclos

Ao fim de cada ciclo de construção, a equipe registra aqui uma tabela com uma linha por feature prevista no ciclo: o Líder, o marco alcançado, se a feature foi concluída ou passou para o ciclo seguinte, o motivo e o impacto no planejamento. O status do ciclo é atualizado no mesmo momento.

Os Ciclos 1 e 2 não tiveram features de construção: o resultado deles está em [Previsto e realizado](#previsto-e-realizado). O fechamento do Ciclo 3 é registrado em 27/10/2026.
