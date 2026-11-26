---
render_macros: true
---

# Cronograma e Entregas da Unidade 4

A Unidade 4 vai de **18/11/2026 a 10/12/2026**. Ela segue a abordagem ágil e o processo Feature-Driven Development (FDD) das unidades anteriores, com um último ciclo de construção, o Ciclo 6 ({{ ciclos[6].periodo }}), e a entrega final.

## Ciclo 6 — Conclusão da construção do MVP { #ciclo-6 }

O previsto e o realizado de cada marco do FDD no Ciclo 6 estão em [Ciclo 6, marco a marco](../../visao-geral/cronograma.md#ciclo-6-marco-a-marco), no Cronograma geral. As datas até a apresentação estão em [Entrega final](../../construcao/entrega-final.md#datas).

| Período | Fase / Processo FDD | Atividades | Atividade de ER / Resultado | Entregáveis |
| --- | --- | --- | --- | --- |
| 16/11 a 17/11 | Planejar por Feature (DoR) | Pré-avaliação do DoR das {{ ciclos[6].features }} features, com os critérios que faltavam nos requisitos e as pendências novas com a FBr. | Verificação (checklist do DoR) e organização e atualização. | Issues das features do Ciclo 6, com o DoR |
| 16/11 a 24/11 | Projetar por Feature | Projeto e protótipos das features do ciclo, enviados à FBr, e inspeções de design com o Líder e o revisor de cada feature. | Representação (projeto e protótipos) e verificação (inspeção de design). | [Projeto das features](../../construcao/projeto-features.md) e [Protótipos](../../construcao/prototipos.md) |
| 18/11 a 25/11 | Construir por Feature | Implementação, testes e PR de cada feature, revisada por outro integrante e conferida no navegador contra as pranchas. | Verificação (testes e inspeção de código). | PRs do Ciclo 6, com o código das 14 features integrado à `development` em 25 e 26/11 |
| 24/11 | Validação | A FBr validou no ambiente de validação as seis features do Ciclo 5 integradas depois de 16/11. | Validação com o cliente. | [Validação de 24/11](../unidade-3/reunioes.md) e aceite nas issues |
| 24/11 | Representação | Representações do produto inteiro: diagrama de atividades, mapa das features pela jornada e especificação de caso de uso. | Representação de requisitos. | [Representação de requisitos](../../requisitos/representacao.md) |
| Até 27/11 | Homologação | A FBr testa as features do Ciclo 6 na validação, com o roteiro de homologação. | Validação com o cliente. | [Roteiro de homologação](../../construcao/entrega-final.md#roteiro-de-homologacao) |
| 30/11 | Publicação | Publicação em produção, com a aprovação no ambiente `producao` do GitHub. | — | [Publicação em produção](../../construcao/entrega-final.md#publicacao-em-producao) |
| 01/12 | Apresentação final | Apresentação das entregas, com o sistema em produção. | — | Slides e vídeo de apresentação |

## Entregas da unidade { #entregas }

Os entregáveis do plano da Unidade 4, com onde está cada um no site. A situação é a de 26/11/2026 e é atualizada até a entrega.

| Entregável do plano | Onde está | Situação em 26/11 |
| --- | --- | --- |
| Apresentação (clareza, organização, tempo) | Slides da apresentação final | Em preparação |
| Visão de Produto e Projeto (atualizações por issues) | [Cenário atual](../../produto/cenario-atual.md), [Solução proposta](../../produto/solucao-proposta.md) e [Intervenção social](../../produto/intervencao-social.md) | Issues das Unidades 1 e 2 tratadas; issues da Unidade 3 em tratamento |
| Processo de ESW (evidências de execução) | [Estratégia de ESW](../../processo/estrategia-esw.md) e [Execução do processo](../../visao-geral/execucao-do-processo.md) | Atualizado até o Ciclo 5; o Ciclo 6 entra no fechamento |
| Processo de ER (evidências de execução) | [Engenharia de requisitos](../../processo/engenharia-requisitos.md) e [Engenharia de requisitos na prática](../../visao-geral/execucao-do-processo.md#6-engenharia-de-requisitos-na-pratica) | Atualizado até o Ciclo 5; o Ciclo 6 entra no fechamento |
| Rastreabilidade (atualizada) | [Estrutura de requisitos](../../visao-geral/organizacao-e-atualizacao.md#2-estrutura-de-requisitos) e a rastreabilidade de cada requisito | Gerada do catálogo a cada publicação |
| Lista de requisitos funcionais (status atualizado) | [Requisitos funcionais](../../requisitos/funcionais.md) | Estado de cada RF copiado das issues |
| Lista de requisitos não funcionais (status atualizado) | [Requisitos não funcionais](../../requisitos/nao-funcionais.md) | Verificação de cada RNF registrada nas issues (D4.5) |
| Representação de requisitos (aplicação) | [Representação de requisitos](../../requisitos/representacao.md) | Feito |
| Verificação e validação de requisitos (estratégia e aplicação) | [Verificação e validação](../../processo/verificacao-e-validacao.md), inspeções nas issues e reuniões com a FBr | Em andamento: validação dos protótipos do Ciclo 6 e homologação |
| Organização e atualização de requisitos (estratégia e aplicação) | [Organização e atualização](../../visao-geral/organizacao-e-atualizacao.md) | Em uso |
| DoR (definição e aplicação) | [DoR e DoD](../../requisitos/dor-dod.md) e o registro do DoR em cada issue | Registrado em 13 das 14 features do Ciclo 6, de 23 a 26/11, depois do início do código ([DoR aprovado depois do início do código](../../requisitos/dor-dod.md#919-dor-aprovado-depois-do-inicio-do-codigo)); o RF65 espera a aprovação do termo pela FBr |
| DoD (definição e aplicação) | [DoR e DoD](../../requisitos/dor-dod.md) e o checklist de cada issue | Em andamento no Ciclo 6 |
| Escopo do produto (atualizado) | [Solução proposta](../../produto/solucao-proposta.md) e [Priorização e MVP](../../requisitos/priorizacao-e-mvp.md) | Revisão final no fechamento |
| MVP (status atualizado e entregue totalmente) | [Features e backlog](../../visao-geral/backlog.md) e o [estado do Ciclo 6](index.md#ciclo-da-unidade) | Ciclos 3 a 6 integrados; Ciclo 6 em homologação com a FBr em 27/11 |
| Entrega do produto de software (disponível para uso) | [Publicação em produção](../../construcao/entrega-final.md#publicacao-em-producao) | Validação no ar; produção prevista para 30/11 |
| Feedback final do cliente (gravação) | — | A combinar com a FBr |
| Cronograma (evidências de execução) | [Cronograma geral](../../visao-geral/cronograma.md) e esta página | Em andamento |
| Site do projeto (GitHub Pages) | Este site | Em andamento |
| Vídeo de apresentação das entregas | — | A gravar |
