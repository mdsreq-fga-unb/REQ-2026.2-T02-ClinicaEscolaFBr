# Feature-Driven Development (FDD)

## 1. O que é FDD

Feature-Driven Development, ou Desenvolvimento Orientado a Funcionalidades, é um processo ágil de Engenharia de Software organizado em torno da entrega frequente de funcionalidades pequenas, completas e percebidas pelo usuário. Em vez de planejar o produto apenas por camadas técnicas, o FDD estrutura o trabalho a partir do valor que o sistema entrega ao negócio.

Uma feature é uma capacidade específica do produto, suficientemente pequena para ser projetada, implementada, testada e demonstrada em um período curto. Ela deve ser descrita de forma objetiva, normalmente no padrão:

> **<ação> <resultado> <objeto>**

Exemplos para a Clínica Escola FBr:

- Registrar solicitação de atendimento do paciente.
- Consultar posição do paciente na fila.
- Confirmar presença em sessão agendada.
- Classificar prioridade do inscrito.
- Associar paciente ao estagiário responsável.

Uma feature não deve ser uma tarefa técnica, como “criar tabela no banco”, nem uma iniciativa grande demais, como “implementar todo o módulo da secretaria”. A primeira é uma atividade interna de implementação; a segunda precisa ser decomposta em funcionalidades menores.

## 2. Objetivos do FDD

O FDD busca:

- entregar valor observável em ciclos curtos;
- tornar o progresso mensurável pelo número de features concluídas;
- reduzir o risco de desenvolver funcionalidades sem utilidade para o negócio;
- manter uma visão abrangente do domínio antes de detalhar cada parte;
- distribuir responsabilidades entre líderes de feature e especialistas técnicos;
- favorecer inspeções frequentes de design e código;
- permitir que o cliente acompanhe e valide incrementos reais do produto.

Na Clínica Escola FBr, isso é importante porque o sistema possui vários perfis, regras clínicas e restrições regulatórias. O trabalho por features permite validar gradualmente o fluxo da clínica, começando pelo MVP e evitando que a equipe espere o sistema inteiro ficar pronto para obter feedback.

## 3. Os cinco processos do FDD

O FDD é tradicionalmente organizado em cinco processos. Eles são apresentados em sequência, mas podem se repetir e se sobrepor conforme novas informações surgem.

### 3.1 Desenvolver um Modelo Abrangente

Nesta etapa, a equipe constrói uma visão compartilhada do domínio do problema. O objetivo não é definir todos os detalhes da implementação, mas compreender os conceitos, atores, regras, eventos e relações importantes para o negócio.

Na Clínica Escola FBr, o modelo deve considerar, por exemplo:

- paciente ou responsável;
- inscrição e solicitação de atendimento;
- triagem e prioridade clínica;
- fila de espera;
- vaga e ciclo semestral;
- sessão e agendamento;
- confirmação, cancelamento e falta;
- estagiário, supervisor e coordenação;
- perfis de acesso e auditoria.

Práticas úteis:

1. entrevistar os especialistas da FBr;
2. observar e descrever o processo atual;
3. identificar substantivos relevantes do domínio;
4. identificar verbos e eventos do processo;
5. discutir diferentes interpretações com o cliente;
6. registrar conceitos aprovados em um modelo de domínio;
7. separar regras confirmadas de hipóteses ainda pendentes.

O modelo abrangente não precisa ser perfeito na primeira versão. Ele deve ser suficientemente consistente para orientar a decomposição das áreas e features.

### 3.2 Construir uma Lista de Features

A equipe transforma o modelo de domínio em uma lista hierárquica de funcionalidades. Essa lista normalmente é organizada em três níveis:

- **Área de negócio:** grande parte do domínio, como Gestão de Inscrições;
- **Conjunto de features:** agrupamento coerente, como Triagem e Fila;
- **Feature:** capacidade pequena e entregável, como Classificar prioridade do inscrito.

Exemplo:

```text
Área: Gestão de Inscrições
  Conjunto: Solicitação de atendimento
    Feature: Registrar solicitação de atendimento do paciente
    Feature: Emitir número de inscrição do paciente
    Feature: Consultar situação da solicitação

Área: Gestão da Fila
  Conjunto: Triagem e priorização
    Feature: Pré-classificar prioridade do inscrito
    Feature: Revisar classificação do inscrito
    Feature: Consultar posição do paciente na fila
```

A lista deve ser escrita em linguagem de negócio, evitando nomes de componentes, telas ou tecnologias. Cada feature deverá ser relacionada aos requisitos funcionais, objetivos do produto e critérios de aceitação correspondentes.

### 3.3 Planejar por Feature

Depois de criada a lista, a equipe define a ordem e a responsabilidade de desenvolvimento. O planejamento deve considerar:

- valor para o cliente;
- dependências entre features;
- riscos técnicos e regulatórios;
- esforço estimado;
- disponibilidade dos integrantes;
- prioridade do MVP;
- necessidade de validação com a FBr.

Cada feature recebe um responsável principal, normalmente um Líder de Feature, e revisores. O plano deve registrar o estado da feature, por exemplo:

```text
Identificada -> Planejada -> Em design -> Design inspecionado
-> Em construção -> Código concluído -> Testada
-> Inspecionada -> Promovida -> Demonstrada -> Aceita
```

A equipe não deve interpretar o planejamento como uma autorização para ignorar mudanças. Se a FBr esclarecer uma regra ou se uma dependência for descoberta, a lista e o plano devem ser atualizados com rastreabilidade.

### 3.4 Projetar por Feature

Nesta etapa, a equipe detalha uma feature ou um pequeno conjunto de features que será construído. O design precisa explicar como a funcionalidade se comportará, quais componentes participarão e quais regras deverão ser respeitadas.

Artefatos possíveis:

- descrição da feature e critérios de aceitação;
- fluxo principal e fluxos alternativos;
- protótipo da tela, quando houver interação;
- diagrama de sequência;
- modelo de dados afetado;
- contratos de API;
- regras de autorização;
- cenários de teste;
- riscos e decisões técnicas.

O design deve ser inspecionado pela equipe antes da codificação. Para a Clínica Escola FBr, a inspeção deve verificar especialmente o acesso por perfil, o sigilo dos dados sensíveis, a ausência de atendimento psicológico on-line e a necessidade de revisão humana na triagem.

### 3.5 Construir por Feature

A equipe implementa, testa, revisa e integra a feature. Uma feature só deve ser considerada concluída quando atender aos critérios definidos e passar pelos controles técnicos e de qualidade do projeto.

Um fluxo recomendado é:

1. preparar ou ajustar o ambiente necessário;
2. implementar a persistência dos dados;
3. implementar a regra de negócio;
4. implementar a API ou o serviço de aplicação;
5. implementar a interface, quando aplicável;
6. criar testes unitários;
7. criar testes de integração ou de aceitação;
8. executar inspeção de código;
9. corrigir problemas encontrados;
10. integrar a feature à versão do produto;
11. demonstrar a funcionalidade à equipe e à FBr;
12. registrar o aceite ou as pendências.

## 4. Como aplicar FDD à Clínica Escola FBr

### 4.1 Da necessidade à feature

A equipe pode utilizar a seguinte cadeia de rastreabilidade:

```text
Problema do negócio
  -> Objetivo do produto
    -> Característica de produto
      -> Requisito funcional
        -> Feature
          -> Critério de aceitação
            -> Código e testes
```

Exemplo:

| Elemento              | Exemplo                                                                   |
| --------------------- | ------------------------------------------------------------------------- |
| Problema              | Faltas sem aviso deixam horários ociosos.                                 |
| Objetivo              | Reduzir faltas e cancelamentos não informados.                            |
| Característica        | Agendamento, confirmação e remarcação.                                    |
| Requisito             | O sistema deve permitir confirmar presença em uma sessão.                 |
| Feature               | Confirmar presença em sessão agendada.                                    |
| Critério de aceitação | Ao confirmar, o sistema registra data, usuário e situação da sessão.      |
| Teste                 | Verificar que a sessão muda para “confirmada” e que a ação fica auditada. |

### 4.2 Exemplo de decomposição do MVP

Uma possível organização inicial é:

```text
Área: Acesso e segurança
  Conjunto: Autenticação
    Feature: Autenticar usuário por perfil
    Feature: Encerrar sessão do usuário
    Feature: Registrar acesso do usuário

Área: Inscrição e triagem
  Conjunto: Solicitação de atendimento
    Feature: Registrar solicitação de atendimento do paciente
    Feature: Emitir número de inscrição do paciente
  Conjunto: Triagem
    Feature: Pré-classificar prioridade do inscrito
    Feature: Revisar classificação do inscrito

Área: Fila de espera
  Conjunto: Acompanhamento da fila
    Feature: Ordenar inscritos por prioridade
    Feature: Consultar posição do paciente na fila

Área: Agendamento
  Conjunto: Sessões
    Feature: Agendar sessão do paciente
    Feature: Enviar lembrete de sessão
    Feature: Confirmar presença em sessão agendada
    Feature: Registrar cancelamento de sessão

Área: Operação acadêmica
  Conjunto: Distribuição de casos
    Feature: Associar paciente ao estagiário responsável
    Feature: Associar estagiário ao supervisor
  Conjunto: Assiduidade
    Feature: Registrar falta do paciente
    Feature: Alertar limite de faltas do paciente
```

## 5. Como implementar FDD no código

FDD é um processo de organização e desenvolvimento, não uma biblioteca e não exige uma arquitetura específica. Ele pode ser aplicado com diferentes linguagens, frameworks e estilos arquiteturais. O essencial é manter o código organizado para que cada feature possa ser localizada, testada e entregue com autonomia razoável.

### 5.1 Organizar o código por feature

Quando fizer sentido para a stack escolhida, a equipe pode preferir uma organização vertical por funcionalidade:

```text
src/
  features/
    inscricoes/
      domain/
      application/
      infrastructure/
      presentation/
      tests/
    triagem/
      domain/
      application/
      infrastructure/
      presentation/
      tests/
    agendamento/
      domain/
      application/
      infrastructure/
      presentation/
      tests/
```

Essa estrutura evita que a implementação de uma feature fique espalhada sem necessidade por pastas genéricas. A divisão interna pode variar conforme a arquitetura adotada, mas deve preservar separação entre regras de negócio, acesso a dados e interface.

### 5.2 Separar regra de negócio de infraestrutura

Uma regra como “duas faltas atingem o limite de desligamento” deve existir em uma camada de domínio ou aplicação testável, e não apenas dentro de uma tela ou consulta ao banco. Assim, a mesma regra pode ser utilizada pela interface, por uma API e por processos automáticos sem duplicação.

Exemplo conceitual:

```text
Caso de uso: Registrar falta do paciente
  1. localizar a sessão e o paciente;
  2. validar se o usuário tem permissão;
  3. registrar a falta;
  4. recalcular a quantidade de faltas;
  5. gerar alerta se o limite for atingido;
  6. registrar a operação na auditoria.
```

O código concreto dependerá da linguagem e do framework definidos pela equipe. Antes de implementar, deve-se documentar o contrato da operação, os erros esperados e os critérios de aceitação.

### 5.3 Branches, commits e pull requests

O fluxo de versionamento pode refletir o trabalho por feature:

```text
main
  <- feature/confirmar-presenca
  <- feature/consultar-posicao-fila
  <- feature/revisar-triagem
```

Cada branch deve tratar uma feature ou uma mudança pequena e coerente. Commits devem descrever mudanças verificáveis, por exemplo:

```text
feat: registra confirmação de presença da sessão
 test: cobre confirmação de presença já registrada
 fix: impede confirmação fora do prazo permitido
```

O pull request deve informar a feature relacionada, os requisitos atendidos, os testes executados, eventuais decisões de segurança e o estado da validação com a FBr.

### 5.4 Definition of Ready e Definition of Done

Antes de iniciar uma feature, a equipe deve verificar a Definition of Ready (DoR). No mínimo, a feature deve ter objetivo, descrição, prioridade, dependências conhecidas, critérios de aceitação e responsável definido.

Para concluí-la, a Definition of Done (DoD) pode exigir:

- código implementado e revisado;
- testes unitários e de integração adequados;
- critérios de aceitação atendidos;
- controle de acesso verificado;
- documentação atualizada;
- ausência de erros conhecidos que impeçam a entrega;
- integração realizada sem quebrar funcionalidades existentes;
- demonstração feita quando aplicável;
- aceite ou pendência registrada.

## 6. Papéis no FDD

Os papéis podem ser adaptados ao tamanho da equipe. Na Clínica Escola FBr, a divisão proposta é:

| Papel                   | Responsabilidade                                                   |
| ----------------------- | ------------------------------------------------------------------ |
| Líder de projeto        | Acompanhar cronograma, riscos, comunicação e decisões.             |
| Arquiteto-chefe         | Orientar arquitetura, padrões técnicos e integração.               |
| Líder de requisitos     | Manter requisitos, critérios de aceitação e rastreabilidade.       |
| Líder de feature        | Conduzir design, implementação, revisão e demonstração da feature. |
| Especialista de domínio | Esclarecer regras e validar o comportamento esperado.              |
| Inspetor                | Revisar design, código e evidências de teste.                      |

Uma pessoa pode exercer mais de um papel, mas a revisão deve ser feita por outra pessoa sempre que possível. O cliente não precisa assumir papel técnico: os representantes da FBr atuam principalmente como especialistas de domínio e responsáveis pelo aceite.

## 7. Métricas e acompanhamento

O acompanhamento deve medir entrega real, e não apenas quantidade de reuniões ou linhas de código. Indicadores úteis incluem:

- features identificadas, planejadas, em construção, concluídas e aceitas;
- tempo entre início e conclusão de uma feature;
- quantidade de defeitos encontrados antes e depois da demonstração;
- percentual de features do MVP com critérios de aceitação validados;
- quantidade de pendências abertas por feature;
- cobertura de testes das regras críticas;
- tempo de resposta para dúvidas de negócio;
- riscos regulatórios e de segurança ainda não resolvidos.

Essas métricas devem apoiar decisões. Elas não devem ser usadas para comparar integrantes individualmente nem para incentivar a entrega de funcionalidades incompletas.

## 8. Vantagens e limites do FDD

### Vantagens

- aproxima o desenvolvimento do valor de negócio;
- facilita a divisão do trabalho em uma equipe pequena;
- torna o progresso mais visível;
- favorece entregas incrementais e demonstrações frequentes;
- cria rastreabilidade entre domínio, requisitos, código e testes;
- permite priorizar o MVP sem perder a visão geral do sistema.

### Limites e cuidados

- exige entendimento inicial razoável do domínio;
- pode virar apenas uma lista de tarefas se as features forem mal definidas;
- precisa de disciplina para realizar inspeções e atualizar a documentação;
- não fornece, sozinho, práticas detalhadas de testes, programação ou comunicação;
- pode concentrar conhecimento nos Líderes de Feature se não houver revisão cruzada;
- não substitui a validação ética, legal e de segurança necessária para dados de saúde.

## 9. Resumo prático

Para aplicar FDD no projeto:

1. compreender e registrar o domínio;
2. decompor o domínio em áreas, conjuntos e features pequenas;
3. escrever cada feature com ação, resultado e objeto;
4. priorizar o MVP;
5. planejar responsáveis, dependências e critérios de aceitação;
6. projetar uma feature por vez e inspecionar o design;
7. construir código, testes e documentação juntos;
8. revisar o código e promover somente o que estiver pronto;
9. demonstrar as features ao cliente;
10. registrar aceite, feedback e próximos ajustes.
