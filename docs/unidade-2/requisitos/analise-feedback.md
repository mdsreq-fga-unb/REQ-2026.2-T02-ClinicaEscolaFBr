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

### Inscrição on-line (CP1)

| Requisito | Tipo apontado  | Decisão       | Justificativa e alteração realizada |
| --------- | -------------- | ------------- | ----------------------------------- |
| RF1       | Inconsistência | Aceito        | Foram incluídos telefone celular e e-mail, com exigência de ao menos um canal válido e indicação do canal preferencial. Também foram definidos no formulário os campos de triagem usados pelo RF4: queixa, percepção de urgência e histórico relevante informado. |
| RF2       | OK             | Não aplicável | Nenhum problema identificado. |
| RF3       | OK             | Não aplicável | Nenhum problema identificado. |

### Triagem e Sinalização de Casos (CP2)

| Requisito | Tipo apontado  | Decisão | Justificativa e alteração realizada |
| --------- | -------------- | ------- | ----------------------------------- |
| RF4       | Ambiguidade    | Aceito  | A condição aberta foi eliminada: queixa, percepção de urgência e histórico relevante passaram a ser campos definidos no RF1 e são apresentados na triagem. |
| RF5       | Verificabilidade | Aceito | As regras de sinalização passaram a exigir versão identificada, data de vigência, aprovação da coordenação e histórico de publicação. Na ausência de regra vigente, o sistema apresenta as respostas sem produzir sinalização automática. |
| RF6       | Clareza        | Aceito  | Os perfis autorizados foram definidos como supervisor e coordenação, e a apresentação textual dos critérios vermelho/amarelo/verde passou de opcional para obrigatória, sem sugestão automática de cor. |

### Fila de Espera e Consulta de Posição (CP3)

| Requisito | Tipo apontado      | Decisão       | Justificativa e alteração realizada |
| --------- | ------------------ | ------------- | ----------------------------------- |
| RF7       | OK                 | Não aplicável | Nenhum problema identificado. |
| RF8       | Redundância parcial | Aceito       | O RF8 foi reduzido ao fluxo funcional da consulta e passou a referenciar o RF52 para verificação de identidade e os RNF6/RNF7 para privacidade e comunicação, sem repetir essas regras. |
| RF9       | Lacuna             | Aceito        | A feature passou a permitir que a coordenação cadastre, revise e publique o conteúdo institucional da fila, preservando versões anteriores e expondo ao público apenas a versão vigente. |

### Prontuário Eletrônico (CP6)

| Requisito | Tipo apontado  | Decisão | Justificativa e alteração realizada |
| --------- | -------------- | ------- | ----------------------------------- |
| RF27      | Verificabilidade | Aceito | Foi definido o conjunto mínimo verificável do prontuário: identificação do paciente, caso e ciclo; responsáveis; sessões; evoluções com correções e complementos; e relatório final, quando existente. |

### Registro de Evolução por Sessão (CP7)

| Requisito | Tipo apontado | Decisão       | Justificativa e alteração realizada |
| --------- | ------------- | ------------- | ----------------------------------- |
| RF28      | OK            | Não aplicável | Nenhum problema identificado. |
| RF29      | Inconsistência | Aceito       | O motivo passou a ser obrigatório em toda correção, alinhando o RF29 ao RNF28. |
| RF30      | OK            | Não aplicável | Nenhum problema identificado. |
| RF31      | Incompletude  | Aceito        | A consulta de uma sessão passou a apresentar o original, todas as correções e todos os complementos, distinguindo revisão de conteúdo de informação adicional. |
| RF32      | Incompletude  | Aceito        | O histórico consolidado passou a exigir original, correções e complementos por sessão, com tipo, autor, data/hora e ordem cronológica. |

### Geração do Relatório Final de Evolução (CP8)

| Requisito | Tipo apontado | Decisão | Justificativa e alteração realizada |
| --------- | ------------- | ------- | ----------------------------------- |
| RF33      | Incompletude  | Aceito  | Foram detalhados os campos obrigatórios, estados, versionamento, submissão, devolução, aprovação, assinatura manuscrita, geração em PDF, impressão pela secretaria e entrega presencial ao paciente ou responsável. |

### Continuidade de Casos entre Semestres (CP13)

| Requisito | Tipo apontado | Decisão | Justificativa e alteração realizada |
| --------- | ------------- | ------- | ----------------------------------- |
| RF58      | Ambiguidade   | Aceito  | O marco temporal passou a ser definido por datas de início do planejamento e de encerramento configuradas pela coordenação para cada semestre; também foi declarada a marcação do desligamento futuro do estagiário. |
| RF59      | Incompletude  | Aceito  | Foi declarado o fluxo de correção: somente a coordenação pode corrigir, com motivo, versionamento e tratamento explícito dos efeitos sobre transferências pendentes ou já efetivadas. |
| RF60      | Ambiguidade   | Aceito  | A transferência passou a depender de confirmação explícita da coordenação na data de encerramento ou depois dela; a passagem da data, sozinha, não altera o responsável. |

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

### Distribuição de Casos entre Supervisores e Estagiários (CP5)

| Requisito | Tipo apontado  | Decisão             | Justificativa e alteração realizada |
| --------- | -------------- | ------------------- | ----------------------------------- |
| RF18      | OK             | Não aplicável       | Nenhum problema identificado. |
| RF19      | OK             | Não aplicável       | Nenhum problema identificado. |
| RF20      | Lacuna         | Aceito              | A área de especialidade exigida pelo caso passou a ser registrada pela equipe clínica no mesmo momento em que confirma a prioridade (RF6, CP2), tornando-se a origem consumida pela distribuição; quando nenhuma área é indicada, o caso pode ser distribuído a qualquer supervisor compatível. O modelo de domínio da CP2, o RF6 e a rastreabilidade do RF20 foram atualizados. |
| RF21      | Lacuna         | Parcialmente aceito | "Estagiário ativo no semestre" passou a ser definido como o estagiário com conta institucional ativa (RF53/RF54), condição já registrada e testável. A gestão de semestres letivos e do vínculo acadêmico do estagiário com a instituição de ensino permanece fora do escopo do sistema, que trata apenas do acesso institucional controlado pela coordenação. |
| RF22      | Inconsistência | Aceito              | A descrição foi ajustada para incluir estagiário e supervisor entre os perfis que consultam os responsáveis pelo caso, alinhando-a ao critério de aceitação já existente. |
| RF23      | Verificabilidade | Aceito            | Foram acrescentados critérios de aceitação para a consulta do supervisor (casos próprios e dos estagiários sob sua supervisão) e para a tentativa de consulta sem vínculo com o caso, que passa a ser negada. |
| RF24      | OK             | Não aplicável       | Nenhum problema identificado. |
| RF25      | Ambiguidade    | Aceito              | A transferência foi delimitada por perfil: o supervisor responsável só pode transferir o caso para outro estagiário sob sua própria supervisão; a transferência para outro supervisor passou a ser ação exclusiva da coordenação, coerente com o RNF16. Foram acrescentados critérios de aceitação para as duas hipóteses e para a tentativa indevida do supervisor. |
| RF26      | Clareza        | Aceito              | Foram definidos os perfis autorizados a consultar o histórico: o estagiário e o supervisor responsáveis vigentes; qualquer supervisor que já tenha figurado no histórico, restrito ao próprio período; e a coordenação, sem restrição. Foram acrescentados critérios de aceitação para essas hipóteses e para a negativa a quem nunca teve vínculo com o caso. |


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

### Registros Administrativos do Atendimento (CP10)

| Requisito | Tipo apontado  | Decisão | Justificativa e alteração realizada |
| --------- | -------------- | ------- | ----------------------------------- |
| RF41      | Ambiguidade    | Aceito  | O valor de R$ 35,00 passou a ser um parâmetro institucional configurável exclusivamente pela coordenação (não pela secretaria), com o padrão de R$ 35,00 mantido; toda alteração é registrada com valor anterior, novo valor, autor e data/hora, e vale só para pagamentos registrados depois dela. Foram acrescentados critérios de aceitação para a alteração do parâmetro e para a tentativa por perfil não autorizado. |
| RF42      | Inconsistência | Aceito  | A descrição passou a mencionar explicitamente o estagiário entre os perfis que consultam a contribuição social, restrito aos pacientes vinculados a ele e apenas à situação (sem forma de pagamento), alinhando a descrição ao critério de aceitação já existente. |
| RF43      | OK             | Não aplicável | Nenhum problema identificado. |
| RF44      | Inconsistência | Aceito  | "Usuário autenticado" foi substituído por "secretaria, ou paciente/responsável com identidade verificada (RF52)", já que esse público não possui conta nem senha (CP12). A dependência do RF52 foi explicitada na rastreabilidade. |
| RF45      | Incompletude   | Aceito  | Foram acrescentados critérios de aceitação para a presença de assinatura, carimbo e número de CRP no documento, para o bloqueio da emissão ao responsável de paciente menor de idade sem a Autorização preenchida, e para a ausência de download ou envio por e-mail. A referência a "paciente autenticado" também foi corrigida para "identidade verificada (RF52)". |
| RF46      | Clareza        | Aceito  | Foram definidos os perfis autorizados a solicitar a reemissão: os mesmos autorizados a emitir a declaração original (RF45) — secretaria, para qualquer paciente, e paciente/responsável com identidade verificada, exclusivamente para as próprias sessões. Foi acrescentado critério de aceitação para a tentativa de reemissão de declaração de outro paciente. |
| RF47      | Verificabilidade | Aceito | Os dados retornados pela consulta pública foram enumerados: para código válido e vigente, confirmação de autenticidade, nome do paciente, data e horário da sessão e nome do estagiário (os mesmos já impressos na declaração), sem dado clínico; para código inexistente, mensagem genérica; para declaração cujo registro foi corrigido após a emissão, aviso de desatualização, sem exibir os dados anteriores. O RNF45 foi ajustado à mesma definição. |

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

## Requisitos não funcionais

### Inscrição on-line (CP1)

| Requisito | Tipo apontado       | Decisão       | Justificativa e alteração realizada |
| --------- | ------------------- | ------------- | ----------------------------------- |
| RNF1      | OK                  | Não aplicável | Nenhum problema identificado. A verificação foi apenas alinhada aos novos campos de contato do RF1. |
| RNF2      | Redundância parcial | Aceito        | A regra sobre o conteúdo permitido no comprovante permaneceu somente no RF2. O RNF2 passou a conter apenas as proteções adicionais contra exposição de dados clínicos no endereço eletrônico e nas mensagens públicas. |

### Triagem e Sinalização de Casos (CP2)

| Requisito | Tipo apontado       | Decisão | Justificativa e alteração realizada |
| --------- | ------------------- | ------- | ----------------------------------- |
| RNF3      | Clareza             | Aceito  | Foram definidos supervisor e coordenação como perfis de triagem e incluídos testes de acesso negado para secretaria, estagiário e usuário externo. |
| RNF4      | Verificabilidade    | Aceito  | A origem da sinalização passou a incluir versão, vigência, aprovador e histórico de publicação da regra, com teste de troca de versão e de ausência de regra vigente. |
| RNF5      | Redundância parcial | Aceito  | Os perfis e dados da decisão ficaram somente no RF6. O RNF5 passou a tratar exclusivamente de integridade, imutabilidade, encadeamento cronológico e reconstrução da trilha de auditoria. |

### Fila de Espera e Consulta de Posição (CP3)

| Requisito | Tipo apontado    | Decisão | Justificativa e alteração realizada |
| --------- | ---------------- | ------- | ----------------------------------- |
| RNF6      | Incompletude     | Aceito  | Foram definidos código de 6 dígitos, validade de 10 minutos, uso único, 5 tentativas, reenvio após 60 segundos, invalidação do código anterior, limite de 3 envios por identificador em 60 minutos e bloqueio de 60 minutos, alinhados ao RF52. |
| RNF7      | Verificabilidade | Aceito  | Foram definidos público-alvo, teste de compreensão sem ajuda, amostra mínima de 10 participantes e taxa mínima de 90% de respostas corretas sobre variação da posição e ausência de garantia de data. |
| RNF8      | Lacuna           | Aceito  | Foram definidos autoria, data/hora, histórico de publicação, permissão exclusiva da coordenação e teste negativo de publicação por perfil não autorizado. |

### Prontuário Eletrônico (CP6)

| Requisito | Tipo apontado       | Decisão | Justificativa e alteração realizada |
| --------- | ------------------- | ------- | ----------------------------------- |
| RNF25     | Redundância parcial | Aceito  | A declaração dos perfis autorizados ficou somente no RF55. O RNF25 passou a tratar exclusivamente da não exposição de conteúdo ou da existência de seções clínicas em interface, URLs, notificações, mensagens e respostas negadas do servidor. |

### Registro de Evolução por Sessão (CP7)

| Requisito | Tipo apontado       | Decisão       | Justificativa e alteração realizada |
| --------- | ------------------- | ------------- | ----------------------------------- |
| RNF26     | Redundância parcial | Aceito        | A declaração dos perfis autorizados ficou somente no RF55. O RNF26 passou a tratar exclusivamente da não exposição do original, das correções, dos complementos ou de sua existência em respostas negadas. |
| RNF27     | OK                  | Não aplicável | Nenhum problema identificado. A abrangência já contempla correções e complementos. |
| RNF28     | Inconsistência      | Aceito        | O RNF28 já exigia motivo em toda correção; o RF29 foi alinhado para adotar a mesma regra. |
| RNF29     | Verificabilidade    | Aceito        | Foram definidos carga de 30 usuários simultâneos por 10 minutos, massa de 4.000 sessões/evoluções, proporção de correções e complementos, rede mínima, infraestrutura de homologação equivalente à produção e medição separada do percentil 95. |
| RNF30     | Verificabilidade    | Aceito        | Foram definidos limite de 3 minutos, no máximo 6 interações, teste com pelo menos 10 estagiários e taxa mínima de 90% de sucesso na primeira tentativa sem ajuda. |

### Geração do Relatório Final de Evolução (CP8)

| Requisito | Tipo apontado | Decisão | Justificativa e alteração realizada |
| --------- | ------------- | ------- | ----------------------------------- |
| RNF31     | Incompletude  | Aceito  | Foram definidos versionamento de submissões, devoluções e aprovações, impressão exclusiva da versão aprovada, ausência de download/e-mail ao paciente e confirmação da assinatura manuscrita na entrega. |

### Continuidade de Casos entre Semestres (CP13)

| Requisito | Tipo apontado | Decisão       | Justificativa e alteração realizada |
| --------- | ------------- | ------------- | ----------------------------------- |
| RNF54     | Incompletude  | Aceito        | Foi definido prazo mínimo de guarda de 5 anos após o encerramento do caso ou a última decisão, destinação somente com autorização da pessoa psicóloga responsável técnica, bloqueio por obrigação de guarda adicional e auditoria da eliminação ou anonimização. |
| RNF55     | OK            | Não aplicável | Nenhum problema identificado. A integridade já abrange sessões, evoluções, correções, complementos, relatórios, decisões, transferências e vínculos anteriores. |

### Agendamento, Confirmação e Remarcação (CP4)

| Requisito | Tipo apontado       | Decisão       | Justificativa e alteração realizada |
| --------- | ------------------- | ------------- | ----------------------------------- |
| RNF9      | OK                  | Não aplicável | Nenhum problema identificado. |
| RNF10     | Redundância parcial | Aceito        | A auditoria das operações sobre a sessão foi centralizada no RNF10, com uma tabela dos dados registrados em cada operação (agendamento, remarcação, aprovação de exceção, confirmação, cancelamento e ausência do estagiário). Os RF10, RF12, RF14, RF15 e RF16 deixaram de repetir essas regras e passaram a referenciar o RNF10; nos RFs ficaram apenas os dados de negócio (motivo, justificativa, classificação). |
| RNF11     | Verificabilidade    | Aceito        | Foram definidos o que conta como entrega (aceite pelo provedor), a fórmula e a janela (mês civil, por canal), o número de novas tentativas, as falhas externas excluídas do cálculo (contato inválido e indisponibilidade registrada do provedor), os responsáveis por cada tipo de falha, a sinalização à secretaria e uma amostra mínima de teste (200 lembretes por canal). |
| RNF12     | Verificabilidade    | Aceito        | "Condições normais de uso" foi substituído por um cenário de referência: 30 usuários simultâneos por 10 minutos, massa de dados de dois semestres (cerca de 360 inscrições, 200 pacientes e 4.000 sessões), ambiente de homologação igual ao servidor de produção e medição no servidor, sem a rede do usuário. A carga de 30 usuários é estimativa da equipe e será validada com a FBr. |
| RNF13     | Redundância         | Aceito        | A regra de quem acessa cada agenda ficou só no RF11. O RNF13 passou a tratar de uma propriedade diferente, a minimização de dados: a agenda expõe apenas nome, data, horário e status, sem contato, CPF, queixa, prioridade ou evolução, e a restrição do RF11 também vale para requisições feitas diretamente ao servidor. |
| RNF14     | Verificabilidade    | Aceito        | Foram definidos o horário comercial, a janela de apuração (mês civil), a fórmula com exemplo (132 minutos em um mês de 22 dias úteis), o que conta como minuto indisponível e as manutenções programadas excluídas (fora do horário comercial, ou comunicadas com 48 horas de antecedência e limitadas a 4 horas por mês). |
| RNF15     | Incompletude        | Aceito        | Foram definidas as proteções do link de confirmação: token aleatório de pelo menos 128 bits sem dados do paciente no endereço, validade até o fim do prazo de confirmação, invalidação por remarcação ou cancelamento, uso único, comportamento após expiração ou reutilização, dados mínimos exibidos e os testes de segurança correspondentes. |

### Controle de Assiduidade e Alertas (CP9)

| Requisito | Tipo apontado    | Decisão       | Justificativa e alteração realizada |
| --------- | ---------------- | ------------- | ----------------------------------- |
| RNF32     | Inconsistência   | Aceito        | Alinhado à regra final do RF35: contagem de faltas no ciclo, consecutivas ou não, originada pela falta registrada (RF34) e pelo cancelamento fora do prazo (RF15). |
| RNF33     | Incompletude     | Aceito        | O alerta passou a exigir ícone e o texto "Limite de faltas atingido" além da cor, com anúncio por leitor de tela, em conformidade com o critério 1.4.1 da WCAG 2.2 e o RNF56; a verificação inclui exibição em escala de cinza e inspeção automatizada. |
| RNF34     | Verificabilidade | Aceito        | "Imediatamente" foi substituído por um limite mensurável: até 5 segundos após a confirmação do desligamento, no cenário de carga do RNF12, verificado por 20 medições automatizadas. |
| RNF35     | OK               | Não aplicável | Nenhum problema identificado. A abrangência foi estendida aos novos RF40, RF63 e RF64 (ver ajustes de consistência). |

### Indicadores e Relatórios Institucionais (CP11)

| Requisito | Tipo apontado | Decisão       | Justificativa e alteração realizada |
| --------- | ------------- | ------------- | ----------------------------------- |
| RNF46     | OK            | Não aplicável | Nenhum problema identificado. |
| RNF47     | OK            | Não aplicável | Nenhum problema identificado. O texto foi ajustado à nova divisão entre RF48 e RF49 (ver ajustes de consistência). |
| RNF48     | OK            | Não aplicável | Nenhum problema identificado. O texto foi ajustado à nova divisão entre RF48 e RF49 (ver ajustes de consistência). |

### Segurança, Sigilo e Controle de Acesso (CP12)

| Requisito | Tipo apontado    | Decisão       | Justificativa e alteração realizada |
| --------- | ---------------- | ------------- | ----------------------------------- |
| RNF49     | OK               | Não aplicável | Nenhum problema identificado. |
| RNF50     | OK               | Não aplicável | Nenhum problema identificado. |
| RNF51     | Incompletude     | Aceito        | A criptografia em repouso passou a abranger todos os dados pessoais sensíveis (dados de saúde) tratados pelo sistema: queixa, histórico e urgência da inscrição, sinalizações e prioridade da triagem, evoluções e relatório final. Foi definida a gestão das chaves: armazenamento fora do banco e do repositório, acesso restrito ao responsável técnico, rotação anual ou imediata em caso de suspeita, com registro. |
| RNF52     | Verificabilidade | Aceito        | O prazo de 5 anos deixou de depender de confirmação: é o mínimo normativo de guarda do registro documental do serviço psicológico (Resolução CFP nº 1/2009, art. 4º, § 1º). A FBr pode apenas ampliá-lo, o que não afeta a verificação do mínimo. |
| RNF53     | Lacuna           | Aceito        | Foi acrescentado o tempo máximo de recuperação: até 8 horas da detecção da falha até o serviço voltar a operar com os dados da última cópia, verificado por teste de restauração cronometrado a cada semestre, com procedimento documentado. |

### Acessibilidade e Usabilidade (CP14)

| Requisito | Tipo apontado       | Decisão       | Justificativa e alteração realizada |
| --------- | ------------------- | ------------- | ----------------------------------- |
| RNF56     | OK                  | Não aplicável | Nenhum problema identificado. |
| RNF57     | Redundância         | Aceito        | A operação por teclado e o foco visível foram reconhecidos como parte do RNF56 (critérios 2.1.1 e 2.4.7). O RNF57 passou a definir uma exigência adicional, "Aparência reforçada do indicador de foco", seguindo o critério 2.4.13 (nível AAA): contorno equivalente a 2 pixels e contraste de 3:1, também no alto contraste e nos três tamanhos de texto. A exigência se justifica pelo paciente com baixa visão já atendido pela clínica. |
| RNF58     | Redundância parcial | Aceito        | O refluxo em 320 pixels foi reconhecido como parte do RNF56 (critério 1.4.10), e o RNF58 passou a tratar apenas da extensão responsiva até 1920 pixels, com as larguras de verificação definidas. |

## Ajustes de consistência decorrentes

As correções acima exigiram ajustes em requisitos que não tinham apontamento, para manter o conjunto coerente:

- **RF14 e RF34:** a ausência de confirmação de presença passou a apenas sinalizar a sessão para a secretaria, sem gerar falta; o critério do RF34 deixou de usar "confirmação de comparecimento", que se confundia com a confirmação do RF14.
- **RF10, RF14 e RF16:** passaram a referenciar o RNF10 (auditoria) e, no caso do RF14, o RNF15 (proteção do link de confirmação).
- **RF37:** a referência à "liberação imediata" passou a apontar para o limite de 5 segundos do RNF34.
- **RF38:** a reversão de um desligamento cuja vaga ainda não foi realocada passou a restaurar o vínculo com o estagiário e a indicar o reagendamento das sessões canceladas, coerente com o novo RF37.
- **RF39:** a referência à sinalização de reprovação passou a apontar para o RF63.
- **RNF35:** a restrição de visibilidade foi estendida à contagem (RF40), à sinalização (RF63) e à decisão (RF64).
- **RNF47 e RNF48:** alinhados à separação entre a consulta em tela (RF48) e a exportação em PDF (RF49).

## Pendências de validação com a FBr

- Valores padrão dos parâmetros de agendamento da CP4: duração da sessão (50 minutos), antecedência do lembrete (24 horas), prazo de confirmação (12 horas) e antecedência mínima para cancelamento sem falta (24 horas).
- Carga de referência de 30 usuários simultâneos usada nos RNF12 e RNF29 (e, por referência, no RNF34).
- Base legal do tratamento dos dados de saúde (RF57) e canal de atendimento dos demais direitos do titular.
