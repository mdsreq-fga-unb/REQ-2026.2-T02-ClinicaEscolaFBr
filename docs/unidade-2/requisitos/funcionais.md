# 8. Requisitos de Software

## 8.1 Lista de Requisitos Funcionais

Os requisitos funcionais (RFs) são declarados a partir da decomposição das Características de Produto (CPs) em **Features**, seguindo o processo FDD (etapa _Construir a Lista de Features_) e as práticas descritas na [Seção 5 — Engenharia de Requisitos](../../unidade-1/engenharia-requisitos.md). Cada Feature segue o formato `<ação> <resultado> <objeto>` e agrupa um ou mais RFs; cada RF mantém rastreabilidade com a Feature que o declarou e, por meio dela, com a CP de origem, compondo a cadeia **Problema → OG → OEs → CPs → Features → RFs/RNFs** descrita no cronograma da Unidade 2.

### Lista de features (FDD)

```text
Área: Inscrição no atendimento
  Conjunto: Inscrição on-line
    Feature: Registrar solicitação de atendimento on-line
    Feature: Emitir comprovante de inscrição
    Feature: Registrar inscrição assistida

Área: Triagem clínica
  Conjunto: Triagem e sinalização de casos
    Feature: Organizar informações da inscrição para triagem
    Feature: Sinalizar pontos de atenção da inscrição
    Feature: Registrar prioridade clínica do inscrito

Área: Gestão da fila de espera
  Conjunto: Fila de espera e consulta de posição
    Feature: Ordenar inscritos na fila de espera
    Feature: Consultar posição individual na fila
    Feature: Informar condições gerais da fila

Área: Agendamento e acompanhamento de sessões
  Conjunto: Agendamento
    Feature: Agendar sessão do paciente
    Feature: Consultar agenda de sessões do estagiário
    Feature: Reagendar sessão do paciente
  Conjunto: Confirmação e lembrete
    Feature: Enviar lembrete de sessão agendada
    Feature: Confirmar presença em sessão agendada
  Conjunto: Cancelamento
    Feature: Registrar cancelamento de sessão pelo paciente
    Feature: Registrar cancelamento de sessão pelo estagiário
    Feature: Notificar paciente sobre ausência do estagiário

Área: Gestão de casos
  Conjunto: Distribuição entre supervisores
    Feature: Listar casos aguardando distribuição
    Feature: Registrar áreas de especialidade do supervisor
    Feature: Distribuir caso a supervisor conforme área de especialidade
  Conjunto: Vinculação a estagiário
    Feature: Vincular paciente a estagiário responsável
    Feature: Consultar responsáveis pelo caso
    Feature: Consultar casos sob responsabilidade do estagiário ou supervisor
  Conjunto: Acompanhamento e reorganização
    Feature: Visualizar distribuição de casos por supervisor
    Feature: Transferir caso para outro estagiário ou supervisor
    Feature: Consultar histórico de responsáveis do caso

Área: Acompanhamento clínico
  Conjunto: Prontuário
    Feature: Consultar prontuário do paciente
  Conjunto: Registro de evolução por sessão
    Feature: Registrar evolução da sessão realizada
    Feature: Corrigir evolução registrada
    Feature: Consultar evolução de uma sessão específica
    Feature: Consultar histórico de evolução do paciente
  Conjunto: Encerramento do ciclo
    Feature: Gerar relatório final de evolução

Área: Assiduidade e alertas
  Conjunto: Controle de faltas do paciente
    Feature: Registrar falta do paciente na sessão
    Feature: Contabilizar faltas consecutivas do paciente
    Feature: Emitir alerta de limite de faltas atingido
    Feature: Desligar paciente por faltas e liberar vaga
  Conjunto: Controle de faltas do estagiário
    Feature: Consolidar faltas do estagiário para a supervisão

Área: Registros administrativos do atendimento
  Conjunto: Contribuição social
    Feature: Registrar pagamento da contribuição social do paciente
    Feature: Consultar situação da contribuição social dos pacientes
  Conjunto: Declaração de comparecimento
    Feature: Listar sessões com comparecimento registrado do paciente
    Feature: Emitir declaração de comparecimento do paciente
    Feature: Reemitir declaração de comparecimento
    Feature: Emitir declaração consolidada por período
    Feature: Validar autenticidade da declaração

Área: Gestão institucional
  Conjunto: Indicadores e relatórios institucionais
    Feature: Consultar indicadores operacionais
    Feature: Gerar e exportar relatório institucional

Área: Acesso e segurança
  Conjunto: Autenticação
    Feature: Autenticar usuário institucional
    Feature: Encerrar sessão do usuário
    Feature: Verificar identidade do paciente ou responsável
  Conjunto: Controle de acesso por perfil
    Feature: Cadastrar usuário institucional com perfil de acesso
    Feature: Desativar usuário institucional
    Feature: Restringir acesso ao prontuário do paciente
  Conjunto: Proteção de dados
    Feature: Consultar registro de acessos ao prontuário
    Feature: Registrar consentimento para tratamento de dados

Área: Continuidade do atendimento
  Conjunto: Continuidade de casos entre semestres
    Feature: Listar casos elegíveis para continuidade entre semestres
    Feature: Registrar decisão de continuidade do caso
    Feature: Vincular caso a novo estagiário na continuidade

Área: Acessibilidade e usabilidade
  Conjunto: Personalização de exibição
    Feature: Ativar modo de alto contraste
    Feature: Ajustar tamanho do texto
```

### Inscrição on-line (CP1)

A CP1 foi decomposta em três features: registro da solicitação de atendimento on-line, emissão de comprovante de inscrição e registro de inscrição assistida. As features têm como objetivo ampliar o acesso da comunidade aos serviços da Clínica Escola FBr, permitindo que o interessado realize sua inscrição sem necessidade de deslocamento presencial e que pessoas com dificuldades de acesso digital possam utilizar um canal assistido.

O registro da inscrição assistida constitui uma resposta proposta ao risco de exclusão digital identificado na intervenção social (Seção 3), cuja forma de operação deverá ser validada com a Clínica Escola.

As funcionalidades destinadas ao público externo devem observar os requisitos de acessibilidade da CP14, enquanto o acesso institucional aos dados dos inscritos deve respeitar os perfis e as restrições estabelecidos pela CP12.

#### Feature — Registrar solicitação de atendimento on-line

**RF1 — Registrar solicitação de atendimento on-line**

O sistema deve permitir que o interessado realize uma solicitação de atendimento psicológico por meio de formulário eletrônico, acessível a partir de link divulgado no site e nas redes sociais da FBr, informando seus dados cadastrais e a queixa que motivou a busca pelo atendimento.

O formulário deve exigir, como campos obrigatórios — confirmados pela Clínica Escola na reunião de 26/08/2026 ([ata](../../unidade-1/reunioes.md)) —, os seguintes: nome completo, data de nascimento, CPF, RG, endereço, estado civil e a queixa (motivo da busca pelo atendimento); quando o interessado for menor de idade, o formulário deve exigir também o nome do responsável legal. O CPF e o RG são coletados apenas como texto informado pelo próprio interessado — a Clínica Escola não exige, nem o sistema deve solicitar, o envio de cópia digitalizada desses documentos. O sistema deve verificar se os campos obrigatórios foram preenchidos e solicitar a confirmação do interessado antes de registrar a inscrição.

Após a conclusão do envio, o sistema deve armazenar a solicitação e gerar um identificador único, que será utilizado para o acompanhamento da inscrição nas etapas posteriores de triagem e fila de espera.

O registro da solicitação não representa confirmação de vaga ou garantia de atendimento, pois o interessado ainda deverá passar pelo processo de triagem previsto na CP2.

_Critérios de aceitação:_

- Dado que o interessado acessou o formulário de inscrição, quando preencher todos os campos obrigatórios e confirmar o envio, então o sistema deve registrar a solicitação e gerar um identificador único vinculado à inscrição.

- Dado que o interessado deixou um ou mais campos obrigatórios sem preenchimento, quando tentar enviar o formulário, então o sistema deve impedir a conclusão da inscrição, identificar os campos pendentes e permitir sua correção sem descartar os demais dados já preenchidos.

- Dada uma solicitação registrada com sucesso, quando o interessado concluir o processo de inscrição, então o sistema deve informar que a solicitação foi recebida e que o atendimento dependerá das etapas posteriores de triagem e disponibilidade de vagas.

- Dado que ocorreu uma falha antes da confirmação do registro, quando o interessado tentar concluir a inscrição, então o sistema não deve apresentar uma confirmação de inscrição realizada sem que exista um registro correspondente.

- Dado o preenchimento do formulário, quando o interessado chegar aos campos de CPF e RG, então o sistema deve solicitar apenas a digitação desses números, sem oferecer ou exigir o envio de cópia digitalizada ou foto do documento.

_Rastreabilidade:_ Feature "Registrar solicitação de atendimento on-line" → CP1 — Inscrição on-line → OE1/OE4.

#### Feature — Emitir comprovante de inscrição

**RF2 — Emitir comprovante de inscrição**

O sistema deve permitir que o interessado obtenha um comprovante eletrônico após a conclusão do registro da solicitação de atendimento.

O comprovante deve apresentar o número único da inscrição, a data e a hora do registro e uma mensagem confirmando o recebimento da solicitação pela Clínica Escola FBr.

O documento deve informar que o comprovante representa exclusivamente o registro da inscrição e não constitui confirmação de vaga, agendamento ou início do atendimento psicológico.

O comprovante não deve apresentar a queixa informada pelo interessado nem informações clínicas que não sejam necessárias para confirmar o recebimento da solicitação.

_Critérios de aceitação:_

- Dada uma solicitação de atendimento registrada com sucesso, quando o interessado concluir a inscrição, então o sistema deve disponibilizar um comprovante contendo o número da inscrição, a data e a hora do registro.

- Dado um comprovante emitido, quando o interessado visualizar seu conteúdo, então deve encontrar uma mensagem informando que a inscrição foi recebida e que o atendimento está sujeito à triagem e à disponibilidade de vagas.

- Dada uma tentativa de inscrição que não tenha sido concluída com sucesso, quando o interessado acessar a etapa de confirmação, então o sistema não deve emitir um comprovante correspondente a uma solicitação inexistente.

- Dado um comprovante de inscrição, quando seu conteúdo for apresentado ao interessado, então não deve conter a queixa informada no formulário nem dados clínicos desnecessários à confirmação do registro.

_Rastreabilidade:_ Feature "Emitir comprovante de inscrição" → CP1 — Inscrição on-line → OE1/OE4.

#### Feature — Registrar inscrição assistida

**RF3 — Registrar inscrição assistida**

O sistema deve permitir que um usuário institucional com perfil de secretaria registre a solicitação de atendimento de um interessado que necessite de auxílio para realizar sua inscrição, mediante atendimento assistido ou presencial disponibilizado pela Clínica Escola FBr. O registro dessa solicitação deve ser restrito ao perfil de secretaria, conforme os perfis institucionais definidos na CP12 — Segurança, sigilo e controle de acesso.

O registro assistido deve utilizar os mesmos campos cadastrais e informações obrigatórias estabelecidos para a inscrição on-line, permitindo que a solicitação seja incorporada ao mesmo fluxo de triagem e fila de espera.

O sistema deve identificar a modalidade utilizada para o registro da inscrição, diferenciando as solicitações realizadas diretamente pelo interessado daquelas registradas com auxílio de um usuário institucional.

A utilização do canal assistido não deve atribuir prioridade clínica diferenciada ao interessado, pois a classificação de prioridade depende do processo de triagem previsto na CP2.

_Critérios de aceitação:_

- Dado um interessado atendido por um usuário institucional com perfil de secretaria, quando os dados obrigatórios forem preenchidos e a inscrição for confirmada, então o sistema deve registrar a solicitação, gerar um identificador único e encaminhá-la ao mesmo fluxo de triagem utilizado pelas inscrições on-line.

- Dado um usuário institucional com perfil diferente de secretaria, quando tentar acessar a funcionalidade de inscrição assistida, então o sistema deve impedir o registro da solicitação por esse usuário.

- Dada uma inscrição realizada por atendimento assistido, quando seu registro for consultado por um usuário autorizado, então o sistema deve identificar a modalidade de inscrição utilizada.

- Dadas duas solicitações com a mesma classificação de prioridade validada, sendo uma on-line e outra assistida, quando forem incorporadas à fila de espera, então a modalidade de inscrição não deve constituir, isoladamente, critério para atribuição de prioridade diferenciada.

_Rastreabilidade:_ Feature "Registrar inscrição assistida" → CP1 — Inscrição on-line → OE1/OE4 → IS01 — Exclusão digital.

### Triagem e sinalização de casos (CP2)

A CP2 foi decomposta em três features: organização das informações da inscrição, sinalização de pontos de atenção e registro da prioridade definida pela equipe clínica. A inscrição on-line ou assistida (CP1) fornece os dados de entrada; somente a prioridade clínica confirmada pode alimentar a ordenação da fila (CP3). O acesso aos dados da triagem observa a CP12 — Segurança, sigilo e controle de acesso, conforme a numeração da [Solução Proposta](../../unidade-1/solucao-proposta.md#23-caracteristicas-de-produto-mapeadas-com-os-objetivos-especificos).

A formulação desta CP na atividade de decomposição menciona pré-classificação automática pelas opções do formulário. A versão vigente da Solução Proposta, §2.2–2.3, restringe o sistema a organizar e sinalizar informações, reservando a classificação vermelha, amarela ou verde exclusivamente à equipe clínica. Na prática hoje descrita pela FBr, a triagem parte da leitura da queixa em texto livre preenchida pelo interessado (RF1), não de opções fechadas do formulário; a pré-classificação automática por opções do formulário foi uma proposta da equipe de projeto discutida internamente, não uma funcionalidade solicitada pela Clínica Escola na reunião de 26/08/2026. Em conversa de Nicolas com a FBr em 22/09/2026, a Clínica Escola confirmou que essa abordagem mais simples — o sistema apenas organiza as respostas e destaca os pontos de atenção, sem sugerir cor, cabendo à equipe clínica decidir a prioridade diretamente a partir dessas informações — é a que deve ser adotada agora; uma eventual sugestão automática de cor foi explicitamente deixada para uma evolução futura, fora do escopo atual. Os RFs abaixo já refletem essa abordagem confirmada.

#### Feature — Organizar informações da inscrição para triagem

**RF4 — Organizar informações da inscrição para triagem**

O sistema deve apresentar à equipe clínica autorizada as inscrições recebidas, identificadas pelo número de inscrição, com as respostas do formulário necessárias à triagem, incluindo queixa, urgência percebida e histórico informado quando esses campos estiverem definidos no formulário aprovado pela Clínica Escola. A apresentação deve distinguir informação declarada pelo interessado de avaliação registrada pela equipe e indicar dados ausentes, sem preencher lacunas por inferência.

_Critérios de aceitação:_

- Dada uma inscrição registrada pelo canal on-line ou assistido, quando um integrante autorizado da equipe clínica abrir a triagem, então o sistema deve apresentar o número da inscrição e as respostas registradas para os campos de triagem disponíveis.
- Dado um campo de triagem sem resposta registrada, quando a inscrição for apresentada, então o sistema deve indicar a ausência da informação, sem atribuir conteúdo presumido.
- Dado um usuário sem autorização para acessar dados de triagem, quando tentar consultar uma inscrição, então o sistema deve impedir a visualização das respostas.

_Rastreabilidade:_ Feature "Organizar informações da inscrição para triagem" → CP2 — Triagem e sinalização de casos → OE2/OE1. Dependência: CP1; restrição transversal: CP12 — Segurança, sigilo e controle de acesso.

#### Feature — Sinalizar pontos de atenção da inscrição

**RF5 — Sinalizar pontos de atenção da inscrição**

O sistema deve destacar, para a equipe clínica autorizada, respostas do formulário que correspondam a pontos de atenção definidos e aprovados pela Clínica Escola. Cada sinalização deve permitir identificar a resposta que a originou e deve ser apresentada como informação para avaliação humana, sem atribuir uma cor de prioridade, ordenar o inscrito na fila ou concluir a triagem automaticamente. As opções do formulário e as regras de sinalização dependem de validação com a FBr antes da implementação.

_Critérios de aceitação:_

- Dada uma inscrição com resposta correspondente a uma regra de sinalização aprovada, quando a equipe clínica consultar a triagem, então o sistema deve destacar o ponto de atenção e a resposta que o originou.
- Dada uma resposta que não corresponda a regra aprovada, quando a inscrição for consultada, então o sistema não deve produzir uma sinalização clínica baseada em regra presumida.
- Dada uma inscrição com um ou mais pontos de atenção, quando estes forem apresentados, então a prioridade clínica deve continuar pendente até a decisão da equipe autorizada.

_Rastreabilidade:_ Feature "Sinalizar pontos de atenção da inscrição" → CP2 — Triagem e sinalização de casos → OE2/OE1. Dependência: RF4; restrição transversal: CP12 — Segurança, sigilo e controle de acesso.

#### Feature — Registrar prioridade clínica do inscrito

**RF6 — Registrar prioridade clínica do inscrito**

O sistema deve permitir que integrante autorizado da equipe clínica registre a classificação final de uma inscrição como vermelha, amarela ou verde, após avaliar as informações e sinalizações disponíveis. Deve ser possível corrigir uma classificação mediante nova decisão autorizada, preservando o histórico das classificações e o responsável por cada decisão. Inscrições sem decisão devem permanecer com prioridade pendente e não devem ser tratadas pela fila como classificadas. O sistema deve disponibilizar à CP3 somente a prioridade final vigente definida pela equipe clínica.

A classificação continua sendo um julgamento clínico da equipe, não uma regra automatizada — mas, segundo a reunião de 26/08/2026 com a Clínica Escola ([ata](../../unidade-1/reunioes.md)), a própria FBr descreveu a referência que hoje orienta essa decisão: prioridade vermelha para quadro clínico já caracterizado (ex.: quadros depressivos ou de ansiedade), especialmente quando o interessado já está em uso de medicação; prioridade amarela para sofrimento emocional pontual, sem caracterização de quadro clínico e sem uso de medicação (ex.: luto); e prioridade verde quando não há indício de adoecimento e a busca é por desenvolvimento pessoal, sendo esse grupo atendido apenas se houver vaga disponível após o atendimento das prioridades vermelha e amarela. O sistema pode exibir esses critérios como apoio textual à decisão da equipe clínica, mas não deve calculá-los nem sugerir automaticamente uma cor a partir das respostas do formulário.

_Critérios de aceitação:_

- Dada uma inscrição com triagem pendente, quando um integrante autorizado da equipe clínica confirmar uma das três prioridades, então o sistema deve registrar a cor escolhida, o responsável e a data e hora da decisão.
- Dado um usuário sem autorização clínica, quando tentar registrar ou alterar a prioridade, então o sistema deve recusar a ação e preservar a classificação vigente.
- Dada uma inscrição ainda sem classificação confirmada, quando a fila consultar sua prioridade, então o sistema deve informar situação pendente, sem usar sinalizações como prioridade final.
- Dada uma alteração autorizada de prioridade, quando a equipe confirmar a nova cor, então o sistema deve manter o histórico da decisão anterior e disponibilizar a classificação vigente para a fila da CP3.
- Dada a tela de registro de prioridade, quando exibida a um integrante autorizado da equipe clínica, então o sistema pode apresentar a referência vermelha/amarela/verde definida pela Clínica Escola como apoio textual à decisão, sem preencher ou sugerir automaticamente a cor.

_Rastreabilidade:_ Feature "Registrar prioridade clínica do inscrito" → CP2 — Triagem e sinalização de casos → OE2/OE1. Dependência: RF4/RF5; integração: RF7 (CP3); restrição transversal: CP12 — Segurança, sigilo e controle de acesso.

#### Modelo de domínio da CP2

- **Inscrição:** solicitação identificada pelo número gerado na CP1; contém respostas declaradas pelo interessado e possui uma situação de triagem.
- **Resposta de triagem:** informação associada à inscrição e à pergunta do formulário aprovado; sua origem declaratória permanece explícita.
- **Ponto de atenção:** sinalização derivada de uma resposta e de uma regra institucional aprovada; não possui valor de prioridade clínica.
- **Decisão de prioridade:** classificação vermelha, amarela ou verde, vinculada à inscrição, ao integrante autorizado da equipe clínica e ao momento da decisão. A decisão vigente pode substituir outra sem apagar seu histórico.
- **Fila de espera:** utiliza a decisão de prioridade vigente e confirmada; inscrições pendentes não recebem prioridade por inferência.

#### Pontos a validar com a FBr (CP2)

- Confirmar os campos e as opções do formulário de triagem, as regras de sinalização e o tratamento de respostas ausentes.
- Identificar quais perfis institucionais compõem a "equipe clínica" autorizada a classificar e revisar a prioridade.
- Definir o tratamento operacional dos casos com triagem pendente.

### Fila de espera e consulta de posição (CP3)

A CP3 foi decomposta em três features: ordenação dos inscritos na fila de espera, consulta individual da posição e apresentação das condições gerais de atendimento.

As features têm como objetivo organizar a fila de acordo com as prioridades estabelecidas na triagem, ampliar a transparência das informações fornecidas aos inscritos e reduzir a necessidade de contatos recorrentes com a secretaria para acompanhamento da solicitação.

A ordenação da fila depende da classificação de prioridade realizada na CP2, enquanto a consulta individual deve respeitar as restrições de acesso e sigilo previstas na CP12.

A apresentação das condições gerais de atendimento constitui uma resposta proposta aos riscos de aumento da demanda e de criação de expectativas inadequadas sobre o tempo de espera, identificados na intervenção social (Seção 3).

#### Feature — Ordenar inscritos na fila de espera

**RF7 — Ordenar inscritos na fila de espera**

O sistema deve manter a fila de espera da Clínica Escola FBr organizada de acordo com a classificação de prioridade atribuída aos inscritos durante o processo de triagem previsto na CP2.

A classificação deve considerar as prioridades vermelha, amarela e verde, conforme as regras definidas pela Clínica Escola, utilizando a classificação final validada pela equipe responsável pela triagem.

O sistema não deve utilizar sinalizações da triagem como decisão clínica definitiva; somente a classificação confirmada pela equipe clínica pode definir a prioridade na fila.

Quando ocorrer uma alteração autorizada na prioridade ou na situação de um inscrito, o sistema deve atualizar seu posicionamento na fila de acordo com os critérios institucionais definidos para a ordenação.

Os critérios de desempate entre inscritos com a mesma prioridade deverão ser confirmados com a Clínica Escola durante a validação dos requisitos.

_Critérios de aceitação:_

- Dado um inscrito cuja classificação de prioridade tenha sido validada pela equipe responsável, quando sua solicitação for incorporada à fila de espera, então o sistema deve posicioná-lo conforme a prioridade atribuída e os critérios de ordenação aprovados pela Clínica Escola.

- Dado um inscrito com sinalizações de triagem e sem classificação clínica confirmada, quando o sistema organizar a fila, então não deve atribuir prioridade com base nessas sinalizações.

- Dada uma alteração de prioridade realizada por um usuário autorizado, quando a nova classificação for confirmada, então o sistema deve atualizar a posição do inscrito de acordo com os critérios de ordenação estabelecidos.

- Dada uma alteração na situação de um inscrito que afete sua participação na fila, quando a atualização for confirmada, então o sistema deve recalcular as posições dos demais inscritos afetados, preservando o histórico da decisão.

_Rastreabilidade:_ Feature "Ordenar inscritos na fila de espera" → CP3 — Fila de espera e consulta de posição → OE4/OE7.

#### Feature — Consultar posição individual na fila

**RF8 — Consultar posição individual na fila**

O sistema deve permitir que o inscrito consulte sua posição e situação atual na fila de espera da Clínica Escola FBr, utilizando seu CPF ou número de inscrição para localizar a solicitação.

Antes de apresentar as informações individuais, o sistema deve verificar a identidade do inscrito conforme o RF49 — Verificar identidade do paciente ou responsável, definido na CP12. A verificação deve exigir CPF ou número de inscrição e um código de uso único enviado ao contato cadastrado, permitindo o acesso exclusivamente às informações da inscrição correspondente.

A consulta deve apresentar exclusivamente as informações relativas à própria solicitação, sem divulgar nomes, dados cadastrais, queixas ou classificações clínicas dos demais inscritos.

O sistema deve informar que a posição na fila pode sofrer alterações em razão das prioridades estabelecidas na triagem e das movimentações da fila, não representando garantia de prazo ou data de atendimento.

_Critérios de aceitação:_

- Dado um inscrito que tenha informado seu CPF ou número de inscrição e confirmado sua identidade por meio do código de uso único previsto no RF49, quando solicitar a consulta da fila de espera, então o sistema deve apresentar exclusivamente sua posição e situação atual na fila.

- Dado um usuário que não tenha comprovado autorização para consultar determinada inscrição, quando tentar acessar suas informações, então o sistema deve impedir a divulgação da posição e da situação individual correspondente.

- Dada uma consulta individual autorizada, quando o sistema apresentar a posição do inscrito, então não deve exibir nomes, dados cadastrais, queixas ou informações clínicas dos demais integrantes da fila.

- Dada uma alteração na prioridade ou na situação dos inscritos que modifique o posicionamento na fila, quando o interessado realizar uma nova consulta autorizada, então o sistema deve apresentar sua posição atualizada.

- Dada uma consulta de posição realizada com sucesso, quando o resultado for apresentado, então o sistema deve informar que a posição poderá variar e que não existe garantia de atendimento em uma data ou prazo específico.

_Rastreabilidade:_ Feature "Consultar posição individual na fila" → CP3 — Fila de espera e consulta de posição → OE4/OE7 → IS03 — Expectativa sobre a fila. Dependência: RF49 — Verificar identidade do paciente ou responsável (CP12).

#### Feature — Informar condições gerais da fila

**RF9 — Informar condições gerais da fila**

O sistema deve permitir que o interessado consulte informações institucionais sobre o funcionamento da fila de espera da Clínica Escola FBr, incluindo os critérios gerais de atendimento e a capacidade de atendimento divulgada pela coordenação.

As informações apresentadas devem corresponder ao conteúdo institucional aprovado pela Clínica Escola e conter a data da última atualização.

A divulgação deve ocorrer de forma agregada, sem permitir a identificação de inscritos, a exposição de informações clínicas individuais ou a visualização de dados restritos da operação.

Quando não houver informação de capacidade aprovada e vigente, o sistema não deve apresentar valores estimados como se representassem a disponibilidade real de vagas.

_Critérios de aceitação:_

- Dado que a coordenação tenha aprovado e disponibilizado informações institucionais sobre a fila, quando o interessado acessar a página correspondente, então o sistema deve apresentar os critérios gerais de atendimento e a capacidade divulgada, acompanhados da data de atualização.

- Dado que não exista informação de capacidade aprovada ou vigente, quando o interessado consultar as condições gerais da fila, então o sistema não deve apresentar uma quantidade estimada de vagas como disponibilidade confirmada.

- Dado um interessado que consulte as informações gerais da fila, quando o conteúdo for apresentado, então não deve conter nomes, dados cadastrais, queixas ou classificações clínicas individualizadas dos inscritos.

- Dada uma alteração nas informações institucionais aprovada pela coordenação, quando o conteúdo atualizado for publicado, então o sistema deve substituir a informação anterior e apresentar a nova data de atualização.

_Rastreabilidade:_ Feature "Informar condições gerais da fila" → CP3 — Fila de espera e consulta de posição → OE4/OE7 → IS02 — Aumento da demanda.

### Agendamento, Confirmação e Remarcação (CP4)

A CP4 foi decomposta em oito features, organizadas em três conjuntos: agendamento, confirmação/lembrete e cancelamento, respondendo à dor mais crítica relatada pela coordenação — as falhas de agendamento e de confirmação de presença que produzem horários ociosos ([Solução Proposta, §2.1 e §2.3](../../unidade-1/solucao-proposta.md#23-caracteristicas-de-produto-mapeadas-com-os-objetivos-especificos)).

O agendamento depende do vínculo entre paciente e estagiário responsável, definido pela CP5, e pressupõe que a inscrição já tenha passado pela triagem da CP2. O acesso aos dados da sessão observa os perfis definidos na CP12 — Segurança, sigilo e controle de acesso. O registro de um não comparecimento gera o evento consumido pela CP9 — Controle de assiduidade e alertas, para a contagem cumulativa de faltas; esta decomposição trata apenas do registro do evento na sessão, não da interpretação cumulativa dele.

Conforme confirmado pela Clínica Escola na reunião de 26/08/2026 ([ata](../../unidade-1/reunioes.md)), todas as sessões de atendimento psicológico da Clínica Escola FBr são presenciais — a FBr não realiza atendimento psicológico remoto, em razão de restrição do Conselho Regional de Psicologia (CRP) aplicável ao estágio supervisionado. O agendamento (RF10) e a confirmação de presença (RF14) tratam, portanto, exclusivamente de horários presenciais; o sistema não precisa prever modalidade remota de sessão.

O prazo mínimo de antecedência para cancelamento ou remarcação, o número máximo de remarcações por paciente dentro do ciclo, o canal do lembrete automático (SMS, e-mail ou ambos) e quem pode registrar o cancelamento em nome do estagiário ainda dependem de validação com a FBr.

#### Feature — Agendar sessão do paciente

**RF10 — Agendar sessão do paciente**

O sistema deve permitir que a secretaria ou o estagiário responsável agende uma sessão para um paciente já vinculado a um estagiário (CP5), informando data e horário. O sistema deve impedir o agendamento de sessões sobrepostas para o mesmo estagiário ou para o mesmo paciente, e deve registrar o status inicial da sessão como "agendada", com paciente, estagiário, data e horário associados. O agendamento não deve ocorrer para pacientes sem estagiário responsável vinculado.

_Critérios de aceitação:_

- Dado um paciente já vinculado a um estagiário responsável, quando a secretaria ou o estagiário agendar uma sessão em um horário disponível, então o sistema deve registrar a sessão com status "agendada", paciente, estagiário, data e horário.
- Dado um horário já ocupado por outra sessão do mesmo estagiário, quando houver tentativa de agendar uma nova sessão nesse horário, então o sistema deve impedir o agendamento e informar o conflito.
- Dado um paciente sem estagiário responsável vinculado, quando houver tentativa de agendar uma sessão para ele, então o sistema deve impedir o agendamento.

_Rastreabilidade:_ Feature "Agendar sessão do paciente" → CP4 — Agendamento, confirmação e remarcação → OE3/OE4. Dependência: CP5 — Distribuição de casos entre supervisores e estagiários; restrição transversal: CP12 — Segurança, sigilo e controle de acesso.

#### Feature — Consultar agenda de sessões do estagiário

**RF11 — Consultar agenda de sessões do estagiário**

O sistema deve permitir que o estagiário consulte suas sessões agendadas, confirmadas e realizadas, com filtro por período. O supervisor deve poder consultar a agenda dos estagiários sob sua supervisão, respeitando os vínculos definidos na CP5.

_Critérios de aceitação:_

- Dado um estagiário autenticado, quando ele consultar sua agenda, então o sistema deve exibir suas sessões agendadas, confirmadas e realizadas, filtráveis por período.
- Dado um supervisor autenticado, quando ele consultar a agenda de um estagiário sob sua supervisão, então o sistema deve exibir as sessões desse estagiário.
- Dado um usuário sem vínculo de supervisão com o estagiário, quando tentar consultar a agenda dele, então o sistema deve negar o acesso.

_Rastreabilidade:_ Feature "Consultar agenda de sessões do estagiário" → CP4 — Agendamento, confirmação e remarcação → OE3/OE4. Dependência: RF10, CP5; restrição transversal: CP12.

#### Feature — Reagendar sessão do paciente

**RF12 — Reagendar sessão do paciente**

O sistema deve permitir alterar a data ou o horário de uma sessão ainda não realizada, preservando o registro da sessão original e da remarcação para fins de auditoria e do relatório final de evolução (CP6/CP7/CP8). O limite de remarcações por paciente dentro do ciclo ainda depende de validação com a FBr; até essa definição, o sistema não deve impor um limite fixo.

_Critérios de aceitação:_

- Dada uma sessão agendada ainda não realizada, quando a secretaria ou o estagiário alterar a data ou o horário, então o sistema deve atualizar a sessão e manter o registro da data/horário anterior vinculado à sessão.
- Dada uma sessão já realizada ou cancelada, quando houver tentativa de reagendamento, então o sistema deve impedir a operação.

_Rastreabilidade:_ Feature "Reagendar sessão do paciente" → CP4 — Agendamento, confirmação e remarcação → OE3/OE4. Dependência: RF10.

#### Feature — Enviar lembrete de sessão agendada

**RF13 — Enviar lembrete de sessão agendada**

O sistema deve enviar automaticamente um lembrete ao paciente antes de uma sessão agendada, registrando o envio ou a eventual falha de envio para fins de auditoria. O canal do lembrete (e-mail, SMS ou ambos) e a antecedência do envio ainda dependem de validação com a FBr.

_Critérios de aceitação:_

- Dada uma sessão agendada dentro do prazo de antecedência definido, quando o momento do lembrete for atingido, então o sistema deve enviar o lembrete ao paciente e registrar o envio.
- Dada uma falha no envio do lembrete, quando ela ocorrer, então o sistema deve registrar a falha, sem apresentá-la como envio concluído.

_Rastreabilidade:_ Feature "Enviar lembrete de sessão agendada" → CP4 — Agendamento, confirmação e remarcação → OE3. Dependência: RF10.

#### Feature — Confirmar presença em sessão agendada

**RF14 — Confirmar presença em sessão agendada**

O sistema deve permitir que o paciente confirme presença em uma sessão agendada até um prazo definido antes do atendimento. Ao confirmar, o sistema deve atualizar o status da sessão para "confirmada", registrando data, hora e usuário responsável pela confirmação. Sessões não confirmadas dentro do prazo devem ser sinalizadas para a secretaria.

_Critérios de aceitação:_

- Dada uma sessão agendada dentro do prazo de confirmação, quando o paciente confirmar presença, então o sistema deve atualizar o status para "confirmada", com data, hora e usuário responsável.
- Dada uma sessão cujo prazo de confirmação expirou sem confirmação do paciente, quando o prazo for atingido, então o sistema deve sinalizar a sessão para a secretaria.
- Dada uma sessão já cancelada, quando houver tentativa de confirmação, então o sistema deve impedir a operação.

_Rastreabilidade:_ Feature "Confirmar presença em sessão agendada" → CP4 — Agendamento, confirmação e remarcação → OE3. Dependência: RF10. Integração: alimenta a CP9 — Controle de assiduidade e alertas, quando a confirmação não ocorre.

#### Feature — Registrar cancelamento de sessão pelo paciente

**RF15 — Registrar cancelamento de sessão pelo paciente**

O sistema deve permitir que o paciente, ou a secretaria em seu nome, cancele uma sessão futura, informando um motivo. O cancelamento deve gerar o evento consumido pela CP9 — Controle de assiduidade e alertas, para avaliação de falta, conforme o prazo mínimo de antecedência a ser definido com a FBr.

_Critérios de aceitação:_

- Dada uma sessão agendada futura, quando o paciente ou a secretaria em seu nome registrar o cancelamento com um motivo, então o sistema deve atualizar o status da sessão para "cancelada" e registrar o motivo, o autor e a data/hora do cancelamento.
- Dada uma sessão já realizada, quando houver tentativa de cancelamento, então o sistema deve impedir a operação.

_Rastreabilidade:_ Feature "Registrar cancelamento de sessão pelo paciente" → CP4 — Agendamento, confirmação e remarcação → OE3. Dependência: RF10. Integração: CP9 — Controle de assiduidade e alertas.

#### Feature — Registrar cancelamento de sessão pelo estagiário

**RF16 — Registrar cancelamento de sessão pelo estagiário**

O sistema deve permitir que o estagiário, o supervisor ou a secretaria registrem a ausência prevista do estagiário em uma sessão já agendada, informando o motivo. O registro deve disparar a notificação ao paciente afetado (RF17).

_Critérios de aceitação:_

- Dada uma sessão agendada, quando o estagiário, o supervisor ou a secretaria registrar a ausência prevista do estagiário com motivo, então o sistema deve atualizar o status da sessão e disparar a notificação ao paciente.
- Dado um usuário sem vínculo com a sessão (não é o estagiário, o supervisor dele ou a secretaria), quando tentar registrar essa ausência, então o sistema deve negar a operação.

_Rastreabilidade:_ Feature "Registrar cancelamento de sessão pelo estagiário" → CP4 — Agendamento, confirmação e remarcação → OE3/OE4. Dependência: RF10, CP5.

#### Feature — Notificar paciente sobre ausência do estagiário

**RF17 — Notificar paciente sobre ausência do estagiário**

Quando uma sessão for cancelada por ausência do estagiário (RF16), o sistema deve notificar o paciente com a maior antecedência possível, oferecendo a opção de reagendamento (RF12).

_Critério de aceitação:_ dada uma sessão cancelada por ausência do estagiário, quando o cancelamento for registrado, então o sistema deve notificar o paciente imediatamente, com a opção de reagendar a sessão.

_Rastreabilidade:_ Feature "Notificar paciente sobre ausência do estagiário" → CP4 — Agendamento, confirmação e remarcação → OE3. Dependência: RF16.

#### Modelo de domínio da CP4

- **Sessão:** entidade central, com atributos paciente, estagiário, data/hora, status (agendada, confirmada, cancelada, realizada, falta) e motivo do cancelamento, quando houver.
- **Relações:** Sessão (N) — Paciente (1); Sessão (N) — Estagiário (1).
- **Regra de integridade:** uma Sessão só pode ser criada se já existir o vínculo Paciente–Estagiário definido pela CP5.
- **Evento "lembrete enviado":** deve ficar auditável, mesmo sem constituir entidade persistente central.

#### Pontos a validar com a FBr (CP4)

- Prazo mínimo de antecedência para cancelar ou remarcar uma sessão.
- Número máximo de remarcações permitidas por paciente dentro do ciclo de 8 a 10 sessões.
- Canal do lembrete automático (e-mail, SMS ou ambos) e antecedência de envio.
- Quem pode registrar o cancelamento em nome do estagiário (o próprio estagiário, o supervisor ou a secretaria).

### Distribuição de casos entre supervisores e estagiários (CP5)

A CP5 foi decomposta em nove features, organizadas em três conjuntos: distribuição dos casos entre supervisores conforme a área de especialidade, vinculação de cada paciente a um estagiário responsável e acompanhamento/reorganização dos vínculos já estabelecidos, apoiando a organização da reunião inicial de estágio e a rastreabilidade da responsabilidade sobre cada caso ([Solução Proposta, §2.3](../../unidade-1/solucao-proposta.md#23-caracteristicas-de-produto-mapeadas-com-os-objetivos-especificos)).

A distribuição depende da classificação de prioridade realizada na CP2 e da fila de espera da CP3, enquanto o acesso ao prontuário do caso pelo estagiário e pelo supervisor respeita os perfis e restrições definidos na CP12. A ordem de prioridade na distribuição (RN5.4), o limite de casos simultâneos (RN5.8), a possibilidade de atendimento em dupla (RN5.9) e o enquadramento da transferência de caso na CP5 (RF25) ainda dependem de validação com a FBr.

#### Feature — Listar casos aguardando distribuição

**RF18 — Listar casos aguardando distribuição**

O sistema deve listar, para um usuário autenticado com perfil de coordenação ou supervisor, os casos (pacientes) já triados que ainda não têm supervisor e estagiário responsáveis identificados, ordenados por prioridade, para apoiar a reunião inicial de estágio. Casos já distribuídos deixam de aparecer na lista. Quando não houver caso pendente, o sistema deve informar isso de forma clara.

_Critérios de aceitação:_

- Dado um conjunto de pacientes triados, quando a coordenação ou o supervisor abrir a lista de casos aguardando distribuição, então o sistema deve exibir somente os casos sem supervisor e estagiário responsáveis, ordenados por prioridade.
- Dado um caso já distribuído a um supervisor, quando a lista de casos pendentes for exibida, então esse caso não deve aparecer nela.
- Dado que todos os casos triados já foram distribuídos, quando um usuário autorizado abrir a lista de casos aguardando distribuição, então o sistema deve informar que não há casos pendentes.

_Rastreabilidade:_ Feature "Listar casos aguardando distribuição" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5/OE2.

#### Feature — Registrar áreas de especialidade do supervisor

**RF19 — Registrar áreas de especialidade do supervisor**

O sistema deve permitir que a coordenação registre e mantenha as áreas de especialidade de cada supervisor, que servem de critério para a distribuição dos casos (RF20). Cada supervisor pode ter uma ou mais áreas de especialidade, e a manutenção dessa lista deve ser possível pela interface, sem intervenção técnica. Alterar as áreas de um supervisor não deve afetar os casos já distribuídos a ele.

_Critérios de aceitação:_

- Dado um supervisor cadastrado sem áreas de especialidade, quando a coordenação registrar uma ou mais áreas para ele, então o sistema deve associar as áreas informadas ao supervisor.
- Dado um supervisor que já responde por casos distribuídos, quando a coordenação remover uma de suas áreas de especialidade, então os casos já distribuídos a ele devem permanecer sob sua responsabilidade.

_Rastreabilidade:_ Feature "Registrar áreas de especialidade do supervisor" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5.

#### Feature — Distribuir caso a supervisor conforme área de especialidade

**RF20 — Distribuir caso a supervisor conforme área de especialidade**

O sistema deve permitir que a coordenação atribua cada caso pendente (RF18) a um supervisor, considerando a compatibilidade entre a área de especialidade exigida pelo caso e as áreas registradas para os supervisores (RF19). Um caso só pode ter um supervisor responsável vigente por vez, e a atribuição deve ficar registrada com data e autor. Quando não houver supervisor compatível com a área exigida, o sistema deve informar essa condição e permitir a atribuição manual a outro supervisor, registrando a exceção. A reatribuição de um caso que já possui supervisor deve ser feita exclusivamente pela transferência de caso (RF25), e não por uma nova distribuição.

_Critérios de aceitação:_

- Dado um caso que exige determinada área de especialidade e um supervisor que atua nessa área, quando a coordenação distribuir o caso a esse supervisor, então o sistema deve registrar o supervisor como responsável pelo caso, com data e autor da atribuição.
- Dado um caso sem supervisor compatível disponível, quando a coordenação tentar distribuí-lo, então o sistema deve informar a ausência de compatibilidade e permitir a atribuição manual, registrando a exceção.
- Dado um caso que já possui supervisor responsável, quando um usuário tentar distribuí-lo novamente, então o sistema deve bloquear a ação e orientar o uso da transferência de caso (RF25).

_Rastreabilidade:_ Feature "Distribuir caso a supervisor conforme área de especialidade" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5. Dependência: RF18, RF19.

#### Feature — Vincular paciente a estagiário responsável

**RF21 — Vincular paciente a estagiário responsável**

O sistema deve permitir que o supervisor vincule cada paciente sob sua responsabilidade a um estagiário ativo no semestre, responsável pelo atendimento. Após o vínculo, o caso passa a ter estagiário e supervisor identificados, e o estagiário vinculado passa a ter acesso ao prontuário do caso, respeitando os perfis e restrições definidos na CP12. O supervisor só pode vincular estagiários a casos sob sua própria responsabilidade, e o vínculo deve ficar registrado com data e autor.

_Critérios de aceitação:_

- Dado um caso sob a responsabilidade de um supervisor, quando ele vincular um estagiário ao caso, então o sistema deve registrar o estagiário como responsável pelo caso e conceder a ele acesso ao caso.
- Dado um caso sob a responsabilidade de um supervisor, quando outro supervisor tentar vincular um estagiário a esse caso, então o sistema deve negar a ação.

_Rastreabilidade:_ Feature "Vincular paciente a estagiário responsável" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5. Dependência: RF20.

#### Feature — Consultar responsáveis pelo caso

**RF22 — Consultar responsáveis pelo caso**

O sistema deve exibir, para cada caso, o estagiário e o supervisor responsáveis, para uso da secretaria no agendamento e da coordenação no acompanhamento. A consulta deve exibir apenas o nome do estagiário e do supervisor responsáveis, sem expor dados clínicos a perfis que não têm acesso ao prontuário, e casos ainda sem responsáveis devem ser sinalizados como pendentes de distribuição.

_Critério de aceitação:_ dado um caso com estagiário e supervisor já vinculados, quando a secretaria, o estagiário, o supervisor ou a coordenação consultarem o caso, então o sistema deve exibir os responsáveis sem exibir dados clínicos.

_Rastreabilidade:_ Feature "Consultar responsáveis pelo caso" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5. Dependência: RF21.

#### Feature — Consultar casos sob responsabilidade do estagiário ou supervisor

**RF23 — Consultar casos sob responsabilidade do estagiário ou supervisor**

O sistema deve permitir que o estagiário ou o supervisor consultem a lista de casos vinculados a eles, identificando o paciente, a prioridade e a situação de cada caso. O estagiário deve visualizar apenas os casos vinculados a ele, enquanto o supervisor deve visualizar os casos sob sua responsabilidade e os de seus estagiários.

_Critério de aceitação:_ dado um estagiário vinculado a um conjunto de casos, quando ele abrir a lista de seus casos, então o sistema deve exibir exclusivamente os casos vinculados a ele.

_Rastreabilidade:_ Feature "Consultar casos sob responsabilidade do estagiário ou supervisor" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5. Dependência: RF21.

#### Feature — Visualizar distribuição de casos por supervisor

**RF24 — Visualizar distribuição de casos por supervisor**

O sistema deve mostrar à coordenação quantos casos ativos cada supervisor e cada estagiário têm sob sua responsabilidade, apoiando o equilíbrio da carga entre supervisores e alimentando o indicador "distribuição de casos por supervisor" da CP11.

_Critério de aceitação:_ dado o conjunto de casos distribuídos, quando a coordenação consultar a visão de distribuição, então o sistema deve apresentar o número de casos ativos por supervisor e por estagiário, refletindo a situação atual.

_Rastreabilidade:_ Feature "Visualizar distribuição de casos por supervisor" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5; alimenta CP11 — Indicadores e relatórios institucionais. Dependência: RF20.

#### Feature — Transferir caso para outro estagiário ou supervisor

**RF25 — Transferir caso para outro estagiário ou supervisor**

O sistema deve permitir que o supervisor ou a coordenação transfiram um caso ativo para outro estagiário ou supervisor — por exemplo, ao término do estágio, na saída do estagiário ou por reorganização da carga —, preservando o histórico do paciente (sessões, evolução e vínculos anteriores). A transferência deve exigir a indicação do novo responsável e do motivo, e deve ficar registrada, vinculada à atribuição anterior. A partir da transferência, o responsável anterior perde o acesso ao caso, e o novo responsável passa a ter acesso a todo o histórico.

_Critério de aceitação:_ dado um caso vinculado a um estagiário que concluiu o estágio, quando o supervisor transferir o caso para outro estagiário, então o sistema deve registrar o novo estagiário como responsável, manter o histórico do paciente disponível a ele e revogar o acesso do estagiário anterior.

_Rastreabilidade:_ Feature "Transferir caso para outro estagiário ou supervisor" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5. Dependência: RF21.

#### Feature — Consultar histórico de responsáveis do caso

**RF26 — Consultar histórico de responsáveis do caso**

O sistema deve permitir consultar a sequência de supervisores e estagiários que já foram responsáveis por um caso, com a data e o motivo de cada mudança, listados em ordem cronológica. O acesso a esse histórico deve respeitar os perfis de acesso definidos na CP12.

_Critério de aceitação:_ dado um caso que já passou por uma ou mais transferências de responsável, quando um usuário autorizado consultar seu histórico, então o sistema deve listar, em ordem cronológica, cada vínculo com responsável, período e motivo do encerramento.

_Rastreabilidade:_ Feature "Consultar histórico de responsáveis do caso" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5. Dependência: RF21, RF25.

#### Pontos a validar com a FBr (CP5)

- Pode existir um limite de casos simultâneos por estagiário e por supervisor (RN5.8)? Se sim, qual o valor?
- Um caso pode ser atendido por mais de um estagiário, em regime de atendimento em dupla (RN5.9)?

### Prontuário eletrônico (CP6)

A CP6 foi decomposta em uma feature: a consulta ao prontuário eletrônico do paciente pelo estagiário responsável e por seu supervisor. O registro da evolução de cada sessão passa a ser tratado como capacidade própria na CP7 — Registro de evolução por sessão, e a consolidação do relatório final do ciclo de atendimento passa a ser tratada na CP8 — Geração do relatório final de evolução, conforme a decomposição em três características já registrada na [Solução Proposta, §2.3](../../unidade-1/solucao-proposta.md#23-caracteristicas-de-produto-mapeadas-com-os-objetivos-especificos). Esta seção substitui a decomposição consolidada anteriormente declarada sob o rótulo único "CP6" (issue #34), que reunia prontuário, evolução e relatório final antes da separação em CP6/CP7/CP8.

O acesso ao prontuário depende do vínculo de responsabilidade definido na CP5 e está sujeito à restrição de acesso do RF52 — Restringir acesso ao prontuário (CP12). O conteúdo obrigatório do prontuário ainda depende de validação com a FBr.

#### Feature — Consultar prontuário do paciente

**RF27 — Consultar prontuário do paciente**

O sistema deve apresentar ao estagiário responsável e ao seu supervisor o prontuário eletrônico do paciente vinculado ao caso, reunindo a identificação do caso e seus registros clínicos de evolução. A consulta deve refletir o vínculo de responsabilidade vigente, inclusive após transferência de caso (RF25), e preservar a associação dos registros ao paciente e ao ciclo de atendimento correspondente. O acesso de outros perfis ao conteúdo clínico segue a restrição do RF52.

_Critérios de aceitação:_

- Dado um caso vinculado a um estagiário e supervisor, quando um deles abrir o prontuário, então o sistema deve apresentar os registros clínicos associados ao paciente e ao ciclo correspondente.
- Dado um caso transferido para novo responsável, quando o novo estagiário ou supervisor autorizado abrir o prontuário, então deve encontrar os registros anteriores preservados.
- Dado um usuário sem vínculo clínico vigente com o caso, quando tentar abrir o prontuário, então o sistema deve negar acesso ao conteúdo clínico.

_Rastreabilidade:_ Feature "Consultar prontuário do paciente" → CP6 — Prontuário eletrônico → OE5/OE6. Dependência: CP5; restrição transversal: RF52 (CP12).

#### Modelo de domínio da CP6

- **Paciente e caso:** o paciente pode ter mais de um ciclo de atendimento; cada caso mantém os vínculos clínicos vigentes e anteriores definidos na CP5.
- **Prontuário:** reúne os registros clínicos do paciente, separados por ciclo e acessíveis apenas aos responsáveis clínicos autorizados; reúne as evoluções declaradas na CP7 e o relatório final declarado na CP8.

#### Pontos a validar com a FBr (CP6)

- Confirmar os campos obrigatórios do prontuário eletrônico.
- Confirmar se o prontuário deve reunir, além das evoluções, qualquer outro tipo de registro clínico não coberto pela CP7 e pela CP8.

### Registro de evolução por sessão (CP7)

A CP7 foi decomposta em quatro features: registro da evolução de uma sessão realizada, correção de um registro já salvo, consulta da evolução de uma sessão específica e consulta do histórico consolidado de evoluções do ciclo de atendimento — esta última incorporada nesta revisão a partir da decomposição anteriormente consolidada sob o rótulo único "CP6" (issue #34), que também tratava do prontuário e do relatório final antes da separação em três características (CP6/CP7/CP8) confirmada na [Solução Proposta, §2.3](../../unidade-1/solucao-proposta.md#23-caracteristicas-de-produto-mapeadas-com-os-objetivos-especificos).

O registro de evolução depende de uma sessão já realizada (CP4) e do vínculo entre paciente e estagiário responsável (CP5). O acesso ao conteúdo registrado é restrito ao estagiário responsável e ao seu supervisor, conforme os perfis definidos na CP12 — Segurança, sigilo e controle de acesso. A evolução registrada alimenta o prontuário eletrônico (CP6) e, ao fim do ciclo, o relatório final de evolução (CP8).

O conteúdo clínico obrigatório de um registro de evolução, a possibilidade e o prazo de correção após o registro original, e se uma sessão pode ter mais de um registro de evolução (ex.: complementos) ainda dependem de validação com a FBr. Como referência para essa definição, a FBr descreveu, na reunião de 26/08/2026 ([ata](../../unidade-1/reunioes.md)), que a evolução esperada é um resumo objetivo da sessão ("um resuminho"), e não uma transcrição integral do atendimento — o que orienta o formato, mas não substitui a definição formal dos campos obrigatórios.

#### Feature — Registrar evolução da sessão realizada

**RF28 — Registrar evolução da sessão realizada**

O sistema deve permitir que o estagiário responsável registre a evolução de uma sessão já realizada, vinculando o registro ao paciente, ao ciclo de atendimento e à sessão de origem. Cada registro deve identificar o autor e o momento do registro. O sistema deve impedir que uma evolução seja registrada para sessão de outro paciente ou por estagiário sem vínculo vigente com o caso, e deve impedir o registro de evolução para sessão que ainda não foi realizada.

_Critérios de aceitação:_

- Dada uma sessão realizada de um paciente sob responsabilidade do estagiário, quando ele registrar uma evolução válida, então o sistema deve associar o registro à sessão, ao paciente e ao ciclo, com autor e data/hora.
- Dada uma sessão de outro paciente, ou um estagiário sem vínculo vigente com o caso, quando houver tentativa de registrar evolução, então o sistema deve recusar a operação.
- Dada uma sessão ainda não realizada (agendada, confirmada, cancelada ou falta), quando houver tentativa de registrar evolução para ela, então o sistema deve impedir o registro.

_Rastreabilidade:_ Feature "Registrar evolução da sessão realizada" → CP7 — Registro de evolução por sessão → OE5/OE2. Dependência: CP4 (sessão realizada), CP5 (vínculo estagiário-paciente); restrição transversal: CP12 — Segurança, sigilo e controle de acesso.

#### Feature — Corrigir evolução registrada

**RF29 — Corrigir evolução registrada**

O sistema deve permitir que o estagiário responsável corrija um registro de evolução já salvo, dentro de um prazo a ser definido com a FBr, preservando o conteúdo original para fins de auditoria — não deve haver sobrescrita silenciosa. Toda correção deve registrar autor, data/hora e, quando aplicável, o motivo da alteração.

_Critérios de aceitação:_

- Dado um registro de evolução já salvo pelo próprio estagiário, dentro do prazo permitido, quando ele corrigir o conteúdo, então o sistema deve preservar a versão original e registrar a nova versão com autor, data/hora e motivo.
- Dado um registro de evolução fora do prazo permitido para correção, quando houver tentativa de alteração, então o sistema deve impedir a operação.
- Dado um usuário diferente do autor original, quando tentar corrigir um registro, então o sistema deve negar a ação, salvo exceção para o supervisor, caso essa exceção seja aprovada pela FBr.

_Rastreabilidade:_ Feature "Corrigir evolução registrada" → CP7 — Registro de evolução por sessão → OE5. Dependência: RF28.

#### Feature — Consultar evolução de uma sessão específica

**RF30 — Consultar evolução de uma sessão específica**

O sistema deve permitir que o estagiário responsável e o seu supervisor consultem o registro de evolução vinculado a uma sessão específica, incluindo eventuais correções e seus históricos. O acesso a esse conteúdo deve respeitar a restrição de acesso ao prontuário definida na CP12.

_Critérios de aceitação:_

- Dada uma sessão com evolução registrada, quando o estagiário responsável ou o supervisor consultarem essa sessão, então o sistema deve apresentar o conteúdo da evolução, incluindo o histórico de correções, se houver.
- Dado um usuário sem vínculo clínico vigente com o caso, quando tentar consultar a evolução de uma sessão, então o sistema deve negar o acesso.

_Rastreabilidade:_ Feature "Consultar evolução de uma sessão específica" → CP7 — Registro de evolução por sessão → OE5. Dependência: RF28, RF29; restrição transversal: CP12.

#### Feature — Consultar histórico de evolução do paciente

**RF31 — Consultar histórico de evolução do paciente**

O sistema deve permitir que o estagiário responsável e seu supervisor consultem, no prontuário, as evoluções registradas para o ciclo de atendimento do paciente, identificando a sessão, a data e o autor de cada registro. O histórico deve manter os registros anteriores quando houver transferência de responsável, sem misturar ciclos distintos do mesmo paciente. Esta feature difere da consulta de uma sessão específica (RF30) por reunir, em uma única visão cronológica, todas as evoluções do ciclo, em vez do registro de uma sessão isolada.

_Critérios de aceitação:_

- Dado um ciclo com evoluções registradas, quando usuário clínico autorizado consultar o histórico, então o sistema deve apresentar os registros vinculados às respectivas sessões, em ordem cronológica.
- Dado um ciclo sem evoluções, quando o histórico for aberto, então o sistema deve informar que não há registros, sem exibir dados de outro ciclo.
- Dado um usuário sem acesso ao prontuário, quando tentar consultar o histórico, então o sistema deve negar a consulta.

_Rastreabilidade:_ Feature "Consultar histórico de evolução do paciente" → CP7 — Registro de evolução por sessão → OE5/OE2. Dependência: RF27 (CP6), RF28; restrição transversal: RF52 (CP12).

#### Modelo de domínio da CP7

- **Evolução:** entidade vinculada a Sessão, Paciente e Ciclo de atendimento; atributos: conteúdo, autor, data/hora de criação; pode ter versões (original + correções).
- **Relação:** Evolução (N) — Sessão (1) — presume-se, até validação contrária, que uma sessão tem no máximo um registro de evolução, sujeito a correção.
- **Correção:** sub-registro ou versão de Evolução, preservando o conteúdo anterior, autor e motivo da alteração.

#### Pontos a validar com a FBr (CP7)

- Conteúdo clínico obrigatório de um registro de evolução.
- Prazo e limites para correção de um registro já salvo.
- Se uma sessão pode ter mais de um registro de evolução (ex.: complementos) ou apenas um, sujeito a correção.
- Se o supervisor pode corrigir um registro do estagiário, ou apenas visualizar e solicitar correção a ele.

### Geração do relatório final de evolução (CP8)

A CP8 foi decomposta em uma feature: a geração do relatório final de evolução do ciclo de atendimento, a partir das evoluções registradas na CP7, para revisão do supervisor responsável, conforme a [Solução Proposta, §2.3](../../unidade-1/solucao-proposta.md#23-caracteristicas-de-produto-mapeadas-com-os-objetivos-especificos). Esta seção substitui a decomposição anteriormente consolidada sob o rótulo único "CP6" (issue #34) para a parte referente ao relatório final.

#### Feature — Gerar relatório final de evolução

**RF32 — Gerar relatório final de evolução**

O sistema deve permitir que o estagiário responsável gere um relatório final do ciclo de atendimento a partir das evoluções registradas, para revisão do supervisor responsável antes de qualquer conclusão institucional. O relatório deve identificar o paciente, o ciclo e os registros de origem utilizados e permitir verificar a correspondência entre o conteúdo consolidado e o histórico do prontuário. O sistema não deve completar lacunas clínicas por inferência. A quantidade de 8 a 10 sessões é a referência descrita na Solução Proposta; exceções, campos obrigatórios, formato de saída, aprovação e assinatura serão definidos com a FBr antes da implementação.

Conforme confirmado pela Clínica Escola na reunião de 26/08/2026 ([ata](../../unidade-1/reunioes.md)), o relatório final não se destina apenas à revisão interna do supervisor: ao final do ciclo, o relatório aprovado deve ser entregue ao próprio paciente, apresentando como ele estava, como evoluiu ao longo do acompanhamento e orientações sobre a continuidade do seu desenvolvimento. Após a aprovação pelo supervisor, o sistema deve, portanto, permitir que o relatório seja disponibilizado ao paciente (ou ao seu responsável legal, quando menor de idade), e não apenas ao corpo clínico e à coordenação. O canal exato dessa entrega (download pelo próprio paciente mediante verificação de identidade, envio por e-mail, ou entrega impressa pela secretaria) ainda depende de validação com a FBr.

_Critérios de aceitação:_

- Dado um ciclo com evoluções registradas, quando o estagiário responsável solicitar o relatório, então o sistema deve gerar uma versão vinculada ao ciclo e aos registros de origem, disponível ao supervisor do caso para revisão.
- Dado um ciclo sem evoluções registradas, quando houver solicitação do relatório, então o sistema deve informar a ausência de registros de origem e não produzir conteúdo clínico presumido.
- Dado um usuário sem vínculo clínico vigente com o caso, quando tentar gerar ou consultar o relatório, então o sistema deve negar o acesso.
- Dada uma evolução ausente ou incompleta no período selecionado, quando o relatório for gerado, então a lacuna deve permanecer identificável para revisão humana, sem texto clínico criado pelo sistema.
- Dado um relatório final aprovado pelo supervisor, quando a aprovação for confirmada, então o sistema deve torná-lo disponível para entrega ao paciente (ou ao seu responsável legal, quando menor de idade), e não apenas ao corpo clínico.

_Rastreabilidade:_ Feature "Gerar relatório final de evolução" → CP8 — Geração do relatório final de evolução → OE5/OE6. Dependência: RF28, RF31 (CP7); restrição transversal: RF52 (CP12).

#### Modelo de domínio da CP8

- **Relatório final:** documento derivado das evoluções de um ciclo (CP7), com versão e registros de origem identificáveis; seu estado de revisão e aprovação depende de regra institucional; após aprovado, é destinado tanto ao acervo institucional quanto à entrega ao paciente.

#### Pontos a validar com a FBr (CP8)

- Definir os campos obrigatórios do relatório final.
- Confirmar como a realização da sessão é registrada e como corrigir registros.
- Definir critérios de encerramento e exceções ao ciclo de 8 a 10 sessões.
- Definir revisão, aprovação e assinatura do relatório.
- Definir o canal de entrega do relatório ao paciente (download com verificação de identidade, e-mail ou entrega impressa) — a exigência da entrega em si já foi confirmada pela FBr na reunião de 26/08/2026.

### Controle de assiduidade e alertas (CP9)

A CP9 foi decomposta em cinco features, organizadas em dois conjuntos: controle de faltas do paciente e controle de faltas do estagiário. Diferentemente das demais CPs, esta decomposição não foi entregue no ciclo original de elicitação — a issue [#35](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/35), atribuída a Nicolas, foi encerrada automaticamente pela PR #58, mas o conteúdo efetivamente declarado por essa PR corresponde à CP7 — Registro de evolução por sessão, e não à decomposição de assiduidade e faltas descrita na própria issue. A declaração abaixo parte diretamente dos pontos já confirmados com a Clínica Escola na reunião de 26/08/2026 ([ata](../../unidade-1/reunioes.md)): (i) a regra de desligamento do paciente é de duas faltas consecutivas ou não justificadas; (ii) ao atingir esse limite, deve haver um alerta visual (destaque em vermelho) para a equipe responsável; e (iii) o desligamento por faltas libera a vaga do paciente, que deve ser proativamente realocada a outro inscrito na fila de espera (CP3), em vez de permanecer ociosa.

#### Controle de faltas do paciente

Este conjunto trata da contagem cumulativa de faltas do paciente e das consequências previstas quando o limite é atingido. Consome os eventos já gerados pela CP4 — quando uma sessão não é confirmada dentro do prazo (RF14) ou é cancelada pelo paciente (RF15) — e complementa a CP4 com o registro do não comparecimento efetivo à sessão presencial, que ainda não havia sido declarado em nenhuma feature.

#### Feature — Registrar falta do paciente na sessão

**RF33 — Registrar falta do paciente na sessão**

O sistema deve permitir que o estagiário responsável, ou a secretaria, registre que o paciente não compareceu a uma sessão agendada e presencial (RF10), diferenciando esse registro do cancelamento (RF15): a falta é registrada quando a sessão ocorre sem o comparecimento do paciente, sem cancelamento prévio. O sistema deve atualizar o status da sessão para "falta do paciente", associando data, horário e usuário que efetuou o registro.

_Critérios de aceitação:_

- Dada uma sessão agendada e presencial cujo horário já passou sem confirmação de comparecimento nem cancelamento, quando o estagiário responsável ou a secretaria registrar a falta, então o sistema deve atualizar o status da sessão para "falta do paciente", com data, horário e usuário responsável pelo registro.
- Dada uma sessão já cancelada (RF15) ou já registrada como realizada, quando houver tentativa de registrar falta, então o sistema deve impedir a operação.
- Dado o registro de uma falta, então o sistema deve gerar o evento consumido pela contagem cumulativa (RF34).

_Rastreabilidade:_ Feature "Registrar falta do paciente na sessão" → CP9 — Controle de assiduidade e alertas → OE3/OE4. Dependência: RF10, RF14, RF15 (CP4).

#### Feature — Contabilizar faltas consecutivas do paciente

**RF34 — Contabilizar faltas consecutivas do paciente**

O sistema deve manter, por paciente, a contagem de faltas consecutivas ou não justificadas, consumindo os eventos de não confirmação sinalizada (RF14), cancelamento avaliado como falta (RF15) e falta registrada na sessão (RF33). Uma sessão confirmada e realizada zera a contagem consecutiva. O critério de "não justificada" e o prazo mínimo de antecedência do cancelamento ainda dependem de validação com a FBr; até essa definição, todo cancelamento registrado pelo paciente (RF15) conta como falta para fins de contagem, de forma conservadora.

_Critérios de aceitação:_

- Dado um paciente sem faltas em aberto, quando uma falta for registrada (RF33) ou um cancelamento for avaliado como falta (RF15), então o sistema deve incrementar a contagem consecutiva do paciente em uma unidade.
- Dado um paciente com uma falta em aberto, quando ele comparecer a uma sessão confirmada e realizada, então o sistema deve zerar a contagem consecutiva.
- Dado um paciente cuja contagem consecutiva atinja duas faltas, então o sistema deve disparar o alerta de limite (RF35).

_Rastreabilidade:_ Feature "Contabilizar faltas consecutivas do paciente" → CP9 — Controle de assiduidade e alertas → OE3/OE4. Dependência: RF14, RF15 (CP4), RF33.

#### Feature — Emitir alerta de limite de faltas atingido

**RF35 — Emitir alerta de limite de faltas atingido**

Quando a contagem de faltas consecutivas de um paciente atingir o limite de duas faltas (RF34), o sistema deve emitir um alerta visual, com destaque em vermelho, visível à secretaria, ao estagiário responsável e à coordenação, sinalizando a necessidade de avaliar o desligamento do paciente (RF36). O alerta deve permanecer visível até que a decisão de desligamento seja registrada.

_Critérios de aceitação:_

- Dado um paciente cuja contagem de faltas consecutivas atinja duas faltas, quando o limite for atingido, então o sistema deve exibir um alerta com destaque em vermelho, visível à secretaria, ao estagiário responsável e à coordenação.
- Dado um alerta já emitido para um paciente, quando a decisão de desligamento for registrada (RF36), então o sistema deve remover o alerta pendente correspondente.

_Rastreabilidade:_ Feature "Emitir alerta de limite de faltas atingido" → CP9 — Controle de assiduidade e alertas → OE3/OE4. Dependência: RF34.

#### Feature — Desligar paciente por faltas e liberar vaga

**RF36 — Desligar paciente por faltas e liberar vaga**

O sistema deve permitir que a secretaria ou a coordenação registre o desligamento do paciente cujo limite de faltas foi atingido (RF35), informando a data e o responsável pela decisão. Ao confirmar o desligamento, o sistema deve liberar a vaga do paciente e disparar a realocação proativa a outro inscrito na fila de espera (CP3), em vez de deixá-la ociosa.

_Critérios de aceitação:_

- Dado um paciente com alerta de limite de faltas pendente (RF35), quando a secretaria ou a coordenação confirmar o desligamento, então o sistema deve registrar a decisão com data e responsável, e atualizar o status do paciente para "desligado por faltas".
- Dado um paciente desligado por faltas, então o sistema deve liberar sua vaga e sinalizá-la para realocação ao próximo inscrito elegível na fila de espera (CP3 — RF7).
- Dado um paciente sem alerta de limite de faltas pendente, quando houver tentativa de registrar o desligamento por faltas, então o sistema deve impedir a operação.

_Rastreabilidade:_ Feature "Desligar paciente por faltas e liberar vaga" → CP9 — Controle de assiduidade e alertas → OE3/OE4. Dependência: RF35. Integração: CP3 — Fila de espera e consulta de posição (RF7).

#### Controle de faltas do estagiário

O escopo da CP9 também prevê o controle das faltas do estagiário, mencionado na Solução Proposta, mas a reunião de 26/08/2026 não tratou das regras aplicáveis a esse lado — apenas do desligamento e da liberação da vaga do paciente. A feature abaixo se limita a consolidar, para fins de acompanhamento pela supervisão, as ausências do estagiário já registradas pela CP4 (RF16); regras de contagem, limite ou consequência para o estagiário ainda precisam ser definidas com a FBr e com a coordenação do estágio, e não são presumidas aqui.

#### Feature — Consolidar faltas do estagiário para a supervisão

**RF37 — Consolidar faltas do estagiário para a supervisão**

O sistema deve permitir que o supervisor consulte, para os estagiários sob sua supervisão, a relação de sessões canceladas por ausência do estagiário (RF16) em um período selecionado, sem aplicar contagem de limite, alerta ou consequência automática, até que essas regras sejam definidas com a FBr.

_Critérios de aceitação:_

- Dado um supervisor autenticado, quando ele consultar as faltas de um estagiário sob sua supervisão em um período selecionado, então o sistema deve listar as sessões canceladas por ausência do estagiário (RF16) nesse período.
- Dado um usuário sem vínculo de supervisão com o estagiário, quando tentar consultar essa relação, então o sistema deve negar o acesso.

_Rastreabilidade:_ Feature "Consolidar faltas do estagiário para a supervisão" → CP9 — Controle de assiduidade e alertas → OE3/OE4. Dependência: RF16 (CP4). Restrição transversal: CP12 — Segurança, sigilo e controle de acesso.

#### Modelo de domínio da CP9

- **Falta do paciente:** evento vinculado a uma sessão, originado por não comparecimento (RF33), não confirmação (RF14) ou cancelamento avaliado como falta (RF15); contribui para a contagem consecutiva do paciente (RF34).
- **Contagem de faltas:** estado cumulativo por paciente, zerado por comparecimento confirmado e incrementado por falta; ao atingir duas unidades, dispara o alerta (RF35) e habilita o desligamento (RF36).
- **Falta do estagiário:** evento vinculado a uma sessão cancelada por ausência do estagiário (RF16); consolidado para a supervisão (RF37), sem contagem, limite ou consequência automática ainda definidos.

#### Pontos a validar com a FBr (CP9)

- Definir o que caracteriza uma falta "não justificada" e a diferença de tratamento em relação a uma falta justificada.
- Confirmar se todo cancelamento fora do prazo mínimo de antecedência (RF15, ainda a definir na CP4) deve contar como falta, ou apenas os cancelamentos tardios.
- Definir regras de contagem, limite e consequência para as faltas do estagiário.
- Confirmar quem pode reverter um desligamento por faltas registrado por engano, e sob qual critério.
- Definir o prazo entre o desligamento do paciente e a liberação efetiva da vaga para a fila de espera.

### Registros administrativos do atendimento (CP10)

A CP10 foi decomposta em sete features, organizadas em dois conjuntos que reúnem as antigas características declaradas separadamente como "Registro da Contribuição Social" e "Emissão de Declaração de Comparecimento", agrupadas em uma única CP10 — Registros administrativos do atendimento, conforme a [Solução Proposta, §2.3](../../unidade-1/solucao-proposta.md#23-caracteristicas-de-produto-mapeadas-com-os-objetivos-especificos): (i) o registro do pagamento da taxa única de responsabilidade social de R$ 35,00, devida na primeira sessão, distinguindo quem efetivou e quem não efetivou o pagamento; e (ii) a emissão automática da declaração de comparecimento do paciente, com data, horário e nome do estagiário responsável.

#### Contribuição social

O controle da taxa é feito hoje à mão ([ata de 26/08/2026](../../unidade-1/reunioes.md)). As features deste conjunto permitem registrar o pagamento e distinguir quem efetivou e quem não efetivou a contribuição, inclusive no momento da primeira sessão, quando a taxa é exigida. O registro dos pagamentos é de responsabilidade da **secretaria**, e a consulta também pode ser feita pela **coordenação**. O estagiário responsável vê apenas a situação (efetivada ou pendente) dos pacientes vinculados a ele, conforme os perfis definidos na CP12.

#### Feature — Registrar pagamento da contribuição social do paciente [#43](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/43)

**RF38 — Registrar pagamento da contribuição social**

O sistema deve permitir que um usuário com perfil de secretaria registre o pagamento da contribuição social de um paciente, informando a data do pagamento e a forma de pagamento, com o valor de R$ 35,00 preenchido por padrão. Cada paciente pode ter apenas um pagamento de contribuição social registrado por ciclo de atendimento, já que a taxa é única. Para este requisito, **ciclo de atendimento** é o período de acompanhamento de um paciente que vai da primeira sessão até o encerramento do atendimento (conclusão das sessões com o relatório final, desligamento por faltas ou desistência); se o paciente se inscrever novamente depois do encerramento, começa um novo ciclo e a taxa volta a ser devida. Essa definição é provisória até a validação com a FBr (ver Pontos a validar).

_Critérios de aceitação:_

- Dado um paciente com contribuição pendente, quando a secretaria registrar o pagamento com data e forma de pagamento, então o sistema deve marcar a contribuição do paciente como **efetivada** e guardar o valor, a data, a forma de pagamento, o usuário que registrou e a data/hora do registro.
- Dado um paciente que já possui contribuição efetivada no ciclo de atendimento atual, quando a secretaria tentar registrar um novo pagamento, então o sistema deve impedir o registro duplicado e informar a data do pagamento já registrado.
- Dado um usuário sem perfil de secretaria, quando tentar registrar um pagamento, então o sistema deve impedir a operação.

_Rastreabilidade:_ Feature "Registrar pagamento da contribuição social do paciente" → CP10 — Registros administrativos do atendimento → OE6/OE4.

#### Feature — Consultar situação da contribuição social dos pacientes [#44](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/44)

**RF39 — Consultar situação da contribuição social**

O sistema deve permitir que usuários com perfil de secretaria ou de coordenação consultem a situação da contribuição social dos pacientes em atendimento, com filtro por situação (**efetivada** ou **pendente**). Para cada paciente, a consulta deve mostrar o nome, a situação, a data da primeira sessão e, quando efetivada, a data do pagamento. A situação também deve ser indicada na agenda do dia, junto à primeira sessão do paciente, para que a pendência seja percebida no momento em que a taxa é exigida.

_Critérios de aceitação:_

- Dado que existem pacientes com contribuição efetivada e pendente, quando a secretaria filtrar por "pendente", então o sistema deve listar apenas os pacientes sem pagamento registrado no ciclo de atendimento atual.
- Dado um paciente cuja contribuição foi registrada (RF38), quando a consulta for refeita, então o paciente deve aparecer com situação "efetivada" e com a data do pagamento.
- Dado um paciente com primeira sessão agendada para hoje e contribuição pendente, quando a secretaria ou o estagiário responsável abrir a agenda do dia, então a sessão desse paciente deve exibir a indicação "contribuição pendente", que deixa de aparecer assim que o pagamento é registrado. Regra provisória, até a validação com a FBr (ver Pontos a validar): a indicação é apenas informativa e não bloqueia a sessão; a decisão sobre realizá-la continua sendo da clínica.
- Dado um estagiário, quando consultar um paciente vinculado a ele, então o sistema deve exibir somente a situação da contribuição (efetivada ou pendente), sem a forma de pagamento e sem os dados dos demais pacientes.

_Rastreabilidade:_ Feature "Consultar situação da contribuição social dos pacientes" → CP10 — Registros administrativos do atendimento → OE6/OE4. A indicação na agenda depende do agendamento da CP4.

#### Declaração de comparecimento

Este conjunto reúne cinco features que permitem que a secretaria ou o próprio paciente/responsável obtenham a declaração de comparecimento às sessões, contendo data, horário e nome do estagiário que realizou o atendimento. O objetivo é atender de imediato uma demanda recorrente dos pacientes, sem trabalho manual da secretaria. Das cinco features, as duas últimas (emissão consolidada por período e validação de autenticidade por terceiros) dependem de confirmação da demanda junto à FBr e podem ser retiradas da lista após essa validação; as demais três já têm o escopo confirmado.

#### Feature — Listar sessões com comparecimento registrado do paciente

**RF40 — Listar sessões com comparecimento registrado do paciente**

O sistema deve listar, para um usuário autenticado com perfil autorizado (secretaria, ou o próprio paciente/responsável no caso de suas próprias sessões), as sessões do paciente nas quais a presença foi registrada, para que o usuário escolha a sessão a declarar. Quando não houver sessão elegível, o sistema deve informar isso de forma clara, sem exibir erro técnico.

_Critérios de aceitação:_

- Dado um paciente com sessões registradas, quando a lista de sessões elegíveis for exibida, então devem aparecer somente as sessões com presença registrada, com data, horário e nome do estagiário.
- Dado um paciente ou responsável autenticado, quando ele acessar a lista de sessões, então deve visualizar somente as suas próprias sessões.
- Dado um paciente sem nenhuma sessão com presença registrada, quando ele acessar a área de declarações, então o sistema deve informar que não há sessões disponíveis para declaração.

_Rastreabilidade:_ Feature "Listar sessões com comparecimento registrado do paciente" → CP10 — Registros administrativos do atendimento → OE6/OE5.

#### Feature — Emitir declaração de comparecimento do paciente

**RF41 — Emitir declaração de comparecimento do paciente**

O sistema deve gerar automaticamente a declaração de comparecimento para a sessão selecionada (RF40), contendo, no mínimo, a data, o horário e o nome do estagiário que realizou o atendimento, em formato pronto para impressão ou compartilhamento. A emissão só é permitida para sessão com presença registrada; sessões com falta ou cancelamento não geram declaração. A declaração não deve conter informação clínica (queixa, prioridade, diagnóstico, evolução), preservando o sigilo do atendimento. Para paciente menor de idade, a solicitação deve ser feita pelo responsável legal. Toda emissão deve ser registrada para fins de auditoria (usuário, data/hora e sessão de origem). Os campos obrigatórios adicionais do documento (CPF, dados da instituição, assinatura ou carimbo do supervisor) ainda serão definidos com a FBr.

_Critérios de aceitação:_

- Dada uma sessão com presença registrada, quando a secretaria ou o paciente/responsável solicitar a emissão, então o sistema deve gerar o documento com a data, o horário e o nome do estagiário corretos, conforme o registro da sessão, e registrar a emissão para auditoria.
- Dada uma sessão sem presença registrada (falta ou cancelamento), quando a emissão for solicitada, então o sistema deve bloquear a emissão e informar o motivo.
- Dado um usuário sem permissão para a sessão solicitada, quando tentar emitir a declaração, então o sistema deve negar a emissão e registrar a tentativa.
- Dado um paciente autenticado, quando ele tentar emitir a declaração de uma sessão de outro paciente, então o sistema deve negar o acesso.

_Rastreabilidade:_ Feature "Emitir declaração de comparecimento do paciente" → CP10 — Registros administrativos do atendimento → OE6/OE5.

#### Feature — Reemitir declaração de comparecimento

**RF42 — Reemitir declaração de comparecimento**

O sistema deve permitir gerar novamente uma declaração já emitida (por exemplo, em caso de perda do documento), mantendo o conteúdo consistente com o registro da sessão, a menos que esse registro tenha sido corrigido desde a emissão original. Cada reemissão deve ser registrada para auditoria, distinguindo-se da emissão original.

_Critério de aceitação:_ dada uma declaração já emitida para uma sessão, quando o usuário solicitar a reemissão, então o sistema deve gerar o documento novamente com o mesmo conteúdo da emissão original (salvo correção do registro) e registrar a reemissão vinculada à emissão original.

_Rastreabilidade:_ Feature "Reemitir declaração de comparecimento" → CP10 — Registros administrativos do atendimento → OE6/OE5.

#### Feature — Emitir declaração consolidada por período

**RF43 — Emitir declaração consolidada por período**

O sistema deve permitir gerar uma única declaração que reúna várias sessões com presença registrada em um período informado pelo usuário (por exemplo, para justificar ausências recorrentes no trabalho ou na escola), incluindo apenas as sessões elegíveis dentro do período e apresentando data, horário e nome do estagiário de cada uma. Se nenhuma sessão elegível existir no período, o sistema não deve gerar o documento.

_Critério de aceitação:_ dado um período informado pelo usuário, quando a emissão consolidada for solicitada, então o sistema deve incluir somente as sessões com presença registrada dentro do período e, caso não exista nenhuma sessão elegível, informar isso e não gerar o documento.

_Rastreabilidade:_ Feature "Emitir declaração consolidada por período" → CP10 — Registros administrativos do atendimento → OE6/OE5.

#### Feature — Validar autenticidade da declaração

**RF44 — Validar autenticidade da declaração**

O sistema deve permitir que um terceiro (por exemplo, empregador ou escola) confirme que uma declaração apresentada foi emitida pela Clínica Escola FBr, por meio de um código único de verificação impresso no documento. A consulta ao código deve confirmar a autenticidade sem expor dados pessoais além dos estritamente necessários.

_Critério de aceitação:_ dado um código de verificação impresso em uma declaração emitida, quando ele for consultado, então o sistema deve confirmar a autenticidade da declaração sem expor dados pessoais além do estritamente necessário.

_Rastreabilidade:_ Feature "Validar autenticidade da declaração" → CP10 — Registros administrativos do atendimento → OE6/OE5.

#### Pontos a validar com a FBr (CP10)

- Quais formas de pagamento são aceitas e se é emitido recibo ao paciente. Na reunião de 26/08/2026 ([ata](../../unidade-1/reunioes.md)), a secretaria da FBr mencionou o Pix como uma forma de pagamento desejável, mas essa foi uma visão pessoal da secretaria durante a conversa, não uma decisão confirmada pela clínica; permanece em aberto, inclusive, se o sistema deve apenas registrar a forma de pagamento informada (como hoje redigido no RF38) ou processar o pagamento (ex.: gerar cobrança Pix).
- Se existe isenção da taxa para pacientes sem condição de pagar e, em caso positivo, quem autoriza.
- Se a sessão pode ocorrer quando a contribuição está pendente. Até a resposta, o RF39 adota a regra provisória de apenas indicar a pendência, sem bloquear a sessão.
- Se a definição de ciclo de atendimento usada no RF38 corresponde à prática da clínica, isto é, se a taxa é cobrada uma única vez por acompanhamento e novamente em caso de nova inscrição.
- Como corrigir um pagamento registrado por engano (hoje não há feature de estorno ou retificação).
- Quem emite a declaração: apenas a secretaria, o paciente pelo portal, ou ambos?
- Quais campos são obrigatórios além de data, horário e nome do estagiário (CPF, assinatura/carimbo, dados da instituição)?
- Qual o formato preferido: PDF para download, impressão, envio por e-mail/WhatsApp?
- Existe demanda por declaração consolidada de várias sessões (RF43)? Caso não exista, a feature sai da lista.
- A declaração pode indicar que o atendimento é psicológico ou deve ter texto neutro por sigilo?
- No caso de menores, o responsável solicita a declaração?

### Indicadores e Relatórios Institucionais (CP11)

A CP11 foi decomposta em duas features: consulta de indicadores operacionais e geração/exportação do relatório institucional exigido pelo CRP e pelo MEC. As duas features são de uso exclusivo do perfil **coordenação** (o único perfil de acesso, entre os definidos na CP12, com visão consolidada sobre toda a operação).

#### Feature — Consultar indicadores operacionais [#22](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/22)

**RF45 — Consultar indicadores operacionais**

O sistema deve permitir que um usuário com perfil de coordenação consulte, para um intervalo de datas selecionado (data inicial e data final), os quatro indicadores operacionais abaixo, cada um definido de forma objetiva para eliminar ambiguidade de cálculo:

1. **Vagas ocupadas** — quantidade de vagas do semestre vigente atualmente preenchidas por pacientes em atendimento ativo, em relação ao total de vagas ofertadas no semestre (ex.: 82 de 100 vagas).
2. **Tempo médio de espera** — média, em dias corridos, entre a data de inscrição do paciente e a data da primeira sessão agendada, considerando apenas os pacientes cuja primeira sessão ocorreu dentro do intervalo selecionado.
3. **Taxa de evasão** — percentual de pacientes cujo atendimento foi encerrado por desligamento (conforme regra de duas faltas da CP9 — Controle de assiduidade e alertas) antes da conclusão do ciclo de sessões previsto, em relação ao total de pacientes que estavam em atendimento ativo no intervalo selecionado.
4. **Distribuição de casos por supervisor** — quantidade de casos (pacientes) atualmente sob responsabilidade de cada supervisor, listada individualmente por supervisor.

_Critério de aceitação:_ dado um intervalo de datas válido selecionado pela coordenação, quando os indicadores forem consultados, então os quatro indicadores devem ser recalculados considerando apenas os registros pertencentes a esse intervalo, seguindo exatamente as definições acima; se não houver registros no intervalo, o indicador correspondente deve ser exibido como zero, nunca omitido ou em branco.
_Rastreabilidade:_ Feature "Consultar indicadores operacionais" → CP11 — Indicadores e relatórios institucionais.

#### Feature — Gerar e exportar relatório institucional [#23](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/23)

**RF46 — Gerar e exportar relatório institucional**

O sistema deve permitir que um usuário com perfil de coordenação gere, para um intervalo de datas selecionado, um relatório institucional que consolide na tela os quatro indicadores definidos no RF45 (vagas ocupadas, tempo médio de espera, taxa de evasão e distribuição de casos por supervisor) recalculados para esse intervalo, acompanhados do período de referência (data inicial e final) e da data e hora de geração; e deve permitir que a coordenação exporte esse mesmo relatório em arquivo PDF, preservando o conteúdo exibido em tela, para envio à FBr ou impressão.

_Critérios de aceitação:_

- Dado um intervalo de datas selecionado, quando a coordenação solicitar a geração do relatório, então o sistema deve exibir os quatro indicadores do RF45 recalculados para esse intervalo, o período de referência utilizado e a data/hora de geração.
- Dado um relatório institucional já gerado nesta mesma operação, quando a coordenação solicitar a exportação, então o sistema deve produzir um arquivo em formato PDF com o mesmo conteúdo exibido na tela, disponível para download imediato.

_Rastreabilidade:_ Feature "Gerar e exportar relatório institucional" → CP11 — Indicadores e relatórios institucionais.

### Segurança, Sigilo e Controle de Acesso (CP12)

A CP12 foi decomposta em oito features, organizadas em três conjuntos: autenticação, controle de acesso por perfil e proteção de dados. Elas respondem à restrição mais crítica apontada pelo cliente, o sigilo das informações psicológicas ([Seção 1.5](../../unidade-1/cenario-atual.md#15-desafios-do-projeto)), e atendem à LGPD e às normas do Conselho Federal de Psicologia (CFP).

Os perfis de acesso são cinco: **paciente**, **secretaria**, **estagiário**, **supervisor** e **coordenação**. Os quatro perfis institucionais acessam o sistema com e-mail e senha. O paciente (ou seu responsável legal) não possui conta nem senha, já que parte do público tem pouca familiaridade com tecnologia: as páginas públicas, como a inscrição, não exigem identificação, e o acesso às informações do próprio paciente (posição na fila da CP3 e declarações da CP10) é liberado por uma verificação de identidade feita a cada consulta.

#### Feature — Autenticar usuário institucional [#45](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/45)

**RF47 — Autenticar usuário institucional**

O sistema deve permitir que usuários institucionais (secretaria, estagiário, supervisor e coordenação) acessem o sistema informando e-mail e senha. Após a autenticação, o sistema deve apresentar somente as funcionalidades permitidas para o perfil do usuário.

_Critérios de aceitação:_

- Dado um usuário ativo, quando informar e-mail e senha corretos, então o sistema deve autenticá-lo e exibir apenas as funcionalidades do seu perfil.
- Dado um e-mail ou uma senha incorretos, quando o usuário tentar entrar, então o sistema deve negar o acesso com uma mensagem genérica, sem indicar qual dos dois campos está errado.
- Dado um usuário desativado (RF51), quando tentar entrar com as credenciais antigas, então o sistema deve negar o acesso.

_Rastreabilidade:_ Feature "Autenticar usuário institucional" → CP12 — Segurança, sigilo e controle de acesso → OE7/OE5.

#### Feature — Encerrar sessão do usuário [#46](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/46)

**RF48 — Encerrar sessão do usuário**

O sistema deve permitir que o usuário autenticado encerre a própria sessão a qualquer momento, exigindo nova autenticação para voltar a acessar as funcionalidades internas. O encerramento automático por inatividade é tratado no RNF50.

_Critério de aceitação:_ dado um usuário autenticado, quando ele escolher sair, então o sistema deve encerrar a sessão e, ao voltar a qualquer página interna (inclusive pelo botão "voltar" do navegador), exigir nova autenticação.

_Rastreabilidade:_ Feature "Encerrar sessão do usuário" → CP12 — Segurança, sigilo e controle de acesso → OE7.

#### Feature — Verificar identidade do paciente ou responsável [#47](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/47)

**RF49 — Verificar identidade do paciente ou responsável**

O sistema deve exigir que o paciente, ou o responsável legal no caso de crianças e adolescentes, confirme sua identidade antes de acessar as informações do próprio paciente (posição na fila da CP3 e declarações de comparecimento da CP10). A confirmação é feita informando o CPF ou o número de inscrição e, em seguida, um código de uso único enviado ao contato (telefone ou e-mail) cadastrado na inscrição. Conhecer apenas o CPF ou o número de inscrição não deve ser suficiente para acessar as informações.

_Critérios de aceitação:_

- Dado um paciente com inscrição registrada, quando informar o CPF ou o número de inscrição e o código recebido no contato cadastrado, então o sistema deve liberar o acesso apenas às informações desse paciente.
- Dado alguém que informou um CPF ou número de inscrição válido, quando não informar o código ou informar um código incorreto ou expirado, então o sistema não deve exibir nenhuma informação da inscrição, nem confirmar se ela existe.
- Dado um código já utilizado, quando for informado novamente, então o sistema deve recusá-lo.

_Rastreabilidade:_ Feature "Verificar identidade do paciente ou responsável" → CP12 — Segurança, sigilo e controle de acesso → OE7/OE1. Atende à verificação de acesso exigida pela feature "Consultar posição individual na fila" (CP3) e pelas features de declaração da CP10.

#### Feature — Cadastrar usuário institucional com perfil de acesso [#48](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/48)

**RF50 — Cadastrar usuário institucional**

O sistema deve permitir que um usuário com perfil de coordenação cadastre usuários institucionais, informando nome, e-mail e exatamente um perfil de acesso (secretaria, estagiário, supervisor ou coordenação).

_Critérios de aceitação:_

- Dado um usuário com perfil de coordenação, quando cadastrar um novo usuário com nome, e-mail e perfil, então o sistema deve criar o acesso com o perfil indicado.
- Dado um e-mail já cadastrado, quando a coordenação tentar cadastrá-lo novamente, então o sistema deve impedir o cadastro duplicado.
- Dado um usuário sem perfil de coordenação, quando tentar cadastrar usuários, então o sistema deve impedir a operação.

_Rastreabilidade:_ Feature "Cadastrar usuário institucional com perfil de acesso" → CP12 — Segurança, sigilo e controle de acesso → OE7/OE5.

#### Feature — Desativar usuário institucional [#49](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/49)

**RF51 — Desativar usuário institucional**

O sistema deve permitir que um usuário com perfil de coordenação desative um usuário institucional, bloqueando seu acesso sem apagar o histórico de registros feitos por ele. Como os estagiários mudam a cada semestre, a desativação é o meio de retirar o acesso de quem concluiu o estágio.

_Critérios de aceitação:_

- Dado um estagiário que concluiu o estágio, quando a coordenação desativá-lo, então ele deve perder o acesso imediatamente, inclusive se estiver com uma sessão aberta.
- Dado um usuário desativado, quando seus registros anteriores forem consultados por um usuário autorizado, então esses registros devem continuar disponíveis e identificados com o nome de quem os fez.
- Dado um usuário sem perfil de coordenação, quando tentar desativar usuários, então o sistema deve impedir a operação.

_Rastreabilidade:_ Feature "Desativar usuário institucional" → CP12 — Segurança, sigilo e controle de acesso → OE7/OE5.

#### Feature — Restringir acesso ao prontuário do paciente [#50](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/50)

**RF52 — Restringir acesso ao prontuário**

O sistema deve permitir o acesso ao prontuário de um paciente (registros de evolução e relatório final da CP6) somente ao estagiário responsável pelo paciente e ao supervisor desse estagiário, conforme o vínculo definido na CP5. Os perfis de secretaria e de coordenação não devem ter acesso ao conteúdo clínico do prontuário, apenas aos dados cadastrais e administrativos do paciente. A regra não prevê exceções por perfil, conforme a definição da CP12 aprovada na [Seção 2.3](../../unidade-1/solucao-proposta.md#23-caracteristicas-de-produto-mapeadas-com-os-objetivos-especificos), que restringe o prontuário ao estagiário responsável e ao seu supervisor.

_Critérios de aceitação:_

- Dado um paciente vinculado ao estagiário A, supervisionado pelo supervisor S, quando A ou S abrirem o prontuário, então o sistema deve exibir o conteúdo clínico.
- Dado um estagiário B, que não é o responsável pelo paciente, quando tentar abrir o prontuário desse paciente, então o sistema deve negar o acesso, inclusive quando a requisição for feita diretamente ao servidor, sem passar pela interface.
- Dado um usuário com perfil de secretaria ou de coordenação, quando consultar um paciente, então o sistema deve exibir os dados cadastrais e administrativos, mas não os registros de evolução nem o relatório final.
- Dado um caso transferido do estagiário A para o estagiário C, quando a transferência for concluída, então C deve passar a ter acesso ao prontuário e A deve perdê-lo.

_Rastreabilidade:_ Feature "Restringir acesso ao prontuário do paciente" → CP12 — Segurança, sigilo e controle de acesso → OE7/OE5. Depende do vínculo entre paciente, estagiário e supervisor (CP5) e do prontuário (CP6).

#### Feature — Consultar registro de acessos ao prontuário [#51](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/51)

**RF53 — Consultar registro de acessos ao prontuário**

O sistema deve permitir que um usuário com perfil de coordenação consulte o registro de acessos ao prontuário de um paciente, informando, para cada acesso, o usuário, o perfil, a data/hora e a operação realizada (visualização, criação ou alteração), com filtro por paciente, por usuário e por período. A consulta mostra quem acessou, mas não o conteúdo clínico acessado.

_Critérios de aceitação:_

- Dado que o estagiário A visualizou o prontuário de um paciente, quando a coordenação consultar o registro de acessos desse paciente, então deve aparecer uma entrada com o nome de A, o perfil, a data/hora e a operação "visualização".
- Dada uma tentativa de acesso negada pelo RF52, quando a coordenação consultar o registro, então a tentativa deve aparecer identificada como "acesso negado".
- Dado um usuário sem perfil de coordenação, quando tentar consultar o registro de acessos, então o sistema deve impedir a operação.

_Rastreabilidade:_ Feature "Consultar registro de acessos ao prontuário" → CP12 — Segurança, sigilo e controle de acesso → OE7.

#### Feature — Registrar consentimento para tratamento de dados [#52](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/52)

**RF54 — Registrar consentimento para tratamento de dados**

O sistema deve apresentar, antes da conclusão da inscrição (CP1), um termo que informe, em linguagem simples, quais dados pessoais e de saúde são coletados, para que finalidade e quem terá acesso a eles, e deve exigir a concordância do interessado para concluir a inscrição. Para crianças e adolescentes, a concordância deve ser dada pelo responsável legal. O sistema deve registrar a versão do termo aceita e a data/hora do aceite.

_Critérios de aceitação:_

- Dado um interessado no formulário de inscrição, quando tentar concluir sem aceitar o termo, então o sistema deve impedir a conclusão e indicar que o aceite é necessário.
- Dado um interessado que aceitou o termo, quando a inscrição for concluída, então o sistema deve guardar a versão do termo e a data/hora do aceite junto à inscrição.
- Dada a inscrição de um menor de idade, quando o termo for apresentado, então ele deve pedir a identificação e a concordância do responsável legal.

O aceite on-line não substitui a autorização e o termo de responsabilidade assinados presencialmente pelo responsável legal, que continuam exigidos pela clínica para o atendimento de crianças e adolescentes ([ata de 26/08/2026](../../unidade-1/reunioes.md)).

_Rastreabilidade:_ Feature "Registrar consentimento para tratamento de dados" → CP12 — Segurança, sigilo e controle de acesso → OE7. Complementa a feature "Registrar solicitação de atendimento on-line" da CP1.

#### Pontos a validar com a FBr (CP12)

- Quais perfis podem ver a queixa informada na inscrição e a classificação da triagem (por exemplo, se a secretaria precisa ver a prioridade). Esses dados também são de saúde, mas ficam fora do escopo do RF52, que trata apenas do prontuário.
- Se o login deve usar o e-mail institucional da FBr ou outro mecanismo já adotado pela instituição.
- Por qual canal o código do RF49 deve ser enviado (SMS, WhatsApp ou e-mail), considerando o contato que os pacientes costumam informar.
- O texto do termo de consentimento, que deve ser revisado pela FBr.

### Continuidade de casos entre semestres (CP13)

A CP13 foi decomposta em três features, que organizam a transferência de um caso e de seu histórico clínico quando o estagiário responsável conclui o estágio, preservando a continuidade do acompanhamento do paciente nos semestres seguintes, conforme a [Solução Proposta, §2.3](../../unidade-1/solucao-proposta.md#23-caracteristicas-de-produto-mapeadas-com-os-objetivos-especificos).

Diferentemente da transferência de caso já prevista na CP5 (RF25 — Transferir caso para outro estagiário ou supervisor), que trata de uma reorganização pontual e a qualquer momento do semestre, a CP13 trata do processo estruturado de virada de semestre: identificar, para cada estagiário que está concluindo o estágio, os casos ativos sob sua responsabilidade, registrar a decisão de continuidade (ou de encerramento) de cada um e, quando aplicável, efetivar a transferência para o novo estagiário responsável, reaproveitando o mecanismo do RF25. Esta CP depende de definições institucionais do fluxo de encerramento e transferência de estágio ainda não fechadas com a FBr, e por isso é tratada na Solução Proposta como visão de produto de mais longo prazo, fora do MVP e do escopo desejável imediato.

#### Feature — Listar casos elegíveis para continuidade entre semestres

**RF55 — Listar casos elegíveis para continuidade entre semestres**

O sistema deve permitir que a coordenação liste, próximo ao fim do semestre, os casos ativos cujo estagiário responsável está concluindo o estágio (RF51 — Desativar usuário institucional) ou deixará a Clínica Escola, para apoiar o planejamento da continuidade do acompanhamento. Casos sem decisão de continuidade registrada (RF56) devem permanecer na lista até que uma decisão seja tomada.

_Critérios de aceitação:_

- Dado um estagiário marcado para desligamento ao fim do semestre, quando a coordenação abrir a lista de continuidade, então o sistema deve exibir todos os casos ativos sob responsabilidade desse estagiário.
- Dado um caso já com decisão de continuidade registrada (RF56), quando a lista for consultada, então esse caso não deve aparecer como pendente.
- Dado que nenhum estagiário sob responsabilidade de casos ativos está marcado para desligamento, quando a coordenação abrir a lista, então o sistema deve informar que não há casos pendentes de decisão de continuidade.

_Rastreabilidade:_ Feature "Listar casos elegíveis para continuidade entre semestres" → CP13 — Continuidade de casos entre semestres → OE5/OE6. Dependência: RF51 (CP12), CP5.

#### Feature — Registrar decisão de continuidade do caso

**RF56 — Registrar decisão de continuidade do caso**

O sistema deve permitir que a coordenação ou o supervisor do caso registre, para cada caso listado (RF55), a decisão de continuidade: indicar o novo estagiário responsável para o semestre seguinte, ou encerrar o acompanhamento, informando o motivo em ambos os casos. Toda decisão deve ficar registrada com autor e data.

_Critérios de aceitação:_

- Dado um caso pendente de decisão, quando a coordenação ou o supervisor registrar a continuidade indicando um novo estagiário, então o sistema deve associar a decisão ao caso, com o novo responsável indicado, o autor e a data.
- Dado um caso pendente de decisão, quando a coordenação ou o supervisor registrar o encerramento do acompanhamento com motivo, então o sistema deve marcar o caso como encerrado por continuidade não efetivada, sem vinculá-lo a um novo estagiário.
- Dado um caso já com decisão registrada, quando houver tentativa de registrar uma nova decisão sem justificativa de correção, então o sistema deve impedir a duplicidade de decisão.

_Rastreabilidade:_ Feature "Registrar decisão de continuidade do caso" → CP13 — Continuidade de casos entre semestres → OE5/OE6. Dependência: RF55.

#### Feature — Vincular caso a novo estagiário na continuidade

**RF57 — Vincular caso a novo estagiário na continuidade**

Quando a decisão de continuidade (RF56) indicar um novo estagiário responsável, o sistema deve efetivar a transferência do caso reaproveitando o mecanismo do RF25 — Transferir caso para outro estagiário ou supervisor, preservando integralmente o histórico do paciente (sessões, evoluções e vínculos anteriores) e vinculando a transferência à decisão de continuidade que a originou, em vez de a um motivo avulso.

_Critérios de aceitação:_

- Dada uma decisão de continuidade com novo estagiário indicado, quando a transferência for efetivada, então o sistema deve registrar o novo estagiário como responsável, manter todo o histórico do paciente disponível a ele, revogar o acesso do estagiário anterior e vincular a transferência à decisão de continuidade de origem (RF56).
- Dado um caso cuja decisão de continuidade foi de encerramento, quando o semestre virar, então o sistema não deve efetivar nenhuma transferência para esse caso.

_Rastreabilidade:_ Feature "Vincular caso a novo estagiário na continuidade" → CP13 — Continuidade de casos entre semestres → OE5/OE6. Dependência: RF56, RF25 (CP5).

#### Modelo de domínio da CP13

- **Decisão de continuidade:** vinculada ao caso, ao estagiário que está concluindo o estágio, ao autor e à data; indica o novo estagiário responsável ou o encerramento do acompanhamento, com motivo.
- **Transferência de continuidade:** reaproveita a entidade de transferência já definida na CP5, acrescentando o vínculo com a decisão de continuidade que a originou.

#### Pontos a validar com a FBr (CP13)

- Prazo, antes do fim do semestre, em que a listagem de continuidade (RF55) deve ocorrer.
- Se a decisão de continuidade pode ser tomada pelo supervisor isoladamente ou exige aprovação da coordenação.
- Critérios institucionais para decidir entre continuidade e encerramento de um caso na virada de semestre.
- Se o paciente deve ser comunicado ou consultado sobre a troca de estagiário responsável.

### Acessibilidade e Usabilidade (CP14)

A CP14 foi decomposta em duas features de personalização da exibição, voltadas a reduzir barreiras de acesso para o público em vulnerabilidade social e para pessoas com deficiência visual, conforme os desafios identificados na [Seção 1.5](../../unidade-1/cenario-atual.md#15-desafios-do-projeto). As duas features se aplicam exclusivamente às **páginas voltadas ao público externo** (paciente/solicitante) — inscrição, consulta de posição na fila, agendamento e confirmação de presença —, e não ao painel administrativo interno (usado por coordenação, secretaria, estagiários e supervisores).

#### Feature — Ativar modo de alto contraste [#24](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/24)

**RF58 — Ativar modo de alto contraste**

O sistema deve permitir que o paciente ative um modo de alto contraste em todas as páginas voltadas ao público externo, alterando a combinação de cores de texto e plano de fundo para atender, no mínimo, à razão de contraste exigida pelo nível AA da WCAG 2.2 (ver RNF56).

_Critério de aceitação:_ dado que o paciente ativou o modo de alto contraste, quando ele navegar entre as páginas voltadas ao público externo dentro da mesma sessão do navegador, então a preferência deve permanecer ativa em todas elas, sem precisar ser reativada a cada página; a preferência não precisa ser mantida após o encerramento da sessão do navegador, já que essas páginas não exigem login do paciente.
_Rastreabilidade:_ Feature "Ativar modo de alto contraste" → CP14 — Acessibilidade e usabilidade.

#### Feature — Ajustar tamanho do texto [#25](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/25)

**RF59 — Ajustar tamanho do texto**

O sistema deve permitir que o paciente aumente ou diminua o tamanho do texto exibido nas páginas voltadas ao público externo, em pelo menos 3 níveis (padrão — 100%, grande — 150% e extra grande — 200% do tamanho base do texto), sem cortar texto, sobrepor elementos ou impedir o acesso a qualquer funcionalidade dessas páginas.

_Critério de aceitação:_ dado que o paciente selecionou um dos três níveis de tamanho de texto, quando navegar pelas páginas voltadas ao público externo, então o nível selecionado deve ser aplicado de forma consistente em todas elas, seguindo a mesma regra de persistência por sessão de navegador do RF58.
_Rastreabilidade:_ Feature "Ajustar tamanho do texto" → CP14 — Acessibilidade e usabilidade.
