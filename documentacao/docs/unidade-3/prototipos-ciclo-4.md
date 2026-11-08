# Protótipos do Ciclo 4

Esta página reúne os protótipos das telas do Ciclo 4, uma seção por feature, a partir do [projeto das features do Ciclo 4](projeto-features-ciclo-4.md). Cada imagem traz os estados da tela (padrão, erro, vazio, bloqueio e acesso negado), identificados no topo de cada quadro, e o perfil que vê cada um. As páginas públicas aparecem no computador (1366 px) e no celular (360 px). Os dados mostrados são fictícios e são os mesmos em todas as telas. Clique numa imagem para abri-la em tamanho original.

Os protótipos seguem as cores, a tipografia e os componentes das telas aprovadas pela FBr no [Ciclo 3](prototipos-ciclo-3.md). A revisão de cada tela faz parte da inspeção de design da feature, registrada na sua issue, e a validação com a FBr é feita na reunião de 06/11/2026.

Para reduzir a rolagem, as telas mostram aberto só o que é usado na hora. O conteúdo de consulta começa fechado e abre com um botão, por exemplo os blocos de dados na revisão da inscrição, os tópicos do termo e as evoluções e o histórico de responsáveis no prontuário. As seções sem registro ocupam uma linha só. Campos com erro ficam sempre à vista.

Os protótipos também podem ser abertos no projeto de design, onde é possível navegar entre as telas, e em PDF, em alta resolução.

[:material-palette-outline: Abrir o projeto de design](https://claude.ai/artifact/46j4XDcdd3JK7Dev5ixcDW){ .md-button .md-button--primary target="_blank" rel="noopener" }
[:material-file-pdf-box: Abrir em PDF (13 MB)](../assets/prototipos-ciclo-4/prototipos-ciclo-4.pdf){ .md-button target="_blank" rel="noopener" }

!!! info "Valores definidos pela FBr e valores provisórios"
    O prazo de confirmação de presença é de **24 horas antes da sessão**, como a FBr definiu em 31/10/2026. Continuam provisórios, e aparecem assim nas telas: o texto do termo de consentimento (RF57), que a equipe redigiu e a FBr ainda aprova; e os campos obrigatórios e o limite de 1.000 caracteres da anamnese (RF69) e da evolução (RF28).

!!! question "Propostas para validar com a FBr"
    - **Itens novos no menu:** "Agenda" para o supervisor (agenda dos seus estagiários, RF11) e "Fila de espera" para a coordenação (RF7). Os dois estão marcados como proposta nas telas.
    - **Fila (RF8):** o inscrito vê uma de três situações, "Aguardando triagem", "Na fila de espera" (com a posição na fila inteira) e "Em atendimento".
    - **Reversão do desligamento (RF38):** a coordenação escolhe, no diálogo, quais faltas deixam de contar.
    - **Transferência (RF25):** a coordenação pode escolher um supervisor que já está no limite de 50 casos, com aviso.

## 1. Público: termo, verificação, fila e link da sessão

### RF57 — Registrar consentimento para tratamento de dados { #rf57 }

[RF57](../unidade-2/requisitos/funcionais.md#rf57) · issue [#52](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/52). O termo fica na etapa 3 da inscrição, depois do resumo da revisão. No resumo, cada bloco de dados ocupa uma linha e pode ser aberto. O termo traz a versão e cinco tópicos que a pessoa abre para ler: o que é coletado, para que, quem tem acesso, o prazo de guarda de 5 anos e como revogar. A caixa de concordância fica sempre à vista e começa desmarcada. São quatro estados:

- **maior de idade:** termo e caixa de concordância antes de "Concluir inscrição";
- **erro sem aceite:** a inscrição não é concluída, com o resumo no topo e a mensagem junto da caixa;
- **menor de idade:** o responsável legal vê o nome e o CPF dele, informados na etapa 1, só para leitura, concorda e vê o aviso de que o aceite on-line não substitui a autorização assinada na clínica;
- **erro do menor de idade:** CPF do responsável não informado na etapa 1, com a orientação de voltar e corrigir, e caixa desmarcada, cada mensagem junto do seu item.

**No computador**

[![Termo de consentimento no computador: maior de idade, erro sem aceite, menor de idade e erro sem identificação do responsável](../assets/prototipos-ciclo-4/1-1-termo-computador.webp)](../assets/prototipos-ciclo-4/1-1-termo-computador.webp){ target="_blank" }

**No celular**

[![Termo de consentimento no celular: os mesmos quatro estados](../assets/prototipos-ciclo-4/1-2-termo-celular.webp)](../assets/prototipos-ciclo-4/1-2-termo-celular.webp){ target="_blank" }

### RF52 — Verificar identidade do paciente ou responsável { #rf52 }

[RF52](../unidade-2/requisitos/funcionais.md#rf52) · issue [#47](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/47). Antes de consultar a fila (RF8) ou pedir uma declaração (CP10), o paciente ou o responsável informa o CPF ou o número da inscrição e o código de 6 dígitos enviado ao e-mail cadastrado. São quatro estados:

- **identificação:** com o aviso para quem informou só o celular;
- **código enviado:** com a mesma mensagem, haja ou não e-mail cadastrado, e o reenvio liberado só depois de 60 segundos;
- **código inválido ou expirado:** com uma mensagem única para qualquer falha;
- **limite de pedidos:** depois de 3 códigos em 60 minutos, com o horário de liberação.

**No computador**

[![Verificação de identidade no computador: identificação, código enviado, código inválido ou expirado e limite de pedidos](../assets/prototipos-ciclo-4/7-1-verificacao-computador.webp)](../assets/prototipos-ciclo-4/7-1-verificacao-computador.webp){ target="_blank" }

**No celular**

[![Verificação de identidade no celular: identificação, código enviado, código inválido ou expirado e limite de pedidos](../assets/prototipos-ciclo-4/7-2-verificacao-celular.webp)](../assets/prototipos-ciclo-4/7-2-verificacao-celular.webp){ target="_blank" }

### RF8 — Consultar posição individual na fila { #rf8 }

[RF8](../unidade-2/requisitos/funcionais.md#rf8) · issue [#155](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/155). Depois da verificação de identidade (RF52), o inscrito vê a situação da inscrição. O aviso de que a posição pode mudar e não garante data fica junto do resultado. São quatro estados:

- **na fila de espera:** com a posição em destaque;
- **aguardando triagem:** sem posição, explicando o próximo passo;
- **em atendimento:** sem posição, indicando a secretaria para dúvidas;
- **acesso negado:** sem verificação válida ou depois de 15 minutos, sem nenhum dado da inscrição e com o botão para confirmar a identidade de novo.

**No computador**

[![Posição na fila no computador: na fila de espera, aguardando triagem, em atendimento e acesso negado](../assets/prototipos-ciclo-4/1-3-fila-computador.webp)](../assets/prototipos-ciclo-4/1-3-fila-computador.webp){ target="_blank" }

**No celular**

[![Posição na fila no celular: os mesmos quatro estados](../assets/prototipos-ciclo-4/1-4-fila-celular.webp)](../assets/prototipos-ciclo-4/1-4-fila-celular.webp){ target="_blank" }

### RF14 e RF15 — Página do link da sessão { #rf14-rf15-link }

[RF14](../unidade-2/requisitos/funcionais.md#rf14) e [RF15](../unidade-2/requisitos/funcionais.md#rf15) · issues [#142](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/142) e [#143](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/143). O paciente abre o link recebido no agendamento, sem login, e confirma a presença até 24 horas antes da sessão ou cancela com justificativa. São sete estados:

- **sessão agendada:** com o prazo para confirmar e as opções de confirmar ou cancelar;
- **presença confirmada;**
- **prazo encerrado:** a confirmação não está mais disponível, e a página indica a secretaria;
- **link não é mais válido:** sessão já cancelada ou link vencido;
- **cancelar:** formulário com a justificativa obrigatória;
- **erro sem justificativa;**
- **sessão cancelada.**

**No computador**

[![Link da sessão no computador: sessão agendada, presença confirmada, prazo encerrado, link inválido, cancelar, erro sem justificativa e sessão cancelada](../assets/prototipos-ciclo-4/1-5-link-sessao-computador.webp)](../assets/prototipos-ciclo-4/1-5-link-sessao-computador.webp){ target="_blank" }

**No celular**

[![Link da sessão no celular: os mesmos sete estados](../assets/prototipos-ciclo-4/1-6-link-sessao-celular.webp)](../assets/prototipos-ciclo-4/1-6-link-sessao-celular.webp){ target="_blank" }

## 2. Secretaria: confirmações, cancelamentos e responsáveis

### RF14 — Sessões sem confirmação na agenda { #rf14 }

[RF14](../unidade-2/requisitos/funcionais.md#rf14) · issue [#142](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/142). Na Agenda, a secretaria vê as sessões cujo prazo de confirmação acabou sem resposta do paciente, com o canal preferencial, o caminho para os contatos e a opção de registrar a confirmação feita por telefone. Também aparece o estado vazio.

[![Agenda da secretaria: sessões sem confirmação e estado vazio](../assets/prototipos-ciclo-4/2-1-agenda-confirmacao.webp)](../assets/prototipos-ciclo-4/2-1-agenda-confirmacao.webp){ target="_blank" }

### RF15 e RF16 — Cancelar sessão { #rf15-rf16 }

[RF15](../unidade-2/requisitos/funcionais.md#rf15) e [RF16](../unidade-2/requisitos/funcionais.md#rf16) · issues [#143](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/143) e [#144](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/144). O mesmo diálogo "Cancelar sessão" registra o pedido do paciente (no prazo ou fora dele, quando conta como falta), o cancelamento para remarcar (que não conta falta para ninguém) e a ausência do estagiário. Aparecem também a sessão já iniciada, que não pode mais ser cancelada, o erro sem justificativa e o acesso negado para o estagiário que não é o responsável.

[![Cancelar sessão: pedido do paciente no prazo e fora do prazo, cancelamento para remarcar, sessão já iniciada, ausência do estagiário, erro e acesso negado](../assets/prototipos-ciclo-4/2-2-cancelar-sessao.webp)](../assets/prototipos-ciclo-4/2-2-cancelar-sessao.webp){ target="_blank" }

### RF22 — Consultar responsáveis pelo caso { #rf22 }

[RF22](../unidade-2/requisitos/funcionais.md#rf22) · issue [#145](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/145). A lista de Pacientes e a ficha mostram o estagiário e o supervisor de cada caso, ou indicam que o caso ainda não tem um deles, sem dado clínico.

[![Responsáveis pelo caso: lista de pacientes, ficha com responsáveis, caso sem estagiário e caso sem supervisor](../assets/prototipos-ciclo-4/2-3-responsaveis.webp)](../assets/prototipos-ciclo-4/2-3-responsaveis.webp){ target="_blank" }

## 3. Faltas e desligamento

### RF34 — Registrar falta do paciente na sessão { #rf34 }

[RF34](../unidade-2/requisitos/funcionais.md#rf34) · issue [#150](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/150). A falta é registrada na sessão, com a opção de marcá-la como justificada na hora ou depois. A falta justificada continua contando. Aparecem o erro de justificativa sem motivo, as sessões que não aceitam falta e o acesso negado.

[![Registrar falta: diálogo, falta registrada, marcar como justificada depois, erro, sessões que não aceitam falta e acesso negado](../assets/prototipos-ciclo-4/3-1-falta.webp)](../assets/prototipos-ciclo-4/3-1-falta.webp){ target="_blank" }

### RF35 — Contabilizar faltas do paciente no ciclo { #rf35 }

[RF35](../unidade-2/requisitos/funcionais.md#rf35) · issue [#151](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/151). O contador "Faltas no ciclo: 1 de 2" aparece para a secretaria e para o estagiário, com o histórico do que conta e do que não conta, e com a falta desconsiderada depois de uma reversão.

[![Faltas no ciclo: primeira falta para a secretaria e para a estagiária, histórico das faltas e contagem depois da reversão](../assets/prototipos-ciclo-4/3-2-contagem-faltas.webp)](../assets/prototipos-ciclo-4/3-2-contagem-faltas.webp){ target="_blank" }

### RF36 — Emitir alerta de limite de faltas atingido { #rf36 }

[RF36](../unidade-2/requisitos/funcionais.md#rf36) · issue [#152](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/152). Na 2ª falta do ciclo, uma faixa de alerta aparece para a secretaria, a coordenação e o estagiário, sem o motivo das faltas, e só sai depois da decisão sobre o desligamento.

[![Alerta de limite de faltas: secretaria, coordenação com vários pacientes, estagiária e depois da decisão](../assets/prototipos-ciclo-4/3-3-alerta-faltas.webp)](../assets/prototipos-ciclo-4/3-3-alerta-faltas.webp){ target="_blank" }

### RF37 — Desligar paciente por faltas e liberar vaga { #rf37 }

[RF37](../unidade-2/requisitos/funcionais.md#rf37) · issue [#153](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/153). A secretaria confirma o desligamento, que cancela as sessões futuras e libera a vaga. A coordenação e o supervisor veem a vaga liberada e o próximo inscrito elegível da fila. O paciente sem alerta não tem a ação.

[![Desligar paciente por faltas: confirmação, paciente desligado, vaga liberada para a coordenação e para o supervisor, fila vazia e paciente sem alerta](../assets/prototipos-ciclo-4/3-4-desligamento.webp)](../assets/prototipos-ciclo-4/3-4-desligamento.webp){ target="_blank" }

### RF38 — Reverter desligamento de paciente por faltas { #rf38 }

[RF38](../unidade-2/requisitos/funcionais.md#rf38) · issue [#154](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/154). A coordenação reverte o desligamento com motivo obrigatório e escolhe as faltas que deixam de contar. O caso volta ao atendimento com o mesmo estagiário, ou aguarda vaga se ela já foi ocupada, e a secretaria reagenda as sessões.

[![Reverter desligamento: diálogo, erro sem motivo, vaga ainda livre, vaga já ocupada, visão da secretaria e sessões a reagendar](../assets/prototipos-ciclo-4/3-5-reversao.webp)](../assets/prototipos-ciclo-4/3-5-reversao.webp){ target="_blank" }

## 4. Casos, agenda e transferência

### RF23 — Consultar casos sob responsabilidade do estagiário ou supervisor { #rf23 }

[RF23](../unidade-2/requisitos/funcionais.md#rf23) · issue [#146](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/146). "Meus pacientes" do estagiário e "Meus casos" do supervisor, com o filtro por estagiário, o caso aguardando vínculo, o estado vazio e o acesso negado a um caso de outro estagiário.

[![Casos sob responsabilidade: meus pacientes, meus casos do supervisor, estado vazio e acesso negado](../assets/prototipos-ciclo-4/4-1-casos.webp)](../assets/prototipos-ciclo-4/4-1-casos.webp){ target="_blank" }

### RF11 — Consultar agenda de sessões do estagiário { #rf11 }

[RF11](../unidade-2/requisitos/funcionais.md#rf11) · issue [#141](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/141). A agenda da semana do estagiário, com filtros por período e situação, e a agenda dos estagiários do supervisor, que só mostra os estagiários dele.

[![Agenda do estagiário: agenda da semana, período sem sessões, agenda do supervisor e acesso negado](../assets/prototipos-ciclo-4/4-2-agenda-estagiario.webp)](../assets/prototipos-ciclo-4/4-2-agenda-estagiario.webp){ target="_blank" }

### RF25 — Transferir caso para outro estagiário ou supervisor { #rf25 }

[RF25](../unidade-2/requisitos/funcionais.md#rf25) · issue [#147](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/147). O supervisor transfere o caso para outro estagiário seu, e a coordenação, para outro supervisor, vendo os casos ativos de cada um. A transferência pede motivo e confirmação, guarda o histórico e tira o acesso do responsável anterior.

[![Transferir caso: formulário do supervisor, erro, formulário da coordenação, confirmação, caso transferido e acesso negado ao responsável anterior](../assets/prototipos-ciclo-4/4-3-transferir.webp)](../assets/prototipos-ciclo-4/4-3-transferir.webp){ target="_blank" }

## 5. Prontuário

### RF27 — Consultar prontuário do paciente { #rf27 }

[RF27](../unidade-2/requisitos/funcionais.md#rf27) · issue [#148](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/148). O prontuário, nas seções do modelo da clínica, para o estagiário, o supervisor e a coordenação (só leitura, com o acesso registrado). Aparecem também o prontuário sem registros, o histórico depois de uma transferência e o acesso negado, que não sugere a existência de conteúdo clínico. As evoluções e o histórico de responsáveis começam fechados, as seções sem registro ocupam uma linha e a barra "Ir para" fica fixa no topo ao rolar. Em "Sessões do ciclo", a sessão que já terminou mostra à estagiária responsável a ação "Marcar sessão como realizada", como o sistema já faz. O contrato aparece como no Ciclo 3: data de assinatura, termo de consentimento para pesquisa e via assinada.

[![Consultar prontuário: estagiária, supervisor, coordenação só leitura, seções sem registro, depois de transferência e acesso negado](../assets/prototipos-ciclo-4/5-1-prontuario.webp)](../assets/prototipos-ciclo-4/5-1-prontuario.webp){ target="_blank" }

### RF69 — Registrar anamnese e contrato terapêutico do paciente { #rf69 }

[RF69](../unidade-2/requisitos/funcionais.md#rf69) · issue [#130](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/130). O estagiário registra a anamnese, com a queixa trazida da inscrição, e o contrato terapêutico. O contrato é o "Contrato de Prestação de Serviço" da Clínica Escola, assinado em papel na primeira sessão. No sistema ficam a data de assinatura, o aceite do termo de consentimento para pesquisa (opcional) e a guarda da via assinada na clínica (obrigatória). Aparecem os erros de campo obrigatório, de limite de caracteres e de via assinada não marcada, o registro salvo, a leitura pelo supervisor e o bloqueio do caso sem prontuário.

[![Anamnese e contrato terapêutico: formulário, erros, registro salvo, leitura do supervisor e caso sem prontuário](../assets/prototipos-ciclo-4/5-2-dados-iniciais.webp)](../assets/prototipos-ciclo-4/5-2-dados-iniciais.webp){ target="_blank" }

### RF28 — Registrar evolução da sessão realizada { #rf28 }

[RF28](../unidade-2/requisitos/funcionais.md#rf28) · issue [#149](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/149). O estagiário registra a evolução pelo prontuário, na seção "Sessões do ciclo", como o sistema já faz: depois que a sessão termina, ele a marca como realizada, e então a ação "Registrar evolução" abre o formulário. Depois de salva, a evolução não pode ser editada. Na agenda, a sessão realizada leva ao prontuário. Aparecem os erros, a evolução salva, o aviso de fechamento avaliativo na 10ª sessão, as ações de cada sessão no prontuário (sem "Registrar evolução" antes de a sessão ser marcada como realizada) e o acesso negado.

[![Registrar evolução: formulário, erros, evolução salva, aviso de fechamento avaliativo, ações da sessão no prontuário e acesso negado](../assets/prototipos-ciclo-4/5-3-evolucao.webp)](../assets/prototipos-ciclo-4/5-3-evolucao.webp){ target="_blank" }

## 6. Coordenação: fila de espera

### RF7 — Ordenar inscritos na fila de espera { #rf7 }

[RF7](../unidade-2/requisitos/funcionais.md#rf7) · issue [#140](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/140). A fila ordenada pela prioridade clínica confirmada na triagem e, na mesma prioridade, pela data de entrada na fila, com as inscrições ainda sem prioridade numa seção à parte, fora da ordenação. Aparecem a fila depois de uma mudança de prioridade, o estado vazio e o acesso negado para a secretaria.

[![Fila de espera: fila ordenada, depois de mudança de prioridade, fila vazia e acesso negado](../assets/prototipos-ciclo-4/6-1-fila-espera.webp)](../assets/prototipos-ciclo-4/6-1-fila-espera.webp){ target="_blank" }
