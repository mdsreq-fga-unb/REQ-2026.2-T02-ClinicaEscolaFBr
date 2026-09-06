# 5. Engenharia de Requisitos

## 5.1 Atividades e Técnicas de ER

### Elicitação e Descoberta

- **Entrevistas:** serão realizadas com os representantes da Clínica Escola, especialmente coordenação, secretaria e demais stakeholders envolvidos, com o objetivo de compreender o processo atual, identificar necessidades, expectativas, regras de negócio, restrições e problemas relacionados à gestão dos atendimentos.

- **Análise de documentos existentes:** serão analisadas fichas, formulários, planilhas e demais documentos utilizados atualmente pela Clínica Escola, buscando identificar informações, regras e requisitos relacionados aos processos que deverão ser apoiados pela solução.

### Análise e Consenso

- **Workshop de Requisitos:** será utilizado para discutir colaborativamente com os stakeholders os requisitos identificados, permitindo esclarecer ambiguidades, preencher lacunas, identificar inconsistências e estabelecer um entendimento compartilhado sobre as necessidades da Clínica Escola.

- **Priorização MoSCoW:** será utilizada para classificar as features conforme sua importância para o produto em _Must Have_, _Should Have_, _Could Have_ e _Won’t Have this time_, apoiando a definição do escopo e das funcionalidades prioritárias para o MVP.

- **Negociação:** será utilizada quando forem identificadas necessidades, prioridades ou restrições conflitantes, buscando estabelecer decisões consensuais entre a equipe e os stakeholders.

### Declaração de Requisitos

- **Features:** os requisitos funcionais serão declarados como pequenas funcionalidades que geram valor para o cliente, seguindo a estrutura adotada pelo FDD: “`<ação> <resultado> <objeto>`”.

- **Critérios de Aceitação:** serão utilizados para complementar as features quando necessário, explicitando as condições que devem ser atendidas para que uma funcionalidade seja considerada adequada.

- **Cenários Given–When–Then:** serão utilizados em requisitos que necessitem de maior detalhamento, descrevendo condições, ações e resultados esperados de forma estruturada.

### Representação de Requisitos

- **Rich Picture:** será utilizado para representar visualmente o contexto da Clínica Escola, incluindo os stakeholders envolvidos, seus relacionamentos, problemas existentes e elementos relevantes do ambiente no qual a solução será inserida.

- **Modelagem de Domínio:** será utilizada para representar os principais conceitos, relações e regras existentes no domínio da Clínica Escola, fornecendo uma visão compartilhada que servirá de base para a identificação e organização das features.

- **Diagramas de Atividades:** serão utilizados quando necessário para representar fluxos relevantes do sistema, como inscrição, triagem, organização da fila de espera, agendamento e confirmação de presença.

### Verificação e Validação de Requisitos

- **Revisão Técnica:** os requisitos, features, critérios de aceitação e representações elaboradas serão revisados pela equipe buscando identificar ambiguidades, inconsistências, incompletudes e dificuldades de verificação.

- **Checklist Estruturado:** será utilizado como apoio às revisões, permitindo verificar sistematicamente aspectos relevantes da qualidade dos requisitos.

- **Validação orientada a cenários:** os requisitos serão apresentados e discutidos com os stakeholders utilizando cenários representativos do funcionamento da Clínica Escola, buscando confirmar se as necessidades e comportamentos esperados foram corretamente compreendidos.

### Organização e Atualização de Requisitos

- **Lista de Features:** os requisitos serão organizados de acordo com a estrutura do FDD, utilizando áreas de funcionalidade, conjuntos de features e features específicas.

- **Rastreabilidade:** será mantida a relação entre necessidades identificadas, características do produto, features, critérios de aceitação e demais artefatos produzidos, permitindo acompanhar a origem e evolução dos requisitos.

- **Relatórios de Progresso por Marcos:** serão utilizados para acompanhar a evolução das features durante o desenvolvimento e manter atualizado o estado dos requisitos e funcionalidades planejadas.

## 5.2 Engenharia de Requisitos e o FDD

| Fases do Processo                    | Atividades ER             | Prática                                                                              | Técnica                                                 | Resultado Esperado                                                                                   |
| ------------------------------------ | ------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Desenvolver um Modelo Abrangente** | Elicitação e Descoberta   | Compreender o domínio e o funcionamento atual da Clínica Escola                      | Entrevistas e Análise de Documentos Existentes          | Necessidades, problemas, regras de negócio, restrições e stakeholders identificados                  |
| **Desenvolver um Modelo Abrangente** | Representação             | Representar o contexto e os principais conceitos do domínio                          | Rich Picture e Modelagem de Domínio                     | Modelo abrangente e compartilhado do domínio da Clínica Escola                                       |
| **Desenvolver um Modelo Abrangente** | Análise e Consenso        | Alinhar o entendimento sobre o domínio e as necessidades identificadas               | Workshop de Requisitos                                  | Entendimento comum entre equipe e stakeholders sobre o problema e o domínio                          |
| **Construir uma Lista de Features**  | Declaração                | Transformar as necessidades identificadas em funcionalidades de valor para o cliente | Features no formato “`<ação> <resultado> <objeto>`”     | Features claramente declaradas e orientadas ao valor para a Clínica Escola                           |
| **Construir uma Lista de Features**  | Organização e Atualização | Estruturar as funcionalidades identificadas                                          | Lista de Features                                       | Requisitos organizados em áreas de funcionalidade, conjuntos de features e features                  |
| **Construir uma Lista de Features**  | Verificação e Validação   | Revisar a lista de funcionalidades com os stakeholders                               | Revisão Técnica e Validação orientada a cenários        | Features coerentes com as necessidades e objetivos identificados                                     |
| **Planejar por Feature**             | Análise e Consenso        | Definir a prioridade e a sequência de desenvolvimento das features                   | Priorização MoSCoW e Negociação                         | Features priorizadas considerando valor, viabilidade e dependências                                  |
| **Planejar por Feature**             | Organização e Atualização | Organizar a sequência planejada das funcionalidades                                  | Lista de Features                                       | Planejamento das features atualizado e organizado conforme as prioridades estabelecidas              |
| **Projetar por Feature**             | Representação             | Detalhar o comportamento e os fluxos associados às features selecionadas             | Diagramas de Atividades                                 | Fluxos, decisões, regras e responsabilidades das features representados de maneira compreensível     |
| **Projetar por Feature**             | Declaração                | Detalhar as condições de funcionamento das features                                  | Critérios de Aceitação e Cenários Given–When–Then       | Features suficientemente detalhadas e verificáveis antes da construção                               |
| **Projetar por Feature**             | Verificação e Validação   | Avaliar a qualidade dos requisitos detalhados antes da implementação                 | Revisão Técnica e Checklist Estruturado                 | Requisitos claros, consistentes, completos e verificáveis                                            |
| **Construir por Feature**            | Verificação e Validação   | Verificar e validar as funcionalidades desenvolvidas                                 | Critérios de Aceitação e Validação orientada a cenários | Confirmação de que as features implementadas atendem aos comportamentos e necessidades estabelecidos |
| **Construir por Feature**            | Organização e Atualização | Acompanhar e registrar a evolução das funcionalidades                                | Relatórios de Progresso por Marcos e Rastreabilidade    | Estado das features e dos requisitos atualizado e rastreável ao longo do desenvolvimento             |
