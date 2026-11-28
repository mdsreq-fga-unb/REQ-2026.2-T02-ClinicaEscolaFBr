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
| 24/11 | Validação | A FBr validou no ambiente de validação as seis features do Ciclo 5 integradas depois de 16/11. | Validação com o cliente. | [Validação de 24/11](reunioes.md#validacao-das-funcionalidades-do-ciclo-5-pela-fbr) e aceite nas issues |
| 24/11 | Representação | Representações do produto inteiro: diagrama de atividades, mapa das features pela jornada e especificação de caso de uso. | Representação de requisitos. | [Representação de requisitos](../../requisitos/representacao.md) |
| 27/11 | Homologação e validação final | Reunião gravada com a FBr: demonstração do sistema completo no ambiente de validação, avaliação e aceite, com a ressalva de entregar até 01/12 os pedidos confirmados na reunião. A demonstração e o aceite (D5 e D6) foram registrados nas issues das features do Ciclo 6 no mesmo dia. | Validação com o cliente. | [Validação final com a FBr (27/11)](reunioes.md#validacao-final-com-a-fbr-2711), com o vídeo e a ata, e o [roteiro de homologação](../../construcao/entrega-final.md#roteiro-de-homologacao) |
| 27/11 a 01/12 | Construir por Feature (pedidos da validação final) | Registro de acessos com o que foi acessado ou feito (RF56, [DF77](../../requisitos/decisoes-fbr.md#df77)) e, se viáveis, o endereço pelo CEP (RF1, [DF75](../../requisitos/decisoes-fbr.md#df75)) e o comprovante da inscrição por e-mail (RF2, [DF76](../../requisitos/decisoes-fbr.md#df76)), cada um com a sua PR. A declaração digital ([DF78](../../requisitos/decisoes-fbr.md#df78)) fica para depois da entrega. | Organização e atualização (decisões DF75 a DF78) e verificação (testes e inspeção de código). | PRs referenciadas nas issues [#51](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/51), [#88](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/88) e [#89](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/89) |
| 30/11 | Publicação | Publicação em produção, com a aprovação no ambiente `producao` do GitHub. | — | [Publicação em produção](../../construcao/entrega-final.md#publicacao-em-producao) |
| 01/12 | Apresentação final | Apresentação das entregas, com o sistema em produção. | — | Slides e vídeo de apresentação |

## Entregas da unidade { #entregas }

Os entregáveis do plano da Unidade 4, com onde está cada um no site. A situação é a de 27/11/2026 e é atualizada até a entrega.

| Entregável do plano | Onde está | Situação em 27/11 |
| --- | --- | --- |
| Apresentação (clareza, organização, tempo) | Slides da apresentação final | Em preparação |
| Visão de Produto e Projeto (atualizações por issues) | [Cenário atual](../../produto/cenario-atual.md), [Solução proposta](../../produto/solucao-proposta.md) e [Intervenção social](../../produto/intervencao-social.md) | Issues das Unidades 1 e 2 tratadas; issues da Unidade 3 em tratamento |
| Processo de ESW (evidências de execução) | [Estratégia de ESW](../../processo/estrategia-esw.md) e [Execução do processo](../../visao-geral/execucao-do-processo.md) | Atualizado até o Ciclo 5; o Ciclo 6 entra no fechamento |
| Processo de ER (evidências de execução) | [Engenharia de requisitos](../../processo/engenharia-requisitos.md) e [Engenharia de requisitos na prática](../../visao-geral/execucao-do-processo.md#6-engenharia-de-requisitos-na-pratica) | Atualizado até o Ciclo 5; o Ciclo 6 entra no fechamento |
| Rastreabilidade (atualizada) | [Estrutura de requisitos](../../visao-geral/organizacao-e-atualizacao.md#2-estrutura-de-requisitos) e a rastreabilidade de cada requisito | Gerada do catálogo a cada publicação |
| Lista de requisitos funcionais (status atualizado) | [Requisitos funcionais](../../requisitos/funcionais.md) | Estado de cada RF copiado das issues |
| Lista de requisitos não funcionais (status atualizado) | [Requisitos não funcionais](../../requisitos/nao-funcionais.md) | Verificação de cada RNF registrada nas issues (D4.5) |
| Representação de requisitos (aplicação) | [Representação de requisitos](../../requisitos/representacao.md) | Feito |
| Verificação e validação de requisitos (estratégia e aplicação) | [Verificação e validação](../../processo/verificacao-e-validacao.md), inspeções nas issues e reuniões com a FBr | Validação final com a FBr em 27/11, com o aceite do sistema ([DF73](../../requisitos/decisoes-fbr.md#df73)); inspeções registradas nas issues |
| Organização e atualização de requisitos (estratégia e aplicação) | [Organização e atualização](../../visao-geral/organizacao-e-atualizacao.md) | Em uso |
| DoR (definição e aplicação) | [DoR e DoD](../../requisitos/dor-dod.md) e o registro do DoR em cada issue | Registrado em 13 das 14 features do Ciclo 6, de 23 a 26/11, depois do início do código (seção "DoR aprovado depois do início do código" de [DoR e DoD](../../requisitos/dor-dod.md)); o RF65 espera a aprovação do termo pelo Jurídico da FBr, pedida até 30/11 |
| DoD (definição e aplicação) | [DoR e DoD](../../requisitos/dor-dod.md) e o checklist de cada issue | Em andamento no Ciclo 6: demonstração e aceite da FBr (D5 e D6) registrados em 27/11 |
| Escopo do produto (atualizado) | [Solução proposta](../../produto/solucao-proposta.md) e [Priorização e MVP](../../requisitos/priorizacao-e-mvp.md) | Pedidos da validação final registrados ([DF75](../../requisitos/decisoes-fbr.md#df75) a [DF78](../../requisitos/decisoes-fbr.md#df78)); revisão final no fechamento |
| MVP (status atualizado e entregue totalmente) | [Features e backlog](../../visao-geral/backlog.md) e o [estado do Ciclo 6](index.md#ciclo-da-unidade) | Ciclos 3 a 6 integrados e aceitos pela FBr em 27/11 ([DF73](../../requisitos/decisoes-fbr.md#df73)); pedidos da validação final até 01/12 |
| Entrega do produto de software (disponível para uso) | [Publicação em produção](../../construcao/entrega-final.md#publicacao-em-producao) | Validação no ar; produção prevista para 30/11 |
| Feedback final do cliente (gravação) | [Validação final com a FBr (27/11)](reunioes.md#validacao-final-com-a-fbr-2711), com o vídeo e a ata | Feito em 27/11: aceite da FBr ([DF73](../../requisitos/decisoes-fbr.md#df73)) |
| Cronograma (evidências de execução) | [Cronograma geral](../../visao-geral/cronograma.md) e esta página | Em andamento |
| Site do projeto (GitHub Pages) | Este site | Em andamento |
| Vídeo de apresentação das entregas | — | A gravar |
