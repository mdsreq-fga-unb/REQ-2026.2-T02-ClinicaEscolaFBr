# 9.1 Definition of Ready (DoR)

## 9.1.1 Objetivo

Este documento define os **critérios de entrada** para que uma feature, com os requisitos funcionais (RFs) que ela declara e os requisitos não funcionais (RNFs) que a restringem, possa ser **iniciada na construção**. Evita-se, assim, desenvolver requisitos incompletos, ambíguos ou ainda dependentes de validação com a Clínica Escola FBr, o que gera retrabalho e impede o teste objetivo.

O DoR trata apenas da **entrada**. Os critérios de saída (quando uma feature pode ser considerada pronta) estão no Definition of Done (DoD), mantido em documento separado.

Os critérios foram derivados da estrutura que os requisitos já seguem na [Seção 8.1](./funcionais.md) e na [Seção 8.2](./nao-funcionais.md) e dos tipos de problema apontados na verificação cruzada ([Seção 8.3](./analise-feedback.md)). O DoR **avalia** os requisitos existentes; não cria nem renumera requisitos. Quando a avaliação encontra uma lacuna, a feature volta ao responsável pela CP (seção 9.5).

## 9.1.2 Escopo e unidade de avaliação

- **Unidade de avaliação:** a **feature** (FDD), com seus RFs e os RNFs que a restringem. Um RF só entra na construção se a feature a que pertence também estiver pronta.
- **Quando aplicar:** antes de a feature ser puxada para uma iteração de construção.
- **Quem avalia:** o integrante responsável pela CP de origem faz a autoavaliação pelo checklist, e o responsável pela revisão do conjunto confirma antes da entrada.
- **Resultado:** **Pronta**, **Pronta com ressalvas** ou **Não pronta** (seção 9.5).

## 9.1.3 Checklist de critérios

Os critérios **[B]** são **bloqueantes**: sem eles, a feature não entra na construção. Os critérios **[R]** são **recomendáveis**: podem ficar pendentes se a pendência for registrada.

### Estrutura e rastreabilidade

| # | Critério | Tipo |
| ---- | -------- | ---- |
| R1.1 | A feature segue o formato `<ação> <resultado> <objeto>` e está na lista de features (FDD), dentro de uma Área e de um Conjunto. | B |
| R1.2 | Cada RF tem o cabeçalho "RFn — título" igual ao da feature e uma linha de **Rastreabilidade** com a cadeia Feature → CP → OE. | B |
| R1.3 | As **dependências**, **integrações** e **restrições transversais** (por exemplo, CP12) estão declaradas na rastreabilidade, e os requisitos dos quais a feature depende já estão prontos ou em construção. | B |
| R1.4 | A feature não está marcada na documentação como **entrega posterior** ou **adiada**. Se estiver, só entra depois que a condição registrada for resolvida (seção 9.6). | B |
| R1.5 | A feature consta no Backlog de Produto (Seção 10) e está dentro do escopo do MVP, ou foi explicitamente decidida como fora dele. | B |
| R1.6 | A issue da feature está vinculada ao título (`#NN`), quando o repositório já tiver a issue criada. | R |

### Clareza e completude da descrição

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

### Critérios de aceitação

| # | Critério | Tipo |
| ---- | -------- | ---- |
| R3.1 | Há critérios de aceitação no formato **Dado / Quando / Então** para cada comportamento descrito. | B |
| R3.2 | Os critérios cobrem o **fluxo principal**, os **fluxos de exceção** (dado inválido, lista vazia, conflito) e as **negações de acesso** por perfil. | B |
| R3.3 | Cada critério é verificável: tem resultado observável e valores concretos quando há prazo, limite ou contagem. | B |
| R3.4 | Nenhuma regra da descrição fica sem critério, e nenhum critério exige algo que a descrição não declara. | B |
| R3.5 | Os critérios de acesso e de sigilo usam os perfis e restrições definidos na CP12, sem expor dados clínicos a perfis sem acesso ao prontuário. | B |

### Dependências e validação com a FBr

| # | Critério | Tipo |
| ---- | -------- | ---- |
| R4.1 | As regras de negócio usadas pelo requisito foram confirmadas pela FBr (ata ou resposta registrada) ou estão registradas como **pendência de validação**. | B |
| R4.2 | Toda pendência com a FBr está listada na seção "Pendências de validação com a FBr" da [Análise do Feedback](requisitos/analise-feedback.md), com o valor padrão adotado até a validação. | B |
| R4.3 | Nenhuma decisão em aberto altera o **comportamento central** da feature. Se alterar, a feature é **Não pronta**. | B |
| R4.4 | Regras, termos e modelos que dependem de aprovação da FBr (regras de sinalização, texto do termo de consentimento, modelo da declaração) estão aprovados e versionados. | R |

### Requisitos não funcionais associados

| # | Critério | Tipo |
| ---- | -------- | ---- |
| R5.1 | Os RNFs que restringem a feature estão identificados na rastreabilidade do RNF ("transversal às features …"), cobrindo as categorias URPS+ aplicáveis. | B |
| R5.2 | Cada RNF tem **meta mensurável**, **método de verificação** ("A conformidade deve ser verificada por …"), **classificação URPS+** e **rastreabilidade**. | B |
| R5.3 | Metas de desempenho e disponibilidade indicam o cenário de referência (carga, massa de dados, janela de apuração), não apenas "condições normais de uso". | B |
| R5.4 | Regras transversais são **referenciadas**, e não repetidas: auditoria das operações sobre a sessão no RNF10, acessibilidade no RNF56, e acesso e sigilo na CP12. | R |
| R5.5 | Se a feature trata dados pessoais ou de saúde, os RNFs de criptografia, restrição de acesso, trilha de auditoria e retenção da CP12 foram considerados. | B |

### Segurança, privacidade e conformidade

| # | Critério | Tipo |
| ---- | -------- | ---- |
| R6.1 | A matriz de acesso por perfil está definida: quem executa, quem consulta e o que cada perfil vê. | B |
| R6.2 | Para o paciente ou responsável, o requisito usa a **verificação de identidade** (RF52) e não "usuário autenticado", já que esse público não possui conta. | B |
| R6.3 | Operações que alteram dados relevantes têm auditoria definida, com autor, data/hora e estado anterior e novo. | B |
| R6.4 | O tratamento de dados pessoais e de saúde tem finalidade clara. Pontos ainda não validados (por exemplo, a base legal do RF57) estão registrados como pendência. | B |

### Interface e acessibilidade

| # | Critério | Tipo |
| ---- | -------- | ---- |
| R7.1 | Para páginas voltadas ao público externo (inscrição, consulta de posição, agendamento e confirmação de presença), os requisitos da CP14 (RNF56, RNF57 e RNF58) estão considerados. | B |
| R7.2 | Estados vazios e mensagens esperadas estão descritos ("não há casos pendentes", "link inválido", "não há sessões disponíveis"). | R |
| R7.3 | Existe esboço ou protótipo validado para as features de maior interação, quando houver. | R |

### Viabilidade técnica e tamanho

| # | Critério | Tipo |
| ---- | -------- | ---- |
| R8.1 | A equipe de desenvolvimento entende o requisito e consegue estimá-lo sem esclarecimentos pendentes. | B |
| R8.2 | A feature cabe em uma iteração. Se não couber, foi dividida em partes menores sem perder a rastreabilidade. | B |
| R8.3 | Integrações externas (envio de e-mail e SMS, geração de PDF) e a massa de dados necessária para teste estão identificadas. | R |

## 9.1.4 Verificação rápida da redação

Antes de marcar os grupos de descrição e critérios como atendidos, confere-se se o requisito evita os problemas mais recorrentes na verificação cruzada:

- **Lacuna:** a descrição pressupõe algo que nenhum requisito declara.
- **Inconsistência:** descrição, critérios, título ou modelo de domínio divergem.
- **Ambiguidade e clareza:** perfis não identificados, "pode", "quando aplicável".
- **Verificabilidade:** prazo ou valor sem definição, ou critério sem resultado observável.
- **Escopo amplo:** o requisito reúne ações com regras diferentes.
- **Incompletude:** partes obrigatórias da descrição sem critério de aceitação.
- **Redundância:** a regra já está declarada em outro requisito.

## 9.1.5 Resultado da avaliação

| Resultado | Condição | Consequência |
| --------- | -------- | ------------ |
| **Pronta** | Todos os critérios [B] atendidos e nenhum [R] pendente sem justificativa. | Pode entrar na construção. |
| **Pronta com ressalvas** | Todos os [B] atendidos; um ou mais [R] pendentes, registrados com responsável e prazo. | Pode entrar na construção; as pendências são acompanhadas. |
| **Não pronta** | Algum critério [B] não atendido. | Volta ao responsável pela CP com a lista dos critérios que falharam. |

Uma pendência de validação com a FBr não bloqueia a entrada quando o requisito adota **parâmetro configurável com valor padrão** (R2.4) e a pendência está registrada (R4.2). Ela bloqueia quando a decisão em aberto muda o comportamento central da feature (R4.3).

### Registro

Cada avaliação é registrada na issue da feature:

```text
Feature: <nome> (CP<n>)
RFs: <códigos>    RNFs: <códigos>
Data: <dd/mm/aaaa>    Avaliador: <nome>    Revisor: <nome>
Resultado: Pronta | Pronta com ressalvas | Não pronta
Critérios [B] não atendidos: <códigos e motivo>
Pendências [R] e/ou com a FBr: <descrição, responsável, prazo>
```

## 9.1.6 Situação conhecida na documentação

Com base na Seção 8.1 consultada em 08/10/2026, os pontos abaixo afetam a avaliação e devem ser conferidos antes de cada feature entrar na construção.

| Requisito ou CP | Situação registrada | Efeito no DoR |
| --------------- | ------------------- | ------------- |
| RF3 (inscrição assistida) | Entrega posterior; a recepção usa o RF1 em nome do interessado. | R1.4: não entra até a condição ser resolvida. |
| RF5 (pontos de atenção) | Adiado; depende de regras aprovadas e vigentes pela coordenação. | R1.4 e R4.4: precisa das regras versionadas. |
| RF12 (reagendamento) | Entrega posterior; hoje é feito por cancelamento (RF15/RF16) e nova sessão (RF10). | R1.4. |
| RF13 (lembrete automático) | Entrega posterior; o RF14 funciona sem ele. | R1.4. |
| RF4 (triagem) | Prazo máximo para triagem a confirmar com a FBr. | R2.4 e R4.2: registrar como parâmetro com valor padrão. |
| CP5 (distribuição) | Ordem de prioridade (RN5.4), limite de casos simultâneos (RN5.8) e atendimento em dupla (RN5.9) dependem da FBr. | R4.1 e R4.2: registrar a pendência e o padrão adotado. |
| RF57 (consentimento) | Base legal depende da FBr, como controladora dos dados. | R6.4: pendência registrada. |
| Parâmetros de agendamento | Duração da sessão (50 min), antecedência do lembrete (24 h), prazo de confirmação (12 h) e antecedência mínima de cancelamento (24 h) são propostas a validar. | R2.4: atendido pelo parâmetro configurável. |
| RNF12 | Carga de referência de 30 usuários simultâneos é estimativa a validar. | R5.3: atendido, com validação pendente. |

## 9.1.7 Relação com os demais documentos

- **DoD:** uma feature só é avaliada pelo DoD depois de passar pelo DoR. Os critérios de teste, qualidade e documentação de saída estão no DoD.
- **Requisitos (8.1 e 8.2):** o DoR verifica a qualidade desses documentos. As correções decorrentes da verificação cruzada devem estar aplicadas antes da avaliação.
- **Análise do Feedback (8.3):** concentra as pendências de validação com a FBr citadas no R4.2.
- **Backlog de Produto (10):** fonte para o R1.5, sobre o pertencimento ao MVP e a ordem de entrega.

## 9.1.8 Revisão deste documento

O DoR é revisado ao fim de cada iteração, na retrospectiva, e atualizado quando um retrabalho causado por requisito mal definido revelar um critério que faltava.

# 9.2 Definition of Done (DoD)

## 9.2.1 Regra de fluxo

O DoR e o DoD marcam as duas pontas da construção de uma feature:

- uma feature só **entra em desenvolvimento** quando atende ao **DoR** (seção 9.1);
- uma feature só é **considerada concluída** quando atende ao **DoD** (esta seção).

Uma feature que não passou pelo DoR não é avaliada pelo DoD. A validação ocorre de forma incremental, acompanhando os marcos do FDD e combinando inspeções internas, testes e demonstrações com o cliente.

## 9.2.2 Checklist por marco do FDD

Uma feature só é considerada **pronta** quando cumprir todos os critérios abaixo, na ordem. Cada critério indica a **evidência** que comprova o seu cumprimento: sem a evidência registrada, o critério não é marcado como atendido. Todas as evidências ficam na issue da feature no GitHub (seção 9.2.3), por anexo ou link.

### 1. Design inspecionado

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

### 2. Código concluído

| # | Critério | Evidência |
| ---- | -------- | --------- |
| D2.1 | Todos os cenários previstos nos critérios de aceitação implementados. | Lista dos critérios de aceitação com o commit ou PR que implementa cada um. |
| D2.2 | Feature integrada aos componentes necessários. | Componentes e integrações afetados descritos no PR. |
| D2.3 | Nenhuma regra aprovada alterada sem registro e validação. | Ausência de alteração de regra, ou link para o registro da alteração e da sua validação. |
| D2.4 | Testes unitários escritos e passando. | Execução dos testes no PR (CI ou saída anexada) sem falhas. |

### 3. Código inspecionado

| # | Critério | Evidência |
| ---- | -------- | --------- |
| D3.1 | Código revisado por outro integrante da equipe (nunca pelo próprio autor). | Aprovação no PR feita por integrante diferente do autor. |
| D3.2 | Legibilidade e padrões definidos pela equipe respeitados. | Revisão aprovada sem apontamentos de padrão em aberto. |
| D3.3 | Tratamento de erros adequado. | Fluxos de exceção dos critérios de aceitação cobertos por testes ou verificados na revisão. |
| D3.4 | Segurança e controle de acesso verificados. | Negações de acesso por perfil testadas ou verificadas na revisão. |
| D3.5 | Proteção de dados sensíveis verificada (LGPD). | Verificação registrada na revisão para os dados pessoais e de saúde tratados pela feature. |
| D3.6 | Aderência aos critérios de aceitação confirmada. | Critérios de aceitação marcados como verificados pelo revisor. |
| D3.7 | Apontamentos da revisão corrigidos ou registrados como pendência. | Comentários da revisão resolvidos, ou pendência aberta como issue vinculada. |

### 4. Promovido para a versão integrada (Promote to Build)

| # | Critério | Evidência |
| ---- | -------- | --------- |
| D4.1 | Feature aprovada nas inspeções de design e de código. | Registros D1.8 e D3.1 presentes na issue. |
| D4.2 | Testes unitários e de integração passando. | Execução dos testes na versão integrada sem falhas. |
| D4.3 | Código integrado à base compartilhada sem quebrar a build. | PR mesclado e build da branch principal concluída com sucesso. |
| D4.4 | Resultado registrado no GitHub, com evidências dos testes e pendências conhecidas. | Comentário na issue com o link do PR, o resultado dos testes e as pendências conhecidas. |

### 5. Demonstrada

| # | Critério | Evidência |
| ---- | -------- | --------- |
| D5.1 | Feature apresentada a Robson e à equipe da FBr, junto ao seu conjunto de features. | Ata da reunião de demonstração vinculada à issue. |
| D5.2 | Demonstração feita com cenários próximos da operação real da clínica (inscrição, triagem, consulta da fila, agendamento, confirmação de presença). | Cenários demonstrados listados na ata. |

### 6. Aceita

| # | Critério | Evidência |
| ---- | -------- | --------- |
| D6.1 | Aceite formal da FBr registrado e vinculado à feature. | Aceite registrado na issue da feature (seção 9.2.3), com link para a ata ou a mensagem da FBr. |
| D6.2 | Observações, pendências e correções solicitadas pela FBr registradas e vinculadas à feature. | Itens listados no mesmo registro do aceite, cada correção com issue própria vinculada. |
| D6.3 | Caso não seja aceita, a feature **não está pronta**: retorna ao planejamento com prioridade e critérios revisados. | Motivo da recusa registrado na issue e a feature devolvida ao backlog. |

> **Regra de conformidade:** o aceite da FBr avalia comportamento, valor e adequação às necessidades da clínica. Ele **não substitui** a verificação de conformidade com o CRP, a LGPD e os requisitos de acessibilidade, que é responsabilidade da equipe técnica e é feita nas etapas 1 (Design inspecionado) e 3 (Código inspecionado).

## 9.2.3 Registro

O aceite da FBr fica no **mesmo registro** da feature (a sua issue no GitHub), junto com as evidências das etapas anteriores, as pendências e as correções solicitadas. Assim, é possível rastrear, a partir da feature, quem aceitou, quando e com quais ressalvas.

```text
Feature: <nome> (CP<n>)
RFs: <códigos>    RNFs: <códigos>
Inspeção de design: <data> | <participantes> | <resultado>
Inspeção de código: <link do PR> | <revisor> | <resultado>
Promote to Build: <link do PR mesclado> | <resultado dos testes>
Demonstração: <data> | <link da ata>
Aceite da FBr: Aceita | Não aceita | <data> | <quem aceitou> | <link da ata ou mensagem>
Pendências: <descrição, responsável, prazo>
Correções solicitadas: <descrição e issue vinculada>
```

## 9.2.4 DoD da entrega final (MVP)

- [ ] Todas as features do MVP cumprem a DoD acima
- [ ] Demonstração integrada do fluxo completo do MVP apresentada à FBr
- [ ] Limites conhecidos registrados
- [ ] Evoluções previstas registradas
