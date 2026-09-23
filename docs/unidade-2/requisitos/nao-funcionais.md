## 8.2 Lista de Requisitos Não Funcionais

Os requisitos não funcionais (RNFs) descrevem propriedades e restrições mensuráveis do sistema, classificadas conforme o modelo **URPS+** (Usabilidade, Confiabilidade, Desempenho, Suportabilidade e demais categorias, como Segurança e Auditoria). Cada RNF mantém rastreabilidade com a **Feature** que ele restringe e, por meio dela, com a Característica de Produto (CP) de origem — mesma cadeia usada nos [Requisitos Funcionais](funcionais.md).

### Inscrição on-line (CP1)

A CP1 possui três features: **Registrar solicitação de atendimento on-line**, **Emitir comprovante de inscrição** e **Registrar inscrição assistida**.

Os requisitos não funcionais abaixo estabelecem condições de qualidade específicas para o preenchimento do formulário e a proteção das informações registradas durante a inscrição.

As páginas de inscrição também devem atender aos requisitos transversais de acessibilidade e usabilidade definidos na CP14 (RNF56, RNF57 e RNF58).

#### Feature — Registrar solicitação de atendimento on-line

**RNF1 — Identificação e recuperação de erros no formulário**

O formulário de inscrição on-line (RF1) deve apresentar mensagens textuais de erro associadas aos respectivos campos quando houver ausência ou preenchimento inválido de informações obrigatórias.

As mensagens devem identificar o campo que precisa ser corrigido e descrever a correção necessária, sem depender exclusivamente de alterações de cor para comunicar o erro.

Após a identificação de um erro de preenchimento, o sistema deve preservar os valores válidos informados nos demais campos do formulário, permitindo que o interessado conclua a inscrição sem precisar repetir todo o preenchimento.

A conformidade deve ser verificada por meio de testes com campos obrigatórios vazios e entradas inválidas, confirmando a identificação textual dos erros e a preservação das informações válidas previamente inseridas.

Classificação: usabilidade e acessibilidade (URPS+).
Rastreabilidade: Feature "Registrar solicitação de atendimento on-line" → CP1 — Inscrição on-line; complementa os requisitos transversais de acessibilidade da CP14.

#### Feature — Emitir comprovante de inscrição

**RNF2 — Proteção das informações no comprovante de inscrição**

O comprovante eletrônico emitido após o registro da solicitação (RF2) deve apresentar somente as informações necessárias à confirmação do recebimento da inscrição, sem divulgar a queixa informada pelo interessado ou outros dados clínicos registrados no formulário.

As informações clínicas não devem ser incluídas no endereço eletrônico utilizado para acessar a confirmação nem em mensagens públicas de sucesso ou erro relacionadas à emissão do comprovante.

A conformidade deve ser verificada mediante a emissão de comprovantes com dados fictícios, a inspeção de seu conteúdo e a verificação das informações apresentadas na interface e no endereço eletrônico da confirmação.

Classificação: segurança e privacidade (URPS+).
Rastreabilidade: Feature "Emitir comprovante de inscrição" → CP1 — Inscrição on-line; relacionada à CP12 — Segurança, sigilo e controle de acesso.

### Triagem e sinalização de casos (CP2)

As features da CP2 tratam respostas potencialmente sensíveis da inscrição e decisões que afetam a ordem de atendimento. Aplicam-se também os controles transversais de segurança e acesso da CP12, conforme a numeração da Solução Proposta.

#### Feature — Organizar informações da inscrição para triagem

**RNF3 — Sigilo das informações de triagem**

As respostas de triagem e as sinalizações vinculadas à inscrição devem ser exibidas somente a usuários institucionais autorizados para essa finalidade. A interface e as respostas a tentativas de acesso negadas não devem revelar queixa, histórico informado, urgência percebida ou sinalizações clínicas. A conformidade deve ser verificada com inscrições fictícias, comparando consultas autorizadas e tentativas de acesso por perfis não autorizados.

Classificação: segurança e privacidade (URPS+).
Rastreabilidade: Feature "Organizar informações da inscrição para triagem" → CP2 — Triagem e sinalização de casos; relacionada às features "Sinalizar pontos de atenção da inscrição" e "Registrar prioridade clínica do inscrito" e à CP12 — Segurança, sigilo e controle de acesso.

#### Feature — Sinalizar pontos de atenção da inscrição

**RNF4 — Rastreabilidade das regras de sinalização**

Cada ponto de atenção apresentado deve manter vínculo verificável com a resposta original e com a versão da regra institucional aprovada que o produziu. A conformidade deve ser verificada com dados fictícios e casos com e sem correspondência às regras aprovadas, confirmando a origem de cada sinalização e a ausência de cor de prioridade atribuída automaticamente.

Classificação: confiabilidade e auditoria (URPS+).
Rastreabilidade: Feature "Sinalizar pontos de atenção da inscrição" → CP2 — Triagem e sinalização de casos; relacionada a RF5.

#### Feature — Registrar prioridade clínica do inscrito

**RNF5 — Integridade e auditoria das decisões de prioridade**

O registro e a alteração da prioridade devem preservar a classificação anterior, a nova classificação, o usuário institucional responsável e a data e hora de cada decisão. Uma decisão anterior não deve ser sobrescrita ou apagada por uma revisão posterior. A conformidade deve ser verificada com uma inscrição fictícia classificada e depois reclassificada por usuário autorizado, seguida de tentativa de alteração por usuário não autorizado; o histórico deve permanecer íntegro e a fila deve receber apenas a decisão vigente confirmada.

Classificação: confiabilidade, segurança e auditoria (URPS+).
Rastreabilidade: Feature "Registrar prioridade clínica do inscrito" → CP2 — Triagem e sinalização de casos; integração com RF7 (CP3) e controles da CP12 — Segurança, sigilo e controle de acesso.

### Fila de espera e consulta de posição (CP3)

A CP3 possui três features: **Ordenar inscritos na fila de espera**, **Consultar posição individual na fila** e **Informar condições gerais da fila**.

Os RNFs abaixo estabelecem condições de segurança, privacidade, compreensibilidade e confiabilidade das informações apresentadas ao interessado.

Os requisitos de acessibilidade e responsividade da CP14 também se aplicam às páginas públicas de consulta da fila de espera.

#### Feature — Consultar posição individual na fila

**RNF6 — Privacidade e controle de acesso à consulta da fila**

A consulta individual da fila de espera (RF8) deve impedir que o conhecimento isolado do CPF ou do número de inscrição permita a um usuário não autorizado acessar informações individuais de outro inscrito.

O sistema deve exigir a verificação da identidade do solicitante conforme o RF52 da CP12, mediante CPF ou número de inscrição e código de uso único enviado ao contato cadastrado. A posição e a situação individual na fila somente devem ser apresentadas após a confirmação bem-sucedida da identidade, respeitando as restrições de acesso estabelecidas na CP12.

As respostas de consultas não autorizadas não devem revelar a posição, a classificação de prioridade, a queixa ou outros dados individuais da solicitação consultada.

A conformidade deve ser verificada por meio de testes com inscrições fictícias, contemplando consultas autorizadas e tentativas de acesso a registros de terceiros mediante o conhecimento de seus identificadores.

Em todos os casos de acesso não autorizado, nenhuma informação individual da inscrição consultada deve ser divulgada.

Classificação: segurança e privacidade (URPS+).
Rastreabilidade: Feature "Consultar posição individual na fila" → CP3 — Fila de espera e consulta de posição; relacionada à CP12 — Segurança, sigilo e controle de acesso. Dependência: RF52 — Verificar identidade do paciente ou responsável (CP12).

**RNF7 — Compreensibilidade das informações sobre a posição na fila**

A interface de consulta da fila de espera (RF8) deve apresentar de forma clara e legível a posição e a situação atual do inscrito, acompanhadas de informação explícita de que a posição pode variar e não representa garantia de prazo ou data de atendimento.

O aviso deve ser exibido junto ao resultado da consulta, sem exigir que o interessado acesse outra página, abra um documento adicional ou realize uma operação específica para visualizar essa informação.

A conformidade deve ser verificada em testes da interface, confirmando que todas as consultas individuais realizadas com sucesso apresentam a informação sobre a possibilidade de alteração da posição e a ausência de garantia de prazo de atendimento.

Classificação: usabilidade (URPS+).
Rastreabilidade: Feature "Consultar posição individual na fila" → CP3 — Fila de espera e consulta de posição → IS03 — Expectativa sobre a fila.

#### Feature — Informar condições gerais da fila

**RNF8 — Confiabilidade das informações institucionais da fila**

As informações institucionais sobre capacidade e critérios gerais de atendimento apresentadas pelo sistema (RF9) devem corresponder à versão vigente do conteúdo aprovado pela coordenação da Clínica Escola FBr.

O sistema deve apresentar a data da última atualização das informações divulgadas e substituir a versão anterior quando uma nova publicação autorizada for realizada.

Informações de capacidade que não estejam aprovadas ou vigentes não devem ser apresentadas como disponibilidade confirmada de vagas.

A conformidade deve ser verificada mediante a publicação de informações institucionais fictícias, a atualização autorizada de seu conteúdo e a conferência da versão e da data exibidas ao interessado.

Após a publicação da atualização, a consulta deve apresentar exclusivamente a versão vigente das informações institucionais.

Classificação: confiabilidade (URPS+).
Rastreabilidade: Feature "Informar condições gerais da fila" → CP3 — Fila de espera e consulta de posição → IS02 — Aumento da demanda.

### Agendamento, Confirmação e Remarcação (CP4)

A CP4 tem oito features (ver [Requisitos Funcionais](funcionais.md)); os RNFs abaixo estabelecem condições de qualidade para o agendamento, a confirmação, o lembrete e o cancelamento de sessões, aplicando-se de forma transversal ao conjunto das features, conforme indicado na rastreabilidade de cada um. Os RNFs de segurança e privacidade devem ser alinhados com os requisitos gerais de acesso e sigilo da CP12, evitando duplicidade, e a acessibilidade das páginas voltadas ao paciente (confirmação de presença) segue a mesma meta definida para a CP14 (RNF56).

**RNF9 — Integridade do agendamento**

Duas sessões não podem ser agendadas para o mesmo horário do mesmo estagiário, nem para o mesmo horário do mesmo paciente, mesmo em caso de duas requisições simultâneas de agendamento ou remarcação.

A conformidade deve ser verificada por teste de concorrência, com duas tentativas simultâneas de agendar ou remarcar uma sessão para o mesmo horário do mesmo estagiário, confirmando que apenas uma é aceita.

Classificação: confiabilidade (URPS+).
Rastreabilidade: CP4 — Agendamento, confirmação e remarcação (transversal às features "Agendar sessão do paciente" e "Reagendar sessão do paciente").

**RNF10 — Auditoria das operações sobre a sessão**

Todo agendamento, remarcação, confirmação e cancelamento de sessão deve ser registrado com usuário responsável, data/hora e o estado anterior e novo da sessão. Esses registros não podem ser apagados nem sobrescritos.

A conformidade deve ser verificada por teste de integração, confirmando o registro de auditoria após cada uma dessas operações.

Classificação: auditoria (URPS+).
Rastreabilidade: CP4 — Agendamento, confirmação e remarcação (transversal às features "Agendar sessão do paciente", "Reagendar sessão do paciente", "Confirmar presença em sessão agendada", "Registrar cancelamento de sessão pelo paciente" e "Registrar cancelamento de sessão pelo estagiário").

**RNF11 — Confiabilidade do envio de lembretes**

O sistema deve garantir uma taxa de entrega de pelo menos 98% dos lembretes de sessão enviados, com nova tentativa automática em caso de falha de envio dentro de 1 hora, e deve registrar o envio ou a falha de cada lembrete para consulta posterior.

A conformidade deve ser verificada por teste com envio simulado, incluindo cenários de falha, conferindo a taxa de entrega e o registro de tentativas.

Classificação: confiabilidade (URPS+).
Rastreabilidade: Feature "Enviar lembrete de sessão agendada" → CP4 — Agendamento, confirmação e remarcação.

**RNF12 — Tempo de resposta nas operações de agendamento**

As operações de agendar, reagendar, confirmar presença e registrar cancelamento devem apresentar retorno em até 2 segundos para 95% das requisições realizadas em condições normais de uso.

A conformidade deve ser verificada por teste de desempenho com dados representativos do volume da clínica (cerca de 100 vagas e 160 a 180 inscrições por semestre).

Classificação: desempenho (URPS+).
Rastreabilidade: CP4 — Agendamento, confirmação e remarcação (transversal às features "Agendar sessão do paciente", "Reagendar sessão do paciente", "Confirmar presença em sessão agendada", "Registrar cancelamento de sessão pelo paciente" e "Registrar cancelamento de sessão pelo estagiário").

**RNF13 — Privacidade da agenda por perfil**

O estagiário deve visualizar apenas sua própria agenda de sessões; o supervisor deve visualizar apenas a agenda dos estagiários sob sua supervisão, conforme o vínculo definido na CP5.

A conformidade deve ser verificada por testes de autorização, com cenários positivos e negativos, confirmando a ausência de acesso à agenda de estagiários sem vínculo de supervisão.

Classificação: privacidade (URPS+).
Rastreabilidade: Feature "Consultar agenda de sessões do estagiário" → CP4 — Agendamento, confirmação e remarcação; relacionada à CP12 — Segurança, sigilo e controle de acesso.

**RNF14 — Disponibilidade do módulo de agendamento**

O módulo de agendamento e confirmação deve estar disponível em pelo menos 99% do horário comercial (8h–18h, dias úteis), dado que indisponibilidades nesse módulo impactam diretamente a operação da clínica.

A conformidade deve ser verificada por monitoramento contínuo de disponibilidade durante o período de operação.

Classificação: confiabilidade (URPS+).
Rastreabilidade: CP4 — Agendamento, confirmação e remarcação (transversal a todas as features).

**RNF15 — Usabilidade da confirmação de presença pelo paciente**

A confirmação de presença deve ser possível a partir do link enviado no lembrete (RF13), sem exigir login ou cadastro de senha, em no máximo 2 interações, considerando o público com pouca familiaridade com tecnologia atendido pela clínica.

A conformidade deve ser verificada por teste de usabilidade com usuários representativos, incluindo pessoas com baixo letramento digital.

Classificação: usabilidade (URPS+).
Rastreabilidade: Feature "Confirmar presença em sessão agendada" → CP4 — Agendamento, confirmação e remarcação; relacionada à CP14 — Acessibilidade e usabilidade.

### Distribuição de casos entre supervisores e estagiários (CP5)

A CP5 tem nove features (ver [Requisitos Funcionais](funcionais.md)); os RNFs abaixo estabelecem condições de qualidade para a distribuição de casos, a vinculação de pacientes a estagiários e o acompanhamento dos vínculos, aplicando-se de forma transversal ao conjunto das features, conforme indicado na rastreabilidade de cada um. Os RNFs de segurança e privacidade (RNF16 e RNF17) devem ser alinhados com os requisitos gerais de acesso e sigilo da CP12, evitando duplicidade, e o RNF24 segue a mesma meta de acessibilidade definida para a CP14 (RNF56).

**RNF16 — Autorização para distribuição, vínculo e transferência de casos**

Somente a coordenação e os supervisores autorizados podem distribuir, vincular e transferir casos; o estagiário e o supervisor só podem acessar os casos sob sua própria responsabilidade.

A conformidade deve ser verificada por testes de autorização, com cenários positivos e negativos, para os perfis paciente, secretaria, estagiário, supervisor e coordenação, sem nenhum acesso indevido.

Classificação: segurança (URPS+).
Rastreabilidade: CP5 — Distribuição de casos entre supervisores e estagiários (transversal a todas as features da CP5).

**RNF17 — Privacidade dos dados nas telas de distribuição e consulta**

As telas de distribuição de casos e de consulta de responsáveis devem exibir apenas os dados necessários a cada perfil; dados clínicos só podem aparecer a quem tem acesso ao prontuário do caso, conforme a CP12.

A conformidade deve ser verificada por revisão das telas por perfil e por teste do conteúdo efetivamente exibido, confirmando a ausência de campos clínicos para perfis sem acesso ao prontuário.

Classificação: privacidade (URPS+).
Rastreabilidade: CP5 — Distribuição de casos entre supervisores e estagiários (transversal às features "Listar casos aguardando distribuição", "Consultar responsáveis pelo caso" e "Consultar casos sob responsabilidade do estagiário ou supervisor").

**RNF18 — Auditoria de atribuições, vínculos e transferências**

Toda atribuição, vínculo, alteração e transferência de responsável por um caso deve ser registrada com data/hora, autor da ação, caso envolvido e responsáveis anterior e novo.

A conformidade deve ser verificada por teste de integração, confirmando o registro de auditoria após cada operação de distribuição, vínculo ou transferência.

Classificação: auditoria (URPS+).
Rastreabilidade: CP5 — Distribuição de casos entre supervisores e estagiários (transversal às features "Distribuir caso a supervisor conforme área de especialidade", "Vincular paciente a estagiário responsável", "Transferir caso para outro estagiário ou supervisor" e "Consultar histórico de responsáveis do caso").

**RNF19 — Integridade dos vínculos de responsabilidade**

Nenhum caso ativo pode ficar sem supervisor e estagiário responsáveis após a distribuição, nem ter dois responsáveis principais vigentes ao mesmo tempo, salvo confirmação futura do atendimento em dupla (RN5.9).

A conformidade deve ser garantida por restrições de integridade no banco de dados, além de testes de regra de negócio, sem nenhuma inconsistência de vínculo identificada.

Classificação: confiabilidade (URPS+).
Rastreabilidade: CP5 — Distribuição de casos entre supervisores e estagiários (transversal às features "Distribuir caso a supervisor conforme área de especialidade", "Vincular paciente a estagiário responsável" e "Transferir caso para outro estagiário ou supervisor").

**RNF20 — Continuidade do histórico na troca de responsável**

A troca de responsável por um caso não deve causar perda de informação: as sessões, a evolução e os vínculos anteriores devem permanecer disponíveis ao novo responsável autorizado após a transferência.

A conformidade deve ser verificada por teste comparando o histórico do caso antes e depois da transferência, confirmando que a totalidade dos registros anteriores permanece acessível.

Classificação: confiabilidade (URPS+).
Rastreabilidade: Feature "Transferir caso para outro estagiário ou supervisor" → CP5 — Distribuição de casos entre supervisores e estagiários; relacionada à feature "Consultar histórico de responsáveis do caso".

**RNF21 — Desempenho das listagens e operações de vínculo**

As listagens de casos e as operações de distribuição, vínculo e consulta de responsáveis devem responder rapidamente, considerando o volume de casos da clínica (cerca de 100 vagas e 160 a 180 inscrições por semestre).

A conformidade deve ser verificada por teste de desempenho com dados representativos, com listagens e operações de vínculo respondendo em até 3 segundos em 95% das requisições, em condições normais de uso.

Classificação: desempenho (URPS+).
Rastreabilidade: CP5 — Distribuição de casos entre supervisores e estagiários (transversal às features "Listar casos aguardando distribuição", "Consultar responsáveis pelo caso", "Consultar casos sob responsabilidade do estagiário ou supervisor" e "Visualizar distribuição de casos por supervisor").

**RNF22 — Usabilidade da distribuição e do vínculo de casos**

O supervisor e a coordenação devem conseguir distribuir e vincular casos sem treinamento prévio, inclusive a partir do celular, concluindo a distribuição de um caso em até 3 interações a partir da lista de pendentes.

A conformidade deve ser verificada por teste de usabilidade com usuários representativos, em telas responsivas.

Classificação: usabilidade (URPS+).
Rastreabilidade: CP5 — Distribuição de casos entre supervisores e estagiários (transversal às features "Listar casos aguardando distribuição", "Distribuir caso a supervisor conforme área de especialidade" e "Vincular paciente a estagiário responsável").

**RNF23 — Manutenibilidade das áreas de especialidade**

A lista de áreas de especialidade e sua associação aos supervisores deve poder ser mantida pela coordenação diretamente pela interface, sem necessidade de alteração de código ou intervenção técnica.

A conformidade deve ser verificada por teste de aceitação com o perfil de coordenação, incluindo, editando e removendo áreas de especialidade.

Classificação: manutenibilidade (URPS+).
Rastreabilidade: Feature "Registrar áreas de especialidade do supervisor" → CP5 — Distribuição de casos entre supervisores e estagiários.

**RNF24 — Acessibilidade das telas de distribuição e consulta**

As telas de distribuição de casos, vínculo e consulta de responsáveis devem ser acessíveis, seguindo a mesma meta de conformidade definida para a CP14 (RNF56): navegação por teclado, contraste adequado e compatibilidade com leitor de tela.

A conformidade deve ser verificada com leitor de tela e checklist de acessibilidade.

Classificação: acessibilidade (URPS+).
Rastreabilidade: CP5 — Distribuição de casos entre supervisores e estagiários (transversal às features "Listar casos aguardando distribuição", "Registrar áreas de especialidade do supervisor", "Distribuir caso a supervisor conforme área de especialidade", "Vincular paciente a estagiário responsável", "Consultar responsáveis pelo caso", "Consultar casos sob responsabilidade do estagiário ou supervisor" e "Visualizar distribuição de casos por supervisor"); relacionada à CP14 — Acessibilidade e usabilidade.

### Prontuário eletrônico (CP6)

A CP6 tem uma feature (ver [Requisitos Funcionais](funcionais.md)); o RNF abaixo estabelece a condição de qualidade para a consulta ao prontuário. As condições de integridade, auditoria e desempenho relativas ao registro da evolução em si estão declaradas na CP7, e as relativas ao relatório final, na CP8.

**RNF25 — Sigilo do conteúdo do prontuário**

O prontuário eletrônico deve ser acessível somente ao estagiário responsável pelo caso e ao seu supervisor, conforme o vínculo vigente e o RF55 — Restringir acesso ao prontuário (CP12). Listagens, mensagens de erro e respostas a solicitações negadas não devem expor conteúdo clínico a outros perfis.

A conformidade deve ser verificada com casos fictícios, testando acesso permitido e negado antes e depois de uma transferência de responsável.

Classificação: segurança e privacidade (URPS+).
Rastreabilidade: Feature "Consultar prontuário do paciente" → CP6 — Prontuário eletrônico; relacionada ao RF55 (CP12).

### Registro de evolução por sessão (CP7)

A CP7 tem quatro features (ver [Requisitos Funcionais](funcionais.md)); os RNFs abaixo estabelecem condições de qualidade para o registro, a correção e a consulta da evolução clínica de cada sessão.

**RNF26 — Sigilo do conteúdo da evolução**

O conteúdo de uma evolução registrada deve ser acessível somente ao estagiário responsável pelo caso e ao seu supervisor, conforme o vínculo vigente definido na CP5 e a restrição de acesso ao prontuário (RF55, CP12). Listagens, mensagens de erro e respostas a solicitações negadas não devem expor conteúdo clínico a outros perfis.

A conformidade deve ser verificada com casos fictícios, testando acesso permitido e negado antes e depois de uma transferência de responsável.

Classificação: segurança e privacidade (URPS+).
Rastreabilidade: CP7 — Registro de evolução por sessão (transversal às features "Registrar evolução da sessão realizada", "Corrigir evolução registrada", "Consultar evolução de uma sessão específica" e "Consultar histórico de evolução do paciente"); relacionada à CP12 — Segurança, sigilo e controle de acesso.

**RNF27 — Integridade e proveniência dos registros de evolução**

Cada evolução persistida deve conservar sua associação à sessão, ao paciente, ao ciclo, ao autor e ao momento de registro. O histórico não deve ser perdido nem associado a outro caso após troca de responsável (RF25).

A conformidade deve ser verificada por comparação entre sessão, evolução e histórico antes e depois de uma transferência de caso.

Classificação: confiabilidade e auditoria (URPS+).
Rastreabilidade: Feature "Registrar evolução da sessão realizada" → CP7 — Registro de evolução por sessão; relacionada a RF25 e RNF20.

**RNF28 — Auditoria das correções de evolução**

Toda correção de um registro de evolução (RF29 — Corrigir evolução registrada) deve preservar o conteúdo original, sem sobrescrita silenciosa, e deve registrar o autor, a data/hora e o motivo de cada correção, de forma que o histórico completo de versões de uma evolução fique disponível para consulta.

A conformidade deve ser verificada corrigindo um registro de evolução fictício e conferindo que a versão original permanece acessível junto com a nova versão, o autor e o motivo da correção.

Classificação: auditoria e confiabilidade (URPS+).
Rastreabilidade: Feature "Corrigir evolução registrada" → CP7 — Registro de evolução por sessão.

**RNF29 — Desempenho do registro e da consulta de evolução**

O registro de uma nova evolução e a consulta de uma evolução já registrada devem apresentar retorno em até 2 segundos para 95% das requisições em condições normais de uso.

A conformidade deve ser verificada por teste de desempenho com dados representativos do volume de sessões da clínica.

Classificação: desempenho (URPS+).
Rastreabilidade: CP7 — Registro de evolução por sessão (transversal às features "Registrar evolução da sessão realizada" e "Consultar evolução de uma sessão específica").

**RNF30 — Usabilidade do registro de evolução**

O registro de uma evolução deve ser simples e rápido o suficiente para ser preenchido pelo estagiário logo após a sessão, sem exigir treinamento prévio além da orientação inicial de uso do sistema.

A conformidade deve ser verificada por teste de usabilidade com estagiários representativos, medindo o tempo e o número de interações necessários para concluir um registro.

Classificação: usabilidade (URPS+).
Rastreabilidade: Feature "Registrar evolução da sessão realizada" → CP7 — Registro de evolução por sessão.

### Geração do relatório final de evolução (CP8)

A CP8 tem uma feature (ver [Requisitos Funcionais](funcionais.md)); o RNF abaixo estabelece a condição de qualidade para a geração do relatório final.

**RNF31 — Fidelidade e rastreabilidade do relatório final**

Cada versão gerada do relatório deve identificar o ciclo e os registros de evolução usados como origem. O conteúdo consolidado deve ser verificável contra esses registros, sem substituir, omitir silenciosamente ou inventar informação clínica. Uma nova geração após correção de evolução deve produzir versão distinguível da anterior.

Como o relatório final passa a ser entregue ao paciente (ou ao seu responsável legal, quando menor de idade — RF33), conforme confirmado pela Clínica Escola na reunião de 26/08/2026 ([ata](../../unidade-1/reunioes.md)), o canal de entrega deve exigir a mesma verificação de identidade já aplicada às demais consultas do paciente (RF52, CP12) antes de disponibilizar o conteúdo clínico, e não deve expor o relatório de um paciente a outro.

A conformidade deve ser verificada com ciclo fictício contendo registros completos e lacunas, comparando as versões do relatório com os registros de origem, e tentando acessar o relatório de um paciente fictício sem completar a verificação de identidade prevista no RF52.

Classificação: confiabilidade, auditoria, segurança e privacidade (URPS+).
Rastreabilidade: Feature "Gerar relatório final de evolução" → CP8 — Geração do relatório final de evolução → OE5/OE6; relacionada ao RF52 (CP12).

### Controle de assiduidade e alertas (CP9)

A CP9 tem cinco features (ver [Requisitos Funcionais](funcionais.md)); os RNFs abaixo estabelecem condições de qualidade para a contagem de faltas, o alerta de limite e a liberação da vaga, complementando a declaração tardia desta CP (ver a nota de contexto na seção correspondente de [Requisitos Funcionais](funcionais.md#controle-de-assiduidade-e-alertas-cp9)).

#### Controle de faltas do paciente

**RNF32 — Integridade e auditoria da contagem de faltas**

A contagem de faltas consecutivas do paciente (RF35) e os eventos que a originam (RF34, RF14, RF15) devem ser registrados de forma íntegra e não podem ser apagados ou alterados sem registro de quem alterou, quando e por quê. Toda decisão de desligamento por faltas (RF37) deve preservar o histórico de faltas que a fundamentou, mesmo após a liberação da vaga.

A conformidade deve ser verificada registrando faltas com dados fictícios e confirmando, por inspeção do histórico, que nenhum perfil consegue apagar ou alterar os registros de falta sem deixar rastro da alteração.

Classificação: auditoria (URPS+).
Rastreabilidade: Feature "Contabilizar faltas consecutivas do paciente" → CP9 — Controle de assiduidade e alertas; relacionada às features "Registrar falta do paciente na sessão" e "Desligar paciente por faltas e liberar vaga".

**RNF33 — Visibilidade do alerta de limite de faltas**

O alerta de limite de faltas (RF36) deve ser exibido com destaque visual (cor vermelha) e permanecer visível à secretaria, ao estagiário responsável e à coordenação em toda sessão de uso, sem exigir navegação adicional para localizá-lo, até que a decisão de desligamento seja registrada.

A conformidade deve ser verificada demonstrando, para um paciente com o limite de faltas atingido, que o alerta aparece de forma destacada aos três perfis mencionados ao acessarem o sistema, sem etapas de navegação adicionais.

Classificação: usabilidade (URPS+).
Rastreabilidade: Feature "Emitir alerta de limite de faltas atingido" → CP9 — Controle de assiduidade e alertas.

**RNF34 — Tempo de liberação da vaga após desligamento**

A liberação da vaga e a sinalização para realocação à fila de espera (CP3) devem ocorrer imediatamente após o registro do desligamento (RF37), sem intervenção manual adicional, para evitar que a vaga permaneça ociosa — o problema que motivou a criação desta CP.

A conformidade deve ser verificada por teste, confirmando que, imediatamente após o registro do desligamento de um paciente fictício, a vaga correspondente aparece disponível para realocação na fila de espera (CP3).

Classificação: desempenho (URPS+).
Rastreabilidade: Feature "Desligar paciente por faltas e liberar vaga" → CP9 — Controle de assiduidade e alertas; relacionada à CP3 — Fila de espera e consulta de posição.

#### Controle de faltas do estagiário

**RNF35 — Privacidade dos dados de faltas do estagiário**

A relação de faltas do estagiário (RF39) deve ser visível apenas ao supervisor responsável e à coordenação, conforme os perfis definidos na CP12, e não deve ser exposta a outros estagiários nem a pacientes.

A conformidade deve ser verificada testando o acesso de um usuário sem vínculo de supervisão à relação de faltas de um estagiário e confirmando a negação do acesso.

Classificação: segurança e privacidade (URPS+).
Rastreabilidade: Feature "Consolidar faltas do estagiário para a supervisão" → CP9 — Controle de assiduidade e alertas; relacionada à CP12 — Segurança, sigilo e controle de acesso.

### Registros administrativos do atendimento (CP10)

A CP10 reúne as condições de qualidade das antigas características "Registro da Contribuição Social" e "Emissão de Declaração de Comparecimento", agrupadas em uma única CP10 conforme a [Solução Proposta, §2.3](../../unidade-1/solucao-proposta.md#23-caracteristicas-de-produto-mapeadas-com-os-objetivos-especificos).

#### Contribuição social

#### Feature — Registrar pagamento da contribuição social do paciente [#43](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/43)

**RNF36 — Auditoria dos registros de contribuição social**

Todo registro de pagamento da contribuição social (RF41) deve guardar o usuário responsável, a data/hora da operação, o paciente, o valor, a data e a forma de pagamento. Esses dados não podem ser apagados nem sobrescritos, e devem ficar disponíveis para consulta pela coordenação por, no mínimo, 24 meses, prazo compatível com o ciclo de fiscalização do CRP (mesmo prazo do RNF48).

A conformidade deve ser verificada por inspeção: registrar pagamentos com dados fictícios, conferir se todos os campos acima foram guardados e confirmar que nenhum perfil consegue apagá-los ou alterá-los pela interface.

Classificação: auditoria (URPS+).
Rastreabilidade: Feature "Registrar pagamento da contribuição social do paciente" → CP10 — Registros administrativos do atendimento.

#### Declaração de comparecimento

Este conjunto reúne cinco features (ver [Requisitos Funcionais](funcionais.md)); os RNFs abaixo estabelecem condições de qualidade para a emissão, reemissão e verificação da declaração de comparecimento, aplicando-se de forma transversal ao conjunto das features, conforme indicado na rastreabilidade de cada um. A rastreabilidade de cada RNF identifica explicitamente as features afetadas, preservando a relação CP10 → feature → RNF. Os RNFs de segurança e privacidade (RNF37 a RNF39) devem ser alinhados com os requisitos gerais de acesso e sigilo da CP12, evitando duplicidade, e o RNF43 segue a mesma meta de acessibilidade definida para a CP14 (RNF56).

**RNF37 — Privacidade dos dados na declaração**

A declaração de comparecimento deve conter apenas os dados estritamente necessários e nenhum dado clínico (queixa, prioridade, diagnóstico, evolução), com o conteúdo mínimo aprovado pela FBr.

A conformidade deve ser verificada por revisão do modelo do documento e por teste do conteúdo efetivamente gerado, confirmando a ausência de campos clínicos.

Classificação: privacidade (URPS+).
Rastreabilidade: CP10 — Registros administrativos do atendimento (transversal às features "Emitir declaração de comparecimento do paciente" e "Reemitir declaração de comparecimento").

**RNF38 — Autorização para emissão e consulta**

Somente perfis autorizados podem emitir declarações, e o paciente ou responsável só pode acessar e emitir declarações das próprias sessões.

A conformidade deve ser verificada por testes de autorização, com cenários positivos e negativos, para os perfis paciente, secretaria, estagiário e supervisor, sem nenhum acesso indevido.

Classificação: segurança (URPS+).
Rastreabilidade: CP10 — Registros administrativos do atendimento (transversal às features "Listar sessões com comparecimento registrado do paciente", "Emitir declaração de comparecimento do paciente" e "Reemitir declaração de comparecimento").

**RNF39 — Auditoria de emissões e reemissões**

Toda emissão e reemissão de declaração deve ser registrada com usuário, data/hora, sessão e paciente, distinguindo emissão original de reemissão.

A conformidade deve ser verificada por teste de integração, confirmando o registro de auditoria após cada emissão e reemissão.

Classificação: auditoria (URPS+).
Rastreabilidade: Feature "Emitir declaração de comparecimento do paciente" → CP10 — Registros administrativos do atendimento; relacionada à feature "Reemitir declaração de comparecimento".

**RNF40 — Tempo de geração da declaração**

A geração da declaração deve ser rápida o suficiente para o atendimento presencial na secretaria: o documento deve ficar disponível em até 5 segundos em 95% das solicitações, em condições normais de uso.

A conformidade deve ser verificada por teste de desempenho com dados representativos.

Classificação: desempenho (URPS+).
Rastreabilidade: CP10 — Registros administrativos do atendimento (transversal às features "Emitir declaração de comparecimento do paciente" e "Reemitir declaração de comparecimento").

**RNF41 — Usabilidade da emissão**

A emissão da declaração deve ser simples tanto para a secretaria quanto para pacientes com pouca familiaridade com tecnologia, concluída em até 3 interações a partir da tela do paciente, sem necessidade de treinamento prévio.

A conformidade deve ser verificada por teste de usabilidade com usuários representativos.

Classificação: usabilidade (URPS+).
Rastreabilidade: Feature "Listar sessões com comparecimento registrado do paciente" → CP10 — Registros administrativos do atendimento; relacionada à feature "Emitir declaração de comparecimento do paciente".

**RNF42 — Portabilidade do documento**

O documento gerado deve ser entregue ao paciente em formato impresso (papel), conforme confirmado pela Clínica Escola. Internamente, o sistema pode gerar e pré-visualizar o documento em tela — inclusive em celular, para conferência antes da impressão —, em formato PDF tamanho A4, legível tanto em impressão preto e branco quanto em tela.

A conformidade deve ser verificada por inspeção do documento em impressão e em dispositivo móvel.

Classificação: portabilidade (URPS+).
Rastreabilidade: CP10 — Registros administrativos do atendimento (transversal às features "Emitir declaração de comparecimento do paciente" e "Reemitir declaração de comparecimento").

**RNF43 — Acessibilidade da tela de emissão e do documento**

A tela de emissão e o documento gerado devem ser acessíveis a pessoas com limitações visuais: texto pesquisável (não em imagem), contraste adequado e navegação por teclado, seguindo a mesma meta de conformidade definida para a CP14 (RNF56).

A conformidade deve ser verificada com leitor de tela e checklist de acessibilidade.

Classificação: acessibilidade (URPS+).
Rastreabilidade: Feature "Listar sessões com comparecimento registrado do paciente" → CP10 — Registros administrativos do atendimento; relacionada à feature "Emitir declaração de comparecimento do paciente" e à CP14 — Acessibilidade e usabilidade.

**RNF44 — Integridade do conteúdo da declaração**

O conteúdo da declaração deve refletir fielmente o registro da sessão no momento da emissão, e a reemissão deve manter consistência com o conteúdo original, salvo correção do registro.

A conformidade deve ser verificada por teste comparando o documento gerado com os dados de origem, confirmando que 100% dos campos coincidem com o registro da sessão.

Classificação: confiabilidade (URPS+).
Rastreabilidade: Feature "Emitir declaração de comparecimento do paciente" → CP10 — Registros administrativos do atendimento; relacionada à feature "Reemitir declaração de comparecimento".

**RNF45 — Segurança da consulta pública de autenticidade**

A verificação de autenticidade por terceiros não deve expor dados pessoais além do necessário: a consulta pública deve retornar apenas a confirmação de autenticidade e os dados mínimos definidos com a FBr.

A conformidade deve ser verificada por teste da consulta pública e revisão dos dados retornados.

Classificação: segurança (URPS+).
Rastreabilidade: Feature "Validar autenticidade da declaração" → CP10 — Registros administrativos do atendimento.

### Indicadores e Relatórios Institucionais (CP11)

#### Feature — Consultar indicadores operacionais [#22](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/22)

**RNF46 — Atualização dos indicadores operacionais**

Os quatro indicadores exibidos pelo RF48 (vagas ocupadas, tempo médio de espera, taxa de evasão e distribuição de casos por supervisor) devem refletir todos os registros incluídos ou alterados no sistema até, no máximo, 15 minutos antes do momento em que a consulta é feita (ex.: um paciente desligado às 10h00 deve estar refletido na taxa de evasão a partir, no mais tardar, das 10h15).

Classificação: confiabilidade (URPS+).
Rastreabilidade: Feature "Consultar indicadores operacionais" → CP11 — Indicadores e relatórios institucionais.

#### Feature — Gerar e exportar relatório institucional [#23](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/23)

**RNF47 — Tempo de geração do relatório institucional**

O sistema deve gerar e exibir em tela o relatório institucional consolidado (RF49) em até 5 segundos, contados do acionamento da geração pela coordenação até a exibição completa do conteúdo, para qualquer período de referência de até 12 meses e com até 10 usuários realizando consultas ou gerações de relatórios simultaneamente.

Classificação: desempenho (URPS+).
Rastreabilidade: Feature "Gerar e exportar relatório institucional" → CP11 — Indicadores e relatórios institucionais.

**RNF48 — Auditoria de relatórios institucionais**

Para cada geração ou exportação do relatório institucional (RF49), o sistema deve registrar o usuário responsável, a data e a hora da operação e o período consultado, mantendo esse registro acessível para consulta por qualquer usuário com perfil de coordenação por, no mínimo, 24 meses a partir do registro, compatível com o ciclo de fiscalização do CRP.

Classificação: auditoria (URPS+).
Rastreabilidade: Feature "Gerar e exportar relatório institucional" → CP11 — Indicadores e relatórios institucionais.

### Segurança, Sigilo e Controle de Acesso (CP12)

Os RNFs abaixo restringem as features da CP12 e valem para todas as funcionalidades internas do sistema que tratam dados pessoais ou de saúde.

#### Feature — Autenticar usuário institucional [#45](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/45)

**RNF49 — Proteção das credenciais de acesso**

As senhas dos usuários institucionais devem ter, no mínimo, 8 caracteres, com pelo menos uma letra e um número, e devem ser armazenadas apenas na forma de hash com algoritmo próprio para senhas (bcrypt ou Argon2), nunca em texto legível. Após 5 tentativas de login seguidas com erro para o mesmo usuário, o sistema deve bloquear novas tentativas desse usuário por 15 minutos.

A conformidade deve ser verificada por inspeção do banco de dados (nenhuma senha legível armazenada) e por teste de 5 tentativas de login com erro, confirmando o bloqueio e sua liberação após 15 minutos.

Classificação: segurança (URPS+).
Rastreabilidade: Feature "Autenticar usuário institucional" → CP12 — Segurança, sigilo e controle de acesso.

#### Feature — Encerrar sessão do usuário [#46](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/46)

**RNF50 — Expiração da sessão por inatividade**

A sessão de um usuário institucional deve ser encerrada automaticamente após 30 minutos sem nenhuma interação com o sistema, para reduzir o risco de exposição de dados em computadores compartilhados da clínica.

A conformidade deve ser verificada por teste: deixar uma sessão parada por 30 minutos e confirmar que a próxima ação exige nova autenticação.

Classificação: segurança (URPS+).
Rastreabilidade: Feature "Encerrar sessão do usuário" → CP12 — Segurança, sigilo e controle de acesso.

#### Feature — Restringir acesso ao prontuário do paciente [#50](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/50)

**RNF51 — Criptografia dos dados**

Toda comunicação entre o navegador e o sistema deve usar HTTPS com TLS 1.2 ou superior, e requisições feitas por HTTP devem ser redirecionadas para HTTPS. Os dados clínicos do prontuário (registros de evolução e relatório final) devem ser armazenados criptografados no banco de dados.

A conformidade deve ser verificada por ferramenta de análise de configuração TLS (ex.: SSL Labs), por teste de acesso via HTTP e por inspeção do banco de dados, confirmando que o conteúdo clínico não aparece em texto legível.

Classificação: segurança (URPS+).
Rastreabilidade: Feature "Restringir acesso ao prontuário do paciente" → CP12 — Segurança, sigilo e controle de acesso.

#### Feature — Consultar registro de acessos ao prontuário [#51](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/51)

**RNF52 — Trilha de auditoria de acessos ao prontuário**

O sistema deve registrar automaticamente todo acesso ao prontuário, permitido ou negado, com o usuário, o perfil, a data/hora, o paciente e a operação realizada. Nenhum perfil pode alterar ou apagar esses registros, que devem ser mantidos por, no mínimo, 5 anos, prazo mínimo de guarda do registro documental definido pelo CFP (a confirmar com a FBr).

A conformidade deve ser verificada por teste: realizar acessos permitidos e negados com usuários de teste e conferir se todos aparecem na consulta do RF56, e por inspeção, confirmando que a interface não oferece meio de alterar ou apagar os registros.

Classificação: auditoria (URPS+).
Rastreabilidade: Feature "Consultar registro de acessos ao prontuário" → CP12 — Segurança, sigilo e controle de acesso.

#### Transversal às features da CP12

**RNF53 — Cópia de segurança e recuperação dos dados**

O sistema deve fazer cópia de segurança completa dos dados pelo menos uma vez por dia, de forma que uma falha cause a perda de, no máximo, 24 horas de registros. As cópias devem ser armazenadas criptografadas, fora do servidor principal, e a restauração deve ser testada pelo menos uma vez por semestre.

A conformidade deve ser verificada por inspeção do histórico de cópias (uma cópia por dia) e por um teste de restauração em ambiente separado, conferindo se os dados restaurados correspondem aos da última cópia.

Classificação: confiabilidade (URPS+).
Rastreabilidade: CP12 — Segurança, sigilo e controle de acesso (transversal às features); responde ao risco IS05 — Dependência tecnológica da intervenção social (Seção 3).

### Continuidade de casos entre semestres (CP13)

A CP13 tem três features (ver [Requisitos Funcionais](funcionais.md)); os RNFs abaixo estabelecem condições de qualidade para a decisão de continuidade e a preservação do histórico clínico na virada de semestre.

**RNF54 — Auditoria das decisões de continuidade**

Toda decisão de continuidade (RF59) deve ser registrada com o caso, o estagiário que está concluindo o estágio, o novo estagiário indicado ou o motivo do encerramento, o autor da decisão e a data. Esses registros não podem ser apagados nem sobrescritos, e devem permanecer disponíveis para consulta pela coordenação.

A conformidade deve ser verificada registrando decisões de continuidade e de encerramento com dados fictícios e confirmando que nenhum perfil consegue apagá-las ou alterá-las pela interface.

Classificação: auditoria (URPS+).
Rastreabilidade: Feature "Registrar decisão de continuidade do caso" → CP13 — Continuidade de casos entre semestres.

**RNF55 — Integridade do histórico na continuidade**

A transferência de um caso na virada de semestre (RF60) não deve causar perda de informação: as sessões, as evoluções e os vínculos anteriores devem permanecer disponíveis ao novo estagiário responsável após a continuidade, com as mesmas garantias já estabelecidas para a transferência de caso da CP5 (RNF20).

A conformidade deve ser verificada por teste comparando o histórico do caso antes e depois da continuidade, confirmando que a totalidade dos registros anteriores permanece acessível ao novo responsável.

Classificação: confiabilidade (URPS+).
Rastreabilidade: Feature "Vincular caso a novo estagiário na continuidade" → CP13 — Continuidade de casos entre semestres; relacionada ao RNF20 (CP5).

### Acessibilidade e Usabilidade (CP14)

CP14 tem duas features (**Ativar modo de alto contraste** e **Ajustar tamanho do texto**), mas os RNFs abaixo são requisitos de qualidade transversais às páginas voltadas ao público externo (inscrição, consulta de posição na fila, agendamento e confirmação de presença) como um todo — não restringem uma única feature isoladamente, e por isso não foram forçados em uma das duas.

A exigência de acessibilidade não é apenas uma boa prática do projeto: a Clínica Escola FBr confirmou, na reunião de 26/08/2026 ([ata](../../unidade-1/reunioes.md)), que a acessibilidade é mandatória por exigência do MEC sobre o curso de Psicologia, e que a clínica já atende ao menos um paciente com baixa visão. O suporte a Libras foi discutido na mesma reunião e explicitamente adiado pela FBr para uma iteração futura do projeto, não fazendo parte do escopo atual.

**RNF56 — Conformidade com WCAG 2.2 nível AA**

As páginas voltadas ao público externo devem atender a todos os critérios de sucesso de nível A e AA da WCAG 2.2 aplicáveis a conteúdo web, verificável pela combinação de ferramenta automatizada de auditoria de acessibilidade (ex.: Lighthouse ou axe) e inspeção/teste manual (incluindo navegação por teclado e leitor de tela), sem nenhuma ocorrência de falha de nível A ou AA apontada pela ferramenta ou identificada na inspeção manual.

Classificação: acessibilidade (URPS+).
Rastreabilidade: CP14 — Acessibilidade e usabilidade (transversal às features "Ativar modo de alto contraste" e "Ajustar tamanho do texto").

**RNF57 — Navegação por teclado**

As páginas voltadas ao público externo devem ser operáveis integralmente por teclado — incluindo tabulação entre elementos, ativação de botões e links, e preenchimento e envio de formulários —, sem dependência exclusiva do uso do mouse. Todo elemento interativo (campo, botão ou link) deve exibir um indicador visual de foco (contorno ou destaque) sempre que estiver em foco via teclado, permitindo identificar visualmente a posição atual da navegação.

Classificação: acessibilidade (URPS+).
Rastreabilidade: CP14 — Acessibilidade e usabilidade (transversal às features "Ativar modo de alto contraste" e "Ajustar tamanho do texto").

**RNF58 — Responsividade da interface**

As páginas voltadas ao público externo devem se adaptar corretamente a larguras de tela entre 320 e 1920 pixels, sem perda de funcionalidade, sem sobreposição ou corte de elementos e sem exigir rolagem horizontal em nenhuma largura desse intervalo.

Classificação: usabilidade (URPS+).
Rastreabilidade: CP14 — Acessibilidade e usabilidade (transversal às features "Ativar modo de alto contraste" e "Ajustar tamanho do texto").
