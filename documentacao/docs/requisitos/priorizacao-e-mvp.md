---
render_macros: true
---

# 10. Backlog de Produto

!!! abstract "Na estrutura de requisitos"
    Esta página tem as regras de priorização e de recorte do MVP e o catálogo de requisitos, de onde saem as tabelas desta página, do backlog e da situação por ciclo. Como as informações se ligam e são atualizadas: [Organização e atualização](../visao-geral/organizacao-e-atualizacao.md).

## 10.1 Backlog do Produto

O backlog reúne os **itens de trabalho** do produto. Cada item corresponde a uma **feature**, que declara um requisito funcional (RF) e é restringida pelos RNFs da classificação da seção [10.2.3.1](#10231-classificacao-dos-requisitos-nao-funcionais-para-o-mvp). O pertencimento ao MVP vem da priorização da seção [10.2](#102-priorizacao-e-recorte-do-mvp), validada com a Clínica Escola FBr, e das decisões posteriores do [Registro de Decisões com a FBr](decisoes-fbr.md).

O backlog é mantido em um só lugar, na Visão geral do projeto: [Features e backlog](../visao-geral/backlog.md). Lá estão a ordem de construção, o ciclo, o Líder de Feature, as dependências e a issue de cada feature, as features para versões posteriores e a lista de features por área e conjunto do FDD. O estado de cada feature no FDD é acompanhado na sua issue e no [Project do repositório](https://github.com/orgs/mdsreq-fga-unb/projects/124), e os atributos de cada requisito ficam no [catálogo de requisitos](#catalogo-de-requisitos).

!!! note "Nota de revisão (25/10/2026)"
    Até a versão 3.7, esta seção trazia o mapa do escopo (10.1.1), os itens de trabalho do MVP (10.1.2) e os itens para versões posteriores (10.1.3). As três tabelas passaram para a página Features e backlog, com o mesmo conteúdo; o estado de cada feature passou a ser acompanhado nas issues e no Project.

### Catálogo de requisitos { #catalogo-de-requisitos }

Os atributos de cada requisito ficam num só registro, no catálogo [`documentacao/dados/requisitos.yml`](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/blob/development/documentacao/dados/requisitos.yml): CP, valor de negócio, esforço, decisão de MVP, ciclo, Líder de Feature, dependências, issue, estado da feature e origem nas decisões com a FBr. A declaração e os critérios de aceitação continuam nas páginas [8.1](funcionais.md) e [8.2](nao-funcionais.md).

As visões abaixo são geradas do catálogo a cada publicação do site, e não são editadas à mão:

- nesta página, a tabela consolidada (10.2.1.4), a matriz de priorização (10.2.2), a definição do MVP (10.2.3), a classificação dos RNFs (10.2.3.1) e as contagens;
- em [Features e backlog](../visao-geral/backlog.md), a situação por ciclo, o backlog de cada ciclo, as versões posteriores e as features por área e conjunto;
- nas páginas [8.1](funcionais.md) e [8.2](nao-funcionais.md), os índices e, em cada requisito, a Origem e as linhas "Prioridade" e "Entrega e situação";
- no [Registro de Decisões](decisoes-fbr.md), a coluna "Requisitos" de cada decisão.

Uma mudança de nome, valor, esforço, ciclo ou estado é feita uma vez, no catálogo, na mesma PR que muda o requisito. O estado da feature é copiado da issue para o catálogo na PR que o muda. O docs-check confere, a cada PR, se o catálogo e as páginas 8.1 e 8.2 têm os mesmos requisitos com os mesmos nomes e se as decisões citadas existem.

_Catálogo atualizado em {{ catalogo_atualizado_em }}: {{ n.rfs }} RFs registrados ({{ n.rfs_vigentes }} vigentes), {{ n.rnfs }} RNFs registrados ({{ n.rnfs_vigentes }} vigentes) e {{ n.decisoes }} decisões com a FBr._

## 10.2 Priorização e Recorte do MVP

### 10.2.1 Avaliação de Valor de Negócio e de Esforço Técnico

#### 10.2.1.1 Escala e critérios de valor de negócio

O valor de negócio de cada RF foi avaliado pela Clínica Escola FBr — Karla (secretaria) e Robson (coordenador do curso de Psicologia) —, a partir de um rascunho inicial preenchido pela equipe como ponto de partida, conforme alinhado na reunião de 24/09/2026 (ver [Reuniões da Unidade 2](../historico/unidade-2/reunioes.md)), e revisado com Thiago Cardoso Viana (Diretor Financeiro e de Tecnologia) na validação do MVP (seção [10.2.4](#1024-validacao-do-mvp-com-o-cliente)), que trouxe para a avaliação os critérios institucionais e de operação da clínica — como a continuidade do atendimento quando um estagiário se afasta e os relatórios prestados ao MEC. A escala adotada segue o método MoSCoW, com cada categoria associada a uma pontuação mensurável de 1 a 4, de significado claramente definido:

| Pontuação | Classificação | Interpretação |
| --- | --- | --- |
| 4 | Must have | Indispensável para resolver o problema central ou viabilizar o produto |
| 3 | Should have | Muito importante, mas o produto ainda pode operar temporariamente sem o requisito |
| 2 | Could have | Agrega valor, mas pode ser adiado sem comprometer o objetivo principal |
| 1 | Won't have now | Não é prioritário para a versão atual |

A atribuição de cada nota não ficou restrita à etiqueta MoSCoW isolada: para cada RF, a Clínica Escola registrou uma justificativa em frase curta explicando o porquê da nota. Lidas em conjunto, essas justificativas apontam para critérios recorrentes — a importância do requisito para o problema central do projeto (as falhas de agendamento e de confirmação de presença que hoje produzem horários ociosos), a contribuição para os objetivos específicos da [Solução Proposta](../produto/solucao-proposta.md#22-objetivos-especificos-oe-do-produto), o impacto percebido por pacientes, estagiários e supervisores, e a dependência de outras funcionalidades já priorizadas — mas não seguiram um checklist formal aplicado requisito a requisito. As justificativas individuais estão registradas por RF na coluna "Justificativa do cliente" da tabela consolidada ([10.2.1.4](#10214-tabela-consolidada)).

#### 10.2.1.2 Escalas adotadas

Foram mantidas as três escalas propostas pela disciplina, todas orientadas no mesmo sentido (quanto maior a pontuação, maior o custo ou o risco).

**Esforço necessário para implementação**

| Pontuação | Interpretação | Descrição |
| --- | --- | --- |
| 1 | Esforço baixo | até 2 horas |
| 2 | Esforço moderado | entre 2 e 6 horas |
| 3 | Esforço alto | entre 6 e 12 horas |
| 4 | Esforço muito alto | mais de 12 horas |

O esforço considera o desenvolvimento completo do requisito — persistência, regra de negócio, serviço de aplicação, interface e testes —, conforme o fluxo de construção por feature adotado pela equipe.

**Complexidade técnica**

| Pontuação | Interpretação |
| --- | --- |
| 1 | Utiliza solução conhecida, com poucas dependências |
| 2 | Exige alguma investigação ou integração |
| 3 | Possui várias dependências ou incertezas técnicas |
| 4 | Apresenta elevada incerteza, integração crítica ou tecnologia não dominada |

**Lacuna de capacidade da equipe**

| Pontuação | Interpretação |
| --- | --- |
| 1 | A equipe domina plenamente os conhecimentos necessários |
| 2 | A equipe possui conhecimento suficiente, com pouca aprendizagem adicional |
| 3 | A equipe precisa desenvolver conhecimentos relevantes |
| 4 | A equipe ainda não possui os conhecimentos ou recursos necessários |

#### 10.2.1.3 Regra de consolidação

O esforço técnico consolidado de cada requisito é a média aritmética simples dos três critérios:

```
Esforço técnico = (esforço + complexidade + lacuna de capacidade) / 3
```

Regras definidas previamente e aplicadas de forma uniforme a todos os requisitos:

1. O resultado é apresentado com **uma casa decimal**, com arredondamento matemático padrão (2,666… → 2,7).
2. **Nenhum critério recebe peso maior que os outros.** A equipe considerou ponderar a lacuna de capacidade, mas optou pela média simples para manter a regra previsível e auditável ao longo de todas as CPs.
3. O valor decimal é o valor de referência. Quando for necessário convertê-lo para a escala de 1 a 4 (por exemplo, para posicionar o requisito na matriz 4 × 4), aplica-se o arredondamento para o inteiro mais próximo, com 0,5 arredondado para cima.
4. A avaliação considerou a **descrição completa** de cada requisito, seus critérios de aceitação, suas dependências declaradas e as restrições transversais indicadas na rastreabilidade — não apenas o nome do requisito.

#### 10.2.1.4 Tabela consolidada

{{ tabela_consolidada() }}

### 10.2.2 Matriz de Priorização (Valor de Negócio × Esforço Técnico)

A matriz cruza o valor de negócio de cada RF (1 a 4, atribuído pela Clínica Escola FBr — ver [10.2.1.1](#10211-escala-e-criterios-de-valor-de-negocio)) com o esforço técnico consolidado, convertido para a escala inteira de 1 a 4 pela regra 3 da seção [10.2.1.3](#10213-regra-de-consolidacao) (arredondamento para o inteiro mais próximo, com 0,5 para cima). Os {{ n.rfs_vigentes }} RFs vigentes (RF1 a {{ n.ultimo_rf }}, sem os removidos) estão distribuídos na matriz abaixo, dividida nos quatro quadrantes apresentados pelo professor na atividade: **Quick wins** (valor alto, esforço baixo), **Grandes projetos** (valor alto, esforço alto), **Preenchimento** (valor baixo, esforço baixo) e **Tarefas ingratas** (valor baixo, esforço alto).

<div class="prio-matrix-estatica" markdown>

{{ matriz() }}

RFs em itálico ficam fora do MVP; os demais estão no recorte do MVP.

</div>

A matriz é gerada a partir do [catálogo de requisitos](#catalogo-de-requisitos), o mesmo das tabelas 10.2.1.4 e 10.2.3: uma mudança de valor ou de esforço aparece nas três de uma vez. No site, ela aparece também em versão interativa, em que os pontos azuis compõem o recorte do MVP definido na seção 10.2.3 e os laranja ficam para uma versão posterior. Dentro de cada célula (mesmo valor e mesmo esforço), os RFs aparecem em ordem numérica, sem ordem adicional de prioridade. A tabela completa com o valor, o esforço e a decisão de MVP de cada RF, célula a célula, está detalhada na seção 10.2.3 a seguir.

### 10.2.3 Definição do MVP

O corte de MVP foi definido a partir da própria escala de valor de negócio usada na avaliação com a Clínica Escola FBr, que segue o MoSCoW (4 — *Must have*, indispensável; 3 — *Should have*, o sistema opera um tempo sem isso; 2 — *Could have*, agrega valor mas pode esperar; 1 — *Won't have now*, não é prioridade para esta versão). O esforço técnico entra como critério de desempate dentro de cada faixa de valor, para não inflar o MVP com itens caros que o próprio valor de negócio já qualifica como adiáveis:

1. **Valor 4 (Must have):** entra no MVP independentemente do esforço técnico. Por definição, o sistema não funciona sem esses requisitos.
2. **Valor 1 (Won't have now):** fica fora do MVP independentemente do esforço técnico, porque o próprio cliente já definiu que não é prioridade para esta versão.
3. **Valor 3 (Should have):** entra no MVP somente com esforço técnico baixo ou moderado (1 ou 2). Com esforço alto ou muito alto (3 ou 4), fica para depois — o sistema consegue operar um tempo sem esses requisitos, e não vale o risco de entregar algo caro que não é indispensável.
4. **Valor 2 (Could have):** entra no MVP somente com esforço técnico muito baixo (1), quando o custo de entregar já é praticamente o de não entregar. Com esforço 2 ou mais, fica para depois.
5. **Exceção por dependência funcional:** um requisito que a regra 3 ou 4 excluiria pode ser promovido ao MVP quando outros requisitos já incluídos dependem diretamente dele para formar um fluxo de uso minimamente completo — situação prevista no enunciado da atividade ("Um RF de alto valor e alto esforço não deve ser automaticamente descartado" e a necessidade de "formar um fluxo de uso minimamente completo"). Essa exceção foi aplicada uma vez:

| RF promovido | Classificação pelas regras 1–4 | RFs do MVP que dependem dele | Por que o fluxo não fecha sem ele |
| --- | --- | --- | --- |
| [RF10](funcionais.md#rf10) — Agendar sessão do paciente | Should have, esforço alto (fora pela regra 3) | RF11, RF14, RF15, RF16, RF17 e RF43 | Os seis requisitos pressupõem uma sessão previamente agendada, sem a qual não têm sobre o que operar. |

**Inclusão a pedido do cliente:** o [RF33](funcionais.md#rf33) — Gerar relatório final de evolução, *Should have* de esforço alto (fora pela regra 3), entrou no MVP em 24/10/2026. Na validação do MVP ([10.2.4](#1024-validacao-do-mvp-com-o-cliente)), a FBr pediu o relatório pronto antes do fim do semestre, e o requisito já estava completamente especificado. Ele é construído no Ciclo 6, até 01/12/2026, junto com a reprovação do estagiário (RF63/RF64).

**Limite de capacidade**{ #limite-de-capacidade }

A regra 1 diz o que entra no MVP pelo valor, mas não garante que caiba no prazo. Por isso, a capacidade da equipe é conferida ciclo a ciclo, pela [carga por Líder de Feature e ciclo](../visao-geral/cronograma.md#carga-por-lider-de-feature-e-ciclo), e, no fechamento de cada ciclo, pelo que foi realizado. Quando as features de valor 4 de um ciclo passam do que a equipe consegue construir, inspecionar e testar, a equipe resolve nesta ordem:

1. **Redistribuição:** a feature passa para outro integrante do mesmo ciclo, sem mudar o escopo nem o prazo (foi o que aconteceu no Ciclo 3, quando as features da Maria Clara foram construídas pelo Gabriel).
2. **Versão menor da capacidade:** a feature entra com uma entrega parcial, registrada no catálogo e combinada com a FBr, como a vaga liberada do RF37, que mostra o próximo inscrito elegível só quando a fila de espera do RF7 existir.
3. **Prazo:** a feature passa para o ciclo seguinte, com o motivo e o impacto registrados no fechamento do ciclo.
4. **Escopo:** só depois das três anteriores, a equipe leva à FBr a saída de uma feature do MVP, que fica registrada como decisão no [Registro de Decisões com a FBr (8.4)](decisoes-fbr.md).

<details class="revision-note" markdown>
<summary>Por que os demais RFs fora do MVP não foram promovidos</summary>

Nenhum outro RF excluído pelas regras 1–4 tem essa mesma condição de bloqueio: os demais RFs fora do MVP ({{ lista_fora_do_mvp() }}) são consultas, refinamentos ou fluxos que os RFs do MVP não pressupõem como pré-condição de existir. Em particular, a rastreabilidade do RF6 (CP2) separa o RF4 como dependência e o RF5 como apoio opcional: a própria RF6 descreve a classificação como julgamento clínico apoiado nas "informações e sinalizações disponíveis", e as informações organizadas por RF4 (no MVP) já bastam para essa decisão, com a sinalização automática de RF5 como reforço opcional. Da mesma forma, o RF13 (lembrete automático) aparece como integração na rastreabilidade do RF14, mas o link de confirmação de presença é enviado ao paciente no próprio agendamento (RF10), e o lembrete apenas o reforça; e o RF12 (remarcação em uma única operação) pode ser suprido por cancelamento (RF15/RF16) seguido de novo agendamento (RF10), sem contar falta. Em nenhum desses casos a ausência do RF fora do MVP deixa um RF do MVP sem nada sobre o que operar — ao contrário de RF10, cuja ausência impede por completo a execução dos RFs do MVP que dependem dele.

</details>

{% set c = composicao_mvp %}Aplicando o critério aos {{ n.rfs_vigentes }} RFs vigentes (RF1 a {{ n.ultimo_rf }}{% if n.rfs_removidos_texto %}, {{ n.rfs_removidos_texto }}{% endif %}): **{{ n.rfs_mvp }} entram no MVP** e **{{ n.rfs_posteriores }} ficam para uma versão posterior** — {{ c.dentro.must }} por serem *Must have*, {{ c.dentro.should_baixo }} *Should have* de baixo esforço, {{ c.dentro.dependencia }} *Should have* de esforço alto promovido por dependência (RF10), {{ c.dentro.pedido }} *Should have* de esforço alto incluído a pedido da FBr (RF33) e {{ c.dentro.could }} *Could have* de esforço mínimo; dos {{ n.rfs_posteriores }} de fora, {{ c.fora.should }} são *Should have* de esforço alto, {{ c.fora.could }} são *Could have* de esforço moderado/alto e {{ c.fora.wont }} são *Won't have now*.

A tabela abaixo aplica o critério requisito a requisito, mantendo a rastreabilidade entre CP, valor de negócio, esforço técnico e a decisão:

{{ tabela_mvp() }}

**Este é o recorte do MVP validado com a Clínica Escola FBr**, conforme o registro da seção [10.2.4](#1024-validacao-do-mvp-com-o-cliente). A classificação dos RNFs para o MVP, na subseção [10.2.3.1](#10231-classificacao-dos-requisitos-nao-funcionais-para-o-mvp) a seguir, já reflete este recorte de {{ n.rfs_mvp }} RFs, incluindo a promoção de RF10 por dependência. Os pontos ainda em aberto com a FBr estão registrados em [Pendências de validação com a FBr](analise-feedback.md#pendencias-de-validacao-com-a-fbr).

#### 10.2.3.1 Classificação dos Requisitos Não Funcionais para o MVP

A classificação abaixo relaciona cada Requisito Não Funcional (RNF) ao recorte do MVP definido acima, usando quatro categorias:

<div class="category-grid" markdown>

- <span class="rnf-class rnf-class--required">Obrigatório para o MVP</span> Aplica-se independentemente do RF específico, por decorrer de exigência transversal de segurança, privacidade, acessibilidade, integridade ou continuidade operacional.
- <span class="rnf-class rnf-class--linked">Associado a RF do MVP</span> Sua aplicabilidade decorre diretamente de um RF que está no MVP.
- <span class="rnf-class rnf-class--evolving">Evolutivo</span> O RF relacionado está no MVP, e o RNF tem um **patamar mínimo obrigatório para o lançamento**, verificado no DoD da feature. O que pode ser refinado em iterações posteriores é só o que está indicado na tabela de patamares abaixo: a calibração da meta com dados de uso real, a ampliação da amostra dos testes ou uma exigência adicional.
- <span class="rnf-class rnf-class--na">Não aplicável ao MVP</span> Depende de um RF que ficou fora do recorte atual, a ser reavaliado se esse RF for incorporado.

</div>

A classificação foi conferida requisito a requisito contra os {{ n.rfs_mvp }} RFs selecionados na tabela acima — inclusive a promoção de RF10 por dependência.

{{ tabela_rnfs() }}


##### Patamar mínimo de lançamento dos RNFs evolutivos

Adiar o refinamento de uma meta não significa lançar sem ela. A tabela define, para cada RNF evolutivo, o patamar verificado antes do lançamento, no DoD da feature (critério D4.5), e o que fica para iterações posteriores.

| RNF | Patamar mínimo para o lançamento | O que pode ser refinado depois |
| --- | --- | --- |
| [RNF12](nao-funcionais.md#rnf12) | Meta de 2 segundos no percentil 95, verificada uma vez no teste de carga do cenário de referência, no ambiente de homologação. | Recalibrar a meta e a carga de referência com as medições do uso real. |
| [RNF14](nao-funcionais.md#rnf14) | Antes da integração (D4.5): monitor externo configurado para consultar a página de agendamento a cada minuto do horário comercial, com a detecção de falha (sem resposta em 10 segundos ou erro do servidor) e o cálculo da fórmula do RNF conferidos no ambiente de homologação. O relatório do primeiro mês completo não faz parte do D4.5, porque só existe depois do lançamento: é o primeiro acompanhamento da meta, e um resultado abaixo de 99% abre correção no ciclo seguinte. | Ajustar a meta de 99% e a janela de manutenção com o histórico de disponibilidade. |
| [RNF21](nao-funcionais.md#rnf21) | Meta de 3 segundos no percentil 95, verificada uma vez no cenário de referência do RNF12. | Recalibrar a meta com massa de dados real. |
| [RNF22](nao-funcionais.md#rnf22) | Teste de tarefa com pelo menos 3 participantes por perfil (coordenação e supervisor), sem ajuda, todos concluindo a distribuição em até 3 interações. | Ampliar a amostra para 5 participantes por perfil e a taxa de 90% do RNF. |
| [RNF29](nao-funcionais.md#rnf29) | Meta de 2 segundos no percentil 95, verificada uma vez no cenário de referência do RNF. | Recalibrar a meta com as medições do uso real. |
| [RNF30](nao-funcionais.md#rnf30) | Teste de tarefa com pelo menos 3 estagiários, sem ajuda, todos registrando a evolução em até 3 minutos e 6 interações. | Ampliar a amostra para 10 estagiários e a taxa de 90% do RNF. |
| [RNF40](nao-funcionais.md#rnf40) | Meta de 5 segundos no percentil 95, verificada uma vez no cenário de referência do RNF12. | Recalibrar a meta com as medições do uso real. |
| [RNF41](nao-funcionais.md#rnf41) | Teste de tarefa com pelo menos 3 participantes por público (secretaria e pacientes ou responsáveis), sem ajuda, todos emitindo a declaração em até 3 interações. | Ampliar a amostra para 5 participantes por público e a taxa de 90% do RNF. |
| [RNF57](nao-funcionais.md#rnf57) | Indicador de foco visível em todos os elementos interativos das páginas externas, com contorno de pelo menos 2 pixels (RNF56, nível AA). | Contraste de 3:1 entre os estados com e sem foco e a verificação no alto contraste (RF61) e nos tamanhos de texto (RF62), quando essas features forem construídas. |

### 10.2.4 Validação do MVP com o Cliente

A validação do MVP com a Clínica Escola FBr foi feita por mensagens no grupo de WhatsApp "Sistema Clínica Escola FBr - Alunos UnB", canal de contato com o cliente previsto na [seção 7.2 — Comunicação com o Cliente](../processo/equipe-e-cliente.md#comunicacao-com-o-cliente), entre 24/09/2026 e 08/10/2026, em duas rodadas. As respostas da FBr foram incorporadas aos requisitos e à priorização apresentados nas seções [10.2.1](#1021-avaliacao-de-valor-de-negocio-e-de-esforco-tecnico) a [10.2.3](#1023-definicao-do-mvp).

- **Quem participou:** pela Clínica Escola FBr, **Robson Luís de Araújo** (coordenador do curso de Psicologia, responsável pela Clínica Escola) e **Thiago Cardoso Viana** (Diretor Financeiro e de Tecnologia; ver [Mapa de Stakeholders](../produto/cenario-atual.md#16-mapa-de-stakeholders)); pela equipe, **Gabriel Barbaceli** e **Jônatas**, com os demais integrantes acompanhando o grupo.
- **Quando ocorreu:** em duas rodadas — de 24/09 a 02/10/2026, sobre a primeira proposta de MVP, e de 06/10 a 08/10/2026, sobre a proposta revisada, aprovada por Thiago em 07/10 ("Olhei a proposta e tá ok, podem seguir") e encerrada em 08/10 ("Certo, vamos em frente!"). A linha do tempo completa da conversa e as capturas de tela estão em [Reuniões da Unidade 2 — Validação do MVP com a Clínica Escola FBr](../historico/unidade-2/reunioes.md#validacao-do-mvp-com-a-clinica-escola-fbr).
- **RFs aprovados para o MVP (08/10/2026):** os 53 RFs assinalados "Sim" na tabela da seção [10.2.3](#1023-definicao-do-mvp) naquela data, incluindo os novos RF66, RF67 e RF68. Em 24/10/2026, o RF66 foi dividido, e o registro da anamnese e do contrato passou ao RF69, que herda a classificação do RF66; no mesmo dia, o RF33 entrou no MVP a pedido da FBr, e o RF19 foi removido por decisão da FBr, e o MVP passou a ter 54 RFs.
- **RNFs aplicáveis ao MVP:** os RNFs classificados como "Obrigatório para o MVP", "Associado a RF do MVP" ou "Evolutivo" na seção [10.2.3.1](#10231-classificacao-dos-requisitos-nao-funcionais-para-o-mvp), que acompanham os RFs aprovados.
- **Requisitos que ficaram para entregas futuras:** os RFs assinalados "Não" na seção [10.2.3](#1023-definicao-do-mvp) — na validação, RF3, RF5, RF9, RF12, RF13, RF24, RF26, RF33, RF46, RF47, RF58, RF59, RF60, RF61 e RF62; desde 24/10/2026, sem o RF33, que entrou no MVP — e os RNFs classificados como "Não aplicável ao MVP". A continuidade de casos entre semestres (RF58 a RF60) será tratada caso a caso pela transferência de caso (RF25) nesta primeira versão.
- **Ajustes solicitados pelo cliente:**
    1. Com o RF5 fora do MVP, a triagem deve ter um prazo máximo após a inscrição, configurável como parâmetro, com o valor a ser definido pela coordenação ([RF4](funcionais.md#rf4)), e o formulário de inscrição deve exibir um aviso fixo com os contatos do CVV (188) e do SAMU (192) ([RF1](funcionais.md#rf1)).
    2. Com o RF26 fora do MVP, a transferência de caso deve gravar quem transferiu, o responsável anterior, o novo responsável, a data/hora e o motivo ([RF25](funcionais.md#rf25)).
    3. Sem o RF12, o cancelamento feito para remarcar uma sessão não conta como falta nem do paciente nem do estagiário ([RF15](funcionais.md#rf15), [RF16](funcionais.md#rf16)).
    4. A correção de evolução deve guardar a versão original ([RF29](funcionais.md#rf29), [RNF28](nao-funcionais.md#rnf28)).
    5. O apoio manual à inscrição, enquanto o RF3 não for implementado, é feito pela recepção preenchendo o mesmo formulário do sistema, para que a pessoa entre na mesma fila ([RF3](funcionais.md#rf3), [RF1](funcionais.md#rf1)).
- **Decisões ou divergências registradas:** não ficaram divergências em aberto. Ficaram dois pontos para definição posterior, registrados em [Pendências de validação com a FBr](analise-feedback.md#pendencias-de-validacao-com-a-fbr): (a) o valor do prazo máximo para triagem, a ser definido pela coordenação; e (b) a data de entrega do relatório final de evolução (RF33). O RF33 fica fora do MVP, mas a FBr pediu que fique pronto antes do fim do semestre, junto com a reprovação do estagiário (RF63/RF64, no MVP, com implementação prevista para mais perto do fim do semestre). A data será combinada quando o cronograma da fase de construção estiver detalhado. Em 24/10/2026, com o cronograma detalhado, o RF33 entrou no MVP, no Ciclo 6, com entrega até 01/12/2026, antes do fim do semestre, junto com o RF63 e o RF64. Para que a confirmação de presença (RF14) não dependa do lembrete automático (RF13), o link de confirmação passou a ser enviado no próprio agendamento (RF10).
