## 8.1 Lista de Requisitos Funcionais

Os requisitos funcionais (RFs) são declarados a partir da decomposição das Características de Produto (CPs) em **Features**, seguindo o processo FDD (etapa _Construir a Lista de Features_) e as práticas descritas na [Seção 5 — Engenharia de Requisitos](../../unidade-1/engenharia-requisitos.md). Cada Feature segue o formato `<ação> <resultado> <objeto>` e agrupa um ou mais RFs; cada RF mantém rastreabilidade com a Feature que o declarou e, por meio dela, com a CP de origem, compondo a cadeia **Problema → OG → OEs → CPs → Features → RFs/RNFs** descrita no cronograma da Unidade 2.

<details class="requirement-index" markdown>
<summary>Índice de requisitos funcionais por código (68)</summary>

| Requisito | Requisito |
| --- | --- |
| [RF1 — Registrar solicitação de atendimento on-line](#rf1) | [RF2 — Emitir comprovante de inscrição](#rf2) |
| [RF3 — Registrar inscrição assistida](#rf3) | [RF4 — Organizar informações da inscrição para triagem](#rf4) |
| [RF5 — Sinalizar pontos de atenção da inscrição](#rf5) | [RF6 — Registrar prioridade clínica do inscrito](#rf6) |
| [RF7 — Ordenar inscritos na fila de espera](#rf7) | [RF8 — Consultar posição individual na fila](#rf8) |
| [RF9 — Manter e informar condições gerais da fila](#rf9) | [RF10 — Agendar sessão do paciente](#rf10) |
| [RF11 — Consultar agenda de sessões do estagiário](#rf11) | [RF12 — Reagendar sessão do paciente](#rf12) |
| [RF13 — Enviar lembrete de sessão agendada](#rf13) | [RF14 — Confirmar presença em sessão agendada](#rf14) |
| [RF15 — Registrar cancelamento de sessão pelo paciente](#rf15) | [RF16 — Registrar cancelamento de sessão pelo estagiário](#rf16) |
| [RF17 — Notificar paciente sobre ausência do estagiário](#rf17) | [RF18 — Listar casos aguardando distribuição](#rf18) |
| [RF19 — Registrar áreas de especialidade do supervisor](#rf19) | [RF20 — Distribuir caso a supervisor conforme área de especialidade](#rf20) |
| [RF21 — Vincular paciente a estagiário responsável](#rf21) | [RF22 — Consultar responsáveis pelo caso](#rf22) |
| [RF23 — Consultar casos sob responsabilidade do estagiário ou supervisor](#rf23) | [RF24 — Visualizar distribuição de casos por supervisor](#rf24) |
| [RF25 — Transferir caso para outro estagiário ou supervisor](#rf25) | [RF26 — Consultar histórico de responsáveis do caso](#rf26) |
| [RF27 — Consultar prontuário do paciente](#rf27) | [RF28 — Registrar evolução da sessão realizada](#rf28) |
| [RF29 — Corrigir evolução registrada](#rf29) | [RF30 — Registrar complemento de evolução da sessão](#rf30) |
| [RF31 — Consultar evolução de uma sessão específica](#rf31) | [RF32 — Consultar histórico de evolução do paciente](#rf32) |
| [RF33 — Gerar relatório final de evolução](#rf33) | [RF34 — Registrar falta do paciente na sessão](#rf34) |
| [RF35 — Contabilizar faltas do paciente no ciclo](#rf35) | [RF36 — Emitir alerta de limite de faltas atingido](#rf36) |
| [RF37 — Desligar paciente por faltas e liberar vaga](#rf37) | [RF38 — Reverter desligamento de paciente por faltas](#rf38) |
| [RF39 — Consolidar faltas do estagiário para a supervisão](#rf39) | [RF40 — Contabilizar faltas do estagiário no semestre](#rf40) |
| [RF63 — Sinalizar reprovação do estagiário por faltas](#rf63) | [RF64 — Registrar decisão institucional sobre a reprovação do estagiário](#rf64) |
| [RF41 — Registrar pagamento da contribuição social do paciente](#rf41) | [RF42 — Consultar situação da contribuição social dos pacientes](#rf42) |
| [RF43 — Bloquear agendamento por contribuição social pendente](#rf43) | [RF44 — Listar sessões com comparecimento registrado do paciente](#rf44) |
| [RF45 — Emitir declaração de comparecimento do paciente](#rf45) | [RF46 — Reemitir declaração de comparecimento](#rf46) |
| [RF47 — Validar autenticidade da declaração](#rf47) | [RF48 — Consultar indicadores operacionais](#rf48) |
| [RF49 — Exportar relatório institucional em PDF](#rf49) | [RF50 — Autenticar usuário institucional](#rf50) |
| [RF51 — Encerrar sessão do usuário](#rf51) | [RF52 — Verificar identidade do paciente ou responsável](#rf52) |
| [RF53 — Cadastrar usuário institucional com perfil de acesso](#rf53) | [RF54 — Desativar usuário institucional](#rf54) |
| [RF55 — Restringir acesso ao prontuário do paciente](#rf55) | [RF56 — Consultar registro de acessos ao prontuário](#rf56) |
| [RF57 — Registrar consentimento para tratamento de dados](#rf57) | [RF65 — Registrar revogação do consentimento](#rf65) |
| [RF58 — Listar casos elegíveis para continuidade entre semestres](#rf58) | [RF59 — Registrar decisão de continuidade do caso](#rf59) |
| [RF60 — Vincular caso a novo estagiário na continuidade](#rf60) | [RF61 — Ativar modo de alto contraste](#rf61) |
| [RF62 — Ajustar tamanho do texto](#rf62) | [RF66 — Criar e inicializar o prontuário do paciente](#rf66) |
| [RF67 — Validar evolução pelo supervisor](#rf67) | [RF68 — Encerrar caso por alta](#rf68) |

</details>

### Lista de features (FDD)

Sumário de todas as features declaradas, organizadas por Área e Conjunto conforme o processo FDD. Cada item é um link que leva à declaração completa da feature (e dos RFs associados) na seção correspondente desta página.

<details class="feature-area" markdown>
<summary>Área: Inscrição no atendimento <span class="feature-area__count">3 features</span></summary>

- *Conjunto: Inscrição on-line*
    - [Registrar solicitação de atendimento on-line](#feature-registrar-solicitacao-de-atendimento-on-line)
    - [Emitir comprovante de inscrição](#feature-emitir-comprovante-de-inscricao)
    - [Registrar inscrição assistida](#feature-registrar-inscricao-assistida)

</details>

<details class="feature-area" markdown>
<summary>Área: Triagem clínica <span class="feature-area__count">3 features</span></summary>

- *Conjunto: Triagem e sinalização de casos*
    - [Organizar informações da inscrição para triagem](#feature-organizar-informacoes-da-inscricao-para-triagem)
    - [Sinalizar pontos de atenção da inscrição](#feature-sinalizar-pontos-de-atencao-da-inscricao)
    - [Registrar prioridade clínica do inscrito](#feature-registrar-prioridade-clinica-do-inscrito)

</details>

<details class="feature-area" markdown>
<summary>Área: Gestão da fila de espera <span class="feature-area__count">3 features</span></summary>

- *Conjunto: Fila de espera e consulta de posição*
    - [Ordenar inscritos na fila de espera](#feature-ordenar-inscritos-na-fila-de-espera)
    - [Consultar posição individual na fila](#feature-consultar-posicao-individual-na-fila)
    - [Manter e informar condições gerais da fila](#feature-manter-e-informar-condicoes-gerais-da-fila)

</details>

<details class="feature-area" markdown>
<summary>Área: Agendamento e acompanhamento de sessões <span class="feature-area__count">8 features</span></summary>

- *Conjunto: Agendamento*
    - [Agendar sessão do paciente](#feature-agendar-sessao-do-paciente)
    - [Consultar agenda de sessões do estagiário](#feature-consultar-agenda-de-sessoes-do-estagiario)
    - [Reagendar sessão do paciente](#feature-reagendar-sessao-do-paciente)
- *Conjunto: Confirmação e lembrete*
    - [Enviar lembrete de sessão agendada](#feature-enviar-lembrete-de-sessao-agendada)
    - [Confirmar presença em sessão agendada](#feature-confirmar-presenca-em-sessao-agendada)
- *Conjunto: Cancelamento*
    - [Registrar cancelamento de sessão pelo paciente](#feature-registrar-cancelamento-de-sessao-pelo-paciente)
    - [Registrar cancelamento de sessão pelo estagiário](#feature-registrar-cancelamento-de-sessao-pelo-estagiario)
    - [Notificar paciente sobre ausência do estagiário](#feature-notificar-paciente-sobre-ausencia-do-estagiario)

</details>

<details class="feature-area" markdown>
<summary>Área: Gestão de casos <span class="feature-area__count">9 features</span></summary>

- *Conjunto: Distribuição entre supervisores*
    - [Listar casos aguardando distribuição](#feature-listar-casos-aguardando-distribuicao)
    - [Registrar áreas de especialidade do supervisor](#feature-registrar-areas-de-especialidade-do-supervisor)
    - [Distribuir caso a supervisor conforme área de especialidade](#feature-distribuir-caso-a-supervisor-conforme-area-de-especialidade)
- *Conjunto: Vinculação a estagiário*
    - [Vincular paciente a estagiário responsável](#feature-vincular-paciente-a-estagiario-responsavel)
    - [Consultar responsáveis pelo caso](#feature-consultar-responsaveis-pelo-caso)
    - [Consultar casos sob responsabilidade do estagiário ou supervisor](#feature-consultar-casos-sob-responsabilidade-do-estagiario-ou-supervisor)
- *Conjunto: Acompanhamento e reorganização*
    - [Visualizar distribuição de casos por supervisor](#feature-visualizar-distribuicao-de-casos-por-supervisor)
    - [Transferir caso para outro estagiário ou supervisor](#feature-transferir-caso-para-outro-estagiario-ou-supervisor)
    - [Consultar histórico de responsáveis do caso](#feature-consultar-historico-de-responsaveis-do-caso)

</details>

<details class="feature-area" markdown>
<summary>Área: Acompanhamento clínico <span class="feature-area__count">10 features</span></summary>

- *Conjunto: Prontuário*
    - [Criar e inicializar o prontuário do paciente](#feature-criar-e-inicializar-o-prontuario-do-paciente)
    - [Consultar prontuário do paciente](#feature-consultar-prontuario-do-paciente)
- *Conjunto: Registro de evolução por sessão*
    - [Registrar evolução da sessão realizada](#feature-registrar-evolucao-da-sessao-realizada)
    - [Corrigir evolução registrada](#feature-corrigir-evolucao-registrada)
    - [Registrar complemento de evolução da sessão](#feature-registrar-complemento-de-evolucao-da-sessao)
    - [Validar evolução pelo supervisor](#feature-validar-evolucao-pelo-supervisor)
    - [Consultar evolução de uma sessão específica](#feature-consultar-evolucao-de-uma-sessao-especifica)
    - [Consultar histórico de evolução do paciente](#feature-consultar-historico-de-evolucao-do-paciente)
- *Conjunto: Encerramento do ciclo*
    - [Encerrar caso por alta](#feature-encerrar-caso-por-alta)
    - [Gerar relatório final de evolução](#feature-gerar-relatorio-final-de-evolucao)

</details>

<details class="feature-area" markdown>
<summary>Área: Assiduidade e alertas <span class="feature-area__count">9 features</span></summary>

- *Conjunto: Controle de faltas do paciente*
    - [Registrar falta do paciente na sessão](#feature-registrar-falta-do-paciente-na-sessao)
    - [Contabilizar faltas do paciente no ciclo](#feature-contabilizar-faltas-do-paciente-no-ciclo)
    - [Emitir alerta de limite de faltas atingido](#feature-emitir-alerta-de-limite-de-faltas-atingido)
    - [Desligar paciente por faltas e liberar vaga](#feature-desligar-paciente-por-faltas-e-liberar-vaga)
    - [Reverter desligamento de paciente por faltas](#feature-reverter-desligamento-de-paciente-por-faltas)
- *Conjunto: Controle de faltas do estagiário*
    - [Consolidar faltas do estagiário para a supervisão](#feature-consolidar-faltas-do-estagiario-para-a-supervisao)
    - [Contabilizar faltas do estagiário no semestre](#feature-contabilizar-faltas-do-estagiario-no-semestre)
    - [Sinalizar reprovação do estagiário por faltas](#feature-sinalizar-reprovacao-do-estagiario-por-faltas)
    - [Registrar decisão institucional sobre a reprovação do estagiário](#feature-registrar-decisao-institucional-sobre-a-reprovacao-do-estagiario)

</details>

<details class="feature-area" markdown>
<summary>Área: Registros administrativos do atendimento <span class="feature-area__count">7 features</span></summary>

- *Conjunto: Contribuição social*
    - [Registrar pagamento da contribuição social do paciente](#feature-registrar-pagamento-da-contribuicao-social-do-paciente-43)
    - [Consultar situação da contribuição social dos pacientes](#feature-consultar-situacao-da-contribuicao-social-dos-pacientes-44)
    - [Bloquear agendamento por contribuição social pendente](#feature-bloquear-agendamento-por-contribuicao-social-pendente)
- *Conjunto: Declaração de comparecimento*
    - [Listar sessões com comparecimento registrado do paciente](#feature-listar-sessoes-com-comparecimento-registrado-do-paciente)
    - [Emitir declaração de comparecimento do paciente](#feature-emitir-declaracao-de-comparecimento-do-paciente)
    - [Reemitir declaração de comparecimento](#feature-reemitir-declaracao-de-comparecimento)
    - [Validar autenticidade da declaração](#feature-validar-autenticidade-da-declaracao)

</details>

<details class="feature-area" markdown>
<summary>Área: Gestão institucional <span class="feature-area__count">2 features</span></summary>

- *Conjunto: Indicadores e relatórios institucionais*
    - [Consultar indicadores operacionais](#feature-consultar-indicadores-operacionais-22)
    - [Exportar relatório institucional em PDF](#feature-exportar-relatorio-institucional-em-pdf-23)

</details>

<details class="feature-area" markdown>
<summary>Área: Acesso e segurança <span class="feature-area__count">9 features</span></summary>

- *Conjunto: Autenticação*
    - [Autenticar usuário institucional](#feature-autenticar-usuario-institucional-45)
    - [Encerrar sessão do usuário](#feature-encerrar-sessao-do-usuario-46)
    - [Verificar identidade do paciente ou responsável](#feature-verificar-identidade-do-paciente-ou-responsavel-47)
- *Conjunto: Controle de acesso por perfil*
    - [Cadastrar usuário institucional com perfil de acesso](#feature-cadastrar-usuario-institucional-com-perfil-de-acesso-48)
    - [Desativar usuário institucional](#feature-desativar-usuario-institucional-49)
    - [Restringir acesso ao prontuário do paciente](#feature-restringir-acesso-ao-prontuario-do-paciente-50)
- *Conjunto: Proteção de dados*
    - [Consultar registro de acessos ao prontuário](#feature-consultar-registro-de-acessos-ao-prontuario-51)
    - [Registrar consentimento para tratamento de dados](#feature-registrar-consentimento-para-tratamento-de-dados-52)
    - [Registrar revogação do consentimento](#feature-registrar-revogacao-do-consentimento)

</details>

<details class="feature-area" markdown>
<summary>Área: Continuidade do atendimento <span class="feature-area__count">3 features</span></summary>

- *Conjunto: Continuidade de casos entre semestres*
    - [Listar casos elegíveis para continuidade entre semestres](#feature-listar-casos-elegiveis-para-continuidade-entre-semestres)
    - [Registrar decisão de continuidade do caso](#feature-registrar-decisao-de-continuidade-do-caso)
    - [Vincular caso a novo estagiário na continuidade](#feature-vincular-caso-a-novo-estagiario-na-continuidade)

</details>

<details class="feature-area" markdown>
<summary>Área: Acessibilidade e usabilidade <span class="feature-area__count">2 features</span></summary>

- *Conjunto: Personalização de exibição*
    - [Ativar modo de alto contraste](#feature-ativar-modo-de-alto-contraste-24)
    - [Ajustar tamanho do texto](#feature-ajustar-tamanho-do-texto-25)

</details>


### Inscrição on-line (CP1)

A CP1 foi decomposta em três features: registro da solicitação de atendimento on-line, emissão de comprovante de inscrição e registro de inscrição assistida. As features têm como objetivo ampliar o acesso da comunidade aos serviços da Clínica Escola FBr, permitindo que o interessado realize sua inscrição sem necessidade de deslocamento presencial e que pessoas com dificuldades de acesso digital possam utilizar um canal assistido.

O registro da inscrição assistida constitui uma resposta proposta ao risco de exclusão digital identificado na intervenção social (Seção 3), cuja forma de operação deverá ser validada com a Clínica Escola.

As funcionalidades destinadas ao público externo devem observar os requisitos de acessibilidade da CP14, enquanto o acesso institucional aos dados dos inscritos deve respeitar os perfis e as restrições estabelecidos pela CP12.

#### Feature — Registrar solicitação de atendimento on-line

**RF1 — Registrar solicitação de atendimento on-line**{ #rf1 }

O sistema deve permitir que o interessado realize uma solicitação de atendimento psicológico por meio de formulário eletrônico, acessível a partir de link divulgado no site e nas redes sociais da FBr, informando seus dados cadastrais e a queixa que motivou a busca pelo atendimento.

- O formulário deve exigir, como campos obrigatórios — confirmados pela Clínica Escola na reunião de 26/08/2026 ([ata](../../unidade-1/reunioes.md)) —, os seguintes: nome completo, data de nascimento, CPF, RG, endereço, estado civil e a queixa (motivo da busca pelo atendimento); quando o interessado for menor de idade, o formulário deve exigir também o nome do responsável legal.
- Para viabilizar os lembretes e a verificação de identidade previstos nos RF13 e RF52, o interessado deve informar pelo menos um canal de contato válido entre telefone celular e e-mail e indicar, entre os canais cadastrados, o canal preferencial.
- O formulário também deve coletar, para a triagem, a percepção de urgência e um campo de histórico relevante informado pelo interessado, ambos como declarações do próprio solicitante.
- O CPF e o RG são coletados apenas como texto informado pelo próprio interessado — a Clínica Escola não exige, nem o sistema deve solicitar, o envio de cópia digitalizada desses documentos.
- O sistema deve validar o formato dos dados de contato, verificar os campos obrigatórios e solicitar a confirmação do interessado antes de registrar a inscrição.
- O formulário deve exibir, de forma fixa e sempre visível, um aviso textual com os contatos de emergência do CVV (188) e do SAMU (192), conforme solicitado pela Clínica Escola FBr na validação do MVP ([10.2.4](backlog.md#1024-validacao-do-mvp-com-o-cliente)) — condição vinculada ao adiamento da sinalização automática de pontos de atenção (RF5) para uma entrega posterior.

Após a conclusão do envio, o sistema deve armazenar a solicitação e gerar um identificador único, que será utilizado para o acompanhamento da inscrição nas etapas posteriores de triagem e fila de espera.

O registro da solicitação não representa confirmação de vaga ou garantia de atendimento, pois o interessado ainda deverá passar pelo processo de triagem previsto na CP2.

_Critérios de aceitação:_

- O envio com todos os campos obrigatórios preenchidos registra a solicitação e gera um identificador único da inscrição.

- O envio com campo obrigatório em branco é bloqueado, os campos pendentes são indicados e os dados já preenchidos são mantidos para correção.

- Ao concluir a inscrição, o interessado é informado de que a solicitação foi recebida e de que o atendimento depende da triagem e da disponibilidade de vagas.

- Nenhuma confirmação de inscrição é exibida se a solicitação não tiver sido efetivamente registrada.

- CPF e RG são pedidos apenas como números digitados, sem envio de cópia digitalizada ou foto do documento.

- O formato dos canais informados é validado, pelo menos um canal (celular ou e-mail) é exigido e o canal preferencial fica registrado.

- Queixa, percepção de urgência e histórico relevante são obrigatórios e ficam identificados como declarações do interessado.

- O aviso com os contatos do CVV (188) e do SAMU (192) fica visível em todas as etapas do formulário.

_Rastreabilidade:_ Feature "Registrar solicitação de atendimento on-line" → CP1 — Inscrição on-line → OE1/OE4.

#### Feature — Emitir comprovante de inscrição

**RF2 — Emitir comprovante de inscrição**{ #rf2 }

O sistema deve permitir que o interessado obtenha um comprovante eletrônico após a conclusão do registro da solicitação de atendimento.

O comprovante deve apresentar o número único da inscrição, a data e a hora do registro e uma mensagem confirmando o recebimento da solicitação pela Clínica Escola FBr.

O documento deve informar que o comprovante representa exclusivamente o registro da inscrição e não constitui confirmação de vaga, agendamento ou início do atendimento psicológico.

O comprovante não deve apresentar a queixa informada pelo interessado nem informações clínicas que não sejam necessárias para confirmar o recebimento da solicitação.

_Critérios de aceitação:_

- Ao concluir a inscrição, é disponibilizado um comprovante com o número da inscrição e a data e a hora do registro.

- O comprovante informa que a inscrição foi recebida e que o atendimento está sujeito à triagem e à disponibilidade de vagas.

- Nenhum comprovante é emitido para inscrição que não foi concluída.

- O comprovante não contém a queixa nem dados clínicos desnecessários à confirmação do registro.

_Rastreabilidade:_ Feature "Emitir comprovante de inscrição" → CP1 — Inscrição on-line → OE1/OE4.

#### Feature — Registrar inscrição assistida

**RF3 — Registrar inscrição assistida**{ #rf3 }

O sistema deve permitir que um usuário institucional com perfil de secretaria registre a solicitação de atendimento de um interessado que necessite de auxílio para realizar sua inscrição, mediante atendimento assistido ou presencial disponibilizado pela Clínica Escola FBr. O registro dessa solicitação deve ser restrito ao perfil de secretaria, conforme os perfis institucionais definidos na CP12 — Segurança, sigilo e controle de acesso.

O registro assistido deve utilizar os mesmos campos cadastrais e informações obrigatórias estabelecidos para a inscrição on-line, permitindo que a solicitação seja incorporada ao mesmo fluxo de triagem e fila de espera.

Enquanto este requisito ficar para uma entrega posterior, o apoio a quem precisa de auxílio para se inscrever é feito pela recepção, preenchendo em nome do interessado o próprio formulário de inscrição on-line (RF1), de modo que a solicitação entre na mesma fila — condição confirmada pela Clínica Escola FBr na validação do MVP ([10.2.4](backlog.md#1024-validacao-do-mvp-com-o-cliente)).

O sistema deve identificar a modalidade utilizada para o registro da inscrição, diferenciando as solicitações realizadas diretamente pelo interessado daquelas registradas com auxílio de um usuário institucional.

A utilização do canal assistido não deve atribuir prioridade clínica diferenciada ao interessado, pois a classificação de prioridade depende do processo de triagem previsto na CP2.

_Critérios de aceitação:_

- A inscrição assistida confirmada pela secretaria é registrada com identificador único e entra no mesmo fluxo de triagem das inscrições on-line.

- Usuários com perfil diferente de secretaria não conseguem registrar inscrição assistida.

- A consulta de uma inscrição por usuário autorizado mostra a modalidade utilizada (on-line ou assistida).

- A modalidade de inscrição, sozinha, não altera a prioridade na fila entre solicitações com a mesma classificação validada.

_Rastreabilidade:_ Feature "Registrar inscrição assistida" → CP1 — Inscrição on-line → OE1/OE4 → IS01 — Exclusão digital.

### Triagem e sinalização de casos (CP2)

A CP2 foi decomposta em três features: organização das informações da inscrição, sinalização de pontos de atenção e registro da prioridade definida pela equipe clínica. A inscrição on-line ou assistida (CP1) fornece os dados de entrada; somente a prioridade clínica confirmada pode alimentar a ordenação da fila (CP3). O acesso aos dados da triagem observa a CP12 — Segurança, sigilo e controle de acesso, conforme a numeração da [Solução Proposta](../../unidade-1/solucao-proposta.md#23-caracteristicas-de-produto-mapeadas-com-os-objetivos-especificos).

A formulação desta CP na atividade de decomposição menciona pré-classificação automática pelas opções do formulário. A versão vigente da Solução Proposta, §2.2–2.3, restringe o sistema a organizar e sinalizar informações, reservando a classificação vermelha, amarela ou verde exclusivamente à equipe clínica.

Na prática hoje descrita pela FBr, a triagem parte da leitura da queixa em texto livre preenchida pelo interessado (RF1), não de opções fechadas do formulário; a pré-classificação automática por opções do formulário foi uma proposta da equipe de projeto discutida internamente, não uma funcionalidade solicitada pela Clínica Escola na reunião de 26/08/2026.

Em conversa de Nicolas com a FBr em 22/09/2026, a Clínica Escola confirmou que essa abordagem mais simples — o sistema apenas organiza as respostas e destaca os pontos de atenção, sem sugerir cor, cabendo à equipe clínica decidir a prioridade diretamente a partir dessas informações — é a que deve ser adotada agora; uma eventual sugestão automática de cor foi explicitamente deixada para uma evolução futura, fora do escopo atual. Os RFs abaixo já refletem essa abordagem confirmada.

#### Feature — Organizar informações da inscrição para triagem

**RF4 — Organizar informações da inscrição para triagem**{ #rf4 }

O sistema deve apresentar aos supervisores e à coordenação as inscrições recebidas, identificadas pelo número de inscrição, com os três campos de triagem definidos no RF1: queixa, percepção de urgência e histórico relevante informado. A apresentação deve distinguir informação declarada pelo interessado de avaliação registrada pela equipe e indicar dados ausentes em inscrições legadas, sem preencher lacunas por inferência.

Como a sinalização automática de pontos de atenção (RF5) fica para uma entrega posterior, o sistema deve sinalizar à coordenação as inscrições que estejam há mais tempo aguardando triagem do que o parâmetro "prazo máximo para triagem" (configurável pela coordenação, valor a confirmar junto à FBr), contado a partir do registro da inscrição (RF1/RF3), de forma a preservar a revisão humana tempestiva dos casos sem depender da sinalização automática.

_Critérios de aceitação:_

- A triagem apresenta a supervisores e coordenação o número da inscrição, a queixa, a percepção de urgência e o histórico relevante, para inscrições on-line ou assistidas.
- Campo de triagem sem resposta aparece como ausente, sem conteúdo presumido.
- Usuários sem autorização para dados de triagem não visualizam as respostas da inscrição.
- Inscrição sem triagem concluída após o prazo máximo configurado é sinalizada à coordenação como pendente além do prazo.

_Rastreabilidade:_ Feature "Organizar informações da inscrição para triagem" → CP2 — Triagem e sinalização de casos → OE2/OE1. Dependência: CP1; restrição transversal: CP12 — Segurança, sigilo e controle de acesso.

#### Feature — Sinalizar pontos de atenção da inscrição

**RF5 — Sinalizar pontos de atenção da inscrição**{ #rf5 }

O sistema deve destacar, para supervisores e integrantes da coordenação, respostas do formulário que correspondam a pontos de atenção definidos em regras institucionais documentadas, aprovadas e publicadas pela coordenação da Clínica Escola. Cada versão do conjunto de regras deve possuir identificador, data de vigência e responsável pela aprovação; somente a versão vigente pode produzir novas sinalizações, sem alterar retroativamente as sinalizações já registradas. Cada sinalização deve permitir identificar a resposta e a versão da regra que a originaram e deve ser apresentada como informação para avaliação humana, sem atribuir uma cor de prioridade, ordenar o inscrito na fila ou concluir a triagem automaticamente. Enquanto não houver uma versão aprovada e vigente, o sistema deve apresentar as respostas para avaliação humana sem produzir sinalizações automáticas.

_Critérios de aceitação:_

- Resposta que corresponde a uma regra de sinalização aprovada gera um ponto de atenção destacado, junto com a resposta que o originou.
- Resposta que não corresponde a regra aprovada não gera sinalização clínica.
- Inscrição com pontos de atenção mantém a prioridade clínica pendente até a decisão da equipe autorizada.
- Novas triagens usam apenas a versão vigente das regras, e cada sinalização anterior mantém a identificação da versão que a produziu.
- Sem regras aprovadas e vigentes, a inscrição é apresentada sem pontos de atenção.

_Rastreabilidade:_ Feature "Sinalizar pontos de atenção da inscrição" → CP2 — Triagem e sinalização de casos → OE2/OE1. Dependência: RF4; restrição transversal: CP12 — Segurança, sigilo e controle de acesso.

#### Feature — Registrar prioridade clínica do inscrito

**RF6 — Registrar prioridade clínica do inscrito**{ #rf6 }

O sistema deve permitir exclusivamente que um supervisor ou integrante da coordenação registre a classificação final de uma inscrição como vermelha, amarela ou verde, após avaliar as informações e sinalizações disponíveis. Deve ser possível corrigir uma classificação mediante nova decisão de um desses perfis, preservando o histórico das classificações e o responsável por cada decisão. Inscrições sem decisão devem permanecer com prioridade pendente e não devem ser tratadas pela fila como classificadas. O sistema deve disponibilizar à CP3 somente a prioridade final vigente definida pela equipe clínica.

A classificação continua sendo um julgamento clínico da equipe, não uma regra automatizada — mas, segundo a reunião de 26/08/2026 com a Clínica Escola ([ata](../../unidade-1/reunioes.md)), a própria FBr descreveu a referência que hoje orienta essa decisão: prioridade vermelha para quadro clínico já caracterizado (ex.: quadros depressivos ou de ansiedade), especialmente quando o interessado já está em uso de medicação; prioridade amarela para sofrimento emocional pontual, sem caracterização de quadro clínico e sem uso de medicação (ex.: luto); e prioridade verde quando não há indício de adoecimento e a busca é por desenvolvimento pessoal, sendo esse grupo atendido apenas se houver vaga disponível após o atendimento das prioridades vermelha e amarela. A tela de decisão deve exibir esses critérios como apoio textual ao supervisor ou à coordenação, mas não deve calculá-los nem sugerir automaticamente uma cor a partir das respostas do formulário.

_Critérios de aceitação:_

- A confirmação de uma das três prioridades por supervisor ou coordenação registra a cor, o responsável e a data e a hora da decisão.
- Usuário sem autorização clínica não consegue registrar nem alterar a prioridade, e a classificação vigente é preservada.
- Inscrição sem classificação confirmada aparece na fila como pendente, sem usar sinalizações como prioridade final.
- A alteração autorizada de prioridade mantém o histórico da decisão anterior e disponibiliza a nova classificação para a fila (CP3).
- A tela de registro de prioridade exibe a referência vermelha/amarela/verde da Clínica Escola como apoio textual, sem preencher nem sugerir a cor automaticamente.

_Rastreabilidade:_ Feature "Registrar prioridade clínica do inscrito" → CP2 — Triagem e sinalização de casos → OE2/OE1. Dependência: RF4/RF5; integração: RF7 (CP3); restrição transversal: CP12 — Segurança, sigilo e controle de acesso.

#### Modelo de domínio da CP2

- **Inscrição:** solicitação identificada pelo número gerado na CP1; contém respostas declaradas pelo interessado e possui uma situação de triagem.
- **Resposta de triagem:** informação associada à inscrição e à pergunta do formulário aprovado; sua origem declaratória permanece explícita.
- **Ponto de atenção:** sinalização derivada de uma resposta e de uma regra institucional aprovada; não possui valor de prioridade clínica.
- **Decisão de prioridade:** classificação vermelha, amarela ou verde, vinculada à inscrição, ao integrante autorizado da equipe clínica e ao momento da decisão. A decisão vigente pode substituir outra sem apagar seu histórico.
- **Fila de espera:** utiliza a decisão de prioridade vigente e confirmada; inscrições pendentes não recebem prioridade por inferência.

### Fila de espera e consulta de posição (CP3)

A CP3 foi decomposta em três features: ordenação dos inscritos na fila de espera, consulta individual da posição e apresentação das condições gerais de atendimento.

As features têm como objetivo organizar a fila de acordo com as prioridades estabelecidas na triagem, ampliar a transparência das informações fornecidas aos inscritos e reduzir a necessidade de contatos recorrentes com a secretaria para acompanhamento da solicitação.

A ordenação da fila depende da classificação de prioridade realizada na CP2, enquanto a consulta individual deve respeitar as restrições de acesso e sigilo previstas na CP12.

A apresentação das condições gerais de atendimento constitui uma resposta proposta aos riscos de aumento da demanda e de criação de expectativas inadequadas sobre o tempo de espera, identificados na intervenção social (Seção 3).

#### Feature — Ordenar inscritos na fila de espera

**RF7 — Ordenar inscritos na fila de espera**{ #rf7 }

O sistema deve manter a fila de espera da Clínica Escola FBr organizada de acordo com a classificação de prioridade atribuída aos inscritos durante o processo de triagem previsto na CP2.

A classificação deve considerar as prioridades vermelha, amarela e verde, conforme as regras definidas pela Clínica Escola, utilizando a classificação final validada pela equipe responsável pela triagem.

O sistema não deve utilizar sinalizações da triagem como decisão clínica definitiva; somente a classificação confirmada pela equipe clínica pode definir a prioridade na fila.

Quando ocorrer uma alteração autorizada na prioridade ou na situação de um inscrito, o sistema deve atualizar seu posicionamento na fila de acordo com os critérios institucionais definidos para a ordenação.

Os critérios de desempate entre inscritos com a mesma prioridade seguem a ordem de registro da inscrição: entre dois inscritos com a mesma prioridade, tem precedência quem se inscreveu primeiro, conforme confirmado pela Clínica Escola.

_Critérios de aceitação:_

- Inscrito com prioridade validada entra na fila na posição definida pela prioridade e pelos critérios de ordenação aprovados pela Clínica Escola.

- Sinalizações de triagem sem classificação clínica confirmada não definem prioridade na fila.

- A confirmação de uma nova prioridade por usuário autorizado atualiza a posição do inscrito conforme os critérios de ordenação.

- Mudança na situação de um inscrito que afete a fila recalcula as posições dos demais afetados e preserva o histórico da decisão.

- Entre inscritos com a mesma prioridade confirmada, fica à frente quem registrou a inscrição (RF1/RF3) primeiro.

_Rastreabilidade:_ Feature "Ordenar inscritos na fila de espera" → CP3 — Fila de espera e consulta de posição → OE4/OE7.

#### Feature — Consultar posição individual na fila

**RF8 — Consultar posição individual na fila**{ #rf8 }

O sistema deve permitir que o inscrito consulte sua posição e situação atual na fila de espera da Clínica Escola FBr, localizando a solicitação por CPF ou número de inscrição. Antes de apresentar o resultado, o fluxo deve executar a verificação de identidade definida no RF52. As condições de privacidade e de comunicação do resultado são estabelecidas, respectivamente, pelos RNF6 e RNF7.

_Critérios de aceitação:_

- Após localizar a solicitação e concluir a verificação de identidade (RF52), o inscrito vê sua posição e a situação atual da inscrição, conforme os RNF6 e RNF7.

- Sem verificação de identidade concluída, a consulta de posição é negada, conforme o RNF6.

- Após mudanças de prioridade ou de situação que alterem a fila, uma nova consulta autorizada mostra a posição atualizada.

_Rastreabilidade:_ Feature "Consultar posição individual na fila" → CP3 — Fila de espera e consulta de posição → OE4/OE7 → IS03 — Expectativa sobre a fila. Dependência: RF52 — Verificar identidade do paciente ou responsável (CP12).

#### Feature — Manter e informar condições gerais da fila

**RF9 — Manter e informar condições gerais da fila**{ #rf9 }

O sistema deve permitir que a coordenação cadastre, revise e publique informações institucionais sobre o funcionamento da fila de espera da Clínica Escola FBr, incluindo os critérios gerais de atendimento e a capacidade de atendimento. Cada publicação deve registrar o conteúdo, o responsável e a data e hora, substituindo a versão pública anterior sem apagar seu histórico.

O sistema deve permitir que qualquer interessado consulte somente a versão vigente publicada pela coordenação.

As informações apresentadas devem corresponder ao conteúdo institucional aprovado pela Clínica Escola e conter a data da última atualização.

A divulgação deve ocorrer de forma agregada, sem permitir a identificação de inscritos, a exposição de informações clínicas individuais ou a visualização de dados restritos da operação.

Quando não houver informação de capacidade aprovada e vigente, o sistema não deve apresentar valores estimados como se representassem a disponibilidade real de vagas.

_Critérios de aceitação:_

- A publicação de uma nova versão pela coordenação registra o responsável e a data e a hora, guarda a versão anterior no histórico administrativo e torna pública apenas a nova.

- A página pública da fila mostra os critérios gerais de atendimento e a capacidade divulgada, com a data de atualização.

- Sem informação de capacidade aprovada e vigente, nenhuma quantidade de vagas é apresentada como disponibilidade confirmada.

- As informações gerais da fila não exibem nomes, dados cadastrais, queixas nem classificações clínicas individuais.

- A publicação de uma alteração aprovada substitui a informação anterior e mostra a nova data de atualização.

_Rastreabilidade:_ Feature "Manter e informar condições gerais da fila" → CP3 — Fila de espera e consulta de posição → OE4/OE7 → IS02 — Aumento da demanda.

### Agendamento, Confirmação e Remarcação (CP4)

A CP4 foi decomposta em oito features, organizadas em três conjuntos: agendamento, confirmação/lembrete e cancelamento, respondendo à dor mais crítica relatada pela coordenação — as falhas de agendamento e de confirmação de presença que produzem horários ociosos ([Solução Proposta, §2.1 e §2.3](../../unidade-1/solucao-proposta.md#23-caracteristicas-de-produto-mapeadas-com-os-objetivos-especificos)).

O agendamento depende do vínculo entre paciente e estagiário responsável, definido pela CP5, e pressupõe que a inscrição já tenha passado pela triagem da CP2. O acesso aos dados da sessão observa os perfis definidos na CP12 — Segurança, sigilo e controle de acesso. O registro de um não comparecimento gera o evento consumido pela CP9 — Controle de assiduidade e alertas, para a contagem cumulativa de faltas; esta decomposição trata apenas do registro do evento na sessão, não da interpretação cumulativa dele.

Conforme confirmado pela Clínica Escola na reunião de 26/08/2026 ([ata](../../unidade-1/reunioes.md)), todas as sessões de atendimento psicológico da Clínica Escola FBr são presenciais — a FBr não realiza atendimento psicológico remoto, em razão de restrição do Conselho Regional de Psicologia (CRP) aplicável ao estágio supervisionado. O agendamento (RF10) e a confirmação de presença (RF14) tratam, portanto, exclusivamente de horários presenciais; o sistema não precisa prever modalidade remota de sessão.

O canal do lembrete (e-mail e SMS) e o limite de uma remarcação por paciente no ciclo já foram confirmados pela Clínica Escola. Os prazos que ainda não foram fixados pela FBr são tratados como **parâmetros de agendamento**: valores configuráveis pela coordenação na interface, sem intervenção técnica, que o sistema aplica a partir da alteração e que nascem com o valor padrão abaixo. Os valores padrão são uma proposta da equipe e devem ser confirmados na validação com a FBr; a mudança de um valor não altera sessões já realizadas nem classificações já registradas.

| Parâmetro                                  | Valor padrão                          | Responsável pela configuração | Utilizado em |
| ------------------------------------------ | ------------------------------------- | ----------------------------- | ------------ |
| Duração padrão da sessão                   | 50 minutos                            | Coordenação                   | RF10, RF12   |
| Antecedência do lembrete                   | 24 horas antes do início da sessão    | Coordenação                   | RF13         |
| Prazo de confirmação de presença           | até 12 horas antes do início da sessão | Coordenação                  | RF14         |
| Antecedência mínima para cancelamento sem falta | 24 horas antes do início da sessão | Coordenação                  | RF15, RF35   |

#### Feature — Agendar sessão do paciente

**RF10 — Agendar sessão do paciente**{ #rf10 }

- O sistema deve permitir que a secretaria ou o estagiário responsável agende uma sessão para um paciente já vinculado a um estagiário (CP5), informando a data e o horário de início.
- O horário de término é calculado pela duração padrão da sessão (parâmetro de agendamento, padrão de 50 minutos) e pode ser ajustado por quem agenda, desde que seja posterior ao início.
- Duas sessões se sobrepõem quando o intervalo entre o início e o término de uma tem algum instante em comum com o da outra; sessões em sequência, em que o término de uma coincide com o início da seguinte, não se sobrepõem.
- O sistema deve impedir o agendamento de sessões sobrepostas para o mesmo estagiário ou para o mesmo paciente, e deve registrar o status inicial da sessão como "agendada", com paciente, estagiário, data, horário de início e horário de término associados.
- O agendamento não deve ocorrer para pacientes sem estagiário responsável vinculado.
- O registro de auditoria do agendamento segue o RNF10.
- Ao confirmar o agendamento, o sistema deve enviar ao paciente, pelo canal de contato preferencial informado na inscrição (RF1), o link de confirmação de presença utilizado pelo RF14.

_Critérios de aceitação:_

- O agendamento, pela secretaria ou pelo estagiário, de paciente com estagiário vinculado, informando só o início, registra a sessão como "agendada" com paciente, estagiário, data, início e término calculado pela duração padrão, e envia ao paciente o link de confirmação de presença (RF14).
- Com uma sessão do estagiário das 14h00 às 14h50, uma nova sessão desse estagiário ou do mesmo paciente iniciando às 14h30 é bloqueada e o conflito é informado.
- Com uma sessão do estagiário das 14h00 às 14h50, uma nova sessão desse estagiário iniciando às 14h50 é permitida.
- Paciente sem estagiário responsável vinculado não pode ter sessão agendada.

_Rastreabilidade:_ Feature "Agendar sessão do paciente" → CP4 — Agendamento, confirmação e remarcação → OE3/OE4. Dependência: CP5 — Distribuição de casos entre supervisores e estagiários; restrição transversal: CP12 — Segurança, sigilo e controle de acesso.

#### Feature — Consultar agenda de sessões do estagiário

**RF11 — Consultar agenda de sessões do estagiário**{ #rf11 }

O sistema deve permitir que o estagiário consulte suas sessões agendadas, confirmadas e realizadas, com filtro por período. O supervisor deve poder consultar a agenda dos estagiários sob sua supervisão, respeitando os vínculos definidos na CP5.

_Critérios de aceitação:_

- O estagiário vê na própria agenda suas sessões agendadas, confirmadas e realizadas, com filtro por período.
- O supervisor vê a agenda dos estagiários sob sua supervisão.
- Usuário sem vínculo de supervisão com o estagiário não acessa a agenda dele.

_Rastreabilidade:_ Feature "Consultar agenda de sessões do estagiário" → CP4 — Agendamento, confirmação e remarcação → OE3/OE4. Dependência: RF10, CP5; restrição transversal: CP12.

#### Feature — Reagendar sessão do paciente

**RF12 — Reagendar sessão do paciente**{ #rf12 }

O sistema deve permitir que a secretaria ou o estagiário responsável altere a data ou o horário de uma sessão ainda não realizada, aplicando as mesmas regras de término e de sobreposição do RF10 e preservando a data/horário original da sessão, que continua disponível para o relatório final de evolução (CP6/CP7/CP8). Toda remarcação exige uma justificativa. O registro de auditoria da remarcação e da aprovação de exceção segue o RNF10.

Enquanto este requisito ficar para uma entrega posterior ([validação do MVP com a FBr](backlog.md#1024-validacao-do-mvp-com-o-cliente)), a remarcação é feita cancelando a sessão original (RF15 ou RF16, conforme quem solicitar) e criando uma nova sessão (RF10). Esse cancelamento administrativo, feito exclusivamente para remarcar, não deve ser contabilizado como falta nem para o paciente (RF15, RF35), nem para o estagiário (RF16, RF39/RF40) — condição confirmada pela FBr na validação do MVP.

Conforme confirmado pela Clínica Escola, o paciente pode pedir a remarcação de suas sessões no máximo uma vez dentro do ciclo de acompanhamento. Esse limite admite exceção, que somente a coordenação pode autorizar: a remarcação excedente fica bloqueada até que a coordenação a aprove, e o sistema deve registrar a justificativa da exceção, o usuário que a aprovou e a data/hora da aprovação. Remarcações motivadas pela ausência do estagiário (RF16/RF17) não contam para o limite do paciente.

_Critérios de aceitação:_

- A alteração de data ou horário de sessão ainda não realizada, com justificativa, atualiza a sessão e mantém a data/horário anterior e a justificativa vinculados a ela.
- Sessão já realizada ou cancelada pelo paciente (RF15) não pode ser reagendada.
- Segunda remarcação a pedido do paciente no mesmo ciclo é bloqueada, com aviso de que depende de aprovação da coordenação.
- A aprovação da remarcação excedente pela coordenação, com justificativa, efetiva a remarcação e gera o registro de auditoria do RNF10 com a justificativa e o aprovador.
- O reagendamento de sessão cancelada por ausência do estagiário (RF16), feito pela opção oferecida ao paciente (RF17), é permitido e não conta no limite do paciente.

_Rastreabilidade:_ Feature "Reagendar sessão do paciente" → CP4 — Agendamento, confirmação e remarcação → OE3/OE4. Dependência: RF10.

#### Feature — Enviar lembrete de sessão agendada

**RF13 — Enviar lembrete de sessão agendada**{ #rf13 }

O sistema deve enviar automaticamente um lembrete ao paciente antes de uma sessão agendada, registrando o envio ou a eventual falha de envio conforme o RNF11. O lembrete deve ser enviado por e-mail e por SMS (ambos os canais), conforme confirmado pela Clínica Escola, para os contatos cadastrados na inscrição, e deve conter a data, o horário e o link de confirmação de presença (RF14) já enviado no agendamento (RF10) — reforçando-o, sem exigir novo envio para que o paciente confirme presença. O momento do envio é definido pelo parâmetro "antecedência do lembrete" (padrão de 24 horas antes do início da sessão), configurável pela coordenação. Sessões agendadas quando já falta menos do que essa antecedência para o início devem ter o lembrete enviado no momento do agendamento.

_Critérios de aceitação:_

- Com sessão às 14h00 de quinta-feira e antecedência de 24 horas, o lembrete é enviado por e-mail e SMS às 14h00 de quarta-feira, com o envio registrado com data e hora.
- Sessão agendada com menos tempo até o início do que a antecedência configurada recebe o lembrete no momento do agendamento.
- Nova antecedência definida pela coordenação vale para as sessões futuras cujo lembrete ainda não foi enviado.
- Falha no envio do lembrete é registrada como falha, e não como envio concluído.

_Rastreabilidade:_ Feature "Enviar lembrete de sessão agendada" → CP4 — Agendamento, confirmação e remarcação → OE3. Dependência: RF10.

#### Feature — Confirmar presença em sessão agendada

**RF14 — Confirmar presença em sessão agendada**{ #rf14 }

O sistema deve permitir que o paciente confirme presença em uma sessão agendada até o prazo de confirmação, definido pelo parâmetro "prazo de confirmação de presença" (padrão: até 12 horas antes do início da sessão), configurável pela coordenação. Ao confirmar, o sistema deve atualizar o status da sessão para "confirmada" e gerar o registro de auditoria do RNF10. Sessões não confirmadas até o fim do prazo devem ser sinalizadas para a secretaria, para contato ativo com o paciente. A ausência de confirmação não é, por si só, uma falta: a falta só é registrada quando o paciente não comparece à sessão (RF34).

O link de confirmação de presença é enviado ao paciente no momento em que a sessão é agendada (RF10), para o canal de contato preferencial informado na inscrição (RF1), e segue as proteções do RNF15. O envio **automático e antecipado** de um lembrete adicional antes da sessão — com antecedência configurável — é tratado pelo RF13, que fica para uma entrega posterior; enquanto RF13 não estiver disponível, o link enviado no momento do agendamento é o único canal de confirmação, e o RF14 não depende do RF13 para funcionar.

_Critérios de aceitação:_

- Com sessão às 14h00 e prazo de confirmação de 12 horas, a confirmação do paciente até as 2h00 muda o status para "confirmada" e gera o registro de auditoria do RNF10.
- Na mesma sessão, confirmação após as 2h00 é recusada e o paciente é orientado a procurar a secretaria.
- Sessão sem confirmação ao fim do prazo é sinalizada para a secretaria, sem registro de falta.
- Sessão já cancelada não pode ser confirmada.

_Rastreabilidade:_ Feature "Confirmar presença em sessão agendada" → CP4 — Agendamento, confirmação e remarcação → OE3. Dependência: RF10; integração: RF13 (lembrete automático adicional, entrega posterior).

#### Feature — Registrar cancelamento de sessão pelo paciente

**RF15 — Registrar cancelamento de sessão pelo paciente**{ #rf15 }

O sistema deve permitir que o paciente, ou a secretaria em seu nome, cancele uma sessão cujo horário de início ainda não chegou, informando um motivo. A antecedência do cancelamento é o tempo entre a data/hora do registro do cancelamento e a data/hora de início da sessão. O sistema deve classificar o cancelamento pelo parâmetro "antecedência mínima para cancelamento sem falta" (padrão de 24 horas), configurável pela coordenação:

- antecedência **igual ou maior** que o mínimo: cancelamento no prazo, que não conta como falta;
- antecedência **menor** que o mínimo: cancelamento fora do prazo, que conta como falta e gera o evento consumido pela CP9 — Controle de assiduidade e alertas (RF35);
- **cancelamento administrativo para remarcação:** quando a secretaria ou o estagiário registrar o cancelamento com a finalidade exclusiva de reagendar a sessão em seguida (RF10) — suprindo, enquanto o RF12 ficar para uma entrega posterior, a ausência de uma remarcação em uma única operação —, o cancelamento deve ser classificado nessa categoria própria e não deve contar como falta do paciente, independentemente da antecedência.

Depois do horário de início, a sessão não pode mais ser cancelada; o não comparecimento é tratado como falta (RF34). A classificação é feita com o valor do parâmetro vigente no momento do registro do cancelamento.

_Critérios de aceitação:_

- Com sessão às 14h00 de quinta-feira e antecedência mínima de 24 horas, o cancelamento com motivo registrado até as 14h00 de quarta-feira muda o status para "cancelada", guarda o motivo, é classificado como "no prazo" e gera o registro de auditoria do RNF10.
- Na mesma sessão, o cancelamento registrado a partir das 14h01 de quarta-feira, antes do início, é classificado como "fora do prazo" e gera o evento de falta para a CP9.
- Sessão já iniciada ou realizada não pode ser cancelada.
- O cancelamento registrado pela secretaria ou pelo estagiário como administrativo para remarcação é classificado nessa categoria e não gera evento de falta para a CP9, qualquer que seja a antecedência.

_Rastreabilidade:_ Feature "Registrar cancelamento de sessão pelo paciente" → CP4 — Agendamento, confirmação e remarcação → OE3. Dependência: RF10. Integração: CP9 — Controle de assiduidade e alertas.

#### Feature — Registrar cancelamento de sessão pelo estagiário

**RF16 — Registrar cancelamento de sessão pelo estagiário**{ #rf16 }

O sistema deve permitir que o estagiário, o supervisor ou a secretaria registrem a ausência prevista do estagiário em uma sessão já agendada, informando o motivo. O registro deve disparar a notificação ao paciente afetado (RF17); a auditoria da operação segue o RNF10.

O registro deve distinguir duas situações: **ausência real do estagiário** (ele não poderá realizar a sessão no horário agendado), que é contabilizada para a consolidação de faltas do estagiário (RF39/RF40); e **cancelamento administrativo para remarcação**, usado quando a secretaria ou o estagiário cancela a sessão com a finalidade exclusiva de reagendá-la em seguida (RF10) — suprindo, enquanto o RF12 ficar para uma entrega posterior, a ausência de uma remarcação em uma única operação —, que não representa falta do estagiário e não deve ser contabilizado pelo RF39/RF40.

_Critérios de aceitação:_

- O registro, com motivo, da ausência prevista do estagiário pelo estagiário, supervisor ou secretaria atualiza o status da sessão e dispara a notificação ao paciente.
- Usuário sem vínculo com a sessão (que não seja o estagiário, o supervisor dele ou a secretaria) não consegue registrar a ausência.
- Cancelamento registrado como ausência real do estagiário é contabilizado nas faltas dele (RF39/RF40).
- Cancelamento registrado como administrativo para remarcação não é contabilizado nas faltas do estagiário (RF39/RF40).

_Rastreabilidade:_ Feature "Registrar cancelamento de sessão pelo estagiário" → CP4 — Agendamento, confirmação e remarcação → OE3/OE4. Dependência: RF10, CP5.

#### Feature — Notificar paciente sobre ausência do estagiário

**RF17 — Notificar paciente sobre ausência do estagiário**{ #rf17 }

Quando uma sessão for cancelada por ausência do estagiário (RF16), o sistema deve notificar o paciente com a maior antecedência possível, oferecendo a opção de reagendamento (RF12).

_Critério de aceitação:_ A sessão cancelada por ausência do estagiário gera notificação imediata ao paciente, com a opção de reagendar.

_Rastreabilidade:_ Feature "Notificar paciente sobre ausência do estagiário" → CP4 — Agendamento, confirmação e remarcação → OE3. Dependência: RF16.

#### Modelo de domínio da CP4

- **Sessão:** entidade central, com atributos paciente, estagiário, data, horário de início, horário de término, status (agendada, confirmada, cancelada, realizada, falta), motivo e classificação do cancelamento ("no prazo" ou "fora do prazo"), quando houver.
- **Remarcação:** registro vinculado à sessão, com data/horário anterior e novo, justificativa, origem (pedido do paciente ou ausência do estagiário) e, quando exceder o limite do paciente, o aprovador da exceção.
- **Parâmetros de agendamento:** duração padrão da sessão, antecedência do lembrete, prazo de confirmação e antecedência mínima para cancelamento sem falta, mantidos pela coordenação.
- **Relações:** Sessão (N) — Paciente (1); Sessão (N) — Estagiário (1); Sessão (1) — Remarcação (N).
- **Regras de integridade:** uma Sessão só pode ser criada se já existir o vínculo Paciente–Estagiário definido pela CP5; sessões do mesmo estagiário ou do mesmo paciente não podem ter intervalos de início e término sobrepostos.
- **Evento "lembrete enviado":** deve ficar auditável, mesmo sem constituir entidade persistente central.

### Distribuição de casos entre supervisores e estagiários (CP5)

A CP5 foi decomposta em nove features, organizadas em três conjuntos: distribuição dos casos entre supervisores conforme a área de especialidade, vinculação de cada paciente a um estagiário responsável e acompanhamento/reorganização dos vínculos já estabelecidos, apoiando a organização da reunião inicial de estágio e a rastreabilidade da responsabilidade sobre cada caso ([Solução Proposta, §2.3](../../unidade-1/solucao-proposta.md#23-caracteristicas-de-produto-mapeadas-com-os-objetivos-especificos)).

A distribuição depende da classificação de prioridade realizada na CP2 e da fila de espera da CP3, enquanto o acesso ao prontuário do caso pelo estagiário e pelo supervisor respeita os perfis e restrições definidos na CP12. A ordem de prioridade na distribuição (RN5.4), o limite de casos simultâneos (RN5.8), a possibilidade de atendimento em dupla (RN5.9) e o enquadramento da transferência de caso na CP5 (RF25) ainda dependem de validação com a FBr.

#### Feature — Listar casos aguardando distribuição

**RF18 — Listar casos aguardando distribuição**{ #rf18 }

O sistema deve listar, para um usuário autenticado com perfil de coordenação ou supervisor, os casos (pacientes) já triados que ainda não têm supervisor e estagiário responsáveis identificados, ordenados por prioridade, para apoiar a reunião inicial de estágio. Casos já distribuídos deixam de aparecer na lista. Quando não houver caso pendente, o sistema deve informar isso de forma clara.

_Critérios de aceitação:_

- A lista de casos aguardando distribuição mostra à coordenação ou ao supervisor somente casos triados sem supervisor e estagiário responsáveis, ordenados por prioridade.
- Caso já distribuído a um supervisor não aparece na lista de pendentes.
- Sem casos pendentes, a lista informa que não há casos aguardando distribuição.

_Rastreabilidade:_ Feature "Listar casos aguardando distribuição" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5/OE2.

#### Feature — Registrar áreas de especialidade do supervisor

**RF19 — Registrar áreas de especialidade do supervisor**{ #rf19 }

O sistema deve permitir que a coordenação registre e mantenha as áreas de especialidade de cada supervisor, que servem de critério para a distribuição dos casos (RF20). Cada supervisor pode ter uma ou mais áreas de especialidade, e a manutenção dessa lista deve ser possível pela interface, sem intervenção técnica. Alterar as áreas de um supervisor não deve afetar os casos já distribuídos a ele.

_Critérios de aceitação:_

- A coordenação consegue associar uma ou mais áreas de especialidade a um supervisor.
- A remoção de uma área de especialidade do supervisor não retira dele os casos já distribuídos.

_Rastreabilidade:_ Feature "Registrar áreas de especialidade do supervisor" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5.

#### Feature — Distribuir caso a supervisor conforme área de especialidade

**RF20 — Distribuir caso a supervisor conforme área de especialidade**{ #rf20 }

O sistema deve permitir que a coordenação atribua cada caso pendente (RF18) a um supervisor, considerando a compatibilidade entre a área de especialidade exigida pelo caso — quando registrada pela equipe clínica junto à confirmação da prioridade (RF6, CP2) — e as áreas registradas para os supervisores (RF19). Quando o caso não tiver área de especialidade registrada, a distribuição não deve exigir compatibilidade, podendo ser feita a qualquer supervisor. Um caso só pode ter um supervisor responsável vigente por vez, e a atribuição deve ficar registrada com data e autor. Quando não houver supervisor compatível com a área exigida, o sistema deve informar essa condição e permitir a atribuição manual a outro supervisor, registrando a exceção. A reatribuição de um caso que já possui supervisor deve ser feita exclusivamente pela transferência de caso (RF25), e não por uma nova distribuição.

_Critérios de aceitação:_

- A distribuição, pela coordenação, de caso a supervisor da área exigida registra o supervisor como responsável, com data e autor da atribuição.
- Sem supervisor compatível disponível, o sistema informa a falta de compatibilidade e permite a atribuição manual, registrando a exceção.
- Caso que já tem supervisor responsável não pode ser distribuído de novo; o sistema orienta o uso da transferência (RF25).
- Caso sem área de especialidade registrada pode ser distribuído a qualquer supervisor, sem exigência de compatibilidade.

_Rastreabilidade:_ Feature "Distribuir caso a supervisor conforme área de especialidade" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5. Dependência: RF18, RF19, RF6 (CP2).

#### Feature — Vincular paciente a estagiário responsável

**RF21 — Vincular paciente a estagiário responsável**{ #rf21 }

O sistema deve permitir que o supervisor vincule cada paciente sob sua responsabilidade a um estagiário com conta institucional ativa (RF53 e RF54), responsável pelo atendimento. A gestão de semestres letivos e do vínculo acadêmico do estagiário com a instituição de ensino não faz parte do escopo deste sistema: a condição de "estagiário ativo" equivale à conta institucional mantida ativa pela coordenação, que a desativa (RF54) ao término do estágio, retirando-o das opções de vinculação. Após o vínculo, o caso passa a ter estagiário e supervisor identificados, e o estagiário vinculado passa a ter acesso ao prontuário do caso, respeitando os perfis e restrições definidos na CP12. O supervisor só pode vincular estagiários a casos sob sua própria responsabilidade, e o vínculo deve ficar registrado com data e autor.

_Critérios de aceitação:_

- O vínculo de um estagiário ao caso pelo supervisor responsável registra o estagiário como responsável e lhe dá acesso ao caso.
- Supervisor que não é responsável pelo caso não consegue vincular estagiário a ele.
- Estagiário com conta desativada (RF54) não aparece entre as opções de vínculo.

_Rastreabilidade:_ Feature "Vincular paciente a estagiário responsável" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5. Dependência: RF20, RF53/RF54 (CP12). Integração: RF66 (CP6 — criação do prontuário a partir do vínculo).

#### Feature — Consultar responsáveis pelo caso

**RF22 — Consultar responsáveis pelo caso**{ #rf22 }

O sistema deve exibir, para cada caso, o estagiário e o supervisor responsáveis, para uso da secretaria no agendamento, do próprio estagiário e supervisor no acompanhamento do caso, e da coordenação no acompanhamento geral. A consulta deve exibir apenas o nome do estagiário e do supervisor responsáveis, sem expor dados clínicos a perfis que não têm acesso ao prontuário, e casos ainda sem responsáveis devem ser sinalizados como pendentes de distribuição.

_Critério de aceitação:_ A consulta do caso por secretaria, estagiário, supervisor ou coordenação mostra o estagiário e o supervisor responsáveis, sem dados clínicos.

_Rastreabilidade:_ Feature "Consultar responsáveis pelo caso" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5. Dependência: RF21.

#### Feature — Consultar casos sob responsabilidade do estagiário ou supervisor

**RF23 — Consultar casos sob responsabilidade do estagiário ou supervisor**{ #rf23 }

O sistema deve permitir que o estagiário ou o supervisor consultem a lista de casos vinculados a eles, identificando o paciente, a prioridade e a situação de cada caso. O estagiário deve visualizar apenas os casos vinculados a ele, enquanto o supervisor deve visualizar os casos sob sua responsabilidade e os de seus estagiários.

_Critérios de aceitação:_

- O estagiário vê na lista somente os casos vinculados a ele.
- O supervisor vê na lista os casos sob sua responsabilidade direta e os dos estagiários vinculados a eles.
- Estagiário ou supervisor sem vínculo com um caso não o vê na lista e tem o acesso direto negado.

_Rastreabilidade:_ Feature "Consultar casos sob responsabilidade do estagiário ou supervisor" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5. Dependência: RF21.

#### Feature — Visualizar distribuição de casos por supervisor

**RF24 — Visualizar distribuição de casos por supervisor**{ #rf24 }

O sistema deve mostrar à coordenação quantos casos ativos cada supervisor e cada estagiário têm sob sua responsabilidade, apoiando o equilíbrio da carga entre supervisores e alimentando o indicador "distribuição de casos por supervisor" da CP11.

_Critério de aceitação:_ A visão de distribuição mostra à coordenação o número atual de casos ativos por supervisor e por estagiário.

_Rastreabilidade:_ Feature "Visualizar distribuição de casos por supervisor" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5; alimenta CP11 — Indicadores e relatórios institucionais. Dependência: RF20.

#### Feature — Transferir caso para outro estagiário ou supervisor

**RF25 — Transferir caso para outro estagiário ou supervisor**{ #rf25 }

O sistema deve permitir a transferência de um caso ativo, preservando o histórico do paciente (sessões, evolução e vínculos anteriores), com os seguintes limites por perfil, coerentes com o RNF16: o **supervisor responsável pelo caso** pode transferi-lo apenas para outro estagiário sob a sua própria supervisão; transferir o caso para outro supervisor — por exemplo, ao término do estágio, na saída do estagiário ou por reorganização da carga — é ação exclusiva da **coordenação**, que pode transferir qualquer caso, para qualquer supervisor ou estagiário. A transferência deve exigir a indicação do novo responsável e do motivo, e deve ficar registrada com responsável anterior, novo responsável, data/hora e motivo, vinculada à atribuição anterior. A partir da transferência, o responsável anterior perde o acesso ao caso, e o novo responsável passa a ter acesso a todo o histórico. Esse registro deve ser mantido no sistema mesmo enquanto a tela dedicada à sua consulta (RF26) ficar para uma entrega posterior, de modo que o histórico de transferências exista integralmente no banco desde já.

_Critérios de aceitação:_

- A transferência, pelo supervisor responsável, de caso para outro estagiário sob sua supervisão registra o novo responsável, mantém o histórico do paciente disponível a ele e revoga o acesso do estagiário anterior.
- O supervisor A não consegue transferir seu caso para estagiário do supervisor B; o sistema orienta a transferência pela coordenação.
- A transferência de caso ativo pela coordenação para outro supervisor registra o novo supervisor e, quando indicado, o novo estagiário, preserva o histórico e revoga o acesso dos responsáveis anteriores.

_Rastreabilidade:_ Feature "Transferir caso para outro estagiário ou supervisor" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5. Dependência: RF21; restrição transversal: RNF16.

#### Feature — Consultar histórico de responsáveis do caso

**RF26 — Consultar histórico de responsáveis do caso**{ #rf26 }

O sistema deve permitir consultar a sequência de supervisores e estagiários que já foram responsáveis por um caso, com a data e o motivo de cada mudança, listados em ordem cronológica. Podem consultar o histórico: o estagiário e o supervisor responsáveis vigentes pelo caso; qualquer supervisor que já tenha figurado no histórico daquele caso, exclusivamente quanto ao próprio período de responsabilidade; e a coordenação, sem restrição. Um estagiário ou supervisor sem nenhum vínculo, atual ou passado, com o caso não deve ter acesso ao histórico.

_Critérios de aceitação:_

- O histórico de caso transferido lista, em ordem cronológica, cada vínculo com responsável, período e motivo do encerramento, para os responsáveis vigentes e a coordenação.
- Supervisor que respondeu pelo caso no passado vê no histórico apenas o próprio período de responsabilidade.
- Estagiário ou supervisor sem vínculo atual ou passado com o caso não acessa o histórico.

_Rastreabilidade:_ Feature "Consultar histórico de responsáveis do caso" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5. Dependência: RF21, RF25.

### Prontuário eletrônico (CP6)

A CP6 foi decomposta em duas features: a criação e inicialização do prontuário eletrônico no início do acompanhamento e a consulta ao prontuário pelo estagiário responsável e por seu supervisor. O registro da evolução de cada sessão passa a ser tratado como capacidade própria na CP7 — Registro de evolução por sessão, e a consolidação do relatório final do ciclo de atendimento passa a ser tratada na CP8 — Geração do relatório final de evolução, conforme a decomposição em três características já registrada na [Solução Proposta, §2.3](../../unidade-1/solucao-proposta.md#23-caracteristicas-de-produto-mapeadas-com-os-objetivos-especificos). Esta seção substitui a decomposição consolidada anteriormente declarada sob o rótulo único "CP6" (issue #34), que reunia prontuário, evolução e relatório final antes da separação em CP6/CP7/CP8.

O acesso ao prontuário depende do vínculo de responsabilidade definido na CP5 e está sujeito à restrição de acesso do RF55 — Restringir acesso ao prontuário do paciente (CP12). Para tornar a completude verificável sem presumir conteúdo diagnóstico, o prontuário possui o conjunto mínimo de dados estruturais definido no RF27; campos clínicos adicionais somente podem ser acrescentados após validação institucional.

#### Feature — Criar e inicializar o prontuário do paciente

**RF66 — Criar e inicializar o prontuário do paciente**{ #rf66 }

O sistema deve criar o prontuário eletrônico do paciente automaticamente no momento em que o caso for vinculado a um estagiário responsável (RF21), inicializando-o com a identificação do paciente, do caso e do ciclo de atendimento. A partir da criação, o estagiário responsável deve poder registrar, como dados iniciais do prontuário, a anamnese e o contrato terapêutico (ou documento equivalente) que formalizam o início do acompanhamento. Um prontuário não pode ser criado para um caso ainda sem estagiário responsável vinculado, e cada caso deve ter exatamente um prontuário por ciclo de atendimento. O sigilo dos dados iniciais segue o RNF25 e o acesso, a restrição do RF55.

_Critérios de aceitação:_

- A confirmação do vínculo do caso a um estagiário responsável (RF21) cria o prontuário eletrônico do ciclo, associado ao paciente e ao caso.
- A anamnese e o contrato terapêutico registrados pelo estagiário ficam armazenados como dados iniciais do prontuário, com autor e data/hora.
- Caso sem estagiário responsável vinculado não pode ter prontuário criado.
- Caso que já tem prontuário no ciclo vigente não recebe um segundo prontuário.

_Rastreabilidade:_ Feature "Criar e inicializar o prontuário do paciente" → CP6 — Prontuário eletrônico → OE5/OE6. Dependência: RF21 (CP5); restrição transversal: CP12 — Segurança, sigilo e controle de acesso.

#### Feature — Consultar prontuário do paciente

**RF27 — Consultar prontuário do paciente**{ #rf27 }

O sistema deve apresentar ao estagiário responsável e ao seu supervisor o prontuário eletrônico do paciente vinculado ao caso. O prontuário deve conter, no mínimo: identificação do paciente e do caso; identificação do ciclo de atendimento; dados iniciais registrados na criação do prontuário (anamnese e contrato terapêutico, RF66); estagiário e supervisor responsáveis, inclusive o histórico de responsáveis; sessões do ciclo com data e situação; evoluções vinculadas às sessões, com original, correções, complementos e situação de validação pelo supervisor (RF67); encerramento do caso por alta, quando houver (RF68); e relatório final, quando existente, com sua versão e estado de revisão. A consulta deve refletir o vínculo de responsabilidade vigente, inclusive após transferência de caso (RF25), e preservar a associação de cada registro ao paciente, ao caso e ao ciclo correspondente. O acesso de outros perfis ao conteúdo clínico segue a restrição do RF55.

_Critérios de aceitação:_

- Ao abrir o prontuário, o estagiário ou o supervisor do caso vê todos os elementos mínimos do ciclo: identificação do paciente, do caso e do ciclo; dados iniciais; responsáveis; sessões; evoluções com correções, complementos e situação de validação; e encerramento por alta e relatório final, quando existentes.
- Elemento mínimo ainda sem registro no ciclo aparece como ausente, sem omitir a seção e sem conteúdo clínico presumido.
- Após transferência, o novo responsável autorizado encontra no prontuário os registros anteriores preservados.
- Usuário sem vínculo clínico vigente com o caso não acessa o conteúdo clínico do prontuário.

_Rastreabilidade:_ Feature "Consultar prontuário do paciente" → CP6 — Prontuário eletrônico → OE5/OE6. Dependência: RF66, CP5; restrição transversal: RF55 (CP12).

#### Modelo de domínio da CP6

- **Paciente e caso:** o paciente pode ter mais de um ciclo de atendimento; cada caso mantém os vínculos clínicos vigentes e anteriores definidos na CP5.
- **Prontuário:** criado quando o caso é vinculado ao estagiário responsável (RF66), um por ciclo de atendimento; reúne os registros clínicos do paciente, separados por ciclo e acessíveis apenas aos responsáveis clínicos autorizados; reúne as evoluções declaradas na CP7 e o relatório final declarado na CP8.
- **Dados iniciais:** anamnese e contrato terapêutico (ou documento equivalente) registrados no início do acompanhamento, com autor e data/hora (RF66).

### Registro de evolução por sessão (CP7)

A CP7 foi decomposta em sete features: registro da evolução de uma sessão realizada, correção de um registro já salvo, registro de complemento, validação da evolução pelo supervisor, encerramento do caso por alta, consulta da evolução de uma sessão específica e consulta do histórico consolidado de evoluções do ciclo de atendimento. A validação pelo supervisor (RF67) e o encerramento por alta (RF68) foram declarados a partir das dúvidas levantadas pela Clínica Escola FBr na validação do MVP (seção [10.2.4](backlog.md#1024-validacao-do-mvp-com-o-cliente)); a consulta do histórico consolidado foi incorporada a partir da decomposição consolidada anteriormente sob o rótulo único "CP6" (issue #34), que também tratava do prontuário e do relatório final antes da separação em três características (CP6/CP7/CP8) confirmada na [Solução Proposta, §2.3](../../unidade-1/solucao-proposta.md#23-caracteristicas-de-produto-mapeadas-com-os-objetivos-especificos).

O registro de evolução depende de uma sessão já realizada (CP4) e do vínculo entre paciente e estagiário responsável (CP5). O acesso ao conteúdo registrado é restrito ao estagiário responsável e ao seu supervisor, conforme os perfis definidos na CP12 — Segurança, sigilo e controle de acesso. A evolução registrada alimenta o prontuário eletrônico (CP6) e, ao fim do ciclo, o relatório final de evolução (CP8).

O conteúdo clínico obrigatório de um registro de evolução, a possibilidade e o prazo de correção após o registro original, e se uma sessão pode ter mais de um registro de evolução (ex.: complementos) ainda dependem de validação com a FBr. Como referência para essa definição, a FBr descreveu, na reunião de 26/08/2026 ([ata](../../unidade-1/reunioes.md)), que a evolução esperada é um resumo objetivo da sessão ("um resuminho"), e não uma transcrição integral do atendimento — o que orienta o formato, mas não substitui a definição formal dos campos obrigatórios.

#### Feature — Registrar evolução da sessão realizada

**RF28 — Registrar evolução da sessão realizada**{ #rf28 }

O sistema deve permitir que o estagiário responsável registre a evolução de uma sessão já realizada, vinculando o registro ao paciente, ao ciclo de atendimento e à sessão de origem. Cada registro deve identificar o autor e o momento do registro. O sistema deve impedir que uma evolução seja registrada para sessão de outro paciente ou por estagiário sem vínculo vigente com o caso, e deve impedir o registro de evolução para sessão que ainda não foi realizada.

_Critérios de aceitação:_

- Evolução válida registrada pelo estagiário responsável para sessão realizada fica associada à sessão, ao paciente e ao ciclo, com autor e data/hora.
- Não é possível registrar evolução em sessão de outro paciente nem sem vínculo vigente com o caso.
- Sessão não realizada (agendada, confirmada, cancelada ou com falta) não aceita registro de evolução.

_Rastreabilidade:_ Feature "Registrar evolução da sessão realizada" → CP7 — Registro de evolução por sessão → OE5/OE2. Dependência: CP4 (sessão realizada), CP5 (vínculo estagiário-paciente); restrição transversal: CP12 — Segurança, sigilo e controle de acesso.

#### Feature — Corrigir evolução registrada

**RF29 — Corrigir evolução registrada**{ #rf29 }

O sistema deve permitir que o estagiário responsável, ou o supervisor do caso, corrija um registro de evolução já salvo, preservando o conteúdo original para fins de auditoria — não deve haver sobrescrita silenciosa. Toda correção deve exigir e registrar autor, data/hora e motivo da alteração. Conforme confirmado pela Clínica Escola, o prazo para correção vai até as datas das provas do semestre letivo vigente (calendário acadêmico da instituição de ensino), prazo que deve ser reconfirmado a cada semestre.

_Critérios de aceitação:_

- A correção feita pelo próprio estagiário dentro do prazo permitido preserva a versão original e registra a nova versão com autor, data/hora e motivo.
- Evolução fora do prazo permitido para correção não pode ser alterada.
- Só o autor e o supervisor do caso conseguem corrigir uma evolução; o supervisor pode corrigir diretamente o registro do estagiário, como confirmado pela Clínica Escola (para cobrir fiscalização e férias do estagiário).

_Rastreabilidade:_ Feature "Corrigir evolução registrada" → CP7 — Registro de evolução por sessão → OE5. Dependência: RF28.

#### Feature — Registrar complemento de evolução da sessão

**RF30 — Registrar complemento de evolução da sessão**{ #rf30 }

O sistema deve permitir que o estagiário responsável adicione um complemento a um registro de evolução já salvo de uma sessão, sem alterar ou substituir o conteúdo já registrado. Diferente da correção (RF29), que revisa um conteúdo considerado incorreto, o complemento é uma informação adicional (por exemplo, uma observação posterior do estagiário ou uma orientação do supervisor) que se soma ao registro original, preservando a ordem cronológica dos complementos. Cada complemento deve identificar o autor e o momento do registro, de forma equivalente ao registro original.

_Critérios de aceitação:_

- O complemento adicionado pelo estagiário responsável fica associado à evolução original, sem alterar o conteúdo já salvo, com autor e data/hora próprios.
- A consulta da evolução (RF31/RF32) mostra o registro original e todos os complementos em ordem cronológica, distinguindo-os das correções (RF29).
- Usuário sem vínculo clínico vigente com o caso não consegue adicionar complemento.

_Rastreabilidade:_ Feature "Registrar complemento de evolução da sessão" → CP7 — Registro de evolução por sessão → OE5. Dependência: RF28.

#### Feature — Validar evolução pelo supervisor

**RF67 — Validar evolução pelo supervisor**{ #rf67 }

O sistema deve permitir que o supervisor do caso marque como validada uma evolução já registrada pelo estagiário responsável (RF28), incluindo eventuais correções (RF29) e complementos (RF30) já existentes no momento da validação, registrando o supervisor responsável e a data/hora. Esta é a versão mínima da validação: ela confirma que o supervisor revisou o conteúdo, sem alterá-lo nem substituir a correção (RF29). Uma evolução já validada que receba uma nova correção ou um novo complemento deve retornar à situação "pendente de validação", até que o supervisor confirme novamente. A preservação do registro de validação segue o RNF27.

_Critérios de aceitação:_

- A validação pelo supervisor do caso marca a evolução como validada, com o supervisor e a data/hora.
- Apenas o supervisor do caso consegue validar uma evolução.
- Evolução validada que recebe nova correção (RF29) ou novo complemento (RF30) volta para "pendente de validação".
- Na consulta (RF31/RF32), evoluções pendentes de validação aparecem de forma distinta das validadas.

_Rastreabilidade:_ Feature "Validar evolução pelo supervisor" → CP7 — Registro de evolução por sessão → OE5/OE6. Dependência: RF28; integração: RF29, RF30.

#### Feature — Encerrar caso por alta

**RF68 — Encerrar caso por alta**{ #rf68 }

O sistema deve permitir que o estagiário responsável, com confirmação do supervisor do caso, registre o encerramento do acompanhamento por alta, informando a data e o motivo. O encerramento por alta preserva todo o histórico do caso (sessões, evoluções e prontuário) e libera a vaga do paciente, de forma equivalente ao desligamento por faltas (RF37), mas com motivo e fluxo próprios: o encerramento por alta não deve ser registrado nem apresentado como desligamento por falta. Um caso encerrado por alta não deve receber novo agendamento (RF10) nem nova evolução (RF28), salvo reabertura autorizada pela coordenação. A preservação do registro de encerramento (autor, confirmação do supervisor, data e motivo) segue o RNF27.

_Critérios de aceitação:_

- O encerramento por alta registrado pelo estagiário, com data, motivo e confirmação do supervisor, encerra o caso, preserva o histórico e libera a vaga.
- Caso encerrado por alta não aceita novo agendamento nem nova evolução, salvo reabertura autorizada pela coordenação.
- O histórico do caso identifica o encerramento como alta, distinto do desligamento por faltas (RF37).
- O encerramento por alta só é concluído após a confirmação do supervisor.

_Rastreabilidade:_ Feature "Encerrar caso por alta" → CP7 — Registro de evolução por sessão → OE5/OE6. Dependência: RF28; integração: RF21 (CP5), RF37 (CP9).

#### Feature — Consultar evolução de uma sessão específica

**RF31 — Consultar evolução de uma sessão específica**{ #rf31 }

O sistema deve permitir que o estagiário responsável e o seu supervisor consultem o registro de evolução vinculado a uma sessão específica, apresentando o conteúdo original, todas as correções com seus históricos e todos os complementos em ordem cronológica. A interface deve distinguir visual e textualmente correções de complementos, sem substituir o registro original. O acesso a esse conteúdo deve respeitar a restrição de acesso ao prontuário definida na CP12.

_Critérios de aceitação:_

- A consulta da evolução de uma sessão pelo estagiário responsável ou pelo supervisor mostra o original, as correções e os complementos, com autor e data/hora de cada item, distinguindo revisão de conteúdo de informação adicional.
- Usuário sem vínculo clínico vigente com o caso não acessa a evolução da sessão.

_Rastreabilidade:_ Feature "Consultar evolução de uma sessão específica" → CP7 — Registro de evolução por sessão → OE5. Dependência: RF28, RF29 e RF30; restrição transversal: CP12.

#### Feature — Consultar histórico de evolução do paciente

**RF32 — Consultar histórico de evolução do paciente**{ #rf32 }

O sistema deve permitir que o estagiário responsável e seu supervisor consultem, no prontuário, as evoluções registradas para o ciclo de atendimento do paciente, identificando a sessão, a data e o autor de cada registro. Para cada sessão, o histórico deve apresentar o registro original, todas as correções e todos os complementos, diferenciados por tipo, autor e data/hora e ordenados cronologicamente. O histórico deve manter os registros anteriores quando houver transferência de responsável, sem misturar ciclos distintos do mesmo paciente. Esta feature difere da consulta de uma sessão específica (RF31) por reunir, em uma única visão cronológica, todas as evoluções do ciclo, em vez do registro de uma sessão isolada.

_Critérios de aceitação:_

- O histórico do ciclo mostra, por sessão e em ordem cronológica, os registros originais, as correções e os complementos, identificando o tipo, o autor e a data/hora de cada um.
- Ciclo sem evoluções exibe o aviso de que não há registros, sem mostrar dados de outro ciclo.
- Usuário sem acesso ao prontuário não consulta o histórico de evolução.

_Rastreabilidade:_ Feature "Consultar histórico de evolução do paciente" → CP7 — Registro de evolução por sessão → OE5/OE2. Dependência: RF27 (CP6), RF28, RF29 e RF30; restrição transversal: RF55 (CP12).

#### Modelo de domínio da CP7

- **Evolução:** entidade vinculada a Sessão, Paciente e Ciclo de atendimento; atributos: conteúdo, autor, data/hora de criação; pode ter versões (original + correções) e complementos cronológicos.
- **Relação:** Evolução (N) — Sessão (1) — uma sessão pode ter um registro de evolução original, sujeito a correção (RF29) e a um ou mais complementos (RF30), conforme confirmado pela Clínica Escola.
- **Correção:** sub-registro ou versão de Evolução, preservando o conteúdo anterior, autor e motivo da alteração.
- **Complemento:** informação adicional vinculada à evolução, com autor e data/hora próprios, sem substituir o conteúdo original nem suas correções.
- **Validação:** marcação da evolução como validada pelo supervisor do caso, com supervisor e data/hora; situações "pendente de validação" e "validada", retornando a pendente após nova correção ou complemento (RF67).
- **Encerramento por alta:** registro que encerra o caso no ciclo, com data, motivo, autor e confirmação do supervisor; distinto do desligamento por faltas (RF37) e bloqueia novos agendamentos e evoluções, salvo reabertura pela coordenação (RF68).

### Geração do relatório final de evolução (CP8)

A CP8 foi decomposta em uma feature: a geração do relatório final de evolução do ciclo de atendimento, a partir das evoluções registradas na CP7, para revisão do supervisor responsável, conforme a [Solução Proposta, §2.3](../../unidade-1/solucao-proposta.md#23-caracteristicas-de-produto-mapeadas-com-os-objetivos-especificos). Esta seção substitui a decomposição anteriormente consolidada sob o rótulo único "CP6" (issue #34) para a parte referente ao relatório final.

#### Feature — Gerar relatório final de evolução

**RF33 — Gerar relatório final de evolução**{ #rf33 }

O sistema deve permitir que o estagiário responsável elabore o relatório final do ciclo de atendimento a partir das evoluções registradas e o submeta ao supervisor responsável. O relatório deve conter, no mínimo: identificação do paciente e do ciclo; identificação do estagiário autor e do supervisor; período e sessões consideradas; síntese da condição inicial relatada; síntese da evolução ao longo do acompanhamento; orientações de continuidade; identificação dos registros de origem; número da versão; data de geração; e estado `rascunho`, `em revisão`, `devolvido para ajustes` ou `aprovado`. O sistema deve permitir verificar a correspondência entre o conteúdo consolidado e o histórico do prontuário e não deve completar lacunas clínicas por inferência.

O supervisor deve poder aprovar o relatório ou devolvê-lo ao estagiário com observações obrigatórias. Cada nova submissão deve gerar versão distinguível, preservando as versões e decisões anteriores. Somente uma versão aprovada, com identificação do supervisor e data/hora da aprovação, pode ser finalizada em PDF para impressão; o documento deve conter campo para assinatura manuscrita do supervisor. A secretaria deve poder imprimir exclusivamente a versão aprovada e, antes de registrar a entrega presencial ao paciente ou ao responsável legal, deve confirmar no sistema que a via foi assinada. O sistema deve registrar a data e o responsável pela impressão e pela entrega e não deve disponibilizar o relatório para download ou envio por e-mail ao paciente.

A referência institucional é o encerramento de um ciclo de 8 a 10 sessões. Se o ciclo for encerrado fora dessa faixa, o estagiário deve registrar a justificativa no relatório antes de submetê-lo à revisão.

Conforme confirmado pela Clínica Escola na reunião de 26/08/2026 ([ata](../../unidade-1/reunioes.md)), o relatório final não se destina apenas à revisão interna do supervisor: ao final do ciclo, o relatório aprovado deve ser entregue ao próprio paciente, apresentando como ele estava, como evoluiu ao longo do acompanhamento e orientações sobre a continuidade do seu desenvolvimento. Após a aprovação pelo supervisor, o sistema deve, portanto, permitir que o relatório seja disponibilizado ao paciente (ou ao seu responsável legal, quando menor de idade), e não apenas ao corpo clínico e à coordenação. Conforme confirmado pela Clínica Escola, a entrega ao paciente deve ser impressa, pela secretaria — não por download ou e-mail.

_Critérios de aceitação:_

- A submissão do relatório pelo estagiário, com todos os campos obrigatórios, gera uma versão vinculada ao ciclo e aos registros de origem, com estado `em revisão`, disponível ao supervisor do caso.
- Ciclo sem evoluções não gera relatório; o sistema informa a ausência de registros de origem, sem conteúdo clínico presumido.
- Usuário sem vínculo clínico vigente com o caso não gera nem consulta o relatório.
- Evolução ausente ou incompleta no período fica identificável no relatório para revisão humana, sem texto clínico criado pelo sistema.
- A devolução do relatório pelo supervisor exige observações, registra a decisão e permite ao estagiário produzir nova versão sem apagar as anteriores.
- A aprovação do relatório registra o supervisor e a data/hora, bloqueia alterações na versão aprovada e permite finalizá-la em PDF com campo para assinatura manuscrita.
- Relatório sem aprovação não pode ser finalizado nem impresso pela secretaria.
- A secretaria imprime apenas a versão aprovada e, antes de registrar quem entregou e quando, confirma que a via foi assinada; não há download nem envio por e-mail ao destinatário.
- Ciclo encerrado com menos de 8 ou mais de 10 sessões exige justificativa da exceção na submissão do relatório.

_Rastreabilidade:_ Feature "Gerar relatório final de evolução" → CP8 — Geração do relatório final de evolução → OE5/OE6. Dependência: RF28, RF32 (CP7); restrição transversal: RF55 (CP12).

#### Modelo de domínio da CP8

- **Relatório final:** documento derivado das evoluções de um ciclo (CP7), com campos obrigatórios, versão, estado e registros de origem identificáveis; após aprovação do supervisor, é finalizado em PDF para o acervo institucional e para impressão pela secretaria e entrega presencial ao paciente.

### Controle de assiduidade e alertas (CP9)

A CP9 foi decomposta em nove features, organizadas em dois conjuntos: controle de faltas do paciente e controle de faltas do estagiário. Diferentemente das demais CPs, esta decomposição não foi entregue no ciclo original de elicitação — a issue [#35](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/35), atribuída a Nicolas, foi encerrada automaticamente pela PR #58, mas o conteúdo efetivamente declarado por essa PR corresponde à CP7 — Registro de evolução por sessão, e não à decomposição de assiduidade e faltas descrita na própria issue.

A declaração abaixo parte diretamente dos pontos já confirmados com a Clínica Escola na reunião de 26/08/2026 ([ata](../../unidade-1/reunioes.md)):

- (i) a regra de desligamento do paciente é de duas faltas — a ata registrou "consecutivas ou não justificadas", e a confirmação posterior da Clínica Escola fixou que contam duas faltas no ciclo de atendimento, consecutivas ou não (RF35);
- (ii) ao atingir esse limite, deve haver um alerta visual (destaque em vermelho) para a equipe responsável; e
- (iii) o desligamento por faltas libera a vaga do paciente, que deve ser proativamente realocada a outro inscrito na fila de espera (CP3), em vez de permanecer ociosa.

#### Controle de faltas do paciente

Este conjunto trata da contagem cumulativa de faltas do paciente e das consequências previstas quando o limite é atingido. Consome o evento de cancelamento fora do prazo gerado pela CP4 (RF15) — a ausência de confirmação (RF14) apenas sinaliza a sessão para a secretaria e não conta como falta — e complementa a CP4 com o registro do não comparecimento efetivo à sessão presencial, que ainda não havia sido declarado em nenhuma feature.

#### Feature — Registrar falta do paciente na sessão

**RF34 — Registrar falta do paciente na sessão**{ #rf34 }

O sistema deve permitir que o estagiário responsável, ou a secretaria, registre que o paciente não compareceu a uma sessão agendada e presencial (RF10), diferenciando esse registro do cancelamento (RF15): a falta é registrada quando a sessão ocorre sem o comparecimento do paciente, sem cancelamento prévio. O sistema deve atualizar o status da sessão para "falta do paciente", associando data, horário e usuário que efetuou o registro.

_Critérios de aceitação:_

- O registro da falta pelo estagiário responsável ou pela secretaria, em sessão presencial já passada sem realização nem cancelamento (confirmada ou não pelo paciente, RF14), muda o status para "falta do paciente", com data, horário e usuário responsável.
- Sessão já cancelada (RF15) ou já registrada como realizada não aceita registro de falta.
- Cada falta registrada gera o evento consumido pela contagem cumulativa (RF35).

_Rastreabilidade:_ Feature "Registrar falta do paciente na sessão" → CP9 — Controle de assiduidade e alertas → OE3/OE4. Dependência: RF10, RF14, RF15 (CP4).

#### Feature — Contabilizar faltas do paciente no ciclo

**RF35 — Contabilizar faltas do paciente no ciclo**{ #rf35 }

O sistema deve manter, por paciente, a contagem cumulativa de faltas no ciclo de atendimento atual, consecutivas ou não, consumindo dois eventos: a falta registrada na sessão (RF34) e o cancelamento fora do prazo (RF15), isto é, feito com antecedência menor que o mínimo configurado na CP4. Cancelamentos no prazo e cancelamentos administrativos para remarcação (RF15) não incrementam a contagem. A ausência de confirmação de presença (RF14) não conta como falta. Conforme confirmado pela Clínica Escola, o desligamento é acionado ao atingir 2 faltas no ciclo, consecutivas ou não; por isso a contagem nunca é zerada por uma sessão realizada, e só recomeça em um novo ciclo de atendimento. Uma falta é considerada "não justificada" quando não há comprovação de necessidade real (atestado, comprovante de trabalho etc.); essa classificação orienta a comunicação ao paciente, mas não altera a contagem.

_Critérios de aceitação:_

- A primeira falta do ciclo (RF34) ou o primeiro cancelamento fora do prazo (RF15) eleva a contagem para uma unidade e avisa a secretaria e o estagiário responsável de que uma nova falta resultará em desligamento.
- Uma nova falta, mesmo com sessões realizadas desde a anterior, eleva a contagem para duas unidades e dispara o alerta de limite (RF36).
- Paciente que não confirmou a sessão no prazo (RF14), mas compareceu, não tem a contagem de faltas incrementada.
- A reversão de desligamento feito por engano (RF38) ajusta a contagem de faltas conforme a decisão registrada, preservando o histórico de cada evento para auditoria.

_Rastreabilidade:_ Feature "Contabilizar faltas do paciente no ciclo" → CP9 — Controle de assiduidade e alertas → OE3/OE4. Dependência: RF15 (CP4), RF34.

#### Feature — Emitir alerta de limite de faltas atingido

**RF36 — Emitir alerta de limite de faltas atingido**{ #rf36 }

Quando a contagem de faltas do paciente no ciclo de atendimento atingir o limite de duas faltas, consecutivas ou não (RF35), o sistema deve emitir um alerta visual, com destaque em vermelho, visível à secretaria, ao estagiário responsável e à coordenação, sinalizando a necessidade de avaliar o desligamento do paciente (RF37). O alerta deve permanecer visível até que a decisão de desligamento seja registrada.

_Critérios de aceitação:_

- Ao atingir duas faltas no ciclo, consecutivas ou não, é exibido um alerta em destaque vermelho para a secretaria, o estagiário responsável e a coordenação.
- O registro da decisão de desligamento (RF37) remove o alerta pendente do paciente.

_Rastreabilidade:_ Feature "Emitir alerta de limite de faltas atingido" → CP9 — Controle de assiduidade e alertas → OE3/OE4. Dependência: RF35.

#### Feature — Desligar paciente por faltas e liberar vaga

**RF37 — Desligar paciente por faltas e liberar vaga**{ #rf37 }

O sistema deve permitir que a secretaria ou a coordenação registre o desligamento do paciente cujo limite de faltas foi atingido (RF36), informando a data e o responsável pela decisão. O requisito trata de duas ações distintas, executadas em sequência:

1. **Desligamento** (ação do usuário): a secretaria ou a coordenação confirma o desligamento, e o sistema registra a decisão e atualiza o status do paciente para "desligado por faltas".
2. **Liberação da vaga** (efeito automático do desligamento, sem nova ação do usuário): o sistema encerra o vínculo do paciente com o estagiário, cancela as sessões futuras dele e passa a contar a vaga como livre no estagiário, sinalizando-a como "vaga liberada aguardando realocação" à coordenação e ao supervisor do estagiário, junto com o próximo inscrito elegível na fila de espera (CP3 — RF7).

A **realocação** da vaga a outro inscrito não é automática nem faz parte deste requisito: ela é confirmada pelo supervisor do estagiário ao vincular o novo paciente (RF21), depois de a coordenação distribuir o caso a esse supervisor, quando ainda não estiver distribuído (RF20). Conforme confirmado pela Clínica Escola, a vaga deve ser liberada em até uma semana após o desligamento; a liberação em até 5 segundos definida no RNF34 já atende a essa exigência com folga.

_Critérios de aceitação:_

- A confirmação do desligamento pela secretaria ou pela coordenação, para paciente com alerta de limite pendente (RF36), registra a decisão com data e responsável e muda o status para "desligado por faltas".
- Na mesma operação do desligamento, o vínculo com o estagiário é encerrado, as sessões futuras são canceladas e a vaga é sinalizada à coordenação e ao supervisor como "vaga liberada aguardando realocação", com o próximo inscrito elegível da fila (RF7).
- Nenhum inscrito é vinculado automaticamente à vaga liberada; ela só deixa de estar pendente quando o supervisor registra o novo vínculo (RF21).
- Paciente sem alerta de limite de faltas pendente não pode ser desligado por faltas.

_Rastreabilidade:_ Feature "Desligar paciente por faltas e liberar vaga" → CP9 — Controle de assiduidade e alertas → OE3/OE4. Dependência: RF36. Integração: CP3 — Fila de espera e consulta de posição (RF7); CP5 — Distribuição de casos (RF20, RF21), responsável pela realocação.

#### Feature — Reverter desligamento de paciente por faltas

**RF38 — Reverter desligamento de paciente por faltas**{ #rf38 }

O sistema deve permitir que um usuário com perfil de coordenação reverta um desligamento por faltas (RF37) registrado por engano, restaurando o status ativo do paciente e preservando o histórico de faltas e da decisão original de desligamento, agora marcada como revertida, com autor, data/hora e motivo da reversão. Conforme confirmado pela Clínica Escola, somente a coordenação analisa e decide cada caso de reversão — não é uma ação disponível à secretaria, ao estagiário ou ao supervisor. Caso a vaga do paciente já tenha sido realocada a outro inscrito da fila de espera (CP3) no momento da reversão, o sistema não deve remover a sessão ou o vínculo já criado para esse outro paciente; a reversão do desligamento original deve ser sinalizada à coordenação como pendente de tratamento manual da vaga (por exemplo, aguardar a próxima vaga disponível).

_Critérios de aceitação:_

- A reversão pela coordenação de desligamento cuja vaga ainda não foi realocada restaura o status ativo e o vínculo com o mesmo estagiário, retira a sinalização de vaga liberada e indica as sessões canceladas que precisam ser reagendadas (RF10).
- A reversão pela coordenação de desligamento cuja vaga já foi realocada preserva o vínculo do novo paciente e sinaliza a reversão como pendente de tratamento manual, sem revogar a vaga do novo paciente.
- Usuário sem perfil de coordenação não consegue reverter desligamento por faltas.
- Após a reversão, o registro original do desligamento e o da reversão continuam disponíveis para auditoria, cada um com autor, data/hora e motivo.

_Rastreabilidade:_ Feature "Reverter desligamento de paciente por faltas" → CP9 — Controle de assiduidade e alertas → OE3/OE4. Dependência: RF37.

#### Controle de faltas do estagiário

O escopo da CP9 também prevê o controle das faltas do estagiário, mencionado na Solução Proposta. Em resposta posterior à reunião de 26/08/2026, a Clínica Escola confirmou a regra de consequência: 3 faltas do estagiário reprovam o campo de estágio (RF40). As features abaixo separam quatro ações com regras distintas: a consulta das ausências do estagiário já registradas pela CP4 (RF16) pela supervisão (RF39), a contagem das faltas no semestre (RF40), a sinalização da reprovação ao atingir o limite (RF63) e o registro da decisão institucional da coordenação, que encerra a sinalização (RF64).

#### Feature — Consolidar faltas do estagiário para a supervisão

**RF39 — Consolidar faltas do estagiário para a supervisão**{ #rf39 }

O sistema deve permitir que o supervisor consulte, para os estagiários sob sua supervisão, a relação de sessões canceladas por ausência real do estagiário (RF16) em um período selecionado — excluindo os cancelamentos administrativos para remarcação (RF16), que não são falta. Esta consulta não aplica, por si só, contagem de limite ou consequência — a contagem cumulativa é tratada no RF40 e a sinalização de reprovação, no RF63.

_Critérios de aceitação:_

- A consulta do supervisor às faltas de estagiário sob sua supervisão lista as sessões canceladas por ausência real (RF16) no período escolhido, sem os cancelamentos administrativos para remarcação.
- Usuário sem vínculo de supervisão com o estagiário não acessa a relação de faltas.

_Rastreabilidade:_ Feature "Consolidar faltas do estagiário para a supervisão" → CP9 — Controle de assiduidade e alertas → OE3/OE4. Dependência: RF16 (CP4). Restrição transversal: CP12 — Segurança, sigilo e controle de acesso.

#### Feature — Contabilizar faltas do estagiário no semestre

**RF40 — Contabilizar faltas do estagiário no semestre**{ #rf40 }

O sistema deve manter, por estagiário e por semestre letivo, a contagem cumulativa de faltas do estagiário a sessões, incrementada a cada sessão cancelada por ausência real do estagiário (RF16) e exibida na relação consultada pela supervisão (RF39). Cancelamentos registrados como administrativos para remarcação (RF16), usados enquanto o RF12 ficar para uma entrega posterior, não incrementam essa contagem. A contagem recomeça do zero a cada semestre letivo e não é alterada pela sinalização de reprovação (RF63) nem pela decisão institucional (RF64); a correção de uma falta registrada por engano é feita no próprio registro de ausência da CP4, com autor, data/hora e motivo preservados.

_Critérios de aceitação:_

- Cada sessão cancelada por ausência real do estagiário (RF16) aumenta em uma unidade a contagem de faltas dele no semestre.
- Sessão cancelada como administrativa para remarcação (RF16) não altera a contagem de faltas do estagiário.
- No início de cada semestre letivo, a contagem do estagiário volta a zero, e a do semestre anterior fica preservada no histórico.
- Somente o supervisor do estagiário e a coordenação consultam a contagem de faltas dele.

_Rastreabilidade:_ Feature "Contabilizar faltas do estagiário no semestre" → CP9 — Controle de assiduidade e alertas → OE3/OE4. Dependência: RF16 (CP4), RF39.

#### Feature — Sinalizar reprovação do estagiário por faltas

**RF63 — Sinalizar reprovação do estagiário por faltas**{ #rf63 }

Quando a contagem de faltas do estagiário no semestre (RF40) atingir 3 faltas, o sistema deve sinalizar ao supervisor responsável e à coordenação que o estagiário atingiu o limite que reprova o campo de estágio, conforme confirmado pela Clínica Escola. A sinalização é gerada uma única vez por estagiário e semestre, e permanece visível a esses dois perfis até que a coordenação registre a decisão institucional sobre o caso (RF64); faltas adicionais no mesmo semestre não geram nova sinalização, apenas atualizam a contagem exibida.

_Critérios de aceitação:_

- Quando a terceira falta do semestre é contabilizada (RF40), a sinalização de reprovação aparece para o supervisor responsável e para a coordenação.
- A sinalização de reprovação continua visível ao supervisor e à coordenação enquanto não houver decisão registrada.
- Faltas além da terceira no mesmo semestre não criam nova sinalização.
- Somente o supervisor do estagiário e a coordenação visualizam a sinalização de reprovação.

_Rastreabilidade:_ Feature "Sinalizar reprovação do estagiário por faltas" → CP9 — Controle de assiduidade e alertas → OE3/OE4. Dependência: RF40.

#### Feature — Registrar decisão institucional sobre a reprovação do estagiário

**RF64 — Registrar decisão institucional sobre a reprovação do estagiário**{ #rf64 }

O sistema deve permitir que a coordenação registre a decisão institucional sobre uma sinalização de reprovação (RF63), escolhendo entre "reprovação confirmada" e "reprovação não aplicada", com justificativa obrigatória em ambos os casos. O registro guarda o autor e a data/hora, encerra a sinalização e não altera a contagem de faltas (RF40). O sistema apenas registra a decisão tomada pela coordenação; os efeitos acadêmicos da reprovação e a eventual desativação do acesso do estagiário (RF54) são tratados fora deste requisito.

_Critérios de aceitação:_

- O registro da decisão pela coordenação, com justificativa, guarda a decisão, a justificativa, o autor e a data/hora, e encerra a sinalização.
- A decisão não pode ser registrada sem justificativa.
- Usuário sem perfil de coordenação não consegue registrar a decisão.
- A sinalização encerrada e a decisão continuam disponíveis no histórico do estagiário para o supervisor e a coordenação.

_Rastreabilidade:_ Feature "Registrar decisão institucional sobre a reprovação do estagiário" → CP9 — Controle de assiduidade e alertas → OE3/OE4. Dependência: RF63.

#### Modelo de domínio da CP9

- **Falta do paciente:** evento vinculado a uma sessão, originado por não comparecimento (RF34) ou por cancelamento fora do prazo (RF15); contribui para a contagem de faltas do paciente no ciclo (RF35). A ausência de confirmação (RF14) não gera falta.
- **Contagem de faltas do paciente:** estado cumulativo por paciente e ciclo de atendimento, incrementado por falta e nunca zerado dentro do ciclo; ao atingir duas unidades, consecutivas ou não, dispara o alerta (RF36) e habilita o desligamento (RF37).
- **Vaga liberada:** gerada pelo desligamento (RF37); permanece pendente até o supervisor vincular um novo paciente ao estagiário (RF21).
- **Falta do estagiário:** evento vinculado a uma sessão cancelada por ausência do estagiário (RF16); consultado pela supervisão (RF39) e contabilizado por semestre (RF40).
- **Sinalização de reprovação:** gerada ao atingir 3 faltas do estagiário no semestre (RF63); encerrada pela decisão institucional da coordenação (RF64), que guarda o resultado, a justificativa, o autor e a data/hora.

### Registros administrativos do atendimento (CP10)

A CP10 foi decomposta em sete features, organizadas em dois conjuntos que reúnem as antigas características declaradas separadamente como "Registro da Contribuição Social" e "Emissão de Declaração de Comparecimento", agrupadas em uma única CP10 — Registros administrativos do atendimento, conforme a [Solução Proposta, §2.3](../../unidade-1/solucao-proposta.md#23-caracteristicas-de-produto-mapeadas-com-os-objetivos-especificos): (i) o registro do pagamento da taxa única de responsabilidade social de R$ 35,00, devida na primeira sessão, distinguindo quem efetivou e quem não efetivou o pagamento; e (ii) a emissão automática da declaração de comparecimento do paciente, com data, horário e nome do estagiário responsável.

#### Contribuição social

O controle da taxa é feito hoje à mão ([ata de 26/08/2026](../../unidade-1/reunioes.md)). As features deste conjunto permitem registrar o pagamento e distinguir quem efetivou e quem não efetivou a contribuição, inclusive no momento da primeira sessão, quando a taxa é exigida. O registro dos pagamentos é de responsabilidade da **secretaria**, e a consulta também pode ser feita pela **coordenação**. O estagiário responsável vê apenas a situação (efetivada ou pendente) dos pacientes vinculados a ele, conforme os perfis definidos na CP12.

#### Feature — Registrar pagamento da contribuição social do paciente [#43](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/43)

**RF41 — Registrar pagamento da contribuição social do paciente**{ #rf41 }

- O sistema deve permitir que um usuário com perfil de secretaria registre o pagamento da contribuição social de um paciente, informando a data do pagamento e a forma de pagamento (dinheiro, Pix ou cartão, conforme confirmado pela Clínica Escola — a cobrança em si é feita pela secretaria por fora do sistema; o sistema apenas registra o pagamento já efetivado, sem processar ou transitar valores).
- O valor é um parâmetro institucional "valor da contribuição social", configurável exclusivamente pela coordenação, com padrão de R$ 35,00; a secretaria não altera o valor no momento do registro, apenas confirma o pagamento do valor vigente no parâmetro.
- Toda alteração do parâmetro pela coordenação deve ser registrada com o valor anterior, o novo valor, o autor e a data/hora, e passa a valer somente para pagamentos registrados a partir dela, sem alterar pagamentos já efetivados.
- Cada paciente pode ter apenas um pagamento de contribuição social registrado por ciclo de atendimento, já que a taxa é semestral: conforme confirmado pela Clínica Escola, ela é cobrada uma vez por semestre e volta a ser devida caso o paciente se inscreva novamente em outro semestre.
- Não há isenção da taxa para pacientes sem condição de pagar.
- Para este requisito, **ciclo de atendimento** é o período de acompanhamento de um paciente que vai da primeira sessão até o encerramento do atendimento (conclusão das sessões com o relatório final, desligamento por faltas ou desistência) dentro do mesmo semestre.

_Critérios de aceitação:_

- O registro do pagamento pela secretaria, com data e forma de pagamento, marca a contribuição como **efetivada** e guarda o valor vigente no parâmetro, a data, a forma de pagamento, quem registrou e a data/hora do registro.
- Um segundo pagamento no mesmo ciclo é bloqueado, informando a data do pagamento já registrado.
- Usuário sem perfil de secretaria não consegue registrar pagamento.
- A alteração do parâmetro "valor da contribuição social" (padrão de R$ 35,00) pela coordenação registra valor anterior, novo valor, autor e data/hora, e o novo valor vale só para pagamentos registrados depois dela.
- Usuário sem perfil de coordenação não consegue alterar o valor da contribuição.

_Rastreabilidade:_ Feature "Registrar pagamento da contribuição social do paciente" → CP10 — Registros administrativos do atendimento → OE6/OE4.

#### Feature — Consultar situação da contribuição social dos pacientes [#44](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/44)

**RF42 — Consultar situação da contribuição social dos pacientes**{ #rf42 }

O sistema deve permitir que usuários com perfil de secretaria ou de coordenação consultem a situação da contribuição social dos pacientes em atendimento, com filtro por situação (**efetivada** ou **pendente**). Para cada paciente, a consulta deve mostrar o nome, a situação, a data da primeira sessão e, quando efetivada, a data do pagamento. O estagiário também pode consultar a contribuição social, mas apenas dos pacientes vinculados a ele (RF21) e apenas a situação (efetivada ou pendente), sem a forma de pagamento nem os dados de outros pacientes. A situação também deve ser indicada na agenda do dia, junto à primeira sessão do paciente, para que a pendência seja percebida no momento em que a taxa é exigida. A partir da 2ª sessão do paciente, a pendência deixa de ser apenas informativa e passa a bloquear o agendamento, conforme o RF43.

_Critérios de aceitação:_

- O filtro "pendente" lista apenas os pacientes sem pagamento registrado no ciclo atual.
- Após o registro do pagamento (RF41), o paciente aparece como "efetivada", com a data do pagamento.
- Na agenda do dia, a 1ª sessão de paciente com contribuição pendente exibe a indicação "contribuição pendente", que some assim que o pagamento é registrado. Como confirmado pela Clínica Escola, na 1ª sessão a indicação é apenas informativa; a partir da 2ª, a pendência bloqueia o agendamento (RF43).
- O estagiário vê, para seus pacientes, apenas a situação da contribuição (efetivada ou pendente), sem a forma de pagamento e sem dados de outros pacientes.

_Rastreabilidade:_ Feature "Consultar situação da contribuição social dos pacientes" → CP10 — Registros administrativos do atendimento → OE6/OE4. A indicação na agenda depende do agendamento da CP4.

#### Feature — Bloquear agendamento por contribuição social pendente

**RF43 — Bloquear agendamento por contribuição social pendente**{ #rf43 }

O sistema deve impedir o agendamento (RF10) da 2ª sessão em diante de um paciente cuja contribuição social do ciclo de atendimento atual (RF41) ainda esteja pendente. A 1ª sessão do paciente não deve ser bloqueada por essa razão — a taxa é exigida a partir dela, mas o bloqueio só passa a valer da 2ª sessão em diante, conforme confirmado pela Clínica Escola. Como não existe isenção da taxa, o bloqueio se aplica a todos os pacientes sem exceção.

_Critérios de aceitação:_

- O agendamento da 1ª sessão do ciclo nunca é bloqueado pela contribuição social.
- Com contribuição pendente e ao menos uma sessão já realizada no ciclo, o agendamento de nova sessão é bloqueado, informando o motivo (contribuição pendente).
- Após o registro da contribuição como efetivada (RF41), o agendamento antes bloqueado passa a ser permitido.

_Rastreabilidade:_ Feature "Bloquear agendamento por contribuição social pendente" → CP10 — Registros administrativos do atendimento; restrição sobre a feature "Agendar sessão do paciente" (RF10, CP4). Dependência: RF41, RF42.

#### Declaração de comparecimento

Este conjunto reúne quatro features que permitem que a secretaria ou o próprio paciente/responsável obtenham a declaração de comparecimento às sessões, contendo data, horário e nome do estagiário que realizou o atendimento, e validem sua autenticidade. O objetivo é atender de imediato uma demanda recorrente dos pacientes, sem trabalho manual da secretaria. A feature de emissão consolidada por período, antes cogitada como quinta feature, foi retirada da lista: a Clínica Escola confirmou que essa necessidade já é atendida pelo relatório final de atendimento (CP8).

#### Feature — Listar sessões com comparecimento registrado do paciente

**RF44 — Listar sessões com comparecimento registrado do paciente**{ #rf44 }

O sistema deve listar, para um usuário com perfil autorizado (secretaria) ou para o próprio paciente/responsável, após verificação de identidade (RF52, CP12) — já que esse público não possui conta nem senha —, as sessões do paciente nas quais a presença foi registrada, para que o usuário escolha a sessão a declarar. Quando não houver sessão elegível, o sistema deve informar isso de forma clara, sem exibir erro técnico.

_Critérios de aceitação:_

- A lista de sessões elegíveis mostra somente sessões com presença registrada, com data, horário e nome do estagiário.
- Paciente ou responsável com identidade verificada (RF52) vê somente as próprias sessões.
- Paciente sem sessão com presença registrada recebe o aviso de que não há sessões disponíveis para declaração.

_Rastreabilidade:_ Feature "Listar sessões com comparecimento registrado do paciente" → CP10 — Registros administrativos do atendimento → OE6/OE5. Dependência: RF52 (CP12).

#### Feature — Emitir declaração de comparecimento do paciente

**RF45 — Emitir declaração de comparecimento do paciente**{ #rf45 }

- O sistema deve gerar automaticamente a declaração de comparecimento para a sessão selecionada (RF44), contendo, no mínimo, a data, o horário e o nome do estagiário que realizou o atendimento, em formato pronto para impressão, já que, conforme confirmado pela Clínica Escola, a entrega ao paciente é impressa (o documento pode ser gerado e pré-visualizado em tela antes da impressão, mas a entrega em si não deve ser feita por download ou e-mail).
- A emissão só é permitida para sessão com presença registrada; sessões com falta ou cancelamento não geram declaração.
- A declaração não deve conter informação clínica (queixa, prioridade, diagnóstico, evolução), preservando o sigilo do atendimento, e pode indicar que o atendimento é de natureza psicológica, sem necessidade de texto neutro.
- Para paciente menor de idade, a retirada da declaração pelo responsável legal exige que a Autorização para Acompanhamento Psicoterapêutico de Crianças e Adolescentes, assinada presencialmente, já esteja preenchida; sem essa autorização, a declaração não deve ser emitida para o responsável.
- Toda emissão deve ser registrada para fins de auditoria (usuário, data/hora e sessão de origem).
- Além de data, horário e nome do estagiário, o documento deve conter a assinatura e o carimbo do psicólogo responsável e o número de CRP, conforme o modelo fornecido pela Clínica Escola.

_Critérios de aceitação:_

- A emissão para sessão com presença registrada, solicitada pela secretaria ou pelo paciente/responsável, gera o documento com data, horário e nome do estagiário conforme o registro da sessão, e registra a emissão para auditoria.
- Sessão sem presença registrada (falta ou cancelamento) não gera declaração; o motivo é informado.
- Usuário sem permissão para a sessão não emite a declaração, e a tentativa é registrada.
- Paciente ou responsável com identidade verificada (RF52) não emite declaração de sessão de outro paciente.
- O documento, em pré-visualização ou impresso, contém a assinatura e o carimbo do psicólogo responsável e o número de CRP, além da data, do horário e do nome do estagiário.
- Para paciente menor de idade sem a Autorização para Acompanhamento Psicoterapêutico de Crianças e Adolescentes preenchida, a emissão é bloqueada e a pendência é informada.
- Para paciente menor de idade com a autorização preenchida, o responsável legal emite a declaração normalmente.
- O documento só pode ser visualizado em tela e impresso, sem download nem envio por e-mail.

_Rastreabilidade:_ Feature "Emitir declaração de comparecimento do paciente" → CP10 — Registros administrativos do atendimento → OE6/OE5. Dependência: RF52 (CP12).


#### Feature — Reemitir declaração de comparecimento

**RF46 — Reemitir declaração de comparecimento**{ #rf46 }

O sistema deve permitir gerar novamente uma declaração já emitida (por exemplo, em caso de perda do documento), mantendo o conteúdo consistente com o registro da sessão, a menos que esse registro tenha sido corrigido desde a emissão original. Cada reemissão deve ser registrada para auditoria, distinguindo-se da emissão original.

_Critério de aceitação:_ A reemissão gera o documento com o mesmo conteúdo da emissão original (salvo correção do registro) e fica registrada vinculada a ela.

_Rastreabilidade:_ Feature "Reemitir declaração de comparecimento" → CP10 — Registros administrativos do atendimento → OE6/OE5.

#### Feature — Validar autenticidade da declaração

**RF47 — Validar autenticidade da declaração**{ #rf47 }

O sistema deve permitir que um terceiro (por exemplo, empregador ou escola) confirme que uma declaração apresentada foi emitida pela Clínica Escola FBr, por meio de um código único de verificação impresso no documento. Para um código válido correspondente a uma declaração vigente (não revogada por correção do registro de origem), a consulta deve retornar exatamente: a confirmação de autenticidade, o nome do paciente, a data e o horário da sessão e o nome do estagiário — os mesmos dados já impressos na própria declaração, sem qualquer informação clínica. Para um código inexistente ou digitado incorretamente, a consulta deve retornar apenas uma mensagem genérica de código inválido, sem indicar o motivo específico. Para um código de uma declaração cujo registro de origem foi corrigido após a emissão (RF45/RF46), a consulta deve informar que o documento não corresponde mais ao registro vigente, sem exibir os dados desatualizados.

_Critérios de aceitação:_

- Código de verificação válido e vigente retorna a confirmação de autenticidade, o nome do paciente, a data e o horário da sessão e o nome do estagiário, sem dado clínico.
- Código inexistente retorna apenas uma mensagem genérica de código inválido.
- Código de declaração cujo registro de origem foi corrigido após a emissão informa que o documento não corresponde mais ao registro vigente, sem exibir os dados anteriores.

_Rastreabilidade:_ Feature "Validar autenticidade da declaração" → CP10 — Registros administrativos do atendimento → OE6/OE5.

### Indicadores e Relatórios Institucionais (CP11)

A CP11 foi decomposta em duas features: consulta em tela dos indicadores operacionais e exportação desses indicadores como relatório institucional em PDF, exigido pelo CRP e pelo MEC. As duas features são de uso exclusivo do perfil **coordenação** (o único perfil de acesso, entre os definidos na CP12, com visão consolidada sobre toda a operação).

#### Feature — Consultar indicadores operacionais [#22](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/22)

**RF48 — Consultar indicadores operacionais**{ #rf48 }

O sistema deve permitir que um usuário com perfil de coordenação consulte, para um intervalo de datas selecionado (data inicial e data final, com a data final igual ou anterior à data da consulta), os quatro indicadores operacionais abaixo. Os indicadores são de dois tipos, conforme a referência temporal:

- **Indicadores de posição** (1 e 4): retratam a situação em um único instante, a **data de referência**, que é o fim do dia da data final do intervalo; quando a data final é o dia da consulta, a data de referência é o momento da consulta.
- **Indicadores de fluxo** (2 e 3): consideram os eventos ocorridos em todo o intervalo, da data inicial à data final, inclusive.

Considera-se **paciente em atendimento ativo** em uma data aquele que, nessa data, possui vínculo vigente com um estagiário (CP5) e não foi desligado nem teve o atendimento encerrado.

1. **Vagas ocupadas** (posição) — quantidade de pacientes em atendimento ativo na data de referência, apresentada em relação ao total de vagas ofertadas no semestre que contém a data de referência (ex.: 82 de 100 vagas, 82,0%).
    - O total de vagas ofertadas é a capacidade de atendimento registrada pela coordenação para o semestre (RF9); se não houver capacidade registrada, o sistema deve exibir apenas a quantidade de vagas ocupadas e informar que o total ofertado não foi registrado, sem estimar o valor.
2. **Tempo médio de espera** (fluxo) — média aritmética, em dias corridos e com uma casa decimal, da diferença entre a data da primeira sessão realizada do paciente e a data da sua inscrição (RF1/RF3), considerando apenas os pacientes cuja primeira sessão realizada ocorreu dentro do intervalo.
3. **Taxa de evasão** (fluxo) — percentual, com uma casa decimal, obtido pela divisão entre (a) a quantidade de pacientes desligados por faltas (RF37) com data de desligamento dentro do intervalo, excluídos os desligamentos revertidos (RF38), e (b) a quantidade de pacientes que estiveram em atendimento ativo em pelo menos um dia do intervalo, multiplicada por 100.
4. **Distribuição de casos por supervisor** (posição) — para cada supervisor ativo, a quantidade de pacientes em atendimento ativo sob sua responsabilidade na data de referência, incluindo supervisores com zero casos.

_Critérios de aceitação:_

- Na consulta de 01/08 a 31/08 feita em 15/09, "vagas ocupadas" e "distribuição de casos por supervisor" refletem a situação ao fim de 31/08, e "tempo médio de espera" e "taxa de evasão" consideram os eventos de 01/08 a 31/08.
- Com data final igual ao dia da consulta, os indicadores de posição refletem a situação no momento da consulta.
- Paciente desligado por faltas em 10/08 e com desligamento revertido em 12/08 não entra no numerador da taxa de evasão de agosto.
- Indicador sem registros no intervalo, ou com divisão de denominador zero, é exibido como zero, nunca omitido ou em branco.
- Intervalo com data final posterior à data da consulta, ou com data inicial posterior à final, é recusado e o motivo é informado.

_Rastreabilidade:_ Feature "Consultar indicadores operacionais" → CP11 — Indicadores e relatórios institucionais. Dependência: RF9 (CP3), RF37 e RF38 (CP9), CP5.

#### Feature — Exportar relatório institucional em PDF [#23](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/23)

**RF49 — Exportar relatório institucional em PDF**{ #rf49 }

A apresentação em tela dos indicadores é responsabilidade exclusiva do RF48; este requisito trata apenas da exportação. O sistema deve permitir que um usuário com perfil de coordenação, a partir de uma consulta de indicadores já exibida (RF48), exporte o relatório institucional em arquivo PDF para envio à FBr, ao CRP ou ao MEC, ou para impressão. O arquivo deve conter os quatro indicadores do RF48 com os mesmos valores exibidos em tela, o intervalo de datas e a data de referência utilizados, a data e hora da exportação e o nome do usuário que a realizou.

_Critérios de aceitação:_

- A exportação de uma consulta de indicadores gera um PDF para download imediato com os mesmos valores da tela, o intervalo, a data de referência, a data/hora da exportação e o usuário responsável.
- Se o total de vagas ofertadas não foi registrado (RF48), o PDF reproduz o mesmo aviso exibido em tela.
- Usuário sem perfil de coordenação não consegue exportar o relatório.

_Rastreabilidade:_ Feature "Exportar relatório institucional em PDF" → CP11 — Indicadores e relatórios institucionais. Dependência: RF48.

### Segurança, Sigilo e Controle de Acesso (CP12)

A CP12 foi decomposta em nove features, organizadas em três conjuntos: autenticação, controle de acesso por perfil e proteção de dados. Elas respondem à restrição mais crítica apontada pelo cliente, o sigilo das informações psicológicas ([Seção 1.5](../../unidade-1/cenario-atual.md#15-desafios-do-projeto)), e atendem à LGPD e às normas do Conselho Federal de Psicologia (CFP).

Os perfis de acesso são cinco: **paciente**, **secretaria**, **estagiário**, **supervisor** e **coordenação**. Os quatro perfis institucionais acessam o sistema com e-mail e senha. O paciente (ou seu responsável legal) não possui conta nem senha, já que parte do público tem pouca familiaridade com tecnologia: as páginas públicas, como a inscrição, não exigem identificação, e o acesso às informações do próprio paciente (posição na fila da CP3 e declarações da CP10) é liberado por uma verificação de identidade feita a cada consulta.

#### Feature — Autenticar usuário institucional [#45](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/45)

**RF50 — Autenticar usuário institucional**{ #rf50 }

O sistema deve permitir que usuários institucionais (secretaria, estagiário, supervisor e coordenação) acessem o sistema informando e-mail e senha. Após a autenticação, o sistema deve apresentar somente as funcionalidades permitidas para o perfil do usuário.

_Critérios de aceitação:_

- Usuário ativo com e-mail e senha corretos é autenticado e vê apenas as funcionalidades do seu perfil.
- E-mail ou senha incorretos negam o acesso com mensagem genérica, sem indicar qual campo está errado.
- Usuário desativado (RF54) não consegue entrar com as credenciais antigas.

_Rastreabilidade:_ Feature "Autenticar usuário institucional" → CP12 — Segurança, sigilo e controle de acesso → OE7/OE5.

#### Feature — Encerrar sessão do usuário [#46](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/46)

**RF51 — Encerrar sessão do usuário**{ #rf51 }

O sistema deve permitir que o usuário autenticado encerre a própria sessão a qualquer momento, exigindo nova autenticação para voltar a acessar as funcionalidades internas. O encerramento automático por inatividade é tratado no RNF50.

_Critério de aceitação:_ Ao sair, a sessão é encerrada e qualquer página interna, inclusive pelo botão "voltar" do navegador, exige nova autenticação.

_Rastreabilidade:_ Feature "Encerrar sessão do usuário" → CP12 — Segurança, sigilo e controle de acesso → OE7.

#### Feature — Verificar identidade do paciente ou responsável [#47](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/47)

**RF52 — Verificar identidade do paciente ou responsável**{ #rf52 }

O sistema deve exigir que o paciente, ou o responsável legal no caso de crianças e adolescentes, confirme sua identidade antes de acessar as informações do próprio paciente (posição na fila da CP3 e declarações de comparecimento da CP10). A confirmação é feita informando o CPF ou o número de inscrição e, em seguida, um código de uso único enviado ao canal de contato preferencial (telefone ou e-mail) cadastrado na inscrição (RF1). Conhecer apenas o CPF ou o número de inscrição não deve ser suficiente para acessar as informações.

O código segue as regras abaixo:

- **Formato e validade:** 6 dígitos numéricos, válido por 10 minutos a partir do envio e aceito uma única vez.
- **Tentativas:** até 5 tentativas incorretas por código; na quinta tentativa incorreta, o código é invalidado e é preciso solicitar um novo.
- **Reenvio:** um novo código pode ser solicitado 60 segundos após o envio anterior; o novo código invalida o anterior.
- **Bloqueio contra abuso:** no máximo 3 códigos enviados por CPF ou número de inscrição em 60 minutos; ao atingir esse limite, novas solicitações para o mesmo identificador ficam bloqueadas por 60 minutos.
- **Mensagens:** as respostas a CPF ou número de inscrição inexistente, código incorreto, expirado ou bloqueado devem ser genéricas, sem confirmar se a inscrição existe.

_Critérios de aceitação:_

- O CPF ou o número de inscrição, junto com o código recebido no contato cadastrado e informado em até 10 minutos, libera acesso apenas às informações desse paciente.
- Sem código, ou com código incorreto ou expirado, nenhuma informação da inscrição é exibida, nem a existência dela é confirmada.
- Código já utilizado é recusado.
- Na quinta tentativa incorreta, o código é invalidado e nem o código correto passa a ser aceito.
- Novo código pedido menos de 60 segundos após o anterior é recusado, informando o tempo restante.
- Depois de 3 códigos enviados ao mesmo CPF em 60 minutos, um quarto pedido é recusado e o bloqueio dura 60 minutos.

_Rastreabilidade:_ Feature "Verificar identidade do paciente ou responsável" → CP12 — Segurança, sigilo e controle de acesso → OE7/OE1. Atende à verificação de acesso exigida pela feature "Consultar posição individual na fila" (CP3) e pelas features de declaração da CP10.

#### Feature — Cadastrar usuário institucional com perfil de acesso [#48](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/48)

**RF53 — Cadastrar usuário institucional com perfil de acesso**{ #rf53 }

O sistema deve permitir que um usuário com perfil de coordenação cadastre usuários institucionais, informando nome, e-mail e exatamente um perfil de acesso (secretaria, estagiário, supervisor ou coordenação). A coordenação não define nem visualiza a senha do novo usuário. O acesso é ativado por convite:

1. **Convite:** ao concluir o cadastro, o sistema cria o usuário com a situação "pendente de ativação" e envia ao e-mail informado um link de ativação, de uso único e válido por 72 horas.
2. **Ativação e senha inicial:** ao abrir o link, o próprio usuário define sua senha, que deve atender às regras do RNF49; a conta passa a "ativa" e o link deixa de valer.
3. **Reenvio:** enquanto o usuário estiver pendente, a coordenação pode reenviar o convite, o que gera um novo link e invalida o anterior.

Um usuário pendente de ativação não consegue se autenticar (RF50).

_Critérios de aceitação:_

- O cadastro de usuário pela coordenação, com nome, e-mail e perfil, cria a conta como "pendente de ativação" e envia o convite ao e-mail informado.
- Ao abrir o convite válido e definir senha conforme o RNF49, a conta passa a "ativa" e o usuário consegue entrar pelo RF50.
- Link de ativação já usado ou com mais de 72 horas é recusado, com orientação para pedir novo convite à coordenação.
- O reenvio do convite a usuário pendente invalida o link anterior.
- E-mail já cadastrado não pode ser cadastrado de novo.
- Usuário sem perfil de coordenação não consegue cadastrar usuários.

_Rastreabilidade:_ Feature "Cadastrar usuário institucional com perfil de acesso" → CP12 — Segurança, sigilo e controle de acesso → OE7/OE5.

#### Feature — Desativar usuário institucional [#49](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/49)

**RF54 — Desativar usuário institucional**{ #rf54 }

O sistema deve permitir que um usuário com perfil de coordenação desative um usuário institucional, bloqueando seu acesso sem apagar o histórico de registros feitos por ele. Como os estagiários mudam a cada semestre, a desativação é o meio de retirar o acesso de quem concluiu o estágio.

_Critérios de aceitação:_

- A desativação de um estagiário pela coordenação corta o acesso imediatamente, inclusive com sessão aberta.
- Os registros anteriores de usuário desativado continuam disponíveis a usuários autorizados, identificados com o nome de quem os fez.
- Usuário sem perfil de coordenação não consegue desativar usuários.

_Rastreabilidade:_ Feature "Desativar usuário institucional" → CP12 — Segurança, sigilo e controle de acesso → OE7/OE5.

#### Feature — Restringir acesso ao prontuário do paciente [#50](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/50)

**RF55 — Restringir acesso ao prontuário do paciente**{ #rf55 }

O sistema deve permitir o acesso ao prontuário de um paciente (CP6), que reúne os registros de evolução (CP7) e o relatório final (CP8), somente ao estagiário responsável pelo paciente e ao supervisor desse estagiário, conforme o vínculo definido na CP5. Os perfis de secretaria e de coordenação não devem ter acesso ao conteúdo clínico do prontuário, apenas aos dados cadastrais e administrativos do paciente. A regra não prevê exceções por perfil, conforme a definição da CP12 aprovada na [Seção 2.3](../../unidade-1/solucao-proposta.md#23-caracteristicas-de-produto-mapeadas-com-os-objetivos-especificos), que restringe o prontuário ao estagiário responsável e ao seu supervisor.

_Critérios de aceitação:_

- O estagiário responsável pelo paciente e seu supervisor veem o conteúdo clínico do prontuário.
- Estagiário que não é responsável pelo paciente tem o acesso ao prontuário negado, inclusive em requisição feita direto ao servidor, sem passar pela interface.
- Secretaria e coordenação veem os dados cadastrais e administrativos do paciente, mas não os registros de evolução nem o relatório final.
- Concluída a transferência do estagiário A para o estagiário C, C passa a acessar o prontuário e A perde o acesso.

_Rastreabilidade:_ Feature "Restringir acesso ao prontuário do paciente" → CP12 — Segurança, sigilo e controle de acesso → OE7/OE5. Depende do vínculo entre paciente, estagiário e supervisor (CP5), do prontuário (CP6), dos registros de evolução (CP7) e do relatório final (CP8).

#### Feature — Consultar registro de acessos ao prontuário [#51](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/51)

**RF56 — Consultar registro de acessos ao prontuário**{ #rf56 }

O sistema deve permitir que um usuário com perfil de coordenação consulte o registro de acessos ao prontuário de um paciente, informando, para cada acesso, o usuário, o perfil, a data/hora e a operação realizada (visualização, criação ou alteração), com filtro por paciente, por usuário e por período. A consulta mostra quem acessou, mas não o conteúdo clínico acessado.

_Critérios de aceitação:_

- Cada visualização do prontuário gera uma entrada no registro de acessos com nome, perfil, data/hora e a operação "visualização", consultável pela coordenação.
- Tentativas negadas pelo RF55 aparecem no registro identificadas como "acesso negado".
- Usuário sem perfil de coordenação não consulta o registro de acessos.

_Rastreabilidade:_ Feature "Consultar registro de acessos ao prontuário" → CP12 — Segurança, sigilo e controle de acesso → OE7.

#### Feature — Registrar consentimento para tratamento de dados [#52](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/52)

**RF57 — Registrar consentimento para tratamento de dados**{ #rf57 }

O sistema deve apresentar, antes da conclusão da inscrição (CP1), um termo que informe, em linguagem simples, quais dados pessoais e de saúde são coletados, para que finalidade, quem terá acesso a eles, por quanto tempo serão guardados e como o consentimento pode ser revogado (RF65), e deve exigir a concordância do interessado para concluir a inscrição. Para crianças e adolescentes, a concordância deve ser dada pelo responsável legal (LGPD, art. 14). O sistema deve registrar a versão do termo aceita e a data/hora do aceite. O texto do termo é aprovado pela FBr; cada nova versão aprovada passa a valer para as inscrições seguintes, sem alterar o registro dos aceites anteriores.

**Base legal (pendente de validação com a FBr).** A LGPD admite duas bases legais para o tratamento de dados de saúde neste contexto: o consentimento específico e destacado do titular (art. 11, I) ou a tutela da saúde em procedimento realizado por profissionais de saúde (art. 11, II, "f"). A definição cabe à FBr, como controladora dos dados. Até essa validação, o sistema adota o cenário mais restritivo: trata o aceite como consentimento específico e destacado e permite a sua revogação (RF65). Os demais direitos do titular previstos no art. 18 da LGPD (confirmação, acesso, correção, informação sobre compartilhamento etc.) serão atendidos pelo canal institucional da FBr e ficam fora do escopo atual do sistema, até que a FBr indique quais deles devem ser atendidos pela ferramenta.

_Critérios de aceitação:_

- A inscrição não pode ser concluída sem o aceite do termo, e o sistema indica que o aceite é necessário.
- A inscrição concluída guarda a versão do termo aceito e a data/hora do aceite.
- Na inscrição de menor de idade, o termo pede a identificação e a concordância do responsável legal.
- O termo informa o prazo de guarda dos dados e como solicitar a revogação do consentimento.

O aceite on-line não substitui a autorização e o termo de responsabilidade assinados presencialmente pelo responsável legal, que continuam exigidos pela clínica para o atendimento de crianças e adolescentes ([ata de 26/08/2026](../../unidade-1/reunioes.md)).

_Rastreabilidade:_ Feature "Registrar consentimento para tratamento de dados" → CP12 — Segurança, sigilo e controle de acesso → OE7. Complementa a feature "Registrar solicitação de atendimento on-line" da CP1.

#### Feature — Registrar revogação do consentimento

**RF65 — Registrar revogação do consentimento**{ #rf65 }

O sistema deve permitir que a secretaria registre a revogação do consentimento (RF57) a pedido do titular, ou do responsável legal no caso de crianças e adolescentes, depois de confirmar a identidade do solicitante presencialmente, com documento, ou pela verificação do RF52. A revogação é gratuita e pode ser pedida a qualquer momento (LGPD, art. 8º, § 5º). O registro guarda a data/hora, a versão do termo revogada, o usuário que registrou e a forma de verificação da identidade, e não apaga o registro do aceite original.

Os efeitos da revogação são:

- **Inscrição ainda na fila de espera:** a inscrição sai da fila, com a situação "cancelada por revogação do consentimento", e as posições dos demais inscritos são recalculadas (RF7).
- **Paciente em atendimento:** o sistema bloqueia novos agendamentos e sinaliza a revogação ao supervisor e à coordenação, para que conduzam o encerramento do atendimento, que é uma decisão clínica tomada fora do sistema.
- **Em ambos os casos:** o sistema deixa de enviar lembretes e outras comunicações ao titular, e os dados deixam de ser usados para novas finalidades.
- **Retenção:** os registros já produzidos (inscrição, prontuário, sessões e trilhas de auditoria) não são apagados pela revogação. Eles ficam guardados pelo prazo mínimo de 5 anos exigido para o registro documental do psicólogo (Resolução CFP nº 1/2009), conforme a conservação para cumprimento de obrigação legal ou regulatória prevista na LGPD (art. 16, I), com o acesso restrito definido no RF55. A eliminação após esse prazo segue a política de retenção da FBr e está fora do escopo atual.

Uma nova inscrição do mesmo titular exige um novo aceite (RF57).

_Critérios de aceitação:_

- A revogação registrada pela secretaria, após verificar a identidade de um inscrito na fila, retira a inscrição da fila com a situação "cancelada por revogação do consentimento", guardando data/hora, versão do termo, autor e forma de verificação.
- Para paciente em atendimento, a revogação bloqueia novos agendamentos, suspende os lembretes e é sinalizada ao supervisor e à coordenação.
- Após a revogação, o aceite original, a revogação e os registros clínicos já produzidos continuam disponíveis no histórico a usuários autorizados, respeitando o RF55.
- A revogação não pode ser concluída sem a verificação de identidade da pessoa.
- Usuário sem perfil de secretaria não consegue registrar a revogação.

_Rastreabilidade:_ Feature "Registrar revogação do consentimento" → CP12 — Segurança, sigilo e controle de acesso → OE7. Dependência: RF57, RF52; integração: RF7 (CP3), RF10 e RF13 (CP4), RF55.

### Continuidade de casos entre semestres (CP13)

A CP13 foi decomposta em três features, que organizam a transferência de um caso e de seu histórico clínico quando o estagiário responsável conclui o estágio, preservando a continuidade do acompanhamento do paciente nos semestres seguintes, conforme a [Solução Proposta, §2.3](../../unidade-1/solucao-proposta.md#23-caracteristicas-de-produto-mapeadas-com-os-objetivos-especificos).

Diferentemente da transferência de caso já prevista na CP5 (RF25 — Transferir caso para outro estagiário ou supervisor), que trata de uma reorganização pontual e a qualquer momento do semestre, a CP13 trata do processo estruturado de virada de semestre: identificar, para cada estagiário que está concluindo o estágio, os casos ativos sob sua responsabilidade, registrar a decisão de continuidade (ou de encerramento) de cada um e, quando aplicável, efetivar a transferência para o novo estagiário responsável, reaproveitando o mecanismo do RF25. Para tornar esse fluxo verificável, os requisitos abaixo adotam datas configuradas por semestre e confirmação explícita da coordenação; a CP permanece como visão de produto de mais longo prazo, fora do MVP e do escopo desejável imediato, confirmado pelo recorte técnico de MVP em [10.2.3](backlog.md#1023-definicao-do-mvp) (RF58, RF59 e RF60 fora do MVP).

#### Feature — Listar casos elegíveis para continuidade entre semestres

**RF58 — Listar casos elegíveis para continuidade entre semestres**{ #rf58 }

O sistema deve permitir que a coordenação configure, para cada semestre, a data de encerramento e a data de início do planejamento de continuidade, além de marcar os estagiários cujo vínculo terminará no encerramento. A partir da data de início configurada, o sistema deve listar os casos ativos desses estagiários para apoiar o planejamento da continuidade do acompanhamento. Essa marcação representa um desligamento futuro planejado e não desativa antecipadamente o acesso do estagiário; a desativação efetiva continua sujeita ao RF54. Casos sem decisão de continuidade registrada (RF59) devem permanecer na lista até que uma decisão seja tomada.

_Critérios de aceitação:_

- A partir da data de início do planejamento, a lista da coordenação mostra todos os casos ativos dos estagiários marcados para encerramento de vínculo.
- Antes da data de início do planejamento, a consulta informa que o período ainda não começou e não trata os casos como pendentes.
- A marcação de encerramento futuro preserva o acesso vigente do estagiário até a desativação (RF54) ser efetivada.
- Caso com decisão de continuidade registrada (RF59) não aparece como pendente.
- Sem estagiários com casos ativos marcados para desligamento, a lista informa que não há casos pendentes de decisão.

_Rastreabilidade:_ Feature "Listar casos elegíveis para continuidade entre semestres" → CP13 — Continuidade de casos entre semestres → OE5/OE6. Dependência: RF54 (CP12), CP5.

#### Feature — Registrar decisão de continuidade do caso

**RF59 — Registrar decisão de continuidade do caso**{ #rf59 }

O sistema deve permitir que a coordenação ou o supervisor do caso registre, para cada caso listado (RF58), a decisão de continuidade: indicar o novo estagiário responsável para o semestre seguinte, ou encerrar o acompanhamento, informando o motivo em ambos os casos. Toda decisão deve ficar registrada com autor e data.

Somente a coordenação pode corrigir uma decisão já registrada. A correção deve exigir motivo, preservar integralmente a decisão anterior, registrar autor e data/hora e gerar uma nova versão vigente. Se a transferência ainda não tiver sido efetivada, a nova decisão substitui a anterior como instrução pendente. Se a transferência já tiver sido efetivada, a correção não pode desfazê-la silenciosamente: o sistema deve exigir uma ação de reversão ou uma nova transferência autorizada, vinculada à correção e executada conforme RF60 e RF25.

_Critérios de aceitação:_

- A decisão de continuidade registrada pela coordenação ou pelo supervisor, com novo estagiário indicado, fica associada ao caso com o novo responsável, o autor e a data.
- O registro de encerramento do acompanhamento com motivo marca o caso como encerrado por continuidade não efetivada, sem vínculo com novo estagiário.
- Somente a coordenação pode corrigir uma decisão de continuidade já registrada.
- A correção, com motivo, de decisão ainda não efetivada preserva a versão anterior e passa a valer como instrução vigente.
- A correção de decisão cuja transferência já foi efetivada preserva a transferência realizada e exige reversão ou nova transferência explícita, vinculada à correção, sem trocar o responsável atual silenciosamente.

_Rastreabilidade:_ Feature "Registrar decisão de continuidade do caso" → CP13 — Continuidade de casos entre semestres → OE5/OE6. Dependência: RF58.

#### Feature — Vincular caso a novo estagiário na continuidade

**RF60 — Vincular caso a novo estagiário na continuidade**{ #rf60 }

Quando a decisão de continuidade vigente (RF59) indicar um novo estagiário responsável, o sistema deve permitir que a coordenação confirme explicitamente a transferência na data de encerramento do semestre configurada no RF58 ou depois dela. A mudança não deve ocorrer automaticamente apenas pela passagem da data. Após a confirmação, o sistema deve efetivar a transferência reaproveitando o mecanismo do RF25 — Transferir caso para outro estagiário ou supervisor, preservando integralmente o histórico do paciente (sessões, evoluções e vínculos anteriores) e vinculando a transferência à decisão de continuidade que a originou, em vez de a um motivo avulso.

_Critérios de aceitação:_

- Na data de encerramento do semestre, a confirmação da transferência pela coordenação registra o novo estagiário como responsável, mantém todo o histórico do paciente disponível a ele, revoga o acesso do anterior e vincula a transferência à versão vigente da decisão (RF59).
- Sem confirmação da coordenação na data de encerramento, a transferência fica pendente e o responsável não muda automaticamente.
- Caso com decisão vigente de encerramento não recebe oferta nem efetivação de transferência na virada de semestre.

_Rastreabilidade:_ Feature "Vincular caso a novo estagiário na continuidade" → CP13 — Continuidade de casos entre semestres → OE5/OE6. Dependência: RF59, RF25 (CP5).

#### Modelo de domínio da CP13

- **Decisão de continuidade:** vinculada ao caso, ao estagiário que está concluindo o estágio, ao autor e à data; indica o novo estagiário responsável ou o encerramento do acompanhamento, com motivo e histórico de versões quando houver correção.
- **Transferência de continuidade:** reaproveita a entidade de transferência já definida na CP5, acrescentando o vínculo com a decisão de continuidade que a originou.

### Acessibilidade e Usabilidade (CP14)

A CP14 foi decomposta em duas features de personalização da exibição, voltadas a reduzir barreiras de acesso para o público em vulnerabilidade social e para pessoas com deficiência visual, conforme os desafios identificados na [Seção 1.5](../../unidade-1/cenario-atual.md#15-desafios-do-projeto). As duas features se aplicam exclusivamente às **páginas voltadas ao público externo** (paciente/solicitante) — inscrição, consulta de posição na fila, agendamento e confirmação de presença —, e não ao painel administrativo interno (usado por coordenação, secretaria, estagiários e supervisores).

#### Feature — Ativar modo de alto contraste [#24](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/24)

**RF61 — Ativar modo de alto contraste**{ #rf61 }

O sistema deve permitir que o paciente ative um modo de alto contraste em todas as páginas voltadas ao público externo, alterando a combinação de cores de texto e plano de fundo para atender, no mínimo, à razão de contraste exigida pelo nível AA da WCAG 2.2 (ver RNF56).

_Critério de aceitação:_ O modo de alto contraste ativado permanece em todas as páginas públicas durante a mesma sessão do navegador, sem precisar ser reativado; a preferência não precisa ser mantida após o fim da sessão, já que essas páginas não exigem login do paciente.
_Rastreabilidade:_ Feature "Ativar modo de alto contraste" → CP14 — Acessibilidade e usabilidade.

#### Feature — Ajustar tamanho do texto [#25](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/25)

**RF62 — Ajustar tamanho do texto**{ #rf62 }

O sistema deve permitir que o paciente aumente ou diminua o tamanho do texto exibido nas páginas voltadas ao público externo, em pelo menos 3 níveis (padrão — 100%, grande — 150% e extra grande — 200% do tamanho base do texto), sem cortar texto, sobrepor elementos ou impedir o acesso a qualquer funcionalidade dessas páginas.

_Critério de aceitação:_ O nível de tamanho de texto escolhido vale para todas as páginas públicas, com a mesma regra de persistência por sessão do navegador do RF61.
_Rastreabilidade:_ Feature "Ajustar tamanho do texto" → CP14 — Acessibilidade e usabilidade.
