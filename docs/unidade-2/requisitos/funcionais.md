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

O sistema deve permitir que o paciente aumente ou diminua o tamanho do texto exibido nas páginas voltadas ao público externo, em pelo menos 3 níveis (padrão, grande e extra grande, cada nível ampliando a fonte em aproximadamente 25% em relação ao anterior), sem cortar texto, sobrepor elementos ou impedir o acesso a qualquer funcionalidade dessas páginas.

_Critério de aceitação:_ dado que o paciente selecionou um dos três níveis de tamanho de texto, quando navegar pelas páginas voltadas ao público externo, então o nível selecionado deve ser aplicado de forma consistente em todas elas, seguindo a mesma regra de persistência por sessão de navegador do RF03.
_Rastreabilidade:_ Feature "Ajustar tamanho do texto" → CP12 — Acessibilidade e usabilidade.
