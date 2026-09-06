# 4. Estratégias de Engenharia de Software

A partir das informações apresentadas em [Cenário Atual](cenario-atual.md) e em [Solução Proposta](solucao-proposta.md), foram tomadas as decisões relativas às estratégias de engenharia de software que orientam a construção do produto da Clínica Escola FBr.

## 4.1 Estratégia Priorizada

- **Abordagem de Desenvolvimento de Software:** Ágil
- **Ciclo de vida:** Ágil
- **Processo de Engenharia de Software:** Feature-Driven Development (FDD)

O ciclo de vida ágil incorpora as características dos ciclos iterativo e incremental — a repetição de atividades em ciclos, com refinamento a partir do feedback, e a entrega progressiva de partes funcionais do produto — e acrescenta a ênfase na comunicação e na colaboração constantes com os stakeholders, além do feedback antecipado que fornece visibilidade e controle do produto ao cliente. Todo ciclo de vida ágil é iterativo e incremental, mas nem todo ciclo iterativo e incremental adota os valores e práticas do ágil. A escolha é, portanto, coerente com a abordagem priorizada e com o FDD, processo que se organiza em torno de funcionalidades pequenas, demonstráveis e valorizadas pelo cliente.

O detalhamento do processo adotado, seus cinco subprocessos e a decomposição do MVP em features estão registrados no estudo [Feature-Driven Development (FDD)](estudos/fdd.md).

## 4.2 Quadro Comparativo

O quadro a seguir compara o **Feature-Driven Development (FDD)** e o **ScrumXP** — dois processos compatíveis com a abordagem ágil priorizada — considerando os aspectos relevantes para o desenvolvimento da solução da Clínica Escola FBr.

| Características | FDD | ScrumXP |
| --- | --- | --- |
| **Abordagem geral** | Ágil, iterativo e incremental, organizado em torno de funcionalidades valorizadas pelo cliente, com a modelagem do domínio na origem do processo. | Ágil, iterativo e incremental, organizado em ciclos de duração fixa, com entregas incrementais e adaptação contínua. |
| **Unidade de trabalho** | Feature: pequena função valorizada pelo cliente, declarada no formato `<ação> <resultado> <objeto>` e implementável em duas semanas ou menos. | User story, escrita na perspectiva do usuário e alocada a uma sprint de uma a quatro semanas. |
| **Ponto de partida** | Modelo abrangente do domínio, construído em conjunto por especialistas do domínio e desenvolvedores, que fundamenta a identificação das features. | Visão do produto e backlog inicial, priorizado pelo Product Owner segundo o valor de negócio. |
| **Estrutura do processo** | Cinco processos: desenvolver um modelo abrangente, construir uma lista de features, planejar por feature, projetar por feature e construir por feature. O planejamento é feito por feature, não por período fixo. | Sprints de duração fixa, com planejamento, reuniões diárias, revisão e retrospectiva. O planejamento é feito por período fixo. |
| **Flexibilidade de requisitos** | Alta no detalhamento e na priorização das features; menor diante de mudanças estruturais no modelo de domínio. | Alta em qualquer nível: o backlog pode ser repriorizado a cada sprint e mudanças são acolhidas a qualquer momento. |
| **Colaboração com o cliente** | Validação por demonstração das features concluídas e pelos marcos de progresso de cada feature. | Envolvimento contínuo, com feedback ao final de cada sprint e disponibilidade permanente do Product Owner. |
| **Tratamento de requisitos não funcionais** | Não é prescrito pelo processo; precisa ser incorporado por meio de critérios de aceitação por feature e das inspeções de design e de código. | Não é prescrito pelo framework; incorporado por meio da Definition of Done e dos critérios de aceitação das histórias. |
| **Práticas técnicas prescritas** | Inspeções de design e de código e propriedade individual de classes, combinadas ao trabalho em equipes de feature. | Práticas do XP: desenvolvimento orientado a testes, programação em pares, integração contínua e refatoração. |
| **Mecanismos de qualidade** | Inspeções formais em dois pontos definidos, após o projeto e após a construção, como condição para a promoção da feature. | Qualidade embutida nas práticas técnicas, com testes automatizados executados continuamente e verificação contra a Definition of Done. |
| **Visibilidade do progresso** | Granular e objetiva: cinco marcos por feature — design concluído, design inspecionado, código concluído, inspeção de código e promoção para construção. | Por ciclo: incremento demonstrável ao final de cada sprint e acompanhamento do andamento durante a sprint. |
| **Documentação** | Concisa e orientada à prática, com projeto detalhado de cada feature antes da construção. | Mínima, com ênfase na comunicação direta e nos testes como especificação executável. |
| **Papéis e responsabilidade** | Líderes de feature, com propriedade individual de classes equilibrada pelo trabalho em equipes de feature. | Time auto-organizado, com propriedade coletiva do código e os papéis de Product Owner e Scrum Master. |
| **Perfil de equipe adequado** | Projetos de médio a grande porte, com equipes que valorizam a combinação de responsabilidade individual e trabalho em equipe; pressupõe familiaridade com modelagem de domínio. | Equipes pequenas e colaborativas, com representação permanente do cliente junto ao time. |
| **Adaptação ao projeto da Clínica Escola FBr** | Adequado: o processo da clínica já existe, é executado manualmente e é normatizado, o que viabiliza o modelo abrangente do domínio desde o início; as características de produto CP1 a CP12 já se decompõem naturalmente em features; e as inspeções formais oferecem um ponto de controle para os requisitos de sigilo, proteção de dados e acessibilidade. | Adequado quanto à flexibilidade e ao feedback, mas pressupõe um Product Owner dedicado e uma cadência fixa de sprints difícil de sustentar por uma equipe de seis integrantes com agenda acadêmica; a propriedade coletiva do código também dilui a responsabilidade individual sobre os componentes que tratam dados sensíveis de saúde. |

## 4.3 Justificativa

Com base nas características do projeto e nos desafios identificados junto à Faculdade Brasília, o **FDD** é o processo mais adequado ao desenvolvimento da solução da Clínica Escola FBr, pelos motivos apresentados a seguir.

### 1. O domínio é estável e normatizado, o que viabiliza a modelagem inicial exigida pelo FDD

A principal restrição do FDD é pressupor que um modelo de domínio estável possa ser estabelecido no início do projeto. Essa condição, normalmente difícil de satisfazer, é justamente o que caracteriza o contexto da Clínica Escola: a equipe não está concebendo um negócio novo, mas digitalizando um processo que já existe, é executado manualmente e é regido por normas profissionais.

O fluxo de inscrição, triagem por prioridade clínica, fila de espera, distribuição dos casos entre supervisores e estagiários, agendamento, realização de 8 a 10 sessões e emissão do relatório final de evolução foi levantado junto à coordenação do curso de Psicologia, à diretoria financeira e de tecnologia e à secretaria acadêmica, e não está sujeito a redefinição pela equipe de desenvolvimento. O modelo abrangente do domínio, primeiro processo do FDD, encontra portanto uma base sólida desde o início.

### 2. As características do produto já se decompõem em features pequenas e demonstráveis

As doze características definidas na [Solução Proposta](solucao-proposta.md), da inscrição on-line ao controle de assiduidade e à emissão de declarações, correspondem a funcionalidades delimitadas, com valor perceptível para a clínica e para o paciente, compatíveis com a definição de feature adotada pelo FDD: uma pequena função valorizada pelo cliente, implementável em duas semanas ou menos e declarada no formato `<ação> <resultado> <objeto>`.

O escopo do MVP já foi delimitado com o cliente nas características CP1, CP2, CP3, CP4, CP5, CP7, CP11 e CP12, o que permite iniciar a construção da lista de features e o planejamento por feature sem etapa preparatória adicional.

### 3. As inspeções formais respondem à criticidade dos requisitos de sigilo e conformidade

O FDD dedica menos atenção explícita aos requisitos não funcionais do que outros processos, e o produto da Clínica Escola é fortemente condicionado por eles: dados sensíveis de saúde sob a Lei Geral de Proteção de Dados e as resoluções do Conselho Federal de Psicologia, controle de acesso diferenciado por perfil, acessibilidade avaliada pelo MEC e usabilidade para um público em situação de vulnerabilidade social.

Esse risco é mitigado pelo próprio processo. O FDD prevê a inspeção de design e a inspeção de código como marcos obrigatórios anteriores à promoção da feature para a construção. A equipe incorpora os requisitos não funcionais como critérios de aceitação de cada feature e como itens verificáveis do checklist estruturado utilizado nessas inspeções, conforme registrado em [Engenharia de Requisitos](engenharia-requisitos.md) e em [Equipe e Comunicação](gestao/equipe-comunicacao.md). Diferentemente de um framework de gerenciamento, que não prescreve práticas técnicas, o FDD já oferece o ponto de controle em que essa verificação ocorre.

### 4. A visibilidade granular do progresso é compatível com a equipe e com o calendário da disciplina

O sistema de relatórios por marcos do FDD — design concluído, design inspecionado, código concluído, inspeção de código e promoção para construção — fornece uma medida objetiva do andamento de cada feature, em vez de uma medida agregada por ciclo.

Para uma equipe de seis integrantes, com disponibilidade variável ao longo do semestre letivo e entregas avaliadas por unidade de ensino, esse acompanhamento permite identificar precocemente as features em atraso e redistribuir responsabilidades. A estrutura de líderes de feature, combinada à revisão cruzada prevista em [Equipe e Comunicação](gestao/equipe-comunicacao.md), preserva a responsabilidade individual sobre cada funcionalidade sem tornar a validação dependente de uma única pessoa.

### Limitações reconhecidas e medidas de mitigação

A adoção do FDD implica limitações que a equipe reconhece e para as quais adota medidas específicas:

- **Sensibilidade a mudanças no modelo de domínio.** Como o modelo abrangente orienta a identificação das features, alterações estruturais no entendimento do domínio geram retrabalho. A equipe mantém reuniões periódicas de validação com a coordenação da Clínica Escola, com foco explícito na confirmação do modelo de domínio e das regras de negócio, antes do detalhamento das features dependentes.
- **Exigência de familiaridade com modelagem de domínio.** Tratando-se de uma equipe em formação, a modelagem é construída de forma colaborativa e submetida a revisão cruzada entre os integrantes, além de validada com os especialistas do domínio da FBr.
- **Ausência de práticas técnicas e de cerimônias de retrospectiva prescritas.** O FDD não define, sozinho, práticas detalhadas de teste e programação nem cerimônias de revisão de processo. A equipe complementa o processo com as práticas de revisão e inspeção descritas em [Boas práticas no GitHub](gestao/boas-praticas-github.md) e realiza, ao final de cada ciclo de desenvolvimento, a revisão do andamento das features, dos riscos e das dependências prevista em [Cronograma e Entregas](gestao/cronograma.md).
