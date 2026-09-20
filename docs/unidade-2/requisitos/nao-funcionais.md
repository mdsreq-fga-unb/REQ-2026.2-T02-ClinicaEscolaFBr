## 8.2 Lista de Requisitos Não Funcionais

Os requisitos não funcionais (RNFs) descrevem propriedades e restrições mensuráveis do sistema, classificadas conforme o modelo **URPS+** (Usabilidade, Confiabilidade, Desempenho, Suportabilidade e demais categorias, como Segurança e Auditoria). Cada RNF mantém rastreabilidade com a **Feature** que ele restringe e, por meio dela, com a Característica de Produto (CP) de origem — mesma cadeia usada nos [Requisitos Funcionais](funcionais.md).

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

O sistema deve gerar e exibir em tela o relatório institucional consolidado (RF02) em até 5 segundos, contados do acionamento da geração pela coordenação até a exibição completa do conteúdo, para qualquer período de referência de até 12 meses e com até 10 usuários simultâneos conectados ao sistema.

Classificação: desempenho.
Rastreabilidade: Feature "Gerar e exportar relatório institucional" → CP10 — Indicadores e relatórios institucionais.

**RNF03 — Auditoria de relatórios institucionais**

Para cada geração ou exportação do relatório institucional (RF02), o sistema deve registrar o usuário responsável, a data e a hora da operação e o período consultado, mantendo esse registro acessível para consulta por qualquer usuário com perfil de coordenação por, no mínimo, 24 meses a partir do registro, compatível com o ciclo de fiscalização do CRP.

Classificação: auditoria (URPS+).
Rastreabilidade: Feature "Gerar e exportar relatório institucional" → CP10 — Indicadores e relatórios institucionais.

### Acessibilidade e Usabilidade (CP12)

CP12 tem duas features (**Ativar modo de alto contraste** e **Ajustar tamanho do texto**), mas os RNFs abaixo são requisitos de qualidade transversais às páginas voltadas ao público externo (inscrição, consulta de posição na fila, agendamento e confirmação de presença) como um todo — não restringem uma única feature isoladamente, e por isso não foram forçados em uma das duas.

**RNF04 — Conformidade com WCAG 2.2 nível AA**

As páginas voltadas ao público externo devem atender a todos os critérios de sucesso de nível A e AA da WCAG 2.2 aplicáveis a conteúdo web, verificável por ferramenta automatizada de auditoria de acessibilidade (ex.: Lighthouse ou axe), sem nenhuma ocorrência de falha de nível A ou AA apontada pela ferramenta.

Classificação: acessibilidade (URPS+).
Rastreabilidade: CP12 — Acessibilidade e usabilidade (transversal às features "Ativar modo de alto contraste" e "Ajustar tamanho do texto").

**RNF05 — Navegação por teclado**

As páginas voltadas ao público externo devem ser operáveis integralmente por teclado — incluindo tabulação entre elementos, ativação de botões e links, e preenchimento e envio de formulários —, sem dependência exclusiva do uso do mouse. Todo elemento interativo (campo, botão ou link) deve exibir um indicador visual de foco (contorno ou destaque) sempre que estiver em foco via teclado, permitindo identificar visualmente a posição atual da navegação.

Classificação: acessibilidade (URPS+).
Rastreabilidade: CP12 — Acessibilidade e usabilidade (transversal às features "Ativar modo de alto contraste" e "Ajustar tamanho do texto").

**RNF06 — Responsividade da interface**

As páginas voltadas ao público externo devem se adaptar corretamente a larguras de tela entre 360 e 1920 pixels, sem perda de funcionalidade, sem sobreposição ou corte de elementos e sem exigir rolagem horizontal em nenhuma largura desse intervalo.

Classificação: usabilidade.
Rastreabilidade: CP12 — Acessibilidade e usabilidade (transversal às features "Ativar modo de alto contraste" e "Ajustar tamanho do texto").
