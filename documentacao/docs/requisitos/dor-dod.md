# DoR e DoD { #9-dor-e-dod }

!!! abstract "Na estrutura de requisitos"
    Esta página define os critérios que levam cada feature de Planejada a Aceita. O estado de cada feature é acompanhado na issue dela e copiado para o catálogo. Como as informações se ligam e são atualizadas: [Organização e atualização](../visao-geral/organizacao-e-atualizacao.md).

## Definition of Ready (DoR) { #91-definition-of-ready-dor }

### Objetivo { #911-objetivo }

Este documento define os **critérios de entrada** para que uma feature, com os requisitos funcionais (RFs) que ela declara e os requisitos não funcionais (RNFs) que a restringem, possa ser **iniciada na construção**. Evita-se, assim, desenvolver requisitos incompletos, ambíguos ou ainda dependentes de validação com a Clínica Escola FBr, o que gera retrabalho e impede o teste objetivo.

O DoR trata apenas da **entrada**. Os critérios de saída (quando uma feature pode ser considerada pronta) estão no Definition of Done (DoD), na [DoD](#92-definition-of-done-dod).

Os critérios foram derivados da estrutura que os requisitos já seguem na [Requisitos funcionais](funcionais.md) e na [Requisitos não funcionais](nao-funcionais.md) e dos tipos de problema apontados na verificação cruzada ([Análise do feedback](analise-feedback.md)). O DoR **avalia** os requisitos existentes; não cria nem renumera requisitos. Quando a avaliação encontra uma lacuna, a feature volta ao seu Líder de Feature ([resultado da avaliação](#915-resultado-da-avaliacao)).

### Escopo e unidade de avaliação { #912-escopo-e-unidade-de-avaliacao }

- **Unidade de avaliação:** a **feature** (FDD), com seus RFs e os RNFs que a restringem. Um RF só entra na construção se a feature a que pertence também estiver pronta.
- **Quando aplicar:** antes de a feature ser puxada para uma iteração de construção.
- **Quem avalia:** o Líder de Feature responsável pela feature (ver a [composição da equipe](../processo/equipe-e-cliente.md#71-composicao-da-equipe) e o [Features e backlog](../visao-geral/backlog.md)) faz a autoavaliação pelo checklist, e outro integrante, na revisão cruzada, confirma antes da entrada.
- **Resultado:** **Pronta**, **Pronta com ressalvas** ou **Não pronta** ([resultado da avaliação](#915-resultado-da-avaliacao)).

### Checklist de critérios { #913-checklist-de-criterios }

Os critérios **[B]** são **bloqueantes**: sem eles, a feature não entra na construção. Os critérios **[R]** são **recomendáveis**: podem ficar pendentes se a pendência for registrada.

#### Estrutura e rastreabilidade

| # | Critério | Tipo |
| ---- | -------- | ---- |
| R1.1 | A feature segue o formato `<ação> <resultado> <objeto>` e está na lista de features (FDD), dentro de uma Área e de um Conjunto. | B |
| R1.2 | Cada RF tem o cabeçalho "RFn — título" igual ao da feature e uma linha de **Rastreabilidade** com a cadeia Feature → CP → OE. | B |
| R1.3 | As **dependências**, **integrações** e **restrições transversais** (por exemplo, CP12) estão declaradas na rastreabilidade, e os requisitos dos quais a feature depende já estão prontos ou em construção. | B |
| R1.4 | A feature não está marcada na documentação como **entrega posterior** ou **adiada**. Se estiver, só entra depois que a condição registrada for resolvida ([situação conhecida na documentação](#916-situacao-conhecida-na-documentacao)). | B |
| R1.5 | A feature consta na [Priorização e MVP](priorizacao-e-mvp.md) e está dentro do escopo do MVP, ou foi explicitamente decidida como fora dele. | B |
| R1.6 | A issue da feature está vinculada ao título (`#NN`), quando o repositório já tiver a issue criada. | R |
| R1.7 | Toda **integração** com um RF de ciclo posterior diz, no requisito, o que acontece enquanto esse RF não existe (por exemplo, o link de confirmação do RF10 antes do RF14). Se a feature for entregue sem a parte que depende dele, a entrega parcial fica registrada no [catálogo de requisitos](priorizacao-e-mvp.md#catalogo-de-requisitos) e aparece na linha "Entrega e situação" do requisito. | B |

#### Clareza e completude da descrição

| # | Critério | Tipo |
| ---- | -------- | ---- |
| R2.1 | O requisito expressa uma única funcionalidade. Ações com regras distintas não estão reunidas no mesmo RF. | B |
| R2.2 | O **ator** está identificado por perfil (paciente/responsável, secretaria, estagiário, supervisor, coordenação). Não há termos genéricos como "usuário" ou "usuário autorizado". | B |
| R2.3 | Não há termos vagos ou opcionais ("pode", "quando aplicável", "rapidamente", "imediatamente", "a definir") em regras que precisam ser implementadas. | B |
| R2.4 | Prazos, limites e valores estão definidos ou foram declarados como **parâmetro configurável**, com valor padrão e perfil que pode alterá-lo (por exemplo, duração da sessão, antecedência do lembrete, prazo de confirmação, antecedência mínima de cancelamento). | B |
| R2.5 | Os dados de entrada e de saída estão enumerados, incluindo os dados mínimos exibidos a cada perfil. | B |
| R2.6 | Os termos de domínio usados estão definidos no requisito ou no glossário. Em particular, **prioridade clínica** (vermelha, amarela, verde) é distinta de **prioridade no backlog**, e o texto deixa claro qual dos dois está em uso. | B |
| R2.7 | A descrição não contradiz outro RF, RNF, critério de aceitação, título ou modelo de domínio da CP. | B |
| R2.8 | O requisito respeita o que está **fora do escopo** na documentação (por exemplo, atendimento remoto, gestão de semestres letivos e sugestão automática de cor na triagem). | B |

#### Critérios de aceitação

| # | Critério | Tipo |
| ---- | -------- | ---- |
| R3.1 | Há critérios de aceitação em **lista de verificação**, com uma afirmação curta e verificável para cada comportamento descrito. | B |
| R3.2 | Os critérios cobrem o **fluxo principal**, os **fluxos de exceção** (dado inválido, lista vazia, conflito) e as **negações de acesso** por perfil. | B |
| R3.3 | Cada critério é verificável: tem resultado observável e valores concretos quando há prazo, limite ou contagem. | B |
| R3.4 | Nenhuma regra da descrição fica sem critério, e nenhum critério exige algo que a descrição não declara. | B |
| R3.5 | Os critérios de acesso e de sigilo usam os perfis e restrições definidos na CP12, sem expor dados clínicos a perfis sem acesso ao prontuário. | B |

#### Dependências e validação com a FBr

| # | Critério | Tipo |
| ---- | -------- | ---- |
| R4.1 | As regras de negócio usadas pelo requisito foram confirmadas pela FBr (ata ou resposta registrada) ou estão registradas como **pendência de validação**. | B |
| R4.2 | Toda pendência com a FBr está listada na seção "Pendências de validação com a FBr" da [Análise do Feedback](analise-feedback.md#pendencias-de-validacao-com-a-fbr), com o valor padrão adotado até a validação. | B |
| R4.3 | Nenhuma decisão em aberto altera o **comportamento central** da feature. Se alterar, a feature é **Não pronta**. | B |
| R4.4 | Regras, termos e modelos que dependem de aprovação da FBr e que **definem uma condição essencial** da feature (regras de sinalização do RF5, texto do termo de consentimento do RF57, modelo da declaração do RF45) estão aprovados e versionados. Quando o documento apenas **complementa** a feature, porque o requisito já define o comportamento sem ele (por exemplo, o modelo da anamnese no RF69, registrado como texto livre até a FBr enviar o modelo), a falta dele é registrada como pendência (R4.2) e não impede a entrada. | B |

#### Requisitos não funcionais associados

| # | Critério | Tipo |
| ---- | -------- | ---- |
| R5.1 | Os RNFs que restringem a feature estão identificados na rastreabilidade do RNF ("transversal às features …"), cobrindo as categorias URPS+ aplicáveis. | B |
| R5.2 | Cada RNF tem **meta mensurável**, **método de verificação** ("A conformidade deve ser verificada por …"), **classificação URPS+** e **rastreabilidade**. Para os RNFs classificados como **Evolutivos**, a meta exigida na entrada e no aceite é o [patamar mínimo de lançamento](priorizacao-e-mvp.md#patamar-minimo-de-lancamento-dos-rnfs-evolutivos), e só o refinamento indicado nessa tabela fica para depois. | B |
| R5.3 | Metas de desempenho e disponibilidade indicam o cenário de referência (carga, massa de dados, janela de apuração), não apenas "condições normais de uso". | B |
| R5.4 | Regras transversais são **referenciadas**, e não repetidas: auditoria das operações sobre a sessão no RNF10, acessibilidade no RNF56, e acesso e sigilo na CP12. | R |
| R5.5 | Se a feature trata dados pessoais ou de saúde, os RNFs de criptografia, restrição de acesso, trilha de auditoria e retenção da CP12 foram considerados. | B |

#### Segurança, privacidade e conformidade

| # | Critério | Tipo |
| ---- | -------- | ---- |
| R6.1 | A matriz de acesso por perfil está definida: quem executa, quem consulta e o que cada perfil vê. | B |
| R6.2 | Para o paciente ou responsável, o requisito usa a **verificação de identidade** (RF52) e não "usuário autenticado", já que esse público não possui conta. | B |
| R6.3 | Operações que alteram dados relevantes têm auditoria definida, com autor, data/hora e estado anterior e novo. | B |
| R6.4 | O tratamento de dados pessoais e de saúde tem finalidade clara. Pontos ainda não validados (por exemplo, a base legal do RF57) estão registrados como pendência. | B |

#### Interface e acessibilidade

| # | Critério | Tipo |
| ---- | -------- | ---- |
| R7.1 | Para páginas voltadas ao público externo (inscrição, consulta de posição, agendamento e confirmação de presença), os requisitos da CP14 (RNF56, RNF57 e RNF58) estão considerados. | B |
| R7.2 | Estados vazios e mensagens esperadas estão descritos ("não há casos pendentes", "link inválido", "não há sessões disponíveis"). | R |
| R7.3 | Existe esboço ou protótipo validado para as features de maior interação, quando houver. | R |

#### Viabilidade técnica e tamanho

| # | Critério | Tipo |
| ---- | -------- | ---- |
| R8.1 | A equipe de desenvolvimento entende o requisito e consegue estimá-lo sem esclarecimentos pendentes. | B |
| R8.2 | A feature cabe em uma iteração. Se não couber, foi dividida em partes menores sem perder a rastreabilidade. | B |
| R8.3 | Integrações externas (envio de e-mail, mensagem pronta de WhatsApp, geração de PDF) e a massa de dados necessária para teste estão identificadas. | R |

### Verificação rápida da redação { #914-verificacao-rapida-da-redacao }

Antes de marcar os grupos de descrição e critérios como atendidos, confere-se se o requisito evita os problemas mais recorrentes na verificação cruzada:

- **Lacuna:** a descrição pressupõe algo que nenhum requisito declara.
- **Inconsistência:** descrição, critérios, título ou modelo de domínio divergem.
- **Ambiguidade e clareza:** perfis não identificados, "pode", "quando aplicável".
- **Verificabilidade:** prazo ou valor sem definição, ou critério sem resultado observável.
- **Escopo amplo:** o requisito reúne ações com regras diferentes.
- **Incompletude:** partes obrigatórias da descrição sem critério de aceitação.
- **Redundância:** a regra já está declarada em outro requisito.

### Resultado da avaliação { #915-resultado-da-avaliacao }

| Resultado | Condição | Consequência |
| --------- | -------- | ------------ |
| **Pronta** | Todos os critérios [B] atendidos e nenhum [R] pendente sem justificativa. | Pode entrar na construção. |
| **Pronta com ressalvas** | Todos os [B] atendidos; um ou mais [R] pendentes, registrados com responsável e prazo. | Pode entrar na construção; as pendências são acompanhadas. |
| **Não pronta** | Algum critério [B] não atendido. | Volta ao Líder de Feature com a lista dos critérios que falharam. |

Uma pendência de validação com a FBr não bloqueia a entrada quando o requisito adota **parâmetro configurável com valor padrão** (R2.4) e a pendência está registrada (R4.2). Ela bloqueia quando a decisão em aberto muda o comportamento central da feature (R4.3) ou quando falta um documento que define uma condição essencial dela (R4.4).

Um RNF evolutivo também não bloqueia a entrada por ter refinamento previsto: a feature entra com o patamar mínimo de lançamento definido para ele (R5.2).

#### Registro

A decisão de prontidão só vale com o **registro preenchido** num comentário da issue da feature. Marcar os itens do checklist não basta: o registro é a evidência da decisão e precisa trazer a data, o avaliador (o Líder de Feature), o revisor (outro integrante, que confirma a avaliação), o resultado e a justificativa de cada critério não atendido ou pendente. Enquanto não houver registro, a feature continua com o **DoR em avaliação** no backlog, mesmo que todos os itens estejam marcados.

```text
Feature: <nome> (CP<n>)
RFs: <códigos>    RNFs: <códigos>
Data: <dd/mm/aaaa>    Avaliador: <nome>    Revisor: <nome>
Resultado: Pronta | Pronta com ressalvas | Não pronta
Nível de V&V: Alto | Padrão (regra em Verificação e validação: CP6, CP7, CP12 ou RNF da lista do nível alto)
Critérios [B] não atendidos: <códigos e motivo, ou "nenhum">
Pendências [R] e/ou com a FBr: <descrição, responsável, prazo, ou "nenhuma">
Justificativas: <por que cada critério pendente não impede ou impede a entrada>
```

### Situação conhecida na documentação { #916-situacao-conhecida-na-documentacao }

Com base nos requisitos funcionais consultados em 08/10/2026 e atualizada em 24/10/2026 com as decisões de 23/10, os pontos abaixo afetam a avaliação e devem ser conferidos antes de cada feature entrar na construção.

| Requisito ou CP | Situação registrada | Efeito no DoR |
| --------------- | ------------------- | ------------- |
| RF3 (inscrição assistida) | Entrega posterior; a recepção usa o RF1 em nome do interessado. | R1.4: não entra até a condição ser resolvida. |
| RF10 (agendamento) | Entregue no Ciclo 3 com o envio do link de confirmação; a página que recebe o link é a do RF14, do Ciclo 4. A entrega parcial está declarada no RF10. | R1.7: atendido no RF10; o RF14 completa o fluxo. |
| RF5 (pontos de atenção) | Adiado; depende de regras aprovadas e vigentes pela coordenação. | R1.4 e R4.4: precisa das regras versionadas. |
| RF12 (reagendamento) | Entrega posterior; hoje é feito por cancelamento (RF15/RF16) e nova sessão (RF10). | R1.4. |
| RF13 (lembrete automático) | Entrega posterior; o RF14 funciona sem ele. | R1.4. |
| RF4 (triagem) | Resolvido em 23/10/2026: a FBr não adota prazo de triagem ([DF19](decisoes-fbr.md#df19)); a lista mostra há quantos dias cada inscrição aguarda. | Nenhum: R2.4 deixa de se aplicar ao prazo. |
| CP5 (distribuição) | Resolvido em 23/10/2026: desempate pela data de inscrição, limite de 50 casos por supervisor, sem limite por estagiário, um estagiário responsável por caso e sem área de especialidade ([DF16](decisoes-fbr.md#df16), [DF17](decisoes-fbr.md#df17), [DF26](decisoes-fbr.md#df26) e [DF27](decisoes-fbr.md#df27)). | Nenhum. |
| RF57 (consentimento) | Base legal depende da FBr, como controladora dos dados. | R6.4: pendência registrada. |
| Parâmetros de agendamento | Confirmados em 23/10/2026: sessão de 50 min mais 10 min de anotações, lembrete 24 h antes e cancelamento sem falta até 1 h antes ([DF18](decisoes-fbr.md#df18), [DF20](decisoes-fbr.md#df20) e [DF21](decisoes-fbr.md#df21)). O prazo de confirmação (12 h) segue como proposta a validar. | R2.4: atendido pelo parâmetro configurável. |
| RNF12 | Carga de referência de 30 usuários simultâneos confirmada em 23/10/2026 ([DF22](decisoes-fbr.md#df22)). | R5.3: atendido. |

### Relação com os demais documentos { #917-relacao-com-os-demais-documentos }

- **DoD:** uma feature só é avaliada pelo DoD depois de passar pelo DoR. Os critérios de teste, qualidade e documentação de saída estão no DoD.
- **Requisitos funcionais e não funcionais:** o DoR verifica a qualidade desses documentos. As correções decorrentes da verificação cruzada devem estar aplicadas antes da avaliação.
- **Análise do feedback:** concentra as pendências de validação com a FBr citadas no R4.2.
- **Backlog de Produto (10):** fonte para o R1.5, sobre o pertencimento ao MVP e a ordem de entrega.
- **Estratégia de verificação e validação:** situa o DoR e o DoD entre os demais momentos de V&V, com o nível de rigor de cada feature ([Verificação e validação](../processo/verificacao-e-validacao.md)).

### Revisão deste documento { #918-revisao-deste-documento }

O DoR é revisado ao fim de cada iteração, na retrospectiva, e atualizado quando um retrabalho causado por requisito mal definido revelar um critério que faltava.

### DoR aprovado depois do início do código { #919-dor-aprovado-depois-do-inicio-do-codigo }

Uma avaliação feita depois do código não demonstra que a feature estava pronta antes da construção. Ela mostra só que a feature cumpria o DoR na data do registro. Por isso, os casos em que isso aconteceu ficam registrados aqui, com o tratamento dado.

**Como foi conferido (26/11/2026).** Em cada issue de feature com o checklist do DoR, comparamos duas datas, com a mesma regra do acompanhamento automático: a da primeira versão da descrição com o DoR aprovado, isto é, com todos os critérios [B] marcados e o registro preenchido, e a da abertura da primeira PR de código que implementa a feature. A primeira data vem do histórico de edições da issue.

| Ciclo | Feature (issue) | Primeira PR de código | DoR aprovado | O que estava aberto na abertura da PR |
| ----- | --------------- | --------------------- | ------------ | ------------------------------------- |
| 3 | RF1 ([#88](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/88)) e RF2 ([#89](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/89)) | [#139](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/139), 26/10 | 27/10 | registro do DoR |
| 3 | RF10 ([#96](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/96)) | [#158](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/158), 26/10 | 27/10 | R8.1 e registro do DoR |
| 3 | RF4 ([#90](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/90)), RF6 ([#91](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/91)) e RF66 ([#97](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/97)) | [#163](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/163), 27/10 | 28/10 | R8.1 e registro do DoR |
| 3 | RF18 ([#92](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/92)), RF20 ([#94](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/94)) e RF21 ([#95](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/95)) | [#168](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/168), 28/10 | 28/10, 32 minutos depois | R8.1 e registro do DoR |
| 4 | RF27 ([#148](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/148)), RF28 ([#149](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/149)) e RF69 ([#130](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/130)) | [#163](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/163), 27/10, ainda no Ciclo 3 | 11/11 (RF27 e RF28) e 06/11 (RF69) | o DoR dessas features do Ciclo 4: no RF69, todos os critérios [B]; no RF27, R2.7, R3.5 e R8.1; no RF28, R8.1; e os registros. A #163 adiantou a evolução, os dados iniciais e a consulta do prontuário |
| 4 | RF52 ([#47](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/47)) | [#202](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/202), 05/11 | 06/11 | registro do DoR |
| 4 | RF11 ([#141](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/141)) | [#222](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/222), 07/11 | 15/11 | R8.1, com o registro de 06/11 como "Não pronta" (ver abaixo) |
| 4 | RF22 ([#145](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/145)), RF23 ([#146](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/146)) e RF25 ([#147](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/147)) | [#239](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/239) a [#242](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/242), 10 e 11/11 | 16/11 | R8.1 |
| 5 | RF48 ([#22](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/22)) | [#259](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/259), 13/11 | 14/11 | R1.7, R3.2 e R5.2 |
| 6 | RF49 ([#23](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/23)) e RF45 ([#280](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/280)) | [#295](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/295) e [#296](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/296), 20/11 | 23/11 (RF49) e 25/11 (RF45) | R8.1 e registro do DoR; no RF45, também R1.3, R4.2 e R4.4 |
| 6 | RF33 ([#131](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/131)), RF68 ([#273](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/273)) e RF43 ([#279](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/279)) | [#303](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/303), [#301](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/301) e [#307](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/307), 23/11 | 25/11 (RF33 e RF43) e 26/11 (RF68) | R8.1 e registro do DoR; no RF33 e no RF43, também R1.3 |
| 6 | RF30 ([#271](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/271)), RF67 ([#272](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/272)) e RF32 ([#275](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/275)) | [#308](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/308), [#309](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/309) e [#316](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/316), 24/11 | 25/11 (RF67 e RF32) e 26/11 (RF30) | registro do DoR; no RF67, também R8.1; no RF30, também R5.1, R5.5 e R8.1; no RF32, também R1.3 |
| 6 | RF40 ([#276](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/276)), RF63 ([#277](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/277)), RF64 ([#278](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/278)), RF31 ([#274](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/274)) e RF42 ([#44](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/44)) | [#319](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/319) a [#321](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/321), [#325](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/325) e [#324](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/324), 25/11 | 25/11 (RF40, RF63 e RF64) e 26/11 (RF31 e RF42) | R8.1 e registro do DoR; no RF63, no RF64 e no RF31, também R1.3 |
| 4 e 6 | RF57 ([#52](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/52)) e RF65 ([#281](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/281)) | [#238](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/238), 10/11, e [#315](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/315), 24/11 | não aprovado | R4.4 (e R4.3 no RF65): o termo de consentimento ainda não foi aprovado pela FBr |

As demais features tiveram o DoR aprovado antes da primeira PR: RF7, RF8, RF14, RF17, RF29, RF34 a RF39, RF41, RF44 e RF56. As features de autenticação e cadastro (RF50, RF51, RF53 e RF54) ficaram fora da comparação, porque as issues delas são anteriores ao modelo atual e não têm o checklist do DoR.

**O que os casos mostram.** No Ciclo 3, o código do RF4, do RF6 e do RF66 veio antes do DoR, e a #163 adiantou também o código de três features do Ciclo 4 (RF27, RF28 e RF69). A lição registrada no fechamento do Ciclo 3 ([cronograma](../visao-geral/cronograma.md#ciclo-3-fechado-em-27102026)) foi fixar as datas-limite do DoR e da inspeção de design para todas as features e avisar o atraso no grupo no mesmo dia. Essa medida não impediu a repetição. Nos Ciclos 4 a 6, o item que mais ficou aberto foi o R8.1, a declaração do próprio Líder de que entende a feature, e o registro do DoR. No Ciclo 6, a [pré-avaliação de 16/11](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/287) corrigiu o texto dos requisitos antes do projeto, mas os registros só foram preenchidos de 23 a 26/11, com o código já em construção. Os registros feitos depois dizem isso na justificativa, como os da [#273](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/273) e da [#44](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/44).

**Tratamento.** Desde 26/11/2026, o workflow Feature Status tem a verificação **"DoR aprovado antes do código"**. Ela falha a PR de feature que cita uma issue de feature sem o DoR aprovado, isto é, sem os critérios [B] marcados, sem o registro preenchido ou com o registro "Não pronta". O acompanhamento automático já não deixava a feature avançar de estado sem o DoR, mas nada impedia abrir a PR de código antes dele. Com a verificação, a falta do DoR aparece na própria PR, antes da revisão do código. Ela conta o último "Resultado:" da seção "Registro da avaliação do DoR". Assim, uma avaliação antiga mantida acima da nova, como na #141, não bloqueia a feature.

A verificação roda quando a PR é aberta, reaberta ou editada, e não quando a issue muda. Depois que o DoR da feature é aprovado, para liberar a PR, edite a descrição dela ou use "Re-run jobs" na verificação.

Ela vale só para as PRs `feat:`, que constroem a feature, e isso é de propósito. As PRs `fix:`, `refactor:` e `test:` corrigem ou completam o que já foi construído e passam pela inspeção de código (D3). Barrar essas PRs impediria, por exemplo, corrigir o RF57, cujo DoR espera a FBr.

**RF11 ([#141](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/141)).** O registro de 06/11/2026 deu "Não pronta", com o R8.1 pendente. A PR [#222](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/222) foi aberta em 07/11 e mesclada em 08/11. O Líder (Nicolas) marcou o R8.1 em 15/11, e os itens [R] R7.2 e R7.3 foram marcados em 14/11. Até 26/11, o registro na issue continuava "Não pronta". Em 26/11, ele foi atualizado com a nova avaliação e as datas de cada item. A feature não podia ter avançado antes de 15/11.

**RF57 e RF65 ([#52](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/52) e [#281](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/281)).** O mecanismo do consentimento e da revogação foi construído com um modelo de termo redigido pela equipe ([DF44](decisoes-fbr.md#df44)). O R4.4 continua aberto, porque o termo define uma condição essencial das duas features e ainda não foi aprovado pela FBr. Por isso, as duas features continuam sem o DoR aprovado, e a inscrição pública fica fechada na produção até a aprovação do termo.

### Ressalvas das features do Ciclo 6 { #9110-ressalvas-das-features-do-ciclo-6 }

O DoR exige que uma decisão em aberto com a FBr que muda o comportamento central da feature seja resolvida antes da construção (R4.3 e R4.4). As demais ficam como ressalva, com responsável e prazo. Nas features do Ciclo 6, a situação é esta:

| Feature | O que depende da FBr | Muda o comportamento central? | Responsável e prazo |
| ------- | -------------------- | ----------------------------- | ------------------- |
| RF30, RF31, RF32, RF33, RF40, RF42, RF43, RF45, RF49, RF63, RF64, RF67 e RF68 | Aceite dos protótipos do Ciclo 6 (R7.3), enviados com o projeto | Não: as regras dessas features já foram confirmadas pela FBr (por exemplo, DF33, DF42, DF54, DF69 e DF70 a DF72), e uma mudança pedida no protótipo entra como ajuste da tela | Gabriel, na validação final com a FBr, em 27/11/2026 |
| RF30 | Se o "a qualquer momento" da resposta de 25/11 vale para o complemento feito pelo supervisor (padrão adotado: o supervisor complementa sem prazo) | Não: o comportamento central é o complemento do estagiário responsável | Gabriel, em 27/11/2026, com a pendência registrada em [Pendências de validação com a FBr](analise-feedback.md#pendencias-de-validacao-com-a-fbr) |
| RF57 e RF65 | Aprovação do termo de consentimento (R4.4) | Sim: sem o termo aprovado, as features não estão prontas | Gabriel e Jônatas (Líder), na validação final com a FBr, em 27/11/2026; até lá, a inscrição pública fica fechada na produção |

Os registros de cada feature, com o avaliador, o revisor e as justificativas, estão nas issues.

## Definition of Done (DoD) { #92-definition-of-done-dod }

### Regra de fluxo { #921-regra-de-fluxo }

O DoR e o DoD marcam as duas pontas da construção de uma feature:

- uma feature só **entra em desenvolvimento** quando atende ao **DoR**;
- uma feature só é **considerada concluída** quando atende ao **DoD** (esta seção).

Uma feature que não passou pelo DoR não é avaliada pelo DoD. A validação ocorre de forma incremental, acompanhando os marcos do FDD e combinando inspeções internas, testes e demonstrações com o cliente.

Esta seção é a **fonte única** dos critérios de validação de cada marco. O [processo de validação](../processo/equipe-e-cliente.md#73-processo-de-validacao) apenas explica como esses marcos se encaixam no processo da equipe e aponta para cá, sem repetir os critérios.

### Checklist por marco do FDD { #922-checklist-por-marco-do-fdd }

Uma feature só é considerada **pronta** quando cumprir todos os critérios abaixo, na ordem. Cada critério indica a **evidência** que comprova o seu cumprimento: sem a evidência registrada, o critério não é marcado como atendido. Todas as evidências ficam na issue da feature no GitHub ([Registro](#923-registro)), por anexo ou link.

#### 1. Design inspecionado

| # | Critério | Evidência |
| ---- | -------- | --------- |
| D1.1 | Modelo detalhado, diagramas de sequência, protótipos, regras de negócio e critérios de aceitação revisados pela equipe. | Links para os artefatos revisados e nome de quem revisou. |
| D1.2 | Consistência com o modelo de domínio verificada. | Classes e relacionamentos do modelo de domínio usados pela feature, citados no registro da inspeção. |
| D1.3 | Viabilidade técnica confirmada. | Registro de quem confirmou, com as tecnologias, integrações e dados de teste necessários e os riscos técnicos identificados (ou "nenhum"). |
| D1.4 | Requisitos de acessibilidade verificados. | RNFs de acessibilidade aplicáveis (CP14) listados, com o resultado da verificação de cada um. |
| D1.5 | Requisitos de segurança e de LGPD verificados. | RNFs de segurança e privacidade aplicáveis (CP12) listados, com o resultado da verificação de cada um. |
| D1.6 | Conformidade com as normas do CRP verificada. | Normas consideradas e conclusão da verificação. |
| D1.7 | Restrições da modalidade presencial da Clínica Escola consideradas. | Restrições aplicáveis citadas no registro da inspeção. |
| D1.8 | Resultado da inspeção registrado. | Comentário na issue com data, participantes, resultado (aprovado ou com ajustes) e apontamentos feitos. |

#### 2. Código concluído

| # | Critério | Evidência |
| ---- | -------- | --------- |
| D2.1 | Todos os critérios de aceitação implementados. | Lista dos critérios de aceitação com o commit ou PR que implementa cada um. |
| D2.2 | Feature integrada aos componentes necessários. | Componentes e integrações afetados descritos no PR. |
| D2.3 | Nenhuma regra aprovada alterada sem registro e validação. | Ausência de alteração de regra, ou link para o registro da alteração e da sua validação. |
| D2.4 | Testes unitários escritos e passando. | Execução dos testes no PR (CI ou saída anexada) sem falhas. |

#### 3. Código inspecionado

| # | Critério | Evidência |
| ---- | -------- | --------- |
| D3.1 | Código revisado por outro integrante da equipe (nunca pelo próprio autor). | Aprovação no PR feita por integrante diferente do autor. |
| D3.2 | Legibilidade e padrões definidos pela equipe respeitados. | Revisão aprovada sem apontamentos de padrão em aberto. |
| D3.3 | Tratamento de erros adequado. | Fluxos de exceção dos critérios de aceitação cobertos por testes ou verificados na revisão. |
| D3.4 | Segurança e controle de acesso verificados. | Negações de acesso por perfil testadas ou verificadas na revisão. |
| D3.5 | Proteção de dados sensíveis verificada (LGPD). | Verificação registrada na revisão para os dados pessoais e de saúde tratados pela feature. |
| D3.6 | Aderência aos critérios de aceitação confirmada. | Critérios de aceitação marcados como verificados pelo revisor. |
| D3.7 | Apontamentos **impeditivos** corrigidos antes da aprovação: falha de critério de aceitação, de controle de acesso, de proteção de dados, de teste ou de build. Só os apontamentos **não impeditivos** (legibilidade, organização ou otimização que não altera nenhum critério de aceitação nem RNF) podem virar pendência. | Comentários impeditivos resolvidos no próprio PR; cada pendência não impeditiva aberta como issue vinculada, com a justificativa de por que não impede. |

#### 4. Promovido para a versão integrada (Promote to Build)

| # | Critério | Evidência |
| ---- | -------- | --------- |
| D4.1 | Feature aprovada nas inspeções de design e de código. | Registros D1.8 e D3.1 presentes na issue. |
| D4.2 | Testes unitários e de integração passando. | Execução dos testes na versão integrada sem falhas. |
| D4.3 | Código integrado à base compartilhada sem quebrar a build. | PR mesclado e build da branch principal concluída com sucesso. |
| D4.4 | Resultado registrado no GitHub, com evidências dos testes e pendências conhecidas. | Comentário na issue com o link do PR, o resultado dos testes e as pendências conhecidas. |
| D4.5 | RNFs que restringem a feature verificados no patamar exigido: a meta completa ou, para os RNFs evolutivos, o [patamar mínimo de lançamento](priorizacao-e-mvp.md#patamar-minimo-de-lancamento-dos-rnfs-evolutivos). | Resultado de cada verificação (teste, inspeção ou relatório) no comentário da issue; o refinamento posterior dos evolutivos fica registrado como pendência. |

#### 5. Demonstrada

| # | Critério | Evidência |
| ---- | -------- | --------- |
| D5.1 | Feature apresentada a Robson e à equipe da FBr, junto ao seu conjunto de features. | Ata da reunião de demonstração vinculada à issue. |
| D5.2 | Demonstração feita com cenários próximos da operação real da clínica (inscrição, triagem, consulta da fila, agendamento, confirmação de presença). | Cenários demonstrados listados na ata. |

#### 6. Aceita

| # | Critério | Evidência |
| ---- | -------- | --------- |
| D6.1 | Aceite formal da FBr registrado e vinculado à feature. | Aceite registrado na issue da feature ([Registro](#923-registro)), com link para a ata ou a mensagem da FBr. |
| D6.2 | Observações, pendências e correções solicitadas pela FBr registradas e vinculadas à feature. | Itens listados no mesmo registro do aceite, cada correção com issue própria vinculada. |
| D6.3 | Caso não seja aceita, a feature **não está pronta**: retorna ao planejamento com prioridade e critérios revisados. | Motivo da recusa registrado na issue e a feature devolvida ao backlog. |

> **Regra de conformidade:** o aceite da FBr avalia comportamento, valor e adequação às necessidades da clínica. Ele **não substitui** a verificação de conformidade com o CRP, a LGPD e os requisitos de acessibilidade, que é responsabilidade da equipe técnica e é feita nas etapas 1 (Design inspecionado) e 3 (Código inspecionado).

### Registro { #923-registro }

O aceite da FBr fica no **mesmo registro** da feature (a sua issue no GitHub), junto com as evidências das etapas anteriores, as pendências e as correções solicitadas. Assim, é possível rastrear, a partir da feature, quem aceitou, quando e com quais ressalvas.

```text
Feature: <nome> (CP<n>)
RFs: <códigos>    RNFs: <códigos>
Inspeção de design: <data> | <participantes> | <resultado>
Inspeção de código: <link do PR> | <revisor> | <resultado>
Promote to Build: <link do PR mesclado> | <resultado dos testes> | <RNFs verificados e patamar>
Demonstração: <data> | <link da ata>
Aceite da FBr: Aceita | Não aceita | <data> | <quem aceitou> | <link da ata ou mensagem>
Pendências: <descrição, responsável, prazo>
Correções solicitadas: <descrição e issue vinculada>
```

**Onde fica cada evidência.** O bloco "Registro do DoD" da descrição da issue resume a feature e aponta, em cada linha, para a evidência do marco:

- a inspeção de design, com o comentário da inspeção e o `/de-acordo` do revisor (D1.8);
- a inspeção de código, com a aprovação da PR e o comentário da inspeção, quando houver (D3.1);
- a integração, com a PR mesclada, os testes da versão integrada e a verificação dos RNFs (D4.3 a D4.5);
- a demonstração, com a ata e o comentário `/demonstrada` (D5);
- o aceite, com a ata ou a mensagem da FBr e o comentário `/aceite` (D6).

Os comentários do acompanhamento automático também contam como evidência. O bloco fica completo até o aceite.

**Aceite de um conjunto de features.** Quando a FBr aceita várias features na mesma reunião, o comentário do aceite de cada uma diz o que foi demonstrado e aceito para ela (D5.2). Se a entrega foi parcial ou depende de outra feature, o comentário também diz o que fica para depois. Por exemplo, o RF10 foi aceito no Ciclo 3 com o envio do link de confirmação, e a página que recebe o link entrou com o RF14, no Ciclo 4 ([seção 9.1.6](#916-situacao-conhecida-na-documentacao)).

**Pendências que convivem com a conclusão.** Uma pendência só convive com o aceite quando não é impeditiva. O registro traz a justificativa, o responsável, o prazo e a issue que encaminha a pendência. Uma falha em critério de aceitação, em autorização ou na integridade dos dados nunca é pendência compatível com a conclusão: a feature volta ao marco em que a falha apareceu.

**Situação em 26/11/2026.** Nas 31 features aceitas até essa data com o modelo atual da issue, o bloco ainda tinha os marcadores do modelo, como `<data>` e `<link do PR>`, embora as evidências estivessem nos comentários, nas PRs e nas atas. Em 26/11, o bloco de cada uma foi preenchido com os links para essas evidências, como na [#92](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/92) (RF18) e na [#95](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/95) (RF21). As features ainda não aceitas preenchem o bloco no aceite. As features de autenticação e cadastro (RF50, RF51, RF53 e RF54) têm issues criadas antes do modelo atual, sem o bloco, e as evidências delas estão nos comentários.

### DoD da entrega final (MVP) { #924-dod-da-entrega-final-mvp }

- [ ] Todas as features do MVP cumprem a DoD acima
- [ ] Demonstração integrada do fluxo completo do MVP apresentada à FBr
- [ ] Limites conhecidos registrados
- [ ] Evoluções previstas registradas
