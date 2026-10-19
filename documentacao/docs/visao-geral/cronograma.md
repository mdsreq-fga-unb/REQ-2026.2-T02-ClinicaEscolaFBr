# Cronograma geral

Este é o cronograma único do projeto, do início ao fim, com o status de cada etapa. O detalhamento das atividades fica dentro de cada unidade, e cada linha leva até ele. As features de cada ciclo, com o status de cada uma, estão em [Features e backlog](backlog.md).

O trabalho é organizado em **ciclos de 1 a 2 semanas**, e as unidades são marcos acadêmicos, e não fases isoladas do FDD. A justificativa dessa organização está no [planejamento das Unidades 2, 3 e 4 (6.2)](../unidade-1/gestao/cronograma.md#62-visao-macro-das-unidades-2-3-e-4). A equipe completa participa de todos os ciclos.

**Status:** **Encerrado** (etapa concluída), **Em andamento** (etapa atual) ou **Aguardando** (etapa ainda não iniciada). O status é revisado ao fim de cada ciclo, conforme a [atualização do planejamento](../unidade-1/gestao/cronograma.md#63-atualizacao-do-planejamento).

_Última atualização do status: 19/10/2026._

## Entregas

| Entrega | Data | Status | Conteúdo | Evidência |
| --- | --- | --- | --- | --- |
| Unidade 1 — Visão e planejamento | 07/09/2026 (apresentação em 08/09) | Encerrado | Cenário, solução proposta, estratégia de ESW, Engenharia de Requisitos e gestão do projeto | [Vídeo de apresentação](https://youtu.be/ysMmYmttAH8) |
| Unidade 2 — Requisitos e priorização | 13/10/2026 | Encerrado | Requisitos, priorização, MVP validado com a FBr, DoR, DoD e backlog | [Vídeo de apresentação](https://youtu.be/XUJEFZv7Pn8) e [release `unidade-2`](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/releases/tag/unidade-2) |
| [Unidade 3 — Construção do MVP](../unidade-3/index.md) | 17/11/2026 | Aguardando | Incrementos dos Ciclos 3 a 5, com todas as CPs do MVP com ao menos um incremento construído | — |
| Unidade 4 — Entrega final | 10/12/2026 | Aguardando | MVP integrado e aceito pela FBr | — |

## Etapas e ciclos

| Etapa | Período | Status | Fase(s) FDD predominante(s) | Atividades e resultados de ER | Entregável | Detalhamento |
| --- | --- | --- | --- | --- | --- | --- |
| Unidade 1 | 13/08 a 08/09/2026 | Encerrado | Concepção do projeto, antes dos ciclos | Prospecção e escolha do cliente, elicitação e descoberta com a Clínica Escola (entrevista de 26/08) e declaração da visão do produto. | Documento de visão publicado no site e apresentação da Unidade 1. | [Cronograma da Unidade 1 (6.1)](../unidade-1/gestao/cronograma.md#61-detalhamento-da-unidade-1) |
| Ciclo 1 | 15/09 a 29/09/2026 | Encerrado | Construir a Lista de Features / Declarar Requisitos | Elicitação e descoberta (necessidades, regras e restrições das 14 CPs), declaração (features e critérios de aceitação por CP), representação (atualização do modelo de domínio) e verificação e validação (revisão interna e verificação cruzada em pares: avaliação dos requisitos da equipe Umbra e recebimento da avaliação da equipe Sem Requisitos). | Features e RFs/RNFs das 14 CPs declarados e revisados. | [Cronograma da Unidade 2, Ciclo 1](../unidade-2/gestao/cronograma.md#ciclo-1) |
| Ciclo 2 | 29/09 a 13/10/2026 | Encerrado | Planejar por Feature | Análise e consenso (avaliação de valor de negócio com o cliente e de esforço técnico por RF, matriz 4×4 e priorização) e organização e atualização (DoR, DoD e rastreabilidade). | Escopo priorizado com o cliente (MVP validado em 08/10), DoR e DoD publicados e entrega da Unidade 2 em 13/10/2026. | [Cronograma da Unidade 2, Ciclo 2](../unidade-2/gestao/cronograma.md#ciclo-2) |
| Ciclo 3 | 14/10 a 27/10/2026 | Em andamento | Projetar por Feature / Construir por Feature | Representação (modelo detalhado e diagramas) e verificação e validação (inspeção de design, código e demonstração, conforme o [processo de validação da seção 7.3](../unidade-1/gestao/equipe-comunicacao.md#73-processo-de-validacao)). | Base técnica do projeto ([PR #82](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/82)), DoR e [projeto das features](../unidade-3/projeto-features-ciclo-3.md) e incremento demonstrado com as 14 features do ciclo, começando pelos itens de base (acesso, inscrição, triagem e distribuição de casos). | [Cronograma da Unidade 3, Ciclo 3](../unidade-3/gestao/cronograma.md#ciclo-3) e [backlog do ciclo](backlog.md#ciclo-3) |
| Ciclo 4 | 28/10 a 10/11/2026 | Aguardando | Projetar por Feature / Construir por Feature | Idem ao Ciclo 3, com organização e atualização da rastreabilidade e dos relatórios de progresso. | Incremento demonstrado com as 19 features do ciclo. | [Cronograma da Unidade 3, Ciclo 4](../unidade-3/gestao/cronograma.md#ciclo-4) e [backlog do ciclo](backlog.md#ciclo-4) |
| Ciclo 5 | 11/11 a 17/11/2026 | Aguardando | Projetar por Feature / Construir por Feature | Idem ao Ciclo 3; consolidação dos incrementos construídos na Unidade 3. | Incremento com as 7 features do ciclo e todas as CPs do MVP com ao menos um incremento construído — entrega da Unidade 3 em 17/11/2026. | [Cronograma da Unidade 3, Ciclo 5](../unidade-3/gestao/cronograma.md#ciclo-5) e [backlog do ciclo](backlog.md#ciclo-5) |
| Ciclo 6 | 18/11 a 01/12/2026 | Aguardando | Projetar por Feature / Construir por Feature / Integração | Idem ao Ciclo 3, aplicado aos itens do ciclo; verificação e validação das pendências apontadas nas demonstrações anteriores; organização e atualização da rastreabilidade entre requisitos, features e entregas. | Construção do MVP concluída até 01/12/2026, com as 13 features do ciclo, os incrementos integrados e as pendências dos Ciclos 3 a 5 corrigidas. | [Backlog do Ciclo 6](backlog.md#ciclo-6) |
| Ciclo 7 | 02/12 a 10/12/2026 | Aguardando | Integração / Aceite Final | Verificação e validação final (demonstração integrada e aceite, conforme a seção 7.3). | Sem novas features: MVP aceito pela FBr e estabilizado, apresentação e entrega final da Unidade 4 em 10/12/2026. | [Backlog do Ciclo 7](backlog.md#ciclo-7) |
