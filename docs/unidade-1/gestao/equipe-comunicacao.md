# 7. INTERAÇÃO ENTRE EQUIPE E CLIENTE

A interação do projeto será baseada em colaboração contínua entre a equipe de desenvolvimento e os especialistas de domínio da Faculdade Brasília (FBr). O processo FDD organizará o trabalho em features pequenas, rastreáveis e demonstráveis, permitindo validar progressivamente o modelo de domínio, o design e o comportamento do produto.

### 7.1 Composição da Equipe

| Integrante        | Atribuições operacionais                                                                                                  | Organização no FDD                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Gabriel Barbaceli | Gerenciar o projeto, acompanhar o cronograma, organizar a comunicação, registrar decisões e acompanhar riscos e entregas. | Gestão do projeto e coordenação dos Líderes de Feature         |
| Joaquim José      | Definir a estratégia de Engenharia de Software e orientar a aplicação do processo FDD.                                    | Líder de Arquitetura e responsável pela governança do processo |
| Luís Henrique     | Elicitar, analisar, declarar, representar, verificar e validar requisitos, além de mapear as atividades da ER no FDD.     | Líder de Requisitos e apoio aos Líderes de Feature             |
| Maria Clara       | Analisar os stakeholders, suas necessidades e influência, e mapear a stack tecnológica da solução.                        | Analista de Stakeholders e apoio à Arquitetura                 |
| Nicolas           | Avaliar a viabilidade técnica, contribuir para a definição das features e manter a delimitação do MVP.                    | Analista de Viabilidade e Líder de Feature                     |
| Jônatas           | Analisar o negócio, consolidar os benefícios esperados e definir a intervenção social do produto.                         | Analista de Negócio e Líder de Feature                         |

No contexto do FDD, os Líderes de Feature conduzirão o detalhamento, o acompanhamento e a demonstração das features sob sua responsabilidade. A Arquitetura definirá as diretrizes técnicas; Requisitos manterá a rastreabilidade entre necessidades, features e critérios de aceitação; e a Gestão coordenará dependências, prazos, comunicação e decisões. A responsabilidade por cada feature será compartilhada com revisão cruzada da equipe, evitando que a validação dependa de uma única pessoa.

### 7.2 Comunicação

#### Comunicação interna

- O WhatsApp será utilizado para alinhamentos assíncronos diários, avisos rápidos e esclarecimentos operacionais.
- Reuniões síncronas semanais, realizadas por Google Meet, serão usadas para acompanhar os marcos de desenvolvimento por feature, revisar impedimentos e distribuir as próximas atividades.
- O GitHub Projects será utilizado para o rastreamento granular do status das features, responsáveis, prioridades, dependências e critérios de conclusão.
- As decisões relevantes tomadas em reuniões serão registradas no repositório, mantendo o histórico consultável por toda a equipe.

#### Comunicação com o cliente

- Serão realizadas reuniões periódicas por videoconferência com Robson Luís de Araújo, coordenador da Clínica Escola, e com representantes da equipe de TI e da Secretaria Acadêmica, incluindo Thiago Cardoso Viana e Karla Gardene Baima.
- As reuniões terão como foco a validação contínua do modelo de domínio, das regras de negócio, da prioridade e do valor das features.
- Um canal direto será mantido para esclarecer dúvidas sobre operação, critérios de triagem, agendamento, confirmação de presença, perfis de acesso e demais regras da clínica.
- As decisões e os aceites do cliente serão documentados no GitHub ou nas atas das reuniões, vinculados às features correspondentes.

#### Documentação e código

O GitHub será o repositório central do código-fonte, dos diagramas de domínio e design, das decisões do projeto e dos artefatos de requisitos. A documentação será publicada com MkDocs e disponibilizada por meio do GitHub Pages. Pull requests e revisões serão utilizados para dar visibilidade às alterações e preservar a rastreabilidade do trabalho realizado.

### 7.3 Processo de Validação

A validação ocorrerá de forma incremental, acompanhando os marcos do FDD e combinando inspeções internas, testes e demonstrações com o cliente. Cada feature deverá possuir descrição, prioridade, critérios de aceitação e vínculo com as necessidades do negócio antes de ser considerada pronta para o ciclo de desenvolvimento.

1. **Design Inspecionado:** após o Projeto por Feature, a equipe revisará o modelo detalhado, os diagramas de sequência, os protótipos, as regras de negócio e os critérios de aceitação. A inspeção verificará consistência com o modelo de domínio, viabilidade técnica, acessibilidade, segurança e restrições do atendimento presencial determinadas pelo CRP.
2. **Código Concluído:** durante o Construir por Feature, a equipe confirmará que a implementação cobre os cenários previstos e que a feature está integrada aos componentes necessários, sem alterar regras aprovadas sem registro e validação.
3. **Inspeção de Código:** o código será revisado por outro integrante da equipe, observando legibilidade, padrões definidos, tratamento de erros, segurança, controle de acesso, proteção de dados sensíveis e aderência aos critérios de aceitação.
4. **Promoção para Construção:** somente as features aprovadas nas inspeções e nos testes unitários e de integração serão promovidas para a construção integrada. O resultado será registrado no GitHub, com evidências dos testes e das pendências conhecidas.
5. **Demonstração da Feature:** ao final de cada conjunto relevante de features, será realizada uma demo com Robson e a equipe da FBr. A demonstração utilizará cenários próximos da operação real da clínica, como inscrição, triagem, consulta da fila, agendamento e confirmação de presença.
6. **Aceite e ajustes:** a FBr avaliará o comportamento apresentado, o valor para os usuários e a conformidade com as normas do CRP e as necessidades reais da clínica. O aceite formal, as observações e eventuais solicitações de ajuste serão registrados e vinculados às features. Itens não aceitos retornarão ao planejamento com prioridade e critérios revisados.

Ao final do projeto, a System Demo apresentará o fluxo integrado do MVP à FBr. A entrega final dependerá da comprovação de que as features foram implementadas, testadas, inspecionadas e validadas, além do registro dos limites conhecidos e das evoluções previstas.
