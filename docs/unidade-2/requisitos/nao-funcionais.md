## 8.2 Lista de Requisitos Não Funcionais

Os requisitos não funcionais (RNFs) descrevem propriedades e restrições mensuráveis do sistema, classificadas conforme o modelo **URPS+** (Usabilidade, Confiabilidade, Desempenho, Suportabilidade e demais categorias, como Segurança e Auditoria). Cada RNF mantém rastreabilidade com a **Feature** que ele restringe e, por meio dela, com a Característica de Produto (CP) de origem — mesma cadeia usada nos [Requisitos Funcionais](funcionais.md).

### Inscrição on-line (CP1)

A CP1 possui três features: **Registrar solicitação de atendimento on-line**, **Emitir comprovante de inscrição** e **Registrar inscrição assistida**.

Os requisitos não funcionais abaixo estabelecem condições de qualidade específicas para o preenchimento do formulário e a proteção das informações registradas durante a inscrição.

As páginas de inscrição também devem atender aos requisitos transversais de acessibilidade e usabilidade definidos na CP12 (RNF04, RNF05 e RNF06).

#### Feature — Registrar solicitação de atendimento on-line

**RNF07 — Identificação e recuperação de erros no formulário**

O formulário de inscrição on-line (RF05) deve apresentar mensagens textuais de erro associadas aos respectivos campos quando houver ausência ou preenchimento inválido de informações obrigatórias.

As mensagens devem identificar o campo que precisa ser corrigido e descrever a correção necessária, sem depender exclusivamente de alterações de cor para comunicar o erro.

Após a identificação de um erro de preenchimento, o sistema deve preservar os valores válidos informados nos demais campos do formulário, permitindo que o interessado conclua a inscrição sem precisar repetir todo o preenchimento.

A conformidade deve ser verificada por meio de testes com campos obrigatórios vazios e entradas inválidas, confirmando a identificação textual dos erros e a preservação das informações válidas previamente inseridas.

Classificação: usabilidade e acessibilidade (URPS+).
Rastreabilidade: Feature "Registrar solicitação de atendimento on-line" → CP1 — Inscrição on-line; complementa os requisitos transversais de acessibilidade da CP12.

#### Feature — Emitir comprovante de inscrição

**RNF08 — Proteção das informações no comprovante de inscrição**

O comprovante eletrônico emitido após o registro da solicitação (RF06) deve apresentar somente as informações necessárias à confirmação do recebimento da inscrição, sem divulgar a queixa informada pelo interessado ou outros dados clínicos registrados no formulário.

As informações clínicas não devem ser incluídas no endereço eletrônico utilizado para acessar a confirmação nem em mensagens públicas de sucesso ou erro relacionadas à emissão do comprovante.

A conformidade deve ser verificada mediante a emissão de comprovantes com dados fictícios, a inspeção de seu conteúdo e a verificação das informações apresentadas na interface e no endereço eletrônico da confirmação.

Classificação: segurança e privacidade (URPS+).
Rastreabilidade: Feature "Emitir comprovante de inscrição" → CP1 — Inscrição on-line; relacionada à CP11 — Segurança, sigilo e controle de acesso.

### Triagem e sinalização de casos (CP2)

As features da CP2 tratam respostas potencialmente sensíveis da inscrição e decisões que afetam a ordem de atendimento. Aplicam-se também os controles transversais de segurança e acesso da CP11, conforme a numeração da Solução Proposta.

#### Feature — Organizar informações da inscrição para triagem

**RNF2.1 — Sigilo das informações de triagem**

As respostas de triagem e as sinalizações vinculadas à inscrição devem ser exibidas somente a usuários institucionais autorizados para essa finalidade. A interface e as respostas a tentativas de acesso negadas não devem revelar queixa, histórico informado, urgência percebida ou sinalizações clínicas. A conformidade deve ser verificada com inscrições fictícias, comparando consultas autorizadas e tentativas de acesso por perfis não autorizados.

Classificação: segurança e privacidade (URPS+).
Rastreabilidade: Feature "Organizar informações da inscrição para triagem" → CP2 — Triagem e sinalização de casos; relacionada às features "Sinalizar pontos de atenção da inscrição" e "Registrar prioridade clínica do inscrito" e à CP11 — Segurança, sigilo e controle de acesso.

#### Feature — Sinalizar pontos de atenção da inscrição

**RNF2.2 — Rastreabilidade das regras de sinalização**

Cada ponto de atenção apresentado deve manter vínculo verificável com a resposta original e com a versão da regra institucional aprovada que o produziu. A conformidade deve ser verificada com dados fictícios e casos com e sem correspondência às regras aprovadas, confirmando a origem de cada sinalização e a ausência de cor de prioridade atribuída automaticamente.

Classificação: confiabilidade e auditoria (URPS+).
Rastreabilidade: Feature "Sinalizar pontos de atenção da inscrição" → CP2 — Triagem e sinalização de casos; relacionada a RF2.2.

#### Feature — Registrar prioridade clínica do inscrito

**RNF2.3 — Integridade e auditoria das decisões de prioridade**

O registro e a alteração da prioridade devem preservar a classificação anterior, a nova classificação, o usuário institucional responsável e a data e hora de cada decisão. Uma decisão anterior não deve ser sobrescrita ou apagada por uma revisão posterior. A conformidade deve ser verificada com uma inscrição fictícia classificada e depois reclassificada por usuário autorizado, seguida de tentativa de alteração por usuário não autorizado; o histórico deve permanecer íntegro e a fila deve receber apenas a decisão vigente confirmada.

Classificação: confiabilidade, segurança e auditoria (URPS+).
Rastreabilidade: Feature "Registrar prioridade clínica do inscrito" → CP2 — Triagem e sinalização de casos; integração com RF08 (CP3) e controles da CP11 — Segurança, sigilo e controle de acesso.

### Fila de espera e consulta de posição (CP3)

A CP3 possui três features: **Ordenar inscritos na fila de espera**, **Consultar posição individual na fila** e **Informar condições gerais da fila**.

Os RNFs abaixo estabelecem condições de segurança, privacidade, compreensibilidade e confiabilidade das informações apresentadas ao interessado.

Os requisitos de acessibilidade e responsividade da CP12 também se aplicam às páginas públicas de consulta da fila de espera.

#### Feature — Consultar posição individual na fila

**RNF09 — Privacidade e controle de acesso à consulta da fila**

A consulta individual da fila de espera (RF09) deve impedir que o conhecimento isolado do CPF ou do número de inscrição permita a um usuário não autorizado acessar informações individuais de outro inscrito.

O sistema deve exigir a verificação da identidade do solicitante conforme o RF15 da CP11, mediante CPF ou número de inscrição e código de uso único enviado ao contato cadastrado. A posição e a situação individual na fila somente devem ser apresentadas após a confirmação bem-sucedida da identidade, respeitando as restrições de acesso estabelecidas na CP11.

As respostas de consultas não autorizadas não devem revelar a posição, a classificação de prioridade, a queixa ou outros dados individuais da solicitação consultada.

A conformidade deve ser verificada por meio de testes com inscrições fictícias, contemplando consultas autorizadas e tentativas de acesso a registros de terceiros mediante o conhecimento de seus identificadores.

Em todos os casos de acesso não autorizado, nenhuma informação individual da inscrição consultada deve ser divulgada.

Classificação: segurança e privacidade (URPS+).
Rastreabilidade: Feature "Consultar posição individual na fila" → CP3 — Fila de espera e consulta de posição; relacionada à CP11 — Segurança, sigilo e controle de acesso. Dependência: RF15 — Verificar identidade do paciente ou responsável (CP11).

**RNF10 — Compreensibilidade das informações sobre a posição na fila**

A interface de consulta da fila de espera (RF09) deve apresentar de forma clara e legível a posição e a situação atual do inscrito, acompanhadas de informação explícita de que a posição pode variar e não representa garantia de prazo ou data de atendimento.

O aviso deve ser exibido junto ao resultado da consulta, sem exigir que o interessado acesse outra página, abra um documento adicional ou realize uma operação específica para visualizar essa informação.

A conformidade deve ser verificada em testes da interface, confirmando que todas as consultas individuais realizadas com sucesso apresentam a informação sobre a possibilidade de alteração da posição e a ausência de garantia de prazo de atendimento.

Classificação: usabilidade (URPS+).
Rastreabilidade: Feature "Consultar posição individual na fila" → CP3 — Fila de espera e consulta de posição → IS03 — Expectativa sobre a fila.

#### Feature — Informar condições gerais da fila

**RNF11 — Confiabilidade das informações institucionais da fila**

As informações institucionais sobre capacidade e critérios gerais de atendimento apresentadas pelo sistema (RF10) devem corresponder à versão vigente do conteúdo aprovado pela coordenação da Clínica Escola FBr.

O sistema deve apresentar a data da última atualização das informações divulgadas e substituir a versão anterior quando uma nova publicação autorizada for realizada.

Informações de capacidade que não estejam aprovadas ou vigentes não devem ser apresentadas como disponibilidade confirmada de vagas.

A conformidade deve ser verificada mediante a publicação de informações institucionais fictícias, a atualização autorizada de seu conteúdo e a conferência da versão e da data exibidas ao interessado.

Após a publicação da atualização, a consulta deve apresentar exclusivamente a versão vigente das informações institucionais.

Classificação: confiabilidade (URPS+).
Rastreabilidade: Feature "Informar condições gerais da fila" → CP3 — Fila de espera e consulta de posição → IS02 — Aumento da demanda.

### Agendamento, Confirmação e Remarcação (CP4)

A CP4 tem oito features (ver [Requisitos Funcionais](funcionais.md)); os RNFs abaixo estabelecem condições de qualidade para o agendamento, a confirmação, o lembrete e o cancelamento de sessões, aplicando-se de forma transversal ao conjunto das features, conforme indicado na rastreabilidade de cada um. Os RNFs de segurança e privacidade devem ser alinhados com os requisitos gerais de acesso e sigilo da CP11, evitando duplicidade, e a acessibilidade das páginas voltadas ao paciente (confirmação de presença) segue a mesma meta definida para a CP12 (RNF04).

**RNF4.1 — Integridade do agendamento**

Duas sessões não podem ser agendadas para o mesmo horário do mesmo estagiário, nem para o mesmo horário do mesmo paciente, mesmo em caso de duas requisições simultâneas de agendamento ou remarcação.

A conformidade deve ser verificada por teste de concorrência, com duas tentativas simultâneas de agendar ou remarcar uma sessão para o mesmo horário do mesmo estagiário, confirmando que apenas uma é aceita.

Classificação: confiabilidade (URPS+).
Rastreabilidade: CP4 — Agendamento, confirmação e remarcação (transversal às features "Agendar sessão do paciente" e "Reagendar sessão do paciente").

**RNF4.2 — Auditoria das operações sobre a sessão**

Todo agendamento, remarcação, confirmação e cancelamento de sessão deve ser registrado com usuário responsável, data/hora e o estado anterior e novo da sessão. Esses registros não podem ser apagados nem sobrescritos.

A conformidade deve ser verificada por teste de integração, confirmando o registro de auditoria após cada uma dessas operações.

Classificação: auditoria (URPS+).
Rastreabilidade: CP4 — Agendamento, confirmação e remarcação (transversal às features "Agendar sessão do paciente", "Reagendar sessão do paciente", "Confirmar presença em sessão agendada", "Registrar cancelamento de sessão pelo paciente" e "Registrar cancelamento de sessão pelo estagiário").

**RNF4.3 — Confiabilidade do envio de lembretes**

O sistema deve garantir uma taxa de entrega de pelo menos 98% dos lembretes de sessão enviados, com nova tentativa automática em caso de falha de envio dentro de 1 hora, e deve registrar o envio ou a falha de cada lembrete para consulta posterior.

A conformidade deve ser verificada por teste com envio simulado, incluindo cenários de falha, conferindo a taxa de entrega e o registro de tentativas.

Classificação: confiabilidade (URPS+).
Rastreabilidade: Feature "Enviar lembrete de sessão agendada" → CP4 — Agendamento, confirmação e remarcação.

**RNF4.4 — Tempo de resposta nas operações de agendamento**

As operações de agendar, reagendar, confirmar presença e registrar cancelamento devem apresentar retorno em até 2 segundos para 95% das requisições realizadas em condições normais de uso.

A conformidade deve ser verificada por teste de desempenho com dados representativos do volume da clínica (cerca de 100 vagas e 160 a 180 inscrições por semestre).

Classificação: desempenho (URPS+).
Rastreabilidade: CP4 — Agendamento, confirmação e remarcação (transversal às features "Agendar sessão do paciente", "Reagendar sessão do paciente", "Confirmar presença em sessão agendada", "Registrar cancelamento de sessão pelo paciente" e "Registrar cancelamento de sessão pelo estagiário").

**RNF4.5 — Privacidade da agenda por perfil**

O estagiário deve visualizar apenas sua própria agenda de sessões; o supervisor deve visualizar apenas a agenda dos estagiários sob sua supervisão, conforme o vínculo definido na CP5.

A conformidade deve ser verificada por testes de autorização, com cenários positivos e negativos, confirmando a ausência de acesso à agenda de estagiários sem vínculo de supervisão.

Classificação: privacidade (URPS+).
Rastreabilidade: Feature "Consultar agenda de sessões do estagiário" → CP4 — Agendamento, confirmação e remarcação; relacionada à CP11 — Segurança, sigilo e controle de acesso.

**RNF4.6 — Disponibilidade do módulo de agendamento**

O módulo de agendamento e confirmação deve estar disponível em pelo menos 99% do horário comercial (8h–18h, dias úteis), dado que indisponibilidades nesse módulo impactam diretamente a operação da clínica.

A conformidade deve ser verificada por monitoramento contínuo de disponibilidade durante o período de operação.

Classificação: confiabilidade (URPS+).
Rastreabilidade: CP4 — Agendamento, confirmação e remarcação (transversal a todas as features).

**RNF4.7 — Usabilidade da confirmação de presença pelo paciente**

A confirmação de presença deve ser possível a partir do link enviado no lembrete (RF4.4), sem exigir login ou cadastro de senha, em no máximo 2 interações, considerando o público com pouca familiaridade com tecnologia atendido pela clínica.

A conformidade deve ser verificada por teste de usabilidade com usuários representativos, incluindo pessoas com baixo letramento digital.

Classificação: usabilidade (URPS+).
Rastreabilidade: Feature "Confirmar presença em sessão agendada" → CP4 — Agendamento, confirmação e remarcação; relacionada à CP12 — Acessibilidade e usabilidade.

### Distribuição de casos entre supervisores e estagiários (CP5)

A CP5 tem nove features (ver [Requisitos Funcionais](funcionais.md)); os RNFs abaixo estabelecem condições de qualidade para a distribuição de casos, a vinculação de pacientes a estagiários e o acompanhamento dos vínculos, aplicando-se de forma transversal ao conjunto das features, conforme indicado na rastreabilidade de cada um. Os RNFs de segurança e privacidade (RNF5.1 e RNF5.2) devem ser alinhados com os requisitos gerais de acesso e sigilo da CP11, evitando duplicidade, e o RNF5.9 segue a mesma meta de acessibilidade definida para a CP12 (RNF04).

**RNF5.1 — Autorização para distribuição, vínculo e transferência de casos**

Somente a coordenação e os supervisores autorizados podem distribuir, vincular e transferir casos; o estagiário e o supervisor só podem acessar os casos sob sua própria responsabilidade.

A conformidade deve ser verificada por testes de autorização, com cenários positivos e negativos, para os perfis paciente, secretaria, estagiário, supervisor e coordenação, sem nenhum acesso indevido.

Classificação: segurança (URPS+).
Rastreabilidade: CP5 — Distribuição de casos entre supervisores e estagiários (transversal a todas as features da CP5).

**RNF5.2 — Privacidade dos dados nas telas de distribuição e consulta**

As telas de distribuição de casos e de consulta de responsáveis devem exibir apenas os dados necessários a cada perfil; dados clínicos só podem aparecer a quem tem acesso ao prontuário do caso, conforme a CP11.

A conformidade deve ser verificada por revisão das telas por perfil e por teste do conteúdo efetivamente exibido, confirmando a ausência de campos clínicos para perfis sem acesso ao prontuário.

Classificação: privacidade (URPS+).
Rastreabilidade: CP5 — Distribuição de casos entre supervisores e estagiários (transversal às features "Listar casos aguardando distribuição", "Consultar responsáveis pelo caso" e "Consultar casos sob responsabilidade do estagiário ou supervisor").

**RNF5.3 — Auditoria de atribuições, vínculos e transferências**

Toda atribuição, vínculo, alteração e transferência de responsável por um caso deve ser registrada com data/hora, autor da ação, caso envolvido e responsáveis anterior e novo.

A conformidade deve ser verificada por teste de integração, confirmando o registro de auditoria após cada operação de distribuição, vínculo ou transferência.

Classificação: auditoria (URPS+).
Rastreabilidade: CP5 — Distribuição de casos entre supervisores e estagiários (transversal às features "Distribuir caso a supervisor conforme área de especialidade", "Vincular paciente a estagiário responsável", "Transferir caso para outro estagiário ou supervisor" e "Consultar histórico de responsáveis do caso").

**RNF5.4 — Integridade dos vínculos de responsabilidade**

Nenhum caso ativo pode ficar sem supervisor e estagiário responsáveis após a distribuição, nem ter dois responsáveis principais vigentes ao mesmo tempo, salvo confirmação futura do atendimento em dupla (RN5.9).

A conformidade deve ser garantida por restrições de integridade no banco de dados, além de testes de regra de negócio, sem nenhuma inconsistência de vínculo identificada.

Classificação: confiabilidade (URPS+).
Rastreabilidade: CP5 — Distribuição de casos entre supervisores e estagiários (transversal às features "Distribuir caso a supervisor conforme área de especialidade", "Vincular paciente a estagiário responsável" e "Transferir caso para outro estagiário ou supervisor").

**RNF5.5 — Continuidade do histórico na troca de responsável**

A troca de responsável por um caso não deve causar perda de informação: as sessões, a evolução e os vínculos anteriores devem permanecer disponíveis ao novo responsável autorizado após a transferência.

A conformidade deve ser verificada por teste comparando o histórico do caso antes e depois da transferência, confirmando que a totalidade dos registros anteriores permanece acessível.

Classificação: confiabilidade (URPS+).
Rastreabilidade: Feature "Transferir caso para outro estagiário ou supervisor" → CP5 — Distribuição de casos entre supervisores e estagiários; relacionada à feature "Consultar histórico de responsáveis do caso".

**RNF5.6 — Desempenho das listagens e operações de vínculo**

As listagens de casos e as operações de distribuição, vínculo e consulta de responsáveis devem responder rapidamente, considerando o volume de casos da clínica (cerca de 100 vagas e 160 a 180 inscrições por semestre).

A conformidade deve ser verificada por teste de desempenho com dados representativos, com listagens e operações de vínculo respondendo em até 3 segundos em 95% das requisições, em condições normais de uso.

Classificação: desempenho (URPS+).
Rastreabilidade: CP5 — Distribuição de casos entre supervisores e estagiários (transversal às features "Listar casos aguardando distribuição", "Consultar responsáveis pelo caso", "Consultar casos sob responsabilidade do estagiário ou supervisor" e "Visualizar distribuição de casos por supervisor").

**RNF5.7 — Usabilidade da distribuição e do vínculo de casos**

O supervisor e a coordenação devem conseguir distribuir e vincular casos sem treinamento prévio, inclusive a partir do celular, concluindo a distribuição de um caso em até 3 interações a partir da lista de pendentes.

A conformidade deve ser verificada por teste de usabilidade com usuários representativos, em telas responsivas.

Classificação: usabilidade (URPS+).
Rastreabilidade: CP5 — Distribuição de casos entre supervisores e estagiários (transversal às features "Listar casos aguardando distribuição", "Distribuir caso a supervisor conforme área de especialidade" e "Vincular paciente a estagiário responsável").

**RNF5.8 — Manutenibilidade das áreas de especialidade**

A lista de áreas de especialidade e sua associação aos supervisores deve poder ser mantida pela coordenação diretamente pela interface, sem necessidade de alteração de código ou intervenção técnica.

A conformidade deve ser verificada por teste de aceitação com o perfil de coordenação, incluindo, editando e removendo áreas de especialidade.

Classificação: manutenibilidade (URPS+).
Rastreabilidade: Feature "Registrar áreas de especialidade do supervisor" → CP5 — Distribuição de casos entre supervisores e estagiários.

**RNF5.9 — Acessibilidade das telas de distribuição e consulta**

As telas de distribuição de casos, vínculo e consulta de responsáveis devem ser acessíveis, seguindo a mesma meta de conformidade definida para a CP12 (RNF04): navegação por teclado, contraste adequado e compatibilidade com leitor de tela.

A conformidade deve ser verificada com leitor de tela e checklist de acessibilidade.

Classificação: acessibilidade (URPS+).
Rastreabilidade: CP5 — Distribuição de casos entre supervisores e estagiários (transversal às features "Listar casos aguardando distribuição", "Registrar áreas de especialidade do supervisor", "Distribuir caso a supervisor conforme área de especialidade", "Vincular paciente a estagiário responsável", "Consultar responsáveis pelo caso", "Consultar casos sob responsabilidade do estagiário ou supervisor" e "Visualizar distribuição de casos por supervisor"); relacionada à CP12 — Acessibilidade e usabilidade.

### Prontuário eletrônico, evolução e relatório final (CP6 — escopo desta atividade)

Os RNFs abaixo restringem as quatro features RF6.1–RF6.4. A numeração consolidada segue a issue #34; na Solução Proposta, o registro de evolução e o relatório final aparecem nas CP7 e CP8. Aplicam-se também RF18, RNF15, RNF16 e RNF17 da CP11 para acesso, criptografia, auditoria e recuperação do prontuário.

**RNF6.1 — Sigilo do conteúdo clínico**

O prontuário, as evoluções e o relatório final devem ser acessíveis somente ao estagiário responsável pelo caso e ao seu supervisor, conforme o vínculo vigente e o RF18. Listagens, mensagens de erro e respostas a solicitações negadas não devem expor conteúdo clínico a outros perfis. A conformidade deve ser verificada com casos fictícios, testando acesso permitido e negado antes e depois de uma transferência de responsável.

Classificação: segurança e privacidade (URPS+).
Rastreabilidade: RF6.1–RF6.4 → CP6 (escopo da issue) → OE5/OE6; dependências: CP5 e CP11.

**RNF6.2 — Integridade e proveniência das evoluções**

Cada evolução persistida deve conservar sua associação ao paciente, ciclo, sessão, autor e momento de registro. O histórico clínico não deve ser perdido nem associado a outro caso após troca de responsável. Alterações posteriores, se aprovadas pela FBr, devem preservar o conteúdo anterior e a autoria da alteração. A conformidade deve ser verificada por comparação entre sessão, prontuário e histórico antes e depois de transferência e de tentativa de alteração não autorizada.

Classificação: confiabilidade e auditoria (URPS+).
Rastreabilidade: Features “Registrar evolução da sessão” e “Consultar histórico de evolução do paciente” → CP6 (escopo da issue); relacionadas a RF5.8 e RNF5.5.

**RNF6.3 — Fidelidade e rastreabilidade do relatório final**

Cada versão gerada do relatório deve identificar o ciclo e os registros de evolução usados como origem. O conteúdo consolidado deve ser verificável contra esses registros, sem substituir, omitir silenciosamente ou inventar informação clínica. Uma nova geração após correção de evolução deve produzir versão distinguível da anterior. A conformidade deve ser verificada com ciclo fictício contendo registros completos e lacunas, comparando as versões do relatório com os registros de origem.

Classificação: confiabilidade e auditoria (URPS+).
Rastreabilidade: Feature “Gerar relatório final de evolução” → CP6 (escopo da issue; CP8 na Solução Proposta) → OE5/OE6.

### Registro de Evolução por Sessão (CP7)

A CP7 tem três features (ver [Requisitos Funcionais](funcionais.md)); os RNFs abaixo estabelecem condições de qualidade para o registro, a correção e a consulta da evolução clínica de cada sessão.

**RNF7.1 — Sigilo do conteúdo da evolução**

O conteúdo de uma evolução registrada deve ser acessível somente ao estagiário responsável pelo caso e ao seu supervisor, conforme o vínculo vigente definido na CP5 e a restrição de acesso ao prontuário (RF18, CP11). Listagens, mensagens de erro e respostas a solicitações negadas não devem expor conteúdo clínico a outros perfis.

A conformidade deve ser verificada com casos fictícios, testando acesso permitido e negado antes e depois de uma transferência de responsável.

Classificação: segurança e privacidade (URPS+).
Rastreabilidade: CP7 — Registro de evolução por sessão (transversal às features "Registrar evolução da sessão realizada", "Corrigir evolução registrada" e "Consultar evolução de uma sessão específica"); relacionada à CP11 — Segurança, sigilo e controle de acesso.

**RNF7.2 — Integridade e proveniência dos registros de evolução**

Cada evolução persistida deve conservar sua associação à sessão, ao paciente, ao ciclo, ao autor e ao momento de registro. O histórico não deve ser perdido nem associado a outro caso após troca de responsável (RF5.8).

A conformidade deve ser verificada por comparação entre sessão, evolução e histórico antes e depois de uma transferência de caso.

Classificação: confiabilidade e auditoria (URPS+).
Rastreabilidade: Feature "Registrar evolução da sessão realizada" → CP7 — Registro de evolução por sessão; relacionada a RF5.8 e RNF5.5.

**RNF7.3 — Auditoria das correções de evolução**

Toda correção de um registro de evolução (RF7.2 — Corrigir evolução registrada) deve preservar o conteúdo original, sem sobrescrita silenciosa, e deve registrar o autor, a data/hora e o motivo de cada correção, de forma que o histórico completo de versões de uma evolução fique disponível para consulta.

A conformidade deve ser verificada corrigindo um registro de evolução fictício e conferindo que a versão original permanece acessível junto com a nova versão, o autor e o motivo da correção.

Classificação: auditoria e confiabilidade (URPS+).
Rastreabilidade: Feature "Corrigir evolução registrada" → CP7 — Registro de evolução por sessão.

**RNF7.4 — Desempenho do registro e da consulta de evolução**

O registro de uma nova evolução e a consulta de uma evolução já registrada devem apresentar retorno em até 2 segundos para 95% das requisições em condições normais de uso.

A conformidade deve ser verificada por teste de desempenho com dados representativos do volume de sessões da clínica.

Classificação: desempenho (URPS+).
Rastreabilidade: CP7 — Registro de evolução por sessão (transversal às features "Registrar evolução da sessão realizada" e "Consultar evolução de uma sessão específica").

**RNF7.5 — Usabilidade do registro de evolução**

O registro de uma evolução deve ser simples e rápido o suficiente para ser preenchido pelo estagiário logo após a sessão, sem exigir treinamento prévio além da orientação inicial de uso do sistema.

A conformidade deve ser verificada por teste de usabilidade com estagiários representativos, medindo o tempo e o número de interações necessários para concluir um registro.

Classificação: usabilidade (URPS+).
Rastreabilidade: Feature "Registrar evolução da sessão realizada" → CP7 — Registro de evolução por sessão.

### Registro da Contribuição Social (CP8)

#### Feature — Registrar pagamento da contribuição social do paciente [#43](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/43)

**RNF12 — Auditoria dos registros de contribuição social**

Todo registro de pagamento da contribuição social (RF11) deve guardar o usuário responsável, a data/hora da operação, o paciente, o valor, a data e a forma de pagamento. Esses dados não podem ser apagados nem sobrescritos, e devem ficar disponíveis para consulta pela coordenação por, no mínimo, 24 meses, prazo compatível com o ciclo de fiscalização do CRP (mesmo prazo do RNF03).

A conformidade deve ser verificada por inspeção: registrar pagamentos com dados fictícios, conferir se todos os campos acima foram guardados e confirmar que nenhum perfil consegue apagá-los ou alterá-los pela interface.

Classificação: auditoria (URPS+).
Rastreabilidade: Feature "Registrar pagamento da contribuição social do paciente" → CP8 — Registro da contribuição social.

### Emissão de Declaração de Comparecimento (CP9)

A CP9 tem cinco features (ver [Requisitos Funcionais](funcionais.md)); os RNFs abaixo estabelecem condições de qualidade para a emissão, reemissão e verificação da declaração de comparecimento, aplicando-se de forma transversal ao conjunto das features, conforme indicado na rastreabilidade de cada um. A rastreabilidade de cada RNF identifica explicitamente as features afetadas, preservando a relação CP9 → feature → RNF. Os RNFs de segurança e privacidade (RNF9.1 a RNF9.3) devem ser alinhados com os requisitos gerais de acesso e sigilo da CP11, evitando duplicidade, e o RNF9.7 segue a mesma meta de acessibilidade definida para a CP12 (RNF04).

**RNF9.1 — Privacidade dos dados na declaração**

A declaração de comparecimento deve conter apenas os dados estritamente necessários e nenhum dado clínico (queixa, prioridade, diagnóstico, evolução), com o conteúdo mínimo aprovado pela FBr.

A conformidade deve ser verificada por revisão do modelo do documento e por teste do conteúdo efetivamente gerado, confirmando a ausência de campos clínicos.

Classificação: privacidade (URPS+).
Rastreabilidade: CP9 — Emissão de declaração de comparecimento (transversal às features "Emitir declaração de comparecimento do paciente", "Reemitir declaração de comparecimento" e "Emitir declaração consolidada por período").

**RNF9.2 — Autorização para emissão e consulta**

Somente perfis autorizados podem emitir declarações, e o paciente ou responsável só pode acessar e emitir declarações das próprias sessões.

A conformidade deve ser verificada por testes de autorização, com cenários positivos e negativos, para os perfis paciente, secretaria, estagiário e supervisor, sem nenhum acesso indevido.

Classificação: segurança (URPS+).
Rastreabilidade: CP9 — Emissão de declaração de comparecimento (transversal às features "Listar sessões com comparecimento registrado do paciente", "Emitir declaração de comparecimento do paciente", "Reemitir declaração de comparecimento" e "Emitir declaração consolidada por período").

**RNF9.3 — Auditoria de emissões e reemissões**

Toda emissão e reemissão de declaração deve ser registrada com usuário, data/hora, sessão e paciente, distinguindo emissão original de reemissão.

A conformidade deve ser verificada por teste de integração, confirmando o registro de auditoria após cada emissão e reemissão.

Classificação: auditoria (URPS+).
Rastreabilidade: Feature "Emitir declaração de comparecimento do paciente" → CP9 — Emissão de declaração de comparecimento; relacionada às features "Reemitir declaração de comparecimento" e "Emitir declaração consolidada por período".

**RNF9.4 — Tempo de geração da declaração**

A geração da declaração deve ser rápida o suficiente para o atendimento presencial na secretaria: o documento deve ficar disponível em até 5 segundos em 95% das solicitações, em condições normais de uso.

A conformidade deve ser verificada por teste de desempenho com dados representativos.

Classificação: desempenho (URPS+).
Rastreabilidade: CP9 — Emissão de declaração de comparecimento (transversal às features "Emitir declaração de comparecimento do paciente", "Reemitir declaração de comparecimento" e "Emitir declaração consolidada por período").

**RNF9.5 — Usabilidade da emissão**

A emissão da declaração deve ser simples tanto para a secretaria quanto para pacientes com pouca familiaridade com tecnologia, concluída em até 3 interações a partir da tela do paciente, sem necessidade de treinamento prévio.

A conformidade deve ser verificada por teste de usabilidade com usuários representativos.

Classificação: usabilidade (URPS+).
Rastreabilidade: Feature "Listar sessões com comparecimento registrado do paciente" → CP9 — Emissão de declaração de comparecimento; relacionada à feature "Emitir declaração de comparecimento do paciente".

**RNF9.6 — Portabilidade do documento**

O documento gerado deve poder ser impresso e visualizado em celular, em formato PDF tamanho A4, legível tanto em impressão preto e branco quanto em tela de celular.

A conformidade deve ser verificada por inspeção do documento em impressão e em dispositivo móvel.

Classificação: portabilidade (URPS+).
Rastreabilidade: CP9 — Emissão de declaração de comparecimento (transversal às features "Emitir declaração de comparecimento do paciente", "Reemitir declaração de comparecimento" e "Emitir declaração consolidada por período").

**RNF9.7 — Acessibilidade da tela de emissão e do documento**

A tela de emissão e o documento gerado devem ser acessíveis a pessoas com limitações visuais: texto pesquisável (não em imagem), contraste adequado e navegação por teclado, seguindo a mesma meta de conformidade definida para a CP12 (RNF04).

A conformidade deve ser verificada com leitor de tela e checklist de acessibilidade.

Classificação: acessibilidade (URPS+).
Rastreabilidade: Feature "Listar sessões com comparecimento registrado do paciente" → CP9 — Emissão de declaração de comparecimento; relacionada à feature "Emitir declaração de comparecimento do paciente" e à CP12 — Acessibilidade e usabilidade.

**RNF9.8 — Integridade do conteúdo da declaração**

O conteúdo da declaração deve refletir fielmente o registro da sessão no momento da emissão, e a reemissão deve manter consistência com o conteúdo original, salvo correção do registro.

A conformidade deve ser verificada por teste comparando o documento gerado com os dados de origem, confirmando que 100% dos campos coincidem com o registro da sessão.

Classificação: confiabilidade (URPS+).
Rastreabilidade: Feature "Emitir declaração de comparecimento do paciente" → CP9 — Emissão de declaração de comparecimento; relacionada à feature "Reemitir declaração de comparecimento".

**RNF9.9 — Segurança da consulta pública de autenticidade**

A verificação de autenticidade por terceiros não deve expor dados pessoais além do necessário: a consulta pública deve retornar apenas a confirmação de autenticidade e os dados mínimos definidos com a FBr.

A conformidade deve ser verificada por teste da consulta pública e revisão dos dados retornados.

Classificação: segurança (URPS+).
Rastreabilidade: Feature "Validar autenticidade da declaração" → CP9 — Emissão de declaração de comparecimento.

### Indicadores e Relatórios Institucionais (CP10)

#### Feature — Consultar indicadores operacionais [#22](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/22)

**RNF01 — Atualização dos indicadores operacionais**

Os quatro indicadores exibidos pelo RF01 (vagas ocupadas, tempo médio de espera, taxa de evasão e distribuição de casos por supervisor) devem refletir todos os registros incluídos ou alterados no sistema até, no máximo, 15 minutos antes do momento em que a consulta é feita (ex.: um paciente desligado às 10h00 deve estar refletido na taxa de evasão a partir, no mais tardar, das 10h15).

Classificação: confiabilidade.
Rastreabilidade: Feature "Consultar indicadores operacionais" → CP10 — Indicadores e relatórios institucionais.

#### Feature — Gerar e exportar relatório institucional [#23](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/23)

**RNF02 — Tempo de geração do relatório institucional**

O sistema deve gerar e exibir em tela o relatório institucional consolidado (RF02) em até 5 segundos, contados do acionamento da geração pela coordenação até a exibição completa do conteúdo, para qualquer período de referência de até 12 meses e com até 10 usuários realizando consultas ou gerações de relatórios simultaneamente.

Classificação: desempenho.
Rastreabilidade: Feature "Gerar e exportar relatório institucional" → CP10 — Indicadores e relatórios institucionais.

**RNF03 — Auditoria de relatórios institucionais**

Para cada geração ou exportação do relatório institucional (RF02), o sistema deve registrar o usuário responsável, a data e a hora da operação e o período consultado, mantendo esse registro acessível para consulta por qualquer usuário com perfil de coordenação por, no mínimo, 24 meses a partir do registro, compatível com o ciclo de fiscalização do CRP.

Classificação: auditoria (URPS+).
Rastreabilidade: Feature "Gerar e exportar relatório institucional" → CP10 — Indicadores e relatórios institucionais.

### Segurança, Sigilo e Controle de Acesso (CP11)

Os RNFs abaixo restringem as features da CP11 e valem para todas as funcionalidades internas do sistema que tratam dados pessoais ou de saúde.

#### Feature — Autenticar usuário institucional [#45](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/45)

**RNF13 — Proteção das credenciais de acesso**

As senhas dos usuários institucionais devem ter, no mínimo, 8 caracteres, com pelo menos uma letra e um número, e devem ser armazenadas apenas na forma de hash com algoritmo próprio para senhas (bcrypt ou Argon2), nunca em texto legível. Após 5 tentativas de login seguidas com erro para o mesmo usuário, o sistema deve bloquear novas tentativas desse usuário por 15 minutos.

A conformidade deve ser verificada por inspeção do banco de dados (nenhuma senha legível armazenada) e por teste de 5 tentativas de login com erro, confirmando o bloqueio e sua liberação após 15 minutos.

Classificação: segurança (URPS+).
Rastreabilidade: Feature "Autenticar usuário institucional" → CP11 — Segurança, sigilo e controle de acesso.

#### Feature — Encerrar sessão do usuário [#46](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/46)

**RNF14 — Expiração da sessão por inatividade**

A sessão de um usuário institucional deve ser encerrada automaticamente após 30 minutos sem nenhuma interação com o sistema, para reduzir o risco de exposição de dados em computadores compartilhados da clínica.

A conformidade deve ser verificada por teste: deixar uma sessão parada por 30 minutos e confirmar que a próxima ação exige nova autenticação.

Classificação: segurança (URPS+).
Rastreabilidade: Feature "Encerrar sessão do usuário" → CP11 — Segurança, sigilo e controle de acesso.

#### Feature — Restringir acesso ao prontuário do paciente [#50](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/50)

**RNF15 — Criptografia dos dados**

Toda comunicação entre o navegador e o sistema deve usar HTTPS com TLS 1.2 ou superior, e requisições feitas por HTTP devem ser redirecionadas para HTTPS. Os dados clínicos do prontuário (registros de evolução e relatório final) devem ser armazenados criptografados no banco de dados.

A conformidade deve ser verificada por ferramenta de análise de configuração TLS (ex.: SSL Labs), por teste de acesso via HTTP e por inspeção do banco de dados, confirmando que o conteúdo clínico não aparece em texto legível.

Classificação: segurança (URPS+).
Rastreabilidade: Feature "Restringir acesso ao prontuário do paciente" → CP11 — Segurança, sigilo e controle de acesso.

#### Feature — Consultar registro de acessos ao prontuário [#51](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/51)

**RNF16 — Trilha de auditoria de acessos ao prontuário**

O sistema deve registrar automaticamente todo acesso ao prontuário, permitido ou negado, com o usuário, o perfil, a data/hora, o paciente e a operação realizada. Nenhum perfil pode alterar ou apagar esses registros, que devem ser mantidos por, no mínimo, 5 anos, prazo mínimo de guarda do registro documental definido pelo CFP (a confirmar com a FBr).

A conformidade deve ser verificada por teste: realizar acessos permitidos e negados com usuários de teste e conferir se todos aparecem na consulta do RF19, e por inspeção, confirmando que a interface não oferece meio de alterar ou apagar os registros.

Classificação: auditoria (URPS+).
Rastreabilidade: Feature "Consultar registro de acessos ao prontuário" → CP11 — Segurança, sigilo e controle de acesso.

#### Transversal às features da CP11

**RNF17 — Cópia de segurança e recuperação dos dados**

O sistema deve fazer cópia de segurança completa dos dados pelo menos uma vez por dia, de forma que uma falha cause a perda de, no máximo, 24 horas de registros. As cópias devem ser armazenadas criptografadas, fora do servidor principal, e a restauração deve ser testada pelo menos uma vez por semestre.

A conformidade deve ser verificada por inspeção do histórico de cópias (uma cópia por dia) e por um teste de restauração em ambiente separado, conferindo se os dados restaurados correspondem aos da última cópia.

Classificação: confiabilidade (URPS+).
Rastreabilidade: CP11 — Segurança, sigilo e controle de acesso (transversal às features); responde ao risco IS05 — Dependência tecnológica da intervenção social (Seção 3).

### Acessibilidade e Usabilidade (CP12)

CP12 tem duas features (**Ativar modo de alto contraste** e **Ajustar tamanho do texto**), mas os RNFs abaixo são requisitos de qualidade transversais às páginas voltadas ao público externo (inscrição, consulta de posição na fila, agendamento e confirmação de presença) como um todo — não restringem uma única feature isoladamente, e por isso não foram forçados em uma das duas.

**RNF04 — Conformidade com WCAG 2.2 nível AA**

As páginas voltadas ao público externo devem atender a todos os critérios de sucesso de nível A e AA da WCAG 2.2 aplicáveis a conteúdo web, verificável pela combinação de ferramenta automatizada de auditoria de acessibilidade (ex.: Lighthouse ou axe) e inspeção/teste manual (incluindo navegação por teclado e leitor de tela), sem nenhuma ocorrência de falha de nível A ou AA apontada pela ferramenta ou identificada na inspeção manual.

Classificação: acessibilidade (URPS+).
Rastreabilidade: CP12 — Acessibilidade e usabilidade (transversal às features "Ativar modo de alto contraste" e "Ajustar tamanho do texto").

**RNF05 — Navegação por teclado**

As páginas voltadas ao público externo devem ser operáveis integralmente por teclado — incluindo tabulação entre elementos, ativação de botões e links, e preenchimento e envio de formulários —, sem dependência exclusiva do uso do mouse. Todo elemento interativo (campo, botão ou link) deve exibir um indicador visual de foco (contorno ou destaque) sempre que estiver em foco via teclado, permitindo identificar visualmente a posição atual da navegação.

Classificação: acessibilidade (URPS+).
Rastreabilidade: CP12 — Acessibilidade e usabilidade (transversal às features "Ativar modo de alto contraste" e "Ajustar tamanho do texto").

**RNF06 — Responsividade da interface**

As páginas voltadas ao público externo devem se adaptar corretamente a larguras de tela entre 320 e 1920 pixels, sem perda de funcionalidade, sem sobreposição ou corte de elementos e sem exigir rolagem horizontal em nenhuma largura desse intervalo.

Classificação: usabilidade.
Rastreabilidade: CP12 — Acessibilidade e usabilidade (transversal às features "Ativar modo de alto contraste" e "Ajustar tamanho do texto").
