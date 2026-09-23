# Clínica Escola FBr - Documentação do Projeto

**Versão 2.22**
**Documento de Visão do Produto e Projeto**

---

### Sobre o Projeto

O **Clínica Escola FBr** é um sistema web responsivo desenvolvido para digitalizar e integrar a gestão da **Clínica Escola de Psicologia da Faculdade Brasília (FBr)**.

A Clínica Escola oferta aproximadamente **100 vagas por semestre** de atendimento psicológico gratuito à comunidade de Santa Maria/DF e entorno, com demanda de 160 a 180 inscrições. Atualmente toda a operação é manual e presencial (fichas em papel + planilha Excel), gerando:

- Demora na confirmação de atendimentos
- Faltas e cancelamentos sem aviso
- Horários ociosos de estagiários
- Baixa visibilidade da fila de espera
- Dificuldade de geração de indicadores
- Riscos no tratamento de dados sensíveis

A solução digitaliza as etapas permitidas pela regulação (inscrição, triagem, agendamento, confirmação de presença, registro clínico e emissão de documentos), **sem alterar o caráter presencial do atendimento psicológico**, conforme exigido pelo Conselho Regional de Psicologia.

**Cliente:** Faculdade Brasília – FBr
**Representantes:** Robson Luís de Araújo (Coordenador do Curso de Psicologia / Clínica Escola), Thiago Cardoso Viana (Diretor de Financeiro e Tecnologia) e Karla Gardene Baima (Secretária Acadêmica).

---

### Vídeo de Apresentação da Unidade 1

<div class="video-container">
  <iframe
    src="https://www.youtube.com/embed/ysMmYmttAH8"
    title="Apresentação da Unidade 1 — Clínica Escola FBr"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen>
  </iframe>
</div>

Apresentação da entrega da Unidade 1, cobrindo o cenário atual e a intervenção social, a solução proposta, a estratégia de Engenharia de Software, a Engenharia de Requisitos e a gestão do projeto.

▶ **[Assistir no YouTube](https://youtu.be/ysMmYmttAH8)**

---

### Visão Geral da Documentação

Navegue pelo menu para acompanhar a documentação das Unidades 1 e 2. A Unidade 2 reúne os requisitos funcionais e não funcionais, o DoR, o DoD e o backlog de produto.

- **Visão e Cenário**
  Entendimento do problema, cenário atual e solução proposta.

- **Engenharia de Software**
  Estratégias, ciclo de vida e engenharia de requisitos.

- **Gestão e Processos**
  Cronograma de entregas, equipe, reuniões e retrospectiva da Unidade 1.

---

### Mapeamento dos Arquivos

| Arquivo | Seção | Conteúdo |
| --- | --- | --- |
| [`Cenário Atual`](unidade-1/cenario-atual.md) | Seção 1 | Identificação do cliente, contexto, Rich Picture, stakeholders e segmentação |
| [`Solução Proposta`](unidade-1/solucao-proposta.md) | Seção 2 | Objetivos, características de produto (CPs), análise de mercado e benefícios |
| [`Intervenção Social`](unidade-1/intervencao-social.md) | Seção 3 | Intervenção social do software |
| [`Estratégia de ESW`](unidade-1/estrategia-esw.md) | Seção 4 | Abordagem de ESW, ciclo de vida e processo |
| [`Engenharia de Requisitos`](unidade-1/engenharia-requisitos.md) | Seção 5 | Técnicas e atividades de Engenharia de Requisitos |
| [`Cronograma e Entregas`](unidade-1/gestao/cronograma.md) | Seção 6 | Cronograma do projeto |
| [`Equipe e Comunicação`](unidade-1/gestao/equipe-comunicacao.md) | Seção 7 | Membros, papéis, canal de comunicação e validação |
| [`Requisitos Funcionais`](unidade-2/requisitos/funcionais.md) | Seção 8.1 | Lista de requisitos funcionais, atores, prioridades, critérios de aceitação e rastreabilidade |
| [`Requisitos Não Funcionais`](unidade-2/requisitos/nao-funcionais.md) | Seção 8.2 | Lista URPS+ de requisitos mensuráveis de segurança, privacidade, acessibilidade, usabilidade, disponibilidade, desempenho e auditoria |
| [`DoR e DoD`](unidade-2/requisitos/dor-dod.md) | Seção 9 | Critérios de prontidão e conclusão das features |
| [`Backlog de Produto`](unidade-2/requisitos/backlog.md) | Seções 10.1 e 10.2 | Backlog geral, priorização e recorte do MVP |
| [`Cronograma e Entregas da Unidade 2`](unidade-2/gestao/cronograma.md) | Apoio | Planejamento das atividades e entregáveis da Unidade 2 |
| [`Reuniões da Unidade 2`](unidade-2/reunioes.md) | Apoio | Registros de elicitação, validação e acompanhamento dos requisitos |
| [`Lições Aprendidas da Unidade 2`](unidade-2/licoes-aprendidas.md) | Seção 11.2 | Retrospectiva da Unidade 2 |
| [`Lições Aprendidas`](unidade-1/licoes-aprendidas.md) | Seção 11 | Retrospectiva da Unidade 1 |
| [`Referências`](unidade-1/referencias.md) | Seção 12 | Referências utilizadas nos artefatos da Unidade 1 |
| [`Boas práticas no GitHub`](unidade-1/gestao/boas-praticas-github.md) | Apoio | Fluxo de colaboração, revisão e publicação |
| [`Estudo de FDD`](unidade-1/estudos/fdd.md) | Apoio | Processo FDD adotado no projeto |
| [`Reuniões da Unidade 1`](unidade-1/reunioes.md) | Apoio | Registros de alinhamento, levantamento e acompanhamento |

---

### Histórico de Revisão

| Data       | Versão | Descrição                                                                                                                                 | Autor                                                                     |
| ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 17/08/2026 | 1.0    | Início do desenvolvimento do documento                                                                                                    | Jônatas                                                                   |
| 20/08/2026 | 1.1    | Escrita das informações do cliente                                                                                                        | Luís Henrique (durante reunião, tela compartilhada com os demais membros) |
| 26/08/2026 | 1.2    | Preenchimento das seções necessárias para envio da proposta                                                                               | Joaquim José (durante reunião, tela compartilhada com os demais membros)  |
| 27/08/2026 | 1.3    | Formatação do documento                                                                                                                   | Jônatas                                                                   |
| 29/08/2026 | 1.4    | Adição de correções propostas pelo professor (tópicos 1.2, 2.1)                                                                           | Gabriel Barbaceli                                                         |
| 29/08/2026 | 1.5    | Estruturação inicial do site no GitHub Pages, conversão do documento de Visão para Markdown e organização das seções no MkDocs            | Gabriel Barbaceli                                                         |
| 04/09/2026 | 1.6    | Adição do texto do tópico 2.6                                                                                                             | Nicolas Lopes                                                             |
| 31/08/2026 | 1.7    | Inclusão dos benefícios esperados e da intervenção social (tópicos 2.7 e 3), com correções nos objetivos específicos e no nome do projeto | Jônatas Farias e Maria Clara                                              |
| 01/09/2026 | 1.8    | Atualização das diretrizes de pull requests, branches, commits e revisão no guia de boas práticas do GitHub                               | Gabriel Barbaceli                                                         |
| 02/09/2026 | 1.9    | Inclusão da Engenharia de Requisitos, do estudo de FDD, do cronograma detalhado e da composição da equipe e comunicação                   | Luís Henrique                                                             |
| 03/09/2026 | 1.10   | Inclusão das atas, imagens e registros das reuniões da Unidade 1                                                                          | Gabriel Barbaceli                                                         |
| 04/09/2026 | 1.11   | Atualização do cronograma com a visão macro das Unidades 2, 3 e 4 e revisão da aplicação dos processos FDD                                | Gabriel Barbaceli                                                         |
| 05/09/2026 | 1.12   | Inclusão da estratégia de Engenharia de Software, do mapa de stakeholders e da stack tecnológica; correções textuais associadas           | Joaquim José, Maria Clara e Maria Clara-Canuto                            |
| 06/09/2026 | 1.13   | Reorganização dos artefatos na pasta da Unidade 1, consolidação das reuniões, atualização da navegação e revisão geral                    | Gabriel Barbaceli                                                         |
| 08/09/2026 | 1.14   | Inclusão do vídeo de apresentação da entrega da Unidade 1                                                                                 | Joaquim José                                                              |
| 17/09/2026 | 2.0    | Reorganização da documentação para a Unidade 2: migração dos requisitos para `docs/unidade-2/`, inclusão do cronograma detalhado da Unidade 2 (com a atividade de priorização e definição do MVP), atualização da navegação, do README e do mapeamento de arquivos, e registro da reunião de divisão de tarefas de 17/09 | Gabriel Barbaceli                                                         |
| 18/09/2026 | 2.1    | Revisão dos cronogramas das Unidades 1 e 2 conforme a issue #20: explicitação dos processos FDD por ciclo, mapeamento das atividades de Engenharia de Requisitos, distribuição das CPs no tempo com justificativa de capacidade até o fim do projeto, explicitação de ciclos de 1 a 2 semanas e remoção das menções ao MVP como já definido (definição formal prevista para 29/09/2026) | Gabriel Barbaceli                                                         |
| 20/09/2026 | 2.2 | Declaração dos primeiros RFs e RNFs de indicadores operacionais e relatórios institucionais (CP11), no âmbito do PR #28 | Gabriel Barbaceli |
| 21/09/2026 | 2.3 | Detalhamento do texto da intervenção social (seção 3) | Jônatas |
| 21/09/2026 | 2.4 | Declaração dos requisitos funcionais de CP1 (Inscrição on-line) e CP3 (Fila de espera e consulta de posição) | Jônatas |
| 21/09/2026 | 2.5 | Inclusão dos requisitos não funcionais de CP1 e CP3 | Jônatas |
| 21/09/2026 | 2.6 | Declaração das features, RFs e RNFs da CP10 (declaração de comparecimento), referente à decomposição da issue #37 | Maria Clara |
| 21/09/2026 | 2.7 | Declaração das features, RFs e RNFs de CP10 (contribuição social) e CP12 (segurança, sigilo e controle de acesso), referente às issues #36 e #38 | Joaquim José |
| 21/09/2026 | 2.8 | Vinculação das features de CP10 e CP12 às respectivas issues de rastreabilidade | Joaquim José |
| 21/09/2026 | 2.9 | Ajustes de redação nos requisitos de CP14 (acessibilidade e usabilidade) | Gabriel Barbaceli |
| 21/09/2026 | 2.10 | Ajustes de redação nos RFs de contribuição social (CP10) e de restrição de acesso ao prontuário (CP12), conforme revisão | Joaquim José |
| 21/09/2026 | 2.11 | Esclarecimento do RF07 (Registrar inscrição assistida, restrito ao perfil de secretaria) e do RF09 (Consultar posição na fila, com verificação de identidade) | Jônatas |
| 21/09/2026 | 2.12 | Esclarecimento do mecanismo de verificação de identidade no RNF09 (privacidade e controle de acesso à consulta de fila) | Jônatas |
| 21/09/2026 | 2.13 | Declaração das features, RFs e RNFs da CP5 (distribuição de casos e transferência entre estagiários), referente à decomposição da issue #33 | Maria Clara |
| 21/09/2026 | 2.14 | Atualização da Solução Proposta (seção 2.3), refletindo a renumeração final das Características de Produto (CP1–CP14) | Nicolas Lopes |
| 21/09/2026 | 2.15 | Revisão do processo de Engenharia de Requisitos (seção 5) | Luís Henrique |
| 21/09/2026 | 2.16 | Revisão extensa dos requisitos funcionais e não funcionais de inscrição on-line (CP1) e fila de espera (CP3), com maior detalhamento de critérios de aceitação e conformidade | Gabriel Barbaceli |
| 21/09/2026 | 2.17 | Remoção de pontos já resolvidos na lista de validação com a FBr da CP5 | Gabriel Barbaceli |
| 21/09/2026 | 2.18 | Revisão dos requisitos funcionais e não funcionais de registro e consulta da contribuição social (CP10) | Gabriel Barbaceli |
| 21/09/2026 | 2.19 | Declaração das features, RFs e RNFs da CP2 (Triagem) | Luís Henrique |
| 21/09/2026 | 2.20 | Declaração das features, RFs e RNFs de CP6 (Prontuário eletrônico), CP7 (Registro de evolução por sessão) e CP8 (Geração do relatório final de evolução), referente à decomposição da issue #34 | Luís Henrique |
| 21/09/2026 | 2.21 | Atualização de referências cruzadas de controle de acesso (CP12) nos demais RFs/RNFs e no processo de Engenharia de Requisitos | Gabriel Barbaceli |
| 21/09/2026 | 2.22 | Adição dos requisitos não funcionais de CP4 (Agendamento, confirmação e remarcação) e CP7 (Registro de evolução por sessão) | Nicolas Lopes |
| 23/09/2026 | 2.23 | Incorporação das respostas da Clínica Escola FBr aos pontos em aberto: adição dos requisitos RF30, RF38, RF40 e RF43 (complemento de evolução, reversão de desligamento por faltas, reprovação do estagiário por faltas e bloqueio de agendamento por contribuição pendente), remoção do requisito "Emitir declaração consolidada por período" (antigo RF43) e renumeração de RF30 a RF62 em `funcionais.md`, com atualização das referências correspondentes em `nao-funcionais.md` | Gabriel Barbaceli |
