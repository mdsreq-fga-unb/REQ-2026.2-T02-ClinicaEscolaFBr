# Clínica Escola FBr - Documentação do Projeto

**Versão 1.13**
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

### Visão Geral da Documentação

Navegue pelo menu para acompanhar a documentação da Unidade 1. As seções de requisitos funcionais, requisitos não funcionais, DoR, DoD e backlog serão incorporadas à navegação quando forem desenvolvidas na Unidade 2.

- **Visão e Cenário**
  Entendimento do problema, cenário atual e solução proposta.

- **Engenharia de Software**
  Estratégias, ciclo de vida e engenharia de requisitos.

- **Gestão e Processos**
  Cronograma de entregas, equipe, reuniões e retrospectiva da Unidade 1.

---

### Mapeamento dos Arquivos

| Arquivo                                                               | Seção    | Conteúdo                                                                     |
| --------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------- |
| [`Cenário Atual`](unidade-1/cenario-atual.md)                         | Seção 1  | Identificação do cliente, Contexto, Rich Picture, Stakeholders e Segmentação |
| [`Solução Proposta`](unidade-1/solucao-proposta.md)                   | Seção 2  | Objetivos, Características de Produto (CPs), Análise de mercado e Benefícios |
| [`Intervenção Social`](unidade-1/intervencao-social.md)               | Seção 3  | Intervenção social do software                                               |
| [`Estratégia de ESW`](unidade-1/estrategia-esw.md)                    | Seção 4  | Abordagem de ESW, Ciclo de vida e Processo                                   |
| [`Engenharia de Requisitos`](unidade-1/engenharia-requisitos.md)      | Seção 5  | Técnicas e atividades de Engenharia de Requisitos                            |
| [`Cronograma e Entregas`](unidade-1/gestao/cronograma.md)             | Seção 6  | Cronograma do projeto                                                        |
| [`Equipe e Comunicação`](unidade-1/gestao/equipe-comunicacao.md)      | Seção 7  | Membros, papéis, canal de comunicação e validação                            |
| [`Boas práticas no GitHub`](unidade-1/gestao/boas-praticas-github.md) | Apoio    | Fluxo de colaboração, revisão e publicação                                   |
| [`Estudo de FDD`](unidade-1/estudos/fdd.md)                           | Apoio    | Processo FDD adotado no projeto                                              |
| [`Reuniões da Unidade 1`](unidade-1/reunioes.md)                      | Apoio    | Registros de alinhamento, levantamento e acompanhamento                      |
| [`Lições Aprendidas`](unidade-1/licoes-aprendidas.md)                 | Seção 11 | Retrospectiva da Unidade 1                                                   |
| [`Referências`](unidade-1/referencias.md)                             | Seção 12 | Referências utilizadas nos artefatos da Unidade 1                            |

> **Nota:** As seções 8, 9 e 10 serão desenvolvidas na **Unidade 2** e permanecem fora da navegação até que tenham conteúdo validado.

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
