# Entrega final: integração, homologação e produção

Em 17/11/2026, o professor definiu que o site precisa estar publicado em produção em 01/12/2026, início das apresentações finais. Esta página reúne o que falta até lá:

- as datas;
- a ordem em que as PRs entram na `development`;
- o roteiro que a FBr segue para aprovar o sistema na validação (homologação);
- o passo a passo da publicação em produção.

A validação é o ambiente de homologação: [validacao.clinica.fbr.edu.br](https://validacao.clinica.fbr.edu.br), publicado a cada merge na `development`, só com dados fictícios ([Implantação e segurança](implantacao.md)).

## Datas { #datas }

| Quando | O quê | Quem |
| --- | --- | --- |
| Até quarta, 25/11 | As features do Ciclo 6 com a PR aberta, revisada e aprovada, o CI verde e as telas testadas no navegador contra as pranchas. Nada é mesclado antes de o professor liberar o repositório | Líderes de Feature e revisores |
| Na liberação do repositório pelo professor | Integração na `development`, na [ordem abaixo](#ordem-de-integracao). Cada merge publica a validação | Gabriel e Joaquim |
| Até sexta, 27/11 | A FBr testa na validação com o [roteiro de homologação](#roteiro-de-homologacao) e registra o aceite ou os apontamentos | FBr, com o Joaquim acompanhando |
| Sábado, 28/11, e domingo, 29/11 | Correção do que a FBr apontar, com nova conferência na validação | Líderes de Feature |
| Segunda, 30/11 | [Publicação em produção](#publicacao-em-producao) | Gabriel e Joaquim |
| Terça, 01/12 | Apresentação final, com o site em produção | Equipe |

O prazo das features é quarta porque a produção só sai depois do aceite da FBr na validação. Com tudo pronto na quarta, a FBr tem até sexta para testar, e o fim de semana fica para as correções.

## Ordem de integração { #ordem-de-integracao }

As PRs abertas em 24/11 entram nesta ordem. A ordem respeita as que estão empilhadas e os números das migrations:

| Ordem | PR | O que traz | Migration | Observação |
| --- | --- | --- | --- | --- |
| 1 | [#298](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/298) | Dependências da documentação | — | — |
| 2 | [#299](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/299) | Dependências do código | — | O e2e do RF44 em 320 px falha às vezes até a #305 entrar; se falhar, rode de novo |
| 3 | [#294](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/294) | CRP do supervisor (RF53) | `0022` | — |
| 4 | [#296](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/296) | API da declaração de comparecimento (RF45) | `0023` | Empilhada sobre a #294 |
| 5 | [#303](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/303) | Relatório final: modelo, impressão e entrega (RF33) | `0024` | Empilhada sobre a #296 |
| 6 | [#310](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/310) | Relatório final: elaboração, envio e revisão (RF33) | `0025` | Empilhada sobre a #303 |
| 7 | [#300](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/300) | Tela da declaração (RF45) | — | Usa a API da #296 |
| 8 | [#312](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/312) | e2e da emissão da declaração (RNF41) | — | Empilhada sobre a #300 |
| 9 | [#295](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/295) | Relatório institucional em PDF (RF49) | — | — |
| 10 | [#297](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/297) | Correções do Ciclo 6 (sessão expirada, fila, ficha) | — | — |
| 11 | [#305](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/305) | Contato de emergência e endereço completo obrigatórios na inscrição (RF1) | — | Corrige também o e2e instável do RF44 |
| 12 | [#301](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/301) | Encerramento por alta (RF68) | `0022` → `0026` | Renumerar antes do merge |
| 13 | [#306](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/306) | RNF27 associado ao RF30 no catálogo | — | — |
| 14 | [#302](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/302) | Estado das features no catálogo | — | — |
| 15 | [#311](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/311) | Validação das funcionalidades do Ciclo 5 pela FBr (24/11) | — | — |
| 16 | [#313](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/313) | Carga só do RNF47 | — | — |
| 17 | [#304](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/304) | Entrega final e o fim do Ciclo 7 | — | — |
| 18 | [#314](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/314) | Unidade 4 no menu e Representação de requisitos | — | Empilhada sobre a #304 |
| 19 em diante | As features dos demais Líderes, como [#307](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/307) (RF43), [#308](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/308) (RF30) e [#309](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/309) (RF67, empilhada sobre a #308) | Na ordem em que forem aprovadas | Próximo número livre, a partir da `0027` | Renumerar antes do merge |

**Regras da integração:**

- **Uma de cada vez.** Depois de cada merge, espere o CI da `development` e o workflow **Implantação** da validação terminarem verdes antes da próxima. Se a validação quebrar, reverta a PR antes de seguir.
- **PRs empilhadas.** Quando a PR de baixo entra e a branch dela é apagada, o GitHub muda a base da PR de cima para a `development`. Se não mudar, troque a base à mão e espere o CI rodar de novo: nas PRs empilhadas, o CI completo só roda com a base na `development`.
- **Migration repetida.** Duas PRs que criam a mesma migration (`0022` na #294 e na #301, por exemplo) não podem entrar com o mesmo número. Na PR que entra depois:
    1. atualize a branch com a `development`;
    2. apague a migration e o snapshot dela, e a entrada dela no `meta/_journal.json`;
    3. gere de novo com `pnpm --filter @clinica/database db:generate --name <nome>`;
    4. copie para o arquivo novo o SQL escrito à mão (gatilhos e comentários), que o gerador não recria;
    5. rode os testes da API.
- **Versão do histórico repetida.** Cada PR já tem a sua linha no [histórico de versões](../index.md). Se duas usarem o mesmo número, a que entra depois passa para o próximo número livre. Já se repetem: a 3.95 (#297 e #300), a 3.101 (#307 e #311), a 3.102 (#308 e #312), a 3.103 (#305 e #309) e a 3.104 (#310; a #314 já passou para a 3.105).
- **Marcos nas issues.** O merge marca o D4.3. O bot marca os marcos que dependem de comentário: `/de-acordo`, `/demonstrada` e `/aceite`. Confira se a aprovação da PR marcou o D3.1.

## Roteiro de homologação { #roteiro-de-homologacao }

Roteiro para a FBr testar na validação as features que ainda não têm o aceite: as do Ciclo 6 e as dos ciclos anteriores que estão em "Código concluído", "Código inspecionado" ou "Promovida". As features já aceitas não precisam ser testadas de novo, mas qualquer problema encontrado nelas também deve ser apontado.

**Preparação, pela equipe:**

- **Contas:** a coordenação da validação cadastra uma conta de cada perfil (coordenação, supervisor, estagiário e secretaria) com e-mails das pessoas da FBr que vão testar. Elas recebem o convite e criam a própria senha (RF53). O Joaquim combina com a FBr quem testa cada perfil.
- **Dados:** os pacientes são fictícios, inscritos pela página pública da validação. Não use dados reais: a faixa no topo de todas as páginas lembra disso.
- **Casos de exemplo:** a equipe deixa casos prontos para os fluxos que dependem de histórico, como um ciclo com sessões realizadas e evoluções, para que a FBr não precise montar tudo.

**Como registrar o resultado:** a FBr responde ao Joaquim, no grupo ou por e-mail, com "aceito" ou com os apontamentos de cada linha. A equipe registra a resposta na issue da feature: `/demonstrada <link>` marca o D5.1, e `/aceite <link>` marca o D6.1. Cada apontamento vira uma issue de correção (D6.2).

### Paciente ou responsável, sem conta

| Feature | Faça | Deve acontecer |
| --- | --- | --- |
| RF1 · Inscrição | Inscreva um paciente adulto sem RG. Depois tente enviar sem o contato de emergência e, numa terceira inscrição, um menor de idade sem o responsável | A primeira inscrição é registrada com número e aviso de que depende da triagem e das vagas. As outras duas são bloqueadas, com o campo indicado e os dados mantidos |
| RF57 · Consentimento | Tente concluir a inscrição sem aceitar o termo | O envio é bloqueado e o aceite é pedido. O termo traz o prazo de guarda e como revogar |
| RF52 · Verificação de identidade | Em "Consultar", informe o CPF, receba o código no e-mail e use-o. Depois tente um código errado cinco vezes | Com o código certo, só os dados dessa inscrição aparecem. Na quinta tentativa errada, o código deixa de valer |
| RF44 · Sessões com presença | Verificado, abra as sessões com presença | Só aparecem as sessões realizadas, com data, horário e estagiário |
| RF45 · Declaração | Emita a declaração de uma sessão realizada. Para um menor de idade, tente antes de a secretaria registrar a autorização | A declaração mostra a data, o horário, o estagiário e o psicólogo responsável com o CRP, só para ver e imprimir. Para o menor sem autorização, a emissão é bloqueada com o aviso |

### Secretaria

| Feature | Faça | Deve acontecer |
| --- | --- | --- |
| RF10 · Agendamento | Agende uma sessão para um paciente com estagiário. Tente outra sessão do mesmo estagiário no intervalo de anotações | A sessão fica agendada com o término calculado. O conflito é bloqueado e explicado |
| RF41 · Contribuição social | Registre o pagamento de um paciente e tente registrar de novo no mesmo ciclo | O pagamento fica efetivado com valor, data, forma e autor. O segundo é bloqueado, com a data do primeiro |
| RF42 · Situação da contribuição | Filtre os pacientes pendentes. Registre um pagamento e filtre de novo | O paciente sai dos pendentes e aparece como efetivado, com a data |
| RF43 · Bloqueio do agendamento | Para um paciente com uma sessão realizada e a contribuição pendente, tente agendar | O agendamento é bloqueado, com o motivo. Depois do pagamento, é permitido. A primeira sessão do ciclo nunca é bloqueada |
| RF16 e RF17 · Ausência do estagiário | Registre a ausência do estagiário numa sessão, com o motivo | A sessão é cancelada, e o paciente recebe o e-mail sem o motivo, dizendo que não conta como falta. Sem e-mail, aparece o aviso com "Enviar pelo WhatsApp" |
| RF45 · Autorização do menor | Na ficha de um menor, registre a entrega da autorização e emita a declaração | Antes do registro, a declaração é bloqueada; depois, sai normalmente |
| RF65 · Revogação do consentimento | Revogue o consentimento de um inscrito na fila, depois de conferir a identidade | A inscrição sai da fila como "cancelada por revogação do consentimento", com data, autor e forma de verificação. Sem a verificação, a revogação não é concluída |
| RF33 · Entrega do relatório final | Na ficha de um paciente com o relatório aprovado, imprima e registre a entrega. Num relatório ainda em revisão, procure a impressão | O relatório sai em uma folha A4 com as linhas de assinatura. A entrega exige a confirmação da via assinada e mostra quem entregou e quando. Sem aprovação, aparece só o aviso, sem imprimir. Não há download nem e-mail |

### Estagiário

| Feature | Faça | Deve acontecer |
| --- | --- | --- |
| RF27 · Prontuário | Abra o prontuário de um paciente seu | Aparecem todas as seções do ciclo; o que ainda não tem registro aparece como "Sem registro neste ciclo" |
| RF29 · Correção da evolução | Corrija uma evolução sem motivo e depois com motivo | Sem motivo, é recusada. Com motivo, a versão anterior continua guardada |
| RF30 · Complemento da evolução | Acrescente um complemento a uma evolução | O complemento aparece separado da evolução e das correções, com autor e data/hora, sem mudar o que já estava registrado |
| RF31 e RF32 · Consulta da evolução | Abra a evolução de uma sessão e o histórico do ciclo | Aparecem o original, as correções e os complementos, em ordem, com a situação de validação de cada evolução |
| RF68 · Alta | Registre a alta de um paciente, com data e motivo. Registre outra com uma data anterior ao início do atendimento e cancele um pedido feito por engano | O caso aguarda a confirmação do supervisor; só depois disso fica encerrado. A data anterior é recusada, e o pedido cancelado fica no histórico, com o motivo |
| RF33 · Relatório final | Escreva o relatório do ciclo, envie para revisão e, depois da aprovação, finalize em PDF | Sessões sem evolução aparecem apontadas, sem texto criado pelo sistema. Com menos de 8 ou mais de 10 sessões, o envio pede a justificativa. A versão aprovada não muda mais |

### Supervisor

| Feature | Faça | Deve acontecer |
| --- | --- | --- |
| RF67 · Validação da evolução | Valide uma evolução. Depois, peça ao estagiário uma correção nela | A evolução fica validada, com o seu nome e a data/hora. Depois da correção, volta a "pendente de validação" |
| RF68 · Confirmação da alta | Confirme a alta registrada pelo estagiário. Num outro pedido, recuse com o motivo | O caso fica encerrado por alta, a vaga é liberada e não aceita mais agendamento. Na recusa, o caso continua em atendimento, e o estagiário pode pedir de novo |
| RF33 · Revisão do relatório | Devolva um relatório sem observações, depois com observações. Aprove a versão seguinte | Sem observações, a devolução é recusada. As duas versões ficam na lista, e a aprovada mostra o seu nome e a data |
| RF39, RF40 e RF63 · Faltas do estagiário | Consulte as faltas de um estagiário seu, num semestre com três ausências registradas | Aparecem só as ausências reais, sem o nome do paciente. Na terceira, aparece a sinalização de reprovação |

### Coordenação

| Feature | Faça | Deve acontecer |
| --- | --- | --- |
| RF50, RF51 e RF54 · Acesso | Entre, saia e tente voltar pelo botão "voltar" do navegador. Desative um usuário de teste e tente entrar com ele | Depois de sair, as páginas internas pedem nova entrada. O usuário desativado não entra |
| RF53 · Cadastro de usuário | Cadastre um supervisor sem o CRP e depois com o CRP | Sem o CRP, o cadastro é recusado; com ele, o convite é enviado |
| RF55 e RF56 · Acesso ao prontuário | Abra um prontuário e depois consulte o registro de acessos, filtrando por esse paciente | A coordenação lê sem poder alterar, e a consulta aparece no registro como "visualização", sem o conteúdo clínico |
| RF48 e RF49 · Indicadores | Consulte os indicadores de um mês e exporte em PDF | O PDF traz os mesmos valores da tela, o intervalo, a data de referência e quem exportou |
| RF64 · Decisão sobre a reprovação | Registre a decisão sobre um estagiário sinalizado, primeiro sem justificativa | Sem justificativa, é recusada. Com ela, a sinalização se encerra e a decisão fica no histórico |
| RF68 · Reabertura | Reabra um caso encerrado por alta neste semestre, com o motivo | O caso volta a "em atendimento", com o mesmo prontuário |
| RF33 · Consulta do relatório | Abra o relatório final de um caso | As versões aparecem só para leitura, sem aprovar nem imprimir |

### Teste de usabilidade da emissão da declaração (RNF41) { #teste-de-usabilidade-da-emissao-da-declaracao-rnf41 }

O [RNF41](../requisitos/nao-funcionais.md#rnf41) pede que a declaração de comparecimento saia em até 3 interações a partir da tela do paciente, sem treinamento. A contagem de interações já é conferida por um e2e ([#312](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/312)). Falta o teste com pessoas, no [patamar mínimo de lançamento](../requisitos/priorizacao-e-mvp.md#patamar-minimo-de-lancamento-dos-rnfs-evolutivos): pelo menos **3 pessoas da secretaria** e **3 pacientes ou responsáveis**, sem ajuda. Sem ele, o RF44 (#226) e o RF45 (#280) não chegam a "Aceita", porque o D4.5 exige as duas evidências.

| Quem | Ponto de partida | Tarefa | Anotar |
| --- | --- | --- | --- |
| 3 pessoas da secretaria | A ficha de um paciente com uma sessão realizada | "Emita e imprima a declaração de comparecimento da última sessão deste paciente" | Se concluiu sem ajuda, quantos toques ou cliques fez a partir da ficha e onde hesitou |
| 3 pacientes ou responsáveis (podem ser pessoas da clínica, com a inscrição de um paciente fictício) | A página "Declarações", já com a identidade verificada | "Emita e imprima a declaração da sua última sessão" | Os mesmos itens |

- **Atende:** todos concluem sem ajuda, em até 3 interações. Se alguém não concluir, a equipe registra onde a pessoa parou e trata como correção (D6.2).
- **Preparação:** a equipe deixa os pacientes fictícios com uma sessão realizada e a identidade verificável, e quem aplica o teste não explica a tela antes.
- **Registro:** com a resposta da FBr, a equipe registra `/rnf RNF41 <link>` nas issues do RF44 e do RF45, com o número de participantes por público, quantos concluíram sem ajuda e o maior número de interações observado.

## Publicação em produção { #publicacao-em-producao }

A produção sai da `main`, com a aprovação do Joaquim ou do Gabriel no ambiente `producao` do GitHub ([Fluxo das branches](implantacao.md#fluxo-das-branches)).

**Antes, na produção:**

- [ ] A validação está aceita pela FBr, e as correções apontadas foram conferidas.
- [ ] **Usuário do banco:** a `DATABASE_URL_API` da produção usa o `clinica_app` ([Usuário da aplicação no banco](implantacao.md#usuario-da-aplicacao-no-banco-rnf52)).
- [ ] **Chave dos dados:** a `CHAVE_DADOS` da produção é diferente da validação e tem uma cópia no cofre de senhas da coordenação.
- [ ] **Inscrição pública:** `AMBIENTE_APLICACAO=producao`, e a inscrição fica fechada (`INSCRICAO_ABERTA` desligada) enquanto o termo de consentimento for provisório ([Inscrição pública](implantacao.md#configuracao)).
- [ ] **Cópia de segurança:** a cópia diária do banco está agendada e o destino fora da VPS foi combinado com a FBr ([Cópia de segurança e restauração](copia-de-seguranca.md)).
- [ ] **Imagens:** o token do GHCR na VPS está válido.

**Publicação:**

1. Abra a PR `main <- development`. Ela precisa do CI verde e da aprovação de outro integrante.
2. Depois do merge, aprove o deploy no ambiente `producao`, na execução do workflow **Implantação**.
3. Espere o workflow terminar: ele confere o `/health` da API com o commit publicado.
4. Rode o workflow **Verificar implantação** contra a produção (RNF51).
5. Crie a primeira conta da coordenação, se for o primeiro deploy ([Primeira conta da coordenação](implantacao.md#primeira-conta-da-coordenacao)), e confira com ela:
    - a entrada;
    - o cadastro de um usuário;
    - a abertura do painel;
    - a página pública de inscrição, com o aviso de inscrição fechada se o termo ainda for provisório.

**Se algo der errado:** reverta a PR na `main`, e o merge da reversão publica a versão anterior. As migrations só andam para a frente. Se uma migration estragar dados, a volta é pela restauração da cópia de segurança, como descrito na [página da cópia](copia-de-seguranca.md).

**Depois:**

- Registre o link da execução do workflow e o resultado da conferência numa ata.
- Comente `/rnf RNF51 <link>` e `/rnf RNF52 <link>` nas issues que têm esses RNFs ([Evidência do RNF51 e do RNF52](implantacao.md#evidencia-do-rnf51-e-do-rnf52-no-d45)).
