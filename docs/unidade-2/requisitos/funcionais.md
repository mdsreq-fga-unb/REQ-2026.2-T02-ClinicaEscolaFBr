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

Área: Gestão da fila de espera
  Conjunto: Fila de espera e consulta de posição
    Feature: Ordenar inscritos na fila de espera
    Feature: Consultar posição individual na fila
    Feature: Informar condições gerais da fila

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

Área: Emissão de documentos
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

Área: Acessibilidade e usabilidade
  Conjunto: Personalização de exibição
    Feature: Ativar modo de alto contraste
    Feature: Ajustar tamanho do texto
```

### Inscrição on-line (CP1)

A CP1 foi decomposta em três features: registro da solicitação de atendimento on-line, emissão de comprovante de inscrição e registro de inscrição assistida. As features têm como objetivo ampliar o acesso da comunidade aos serviços da Clínica Escola FBr, permitindo que o interessado realize sua inscrição sem necessidade de deslocamento presencial e que pessoas com dificuldades de acesso digital possam utilizar um canal assistido.

O registro da inscrição assistida constitui uma resposta proposta ao risco de exclusão digital identificado na intervenção social (Seção 3), cuja forma de operação deverá ser validada com a Clínica Escola.

As funcionalidades destinadas ao público externo devem observar os requisitos de acessibilidade da CP12, enquanto o acesso institucional aos dados dos inscritos deve respeitar os perfis e as restrições estabelecidos pela CP11.

#### Feature — Registrar solicitação de atendimento on-line

**RF05 — Registrar solicitação de atendimento on-line**

O sistema deve permitir que o interessado realize uma solicitação de atendimento psicológico por meio de formulário eletrônico, acessível a partir de link divulgado no site e nas redes sociais da FBr, informando seus dados cadastrais e a queixa que motivou a busca pelo atendimento.

O formulário deve permitir o preenchimento dos campos definidos pela Clínica Escola como obrigatórios, verificar se esses campos foram preenchidos e solicitar a confirmação do interessado antes de registrar a inscrição.

Após a conclusão do envio, o sistema deve armazenar a solicitação e gerar um identificador único, que será utilizado para o acompanhamento da inscrição nas etapas posteriores de triagem e fila de espera.

O registro da solicitação não representa confirmação de vaga ou garantia de atendimento, pois o interessado ainda deverá passar pelo processo de triagem previsto na CP2.

_Critérios de aceitação:_

- Dado que o interessado acessou o formulário de inscrição, quando preencher todos os campos obrigatórios e confirmar o envio, então o sistema deve registrar a solicitação e gerar um identificador único vinculado à inscrição.

- Dado que o interessado deixou um ou mais campos obrigatórios sem preenchimento, quando tentar enviar o formulário, então o sistema deve impedir a conclusão da inscrição, identificar os campos pendentes e permitir sua correção sem descartar os demais dados já preenchidos.

- Dada uma solicitação registrada com sucesso, quando o interessado concluir o processo de inscrição, então o sistema deve informar que a solicitação foi recebida e que o atendimento dependerá das etapas posteriores de triagem e disponibilidade de vagas.

- Dado que ocorreu uma falha antes da confirmação do registro, quando o interessado tentar concluir a inscrição, então o sistema não deve apresentar uma confirmação de inscrição realizada sem que exista um registro correspondente.

_Rastreabilidade:_ Feature "Registrar solicitação de atendimento on-line" → CP1 — Inscrição on-line → OE1/OE4.

#### Feature — Emitir comprovante de inscrição

**RF06 — Emitir comprovante de inscrição**

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

**RF07 — Registrar inscrição assistida**

O sistema deve permitir que um usuário institucional com perfil de secretaria registre a solicitação de atendimento de um interessado que necessite de auxílio para realizar sua inscrição, mediante atendimento assistido ou presencial disponibilizado pela Clínica Escola FBr. O registro dessa solicitação deve ser restrito ao perfil de secretaria, conforme os perfis institucionais definidos na CP11 — Segurança, sigilo e controle de acesso.

O registro assistido deve utilizar os mesmos campos cadastrais e informações obrigatórias estabelecidos para a inscrição on-line, permitindo que a solicitação seja incorporada ao mesmo fluxo de triagem e fila de espera.

O sistema deve identificar a modalidade utilizada para o registro da inscrição, diferenciando as solicitações realizadas diretamente pelo interessado daquelas registradas com auxílio de um usuário institucional.

A utilização do canal assistido não deve atribuir prioridade clínica diferenciada ao interessado, pois a classificação de prioridade depende do processo de triagem previsto na CP2.

_Critérios de aceitação:_

- Dado um interessado atendido por um usuário institucional com perfil de secretaria, quando os dados obrigatórios forem preenchidos e a inscrição for confirmada, então o sistema deve registrar a solicitação, gerar um identificador único e encaminhá-la ao mesmo fluxo de triagem utilizado pelas inscrições on-line.

- Dado um usuário institucional com perfil diferente de secretaria, quando tentar acessar a funcionalidade de inscrição assistida, então o sistema deve impedir o registro da solicitação por esse usuário.

- Dada uma inscrição realizada por atendimento assistido, quando seu registro for consultado por um usuário autorizado, então o sistema deve identificar a modalidade de inscrição utilizada.

- Dadas duas solicitações com a mesma classificação de prioridade validada, sendo uma on-line e outra assistida, quando forem incorporadas à fila de espera, então a modalidade de inscrição não deve constituir, isoladamente, critério para atribuição de prioridade diferenciada.

_Rastreabilidade:_ Feature "Registrar inscrição assistida" → CP1 — Inscrição on-line → OE1/OE4 → IS01 — Exclusão digital.

### Fila de espera e consulta de posição (CP3)

A CP3 foi decomposta em três features: ordenação dos inscritos na fila de espera, consulta individual da posição e apresentação das condições gerais de atendimento.

As features têm como objetivo organizar a fila de acordo com as prioridades estabelecidas na triagem, ampliar a transparência das informações fornecidas aos inscritos e reduzir a necessidade de contatos recorrentes com a secretaria para acompanhamento da solicitação.

A ordenação da fila depende da classificação de prioridade realizada na CP2, enquanto a consulta individual deve respeitar as restrições de acesso e sigilo previstas na CP11.

A apresentação das condições gerais de atendimento constitui uma resposta proposta aos riscos de aumento da demanda e de criação de expectativas inadequadas sobre o tempo de espera, identificados na intervenção social (Seção 3).

#### Feature — Ordenar inscritos na fila de espera

**RF08 — Ordenar inscritos na fila de espera**

O sistema deve manter a fila de espera da Clínica Escola FBr organizada de acordo com a classificação de prioridade atribuída aos inscritos durante o processo de triagem previsto na CP2.

A classificação deve considerar as prioridades vermelha, amarela e verde, conforme as regras definidas pela Clínica Escola, utilizando a classificação final validada pela equipe responsável pela triagem.

O sistema não deve utilizar uma pré-classificação automática como decisão clínica definitiva sem a revisão de um profissional autorizado.

Quando ocorrer uma alteração autorizada na prioridade ou na situação de um inscrito, o sistema deve atualizar seu posicionamento na fila de acordo com os critérios institucionais definidos para a ordenação.

Os critérios de desempate entre inscritos com a mesma prioridade deverão ser confirmados com a Clínica Escola durante a validação dos requisitos.

_Critérios de aceitação:_

- Dado um inscrito cuja classificação de prioridade tenha sido validada pela equipe responsável, quando sua solicitação for incorporada à fila de espera, então o sistema deve posicioná-lo conforme a prioridade atribuída e os critérios de ordenação aprovados pela Clínica Escola.

- Dado um inscrito cuja pré-classificação automática ainda não tenha sido validada, quando o sistema organizar a fila, então não deve tratar a classificação preliminar como decisão clínica definitiva.

- Dada uma alteração de prioridade realizada por um usuário autorizado, quando a nova classificação for confirmada, então o sistema deve atualizar a posição do inscrito de acordo com os critérios de ordenação estabelecidos.

- Dada uma alteração na situação de um inscrito que afete sua participação na fila, quando a atualização for confirmada, então o sistema deve recalcular as posições dos demais inscritos afetados, preservando o histórico da decisão.

_Rastreabilidade:_ Feature "Ordenar inscritos na fila de espera" → CP3 — Fila de espera e consulta de posição → OE4/OE7.

#### Feature — Consultar posição individual na fila

**RF09 — Consultar posição individual na fila**

O sistema deve permitir que o inscrito consulte sua posição e situação atual na fila de espera da Clínica Escola FBr, utilizando seu CPF ou número de inscrição para localizar a solicitação.

Antes de apresentar as informações individuais, o sistema deve verificar a identidade do inscrito conforme o RF15 — Verificar identidade do paciente ou responsável, definido na CP11. A verificação deve exigir CPF ou número de inscrição e um código de uso único enviado ao contato cadastrado, permitindo o acesso exclusivamente às informações da inscrição correspondente.

A consulta deve apresentar exclusivamente as informações relativas à própria solicitação, sem divulgar nomes, dados cadastrais, queixas ou classificações clínicas dos demais inscritos.

O sistema deve informar que a posição na fila pode sofrer alterações em razão das prioridades estabelecidas na triagem e das movimentações da fila, não representando garantia de prazo ou data de atendimento.

_Critérios de aceitação:_

- Dado um inscrito que tenha informado seu CPF ou número de inscrição e confirmado sua identidade por meio do código de uso único previsto no RF15, quando solicitar a consulta da fila de espera, então o sistema deve apresentar exclusivamente sua posição e situação atual na fila.

- Dado um usuário que não tenha comprovado autorização para consultar determinada inscrição, quando tentar acessar suas informações, então o sistema deve impedir a divulgação da posição e da situação individual correspondente.

- Dada uma consulta individual autorizada, quando o sistema apresentar a posição do inscrito, então não deve exibir nomes, dados cadastrais, queixas ou informações clínicas dos demais integrantes da fila.

- Dada uma alteração na prioridade ou na situação dos inscritos que modifique o posicionamento na fila, quando o interessado realizar uma nova consulta autorizada, então o sistema deve apresentar sua posição atualizada.

- Dada uma consulta de posição realizada com sucesso, quando o resultado for apresentado, então o sistema deve informar que a posição poderá variar e que não existe garantia de atendimento em uma data ou prazo específico.

_Rastreabilidade:_ Feature "Consultar posição individual na fila" → CP3 — Fila de espera e consulta de posição → OE4/OE7 → IS03 — Expectativa sobre a fila. Dependência: RF15 — Verificar identidade do paciente ou responsável (CP11).

#### Feature — Informar condições gerais da fila

**RF10 — Informar condições gerais da fila**

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

### Distribuição de casos entre supervisores e estagiários (CP5)

A CP5 foi decomposta em nove features, organizadas em três conjuntos: distribuição dos casos entre supervisores conforme a área de especialidade, vinculação de cada paciente a um estagiário responsável e acompanhamento/reorganização dos vínculos já estabelecidos, apoiando a organização da reunião inicial de estágio e a rastreabilidade da responsabilidade sobre cada caso ([Solução Proposta, §2.3](../../unidade-1/solucao-proposta.md#23-caracteristicas-de-produto-mapeadas-com-os-objetivos-especificos)).

A distribuição depende da classificação de prioridade realizada na CP2 e da fila de espera da CP3, enquanto o acesso ao prontuário do caso pelo estagiário e pelo supervisor respeita os perfis e restrições definidos na CP11. A ordem de prioridade na distribuição (RN5.4), o limite de casos simultâneos (RN5.8), a possibilidade de atendimento em dupla (RN5.9) e o enquadramento da transferência de caso na CP5 (RF5.8) ainda dependem de validação com a FBr.

#### Feature — Listar casos aguardando distribuição

**RF5.1 — Listar casos aguardando distribuição**

O sistema deve listar, para um usuário autenticado com perfil de coordenação ou supervisor, os casos (pacientes) já triados que ainda não têm supervisor e estagiário responsáveis identificados, ordenados por prioridade, para apoiar a reunião inicial de estágio. Casos já distribuídos deixam de aparecer na lista. Quando não houver caso pendente, o sistema deve informar isso de forma clara.

_Critérios de aceitação:_

- Dado um conjunto de pacientes triados, quando a coordenação ou o supervisor abrir a lista de casos aguardando distribuição, então o sistema deve exibir somente os casos sem supervisor e estagiário responsáveis, ordenados por prioridade.
- Dado um caso já distribuído a um supervisor, quando a lista de casos pendentes for exibida, então esse caso não deve aparecer nela.
- Dado que todos os casos triados já foram distribuídos, quando um usuário autorizado abrir a lista de casos aguardando distribuição, então o sistema deve informar que não há casos pendentes.

_Rastreabilidade:_ Feature "Listar casos aguardando distribuição" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5/OE2.

#### Feature — Registrar áreas de especialidade do supervisor

**RF5.2 — Registrar áreas de especialidade do supervisor**

O sistema deve permitir que a coordenação registre e mantenha as áreas de especialidade de cada supervisor, que servem de critério para a distribuição dos casos (RF5.3). Cada supervisor pode ter uma ou mais áreas de especialidade, e a manutenção dessa lista deve ser possível pela interface, sem intervenção técnica. Alterar as áreas de um supervisor não deve afetar os casos já distribuídos a ele.

_Critérios de aceitação:_

- Dado um supervisor cadastrado sem áreas de especialidade, quando a coordenação registrar uma ou mais áreas para ele, então o sistema deve associar as áreas informadas ao supervisor.
- Dado um supervisor que já responde por casos distribuídos, quando a coordenação remover uma de suas áreas de especialidade, então os casos já distribuídos a ele devem permanecer sob sua responsabilidade.

_Rastreabilidade:_ Feature "Registrar áreas de especialidade do supervisor" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5.

#### Feature — Distribuir caso a supervisor conforme área de especialidade

**RF5.3 — Distribuir caso a supervisor conforme área de especialidade**

O sistema deve permitir que a coordenação atribua cada caso pendente (RF5.1) a um supervisor, considerando a compatibilidade entre a área de especialidade exigida pelo caso e as áreas registradas para os supervisores (RF5.2). Um caso só pode ter um supervisor responsável vigente por vez, e a atribuição deve ficar registrada com data e autor. Quando não houver supervisor compatível com a área exigida, o sistema deve informar essa condição e permitir a atribuição manual a outro supervisor, registrando a exceção. A reatribuição de um caso que já possui supervisor deve ser feita exclusivamente pela transferência de caso (RF5.8), e não por uma nova distribuição.

_Critérios de aceitação:_

- Dado um caso que exige determinada área de especialidade e um supervisor que atua nessa área, quando a coordenação distribuir o caso a esse supervisor, então o sistema deve registrar o supervisor como responsável pelo caso, com data e autor da atribuição.
- Dado um caso sem supervisor compatível disponível, quando a coordenação tentar distribuí-lo, então o sistema deve informar a ausência de compatibilidade e permitir a atribuição manual, registrando a exceção.
- Dado um caso que já possui supervisor responsável, quando um usuário tentar distribuí-lo novamente, então o sistema deve bloquear a ação e orientar o uso da transferência de caso (RF5.8).

_Rastreabilidade:_ Feature "Distribuir caso a supervisor conforme área de especialidade" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5. Dependência: RF5.1, RF5.2.

#### Feature — Vincular paciente a estagiário responsável

**RF5.4 — Vincular paciente a estagiário responsável**

O sistema deve permitir que o supervisor vincule cada paciente sob sua responsabilidade a um estagiário ativo no semestre, responsável pelo atendimento. Após o vínculo, o caso passa a ter estagiário e supervisor identificados, e o estagiário vinculado passa a ter acesso ao prontuário do caso, respeitando os perfis e restrições definidos na CP11. O supervisor só pode vincular estagiários a casos sob sua própria responsabilidade, e o vínculo deve ficar registrado com data e autor.

_Critérios de aceitação:_

- Dado um caso sob a responsabilidade de um supervisor, quando ele vincular um estagiário ao caso, então o sistema deve registrar o estagiário como responsável pelo caso e conceder a ele acesso ao caso.
- Dado um caso sob a responsabilidade de um supervisor, quando outro supervisor tentar vincular um estagiário a esse caso, então o sistema deve negar a ação.

_Rastreabilidade:_ Feature "Vincular paciente a estagiário responsável" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5. Dependência: RF5.3.

#### Feature — Consultar responsáveis pelo caso

**RF5.5 — Consultar responsáveis pelo caso**

O sistema deve exibir, para cada caso, o estagiário e o supervisor responsáveis, para uso da secretaria no agendamento e da coordenação no acompanhamento. A consulta deve exibir apenas o nome do estagiário e do supervisor responsáveis, sem expor dados clínicos a perfis que não têm acesso ao prontuário, e casos ainda sem responsáveis devem ser sinalizados como pendentes de distribuição.

_Critério de aceitação:_ dado um caso com estagiário e supervisor já vinculados, quando a secretaria, o estagiário, o supervisor ou a coordenação consultarem o caso, então o sistema deve exibir os responsáveis sem exibir dados clínicos.

_Rastreabilidade:_ Feature "Consultar responsáveis pelo caso" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5. Dependência: RF5.4.

#### Feature — Consultar casos sob responsabilidade do estagiário ou supervisor

**RF5.6 — Consultar casos sob responsabilidade do estagiário ou supervisor**

O sistema deve permitir que o estagiário ou o supervisor consultem a lista de casos vinculados a eles, identificando o paciente, a prioridade e a situação de cada caso. O estagiário deve visualizar apenas os casos vinculados a ele, enquanto o supervisor deve visualizar os casos sob sua responsabilidade e os de seus estagiários.

_Critério de aceitação:_ dado um estagiário vinculado a um conjunto de casos, quando ele abrir a lista de seus casos, então o sistema deve exibir exclusivamente os casos vinculados a ele.

_Rastreabilidade:_ Feature "Consultar casos sob responsabilidade do estagiário ou supervisor" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5. Dependência: RF5.4.

#### Feature — Visualizar distribuição de casos por supervisor

**RF5.7 — Visualizar distribuição de casos por supervisor**

O sistema deve mostrar à coordenação quantos casos ativos cada supervisor e cada estagiário têm sob sua responsabilidade, apoiando o equilíbrio da carga entre supervisores e alimentando o indicador "distribuição de casos por supervisor" da CP10.

_Critério de aceitação:_ dado o conjunto de casos distribuídos, quando a coordenação consultar a visão de distribuição, então o sistema deve apresentar o número de casos ativos por supervisor e por estagiário, refletindo a situação atual.

_Rastreabilidade:_ Feature "Visualizar distribuição de casos por supervisor" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5; alimenta CP10 — Indicadores e relatórios institucionais. Dependência: RF5.3.

#### Feature — Transferir caso para outro estagiário ou supervisor

**RF5.8 — Transferir caso para outro estagiário ou supervisor**

O sistema deve permitir que o supervisor ou a coordenação transfiram um caso ativo para outro estagiário ou supervisor — por exemplo, ao término do estágio, na saída do estagiário ou por reorganização da carga —, preservando o histórico do paciente (sessões, evolução e vínculos anteriores). A transferência deve exigir a indicação do novo responsável e do motivo, e deve ficar registrada, vinculada à atribuição anterior. A partir da transferência, o responsável anterior perde o acesso ao caso, e o novo responsável passa a ter acesso a todo o histórico.

_Critério de aceitação:_ dado um caso vinculado a um estagiário que concluiu o estágio, quando o supervisor transferir o caso para outro estagiário, então o sistema deve registrar o novo estagiário como responsável, manter o histórico do paciente disponível a ele e revogar o acesso do estagiário anterior.

_Rastreabilidade:_ Feature "Transferir caso para outro estagiário ou supervisor" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5. Dependência: RF5.4.

#### Feature — Consultar histórico de responsáveis do caso

**RF5.9 — Consultar histórico de responsáveis do caso**

O sistema deve permitir consultar a sequência de supervisores e estagiários que já foram responsáveis por um caso, com a data e o motivo de cada mudança, listados em ordem cronológica. O acesso a esse histórico deve respeitar os perfis de acesso definidos na CP11.

_Critério de aceitação:_ dado um caso que já passou por uma ou mais transferências de responsável, quando um usuário autorizado consultar seu histórico, então o sistema deve listar, em ordem cronológica, cada vínculo com responsável, período e motivo do encerramento.

_Rastreabilidade:_ Feature "Consultar histórico de responsáveis do caso" → CP5 — Distribuição de casos entre supervisores e estagiários → OE5. Dependência: RF5.4, RF5.8.

#### Pontos a validar com a FBr (CP5)

- A ordem de prioridade (vermelha, amarela, verde) deve orientar diretamente a ordem de distribuição dos casos, e não apenas a ordenação da lista de pendentes (RN5.4)?
- Pode existir um limite de casos simultâneos por estagiário e por supervisor (RN5.8)? Se sim, qual o valor?
- Um caso pode ser atendido por mais de um estagiário, em regime de atendimento em dupla (RN5.9)?
- A transferência de caso entre estagiários ou supervisores (RF5.8) pertence à CP5 ou deve se tornar uma característica de produto própria? Qual o processo real de continuidade entre semestres?

### Emissão de Declaração de Comparecimento (CP9)

A CP9 foi decomposta em cinco features, voltadas a permitir que a secretaria ou o próprio paciente/responsável obtenham a declaração de comparecimento às sessões, contendo data, horário e nome do estagiário que realizou o atendimento ([Solução Proposta, §2.3](../../unidade-1/solucao-proposta.md#23-caracteristicas-de-produto-mapeadas-com-os-objetivos-especificos)). O objetivo é atender de imediato uma demanda recorrente dos pacientes, sem trabalho manual da secretaria.

Das cinco features, as duas últimas (emissão consolidada por período e validação de autenticidade por terceiros) dependem de confirmação da demanda junto à FBr e podem ser retiradas da lista após essa validação; as demais três já têm o escopo confirmado.

#### Feature — Listar sessões com comparecimento registrado do paciente

**RF9.1 — Listar sessões com comparecimento registrado do paciente**

O sistema deve listar, para um usuário autenticado com perfil autorizado (secretaria, ou o próprio paciente/responsável no caso de suas próprias sessões), as sessões do paciente nas quais a presença foi registrada, para que o usuário escolha a sessão a declarar. Quando não houver sessão elegível, o sistema deve informar isso de forma clara, sem exibir erro técnico.

_Critérios de aceitação:_

- Dado um paciente com sessões registradas, quando a lista de sessões elegíveis for exibida, então devem aparecer somente as sessões com presença registrada, com data, horário e nome do estagiário.
- Dado um paciente ou responsável autenticado, quando ele acessar a lista de sessões, então deve visualizar somente as suas próprias sessões.
- Dado um paciente sem nenhuma sessão com presença registrada, quando ele acessar a área de declarações, então o sistema deve informar que não há sessões disponíveis para declaração.

_Rastreabilidade:_ Feature "Listar sessões com comparecimento registrado do paciente" → CP9 — Emissão de declaração de comparecimento → OE6/OE5.

#### Feature — Emitir declaração de comparecimento do paciente

**RF9.2 — Emitir declaração de comparecimento do paciente**

O sistema deve gerar automaticamente a declaração de comparecimento para a sessão selecionada (RF9.1), contendo, no mínimo, a data, o horário e o nome do estagiário que realizou o atendimento, em formato pronto para impressão ou compartilhamento. A emissão só é permitida para sessão com presença registrada; sessões com falta ou cancelamento não geram declaração. A declaração não deve conter informação clínica (queixa, prioridade, diagnóstico, evolução), preservando o sigilo do atendimento. Para paciente menor de idade, a solicitação deve ser feita pelo responsável legal. Toda emissão deve ser registrada para fins de auditoria (usuário, data/hora e sessão de origem). Os campos obrigatórios adicionais do documento (CPF, dados da instituição, assinatura ou carimbo do supervisor) ainda serão definidos com a FBr.

_Critérios de aceitação:_

- Dada uma sessão com presença registrada, quando a secretaria ou o paciente/responsável solicitar a emissão, então o sistema deve gerar o documento com a data, o horário e o nome do estagiário corretos, conforme o registro da sessão, e registrar a emissão para auditoria.
- Dada uma sessão sem presença registrada (falta ou cancelamento), quando a emissão for solicitada, então o sistema deve bloquear a emissão e informar o motivo.
- Dado um usuário sem permissão para a sessão solicitada, quando tentar emitir a declaração, então o sistema deve negar a emissão e registrar a tentativa.
- Dado um paciente autenticado, quando ele tentar emitir a declaração de uma sessão de outro paciente, então o sistema deve negar o acesso.

_Rastreabilidade:_ Feature "Emitir declaração de comparecimento do paciente" → CP9 — Emissão de declaração de comparecimento → OE6/OE5.

#### Feature — Reemitir declaração de comparecimento

**RF9.3 — Reemitir declaração de comparecimento**

O sistema deve permitir gerar novamente uma declaração já emitida (por exemplo, em caso de perda do documento), mantendo o conteúdo consistente com o registro da sessão, a menos que esse registro tenha sido corrigido desde a emissão original. Cada reemissão deve ser registrada para auditoria, distinguindo-se da emissão original.

_Critério de aceitação:_ dada uma declaração já emitida para uma sessão, quando o usuário solicitar a reemissão, então o sistema deve gerar o documento novamente com o mesmo conteúdo da emissão original (salvo correção do registro) e registrar a reemissão vinculada à emissão original.

_Rastreabilidade:_ Feature "Reemitir declaração de comparecimento" → CP9 — Emissão de declaração de comparecimento → OE6/OE5.

#### Feature — Emitir declaração consolidada por período

**RF9.4 — Emitir declaração consolidada por período**

O sistema deve permitir gerar uma única declaração que reúna várias sessões com presença registrada em um período informado pelo usuário (por exemplo, para justificar ausências recorrentes no trabalho ou na escola), incluindo apenas as sessões elegíveis dentro do período e apresentando data, horário e nome do estagiário de cada uma. Se nenhuma sessão elegível existir no período, o sistema não deve gerar o documento.

_Critério de aceitação:_ dado um período informado pelo usuário, quando a emissão consolidada for solicitada, então o sistema deve incluir somente as sessões com presença registrada dentro do período e, caso não exista nenhuma sessão elegível, informar isso e não gerar o documento.

_Rastreabilidade:_ Feature "Emitir declaração consolidada por período" → CP9 — Emissão de declaração de comparecimento → OE6/OE5.

#### Feature — Validar autenticidade da declaração

**RF9.5 — Validar autenticidade da declaração**

O sistema deve permitir que um terceiro (por exemplo, empregador ou escola) confirme que uma declaração apresentada foi emitida pela Clínica Escola FBr, por meio de um código único de verificação impresso no documento. A consulta ao código deve confirmar a autenticidade sem expor dados pessoais além dos estritamente necessários.

_Critério de aceitação:_ dado um código de verificação impresso em uma declaração emitida, quando ele for consultado, então o sistema deve confirmar a autenticidade da declaração sem expor dados pessoais além do estritamente necessário.

_Rastreabilidade:_ Feature "Validar autenticidade da declaração" → CP9 — Emissão de declaração de comparecimento → OE6/OE5.

#### Pontos a validar com a FBr (CP9)

- Quem emite a declaração: apenas a secretaria, o paciente pelo portal, ou ambos?
- Quais campos são obrigatórios além de data, horário e nome do estagiário (CPF, assinatura/carimbo, dados da instituição)?
- Qual o formato preferido: PDF para download, impressão, envio por e-mail/WhatsApp?
- Existe demanda por declaração consolidada de várias sessões (RF9.4)? Caso não exista, a feature sai da lista.
- A declaração pode indicar que o atendimento é psicológico ou deve ter texto neutro por sigilo?
- No caso de menores, o responsável solicita a declaração?
- É necessário verificar a autenticidade por terceiros (RF9.5)? Se sim, avaliar o risco de exposição de dados na consulta pública.

### Indicadores e Relatórios Institucionais (CP10)

A CP10 foi decomposta em duas features: consulta de indicadores operacionais e geração/exportação do relatório institucional exigido pelo CRP e pelo MEC. As duas features são de uso exclusivo do perfil **coordenação** (o único perfil de acesso, entre os definidos na CP11, com visão consolidada sobre toda a operação).

#### Feature — Consultar indicadores operacionais [#22](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/22)

**RF01 — Consultar indicadores operacionais**

O sistema deve permitir que um usuário com perfil de coordenação consulte, para um intervalo de datas selecionado (data inicial e data final), os quatro indicadores operacionais abaixo, cada um definido de forma objetiva para eliminar ambiguidade de cálculo:

1. **Vagas ocupadas** — quantidade de vagas do semestre vigente atualmente preenchidas por pacientes em atendimento ativo, em relação ao total de vagas ofertadas no semestre (ex.: 82 de 100 vagas).
2. **Tempo médio de espera** — média, em dias corridos, entre a data de inscrição do paciente e a data da primeira sessão agendada, considerando apenas os pacientes cuja primeira sessão ocorreu dentro do intervalo selecionado.
3. **Taxa de evasão** — percentual de pacientes cujo atendimento foi encerrado por desligamento (conforme regra de duas faltas da CP7) antes da conclusão do ciclo de sessões previsto, em relação ao total de pacientes que estavam em atendimento ativo no intervalo selecionado.
4. **Distribuição de casos por supervisor** — quantidade de casos (pacientes) atualmente sob responsabilidade de cada supervisor, listada individualmente por supervisor.

_Critério de aceitação:_ dado um intervalo de datas válido selecionado pela coordenação, quando os indicadores forem consultados, então os quatro indicadores devem ser recalculados considerando apenas os registros pertencentes a esse intervalo, seguindo exatamente as definições acima; se não houver registros no intervalo, o indicador correspondente deve ser exibido como zero, nunca omitido ou em branco.
_Rastreabilidade:_ Feature "Consultar indicadores operacionais" → CP10 — Indicadores e relatórios institucionais.

#### Feature — Gerar e exportar relatório institucional [#23](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/23)

**RF02 — Gerar e exportar relatório institucional**

O sistema deve permitir que um usuário com perfil de coordenação gere, para um intervalo de datas selecionado, um relatório institucional que consolide na tela os quatro indicadores definidos no RF01 (vagas ocupadas, tempo médio de espera, taxa de evasão e distribuição de casos por supervisor) recalculados para esse intervalo, acompanhados do período de referência (data inicial e final) e da data e hora de geração; e deve permitir que a coordenação exporte esse mesmo relatório em arquivo PDF, preservando o conteúdo exibido em tela, para envio à FBr ou impressão.

_Critérios de aceitação:_

- Dado um intervalo de datas selecionado, quando a coordenação solicitar a geração do relatório, então o sistema deve exibir os quatro indicadores do RF01 recalculados para esse intervalo, o período de referência utilizado e a data/hora de geração.
- Dado um relatório institucional já gerado nesta mesma operação, quando a coordenação solicitar a exportação, então o sistema deve produzir um arquivo em formato PDF com o mesmo conteúdo exibido na tela, disponível para download imediato.

_Rastreabilidade:_ Feature "Gerar e exportar relatório institucional" → CP10 — Indicadores e relatórios institucionais.

### Acessibilidade e Usabilidade (CP12)

A CP12 foi decomposta em duas features de personalização da exibição, voltadas a reduzir barreiras de acesso para o público em vulnerabilidade social e para pessoas com deficiência visual, conforme os desafios identificados na [Seção 1.5](../../unidade-1/cenario-atual.md#15-desafios-do-projeto). As duas features se aplicam exclusivamente às **páginas voltadas ao público externo** (paciente/solicitante) — inscrição, consulta de posição na fila, agendamento e confirmação de presença —, e não ao painel administrativo interno (usado por coordenação, secretaria, estagiários e supervisores).

#### Feature — Ativar modo de alto contraste [#24](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/24)

**RF03 — Ativar modo de alto contraste**

O sistema deve permitir que o paciente ative um modo de alto contraste em todas as páginas voltadas ao público externo, alterando a combinação de cores de texto e plano de fundo para atender, no mínimo, à razão de contraste exigida pelo nível AA da WCAG 2.2 (ver RNF04).

_Critério de aceitação:_ dado que o paciente ativou o modo de alto contraste, quando ele navegar entre as páginas voltadas ao público externo dentro da mesma sessão do navegador, então a preferência deve permanecer ativa em todas elas, sem precisar ser reativada a cada página; a preferência não precisa ser mantida após o encerramento da sessão do navegador, já que essas páginas não exigem login do paciente.
_Rastreabilidade:_ Feature "Ativar modo de alto contraste" → CP12 — Acessibilidade e usabilidade.

#### Feature — Ajustar tamanho do texto [#25](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/25)

**RF04 — Ajustar tamanho do texto**

O sistema deve permitir que o paciente aumente ou diminua o tamanho do texto exibido nas páginas voltadas ao público externo, em pelo menos 3 níveis (padrão — 100%, grande — 150% e extra grande — 200% do tamanho base do texto), sem cortar texto, sobrepor elementos ou impedir o acesso a qualquer funcionalidade dessas páginas.

_Critério de aceitação:_ dado que o paciente selecionou um dos três níveis de tamanho de texto, quando navegar pelas páginas voltadas ao público externo, então o nível selecionado deve ser aplicado de forma consistente em todas elas, seguindo a mesma regra de persistência por sessão de navegador do RF03.
_Rastreabilidade:_ Feature "Ajustar tamanho do texto" → CP12 — Acessibilidade e usabilidade.
