# Features e backlog

Esta é a lista única das features do produto e do backlog de construção. Para cada feature, ela mostra o ciclo em que a feature é construída, o Líder de Feature e o status. O detalhamento fica nas unidades:

- a declaração de cada feature, com o RF, os critérios de aceitação e a rastreabilidade, está em [Requisitos Funcionais (8.1)](../unidade-2/requisitos/funcionais.md);
- os RNFs que restringem as features estão em [Requisitos Não Funcionais (8.2)](../unidade-2/requisitos/nao-funcionais.md) e na [classificação dos RNFs para o MVP (10.2.3.1)](../unidade-2/requisitos/backlog.md#10231-classificacao-dos-requisitos-nao-funcionais-para-o-mvp);
- o motivo de cada feature estar ou não no MVP está na [priorização e recorte do MVP (10.2)](../unidade-2/requisitos/backlog.md#102-priorizacao-e-recorte-do-mvp), validada com a Clínica Escola FBr;
- as datas e o status de cada ciclo estão no [Cronograma geral](cronograma.md).

_Última atualização do status: 15/10/2026._

## Situação por ciclo

| Ciclo | Período | Features | Concluídas | Status do ciclo |
| --- | --- | --- | --- | --- |
| [Ciclo 3](#ciclo-3) | 14/10 a 27/10/2026 | 14 | 0 | Em andamento |
| [Ciclo 4](#ciclo-4) | 28/10 a 10/11/2026 | 19 | 0 | Aguardando |
| [Ciclo 5](#ciclo-5) | 11/11 a 17/11/2026 | 7 | 0 | Aguardando |
| [Ciclo 6](#ciclo-6) | 18/11 a 01/12/2026 | 13 | 0 | Aguardando |
| [Ciclo 7](#ciclo-7) | 02/12 a 10/12/2026 | sem novas features | — | Aguardando |
| **MVP** | | **53** | **0** | |
| [Versões posteriores](#versoes-posteriores) | reavaliadas ao fim da Unidade 4 | 15 | — | Fora do MVP |

## Como ler o backlog

O backlog segue o processo **Planejar por Feature** do FDD:

- **Feature (RF):** cada feature declara um requisito funcional e leva à sua declaração completa.
- **Ordem:** ordem de construção, ciclo a ciclo, respeitando as dependências declaradas na rastreabilidade de cada RF. Os itens que servem de base para os demais (acesso, inscrição, triagem, distribuição de casos e agendamento) vêm primeiro.
- **Ciclo:** ciclo em que a feature passa pelos processos **Projetar por Feature** e **Construir por Feature**. A carga de cada Líder de Feature foi distribuída pelas horas estimadas na [escala de esforço](../unidade-2/requisitos/backlog.md#10212-escalas-adotadas), e cada CP do MVP tem ao menos um incremento construído até a entrega da Unidade 3, em 17/11. A construção do MVP termina no Ciclo 6, como combinado com a FBr; o Ciclo 7 fica reservado à demonstração integrada, ao aceite da FBr e à entrega da Unidade 4, em 10/12.
- **Líder de Feature:** integrante que conduz o projeto, a construção e a demonstração da feature, conforme a [composição da equipe](../unidade-1/gestao/equipe-comunicacao.md#71-composicao-da-equipe). Cada feature tem ainda a revisão cruzada de outro integrante nas inspeções de design e de código.
- **Status:** estado da feature no FDD, conforme o [estudo do FDD (§3.3)](../unidade-1/estudos/fdd.md#33-planejar-por-feature): _Identificada → Planejada → Em design → Design inspecionado → Em construção → Código concluído → Testada → Inspecionada → Promovida → Demonstrada → Aceita_. As features do MVP estão **Planejadas** e passam a **Em design** depois de avaliadas pelo [Definition of Ready](../unidade-2/requisitos/dor-dod.md); a partir daí, cada marco é comprovado pelo [Definition of Done](../unidade-2/requisitos/dor-dod.md#92-definition-of-done-dod). As features fora do MVP permanecem **Identificadas**.
- **Issue:** issue do GitHub em que a feature é acompanhada e em que as avaliações do DoR e do DoD são registradas, quando já criada.

O Líder de Feature atualiza o status na issue e nesta página sempre que a feature passa por um marco. O status dos ciclos é revisado ao fim de cada ciclo, conforme a [atualização do planejamento](../unidade-1/gestao/cronograma.md#63-atualizacao-do-planejamento).

## Backlog do MVP por ciclo

### Ciclo 3 (14/10 a 27/10) · Em andamento { #ciclo-3 }

Antes das features, Gabriel prepara a base técnica do projeto (repositório, banco de dados, autenticação, integração contínua e provedores de e-mail, SMS e PDF), da qual todas dependem. **Status:** em andamento, no [PR #82](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/82) (rascunho).

| Ordem | Feature (RF) | CP | Depende de | Líder de Feature | Status | Issue |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | [RF1](../unidade-2/requisitos/funcionais.md#rf1) — Registrar solicitação de atendimento on-line | CP1 | — | Jônatas | Planejada | — |
| 2 | [RF2](../unidade-2/requisitos/funcionais.md#rf2) — Emitir comprovante de inscrição | CP1 | — | Jônatas | Planejada | — |
| 3 | [RF4](../unidade-2/requisitos/funcionais.md#rf4) — Organizar informações da inscrição para triagem | CP2 | CP1 | Luís Henrique | Planejada | — |
| 4 | [RF6](../unidade-2/requisitos/funcionais.md#rf6) — Registrar prioridade clínica do inscrito | CP2 | [RF4](../unidade-2/requisitos/funcionais.md#rf4), [RF5](../unidade-2/requisitos/funcionais.md#rf5) (fora do MVP) | Luís Henrique | Planejada | — |
| 5 | [RF18](../unidade-2/requisitos/funcionais.md#rf18) — Listar casos aguardando distribuição | CP5 | — | Maria Clara | Planejada | — |
| 6 | [RF19](../unidade-2/requisitos/funcionais.md#rf19) — Registrar áreas de especialidade do supervisor | CP5 | — | Maria Clara | Planejada | — |
| 7 | [RF20](../unidade-2/requisitos/funcionais.md#rf20) — Distribuir caso a supervisor conforme área de especialidade | CP5 | [RF18](../unidade-2/requisitos/funcionais.md#rf18), [RF19](../unidade-2/requisitos/funcionais.md#rf19), [RF6](../unidade-2/requisitos/funcionais.md#rf6) | Maria Clara | Planejada | — |
| 8 | [RF50](../unidade-2/requisitos/funcionais.md#rf50) — Autenticar usuário institucional | CP12 | — | Joaquim | Planejada | [#45](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/45) |
| 9 | [RF53](../unidade-2/requisitos/funcionais.md#rf53) — Cadastrar usuário institucional com perfil de acesso | CP12 | — | Gabriel | Planejada | [#48](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/48) |
| 10 | [RF54](../unidade-2/requisitos/funcionais.md#rf54) — Desativar usuário institucional | CP12 | — | Gabriel | Planejada | [#49](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/49) |
| 11 | [RF21](../unidade-2/requisitos/funcionais.md#rf21) — Vincular paciente a estagiário responsável | CP5 | [RF20](../unidade-2/requisitos/funcionais.md#rf20), [RF53](../unidade-2/requisitos/funcionais.md#rf53), [RF54](../unidade-2/requisitos/funcionais.md#rf54) | Maria Clara | Planejada | — |
| 12 | [RF10](../unidade-2/requisitos/funcionais.md#rf10) — Agendar sessão do paciente | CP4 | CP5 | Nicolas | Planejada | — |
| 13 | [RF66](../unidade-2/requisitos/funcionais.md#rf66) — Criar e inicializar o prontuário do paciente | CP6 | [RF21](../unidade-2/requisitos/funcionais.md#rf21) | Luís Henrique | Planejada | — |
| 14 | [RF55](../unidade-2/requisitos/funcionais.md#rf55) — Restringir acesso ao prontuário do paciente | CP12 | — | Gabriel | Planejada | [#50](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/50) |

### Ciclo 4 (28/10 a 10/11) · Aguardando { #ciclo-4 }

| Ordem | Feature (RF) | CP | Depende de | Líder de Feature | Status | Issue |
| --- | --- | --- | --- | --- | --- | --- |
| 15 | [RF7](../unidade-2/requisitos/funcionais.md#rf7) — Ordenar inscritos na fila de espera | CP3 | — | Jônatas | Planejada | — |
| 16 | [RF11](../unidade-2/requisitos/funcionais.md#rf11) — Consultar agenda de sessões do estagiário | CP4 | [RF10](../unidade-2/requisitos/funcionais.md#rf10), CP5 | Nicolas | Planejada | — |
| 17 | [RF14](../unidade-2/requisitos/funcionais.md#rf14) — Confirmar presença em sessão agendada | CP4 | [RF10](../unidade-2/requisitos/funcionais.md#rf10) | Nicolas | Planejada | — |
| 18 | [RF15](../unidade-2/requisitos/funcionais.md#rf15) — Registrar cancelamento de sessão pelo paciente | CP4 | [RF10](../unidade-2/requisitos/funcionais.md#rf10) | Nicolas | Planejada | — |
| 19 | [RF16](../unidade-2/requisitos/funcionais.md#rf16) — Registrar cancelamento de sessão pelo estagiário | CP4 | [RF10](../unidade-2/requisitos/funcionais.md#rf10), CP5 | Nicolas | Planejada | — |
| 20 | [RF22](../unidade-2/requisitos/funcionais.md#rf22) — Consultar responsáveis pelo caso | CP5 | [RF21](../unidade-2/requisitos/funcionais.md#rf21) | Maria Clara | Planejada | — |
| 21 | [RF23](../unidade-2/requisitos/funcionais.md#rf23) — Consultar casos sob responsabilidade do estagiário ou supervisor | CP5 | [RF21](../unidade-2/requisitos/funcionais.md#rf21) | Maria Clara | Planejada | — |
| 22 | [RF25](../unidade-2/requisitos/funcionais.md#rf25) — Transferir caso para outro estagiário ou supervisor | CP5 | [RF21](../unidade-2/requisitos/funcionais.md#rf21) | Maria Clara | Planejada | — |
| 23 | [RF27](../unidade-2/requisitos/funcionais.md#rf27) — Consultar prontuário do paciente | CP6 | [RF66](../unidade-2/requisitos/funcionais.md#rf66), CP5 | Luís Henrique | Planejada | — |
| 24 | [RF28](../unidade-2/requisitos/funcionais.md#rf28) — Registrar evolução da sessão realizada | CP7 | CP4, CP5 | Luís Henrique | Planejada | — |
| 25 | [RF34](../unidade-2/requisitos/funcionais.md#rf34) — Registrar falta do paciente na sessão | CP9 | [RF10](../unidade-2/requisitos/funcionais.md#rf10), [RF14](../unidade-2/requisitos/funcionais.md#rf14), [RF15](../unidade-2/requisitos/funcionais.md#rf15) | Gabriel | Planejada | — |
| 26 | [RF35](../unidade-2/requisitos/funcionais.md#rf35) — Contabilizar faltas do paciente no ciclo | CP9 | [RF15](../unidade-2/requisitos/funcionais.md#rf15), [RF34](../unidade-2/requisitos/funcionais.md#rf34) | Gabriel | Planejada | — |
| 27 | [RF36](../unidade-2/requisitos/funcionais.md#rf36) — Emitir alerta de limite de faltas atingido | CP9 | [RF35](../unidade-2/requisitos/funcionais.md#rf35) | Gabriel | Planejada | — |
| 28 | [RF37](../unidade-2/requisitos/funcionais.md#rf37) — Desligar paciente por faltas e liberar vaga | CP9 | [RF36](../unidade-2/requisitos/funcionais.md#rf36) | Gabriel | Planejada | — |
| 29 | [RF38](../unidade-2/requisitos/funcionais.md#rf38) — Reverter desligamento de paciente por faltas | CP9 | [RF37](../unidade-2/requisitos/funcionais.md#rf37) | Gabriel | Planejada | — |
| 30 | [RF51](../unidade-2/requisitos/funcionais.md#rf51) — Encerrar sessão do usuário | CP12 | — | Joaquim | Planejada | [#46](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/46) |
| 31 | [RF52](../unidade-2/requisitos/funcionais.md#rf52) — Verificar identidade do paciente ou responsável | CP12 | — | Joaquim | Planejada | [#47](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/47) |
| 32 | [RF8](../unidade-2/requisitos/funcionais.md#rf8) — Consultar posição individual na fila | CP3 | [RF52](../unidade-2/requisitos/funcionais.md#rf52) | Jônatas | Planejada | — |
| 33 | [RF57](../unidade-2/requisitos/funcionais.md#rf57) — Registrar consentimento para tratamento de dados | CP12 | — | Jônatas | Planejada | [#52](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/52) |

### Ciclo 5 (11/11 a 17/11) · Aguardando { #ciclo-5 }

Ao fim deste ciclo, em 17/11, acontece a entrega da Unidade 3: todas as CPs do MVP com ao menos um incremento construído.

| Ordem | Feature (RF) | CP | Depende de | Líder de Feature | Status | Issue |
| --- | --- | --- | --- | --- | --- | --- |
| 34 | [RF17](../unidade-2/requisitos/funcionais.md#rf17) — Notificar paciente sobre ausência do estagiário | CP4 | [RF16](../unidade-2/requisitos/funcionais.md#rf16) | Nicolas | Planejada | — |
| 35 | [RF29](../unidade-2/requisitos/funcionais.md#rf29) — Corrigir evolução registrada | CP7 | [RF28](../unidade-2/requisitos/funcionais.md#rf28) | Luís Henrique | Planejada | — |
| 36 | [RF39](../unidade-2/requisitos/funcionais.md#rf39) — Consolidar faltas do estagiário para a supervisão | CP9 | [RF16](../unidade-2/requisitos/funcionais.md#rf16) | Nicolas | Planejada | — |
| 37 | [RF41](../unidade-2/requisitos/funcionais.md#rf41) — Registrar pagamento da contribuição social do paciente | CP10 | — | Joaquim | Planejada | [#43](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/43) |
| 38 | [RF44](../unidade-2/requisitos/funcionais.md#rf44) — Listar sessões com comparecimento registrado do paciente | CP10 | [RF52](../unidade-2/requisitos/funcionais.md#rf52) | Maria Clara | Planejada | — |
| 39 | [RF48](../unidade-2/requisitos/funcionais.md#rf48) — Consultar indicadores operacionais | CP11 | [RF9](../unidade-2/requisitos/funcionais.md#rf9) (fora do MVP), [RF37](../unidade-2/requisitos/funcionais.md#rf37), [RF38](../unidade-2/requisitos/funcionais.md#rf38), CP5 | Gabriel | Planejada | [#22](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/22) |
| 40 | [RF56](../unidade-2/requisitos/funcionais.md#rf56) — Consultar registro de acessos ao prontuário | CP12 | — | Jônatas | Planejada | [#51](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/51) |

### Ciclo 6 (18/11 a 01/12) · Aguardando { #ciclo-6 }

| Ordem | Feature (RF) | CP | Depende de | Líder de Feature | Status | Issue |
| --- | --- | --- | --- | --- | --- | --- |
| 41 | [RF30](../unidade-2/requisitos/funcionais.md#rf30) — Registrar complemento de evolução da sessão | CP7 | [RF28](../unidade-2/requisitos/funcionais.md#rf28) | Luís Henrique | Planejada | — |
| 42 | [RF31](../unidade-2/requisitos/funcionais.md#rf31) — Consultar evolução de uma sessão específica | CP7 | [RF28](../unidade-2/requisitos/funcionais.md#rf28), [RF29](../unidade-2/requisitos/funcionais.md#rf29), [RF30](../unidade-2/requisitos/funcionais.md#rf30) | Luís Henrique | Planejada | — |
| 43 | [RF32](../unidade-2/requisitos/funcionais.md#rf32) — Consultar histórico de evolução do paciente | CP7 | [RF27](../unidade-2/requisitos/funcionais.md#rf27), [RF28](../unidade-2/requisitos/funcionais.md#rf28), [RF29](../unidade-2/requisitos/funcionais.md#rf29), [RF30](../unidade-2/requisitos/funcionais.md#rf30) | Luís Henrique | Planejada | — |
| 44 | [RF67](../unidade-2/requisitos/funcionais.md#rf67) — Validar evolução pelo supervisor | CP7 | [RF28](../unidade-2/requisitos/funcionais.md#rf28) | Luís Henrique | Planejada | — |
| 45 | [RF68](../unidade-2/requisitos/funcionais.md#rf68) — Encerrar caso por alta | CP7 | [RF28](../unidade-2/requisitos/funcionais.md#rf28) | Luís Henrique | Planejada | — |
| 46 | [RF40](../unidade-2/requisitos/funcionais.md#rf40) — Contabilizar faltas do estagiário no semestre | CP9 | [RF16](../unidade-2/requisitos/funcionais.md#rf16), [RF39](../unidade-2/requisitos/funcionais.md#rf39) | Nicolas | Planejada | — |
| 47 | [RF63](../unidade-2/requisitos/funcionais.md#rf63) — Sinalizar reprovação do estagiário por faltas | CP9 | [RF40](../unidade-2/requisitos/funcionais.md#rf40) | Nicolas | Planejada | — |
| 48 | [RF64](../unidade-2/requisitos/funcionais.md#rf64) — Registrar decisão institucional sobre a reprovação do estagiário | CP9 | [RF63](../unidade-2/requisitos/funcionais.md#rf63) | Nicolas | Planejada | — |
| 49 | [RF42](../unidade-2/requisitos/funcionais.md#rf42) — Consultar situação da contribuição social dos pacientes | CP10 | — | Joaquim | Planejada | [#44](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/44) |
| 50 | [RF43](../unidade-2/requisitos/funcionais.md#rf43) — Bloquear agendamento por contribuição social pendente | CP10 | [RF41](../unidade-2/requisitos/funcionais.md#rf41), [RF42](../unidade-2/requisitos/funcionais.md#rf42) | Joaquim | Planejada | — |
| 51 | [RF45](../unidade-2/requisitos/funcionais.md#rf45) — Emitir declaração de comparecimento do paciente | CP10 | [RF52](../unidade-2/requisitos/funcionais.md#rf52) | Maria Clara | Planejada | — |
| 52 | [RF49](../unidade-2/requisitos/funcionais.md#rf49) — Exportar relatório institucional em PDF | CP11 | [RF48](../unidade-2/requisitos/funcionais.md#rf48) | Gabriel | Planejada | [#23](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/23) |
| 53 | [RF65](../unidade-2/requisitos/funcionais.md#rf65) — Registrar revogação do consentimento | CP12 | [RF57](../unidade-2/requisitos/funcionais.md#rf57), [RF52](../unidade-2/requisitos/funcionais.md#rf52) | Jônatas | Planejada | — |

### Ciclo 7 (02/12 a 10/12) · Aguardando { #ciclo-7 }

Sem novas features: demonstração integrada do MVP, aceite da FBr, correções apontadas e entrega da Unidade 4, em 10/12.

## Versões posteriores { #versoes-posteriores }

Estas features ficam fora do recorte do MVP e voltam a ser avaliadas ao fim da Unidade 4. O motivo de cada uma está na [definição do MVP](../unidade-2/requisitos/backlog.md#1023-definicao-do-mvp); as condições combinadas com a FBr para o período em que não estão construídas estão na [validação do MVP com o cliente](../unidade-2/requisitos/backlog.md#1024-validacao-do-mvp-com-o-cliente) e no próprio RF.

| Feature (RF) | CP | Líder de Feature | Status | Issue |
| --- | --- | --- | --- | --- |
| [RF3](../unidade-2/requisitos/funcionais.md#rf3) — Registrar inscrição assistida | CP1 | Jônatas | Identificada | — |
| [RF5](../unidade-2/requisitos/funcionais.md#rf5) — Sinalizar pontos de atenção da inscrição | CP2 | Luís Henrique | Identificada | — |
| [RF9](../unidade-2/requisitos/funcionais.md#rf9) — Manter e informar condições gerais da fila | CP3 | Jônatas | Identificada | — |
| [RF12](../unidade-2/requisitos/funcionais.md#rf12) — Reagendar sessão do paciente | CP4 | Nicolas | Identificada | — |
| [RF13](../unidade-2/requisitos/funcionais.md#rf13) — Enviar lembrete de sessão agendada | CP4 | Nicolas | Identificada | — |
| [RF24](../unidade-2/requisitos/funcionais.md#rf24) — Visualizar distribuição de casos por supervisor | CP5 | Maria Clara | Identificada | — |
| [RF26](../unidade-2/requisitos/funcionais.md#rf26) — Consultar histórico de responsáveis do caso | CP5 | Maria Clara | Identificada | — |
| [RF33](../unidade-2/requisitos/funcionais.md#rf33) — Gerar relatório final de evolução | CP8 | Luís Henrique | Identificada | — |
| [RF46](../unidade-2/requisitos/funcionais.md#rf46) — Reemitir declaração de comparecimento | CP10 | Maria Clara | Identificada | — |
| [RF47](../unidade-2/requisitos/funcionais.md#rf47) — Validar autenticidade da declaração | CP10 | Maria Clara | Identificada | — |
| [RF58](../unidade-2/requisitos/funcionais.md#rf58) — Listar casos elegíveis para continuidade entre semestres | CP13 | Gabriel | Identificada | — |
| [RF59](../unidade-2/requisitos/funcionais.md#rf59) — Registrar decisão de continuidade do caso | CP13 | Gabriel | Identificada | — |
| [RF60](../unidade-2/requisitos/funcionais.md#rf60) — Vincular caso a novo estagiário na continuidade | CP13 | Gabriel | Identificada | — |
| [RF61](../unidade-2/requisitos/funcionais.md#rf61) — Ativar modo de alto contraste | CP14 | Gabriel | Identificada | [#24](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/24) |
| [RF62](../unidade-2/requisitos/funcionais.md#rf62) — Ajustar tamanho do texto | CP14 | Gabriel | Identificada | [#25](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/25) |

## Features por área e conjunto (FDD) { #features-por-area-e-conjunto }

A lista de features do FDD organiza as 68 features por área e por conjunto de features. A tabela mostra o Líder de Feature de cada conjunto e o ciclo em que o conjunto fica concluído no MVP.

| Área (FDD) | Conjunto de features | Features no MVP | Features para versão posterior | Líder de Feature | Conclusão prevista | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Inscrição no atendimento | Inscrição on-line | [RF1](../unidade-2/requisitos/funcionais.md#rf1), [RF2](../unidade-2/requisitos/funcionais.md#rf2) | [RF3](../unidade-2/requisitos/funcionais.md#rf3) | Jônatas | Ciclo 3 | Planejado |
| Triagem clínica | Triagem e sinalização de casos | [RF4](../unidade-2/requisitos/funcionais.md#rf4), [RF6](../unidade-2/requisitos/funcionais.md#rf6) | [RF5](../unidade-2/requisitos/funcionais.md#rf5) | Luís Henrique | Ciclo 3 | Planejado |
| Gestão da fila de espera | Fila de espera e consulta de posição | [RF7](../unidade-2/requisitos/funcionais.md#rf7), [RF8](../unidade-2/requisitos/funcionais.md#rf8) | [RF9](../unidade-2/requisitos/funcionais.md#rf9) | Jônatas | Ciclo 4 | Planejado |
| Agendamento e acompanhamento de sessões | Agendamento | [RF10](../unidade-2/requisitos/funcionais.md#rf10), [RF11](../unidade-2/requisitos/funcionais.md#rf11) | [RF12](../unidade-2/requisitos/funcionais.md#rf12) | Nicolas | Ciclo 4 | Planejado |
| Agendamento e acompanhamento de sessões | Confirmação e lembrete | [RF14](../unidade-2/requisitos/funcionais.md#rf14) | [RF13](../unidade-2/requisitos/funcionais.md#rf13) | Nicolas | Ciclo 4 | Planejado |
| Agendamento e acompanhamento de sessões | Cancelamento | [RF15](../unidade-2/requisitos/funcionais.md#rf15), [RF16](../unidade-2/requisitos/funcionais.md#rf16), [RF17](../unidade-2/requisitos/funcionais.md#rf17) | — | Nicolas | Ciclo 5 | Planejado |
| Gestão de casos | Distribuição entre supervisores | [RF18](../unidade-2/requisitos/funcionais.md#rf18), [RF19](../unidade-2/requisitos/funcionais.md#rf19), [RF20](../unidade-2/requisitos/funcionais.md#rf20) | — | Maria Clara | Ciclo 3 | Planejado |
| Gestão de casos | Vinculação a estagiário | [RF21](../unidade-2/requisitos/funcionais.md#rf21), [RF22](../unidade-2/requisitos/funcionais.md#rf22), [RF23](../unidade-2/requisitos/funcionais.md#rf23) | — | Maria Clara | Ciclo 4 | Planejado |
| Gestão de casos | Acompanhamento e reorganização | [RF25](../unidade-2/requisitos/funcionais.md#rf25) | [RF24](../unidade-2/requisitos/funcionais.md#rf24), [RF26](../unidade-2/requisitos/funcionais.md#rf26) | Maria Clara | Ciclo 4 | Planejado |
| Acompanhamento clínico | Prontuário | [RF66](../unidade-2/requisitos/funcionais.md#rf66), [RF27](../unidade-2/requisitos/funcionais.md#rf27) | — | Luís Henrique | Ciclo 4 | Planejado |
| Acompanhamento clínico | Registro de evolução por sessão | [RF28](../unidade-2/requisitos/funcionais.md#rf28), [RF29](../unidade-2/requisitos/funcionais.md#rf29), [RF30](../unidade-2/requisitos/funcionais.md#rf30), [RF67](../unidade-2/requisitos/funcionais.md#rf67), [RF31](../unidade-2/requisitos/funcionais.md#rf31), [RF32](../unidade-2/requisitos/funcionais.md#rf32) | — | Luís Henrique | Ciclo 6 | Planejado |
| Acompanhamento clínico | Encerramento do ciclo | [RF68](../unidade-2/requisitos/funcionais.md#rf68) | [RF33](../unidade-2/requisitos/funcionais.md#rf33) | Luís Henrique | Ciclo 6 | Planejado |
| Assiduidade e alertas | Controle de faltas do paciente | [RF34](../unidade-2/requisitos/funcionais.md#rf34), [RF35](../unidade-2/requisitos/funcionais.md#rf35), [RF36](../unidade-2/requisitos/funcionais.md#rf36), [RF37](../unidade-2/requisitos/funcionais.md#rf37), [RF38](../unidade-2/requisitos/funcionais.md#rf38) | — | Gabriel | Ciclo 4 | Planejado |
| Assiduidade e alertas | Controle de faltas do estagiário | [RF39](../unidade-2/requisitos/funcionais.md#rf39), [RF40](../unidade-2/requisitos/funcionais.md#rf40), [RF63](../unidade-2/requisitos/funcionais.md#rf63), [RF64](../unidade-2/requisitos/funcionais.md#rf64) | — | Nicolas | Ciclo 6 | Planejado |
| Registros administrativos do atendimento | Contribuição social | [RF41](../unidade-2/requisitos/funcionais.md#rf41), [RF42](../unidade-2/requisitos/funcionais.md#rf42), [RF43](../unidade-2/requisitos/funcionais.md#rf43) | — | Joaquim | Ciclo 6 | Planejado |
| Registros administrativos do atendimento | Declaração de comparecimento | [RF44](../unidade-2/requisitos/funcionais.md#rf44), [RF45](../unidade-2/requisitos/funcionais.md#rf45) | [RF46](../unidade-2/requisitos/funcionais.md#rf46), [RF47](../unidade-2/requisitos/funcionais.md#rf47) | Maria Clara | Ciclo 6 | Planejado |
| Gestão institucional | Indicadores e relatórios institucionais | [RF48](../unidade-2/requisitos/funcionais.md#rf48), [RF49](../unidade-2/requisitos/funcionais.md#rf49) | — | Gabriel | Ciclo 6 | Planejado |
| Acesso e segurança | Autenticação | [RF50](../unidade-2/requisitos/funcionais.md#rf50), [RF51](../unidade-2/requisitos/funcionais.md#rf51), [RF52](../unidade-2/requisitos/funcionais.md#rf52) | — | Joaquim | Ciclo 4 | Planejado |
| Acesso e segurança | Controle de acesso por perfil | [RF53](../unidade-2/requisitos/funcionais.md#rf53), [RF54](../unidade-2/requisitos/funcionais.md#rf54), [RF55](../unidade-2/requisitos/funcionais.md#rf55) | — | Gabriel | Ciclo 3 | Planejado |
| Acesso e segurança | Proteção de dados | [RF56](../unidade-2/requisitos/funcionais.md#rf56), [RF57](../unidade-2/requisitos/funcionais.md#rf57), [RF65](../unidade-2/requisitos/funcionais.md#rf65) | — | Jônatas | Ciclo 6 | Planejado |
| Continuidade do atendimento | Continuidade de casos entre semestres | — | [RF58](../unidade-2/requisitos/funcionais.md#rf58), [RF59](../unidade-2/requisitos/funcionais.md#rf59), [RF60](../unidade-2/requisitos/funcionais.md#rf60) | Gabriel | — | Identificado |
| Acessibilidade e usabilidade | Personalização de exibição | — | [RF61](../unidade-2/requisitos/funcionais.md#rf61), [RF62](../unidade-2/requisitos/funcionais.md#rf62) | Gabriel | — | Identificado |
| **Total** | | **53** | **15** | | | |
