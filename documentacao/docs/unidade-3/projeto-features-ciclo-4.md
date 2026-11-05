# Projeto das features do Ciclo 4

Esta página registra o processo **Projetar por Feature** do FDD para as features do Ciclo 4: o modelo detalhado, os diagramas de sequência, as rotas da API, as regras ligadas aos critérios de aceitação e os dados de teste de cada feature. Como no Ciclo 3, ela é o material da **inspeção de design** (marco 1 do [DoD](../unidade-2/requisitos/dor-dod.md#1-design-inspecionado)), e o resultado da inspeção de cada feature é registrado na sua issue.

!!! info "Quem escreveu o projeto do Ciclo 4"
    Por causa do prazo do ciclo, o projeto de todas as features foi escrito pelo Gabriel em 05/11/2026, menos o do RF52, escrito pelo Joaquim. Para que nenhum projeto seja inspecionado por quem o escreveu, a inspeção de cada feature é feita pelo Líder de Feature com o revisor da issue, e o código continua com cada Líder.

As seções estão agrupadas pela CP, e as classes novas ficam no modelo detalhado ou na seção da CP. Os requisitos de origem estão na [seção 8.1](../unidade-2/requisitos/funcionais.md), e os itens do ciclo, em [Features e backlog](../visao-geral/backlog.md#ciclo-4).

## Convenções

Valem as [convenções do Ciclo 3](projeto-features-ciclo-3.md#convencoes), inclusive a de citar o RF e a DF em vez de repetir a regra de negócio, com um acréscimo:

- **Rotas públicas do paciente:** o paciente e o responsável legal não têm conta (critério R6.2 do DoR). As rotas que mostram dados de uma inscrição, como a consulta da fila (RF8) e as declarações da CP10, usam o `VerificacaoGuard` do RF52, que só libera a inscrição cuja identidade foi verificada.

## Modelo detalhado do Ciclo 4

Classes novas do ciclo, que se somam ao [modelo do Ciclo 3](projeto-features-ciclo-3.md#modelo-detalhado-do-ciclo-3). A `Inscricao` aparece só com os atributos usados aqui.

```mermaid
classDiagram
    direction LR
    class Inscricao {
      +uuid id
      +string numero
      +string cpf
      +string email
      +datetime criadaEm
    }
    class CodigoVerificacao {
      +uuid id
      +string identificadorChave
      +string codigoHash
      +datetime expiraEm
      +int tentativasFalhas
      +datetime usadoEm
      +datetime invalidadoEm
      +datetime criadoEm
    }
    class LimiteCodigoVerificacao {
      +string identificadorChave
      +datetime ultimoEnvioEm
      +datetime janelaInicio
      +int enviosNaJanela
      +datetime bloqueadoAte
    }
    class VerificacaoIdentidade {
      +uuid id
      +string tokenHash
      +datetime criadaEm
      +datetime expiraEm
      +datetime encerradaEm
    }
    Inscricao "1" -- "0..*" CodigoVerificacao : recebe
    Inscricao "1" -- "0..*" VerificacaoIdentidade : libera
```

`LimiteCodigoVerificacao` não tem chave estrangeira: ele é guardado pelo identificador informado, exista ou não uma inscrição com ele.

## Acesso e segurança (CP12)

### RF52 — Verificar identidade do paciente ou responsável ([#47](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/47))

O RF52 não mostra dados por conta própria: ele confirma a identidade e entrega às outras features uma verificação ligada a uma única inscrição. Quem usa a verificação é a consulta da posição na fila (RF8, [#155](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/155)) e, mais adiante, as declarações de comparecimento da CP10 (RF44 a RF46). O código vai só por e-mail ([DF24](../unidade-2/requisitos/decisoes-fbr.md#df24)).

**Rotas** (módulo `acesso`, todas públicas):

- `POST /verificacao/codigo`: recebe o identificador, que pode ser o CPF (com ou sem pontuação) ou o número da inscrição (`AAAA-NNNNN`). Responde sempre `202` com a mesma mensagem, ou `429` com `segundosRestantes` (pedido antes de 60 segundos) ou `bloqueadoAte` (limite de 3 códigos em 60 minutos).
- `POST /verificacao/conferir`: recebe o identificador e o código. Com o código certo, responde `200` e grava o cookie `verificacao`. Em qualquer outro caso, responde `400` com a mesma mensagem.
- `POST /verificacao/encerrar`: encerra a verificação e apaga o cookie.

O `VerificacaoGuard` lê o cookie `verificacao`, confere se a verificação está dentro do prazo e não foi encerrada e preenche `req.inscricaoVerificada` com o id da inscrição. Sem verificação válida, a rota responde `401` sem nenhum dado. O cookie é `httpOnly`, `Secure` e `SameSite=Lax`, como o da sessão do RF50, e só o hash do token fica no banco.

```mermaid
sequenceDiagram
    actor P as Paciente ou responsável
    participant W as Web
    participant A as API (acesso)
    participant DB as Banco
    participant M as E-mail
    P->>W: CPF ou número da inscrição
    W->>A: POST /verificacao/codigo
    A->>DB: reserva o envio no limite do identificador
    alt menos de 60 s desde o último envio
        A-->>W: 429 com o tempo restante
    else 3 envios nos últimos 60 min
        A-->>W: 429 com o horário de liberação
    else envio permitido
        A->>DB: busca a inscrição (pelo número, ou a mais recente do CPF)
        opt a inscrição existe e tem e-mail
            A->>DB: invalida o código anterior e cria outro, válido por 10 min
            A--)M: envia o código, sem esperar o envio
        end
        A-->>W: 202 com a mesma mensagem em todos os casos
    end
    P->>W: código de 6 dígitos
    W->>A: POST /verificacao/conferir
    A->>DB: reserva a tentativa no código vigente do identificador
    alt sem código vigente, ou código errado, expirado ou já usado
        A->>DB: na 5ª tentativa errada, invalida o código
        A-->>W: 400 com mensagem genérica
    else código certo
        A->>DB: marca o código como usado e cria a verificação (15 min)
        A->>DB: auditoria da verificação
        A-->>W: cookie de verificação
        W-->>P: informações só dessa inscrição (RF8, CP10)
    end
```

| Regra | Critério de aceitação |
| --- | --- |
| A verificação fica ligada a uma única inscrição, e o `VerificacaoGuard` só entrega o id dela às rotas do paciente | O CPF ou o número, com o código informado em até 10 minutos, libera acesso apenas às informações desse paciente |
| Sem verificação válida, as rotas do paciente respondem `401` sem dado; a conferência responde sempre a mesma mensagem, exista ou não a inscrição | Sem código, ou com código incorreto ou expirado, nada é exibido e a existência da inscrição não é confirmada |
| Para inscrição sem e-mail, nada é enviado, e a resposta é o mesmo `202` de qualquer pedido | Inscrição sem e-mail não recebe código, e a resposta é a mesma de qualquer pedido |
| `usadoEm` é gravado com um `UPDATE` condicional (`usado_em is null`), e só uma conferência simultânea passa | Código já utilizado é recusado |
| `tentativasFalhas` é reservada antes da comparação, como no RF50; na 5ª tentativa errada, o código recebe `invalidadoEm` | Na quinta tentativa incorreta, o código é invalidado e nem o correto passa a ser aceito |
| `ultimoEnvioEm` no limite do identificador; o novo código invalida o anterior | Novo código pedido antes de 60 segundos é recusado, informando o tempo restante |
| `enviosNaJanela` e `janelaInicio` contam os envios em 60 minutos; no 3º, `bloqueadoAte` recebe a hora do envio mais 60 minutos | Depois de 3 códigos em 60 minutos, o quarto pedido é recusado, e o bloqueio dura 60 minutos |

**Decisões de projeto** (a conferir na inspeção):

1. **Identificador guardado como chave, e não em texto.** `identificadorChave` é um HMAC-SHA256 do identificador normalizado (`cpf:<11 dígitos>` ou `numero:<AAAA-NNNNN>`), com uma chave do servidor. O CPF não fica gravado nas tabelas novas.
2. **Limites pelo identificador, e não pela inscrição.** Os limites valem igual para um CPF ou número que existe e para um que não existe, para que o `429` não revele a inscrição; é a mesma ideia do bloqueio do RF50 para e-mail sem conta. Como o CPF e o número são identificadores diferentes, alternando os dois uma mesma inscrição pode receber até 6 códigos por hora. O risco é aceito: cada código aceita só 5 tentativas.
3. **CPF com mais de uma inscrição:** vale a mais recente, que é a que está na fila.
4. **Duração da verificação:** 15 minutos, sem renovação (`MINUTOS_VERIFICACAO`). O RF52 não define esse prazo. Ele é curto porque a consulta é rápida e pode ser feita num computador compartilhado. Depois do prazo, a pessoa pede um novo código.
5. **Envio do e-mail fora da resposta:** a API responde sem esperar o envio, para que o tempo de resposta não indique se a inscrição existe ou tem e-mail.
6. **Código:** gerado com `crypto.randomInt` e guardado como HMAC, nunca em texto.
7. **Auditoria:** a verificação concluída grava `verificar_identidade` na auditoria, sem usuário e com a inscrição como entidade, para rastrear o acesso aos dados dela. O pedido de código não altera dado da inscrição e não é auditado.

**Telas:** página pública `/consultar`, em dois passos (identificador e código), usada pelo RF8 antes de mostrar a posição na fila. O código é digitado num campo único com `inputmode="numeric"` e `autocomplete="one-time-code"`. As mensagens de erro usam `role="alert"` e recebem o foco, e o botão de reenvio mostra o tempo restante. As telas estão nos [protótipos do Ciclo 4](prototipos-ciclo-4.md#rf52).

**Dados de teste:**

- Inscrições fictícias: uma com e-mail, uma só com celular e um CPF com duas inscrições.
- Identificadores sem inscrição: um CPF e um número inexistentes.
- Códigos: um vencido (criado há 11 minutos), um já usado e um com 4 tentativas erradas.
- Limites: um identificador com envio há 30 segundos, um com 2 envios na janela e um bloqueado.
- Em desenvolvimento, o e-mail chega ao Mailpit (`http://localhost:8025`).

**Riscos:** o remetente oficial de e-mail depende da FBr, como no RF53. O RF1, de que o RF52 depende, já está na `main` ([#139](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/139)).

---

### RF57 — Registrar consentimento para tratamento de dados ([#52](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/52))

O termo entra na etapa 3 da inscrição (RF1). A rota continua a mesma, `POST /inscricoes`, que passa a exigir o aceite. O texto do termo fica versionado no banco, e cada inscrição guarda a versão aceita e a data/hora do aceite.

```mermaid
classDiagram
    direction LR
    class VersaoTermo {
      +string versao
      +string texto
      +string resumoHash
      +datetime vigenteDesde
      +bool provisoria
    }
    class Inscricao {
      +string versaoTermoAceita
      +datetime termoAceitoEm
      +bool aceitePeloResponsavel
    }
    VersaoTermo "1" -- "0..*" Inscricao : aceita
```

**Rotas** (módulo `inscricao`, públicas):

- `GET /termo/vigente`: devolve a versão vigente e o texto, dividido nos cinco tópicos do protótipo.
- `POST /inscricoes`: recebe, além dos dados da inscrição, `aceiteTermo: true` e a `versaoTermo` que a pessoa leu.

```mermaid
sequenceDiagram
    actor P as Interessado ou responsável legal
    participant W as Web (inscrição)
    participant A as API (inscrição)
    participant DB as Banco
    W->>A: GET /termo/vigente
    A-->>W: versão vigente e os cinco tópicos
    P->>W: marca a concordância e conclui
    W->>A: POST /inscricoes com aceiteTermo e versaoTermo
    alt sem aceite
        A-->>W: 400 aceiteTermo
    else versão diferente da vigente
        A-->>W: 409 o termo mudou, leia de novo
    else menor de idade sem nome ou CPF do responsável
        A-->>W: 400 com os campos do responsável
    else válido
        A->>DB: inscrição com versaoTermoAceita, termoAceitoEm e aceitePeloResponsavel
        A->>DB: auditoria
        A-->>W: comprovante (RF2)
    end
```

| Regra | Critério de aceitação |
| --- | --- |
| `aceiteTermo` é `z.literal(true)` no esquema da inscrição | Sem aceite, a inscrição não é concluída, e o sistema indica o aceite |
| A inscrição grava a versão e o `termoAceitoEm` do servidor | A inscrição guarda a versão aceita e a data/hora |
| Para menor de idade (`menorDeIdade`), o aceite é do responsável: exige o nome e o CPF do responsável informados na etapa 1 (DF43) e grava `aceitePeloResponsavel` | Na inscrição de menor, o termo pede a identificação e a concordância do responsável |
| O texto do termo traz o prazo de guarda e como revogar (RF65) | O termo informa o prazo de guarda e como revogar |
| Uma versão nova só vale para as inscrições seguintes; as antigas mantêm a versão aceita | Cada versão aprovada vale para as inscrições seguintes, sem alterar os aceites anteriores (DF44) |

**Decisões de projeto:**

1. **Versão provisória.** Até a FBr aprovar o texto (DF44), a versão vigente é a `0.1`, marcada `provisoria`, e aparece assim na tela. A produção continua sem `INSCRICAO_ABERTA` até haver uma versão aprovada.
2. **Inscrições antigas.** As inscrições feitas antes do termo ficam com a versão vazia. Elas não são apagadas nem recebem um aceite presumido.
3. **Texto no banco, e não no código:** uma versão nova entra por migration, sem mudar o código da tela.

**Telas:** etapa 3 da inscrição, com o termo depois do resumo, os cinco tópicos que abrem e fecham, a caixa de concordância desmarcada e, para menor, o nome e o CPF do responsável só para leitura e o aviso de que o aceite on-line não substitui o termo assinado na clínica. Protótipo: [pranchas 1-1 e 1-2](prototipos-ciclo-4.md#rf57).

**Dados de teste:** uma inscrição de maior de idade com aceite e outra sem aceite; uma de menor com o CPF do responsável e outra sem; um envio com a versão `0.0`, diferente da vigente (409); uma inscrição antiga sem versão.

---

## Fila de espera (CP3)

A fila não tem tabela própria. Ela é a lista dos casos com prioridade clínica registrada (RF6) que ainda não têm estagiário vinculado, ordenada no `FilaService`. O mesmo serviço passa a ordenar a lista de casos aguardando distribuição (RF18), para as duas nunca ficarem diferentes.

**Classe alterada:** `Caso` ganha `entradaNaFilaEm`, preenchida com a data da inscrição quando a prioridade é registrada pela primeira vez. Quando um paciente volta à fila por perda da vaga (RF43), ela recebe a data da volta ([DF33](../unidade-2/requisitos/decisoes-fbr.md#df33)).

### RF7 — Ordenar inscritos na fila de espera ([#140](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/140))

**Rota:** `GET /fila` (coordenação). Devolve a fila ordenada, com a posição, o número da inscrição, o nome, a prioridade vigente, a entrada na fila e a situação do caso, e, à parte, as inscrições ainda sem prioridade, fora da ordenação.

```mermaid
sequenceDiagram
    actor C as Coordenação
    participant A as API (fila)
    participant DB as Banco
    C->>A: GET /fila
    A->>DB: casos aguardando distribuição, vínculo ou vaga, com a decisão de prioridade vigente
    A->>A: decifra a cor e ordena: vermelha, amarela, verde e depois entradaNaFilaEm
    A->>DB: inscrições sem decisão de prioridade
    A-->>C: fila ordenada e, à parte, as sem prioridade
```

| Regra | Critério de aceitação |
| --- | --- |
| Só entra na fila o caso com decisão de prioridade vigente; o RF5 e as sinalizações não definem posição | Inscrito com prioridade confirmada entra na posição da prioridade; sinalização sem classificação não define posição |
| A ordem é calculada a cada consulta, a partir da decisão vigente | Uma nova prioridade confirmada atualiza a posição |
| Caso que recebe estagiário (RF21), é desligado (RF37) ou encerrado sai da fila; as posições dos outros são recalculadas, e as decisões continuam no histórico do RF6 | Mudança de situação recalcula os afetados e preserva o histórico |
| Desempate por `entradaNaFilaEm` e, nela, pela ordem da inscrição | Na mesma prioridade, fica à frente quem se inscreveu primeiro |

**Decisão de projeto:** a fila inclui os casos aguardando distribuição, aguardando vínculo e aguardando vaga (RF38), porque todos esperam um estagiário. A ordenação acontece na aplicação, depois de decifrar a cor, como no RF18.

**Telas:** item "Fila de espera" no menu da coordenação (proposta levada à FBr em 06/11), com a posição, a prioridade e a entrada na fila, e a seção das inscrições sem prioridade. Protótipo: [prancha 6-1](prototipos-ciclo-4.md#rf7).

**Dados de teste:** três casos vermelhos, amarelos e verdes inscritos em ordem trocada; dois casos amarelos inscritos em dias diferentes; um caso que muda de verde para vermelha; um caso que recebe estagiário (sai da fila); uma inscrição sem prioridade; a secretaria tentando abrir a fila (403).

---

### RF8 — Consultar posição individual na fila ([#155](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/155))

**Rota:** `GET /fila/minha-situacao` (pública, com o `VerificacaoGuard` do RF52). Usa só a inscrição ligada à verificação, em `req.inscricaoVerificada`, e devolve uma de três situações: aguardando triagem, na fila (com a posição na fila inteira) ou em atendimento. Não devolve a prioridade nem nenhum dado clínico.

```mermaid
sequenceDiagram
    actor P as Inscrito
    participant W as Web (/consultar)
    participant A as API (fila)
    participant DB as Banco
    P->>W: conclui a verificação de identidade (RF52)
    W->>A: GET /fila/minha-situacao com o cookie de verificação
    alt sem verificação válida
        A-->>W: 401 sem nenhum dado
    else verificação válida
        A->>DB: caso e decisão de prioridade da inscrição verificada
        alt sem prioridade registrada
            A-->>W: aguardando triagem
        else caso na fila
            A->>A: posição calculada pelo FilaService
            A-->>W: na fila de espera, posição N
        else caso com estagiário
            A-->>W: em atendimento
        end
    end
```

| Regra | Critério de aceitação |
| --- | --- |
| A rota só lê `req.inscricaoVerificada` e nunca recebe um id de inscrição (RNF6) | Depois da verificação, o inscrito vê a própria posição e situação |
| Sem verificação válida, `401` sem dado | Sem verificação, a consulta é negada |
| A posição vem do mesmo `FilaService` do RF7, calculada na hora | Depois de mudanças na fila, uma nova consulta mostra a posição atualizada |

**Decisões de projeto:** a posição é a da fila inteira, e não dentro da cor, porque informar a cor revelaria a prioridade clínica (proposta levada à FBr). A resposta vem com o aviso de que a posição pode mudar e não garante data (RNF7). Os casos encerrados ou desligados aparecem como "procure a secretaria", sem detalhe.

**Telas:** página `/consultar`, depois dos dois passos do RF52, com os quatro estados do protótipo. Protótipo: [pranchas 1-3 e 1-4](prototipos-ciclo-4.md#rf8).

**Dados de teste:** uma inscrição sem prioridade, uma na posição 3 e uma em atendimento, cada uma com e-mail para o código; uma verificação expirada (401); uma consulta antes e depois de outro caso passar à frente.

---

## Agendamento, confirmação e cancelamento (CP4)

As três features de sessão do Ciclo 4 mudam o status da `SessaoAtendimento` criada pelo RF10 e usam o `LinkConfirmacao` que ele já gera. O cancelamento ganha uma tabela própria, porque guarda a origem, a classificação e a justificativa.

```mermaid
classDiagram
    direction LR
    class SessaoAtendimento {
      +string status
      +datetime confirmadaEm
      +string confirmadaPor
    }
    class LinkConfirmacao {
      +string tokenHash
      +datetime expiraEm
      +datetime usadoEm
    }
    class CancelamentoSessao {
      +uuid id
      +string origem
      +string classificacao
      +string justificativaCifrada
      +uuid registradoPor
      +datetime registradoEm
      +int antecedenciaMinutos
    }
    SessaoAtendimento "1" -- "1" LinkConfirmacao : tem
    SessaoAtendimento "1" -- "0..1" CancelamentoSessao : cancelada por
```

- **Status da sessão:** `agendada`, `confirmada`, `cancelada`, `realizada` e `falta_paciente` (RF34). A migration dos três novos é compartilhada com a CP9.
- **`CancelamentoSessao.origem`:** `link` (o paciente, sem login), `secretaria` ou `estagiario`. **`classificacao`:** `no_prazo`, `fora_do_prazo`, `administrativo`, `ausencia_estagiario` (RF16) ou `desligamento` (RF37).
- **Parâmetros novos** (tabela `parametros`, configuráveis pela coordenação): `prazo_confirmacao_horas` (24, [DF45](../unidade-2/requisitos/decisoes-fbr.md#df45)), que substitui a constante usada hoje, e `antecedencia_minima_cancelamento_minutos` (60, [DF20](../unidade-2/requisitos/decisoes-fbr.md#df20)).
- **Link (RNF59):** o `expiraEm` passa a ser o início da sessão, porque o cancelamento pelo link vale até lá. O prazo de confirmação é conferido à parte. Hoje o link expira no fim do prazo de confirmação, e isso muda nesta feature.

### RF11 — Consultar agenda de sessões do estagiário ([#141](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/141))

**Rota:** `GET /agenda?estagiarioId&de&ate&status` (estagiário: só a própria agenda, com o `estagiarioId` ignorado; supervisor: só os estagiários que ele supervisiona). Por padrão, mostra as sessões agendadas, confirmadas e realizadas da semana; as canceladas e as faltas aparecem só quando o filtro as pede.

```mermaid
sequenceDiagram
    actor U as Estagiário ou supervisor
    participant A as API (agendamento)
    participant DB as Banco
    U->>A: GET /agenda com período, situação e estagiário
    alt estagiário
        A->>DB: sessões do próprio estagiário no período
    else supervisor
        A->>DB: confere se o estagiário tem caso vigente supervisionado por ele
        alt não supervisiona
            A-->>U: 403, sem nenhuma sessão
        end
        A->>DB: sessões do estagiário no período
    end
    A-->>U: nome do paciente, data, início, término e situação (RNF13)
```

| Regra | Critério de aceitação |
| --- | --- |
| Filtro de período (`de`, `ate`) e de situação, com o padrão agendada, confirmada e realizada | O estagiário vê as próprias sessões, com filtro por período |
| "Estagiário supervisionado" é o que tem vínculo vigente num caso cuja atribuição de supervisor vigente é do supervisor | O supervisor vê a agenda dos estagiários dele |
| `403` sem sessão para quem não supervisiona; o estagiário nunca vê a agenda de outro | Sem vínculo de supervisão, não acessa a agenda |

**Telas:** item "Agenda" do estagiário (a página que hoje dá 404 depois da entrada, #160) e, para o supervisor, "Agenda" com a escolha do estagiário (proposta levada à FBr). A sessão realizada leva ao prontuário. Protótipo: [prancha 4-2](prototipos-ciclo-4.md#rf11).

**Dados de teste:** um estagiário com sessões na semana em todas as situações; um período sem sessões; um supervisor com dois estagiários; um supervisor pedindo a agenda de um estagiário de outro (403).

---

### RF14 — Confirmar presença em sessão agendada ([#142](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/142))

**Rotas:**

- `GET /confirmacao/:token` (pública): devolve a data, o horário, o nome do estagiário, a situação e se ainda dá para confirmar.
- `POST /confirmacao/:token/confirmar` (pública).
- `GET /sessoes/sem-confirmacao` (secretaria): sessões futuras agendadas cujo prazo terminou sem confirmação, com os contatos do paciente.
- `POST /sessoes/:id/confirmacao` (secretaria): confirmação feita por telefone, como no protótipo.

```mermaid
sequenceDiagram
    actor P as Paciente
    participant W as Web (/confirmacao)
    participant A as API (agendamento)
    participant DB as Banco
    P->>W: abre o link recebido no agendamento
    W->>A: GET /confirmacao/:token
    A->>DB: busca o link pelo hash do token
    alt link inexistente, vencido ou sessão cancelada
        A-->>W: link não é mais válido (mesma resposta)
    else sessão agendada
        A-->>W: dados da sessão e o prazo para confirmar
    end
    P->>W: confirmar presença
    W->>A: POST /confirmacao/:token/confirmar
    alt depois do prazo (início menos prazo_confirmacao_horas)
        A-->>W: 422 prazo encerrado, procure a secretaria
    else dentro do prazo
        A->>DB: status confirmada, confirmadaEm e confirmadaPor = link
        A->>DB: auditoria (RNF10)
        A-->>W: presença confirmada
    end
```

| Regra | Critério de aceitação |
| --- | --- |
| Confirma se `agora <= inicio - prazo_confirmacao_horas` | Sessão às 14h00: a confirmação até as 14h00 do dia anterior muda para "confirmada" e é auditada |
| Depois disso, `422` com a orientação de procurar a secretaria | A confirmação depois das 14h00 do dia anterior é recusada |
| A lista da secretaria é uma consulta: status `agendada`, `inicio` futuro e prazo vencido; nenhuma falta é criada | Sessão sem confirmação no fim do prazo vai para a secretaria, sem falta |
| Sessão `cancelada` responde como link não mais válido | Sessão cancelada não pode ser confirmada |

**Decisão de projeto:** não há tarefa agendada. A sinalização para a secretaria é a própria consulta, então a sessão aparece na lista assim que o prazo vence.

**Telas:** página pública `/confirmacao/:token`, com os sete estados do protótipo, compartilhada com o RF15; na Agenda da secretaria, a seção "Sem confirmação", com os contatos e "Registrar confirmação". Protótipo: [pranchas 1-5, 1-6](prototipos-ciclo-4.md#rf14-rf15-link) e [2-1](prototipos-ciclo-4.md#rf14).

**Dados de teste:** uma sessão às 14h00 de depois de amanhã (confirma); uma às 14h00 de amanhã, com o relógio às 14h01 de hoje (recusa); uma cancelada; um token inexistente; uma sessão sem confirmação com o prazo vencido (aparece na lista).

---

### RF15 — Registrar cancelamento de sessão pelo paciente ([#143](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/143))

**Rotas:**

- `POST /confirmacao/:token/cancelar` (pública): o paciente cancela pelo link, com a justificativa obrigatória.
- `POST /sessoes/:id/cancelamento` (secretaria; estagiário responsável só no tipo administrativo): recebe a justificativa e o tipo, `pedido_paciente` ou `administrativo`.

```mermaid
sequenceDiagram
    actor U as Paciente (link), secretaria ou estagiário
    participant A as API (agendamento)
    participant F as FaltasService (CP9)
    participant DB as Banco
    U->>A: cancelamento com justificativa
    alt sem justificativa
        A-->>U: 400 justificativa
    else sessão já iniciada, realizada, cancelada ou com falta
        A-->>U: 422 a sessão não pode mais ser cancelada
    else válido
        A->>A: antecedência = início - agora
        alt tipo administrativo
            A->>A: classificação administrativo
        else antecedência >= antecedencia_minima_cancelamento_minutos
            A->>A: classificação no_prazo
        else
            A->>A: classificação fora_do_prazo
        end
        A->>DB: transação: status cancelada e CancelamentoSessao
        opt fora_do_prazo
            A->>F: registrarCancelamentoForaDoPrazo(sessão)
        end
        A->>DB: marca o link como usado
        A->>DB: auditoria (RNF10)
        A-->>U: sessão cancelada, com a classificação
    end
```

| Regra | Critério de aceitação |
| --- | --- |
| Antecedência >= 60 minutos: `no_prazo` | Sessão às 14h00: o cancelamento até as 13h00 fica "no prazo", com a justificativa, e é auditado |
| Antecedência < 60 minutos, antes do início: `fora_do_prazo`, que vira falta pelo `FaltasService` na mesma transação | A partir das 13h01, fica "fora do prazo" e gera a falta para a CP9 |
| Justificativa obrigatória, cifrada | Sem justificativa, não registra, e o campo é indicado |
| O link recebe `usadoEm`, e toda operação depois disso responde como link não mais válido | Pelo link, o paciente cancela, e depois o link não permite mais nada |
| `inicio <= agora`, ou status `realizada`, recusa | Sessão iniciada ou realizada não pode ser cancelada |
| Tipo `administrativo` só pela secretaria ou pelo estagiário, sem falta, qualquer que seja a antecedência | O cancelamento administrativo não gera falta |

**Decisão de projeto:** o valor do parâmetro é lido no momento do cancelamento e guardado com a antecedência em minutos no `CancelamentoSessao`, para a classificação poder ser conferida depois, mesmo que o parâmetro mude. As regras de desmarcação do contrato da clínica (12 horas) estão pendentes com a FBr; até a resposta, vale a DF20.

**Telas:** "Cancelar" na página do link, com a justificativa; diálogo "Cancelar sessão" na agenda da secretaria e do estagiário, com o tipo. Protótipo: [pranchas 1-5, 1-6](prototipos-ciclo-4.md#rf14-rf15-link) e [2-2](prototipos-ciclo-4.md#rf15-rf16).

**Dados de teste:** sessão às 14h00 cancelada às 12h59, às 13h00 e às 13h01; uma já iniciada; uma sem justificativa; um cancelamento administrativo 10 minutos antes; o link usado depois do cancelamento; um estagiário que não é o responsável tentando cancelar (403).

---

### RF16 — Registrar cancelamento de sessão pelo estagiário ([#144](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/144))

**Rota:** `POST /sessoes/:id/ausencia-estagiario` (estagiário responsável, supervisor responsável ou secretaria). Recebe o motivo, obrigatório, e o tipo: `ausencia_real` ou `administrativo`.

```mermaid
sequenceDiagram
    actor U as Estagiário, supervisor ou secretaria
    participant A as API (agendamento)
    participant DB as Banco
    participant M as E-mail
    U->>A: POST /sessoes/:id/ausencia-estagiario com motivo e tipo
    alt sem vínculo com a sessão
        A-->>U: 403
    else sem motivo, ou sessão já iniciada
        A-->>U: 400 ou 422
    else válido
        A->>DB: transação: status cancelada e CancelamentoSessao (ausencia_estagiario ou administrativo)
        A->>DB: auditoria (RNF10)
        alt canal e-mail
            A->>M: avisa o paciente do cancelamento
            A-->>U: registrado, paciente avisado por e-mail
        else WhatsApp ou ligação
            A-->>U: registrado, com a mensagem pronta para a secretaria (DF24)
        end
    end
```

| Regra | Critério de aceitação |
| --- | --- |
| O registro muda o status e avisa o paciente pelo canal preferencial | O registro com motivo atualiza a sessão e dispara a notificação ao paciente |
| `403` para quem não é o estagiário, o supervisor do caso ou a secretaria | Quem não tem vínculo com a sessão não registra a ausência |
| `ausencia_estagiario` fica guardado para o RF39 e o RF40, dos Ciclos 5 e 6 | A ausência real conta nas faltas do estagiário |
| `administrativo` não entra na contagem do estagiário | O cancelamento para remarcar não conta |

**Decisão de projeto:** o aviso ao paciente usa o mesmo caminho do link do RF10 (e-mail automático ou mensagem pronta para o WhatsApp). O RF17, do Ciclo 5, completa a notificação. Isso fica registrado como entrega parcial (R1.7).

**Telas:** o mesmo diálogo "Cancelar sessão" do RF15, com a opção "Ausência do estagiário". Protótipo: [prancha 2-2](prototipos-ciclo-4.md#rf15-rf16).

**Dados de teste:** uma ausência real registrada pelo estagiário e outra pelo supervisor; um cancelamento administrativo pela secretaria; um paciente com e-mail e outro com WhatsApp; um estagiário de outro caso (403); uma sessão já iniciada.

---

## Distribuição de casos (CP5)

### RF22 — Consultar responsáveis pelo caso ([#145](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/145))

**Rotas** (módulo `casos`):

- `GET /pacientes?busca` (secretaria e coordenação): a lista de Pacientes, com o nome, o número da inscrição, a situação do caso e os nomes do estagiário e do supervisor, sem dado clínico. É a página que hoje dá 404 no menu.
- `GET /casos/:id/responsaveis` (secretaria, coordenação e o estagiário e o supervisor responsáveis): os dois nomes, ou "pendente de distribuição" no que faltar.

```mermaid
sequenceDiagram
    actor U as Secretaria, coordenação ou responsável
    participant A as API (casos)
    participant DB as Banco
    U->>A: GET /casos/:id/responsaveis
    A->>DB: atribuição de supervisor e vínculo de estagiário vigentes
    alt estagiário ou supervisor sem vínculo com o caso
        A-->>U: 403
    else
        A-->>U: nome do supervisor e do estagiário, ou pendente de distribuição
    end
```

| Regra | Critério de aceitação |
| --- | --- |
| A resposta só traz nomes e a situação; nunca a queixa, a prioridade ou o prontuário (RNF25) | A consulta mostra os responsáveis, sem dados clínicos |
| Sem atribuição ou sem vínculo vigente, o campo vem como `null`, e a tela mostra "pendente de distribuição" | O caso sem um dos responsáveis aparece como pendente, sem nome |

**Telas:** lista de Pacientes (secretaria e coordenação) e ficha do paciente, já existente nos dados administrativos, com o quadro "Responsáveis". Protótipo: [prancha 2-3](prototipos-ciclo-4.md#rf22).

**Dados de teste:** um caso em atendimento, um aguardando vínculo (sem estagiário) e um aguardando distribuição (sem os dois); um estagiário de outro caso (403).

---

### RF23 — Consultar casos sob responsabilidade do estagiário ou supervisor ([#146](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/146))

**Rota:** `GET /casos/meus?estagiarioId` (estagiário e supervisor). A rota já existe para o supervisor ("Meus casos"); ela passa a aceitar o estagiário, que vê só os casos com vínculo vigente dele, e o supervisor ganha o filtro por estagiário.

```mermaid
sequenceDiagram
    actor U as Estagiário ou supervisor
    participant A as API (casos)
    participant DB as Banco
    U->>A: GET /casos/meus
    alt estagiário
        A->>DB: casos com vínculo vigente do estagiário
    else supervisor
        A->>DB: casos com atribuição vigente do supervisor, com o estagiário de cada um
    end
    A-->>U: paciente, prioridade e situação de cada caso
```

| Regra | Critério de aceitação |
| --- | --- |
| Filtro pelo vínculo vigente do estagiário | O estagiário vê só os casos vinculados a ele |
| Filtro pela atribuição vigente do supervisor, que já inclui os casos dos estagiários dele | O supervisor vê os casos dele e os dos estagiários |
| O acesso direto a um caso de outro segue o RF55, com `403` sem dado | Quem não tem vínculo não vê o caso na lista e tem o acesso direto negado |

**Telas:** "Meus pacientes" do estagiário (a página que hoje dá 404 depois da entrada, #160) e "Meus casos" do supervisor, com o filtro por estagiário. Protótipo: [prancha 4-1](prototipos-ciclo-4.md#rf23).

**Dados de teste:** dois estagiários do mesmo supervisor, com dois casos cada; um caso aguardando vínculo; um estagiário sem casos (estado vazio); um estagiário abrindo o prontuário de um caso do outro (403).

---

### RF25 — Transferir caso para outro estagiário ou supervisor ([#147](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/147))

```mermaid
classDiagram
    direction LR
    class TransferenciaCaso {
      +uuid id
      +string tipo
      +uuid estagiarioAnteriorId
      +uuid estagiarioNovoId
      +uuid supervisorAnteriorId
      +uuid supervisorNovoId
      +string motivoCifrado
      +uuid transferidoPor
      +datetime transferidoEm
    }
    class Caso
    class VinculoEstagiario
    class AtribuicaoSupervisor
    Caso "1" -- "0..*" TransferenciaCaso : registra
    TransferenciaCaso --> VinculoEstagiario : encerra o anterior e cria o novo
    TransferenciaCaso --> AtribuicaoSupervisor : encerra a anterior e cria a nova
```

**Rota:** `POST /casos/:id/transferencia` (supervisor responsável ou coordenação). Recebe o `motivo`, obrigatório, e o novo estagiário, o novo supervisor ou os dois.

```mermaid
sequenceDiagram
    actor U as Supervisor responsável ou coordenação
    participant A as API (casos)
    participant DB as Banco
    U->>A: POST /casos/:id/transferencia com novo responsável e motivo
    alt supervisor tentando trocar o supervisor, ou estagiário de outro supervisor
        A-->>U: 403 com a orientação de pedir à coordenação
    else sem motivo ou caso não ativo
        A-->>U: 400 ou 422
    else válido
        A->>DB: transação: encerra o vínculo e, se for o caso, a atribuição vigentes
        A->>DB: cria o novo vínculo e, se for o caso, a nova atribuição
        A->>DB: TransferenciaCaso com os anteriores, os novos, o motivo e o autor
        A->>DB: auditoria (RNF16)
        A-->>U: transferido, com o mesmo prontuário
    end
```

| Regra | Critério de aceitação |
| --- | --- |
| O supervisor só troca o estagiário, e só para um estagiário que ele supervisiona | O supervisor transfere para outro estagiário dele, e o anterior perde o acesso |
| Estagiário de outro supervisor: `403`, com a orientação de pedir à coordenação | O supervisor A não transfere para estagiário do supervisor B |
| A coordenação troca o supervisor e, se indicar, o estagiário | A transferência pela coordenação registra os novos responsáveis e revoga o acesso dos anteriores |
| O prontuário do ciclo não muda; o acesso segue o vínculo vigente (RF55) | O novo responsável vê o histórico preservado (RF27) |
| `TransferenciaCaso` é só de inserção e fica no banco, mesmo sem a tela do RF26 | O histórico de transferências existe inteiro desde já |

**Decisões de projeto** (a conferir na inspeção):

1. **"Estagiário do supervisor".** O modelo não liga o estagiário a um supervisor: o vínculo é por caso. A proposta é considerar do supervisor o estagiário que não tem nenhum caso vigente com outro supervisor. Precisa ser confirmada na inspeção.
2. **Sessões futuras do estagiário anterior.** Ficam canceladas como `administrativo`, sem falta para ninguém, e a tela lista as sessões para reagendar com o novo estagiário.
3. **Supervisor no limite de 50 casos:** a coordenação pode escolher, com aviso (proposta levada à FBr em 06/11).

**Telas:** "Transferir caso" na ficha do caso, com os casos ativos de cada opção, o motivo e a confirmação. Protótipo: [prancha 4-3](prototipos-ciclo-4.md#rf25).

**Dados de teste:** um caso com sessões futuras transferido entre dois estagiários do mesmo supervisor; uma tentativa do supervisor A com estagiário do supervisor B (403); uma transferência pela coordenação para outro supervisor, com e sem novo estagiário; uma sem motivo; o estagiário anterior tentando abrir o prontuário depois (403).

---

## Prontuário (CP6)

### RF27 — Consultar prontuário do paciente ([#148](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/148))

**Rota:** `GET /prontuarios/:id`, que já existe (estagiário e supervisor responsáveis; coordenação só para leitura, com o acesso registrado, [DF32](../unidade-2/requisitos/decisoes-fbr.md#df32)). O Ciclo 4 completa a resposta com o que faltava dos elementos mínimos.

| Elemento mínimo | De onde vem | Sem registro |
| --- | --- | --- |
| Identificação do paciente, do caso e do ciclo | `Caso`, `Inscricao`, `Prontuario` | — |
| Dados iniciais | RF69 | "Sem registro neste ciclo" |
| Responsáveis e histórico | `VinculoEstagiario`, `AtribuicaoSupervisor` e `TransferenciaCaso` (RF25) | — |
| Sessões do ciclo, com a situação e as faltas | `SessaoAtendimento`, `FaltaPaciente` (CP9) | "Sem registro neste ciclo" |
| Evoluções, com correções, complementos e validação | RF28; RF29, RF30 e RF67 nos Ciclos 5 e 6 | "Nenhuma" em cada contador, até essas features existirem |
| Encerramento por alta | RF68 | "Sem registro neste ciclo" |
| Relatório final | RF33 | "Sem registro neste ciclo" |

```mermaid
sequenceDiagram
    actor U as Responsável ou coordenação
    participant A as API (acompanhamento-clinico)
    participant DB as Banco
    U->>A: GET /prontuarios/:id
    A->>DB: confere o vínculo vigente (RF55) e registra o acesso (RNF52)
    alt sem vínculo e não é coordenação
        A-->>U: 403 sem nenhum dado
    else
        A->>DB: lê e decifra os elementos do ciclo
        A-->>U: prontuário com todas as seções, as ausentes marcadas
    end
```

| Regra | Critério de aceitação |
| --- | --- |
| A resposta tem uma chave para cada elemento mínimo, mesmo vazia | O responsável vê todos os elementos do ciclo |
| Elemento vazio vem como `null` e a tela mostra a ausência, sem conteúdo presumido | O elemento sem registro aparece como ausente |
| O acesso segue o vínculo vigente, e os registros ficam ligados ao prontuário, e não ao responsável | Depois da transferência, o novo responsável vê os registros anteriores |
| `403` sem dado para quem não tem vínculo, com a coordenação só lendo | Sem vínculo, não acessa; a coordenação só lê |

**Telas:** o prontuário nas seções do modelo da clínica, com a barra "Ir para", as evoluções e o histórico de responsáveis fechados e "Marcar sessão como realizada" na sessão que já terminou, como hoje. Protótipo: [prancha 5-1](prototipos-ciclo-4.md#rf27).

**Dados de teste:** um prontuário completo (dados iniciais, sessões realizadas, uma falta e evoluções) e um recém-criado; um caso transferido (RF25); a coordenação lendo; um estagiário sem vínculo (403).

---

### RF69 — Registrar anamnese e contrato terapêutico do paciente ([#130](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/130))

**O que já existe:** a rota `POST /prontuarios/:id/dados-iniciais` grava a anamnese como um texto só e o contrato da DF41 (data, termo para pesquisa e via guardada), tudo de uma vez e uma vez só.

**O que muda:**

- **Anamnese nas seis seções** da ficha da clínica ([DF37](../unidade-2/requisitos/decisoes-fbr.md#df37)): `anamneseCifrada` passa a guardar as seções num JSON cifrado (`queixaPrincipal`, `historiaProblemaAtual`, `historicoFamiliar`, `desenvolvimento`, `historicoMedico`, `aspectosPsicossociais`). Os registros antigos, com o texto único, aparecem como a queixa principal.
- **Anamnese e contrato salvos separados**, como no protótipo: `POST /prontuarios/:id/anamnese` e `POST /prontuarios/:id/contrato`, cada um uma vez, com autor e data/hora próprios (`anamnesePor`, `anamneseEm`, `contratoPor`, `contratoEm`). Assim, o estagiário registra a anamnese antes de a via assinada estar guardada.
- **Queixa principal preenchida** com a queixa da inscrição (RF1), decifrada na hora de abrir o formulário.

```mermaid
sequenceDiagram
    actor E as Estagiário responsável
    participant A as API (acompanhamento-clinico)
    participant DB as Banco
    E->>A: GET /prontuarios/:id (formulário com a queixa da inscrição)
    E->>A: POST /prontuarios/:id/anamnese com as seis seções
    alt não é o estagiário responsável, ou caso sem prontuário
        A-->>E: 403 ou 404
    else sem queixa principal, ou seção com mais de 1.000 caracteres
        A-->>E: 400 com o campo indicado
    else anamnese já registrada
        A-->>E: 409
    else
        A->>DB: anamnese cifrada, com autor e data/hora
        A->>DB: auditoria
        A-->>E: anamnese registrada
    end
    E->>A: POST /prontuarios/:id/contrato com data, termo para pesquisa e via guardada
    A->>DB: mesmas conferências, e 400 sem a via guardada
    A-->>E: contrato registrado
```

| Regra | Critério de aceitação |
| --- | --- |
| Cada parte grava autor e data/hora próprios | A anamnese e o contrato ficam como dados iniciais, com autor e data/hora |
| Seis seções, com a queixa principal vinda da inscrição | A anamnese segue as seis seções, com a queixa da inscrição |
| Só a queixa principal é obrigatória; as outras ficam `null` e aparecem como "não informado" | Sem queixa principal, não salva; as seções em branco aparecem como "não informado" |
| O contrato guarda a data e o aceite do termo para pesquisa; a via guardada é obrigatória (proposta da equipe) | O contrato registra a data e o aceite do termo |
| `403` para quem não é o estagiário responsável | Outro usuário não registra |
| `404` sem prontuário (RF66) | Caso sem prontuário não aceita o registro |

**Telas:** formulário de dados iniciais com a anamnese em seis campos e o quadro do contrato, cada um com o seu botão de salvar, e a leitura pelo supervisor. Protótipo: [prancha 5-2](prototipos-ciclo-4.md#rf69).

**Dados de teste:** um prontuário novo; uma anamnese só com a queixa principal e outra completa; uma seção com 1.001 caracteres; um contrato sem a via guardada; uma segunda anamnese no mesmo prontuário (409); o supervisor tentando registrar (403); um registro antigo, com o texto único.

---

## Registro de evolução (CP7)

### RF28 — Registrar evolução da sessão realizada ([#149](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/149))

**O que já existe:** `POST /prontuarios/:id/sessoes/:sessaoId/realizada` (o estagiário marca a sessão como realizada depois do término) e `POST /prontuarios/:id/sessoes/:sessaoId/evolucoes`, que grava a evolução com dois campos, a queixa e o planejamento ([DF23](../unidade-2/requisitos/decisoes-fbr.md#df23)).

**O que muda:** a evolução passa a seguir a ficha da [DF38](../unidade-2/requisitos/decisoes-fbr.md#df38). A tabela `evolucoes` ganha cinco colunas cifradas, `humorAparencia`, `conteudoTrabalhado`, `tecnicasUtilizadas`, `intervencoesEncaminhamentos` (opcional) e `planoProximaSessao`, e as antigas (`queixa` e `planejamento`) ficam só para leitura das evoluções já registradas, como o texto livre do contrato antigo.

```mermaid
sequenceDiagram
    actor E as Estagiário responsável
    participant A as API (acompanhamento-clinico)
    participant DB as Banco
    E->>A: POST .../sessoes/:sessaoId/realizada (depois do término)
    A->>DB: status realizada
    E->>A: POST .../sessoes/:sessaoId/evolucoes com os cinco campos
    alt sem vínculo vigente, ou sessão de outro paciente
        A-->>E: 403
    else sessão não realizada (agendada, confirmada, cancelada ou com falta)
        A-->>E: 422
    else campo obrigatório vazio ou com mais de 1.000 caracteres
        A-->>E: 400 com os campos indicados
    else
        A->>DB: evolução cifrada, com autor, data/hora e a sessão de origem
        A->>DB: auditoria
        A->>DB: conta as sessões realizadas do ciclo
        A-->>E: evolução registrada e, a cada 10ª sessão, o aviso de fechamento avaliativo
    end
```

| Regra | Critério de aceitação |
| --- | --- |
| A evolução fica ligada à sessão (índice único), ao prontuário e ao ciclo, com autor e data/hora | A evolução válida fica associada à sessão, ao paciente e ao ciclo |
| Confere que a sessão é do caso do prontuário e que o estagiário tem o vínculo vigente | Não registra em sessão de outro paciente nem sem vínculo |
| Só aceita sessão `realizada` | Sessão não realizada não aceita evolução |
| O número da sessão no ciclo, a data, o horário e o comparecimento vêm da sessão, sem campo no formulário | O registro mostra os dados da sessão, sem digitação |
| Quatro obrigatórios e `intervencoesEncaminhamentos` opcional, cada um com até 1.000 caracteres (proposta da equipe) | Sem um obrigatório, não salva; mais de 1.000 caracteres é recusado |
| `realizadas % 10 === 0` depois do registro mostra o aviso ao estagiário e ao supervisor | Na 10ª sessão realizada do ciclo, os dois veem o aviso |

**Decisão de projeto:** as evoluções já registradas com os campos antigos aparecem no prontuário com os rótulos "Evolução da queixa" e "Planejamento", sem migração do conteúdo, porque não dá para separar o texto nos campos novos sem mudar o que foi escrito.

**Telas:** formulário de evolução aberto pela ação "Registrar evolução" do prontuário, com os dados da sessão só para leitura e os cinco campos; o aviso de fechamento avaliativo no topo do prontuário e em "Meus casos" do supervisor. Protótipo: [prancha 5-3](prototipos-ciclo-4.md#rf28).

**Dados de teste:** uma sessão realizada; sessões agendada, cancelada e com falta (422); um estagiário sem vínculo (403); uma evolução sem técnicas utilizadas; um campo com 1.001 caracteres; um paciente com 9 sessões realizadas que registra a 10ª; uma evolução antiga, com os dois campos.

---

## Controle de assiduidade e alertas (CP9)

As cinco features da CP9 trabalham sobre os mesmos registros: a falta (`FaltaPaciente`), o desligamento (`DesligamentoPorFaltas`) e a vaga liberada (`VagaLiberada`). A contagem e o alerta não têm tabela própria: são calculados a partir das faltas, para que nunca fiquem diferentes delas (RNF32). O módulo novo da API é o `assiduidade`.

**Classes novas** (somam-se ao modelo acima e ao do Ciclo 3):

```mermaid
classDiagram
    direction LR
    class SessaoAtendimento {
      +uuid id
      +string status
      +datetime inicio
    }
    class Caso {
      +uuid id
      +string situacao
      +int cicloAtendimento
    }
    class FaltaPaciente {
      +uuid id
      +string origem
      +int cicloAtendimento
      +uuid registradaPor
      +datetime registradaEm
      +bool justificada
      +string motivoJustificativaCifrado
      +uuid justificadaPor
      +datetime justificadaEm
      +uuid retiradaPor
      +datetime retiradaEm
    }
    class DesligamentoPorFaltas {
      +uuid id
      +int cicloAtendimento
      +date dataDecisao
      +uuid decididoPor
      +datetime decididoEm
      +uuid revertidoPor
      +datetime revertidoEm
      +string motivoReversaoCifrado
    }
    class VagaLiberada {
      +uuid id
      +uuid estagiarioId
      +uuid supervisorId
      +datetime liberadaEm
      +datetime ocupadaEm
      +uuid ocupadaPorVinculoId
      +datetime encerradaEm
    }
    SessaoAtendimento "1" -- "0..1" FaltaPaciente : gera
    Caso "1" -- "0..*" FaltaPaciente : acumula
    Caso "1" -- "0..*" DesligamentoPorFaltas : sofre
    DesligamentoPorFaltas "1" -- "1" VagaLiberada : libera
    DesligamentoPorFaltas "0..1" -- "0..*" FaltaPaciente : retira da contagem na reversão
```

- **`FaltaPaciente.origem`:** `falta`, quando a sessão aconteceu sem o paciente (RF34), ou `cancelamento_fora_do_prazo`, quando o RF15 classifica o cancelamento assim. Uma sessão gera no máximo uma falta (índice único em `sessao_id`).
- **Status novo da sessão:** `falta_paciente`, que se soma ao `confirmada` e ao `cancelada` do RF14 e do RF15. Como o RF15 e o RF34 mexem no mesmo `status_sessao`, a migration que acrescenta os três valores sai na primeira PR das duas, e a outra só a reaproveita.
- **Situações novas do caso:** `desligado_por_faltas` (RF37) e `aguardando_vaga` (RF38, quando a vaga já foi ocupada).
- **Cifrados (RNF51):** o motivo da justificativa e o motivo da reversão podem trazer informação de saúde, como um atestado, por isso ficam em colunas `*_cifrado`.
- **Somente inserção, com campos que só são preenchidos uma vez (RNF32):** nenhuma falta é apagada nem tem a origem trocada. A justificativa e a retirada da contagem preenchem campos vazios com um `UPDATE` condicional (`justificada_em is null`, `retirada_em is null`), e cada operação vai para a auditoria com o estado anterior e o novo. O usuário da aplicação no banco (`clinica_app`) não recebe `DELETE` nessas tabelas.

**Contagem (RF35):** `FaltasService.contar(casoId)` conta as `FaltaPaciente` do ciclo vigente do caso com `retiradaEm` vazio. Ela aparece no prontuário (RF27), nos dados administrativos da secretaria e na agenda, como "Faltas no ciclo: N de 2".

---

### RF34 — Registrar falta do paciente na sessão ([#150](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/150))

**Rotas** (módulo `assiduidade`):

- `POST /sessoes/:id/falta`: secretaria ou estagiário responsável pelo caso. Recebe, opcionalmente, `justificada` e `motivo`, para quem já tem o comprovante na hora.
- `POST /faltas/:id/justificativa`: secretaria, estagiário responsável ou supervisor responsável. Recebe o `motivo`, obrigatório. É a justificativa feita depois, a partir da lista de sessões do paciente: nos dados administrativos, para a secretaria, e no prontuário, para o estagiário e o supervisor.

```mermaid
sequenceDiagram
    actor U as Secretaria ou estagiário responsável
    participant A as API (assiduidade)
    participant DB as Banco
    U->>A: POST /sessoes/:id/falta, com justificativa opcional
    A->>DB: confere o perfil e o vínculo vigente com o caso
    alt sem permissão
        A-->>U: 403, sem dado da sessão
    else sessão futura, já cancelada, já realizada ou já com falta
        A-->>U: 422 com o motivo
    else justificada sem motivo
        A-->>U: 400 com o campo indicado
    else sessão presencial já passada, agendada ou confirmada
        A->>DB: transação com status falta_paciente e FaltaPaciente (origem falta)
        A->>DB: auditoria (RNF10, RNF32)
        A->>DB: conta as faltas do ciclo (RF35)
        A-->>U: falta registrada, com a contagem e o aviso ou o alerta
    end
```

| Regra | Critério de aceitação |
| --- | --- |
| Só aceita sessão com `inicio` no passado e status `agendada` ou `confirmada`; a confirmação do RF14 não muda nada | Falta em sessão presencial já passada, sem realização nem cancelamento, confirmada ou não, muda o status para "falta do paciente", com data, horário e usuário |
| `422` para `cancelada`, `realizada` ou `falta_paciente` | Sessão cancelada ou realizada não aceita falta |
| A transação grava a `FaltaPaciente`, que é o evento consumido pela contagem | Cada falta gera o evento da contagem (RF35) |
| A justificativa preenche `justificada`, o motivo cifrado, `justificadaPor` e `justificadaEm`, e não muda a origem nem a contagem | A secretaria ou os responsáveis justificam, na hora ou depois, com autor e data/hora |
| `403` para quem não é a secretaria nem o estagiário ou o supervisor responsáveis | Outro usuário não justifica a falta |

**Telas:** diálogo "Registrar falta do paciente" na agenda e na lista de sessões, com a caixa "Falta justificada" e o campo de motivo, que só aparece quando ela é marcada; "Marcar como justificada" na linha da falta, depois. Protótipo: [prancha 3-1](prototipos-ciclo-4.md#rf34).

**Dados de teste:** uma sessão das 14h00 de ontem confirmada e outra não confirmada (aceitam a falta); uma sessão de amanhã, uma cancelada e uma realizada (recusam); uma falta justificada no registro e outra justificada depois; um estagiário e um supervisor sem vínculo com o caso tentando justificar (403).

---

### RF35 — Contabilizar faltas do paciente no ciclo ([#151](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/151))

**Sem rota própria.** A contagem é o `FaltasService.contar(casoId)`, chamado pelas telas que mostram o paciente e no fim das transações que criam ou retiram falta. A falta vem de dois lugares: do RF34 e do cancelamento do RF15, que chama `FaltasService.registrarCancelamentoForaDoPrazo(sessaoId)` na mesma transação, quando classifica o cancelamento como fora do prazo.

```mermaid
sequenceDiagram
    participant F as RF34 ou RF15
    participant S as FaltasService
    participant DB as Banco
    F->>S: falta ou cancelamento fora do prazo, na mesma transação
    S->>DB: FaltaPaciente com a origem
    S->>DB: conta as faltas do ciclo com retiradaEm vazio
    alt contagem = 1
        S-->>F: aviso para a secretaria e o estagiário (nova falta resulta em desligamento)
    else contagem >= 2
        S-->>F: limite atingido (alerta do RF36)
    end
```

| Regra | Critério de aceitação |
| --- | --- |
| Conta as faltas do `cicloAtendimento` vigente do caso, consecutivas ou não, e nunca zera por sessão realizada | A 1ª falta ou o 1º cancelamento fora do prazo leva a 1 e avisa; uma nova falta, mesmo depois de sessões realizadas, leva a 2 e dispara o alerta |
| Só o RF15 com classificação `fora_do_prazo` cria falta; `no_prazo` e `administrativo` não chamam o serviço | Cancelamento no prazo e cancelamento administrativo não alteram a contagem |
| A falta de confirmação (RF14) não cria registro nenhum | Quem não confirmou, mas compareceu, não ganha falta |
| `justificada` não entra no filtro da contagem | A falta justificada continua contando |
| O filtro usa o ciclo vigente do caso | Num novo ciclo, a contagem começa em zero |
| A reversão (RF38) preenche `retiradaEm` e `retiradaPor` só nas faltas indicadas | Na reversão, as faltas indicadas deixam de contar e continuam no histórico, com autor e data/hora |

**Telas:** contador "Faltas no ciclo: N de 2", com o histórico do que conta e do que não conta e a falta retirada marcada como desconsiderada. Protótipo: [prancha 3-2](prototipos-ciclo-4.md#rf35).

**Dados de teste:** paciente sem falta; com uma falta; com uma falta, duas sessões realizadas e uma nova falta; cancelamentos no prazo (2 horas antes), fora do prazo (30 minutos antes) e administrativo (10 minutos antes); paciente que não confirmou e compareceu; falta justificada; paciente no ciclo 2 com duas faltas no ciclo 1.

---

### RF36 — Emitir alerta de limite de faltas atingido ([#152](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/152))

**Rota:** `GET /faltas/alertas` (secretaria e coordenação: todos os casos; estagiário: só os casos dele). Devolve os casos `em_atendimento` com contagem 2 ou mais, sem desligamento vigente no ciclo, com o nome do paciente e a data da última falta, sem o motivo das faltas.

**O alerta não tem tabela:** ele existe enquanto a condição vale. Por isso, some sozinho quando o desligamento é registrado (o caso deixa de estar `em_atendimento`) e não volta depois de uma reversão que deixe a contagem abaixo de 2.

```mermaid
sequenceDiagram
    actor U as Secretaria, coordenação ou estagiário
    participant W as Web (área interna)
    participant A as API (assiduidade)
    U->>W: qualquer página da área interna
    W->>A: GET /faltas/alertas
    A-->>W: casos com limite atingido, conforme o perfil
    W-->>U: faixa vermelha "Limite de faltas atingido" com o nome do paciente
```

| Regra | Critério de aceitação |
| --- | --- |
| Contagem >= 2 e caso `em_atendimento` | Na 2ª falta do ciclo, consecutiva ou não, o alerta aparece para a secretaria, o estagiário responsável e a coordenação |
| O caso desligado sai do filtro | O registro do desligamento (RF37) remove o alerta |

**Telas (RNF33):** faixa no topo da área interna, carregada pelo layout em toda página, com ícone, o texto "Limite de faltas atingido", o nome do paciente e o link para o paciente; `role="status"`, para o leitor de tela anunciar sem roubar o foco; o vermelho nunca é o único sinal. A consulta usa o mesmo cache do contador do menu, para não pesar na navegação. Protótipo: [prancha 3-3](prototipos-ciclo-4.md#rf36).

**Dados de teste:** um paciente com 1 falta (sem alerta) e outro com 2 (com alerta), vistos pelos três perfis; a coordenação com três pacientes no limite; um estagiário que não é o responsável (não vê o alerta do paciente); o mesmo paciente depois do desligamento (o alerta some).

---

### RF37 — Desligar paciente por faltas e liberar vaga ([#153](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/153))

**Rotas:**

- `POST /casos/:id/desligamento` (secretaria ou coordenação), com a `dataDecisao`.
- `GET /vagas/liberadas` (coordenação: todas; supervisor: as dos estagiários dele), com o próximo inscrito elegível da fila, que vem do RF7.

```mermaid
sequenceDiagram
    actor U as Secretaria ou coordenação
    participant A as API (assiduidade)
    participant F as Fila (RF7)
    participant DB as Banco
    U->>A: POST /casos/:id/desligamento
    A->>DB: confere o perfil e a contagem do ciclo
    alt contagem menor que 2
        A-->>U: 422 paciente sem alerta de limite pendente
    else limite atingido
        A->>DB: transação: DesligamentoPorFaltas e caso desligado_por_faltas
        A->>DB: encerra o vínculo vigente com o estagiário
        A->>DB: cancela as sessões futuras (classificação desligamento, sem falta)
        A->>DB: VagaLiberada do estagiário e do supervisor
        A->>DB: auditoria (RNF10, RNF32)
        A->>F: próximo inscrito elegível
        A-->>U: desligado, vaga liberada aguardando realocação
    end
```

| Regra | Critério de aceitação |
| --- | --- |
| `422` quando a contagem do ciclo é menor que 2 | Paciente sem alerta pendente não pode ser desligado por faltas |
| Uma transação só: desligamento, situação do caso, vínculo encerrado, sessões futuras canceladas e vaga liberada | A confirmação registra a decisão com data e responsável, muda o status, encerra o vínculo, cancela as sessões futuras e sinaliza a vaga, com o próximo inscrito da fila |
| As sessões canceladas pelo desligamento não geram falta nem notificação de ausência do estagiário | O desligamento não aumenta a contagem nem conta como falta do estagiário |
| `VagaLiberada.ocupadaEm` só é preenchido pelo RF21, quando o supervisor vincula um novo paciente ao mesmo estagiário | Nenhum inscrito é vinculado sozinho; a vaga só deixa de estar pendente com o novo vínculo |
| Tudo na mesma transação, sem fila de mensagens nem tarefa agendada | A vaga aparece como liberada em até 5 segundos (RNF34) |

**Integração com o RF21:** ao registrar um vínculo, o `CasosService` procura a `VagaLiberada` aberta mais antiga do mesmo estagiário e preenche `ocupadaEm` e `ocupadaPorVinculoId`. É a única mudança no código do Ciclo 3.

**Telas:** botão "Desligar por faltas" só no paciente com alerta, com diálogo de confirmação que lista as sessões futuras que serão canceladas; cartão "Vaga liberada aguardando realocação" na distribuição (coordenação) e em "Meus casos" (supervisor), com o próximo inscrito elegível. Protótipo: [prancha 3-4](prototipos-ciclo-4.md#rf37).

**Dados de teste:** um paciente com 2 faltas e duas sessões futuras; um paciente com 1 falta (recusado); uma fila com o próximo inscrito elegível e uma fila vazia; o desligamento pela secretaria e pela coordenação; a vaga vista pelo supervisor do estagiário e por outro supervisor (que não vê).

---

### RF38 — Reverter desligamento de paciente por faltas ([#154](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/154))

**Rota:** `POST /desligamentos/:id/reversao` (só coordenação), com o `motivo`, obrigatório, e a lista `faltasRetiradas`, com os ids das faltas do ciclo que deixam de contar (RF35). A lista pode vir vazia.

```mermaid
sequenceDiagram
    actor C as Coordenação
    participant A as API (assiduidade)
    participant DB as Banco
    C->>A: POST /desligamentos/:id/reversao, com motivo e faltas retiradas
    alt outro perfil
        A-->>C: 403
    else sem motivo, ou falta de outro caso ou ciclo
        A-->>C: 400 com o campo indicado
    else desligamento já revertido
        A-->>C: 409
    else reversão válida
        A->>DB: transação: marca o desligamento como revertido, com autor, data e motivo cifrado
        A->>DB: retira da contagem as faltas indicadas
        alt vaga ainda não ocupada
            A->>DB: novo vínculo vigente com o mesmo estagiário e caso em_atendimento
            A->>DB: encerra a VagaLiberada
            A-->>C: revertido, com as sessões canceladas a reagendar
        else vaga já ocupada por outro paciente
            A->>DB: caso aguardando_vaga, sem mexer no vínculo novo
            A-->>C: revertido, pendente de tratamento manual da vaga
        end
        A->>DB: auditoria (RNF10, RNF32)
    end
```

| Regra | Critério de aceitação |
| --- | --- |
| Vaga sem `ocupadaEm`: o caso volta para `em_atendimento` com um novo `VinculoEstagiario` do mesmo estagiário; o vínculo antigo continua no histórico | Com a vaga livre, o paciente volta ao atendimento com o mesmo estagiário, a sinalização sai e as sessões canceladas aparecem para reagendar |
| Vaga com `ocupadaEm`: o vínculo do novo paciente não é tocado; o caso fica `aguardando_vaga` | Com a vaga já ocupada, o novo paciente continua e a reversão fica pendente de tratamento manual |
| `@Perfis('coordenacao')` | Outro perfil não reverte |
| O desligamento recebe os campos da reversão, e nenhum registro é apagado | O desligamento e a reversão continuam na auditoria, cada um com autor, data/hora e motivo |

**Telas:** diálogo "Reverter desligamento" com o motivo obrigatório e a lista das faltas do ciclo, cada uma com uma caixa "Deixa de contar"; depois, a lista das sessões canceladas a reagendar, com o atalho para o agendamento. A escolha das faltas é uma proposta levada à FBr em 06/11. Protótipo: [prancha 3-5](prototipos-ciclo-4.md#rf38).

**Dados de teste:** um desligamento com a vaga livre e duas sessões canceladas; um com a vaga já ocupada por outro paciente; uma reversão sem motivo (recusada); uma reversão com uma falta retirada (a contagem volta a 1); tentativas da secretaria, do supervisor e do estagiário (403); uma segunda reversão do mesmo desligamento (409).

---

**Decisões de projeto da CP9** (a conferir na inspeção):

1. **Contagem e alerta calculados, sem tabela.** Assim, não há como a contagem divergir das faltas, e a reversão ajusta tudo só preenchendo `retiradaEm`. O custo é uma consulta por tela, coberta por um índice em `(caso_id, ciclo_atendimento)` na `faltas_paciente`.
2. **Cancelamento fora do prazo vira `FaltaPaciente`.** O RF15 (Nicolas) chama o `FaltasService` na mesma transação do cancelamento. A interface entre os dois é só esse método, combinado entre as duas PRs.
3. **Sessões canceladas pelo desligamento.** Ficam `cancelada`, com a classificação `desligamento`, que não é nenhuma das três do RF15. Elas não contam como falta do paciente nem do estagiário.
4. **Novo vínculo na reversão, em vez de reativar o antigo.** Preserva o histórico de responsáveis do RF27 e respeita o índice de um vínculo vigente por caso.
5. **Situação `aguardando_vaga`.** O RF38 não diz em que situação o caso fica quando a vaga já foi ocupada. O protótipo mostra "aguarda vaga", e a coordenação resolve depois, distribuindo de novo (RF20) ou vinculando quando surgir uma vaga.
6. **Fila (RF7) ainda não existe.** Até o RF7 entrar, o `GET /vagas/liberadas` devolve o próximo inscrito elegível como vazio, e a tela mostra "Fila de espera disponível com o RF7".

**Dependências e riscos:** o RF14 e o RF15 (Nicolas) trazem os status `confirmada` e `cancelada`; até eles entrarem, os testes do RF34 criam as sessões direto no banco, como no Ciclo 3. O RF7 (Jônatas) traz a fila. Nenhuma integração externa: não há e-mail, SMS nem PDF na CP9.

---

## Roteiro da inspeção de design

O mesmo do [Ciclo 3](projeto-features-ciclo-3.md#roteiro-da-inspecao-de-design): o Líder de Feature faz a inspeção com o revisor da issue e registra o resultado num comentário da issue.

Como o Gabriel escreveu o projeto, ele não inspeciona nenhuma feature deste ciclo, nem as que tem como revisor na issue (RF11, RF14, RF15, RF16 e RF69). Nelas, o Líder faz a inspeção com outro integrante, definido na reunião da equipe de 05/11/2026: o Jônatas, com o Nicolas (RF11, RF14, RF15 e RF16), e a Maria Clara, com o Luís (RF69). Nas features do Gabriel (RF34 a RF38), a inspeção é do Nicolas, o revisor das issues.
