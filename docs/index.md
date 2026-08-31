# Clínica Escola FBr - Documentação do Projeto

**Versão 1.0**
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

Navegue pelo menu para acompanhar as entregas das Unidades:

- **Visão e Cenário**
  Entendimento do problema, cenário atual e solução proposta.

- **Engenharia de Software**
  Estratégias, ciclo de vida e engenharia de requisitos.

- **Requisitos e Backlog**
  Lista de requisitos funcionais, não-funcionais, DoR, DoD e MVP.

- **Gestão e Processos**
  Cronograma de entregas, equipe e retrospectivas.

---

### Mapeamento dos Arquivos

| Arquivo                                                             | Seção     | Conteúdo                                                                     |
| ------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------- |
| [`Cenário Atual`](cenario-atual.md)                                 | Seção 1   | Identificação do cliente, Contexto, Rich Picture, Stakeholders e Segmentação |
| [`Solução Proposta`](solucao-proposta.md)                           | Seção 2   | Objetivos, Características de Produto (CPs), Análise de mercado e Benefícios |
| [`Intervenção Social`](intervencao-social.md)                       | Seção 3   | Intervenção social do software                                               |
| [`Estratégia de ESW`](estrategia-esw.md)                            | Seção 4   | Abordagem de ESW, Ciclo de vida e Processo                                   |
| [`Engenharia de Requisitos`](engenharia-requisitos.md)              | Seção 5   | Técnicas e atividades de Engenharia de Requisitos                            |
| [`Cronograma e Entregas`](gestao/cronograma.md)                     | Seção 6   | Cronograma do projeto                                                        |
| [`Equipe e Comunicação`](gestao/equipe-comunicacao.md)              | Seção 7   | Membros, papéis, canal de comunicação e validação                            |
| [`Requisitos Funcionais`](requisitos/funcionais.md)                 | Seção 8.1 | Lista de Requisitos Funcionais                                               |
| [`Requisitos Não-Funcionais`](requisitos/nao-funcionais.md)         | Seção 8.2 | Requisitos Não-Funcionais (URPS+)                                            |
| [`Definition of Ready e Definition of Done`](requisitos/dor-dod.md) | Seção 9   | Definition of Ready e Definition of Done                                     |
| [`Backlog Geral e MVP`](requisitos/backlog.md)                      | Seção 10  | Backlog Geral e MVP                                                          |
| [`Lições Aprendidas`](licoes-aprendidas.md)                         | Seção 11  | Retrospectivas das Unidades 1, 2, 3 e 4                                      |
| [`Referências`](referencias.md)                                     | Seção 12  | Referências bibliográficas                                                   |

> **Nota:** As seções 8, 9 e 10 serão preenchidas na **Unidade 2**. As demais seções de gestão e lições aprendidas serão atualizadas ao longo do semestre.

---

### Histórico de Revisão

| Data       | Versão | Descrição                                                                                                                      | Autor                                                                     |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| 17/08/2026 | 1.0    | Início do desenvolvimento do documento                                                                                         | Jônatas                                                                   |
| 20/08/2026 | 1.1    | Escrita das informações do cliente                                                                                             | Luís Henrique (durante reunião, tela compartilhada com os demais membros) |
| 26/08/2026 | 1.2    | Preenchimento das seções necessárias para envio da proposta                                                                    | Joaquim José (durante reunião, tela compartilhada com os demais membros)  |
| 27/08/2026 | 1.3    | Formatação do documento                                                                                                        | Jônatas                                                                   |
| 29/08/2026 | 1.4    | Adição de correções propostas pelo professor (tópicos 1.2, 2.1)                                                                | Gabriel Barbaceli                                                         |
| 29/08/2026 | 1.5    | Estruturação inicial do site no GitHub Pages, conversão do documento de Visão para Markdown e organização das seções no MkDocs | Gabriel Barbaceli                                                         |
| 31/08/2026 | 1.6    | Atualização do histórico de revisão e inclusão das boas práticas do GitHub na documentação e na navegação do MkDocs            | Gabriel Barbaceli                                                         |
