# Reuniões da Unidade 3

Esta página reúne os registros das reuniões realizadas durante a Unidade 3 para planejamento, acompanhamento, verificação e validação das features construídas no projeto Clínica Escola FBr.

## Reunião de planejamento do Ciclo 3: issues, DoR e estrutura do projeto

**Data:** 15/10/2026
**Local:** Reunião on-line (Google Meet)
**Participantes:** Gabriel da Cunha Barbaceli; Jônatas Davi Oliveira Farias; Luís Henrique; Maria Clara Canuto; Nicolas Lopes da Costa.

![Registro da reunião de planejamento do Ciclo 3: issues, DoR e estrutura do projeto](../assets/reuniao-7.jpeg)

_Figura 14 — Registro da reunião de planejamento do Ciclo 3: issues, DoR e estrutura do projeto, realizada em 15/10/2026._

[Consultar ata completa em PDF](../assets/atas-reunioes/Ata_Reuniao_Ciclo_3_Planejamento_Issues_DOR_15-10-2026.pdf)

### Resumo

A reunião teve como objetivo organizar as atividades iniciais do Ciclo 3, alinhar o planejamento das issues e do DoR e preparar a estrutura do projeto para a Unidade 3.

### 1. Planejamento do Ciclo 3

- A divisão das atividades de construção do Ciclo 3 será compartilhada no grupo da equipe.
- O planejamento deve considerar as issues que o professor publicar no GitHub, identificando itens urgentes e dependências para as etapas seguintes.
- A distribuição definitiva das features e a confirmação do cronograma da semana seguinte ficaram pendentes até a publicação e a análise dessas issues.

### 2. Issues e estrutura do projeto

- Os modelos de issue já estão criados para features, bugs, tarefas técnicas e documentação.
- Os itens do [Backlog de Produto](../unidade-2/requisitos/backlog.md#101-backlog-do-produto) devem ser convertidos em issues no GitHub.
- A estrutura da Unidade 3 deve incluir a organização das pastas e dos arquivos necessários ao trabalho.

### 3. Definition of Ready (DoR)

- Neste primeiro ciclo, cada integrante fica responsável por levantar o DoR da feature em que vai trabalhar.
- Para os ciclos seguintes, foi sugerido antecipar o levantamento do DoR para o ciclo anterior, evitando atrasos no início do desenvolvimento. A divisão dessa atividade entre duas pessoas ainda não foi definida.

### 4. Base técnica e revisão

- A branch com o esqueleto técnico do projeto está pronta, como rascunho. A revisão e a aprovação para o merge na branch principal ocorrem após a liberação das issues pelo professor.
- Foi proposta a revisão por dois integrantes, com oportunidade para que todo o grupo examine a estrutura e registre dúvidas no canal de comunicação da equipe.
- Gabriel avisará Joaquim sobre a liberação da permissão de administrador do repositório.

### 5. Próximos passos e responsabilidades

- Todos os integrantes: analisar as issues assim que forem publicadas e levantar o DoR das próprias features neste primeiro ciclo.
- Gabriel: compartilhar a divisão de atividades do Ciclo 3, avisar Joaquim sobre a permissão de administrador e ajustar o cronograma se houver itens urgentes.
- Equipe: converter os itens do backlog em issues e revisar a branch técnica após a liberação das issues pelo professor, com dois revisores a confirmar.

### Encerramento

O planejamento detalhado do Ciclo 3 depende da publicação das issues pelo professor. Os modelos de issue e a branch técnica estão preparados; após a análise das issues, a equipe define a distribuição das tarefas, valida a base técnica e ajusta o cronograma conforme as prioridades identificadas.

## Reunião de PRs, requisitos DoR e planejamento de implementação do Ciclo 3

**Data:** 22/10/2026
**Local:** Reunião on-line (Google Meet)
**Participantes:** Gabriel da Cunha Barbaceli; Jônatas Davi Oliveira Farias; Luís Henrique Luna; Joaquim José da Fonseca Viana.

![Registro da reunião de PRs, requisitos DoR e planejamento de implementação do Ciclo 3](../assets/reuniao-8.jpeg)

_Figura 15 — Registro da reunião de PRs, requisitos DoR e planejamento de implementação do Ciclo 3, realizada em 22/10/2026._

[Consultar ata completa em PDF](../assets/atas-reunioes/Ata_Reuniao_Ciclo_3_PRs_DORA_22-10-2026.pdf)

### Resumo

A reunião teve como objetivo alinhar a revisão das pull requests, a validação dos requisitos DoR e a organização da implementação do Ciclo 3.

### 1. Pull requests e dependências

- Duas pull requests já revisadas foram aprovadas. Permanece aberta a PR de ajuste do Dependabot, com Jônatas como revisor: a atualização automática para TypeScript 7 causou incompatibilidades. O projeto permanecerá no TypeScript 5 até haver compatibilidade estável.
- Após a aprovação do ajuste, o Dependabot deverá recriar a PR de atualização. Se os problemas persistirem, será feita correção manual.
- A PR de Joaquim deve ser conferida em relação às issues recém-publicadas pelo professor. Após os ajustes necessários, será revisada e enviada novamente para aprovação.

### 2. Requisitos DoR e preparação do Ciclo 3

- Cada responsável por feature deve revisar sua issue e marcar o requisito DoR 8.1, confirmando entendimento e capacidade de estimar e implementar a feature.
- O requisito 7.3, referente à validação do protótipo, deverá ser marcado após a reunião com a Clínica Escola FBr, prevista para 23/10.
- Na issue 97, falta confirmar com a FBr o modelo da ficha de anamnese e do contrato terapêutico. Os demais itens do DoR foram considerados prontos, sujeitos à resolução dessas pendências.

### 3. Implementação paralela e regras de trabalho

- Gabriel preparará o esquema de banco de dados para as features do Ciclo 3, com previsão de conclusão na manhã de sábado, 24/10, permitindo o desenvolvimento em paralelo com dados mockados.
- Cada feature deverá ter uma branch própria. Alterações posteriores em tabelas devem ser feitas por novas migrations; mudanças em tabelas compartilhadas devem ser alinhadas entre os responsáveis envolvidos.
- Gabriel ficará responsável por integrar as implementações e testar o fluxo completo, com previsão para 27/10, se não houver imprevistos.

### 4. Ajustes nos requisitos e protótipo

- Foi alinhado que a dependência entre os requisitos funcionais 1 e 2 pode permanecer marcada, pois ambos serão desenvolvidos no mesmo ciclo.
- Foi discutida a possibilidade de antecipar para o Ciclo 3 o termo de consentimento previsto para o Ciclo 4, por ser uma dependência do requisito funcional 1. Não houve decisão definitiva sobre essa antecipação.
- Há uma inconsistência entre o requisito funcional 1 e o protótipo quanto ao RG: o requisito prevê apenas os números, enquanto o protótipo solicita também órgão emissor e estado. Jônatas enviará a Gabriel uma lista dos pontos e justificativas para avaliação e possível ajuste do protótipo.

### 5. Revisões, reunião com a FBr e prazos

- Luís e Joaquim devem revisar as issues antes de 25/10, se possível, para permitir correções antes da entrega. A implementação poderá ser concluída até a manhã de 27/10.
- Na reunião com a FBr prevista para 23/10, a equipe apresentará o andamento do projeto e o protótipo do Ciclo 3 para validação e buscará respostas às dúvidas urgentes, incluindo a definição sobre o domínio do sistema.
- Gabriel compartilhará o roteiro da reunião no grupo. Se não conseguir apresentar por estar no aeroporto ou precisar sair antes, Jônatas poderá dar continuidade.
- Quem encontrar dificuldades com prazo ou implementação deve avisar no grupo para que a equipe possa ajudar e evitar acúmulo de tarefas nos ciclos seguintes.

### Encerramento

Ficaram encaminhadas a revisão das PRs e issues, a conclusão das pendências do DoR e a preparação do banco de dados para desenvolvimento paralelo. O próximo passo é validar o protótipo e esclarecer dependências com a FBr em 23/10, avançando para a implementação e integração até 27/10.
