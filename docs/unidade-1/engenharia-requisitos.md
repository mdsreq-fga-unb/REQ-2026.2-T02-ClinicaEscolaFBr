# 5. Engenharia de Requisitos

O processo de ER separa técnicas, práticas, ferramentas e resultados. Entrevistas, análise documental, priorização, negociação, modelagem, revisão e validação orientada a cenários são técnicas. A lista de features, a rastreabilidade, os relatórios de progresso e os critérios de aceitação são artefatos ou estruturas produzidas/mantidas pelo processo; o GitHub Projects é a ferramenta de apoio.

## 5.1 Atividades e Técnicas de ER

### Elicitação e Descoberta

- **Entrevistas:** serão realizadas com coordenação e secretaria, estagiários, supervisores, equipe de TI, pacientes ou seus representantes e responsáveis por crianças e adolescentes, com o objetivo de compreender o processo atual, identificar necessidades, expectativas, regras de negócio, restrições e problemas relacionados à gestão dos atendimentos.

- **Análise de documentos existentes:** serão analisadas fichas, formulários, planilhas e demais documentos utilizados atualmente pela Clínica Escola, buscando identificar informações, regras e requisitos relacionados aos processos que deverão ser apoiados pela solução.

### Análise e Consenso

- **Priorização MoSCoW:** será utilizada para classificar as features conforme sua importância para o produto em _Must Have_, _Should Have_, _Could Have_ e _Won’t Have this time_, apoiando a definição do escopo e das funcionalidades prioritárias para o MVP.

- **Negociação:** será utilizada quando forem identificadas necessidades, prioridades ou restrições conflitantes, buscando estabelecer decisões consensuais entre a equipe e os stakeholders.

### Declaração de Requisitos

- **Features:** os requisitos funcionais serão declarados como pequenas funcionalidades que geram valor para o cliente, seguindo a estrutura adotada pelo FDD: “`<ação> <resultado> <objeto>`”.

- **Critérios de Aceitação (resultado da declaração):** serão utilizados para complementar as features quando necessário, explicitando as condições que devem ser atendidas para que uma funcionalidade seja considerada adequada.

- **Cenários Given–When–Then:** serão utilizados em requisitos que necessitem de maior detalhamento, descrevendo condições, ações e resultados esperados de forma estruturada.

### Representação de Requisitos

- **Rich Picture:** será utilizado para representar visualmente o contexto da Clínica Escola, incluindo os stakeholders envolvidos, seus relacionamentos, problemas existentes e elementos relevantes do ambiente no qual a solução será inserida.

- **Modelagem de Domínio:** será utilizada para representar os principais conceitos, relações e regras existentes no domínio da Clínica Escola, fornecendo uma visão compartilhada que servirá de base para a identificação e organização das features.

- **Diagramas de Atividades:** serão utilizados quando necessário para representar fluxos relevantes do sistema, como inscrição, triagem, organização da fila de espera, agendamento e confirmação de presença.

### Verificação e Validação de Requisitos

- **Revisão Técnica:** os requisitos, features, critérios de aceitação e representações elaboradas serão revisados pela equipe buscando identificar ambiguidades, inconsistências, incompletudes e dificuldades de verificação.

- **Checklist Estruturado:** será utilizado como apoio às revisões, permitindo verificar sistematicamente aspectos relevantes da qualidade dos requisitos.

- **Validação orientada a cenários:** os requisitos serão apresentados e discutidos com grupos representativos. A interface pública será validada também com pacientes ou representantes e responsáveis por crianças e adolescentes, com linguagem simples, uso em celular e, quando necessário, apoio da secretaria; representantes institucionais não serão a única fonte de validação.

### Participação dos stakeholders

| Stakeholder | Participação no processo de ER | Evidência produzida |
| --- | --- | --- |
| Coordenação e secretaria | Entrevistas, regras operacionais, priorização e aceite | Atas e cenários validados |
| Estagiários | Entrevistas e testes de triagem, fila, distribuição, agenda e registro | Feedback e pendências |
| Supervisores | Entrevistas e validação de casos, permissões e acompanhamento | Regras e aceite por perfil |
| Pacientes ou representantes | Testes de compreensão da interface pública, inscrição e fila | Roteiro, observações e ajustes |
| Responsáveis por crianças e adolescentes | Validação de consentimento, inscrição e comunicação | Cenários e aceite |
| Equipe de TI | Viabilidade, integração, segurança, acessibilidade e operação | Restrições, checklist e parecer |

As sessões com pacientes e responsáveis devem proteger dados sensíveis, permitir participação assistida e registrar apenas o feedback necessário. Quando a participação direta não for possível, deve-se registrar a justificativa e usar representantes adequadamente caracterizados.

### Organização e Atualização de Requisitos

- **Lista de Features (artefato/resultado):** os requisitos serão organizados de acordo com a estrutura do FDD, utilizando áreas de funcionalidade, conjuntos de features e features específicas.

- **Rastreabilidade (prática e estrutura de relacionamento):** será mantida a relação entre necessidades identificadas, características do produto, features, critérios de aceitação e demais artefatos produzidos, permitindo acompanhar a origem e evolução dos requisitos.

- **Relatórios de Progresso por Marcos (resultado/artefato de acompanhamento):** serão produzidos para acompanhar a evolução das features durante o desenvolvimento e manter atualizado o estado dos requisitos e funcionalidades planejadas.

- **GitHub Projects (ferramenta):** será utilizado para registrar status, responsáveis, prioridades, dependências, links de rastreabilidade e evidências; não é uma técnica de ER.

## 5.2 Requisitos não funcionais no processo FDD

No processo adotado, os RNFs são declarados junto à característica de produto e relacionados às features FDD que eles afetam. Essa aplicação já está documentada nas CP1, CP2, CP3, CP5, CP10, CP11, CP12 e CP14.

Para cada CP, o fluxo de tratamento dos RNFs é:

1. **Identificação e declaração:** registrar o RNF com identificador, categoria, descrição, fonte ou regra relacionada e situação de validação. As categorias utilizadas na CP10 (declaração de comparecimento) incluem privacidade, segurança, auditoria, desempenho, usabilidade, portabilidade, acessibilidade e confiabilidade.
2. **Definição de meta:** estabelecer uma métrica ou condição verificável sempre que possível, como zero acessos indevidos, 100% das emissões auditadas, limite de tempo de resposta ou requisitos de acessibilidade do documento.
3. **Relacionamento com as features:** informar explicitamente as features afetadas pelo RNF. Na CP10 (declaração de comparecimento), essa relação é feita entre RNF33–RNF41 e RF35–RF39, considerando também as regras de negócio e os critérios de aceitação das features.
4. **Definição da verificação:** registrar como o RNF será avaliado, por exemplo, por teste de autorização, teste de integração, teste de desempenho, inspeção do documento, teste de usabilidade, leitor de tela ou checklist de acessibilidade.
5. **Validação e evidência:** submeter as declarações, metas e decisões pendentes à revisão interna e à validação com a FBr. Depois da implementação, registrar o resultado dos testes ou inspeções e a evidência correspondente. Um RNF somente será considerado conforme quando sua meta estiver definida, sua forma de verificação for executada e o resultado estiver registrado.

Cada RNF é registrado em formato descritivo, associado à feature correspondente: um parágrafo com a descrição do requisito e a forma de verificação, seguido — sem linha em branco entre eles — por `Classificação: <categoria> (URPS+).` e por `Rastreabilidade: Feature "<nome>" → <CP> — <nome da CP>; <relações adicionais quando houver>.` Quando o requisito estiver em elaboração, isso deve ser indicado no texto descritivo como "a validar", "proposta" ou "meta a definir com a FBr", sem tratar a declaração como conformidade já comprovada.

Os critérios de aceitação permanecem registrados no arquivo de requisitos funcionais e devem ser usados em conjunto com os RNFs aplicáveis. A rastreabilidade liga a CP à feature, ao RNF, à regra de negócio, ao critério de aceitação e à evidência de verificação. Serão utilizados os seguintes checklists: (a) checklist de qualidade dos requisitos, para clareza, completude, consistência e verificabilidade; (b) checklist de segurança e privacidade, para perfis, minimização de dados, sigilo e auditoria; (c) checklist de acessibilidade e usabilidade, para teclado, leitor de tela, contraste, linguagem simples e uso em celular; e (d) checklist de verificação técnica, para desempenho, integridade, portabilidade e tratamento de erros. Na versão atual, esses checklists ainda serão aplicados na revisão interna; a documentação já registra explicitamente a verificação de acessibilidade e os métodos de teste dos demais RNFs.

Na CP10 (declaração de comparecimento), permanecem pendentes de validação com a FBr, entre outros pontos, os campos obrigatórios da declaração, o responsável pela emissão, a declaração consolidada, a autenticação por terceiros e algumas metas de acessibilidade, desempenho e usabilidade. Essas pendências devem permanecer visíveis no requisito e ser resolvidas antes do aceite final.
## 5.3 Engenharia de Requisitos e o FDD

| Fases do Processo                    | Atividades ER             | Prática                                                                              | Técnica                                                 | Resultado Esperado                                                                                   |
| ------------------------------------ | ------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Desenvolver um Modelo Abrangente** | Elicitação e Descoberta   | Compreender o domínio e o funcionamento atual da Clínica Escola                      | Entrevistas e Análise de Documentos Existentes          | Necessidades, problemas, regras de negócio, restrições e stakeholders identificados                  |
| **Desenvolver um Modelo Abrangente** | Representação             | Representar o contexto e os principais conceitos do domínio                          | Rich Picture e Modelagem de Domínio                     | Modelo abrangente e compartilhado do domínio da Clínica Escola                                       |
| **Construir uma Lista de Features**  | Declaração                | Transformar as necessidades identificadas em funcionalidades de valor para o cliente | Features no formato “`<ação> <resultado> <objeto>`”     | Features claramente declaradas e orientadas ao valor para a Clínica Escola                           |
| **Construir uma Lista de Features**  | Organização e Atualização | Estruturar as funcionalidades identificadas                                          | Organização FDD e revisão da decomposição                | Lista de Features (artefato) organizada em áreas de funcionalidade, conjuntos e features             |
| **Construir uma Lista de Features**  | Verificação e Validação   | Revisar a lista de funcionalidades com os stakeholders                               | Revisão Técnica e Validação orientada a cenários        | Features coerentes com as necessidades e objetivos identificados                                     |
| **Planejar por Feature**             | Análise e Consenso        | Definir a prioridade e a sequência de desenvolvimento das features                   | Priorização MoSCoW e Negociação                         | Features priorizadas considerando valor, viabilidade e dependências                                  |
| **Planejar por Feature**             | Organização e Atualização | Organizar a sequência planejada das funcionalidades                                  | Priorização e análise de dependências                     | Lista de Features atualizada conforme prioridades e dependências                                    |
| **Projetar por Feature**             | Representação             | Detalhar o comportamento e os fluxos associados às features selecionadas             | Diagramas de Atividades                                 | Fluxos, decisões, regras e responsabilidades das features representados de maneira compreensível     |
| **Projetar por Feature**             | Declaração                | Detalhar as condições de funcionamento das features                                  | Especificação de cenários Given–When–Then                 | Critérios de aceitação (resultado da declaração) e cenários verificáveis antes da construção          |
| **Projetar por Feature**             | Verificação e Validação   | Avaliar a qualidade dos requisitos detalhados antes da implementação                 | Revisão Técnica e Checklist Estruturado                 | Requisitos claros, consistentes, completos e verificáveis                                            |
| **Construir por Feature**            | Verificação e Validação   | Verificar e validar as funcionalidades desenvolvidas                                 | Validação orientada a cenários e testes                   | Confirmação, por meio dos critérios de aceitação, de que as features atendem aos comportamentos e necessidades |
| **Construir por Feature**            | Organização e Atualização | Acompanhar e registrar a evolução das funcionalidades                                | Revisão por marcos e atualização do relacionamento de rastreabilidade | Relatório de progresso (artefato) e estado das features atualizado e rastreável                    |
