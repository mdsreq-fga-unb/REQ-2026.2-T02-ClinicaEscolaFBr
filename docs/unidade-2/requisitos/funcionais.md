# 8. Requisitos de Software

## 8.1 Lista de Requisitos Funcionais

Os requisitos funcionais (RFs) são declarados a partir da decomposição das Características de Produto (CPs) em **Features**, seguindo o processo FDD (etapa _Construir a Lista de Features_) e as práticas descritas na [Seção 5 — Engenharia de Requisitos](../../unidade-1/engenharia-requisitos.md). Cada Feature segue o formato `<ação> <resultado> <objeto>` e agrupa um ou mais RFs; cada RF mantém rastreabilidade com a Feature que o declarou e, por meio dela, com a CP de origem, compondo a cadeia **Problema → OG → OEs → CPs → Features → RFs/RNFs** descrita no cronograma da Unidade 2.

### Lista de features (FDD)

```text
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
