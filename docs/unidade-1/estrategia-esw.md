# 4. Estratégias de Engenharia de Software

A partir das informações apresentadas em [Cenário Atual](cenario-atual.md) e em [Solução Proposta](solucao-proposta.md), foram tomadas as decisões relativas às estratégias de engenharia de software que orientam a construção do produto da Clínica Escola FBr.

## 4.1 Estratégia Priorizada

- **Abordagem de Desenvolvimento de Software:** Ágil
- **Ciclo de vida:** Ágil
- **Processo de Engenharia de Software:** Feature-Driven Development (FDD), **adaptado** ao porte da equipe e ao calendário da disciplina (ver [4.4](#44-fdd-adaptado-ao-projeto))

O ciclo de vida ágil incorpora as características dos ciclos iterativo e incremental — a repetição de atividades em ciclos, com refinamento a partir do feedback, e a entrega progressiva de partes funcionais do produto — e acrescenta a ênfase na comunicação e na colaboração constantes com os stakeholders, além do feedback antecipado que fornece visibilidade e controle do produto ao cliente. Todo ciclo de vida ágil é iterativo e incremental, mas nem todo ciclo iterativo e incremental adota os valores e práticas do ágil. A escolha é, portanto, coerente com a abordagem priorizada e com o FDD, processo que se organiza em torno de funcionalidades pequenas, demonstráveis e valorizadas pelo cliente (PALMER; FELSING, 2002).

O detalhamento do processo adotado, seus cinco subprocessos e a decomposição do MVP em features estão registrados no estudo [Feature-Driven Development (FDD)](estudos/fdd.md).

## 4.2 Quadro Comparativo

O quadro a seguir compara o **Feature-Driven Development (FDD)** e o **Extreme Programming (XP)**, dois processos de engenharia de software compatíveis com a abordagem ágil priorizada, considerando os aspectos relevantes para o desenvolvimento da solução da Clínica Escola FBr. As características do FDD seguem Palmer e Felsing (2002); as do XP seguem Beck (1999).

<details class="revision-note" markdown>
<summary>Nota de revisão: por que o quadro compara FDD e XP</summary>

A versão anterior deste quadro comparava o FDD com o ScrumXP. A comparação foi substituída porque o Scrum é um framework de gerenciamento do trabalho, e não um processo de engenharia de software: ele não prescreve práticas de especificação, projeto, construção ou verificação (SCHWABER; SUTHERLAND, 2020). O XP, ao contrário, define práticas técnicas de engenharia e permite uma comparação no mesmo nível do FDD.

</details>

| Características | FDD | XP |
| --- | --- | --- |
| **Natureza do processo** | Processo de engenharia de software orientado a features, com a modelagem do domínio na origem do processo. | Processo de engenharia de software orientado a práticas técnicas e de colaboração, com releases pequenos e iterações de uma a três semanas. |
| **Unidade de trabalho** | Feature: pequena função valorizada pelo cliente, declarada no formato `<ação> <resultado> <objeto>` e implementável em duas semanas ou menos. | História de usuário, escrita com o cliente, estimada pelos desenvolvedores e selecionada para a iteração conforme o valor. |
| **Ponto de partida** | Modelo abrangente do domínio, construído em conjunto por especialistas do domínio e desenvolvedores, que fundamenta a identificação das features. | Jogo do planejamento com as histórias iniciais e uma metáfora do sistema; o projeto evolui de forma incremental, por design simples e refatoração, sem um modelo de domínio prévio obrigatório. |
| **Estrutura do processo** | Cinco processos: desenvolver um modelo abrangente, construir uma lista de features, planejar por feature, projetar por feature e construir por feature. | Ciclos de release e de iteração, cada um com seu planejamento; dentro da iteração, as práticas técnicas são aplicadas de forma contínua. |
| **Tratamento de mudanças** | Mudanças no detalhamento e na prioridade das features são absorvidas no planejamento por feature; mudanças estruturais no modelo exigem revisar o modelo e a lista de features. | Mudanças entram no planejamento da próxima iteração, preservando, em regra, a iteração em andamento; o custo da mudança é contido por testes automatizados e refatoração. |
| **Colaboração com o cliente** | Especialistas do domínio participam da modelagem e validam as features concluídas por demonstração. | Cliente integrado à equipe, disponível para esclarecer histórias e responsável por definir os testes de aceitação. |
| **Tratamento de requisitos não funcionais** | Não é prescrito pelo processo; precisa ser incorporado por meio de critérios de aceitação por feature e das inspeções de design e de código. | Não é prescrito pelo processo; pode ser incorporado em testes de aceitação, testes automatizados e padrões de codificação. |
| **Práticas técnicas prescritas** | Modelagem de objetos do domínio, desenvolvimento por feature, propriedade individual de classes, equipes de feature, inspeções, builds regulares e gerência de configuração. | Jogo do planejamento, releases pequenos, metáfora, design simples, testes escritos antes do código, refatoração, programação em pares, propriedade coletiva do código, integração contínua, semana de 40 horas, cliente presente e padrões de codificação. |
| **Mecanismos de qualidade** | Inspeções formais em dois pontos definidos, após o projeto e após a construção, como condição para a promoção da feature. | Verificação contínua: testes automatizados executados a cada integração e revisão permanente do código pela programação em pares. |
| **Visibilidade do progresso** | Por feature: seis marcos (*domain walkthrough*, design, inspeção de design, código, inspeção de código e promoção para o build), com percentual de conclusão atribuído a cada marco. | Por iteração: histórias concluídas e aceitas pelos testes de aceitação, acompanhadas pelo *tracker* em relação às estimativas. |
| **Documentação** | Concisa e orientada à prática, com modelo do domínio e projeto detalhado de cada feature antes da construção. | Mínima; o código, os testes e as histórias funcionam como principal documentação. |
| **Papéis e responsabilidade** | Gerente de projeto, arquiteto-chefe, gerente de desenvolvimento, programadores-chefe, proprietários de classe e especialistas do domínio; a responsabilidade é individual por classe e por feature. | Programador, cliente, testador, *tracker*, *coach*, consultor e gerente; a propriedade do código é coletiva, e a responsabilização é sustentada pelos testes, pela programação em pares e pelos padrões de codificação. |
| **Perfil de equipe adequado** | Pressupõe seis papéis principais e a modelagem do domínio conduzida por um arquiteto-chefe; em equipes pequenas, exige acumular ou adaptar papéis. | Equipes de dois a dez programadores, com o cliente disponível com frequência e com disciplina técnica para manter testes automatizados e programação em pares. |
| **Adaptação ao projeto da Clínica Escola FBr** | Viável com adaptações: o processo operacional da clínica serve de base para um modelo de domínio inicial, que segue sendo refinado com a FBr; as características de produto se decompõem em features; e as inspeções oferecem um ponto explícito para verificar requisitos de sigilo, proteção de dados e acessibilidade. | Viável com adaptações: o cliente participa por reuniões periódicas, e não por presença contínua; a programação em pares exigiria sessões síncronas frequentes entre integrantes com horários distintos; e a equipe ainda não domina a escrita de testes antes do código, prática da qual dependem a qualidade e o controle de mudanças do XP. |

## 4.3 Justificativa

Os dois processos são viáveis para o projeto, e ambos exigiriam adaptações. A equipe adota o **FDD adaptado** pelos motivos apresentados a seguir.

### 1. O processo operacional da clínica permite um modelo de domínio inicial, mas o domínio ainda depende de elicitação

O FDD parte de um modelo abrangente do domínio. No contexto da Clínica Escola, há uma base concreta para esse modelo inicial: a equipe não está concebendo um negócio novo, mas digitalizando um fluxo que já existe e é executado manualmente — inscrição, triagem por prioridade clínica, fila de espera, distribuição dos casos entre supervisores e estagiários, agendamento, realização de 8 a 10 sessões e emissão do relatório final de evolução —, levantado junto à coordenação do curso de Psicologia, à diretoria financeira e de tecnologia e à secretaria acadêmica.

Um processo operacional estabelecido, porém, **não significa um domínio completamente compreendido nem imutável**. Vários pontos ainda dependiam ou dependem de elicitação e validação com a FBr:

| Ponto de incerteza | Por que ainda é incerto | Como está sendo tratado |
| --- | --- | --- |
| Regra de atendimento on-line | A base regulatória citada inicialmente foi revogada, e a modalidade depende da norma vigente, do CRP-DF e do regulamento de estágio da FBr. | A clínica informou, em 26/08/2026, que as sessões são presenciais; a confirmação formal da base normativa segue pendente ([Cenário Atual, 1.4](cenario-atual.md#14-identificacao-da-oportunidade-ou-problema)). O escopo cobre apenas as etapas administrativas. |
| Critérios da triagem | Os critérios clínicos de prioridade são aplicados pelos supervisores e não estão formalizados em regras automatizáveis. | O sistema não infere prioridade: organiza as informações ([RF4](../unidade-2/requisitos/funcionais.md#rf4)), sinaliza pontos de atenção ([RF5](../unidade-2/requisitos/funcionais.md#rf5)) e registra a classificação feita por supervisor ou coordenação ([RF6](../unidade-2/requisitos/funcionais.md#rf6)). |
| Acesso ao prontuário | Os perfis que podem consultar cada parte do prontuário dependem das regras do estágio supervisionado e do sigilo profissional. | Conteúdo clínico restrito ao estagiário responsável e ao seu supervisor ([RF55](../unidade-2/requisitos/funcionais.md#rf55)) e registro de acessos ([RF56](../unidade-2/requisitos/funcionais.md#rf56)), regra a ser confirmada com a coordenação. |
| Continuidade entre semestres | Quais casos continuam e como passam para um novo estagiário depende da decisão do supervisor e do calendário acadêmico. | Declarados na CP13 ([RF58](../unidade-2/requisitos/funcionais.md#rf58) a [RF60](../unidade-2/requisitos/funcionais.md#rf60)), com validação junto à coordenação. |
| Requisitos do CRP e do MEC | As exigências de registro documental, guarda e indicadores vêm de normas externas à clínica. | Guarda mínima de 5 anos pela Resolução CFP nº 1/2009 ([RNF52](../unidade-2/requisitos/nao-funcionais.md)), indicadores e relatório institucional ([RF48](../unidade-2/requisitos/funcionais.md#rf48) e [RF49](../unidade-2/requisitos/funcionais.md#rf49)) e acessibilidade ([CP14](../unidade-2/requisitos/funcionais.md)). |
| Participação dos responsáveis por crianças e adolescentes | Inscrição, consentimento e acesso às informações de menores envolvem o responsável legal e documentos assinados presencialmente. | Verificação de identidade do paciente ou responsável ([RF52](../unidade-2/requisitos/funcionais.md#rf52)), consentimento e revogação ([RF57](../unidade-2/requisitos/funcionais.md#rf57) e [RF65](../unidade-2/requisitos/funcionais.md#rf65)) e exigência da autorização do responsável na emissão de declarações ([RF45](../unidade-2/requisitos/funcionais.md#rf45)). |
| Transferência entre estagiários | Motivos, aprovação e registro da troca de responsável não estavam formalizados. | Transferência com limites por perfil, preservação do histórico do paciente e revogação do acesso do responsável anterior ([RF25](../unidade-2/requisitos/funcionais.md#rf25)), e consulta ao histórico de responsáveis ([RF26](../unidade-2/requisitos/funcionais.md#rf26)). |

Os pontos ainda abertos estão listados em [Pendências de validação com a FBr](../unidade-2/requisitos/analise-feedback.md#pendencias-de-validacao-com-a-fbr). Por isso, a equipe trata o modelo de domínio como uma **hipótese validada progressivamente**, e não como um ponto de partida fechado. Essa revisão já ocorreu na prática: a numeração das características foi refeita em 22/09/2026, os requisitos foram reescritos em 23/09/2026 com as respostas da Clínica Escola aos pontos em aberto, e a verificação cruzada de 27/09/2026 alterou regras de agendamento, assiduidade e consentimento ([Análise do Feedback](../unidade-2/requisitos/analise-feedback.md)). Em cada caso, a mudança entrou pela revisão do modelo e da lista de features, como o FDD prevê.

### 2. As características do produto já se decompõem em features pequenas e demonstráveis

As quatorze características definidas na [Solução Proposta](solucao-proposta.md), da inscrição on-line ao controle de assiduidade e à emissão de declarações, correspondem a funcionalidades delimitadas, com valor perceptível para a clínica e para o paciente, compatíveis com a definição de feature adotada pelo FDD: uma pequena função valorizada pelo cliente, implementável em duas semanas ou menos e declarada no formato `<ação> <resultado> <objeto>`.

O escopo do MVP inicial foi delimitado com o cliente nas características CP1, CP2, CP3, CP4, CP5, CP9, CP12 e CP14 (numeração final da [Solução Proposta](solucao-proposta.md)), o que permitiu iniciar a construção da lista de features e o planejamento por feature sem etapa preparatória adicional. O recorte técnico final, cruzando valor de negócio e esforço requisito a requisito, está em [10.2.3 do Backlog de Produto](../unidade-2/requisitos/backlog.md#1023-definicao-do-mvp) e amplia esse ponto de partida para 51 dos 65 RFs declarados, incorporando também partes de CP6, CP7, CP8 e CP10.

### 3. As inspeções oferecem um ponto de controle explícito para sigilo e conformidade

O produto da Clínica Escola é fortemente condicionado por requisitos não funcionais: dados sensíveis de saúde sob a Lei Geral de Proteção de Dados e as resoluções do Conselho Federal de Psicologia, controle de acesso diferenciado por perfil, acessibilidade avaliada pelo MEC e usabilidade para um público em situação de vulnerabilidade social.

Nenhum processo, por si só, garante a segurança e a conformidade do produto. Elas dependem de **responsabilidades** definidas, de uma **arquitetura** que isole os dados sensíveis, de **controles** como autenticação, autorização, criptografia e auditoria (CP12), de **testes** que verifiquem as regras críticas e de **governança** sobre o tratamento dos dados, como o consentimento e sua revogação. O que o processo oferece é o momento e a forma em que essas exigências são verificadas.

Nesse ponto, o FDD contribui com a inspeção de design e a inspeção de código como marcos obrigatórios anteriores à promoção da feature. A equipe incorpora os requisitos não funcionais como critérios de aceitação de cada feature e como itens verificáveis do checklist estruturado utilizado nessas inspeções, conforme registrado em [Engenharia de Requisitos](engenharia-requisitos.md) e em [Equipe e Comunicação](gestao/equipe-comunicacao.md), e complementa as inspeções com testes das regras críticas, previstos na Definition of Done do [estudo de FDD](estudos/fdd.md#54-definition-of-ready-e-definition-of-done). O XP também permitiria verificar esses requisitos, por meio de testes de aceitação e da revisão contínua em pares; a diferença é que o FDD produz um registro formal de cada inspeção, que serve de evidência para a disciplina e para a conformidade exigida pela FBr.

### 4. A visibilidade granular do progresso é compatível com a equipe e com o calendário da disciplina

O sistema de relatórios por marcos do FDD fornece uma medida objetiva do andamento de cada feature, em vez de uma medida agregada por iteração.

Para uma equipe de seis integrantes, com disponibilidade variável ao longo do semestre letivo e entregas avaliadas por unidade de ensino, esse acompanhamento permite identificar precocemente as features em atraso e redistribuir responsabilidades. A estrutura de líderes de feature, combinada à revisão cruzada prevista em [Equipe e Comunicação](gestao/equipe-comunicacao.md), preserva a responsabilidade individual sobre cada funcionalidade sem tornar a validação dependente de uma única pessoa.

## 4.4 FDD adaptado ao projeto

Na forma descrita por Palmer e Felsing (2002), o FDD pressupõe papéis especializados — seis papéis principais, além de papéis de apoio — e a modelagem do domínio conduzida por um arquiteto-chefe com experiência nessa atividade. Este projeto tem **seis estudantes em formação e prazo de um semestre letivo**. O processo adotado é, portanto, uma **adaptação do FDD**, e não a sua aplicação integral. As adaptações são as seguintes:

| Elemento do FDD original | Como é aplicado no projeto | Motivo da adaptação |
| --- | --- | --- |
| Papéis: gerente de projeto, arquiteto-chefe, gerente de desenvolvimento, programadores-chefe, proprietários de classe e especialistas do domínio | A gestão do projeto, a arquitetura e os líderes de feature correspondem a papéis do FDD. **Líder de Requisitos, Analista de Stakeholders, Analista de Viabilidade e Analista de Negócio** foram criados pela equipe e não existem no processo original ([Equipe e Comunicação](gestao/equipe-comunicacao.md)). | O FDD não prescreve as atividades de elicitação, análise de stakeholders e intervenção social exigidas pela disciplina; esses papéis cobrem essas atividades. |
| Propriedade individual de classes | A responsabilidade é atribuída por feature e compartilhada entre o líder da feature e um revisor de outro integrante. | Com seis integrantes, a propriedade individual concentraria conhecimento e criaria dependência de uma única pessoa. |
| Modelo abrangente construído em sessões guiadas pelo arquiteto-chefe | O modelo é construído a partir das reuniões com a FBr, revisado por pares e refinado a cada rodada de validação. | A equipe não tem experiência prévia em modelagem de domínio, e o domínio ainda está em elicitação ([4.3, item 1](#1-o-processo-operacional-da-clinica-permite-um-modelo-de-dominio-inicial-mas-o-dominio-ainda-depende-de-elicitacao)). |
| Inspeções formais conduzidas pela equipe de feature | Inspeção de design por feature antes da construção e revisão de pull request por outro integrante, com checklist estruturado ([Boas práticas no GitHub](gestao/boas-praticas-github.md)). | O tamanho da equipe não comporta equipes de inspeção separadas. |
| Planejamento por feature, com datas por conjunto de features | O planejamento segue os ciclos e as entregas por unidade da disciplina ([Cronograma e Entregas](gestao/cronograma.md)). | As entregas são avaliadas no calendário acadêmico. |
| Práticas não prescritas pelo FDD | A equipe acrescenta a revisão do andamento ao final de cada ciclo, as lições aprendidas por unidade e a Definition of Ready e a Definition of Done. | O FDD não define cerimônias de retrospectiva nem critérios de entrada e saída das features. |

### Limitações reconhecidas e medidas de mitigação

A adoção do FDD adaptado implica limitações que a equipe reconhece e para as quais adota medidas específicas:

- **Sensibilidade a mudanças no modelo de domínio.** Como o modelo abrangente orienta a identificação das features, alterações estruturais no entendimento do domínio geram retrabalho. A equipe mantém reuniões periódicas de validação com a coordenação da Clínica Escola, com foco explícito na confirmação do modelo de domínio e das regras de negócio, antes do detalhamento das features dependentes.
- **Exigência de familiaridade com modelagem de domínio.** Tratando-se de uma equipe em formação, a modelagem é construída de forma colaborativa e submetida a revisão cruzada entre os integrantes, além de validada com os especialistas do domínio da FBr.
- **Distância em relação ao processo descrito na literatura.** Quanto mais adaptações, menor o apoio da literatura às decisões da equipe. As adaptações estão registradas nesta seção para que possam ser revistas ao final de cada unidade.
- **Ausência de práticas técnicas e de cerimônias de retrospectiva prescritas.** O FDD não define, sozinho, práticas detalhadas de teste e programação nem cerimônias de revisão de processo. A equipe complementa o processo com as práticas de revisão e inspeção descritas em [Boas práticas no GitHub](gestao/boas-praticas-github.md) e realiza, ao final de cada ciclo de desenvolvimento, a revisão do andamento das features, dos riscos e das dependências prevista em [Cronograma e Entregas](gestao/cronograma.md).

## Referências

- BECK, Kent. _Extreme Programming Explained: Embrace Change_. Reading: Addison-Wesley, 1999.
- MARSICANO, George. _Requisitos de Software – Comunicação é tudo!_ Versão 1.1, draft, 2026. Material didático da disciplina Requisitos de Software (FGA0313) – FCTE/UnB.
- PALMER, Stephen R.; FELSING, John M. _A Practical Guide to Feature-Driven Development_. Upper Saddle River: Prentice Hall, 2002.
- SCHWABER, Ken; SUTHERLAND, Jeff. _The Scrum Guide_. 2020. Disponível em: [scrumguides.org](https://scrumguides.org/scrum-guide.html).
