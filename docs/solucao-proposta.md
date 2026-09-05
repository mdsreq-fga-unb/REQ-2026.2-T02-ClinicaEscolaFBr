# 2. Solução Proposta

## 2.1 Objetivo Geral do Produto

O objetivo do produto é **apoiar a integração e a digitalização da gestão da Clínica Escola de Psicologia da Faculdade Brasília**, por meio de uma aplicação web responsiva que apoie o processo desde a inscrição do paciente até a entrega do relatório final de evolução.

A solução deverá:

- Ampliar o aproveitamento das vagas ofertadas a cada semestre
- Atacar prioritariamente as falhas de agendamento e de confirmação de presença que hoje produzem horários ociosos
- Reduzir o esforço manual da coordenação, da secretaria, dos supervisores e dos estagiários
- Preservar integralmente o caráter presencial do atendimento psicológico, conforme exigido pelo Conselho Regional de Psicologia

## 2.2 Objetivos Específicos (OE) do Produto

- **(OE1)** Facilitar o acesso da comunidade de Santa Maria/DF ao processo de triagem psicológica, reduzindo barreiras de tempo e deslocamento na etapa de inscrição
- **(OE2)** Apoiar a triagem e a priorização clínica dos inscritos, com pré-classificação automática sujeita à revisão da equipe da clínica
- **(OE3)** Reduzir as faltas e os cancelamentos não informados, por meio de agendamento, lembretes e confirmação de presença
- **(OE4)** Ampliar o aproveitamento das vagas ofertadas a cada semestre, com fila de espera organizada e realocação ágil das vagas liberadas
- **(OE5)** Organizar o registro clínico e a supervisão, do acompanhamento das sessões até a geração do relatório final de evolução
- **(OE6)** Subsidiar a gestão da clínica e a prestação de contas perante o Conselho Regional de Psicologia e o MEC, com base em indicadores confiáveis sobre o atendimento
- **(OE7)** Assegurar o sigilo das informações dos pacientes, em conformidade com a LGPD e com as normas do Conselho Federal de Psicologia

## 2.3 Características de Produto (mapeadas com os Objetivos Específicos)

A solução proposta para a Clínica Escola da FBr deverá contemplar, de forma preliminar, as seguintes características:

| ID   | Característica de Produto (CP)                         | Descrição resumida                                                                                                                                                                                                             | Valor de Negócio (VN) principal                                                                       | Contribuição principal | Contribuição secundária |
| ---- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ---------------------- | ----------------------- |
| CP1  | Inscrição on-line                                      | Permitir que o interessado se inscreva pela internet, a partir de link divulgado no site e nas redes da FBr, informando dados cadastrais e a queixa, sem necessidade de deslocamento presencial.                               | Ampliação do alcance do projeto social e eliminação de uma ida presencial à instituição.              | OE1                    | OE4                     |
| CP2  | Triagem e classificação de prioridade                  | Apoiar a classificação dos inscritos nas prioridades vermelha, amarela e verde, com pré-classificação automática a partir de opções pré-definidas no formulário, sujeita à revisão final da equipe.                            | Redução do esforço manual de triagem e maior consistência na priorização dos casos mais graves.       | OE2                    | OE1                     |
| CP3  | Fila de espera e consulta de posição                   | Manter a fila de espera ordenada por prioridade e permitir que o inscrito consulte apenas a sua posição (via CPF ou número de inscrição), sem expor os nomes dos demais.                                                       | Transparência com a comunidade e redução dos contatos de acompanhamento dirigidos à secretaria.       | OE4                    | OE7                     |
| CP4  | Agendamento, confirmação e remarcação                  | Apoiar o agendamento das sessões, envio de lembretes, confirmação de presença pelo paciente e registro de cancelamentos com justificativa, incluindo comunicação antecipada da ausência do estagiário.                         | Redução das faltas sem aviso e dos horários ociosos de estágio.                                       | OE3                    | OE4                     |
| CP5  | Distribuição de casos entre supervisores e estagiários | Apoiar a divisão dos casos entre os supervisores conforme a área de especialidade e a vinculação de cada paciente a um estagiário responsável.                                                                                 | Organização da reunião inicial de estágio e rastreabilidade da responsabilidade sobre cada caso.      | OE5                    | OE2                     |
| CP6  | Prontuário eletrônico, evolução e relatório final      | Permitir o registro da evolução de cada sessão pelo estagiário e a geração do relatório final de evolução ao término do ciclo de 8 a 10 sessões.                                                                               | Eliminação da redigitação do relatório final e melhoria da qualidade do registro clínico.             | OE5                    | OE6                     |
| CP7  | Controle de assiduidade e alertas                      | Controlar as faltas de pacientes e de estagiários e emitir alerta quando o limite de duas faltas for atingido, sinalizando o desligamento do paciente e a liberação da vaga.                                                   | Aproveitamento das vagas liberadas e cumprimento das regras acadêmicas do estágio.                    | OE4                    | OE3                     |
| CP8  | Registro da contribuição social                        | Registrar o pagamento da taxa única de responsabilidade social de R$ 35, devida na primeira sessão, distinguindo quem efetivou e quem não efetivou o pagamento.                                                                | Controle do requisito de início do atendimento e visibilidade da situação de cada inscrito.           | OE6                    | OE4                     |
| CP9  | Emissão de declaração de comparecimento                | Gerar automaticamente a declaração de comparecimento do paciente, contendo data, horário e nome do estagiário que realizou o atendimento.                                                                                      | Atendimento imediato de uma demanda recorrente dos pacientes, sem trabalho manual da secretaria.      | OE6                    | OE5                     |
| CP10 | Indicadores e relatórios institucionais                | Consolidar indicadores da operação (vagas ocupadas, tempo de espera, evasão, casos por supervisor) e apoiar a extração dos relatórios exigidos pelo CRP e pelo MEC.                                                            | Apoio à gestão da clínica e à prestação de contas institucional.                                      | OE6                    | OE4                     |
| CP11 | Segurança, sigilo e controle de acesso                 | Incorporar perfis de acesso distintos para paciente, secretaria, estagiário, supervisor e coordenação, restringindo o prontuário ao estagiário responsável e ao seu supervisor, em conformidade com a LGPD e as normas do CFP. | Redução do risco ético e legal no tratamento de dados sensíveis de saúde.                             | OE7                    | OE5                     |
| CP12 | Acessibilidade e usabilidade                           | Ser uma aplicação web responsiva, de uso simples e com recursos de acessibilidade, considerando o público em vulnerabilidade social e as exigências de acessibilidade avaliadas pelo MEC.                                      | Inclusão de usuários com menor domínio tecnológico ou com deficiência visual e aderência à regulação. | OE1                    | OE7                     |

### Escopo do MVP

Considerando o prazo de um semestre letivo e a priorização acordada com o cliente, o **Produto Mínimo Viável (MVP)** será composto pelas características:

**CP1, CP2, CP3, CP4, CP5, CP7, CP11 e CP12**

Essas características endereçam a dor mais crítica relatada pela coordenação: a inscrição, a triagem, o agendamento, a confirmação de presença e o reaproveitamento das vagas liberadas.

As características **CP6, CP8, CP9 e CP10** (acompanhamento clínico, controle da contribuição social e emissão de documentos e relatórios) compõem o escopo desejável e serão tratadas nas evoluções seguintes do produto.

## 2.4 Tecnologias a Serem Utilizadas

Conforme foi definido pela equipe, a stack tecnológica optada para o desenvolvimento da solução é definida por:

- Front-end: TypeScript, com o framework Next.js, selecionado pela sua maturidade, documentação ampla e convenções bem estabelecidas de organização, reduzindo a curva de aprendizado para a equipe. 

- Back-end: TypeScript, com o framework NestJS, mantendo a linguagem do front-end, reduzindo a dispersão de trabalho da equipe entre as duas camadas da aplicação. 

- Banco de Dados: PostgreSQL, banco de dados relacional adequado à modelagem consistente dos perfis de acesso e das relações entre casos, sessões e responsáveis exigidas pelas características CP5 e CP11. 

Controle de Versão e Documentação: GiHub como repositório central do código-fonte, diagramas e artefatos de requisitos, utilizando GitHub Projects para rastreamento de features e MkDocs/GitHub Pages para publicação da documentação do projeto. 

## 2.5 Pesquisa de Mercado e Análise Competitiva

O mercado brasileiro de software para gestão de serviços de saúde é maduro e conta com soluções consolidadas de prontuário eletrônico, agenda e cobrança, inclusive produtos especializados em psicologia. Entretanto, essa oferta está organizada em torno do **consultório privado e da clínica particular**, nos quais quem atende é um profissional formado, responsável pela própria agenda e remunerado por sessão.

O contexto da Clínica Escola da FBr é estruturalmente diferente:

- O atendimento é **gratuito**
- É realizado por **estagiários sob supervisão docente**
- O corpo de atendentes é **renovado a cada semestre**
- A operação precisa prestar contas tanto ao paciente quanto à coordenação do curso

### Principais soluções analisadas e suas fragilidades

**Clínica nas Nuvens (Módulo Clínica-escola)**
É o concorrente mais próximo e o único identificado com um módulo dedicado a clínicas-escola. Contempla prontuário eletrônico adaptado à dupla finalidade clínica e pedagógica.
Por outro lado, trata-se de uma plataforma ampla e multiprofissional, que carrega recursos irrelevantes para o caso (odontograma, faturamento TISS, emissão de NF-e, controle de estoque), aumentando a complexidade de uso e de treinamento. Sua comercialização ocorre por contrato, com preço divulgado apenas sob demonstração. O módulo se concentra no registro e na supervisão do atendimento, e não na porta de entrada do projeto social (solicitação pública de atendimento e triagem com fila de espera priorizada).

**iClinic (Afya)**
Plataforma robusta, em nuvem, com teleconsulta, prontuário e adequação declarada à LGPD.
Sua limitação central é o modelo de licenciamento, cobrado por profissional de saúde (planos entre R$ 99 e R$ 299 mensais por profissional – consulta realizada em agosto de 2026), o que torna o custo proibitivo para uma clínica escola com dezenas de estagiários rotativos. O modelo de dados presume o profissional autônomo como dono do atendimento, sem representar a relação estagiário–supervisor nem o vínculo do caso com o ciclo acadêmico.

**PsicoManager**
Solução com melhor aderência ao domínio da psicologia, oferecendo agenda, prontuário psicológico, escalas, controle de sessões e recursos de inteligência artificial para apoio à evolução clínica.
Contudo, está orientada ao psicólogo autônomo e à clínica privada, com forte ênfase em cobrança, repasse e gestão financeira — funcionalidades sem sentido em um serviço gratuito. Não contempla solicitação pública de atendimento, fila de espera institucional nem avaliação pedagógica do estagiário pelo supervisor.

**Ferramentas genéricas (papel, planilhas, Google Agenda e WhatsApp)**
Constituem a alternativa de custo zero e adoção imediata e são o que mais se aproxima do processo atualmente praticado.
Não oferecem, porém, prontuário estruturado, controle de acesso por perfil, trilha de auditoria ou garantias de sigilo compatíveis com o tratamento de dados sensíveis de saúde, exigidas pela LGPD e pelas resoluções do Conselho Federal de Psicologia. Também não eliminam a necessidade de deslocamento presencial do interessado.

**Sistemas desenvolvidos sob demanda por outras instituições**
A literatura acadêmica registra iniciativas de sistemas de triagem e atendimento construídos especificamente para clínicas-escola, o que confirma a existência da demanda. Esses sistemas, no entanto, não são produtos disponíveis no mercado, não possuem distribuição, documentação pública ou manutenção garantida, e por isso não são reaproveitáveis pela FBr.

### Quadro Comparativo

| Critério de comparação                          | Clínica nas Nuvens (Módulo Clínica-escola)                           | iClinic (Afya)                                | PsicoManager                                          | Ferramentas genéricas                           | **Clínica Escola FBr (proposta)**                                |
| ----------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| Foco de mercado                                 | Clínicas multiprofissionais de saúde, com módulo para clínica-escola | Clínicas e consultórios médicos               | Psicólogo autônomo e clínica de psicologia particular | Uso geral, sem foco em saúde                    | Clínica escola de psicologia como projeto social                 |
| Modelo de custo                                 | Contrato institucional, preço sob consulta                           | Assinatura mensal por profissional de saúde   | Assinatura mensal por profissional ou por clínica     | Gratuito ou já contratado                       | Solução própria da FBr, sem custo por usuário                    |
| Solicitação de atendimento e triagem            | Parcial: foco no prontuário e na supervisão                          | Não: agenda voltada ao paciente já cadastrado | Não                                                   | Não                                             | **Sim**: solicitação online, triagem e fila de espera priorizada |
| Hierarquia estagiário–supervisor                | Sim                                                                  | Não: presume profissional autônomo            | Parcial: gestão de clínica, sem papel de estagiário   | Não                                             | **Sim**: perfis de estagiário, supervisor e coordenação          |
| Continuidade de casos entre semestres           | Não previsto explicitamente                                          | Não                                           | Não                                                   | Não                                             | **Sim**: transferência de caso ao fim do estágio                 |
| Indicadores de gestão e responsabilidade social | Sim, com viés financeiro e assistencial                              | Sim, com viés financeiro                      | Sim, com viés financeiro                              | Não                                             | **Sim**, com viés social e acadêmico                             |
| Sigilo, LGPD e trilha de auditoria              | Sim                                                                  | Sim                                           | Sim                                                   | Não: sem controle de acesso nem rastreabilidade | **Sim**: acesso por perfil e registro de auditoria               |

### Diferenciais da Solução

A solução da Clínica Escola FBr irá se diferenciar pelos seguintes aspectos:

- **Fluxo desenhado para a clínica escola:** o produto cobrirá o processo de ponta a ponta, da solicitação online de atendimento pelo cidadão até o encerramento ou encaminhamento do caso, passando pela triagem, pela fila de espera priorizada, pela alocação do caso a um estagiário e seu supervisor, pelo agendamento das sessões e pelo registro da evolução.
- **Papéis alinhados à estrutura acadêmica:** o sistema representará explicitamente os perfis de solicitante, secretaria, estagiário, supervisor e coordenação, com visibilidade do prontuário restrita ao estagiário responsável e ao seu supervisor.
- **Continuidade dos casos entre semestres:** a transferência de casos quando um estagiário conclui o estágio será tratada como funcionalidade de primeira classe, preservando o histórico do paciente.
- **Indicadores sociais e acadêmicos em lugar de gestão financeira:** o foco dos relatórios será deslocado da cobrança para indicadores de valor institucional (volume de atendimentos, tempo médio de espera, taxa de absenteísmo e distribuição de casos por supervisor).
- **Custo total compatível com um projeto social:** como solução própria da instituição, o produto não implica assinatura por profissional, permitindo que o número de estagiários atendidos cresça a cada semestre sem custo marginal por usuário.

## 2.6 Viabilidade da Proposta

> _Seção a ser preenchida com a avaliação objetiva da viabilidade no contexto da disciplina (equipe, prazo, acesso ao cliente, conhecimento técnico disponível e possibilidade de entrega de um MVP funcional ao final do semestre)._

## 2.7 Benefícios Esperados

- **Para o cliente:** ampliar a capacidade de gestão da Clínica Escola de Psicologia da FBr, centralizando informações relacionadas à inscrição, seleção, agendamento e acompanhamento dos pacientes. A solução deverá contribuir para a redução de processos manuais, melhorar o controle sobre faltas, cancelamentos e vagas disponíveis, facilitar a realocação de pacientes e proporcionar maior rastreabilidade dos atendimentos. Também se espera melhorar o controle das atividades dos estagiários e fornecer informações mais organizadas para supervisores e coordenação, criando melhores condições para a continuidade e expansão dos serviços prestados pela Clínica Escola.

- **Para os usuários:** proporcionar aos pacientes uma experiência mais simples, acessível e transparente desde a inscrição até o acompanhamento do atendimento, facilitando o acesso às informações sobre agendamentos, confirmações, cancelamentos e situação na fila de espera. Para estagiários, supervisores e profissionais envolvidos na operação da clínica, espera-se reduzir tarefas manuais e facilitar o acesso às informações necessárias para organização e acompanhamento dos atendimentos, respeitando os diferentes níveis de acesso e o sigilo das informações dos pacientes.
