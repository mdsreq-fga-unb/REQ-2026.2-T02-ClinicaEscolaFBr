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

As features da CP2 tratam respostas potencialmente sensíveis da inscrição e decisões que afetam a ordem de atendimento. Aplicam-se também os controles transversais de segurança e acesso da CP12, conforme a numeração da Solução Proposta.

#### Feature — Organizar informações da inscrição para triagem

**RNF2.1 — Sigilo das informações de triagem**

As respostas de triagem e as sinalizações vinculadas à inscrição devem ser exibidas somente a usuários institucionais autorizados para essa finalidade. A interface e as respostas a tentativas de acesso negadas não devem revelar queixa, histórico informado, urgência percebida ou sinalizações clínicas. A conformidade deve ser verificada com inscrições fictícias, comparando consultas autorizadas e tentativas de acesso por perfis não autorizados.

Classificação: segurança e privacidade (URPS+).
Rastreabilidade: Feature “Organizar informações da inscrição para triagem” → CP2; relacionada às features “Sinalizar pontos de atenção da inscrição” e “Registrar prioridade clínica do inscrito” e à CP12.

#### Feature — Sinalizar pontos de atenção da inscrição

**RNF2.2 — Rastreabilidade das regras de sinalização**

Cada ponto de atenção apresentado deve manter vínculo verificável com a resposta original e com a versão da regra institucional aprovada que o produziu. A conformidade deve ser verificada com dados fictícios e casos com e sem correspondência às regras aprovadas, confirmando a origem de cada sinalização e a ausência de cor de prioridade atribuída automaticamente.

Classificação: confiabilidade e auditoria (URPS+).
Rastreabilidade: Feature “Sinalizar pontos de atenção da inscrição” → CP2; relacionada a RF2.2.

#### Feature — Registrar prioridade clínica do inscrito

**RNF2.3 — Integridade e auditoria das decisões de prioridade**

O registro e a alteração da prioridade devem preservar a classificação anterior, a nova classificação, o usuário institucional responsável e a data e hora de cada decisão. Uma decisão anterior não deve ser sobrescrita ou apagada por uma revisão posterior. A conformidade deve ser verificada com uma inscrição fictícia classificada e depois reclassificada por usuário autorizado, seguida de tentativa de alteração por usuário não autorizado; o histórico deve permanecer íntegro e a fila deve receber apenas a decisão vigente confirmada.

Classificação: confiabilidade, segurança e auditoria (URPS+).
Rastreabilidade: Feature “Registrar prioridade clínica do inscrito” → CP2; integração com RF08 (CP3) e controles da CP12.

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

### Emissão de Declaração de Comparecimento (CP9)

A CP9 tem cinco features (ver [Requisitos Funcionais](funcionais.md)); os RNFs abaixo estabelecem condições de qualidade para a emissão, reemissão e verificação da declaração de comparecimento, aplicando-se de forma transversal ao conjunto das features, conforme indicado na rastreabilidade de cada um. Os RNFs de segurança e privacidade (RNF9.1 a RNF9.3) devem ser alinhados com os requisitos gerais de acesso e sigilo da CP11, evitando duplicidade, e o RNF9.7 segue a mesma meta de acessibilidade definida para a CP12 (RNF04).

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
