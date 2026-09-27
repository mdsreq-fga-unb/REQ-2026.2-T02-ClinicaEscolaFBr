# 8.3 Análise do Feedback da Verificação Cruzada

Esta seção registra a análise dos apontamentos feitos pela equipe **Sem Requisitos** na verificação cruzada dos requisitos funcionais (RFs) e não funcionais (RNFs), realizada entre 22/09 e 24/09/2026 ([cronograma da Unidade 2](../gestao/cronograma.md)). Cada apontamento foi analisado pelo integrante responsável pela CP correspondente, que corrigiu o requisito quando pertinente e registrou a decisão tomada, com a justificativa. As decisões são revisadas em conjunto pela equipe, com participação do monitor, antes da publicação da versão final.

As decisões seguem as categorias abaixo:

| Decisão                 | Significado                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Aceito**              | O apontamento procede e o requisito foi corrigido conforme o ajuste recomendado ou de forma equivalente.     |
| **Parcialmente aceito** | O apontamento procede em parte; parte do ajuste foi feita e o restante foi descartado ou depende da FBr.     |
| **Não aceito**          | O apontamento não procede; o requisito foi mantido, com a justificativa registrada.                           |
| **Não aplicável**       | A verificação não identificou problema no requisito ("OK"); nenhuma alteração foi necessária.                |

## Requisitos funcionais

### Agendamento, Confirmação e Remarcação (CP4)

| Requisito | Tipo apontado    | Decisão           | Justificativa e alteração realizada |
| --------- | ---------------- | ----------------- | ----------------------------------- |
| RF10      | Lacuna           | Aceito            | Sem horário de término não havia como verificar a sobreposição. A sessão passou a ter horário de início e término, com o término calculado pela duração padrão (parâmetro configurável pela coordenação, padrão de 50 minutos). A sobreposição foi definida como interseção dos intervalos, e sessões em sequência (término = início) foram explicitamente permitidas, com critérios de aceitação para os dois casos. |
| RF11      | OK               | Não aplicável     | Nenhum problema identificado. |
| RF12      | Inconsistência   | Aceito            | A descrição proibia a segunda remarcação e o critério a permitia com justificativa. Foi definido que o limite de uma remarcação a pedido do paciente admite exceção, que somente a coordenação pode aprovar, com registro da justificativa, do aprovador e da data/hora. Também foi explicitado que o reagendamento motivado pela ausência do estagiário (RF16/RF17) não conta para o limite do paciente. |
| RF13      | Verificabilidade | Aceito            | A antecedência passou a ser o parâmetro "antecedência do lembrete", configurável pela coordenação, com padrão de 24 horas. Foram definidos o comportamento para sessões agendadas com menos antecedência (envio imediato) e a aplicação do novo valor às sessões ainda não lembradas. O valor padrão será validado com a FBr. |
| RF14      | Verificabilidade | Aceito            | O prazo passou a ser o parâmetro "prazo de confirmação de presença", configurável pela coordenação, com padrão de até 12 horas antes da sessão, e os critérios de aceitação ganharam horários concretos. O valor padrão será validado com a FBr. |
| RF15      | Verificabilidade | Aceito            | A antecedência mínima passou a ser o parâmetro "antecedência mínima para cancelamento sem falta", configurável pela coordenação, com padrão de 24 horas. Os limites exatos foram definidos (igual ou maior que o mínimo: no prazo; menor: fora do prazo e conta como falta; após o início: não pode cancelar). O valor padrão será validado com a FBr. |
| RF16      | OK               | Não aplicável     | Nenhum problema identificado. |
| RF17      | OK               | Não aplicável     | Nenhum problema identificado. |

### Controle de Assiduidade e Alertas (CP9)

| Requisito | Tipo apontado             | Decisão             | Justificativa e alteração realizada |
| --------- | ------------------------- | ------------------- | ----------------------------------- |
| RF34      | OK                        | Não aplicável       | Nenhum problema identificado. O critério de aceitação foi apenas ajustado para não confundir "comparecimento" com a confirmação de presença do RF14 (ver ajustes de consistência). |
| RF35      | Inconsistência            | Aceito              | Mantida a regra confirmada pela Clínica Escola: duas faltas no ciclo de atendimento, consecutivas ou não. O título passou a "Contabilizar faltas do paciente no ciclo", e a descrição, os critérios, o modelo de domínio da CP9, a lista de features e o RNF32 foram uniformizados; o modelo de domínio não diz mais que a contagem é zerada por comparecimento. A ausência de confirmação (RF14) deixou de contar como falta, para não penalizar um paciente que compareceu sem confirmar. |
| RF36      | Inconsistência            | Aceito              | O gatilho do alerta foi alinhado à regra do RF35 (duas faltas no ciclo, consecutivas ou não). |
| RF37      | Escopo amplo e ambiguidade | Parcialmente aceito | A realocação foi retirada do requisito: não é automática e é confirmada pelo supervisor do estagiário ao vincular o novo paciente (RF21), após a distribuição pela coordenação (RF20), quando necessária. Desligamento e liberação da vaga foram mantidos no mesmo requisito, agora descritos como duas etapas distintas, porque a liberação é efeito automático do desligamento, sem ator nem decisão própria (RNF34); separá-los criaria um requisito sem interação do usuário. |
| RF38      | OK                        | Não aplicável       | Nenhum problema identificado. O critério da reversão com vaga não realocada foi ajustado para refletir o novo RF37 (restauração do vínculo e das sessões). |
| RF39      | OK                        | Não aplicável       | Nenhum problema identificado. |
| RF40      | Escopo amplo e lacuna     | Aceito              | Separado em três requisitos, espelhando a estrutura do controle de faltas do paciente: RF40 — Contabilizar faltas do estagiário no semestre; RF63 — Sinalizar reprovação do estagiário por faltas; RF64 — Registrar decisão institucional sobre a reprovação do estagiário. O encerramento da sinalização foi definido: ela termina quando a coordenação registra a decisão (reprovação confirmada ou não aplicada, com justificativa). Os novos requisitos receberam numeração a partir de RF63 para não alterar os IDs RF1–RF62 já usados na avaliação de valor de negócio da FBr e na pontuação de esforço. |

### Indicadores e Relatórios Institucionais (CP11)

| Requisito | Tipo apontado | Decisão | Justificativa e alteração realizada |
| --------- | ------------- | ------- | ----------------------------------- |
| RF48      | Ambiguidade   | Aceito  | Os indicadores foram classificados em "de posição" (vagas ocupadas e distribuição por supervisor), calculados na data de referência (fim da data final do intervalo, ou o momento da consulta quando a data final é hoje), e "de fluxo" (tempo médio de espera e taxa de evasão), calculados sobre todo o intervalo. Foram definidos a fórmula de cada indicador, o conceito de paciente em atendimento ativo, a precisão (uma casa decimal) e a origem do total de vagas ofertadas (capacidade registrada pela coordenação no RF9, sem estimativa quando ausente). |
| RF49      | Escopo amplo  | Aceito  | A apresentação em tela já era atendida pelo RF48, o que duplicava o escopo. O RF49 passou a tratar só da exportação ("Exportar relatório institucional em PDF"), com o conteúdo mínimo do arquivo definido. Os RNF47 e RNF48 foram ajustados à nova divisão. |

### Segurança, Sigilo e Controle de Acesso (CP12)

| Requisito | Tipo apontado  | Decisão             | Justificativa e alteração realizada |
| --------- | -------------- | ------------------- | ----------------------------------- |
| RF50      | OK             | Não aplicável       | Nenhum problema identificado. |
| RF51      | OK             | Não aplicável       | Nenhum problema identificado. |
| RF52      | Incompletude   | Aceito              | Foram definidos o formato e a validade do código (6 dígitos, 10 minutos, uso único), o limite de tentativas (5 por código), a regra de reenvio (após 60 segundos, invalidando o anterior), o bloqueio contra solicitações abusivas (3 códigos por identificador em 60 minutos, com bloqueio de 60 minutos) e as mensagens genéricas. Os valores são uma proposta técnica da equipe e passam a ser a referência do RNF6 (CP3). |
| RF53      | Lacuna         | Aceito              | Foi declarado o fluxo de convite e ativação: o usuário é criado como "pendente de ativação", recebe por e-mail um link de uso único válido por 72 horas, define a própria senha (conforme o RNF49) e só então consegue se autenticar. A coordenação pode reenviar o convite e nunca define nem vê a senha. |
| RF54      | OK             | Não aplicável       | Nenhum problema identificado. |
| RF55      | Rastreabilidade | Aceito             | As referências foram corrigidas: o prontuário (CP6) reúne os registros de evolução (CP7) e o relatório final (CP8). A regra de acesso não foi alterada. |
| RF56      | OK             | Não aplicável       | Nenhum problema identificado. |
| RF57      | Incompletude   | Parcialmente aceito | A revogação foi declarada em um novo requisito, RF65 — Registrar revogação do consentimento, com efeitos (saída da fila, bloqueio de agendamentos e comunicações, sinalização para encerramento do atendimento) e retenção (guarda mínima de 5 anos do registro documental, Resolução CFP nº 1/2009, e LGPD, art. 16, I). O termo passou a informar o prazo de guarda e a forma de revogação. Não foi possível atender integralmente: a base legal (consentimento, art. 11, I, ou tutela da saúde, art. 11, II, "f", da LGPD) depende da FBr, como controladora, e ficou registrada como pendência; até lá, o sistema adota o cenário mais restritivo (consentimento revogável). Os demais direitos do art. 18 foram declarados fora do escopo atual, atendidos pelo canal institucional da FBr, até que a FBr indique o contrário. |

### Acessibilidade e Usabilidade (CP14)

| Requisito | Tipo apontado | Decisão       | Justificativa e alteração realizada |
| --------- | ------------- | ------------- | ----------------------------------- |
| RF61      | OK            | Não aplicável | Nenhum problema identificado. |
| RF62      | OK            | Não aplicável | Nenhum problema identificado. |

### Ajustes de consistência decorrentes (CP4, CP9, CP11 e CP12)

As correções acima exigiram ajustes em requisitos que não tinham apontamento, para manter o conjunto coerente:

- **RF14 e RF34:** a ausência de confirmação de presença passou a apenas sinalizar a sessão para a secretaria, sem gerar falta; o critério do RF34 deixou de usar "confirmação de comparecimento", que se confundia com a confirmação do RF14.
- **RF38:** a reversão de um desligamento cuja vaga ainda não foi realocada passou a restaurar o vínculo com o estagiário e a indicar o reagendamento das sessões canceladas, coerente com o novo RF37.
- **RF39:** a referência à sinalização de reprovação passou a apontar para o RF63.
- **RNF32:** o texto e a rastreabilidade foram alinhados à contagem de faltas no ciclo e aos eventos que a originam (RF34 e RF15).
- **RNF35:** a restrição de visibilidade foi estendida à contagem (RF40), à sinalização (RF63) e à decisão (RF64).
- **RNF47 e RNF48:** alinhados à separação entre a consulta em tela (RF48) e a exportação em PDF (RF49).

### Pendências de validação com a FBr

- Valores padrão dos parâmetros de agendamento da CP4: duração da sessão (50 minutos), antecedência do lembrete (24 horas), prazo de confirmação (12 horas) e antecedência mínima para cancelamento sem falta (24 horas).
- Base legal do tratamento dos dados de saúde (RF57) e canal de atendimento dos demais direitos do titular.
