# Verificação dos RNFs

Onde e como cada RNF das features foi verificado no D4.5 do DoD. A página separa o **resultado local de referência** (computador de desenvolvimento ou runner do CI) da **evidência na homologação**, que é a exigida para o [patamar mínimo de lançamento](../requisitos/priorizacao-e-mvp.md#patamar-minimo-de-lancamento-dos-rnfs-evolutivos) dos RNFs evolutivos e para os RNFs que dependem do ambiente. Situação em 26/11/2026; a fonte de cada linha é o comentário do D4.5 na issue da feature.

## Ambientes de verificação

| Ambiente | O que é | Vale como evidência de |
| --- | --- | --- |
| **CI: API** | Testes do Jest no runner do GitHub, com o banco em memória (PGlite) | Regras, permissões e travas do banco. **Não** vale para desempenho |
| **CI: web e e2e** | Vitest e Playwright no runner, com a API e o Postgres do próprio job | Comportamento das telas, teclado, foco e axe. **Não** vale para desempenho |
| **Leitor de tela** | VoiceOver no runner macOS | Leitura das telas (RNF24 e RNF56) |
| **Validação** | O ambiente de homologação: mesma VPS, mesmo compose e mesma configuração da produção, com dados fictícios | Desempenho (carga), disponibilidade, cópia de segurança, criptografia e permissões do banco |
| **Produção** | Ainda não publicada (sobe em 30/11/2026) | Nenhum RNF foi verificado em produção até agora |

**Como o robô conta a evidência.** O Feature Status aceita como evidência todo teste que passa na `development` e cita no nome o RNF e o RF. Só o RNF10, o RNF22, o RNF24, o RNF25, o RNF41, o RNF51, o RNF52 e o RNF56 exigem uma segunda origem (registro `/rnf`, leitor de tela ou carga). Por isso, nas tabelas do robô, um RNF de desempenho ou de usabilidade pode aparecer como verificado só com um teste do runner. A tabela de [situação por feature](#situacao-por-feature) abaixo marca esses casos como **só local**.

## Desempenho na homologação { #desempenho-na-homologacao }

Execuções do [teste de carga](teste-de-carga.md) contra a validação (`api.validacao.clinica.fbr.edu.br`), com a massa de dois semestres do `semear-carga` (360 inscrições, 200 pacientes em atendimento e 4.000 sessões). Um RNF só passa com **todas** as operações abaixo do limite e pelo menos 99% das verificações das respostas aprovadas: uma resposta rápida com erro não conta como atendimento.

| Data | Execução | RNF | Carga | Resultado das operações | Verificações | Situação |
| --- | --- | --- | --- | --- | --- | --- |
| 10/11 | k6 manual na VPS ([#92](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/92#issuecomment-6767041600)) | RNF21 | 30 pessoas, 10 min | 6 operações, percentil 95 de 28 a 59 ms (limite 3 s) | 100% | ✅ |
| 10/11 | k6 manual na VPS ([#96](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/96#issuecomment-6767194930)) | RNF12 | 30 pessoas, 10 min | Agendar: percentil 95 de 2.491 ms (limite 2 s) | — | ❌ |
| 17/11 | [43989431878](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/actions/runs/43989431878) (evidência) | RNF12 | 30 pessoas, 10 min, 12.768 requisições | Buscar paciente 199 ms; agendar 1.307 ms (percentil 95, limite 2 s) | 100% | ✅ |
| 17/11 | idem | RNF21 | idem | 9 operações, percentil 95 de 187 a 378 ms (limite 3 s) | 100% | ✅ |
| 17/11 | idem | RNF47 | 10 pessoas da coordenação, 10 min, 2.292 consultas de 12 meses | Percentil 95 de 1.629 ms; a mais lenta, 12.791 ms (limite 5 s) | 100% | ❌ |
| 24/11 | [45441193814](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/actions/runs/45441193814) (só RNF47) | RNF47 | 10 pessoas, 5 min | Percentil 95 de 4.523 ms; a mais lenta, 15.957 ms | — | ❌ |
| 26/11 | [45897203976](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/actions/runs/45897203976) (só RNF47, diagnóstico) | RNF47 | 10 pessoas, 5 min, 865 consultas, **com uma implantação no meio** | Percentil 95 de 5.726 ms; a mais lenta, 19.848 ms | 93% | ❌ |
| 26/11 | [45898524343](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/actions/runs/45898524343) (só RNF47, diagnóstico) | RNF47 | 10 pessoas, 5 min, 1.167 consultas, sem implantação | Percentil 95 de 1.515 ms; a mais lenta, 3.788 ms | 100% | ✅ (não conta como evidência) |
| 26/11 | [45899373500](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/actions/runs/45899373500) (evidência, sem implantação, com prioridade de CPU) | RNF12 | 30 pessoas, 10 min, 13.299 requisições | Buscar paciente 241 ms; agendar 228 ms | 88% | ❌ (ver abaixo) |
| 26/11 | idem | RNF21 | idem | Listar, disponibilidade, meus casos, meus pacientes, lista e responsáveis de 225 a 433 ms; **distribuir, estagiários disponíveis e vincular: 0 requisições** | 88% | ❌ (ver abaixo) |
| 26/11 | idem | RNF47 | 10 pessoas, 10 min, 2.056 consultas | Percentil 95 de 1.810 ms; a mais lenta, 27.175 ms | 100% | ❌ |
| 26/11 | [45904378884](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/actions/runs/45904378884) (só RNF47, depois da correção) | RNF47 | 10 pessoas, 10 min, 2.423 consultas, com a prioridade de CPU e o limite de memória da API | Percentil 95 de 1.286 ms; a mais lenta, 2.841 ms | 100% | ✅ (diagnóstico; a evidência é a carga completa) |

**Por que o RNF47 falhava.** A VPS da FBr tem 2 vCPUs e roda também o site, o Moodle, o OJS e o Coolify. Medindo a VPS durante as execuções de 26/11, as consultas lentas vieram de duas causas: a CPU disputada (uma implantação no meio da carga e os outros sistemas) e a memória da API. Sem limite, o Node da API deixava o lixo acumular até perto de 1,7 GB antes de limpar, com a VPS já usando 2 GB de swap, e algumas consultas ficavam paradas por mais de 20 s. Com a prioridade de CPU para o banco e a API e o heap da API limitado a 512 MB (ver a [Implantação](implantacao.md)), a mesma carga ficou com a consulta mais lenta em 2,8 s. A carga que conta como evidência roda sem implantação em andamento.

**A massa da validação se esgota.** As gravações do cenário de referência (distribuir e vincular) consomem os casos pendentes da massa, e o `semear-carga` não repete a massa que já existe. Na execução de 26/11, a validação não tinha mais casos pendentes: as operações de leitura ficaram rápidas, mas distribuir e vincular não aconteceram, e as verificações caíram para 88%. Antes de uma nova execução que conte como evidência, a massa precisa ter casos pendentes de novo. Uma execução que falha também não substitui mais a evidência anterior: desde 26/11, o artefato `rnfs-carga` só é publicado quando o RNF12 e o RNF21 passam.

**O que a carga ainda não cobre.** O RNF12 foi medido só em buscar paciente e agendar. Confirmar presença (RF14) e cancelar (RF15 e RF16) não estão na carga. O RNF29 (evolução) e o RNF40 (declaração) ainda não têm cenário de carga.

## Patamares dos RNFs evolutivos

| RNF | Patamar mínimo de lançamento | Situação |
| --- | --- | --- |
| [RNF12](../requisitos/nao-funcionais.md#rnf12) | 2 s no percentil 95, na homologação | ✅ Na validação, em 17/11, só para buscar e agendar |
| [RNF14](../requisitos/nao-funcionais.md#rnf14) | Monitor a cada minuto, com tempo limite de 10 s e a fórmula conferida | ✅ Monitor na validação: 99,889% de 10/11 a 25/11 ([#96](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/96#issuecomment-7177830795)). O relatório mensal só existe depois da produção |
| [RNF21](../requisitos/nao-funcionais.md#rnf21) | 3 s no percentil 95, no cenário de referência | ✅ Na validação, em 10/11 e 17/11 |
| [RNF22](../requisitos/nao-funcionais.md#rnf22) | Teste de tarefa com pelo menos 3 participantes por perfil | ⚠️ Teste com 3 pessoas da clínica, aplicado pela FBr em 12/11, abaixo do patamar escrito (3 **por perfil**) |
| [RNF29](../requisitos/nao-funcionais.md#rnf29) | 2 s no percentil 95, no cenário de referência | ⏳ Não verificado: sem cenário de carga e não declarado nas issues da evolução |
| [RNF30](../requisitos/nao-funcionais.md#rnf30) | Teste de tarefa com pelo menos 3 estagiários | ⏳ Aguarda o resultado do teste com os estagiários |
| [RNF40](../requisitos/nao-funcionais.md#rnf40) | 5 s no percentil 95, no cenário de referência | ⏳ Aguarda o cenário de carga da declaração (RF45) |
| [RNF41](../requisitos/nao-funcionais.md#rnf41) | Teste de tarefa com pelo menos 3 participantes por público | ⚠️ Uso pelos usuários da clínica (12/11 e 24/11) e e2e das 3 interações, abaixo do patamar escrito (3 **por público**); ver o [registro do RNF41](entrega-final.md#registro-do-rnf41) |
| [RNF57](../requisitos/nao-funcionais.md#rnf57) | Foco visível com contorno de pelo menos 2 px nas páginas externas | ✅ Pelos testes e2e (local, no runner) |

## Situação por feature { #situacao-por-feature }

**Legenda:** **H** = verificado na homologação ou por registro `/rnf` na validação; **L** = verificado só por teste do runner (local); **P** = pendente.

| RF | Issue | D4.5 | RNFs | Observação |
| --- | --- | --- | --- | --- |
| RF1 | [#88](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/88) | ☑ | RNF51 H, RNF53 H; RNF1, RNF56, RNF57, RNF58 L | — |
| RF2, RF4, RF6, RF7 | #89, #90, #91, #140 | ☑ | RNF51 H (RF4, RF6); os demais L | — |
| RF8 | [#155](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/155) | ☑ | RNF6, RNF56, RNF57, RNF58 L; **RNF7 L** | O RNF7 pede teste de compreensão com pelo menos 10 pessoas: o e2e não basta |
| RF10 | [#96](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/96) | ☑ | RNF12 H, RNF14 H, RNF10 H; RNF9 L | RNF12 só em buscar e agendar |
| RF11 | [#141](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/141) | ☑ | RNF13 L | A tabela do robô (15/11) ainda mostra o RNF13 sem evidência; o teste `rf11.spec.ts` já cita o RNF13 |
| RF14 | [#142](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/142) | ☑ | RNF10 H; RNF59 L; **RNF15 L** | O RNF15 pede teste com pelo menos 10 pessoas e 90%: o e2e não basta |
| RF15, RF16 | #143, #144 | ☑ | RNF10 H | O desempenho do cancelamento (RNF12) não foi medido |
| RF18, RF20, RF21 | #92, #94, #95 | ☑ | RNF21 H (RF18), RNF22 H (com a ressalva acima); RNF16 a RNF19 e RNF24 L | — |
| RF22, RF23 | #145, #146 | ☑ | RNF21 H (a carga de 17/11 mede a lista e os responsáveis); RNF17, RNF24 L | A tabela do robô do RF22 (16/11) ainda cita só o teste da API |
| RF25 | #147 | ☑ | RNF16, RNF18, RNF20 L | — |
| RF27, RF66, RF69 | #148, #97, #130 | ☑ | RNF51 H, RNF52 H; **RNF25 por inspeção em banco local** | A inspeção do RNF25 foi feita num banco local limpo, e não na validação |
| RF28 | [#149](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/149) | ☑ | RNF25, RNF27 L; **RNF30 P**; **RNF29 P** | A tabela do robô é de 16/11; o RNF29 não está declarado na issue |
| RF29 | #224 | ☑ | RNF28 L | RNF29 não declarado |
| RF34 a RF39 | #150 a #154, #225 | ☑ | RNF32, RNF34, RNF35 L; **RNF33 L** | O RNF33 inclui leitor de tela e escala de cinza; o RNF34 pede 20 medições de até 5 s, e o teste confere a transação, sem medir tempo |
| RF40, RF63, RF64 | #276, #277, #278 | ☑ | RNF35 L | — |
| RF41 | #43 | ☑ | RNF36 L | — |
| RF44 | #226 | ☑ | RNF38, RNF43, RNF56, RNF57, RNF58 L; RNF41 H (com a ressalva acima) | — |
| RF45 | #280 | ☐ | RNF38, RNF39 L; RNF41 H (com a ressalva acima); **RNF40 P** | — |
| RF48 | [#22](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/22) | ☐ | RNF46 L; **RNF47 na validação** (ver [desempenho](#desempenho-na-homologacao)) | — |
| RF49 | #23 | ☐ | **RNF47 (exportação), RNF48 P** | A exportação em PDF ainda não está na carga |
| RF50, RF51, RF53, RF54 | #45, #46, #48, #49 | ☑ | RNF53 H; RNF38, RNF49, RNF50 L | — |
| RF52 | #47 | ☑ | RNF6, RNF38, RNF56, RNF57, RNF58 L | — |
| RF55, RF56 | #50, #51 | ☑ | RNF51 H, RNF52 H, RNF53 H (RF55); RNF25 por inspeção local | — |
| RF57 | #52 | ☐ | RNF51 H; RNF57, RNF58 L; **RNF56 P** | Falta o teste do leitor de tela |
| RF30 a RF33, RF42, RF43, RF65, RF67, RF68 | #271 a #275, #131, #44, #279, #281, #272, #273 | Em andamento no Ciclo 6 | — | O D4.5 dessas features fecha depois da integração; o RNF27 já tem testes da API no RF67 e no RF68 |

## Testes de negação por perfil

A existência de um controle de acesso não comprova sozinha cada restrição. Cada linha liga um teste que nega o acesso ao RF que ele protege.

| RF | Teste | Quem é negado | O que o teste confere |
| --- | --- | --- | --- |
| RF27 | `casos.spec.ts`, "o prontuário criado no vínculo nega o acesso como se não existisse, sem o nome do paciente (RF66, RNF25)", e o teste seguinte, com o prontuário vazio e com dados | Secretaria, estagiário sem vínculo, supervisor não responsável | Pela API (HTTP): 403 com o mesmo corpo e o mesmo tamanho do prontuário inexistente, sem o nome |
| RF27 | `politica-prontuario.spec.ts`, "%s tem o acesso negado na API, e a tentativa é registrada (RNF25)" e os testes do prontuário inexistente e do vínculo encerrado | Estagiário de outro caso, outro supervisor, secretaria, ex-responsável | 403 e a tentativa em `acessos_prontuario` com `permitido = false` (pelo serviço) |
| RF27, RF23 | `meus-casos.spec.ts`, "o acesso direto ao prontuário de um caso de outro é negado ao estagiário e ao supervisor"; e2e `rf23.spec.ts` | Estagiário e supervisor de outro caso | HTTP 403 sem nomes; a tela negada não mostra o paciente |
| RF55 | `politica-prontuario.spec.ts`, "%s não registra anamnese nem contrato (403)" e "%s não registra evolução (403)" | Supervisor, coordenação, secretaria, estagiário de outro caso | 403, nada gravado e a tentativa registrada (pelo serviço) |
| RF55 | e2e `ciclo-3.spec.ts`, "a coordenação consulta o prontuário só para leitura, e a secretaria tem o acesso negado sem o nome do paciente" | Secretaria; coordenação, na escrita | Tela negada sem o nome; sem os botões de salvar |
| RF55 | `transferencia.spec.ts`, "transfere para outro estagiário dele: o anterior perde o acesso" | Estagiário anterior | HTTP: o anterior perde o acesso, e o novo recebe 200 |
| RF55 | `evolucao-da-sessao`, `historico-evolucoes`, `elaboracao-relatorio`, `relatorio-final`, `correcao-evolucao` e `validacao-evolucao` (specs da API) | Estagiário de outro caso ou anterior, secretaria, outro supervisor, coordenação na escrita | 403 sem conteúdo e a tentativa registrada; a secretaria só vê a versão aprovada do relatório final |
| RF55, RNF52 | `usuario-da-aplicacao.spec.ts`, "apagar ou alterar o registro de acessos é recusado pela permissão do banco" | Usuário da aplicação no banco (`clinica_app`) | O banco recusa |
| RF56 | `acessos-prontuario.spec.ts`, "recusa visitante sem sessão" e "recusa consulta pelo perfil %s sem expor registros (RNF17)" | Visitante; secretaria, estagiário, supervisor | 401; 403 sem os dados do registro |
| RF56 | `acessos-prontuario.spec.ts`, "não permite alterar ou apagar acessos pela API, perfil %s (RNF52)"; e2e `rf56.spec.ts` | Todos os perfis; secretaria, supervisor e estagiário na tela | Os registros não mudam; sem o item no menu, API 403 sem o nome do paciente |
| RF52 | `verificacao.spec.ts`, "sem verificação, as rotas do paciente respondem 401", código expirado, já usado, 5ª tentativa e "conhecer o CPF ou o número de outra inscrição não dá acesso a ela (RF52, RNF6)" | Visitante, código inválido, terceiro com o identificador de outra inscrição | 401 ou 400 com mensagem genérica, sem dado e sem sessão |
| RF52 | `declaracoes.spec.ts`, "o paciente verificado não emite a declaração de outro paciente" e "autorização das declarações por perfil (RF50, RF52, RNF38)" | Paciente de outra inscrição; estagiário e supervisor | 403 e a tentativa registrada; 401 sem verificação |
| RF53, RF54 | `rotas-acesso.spec.ts`, "%s não lista, não cadastra nem desativa usuários (403)" | Secretaria, estagiário, supervisor | 403. O nome do teste não cita o RF, então ele não aparece no D4.5 das issues |

**Lacunas conhecidas:**

- **RF27 e RF55, escrita no prontuário:** a escrita negada (anamnese, contrato e evolução) é testada no serviço e na tela, mas não por uma requisição HTTP com cada perfil. A leitura negada tem testes HTTP.
- **RF52:** as tentativas negadas da verificação não são conferidas na auditoria, fora da emissão da declaração. Os critérios do RF52 não pedem esse registro.
- **RF53 e RF54:** o teste de negação não cita o RF nem confere o registro da tentativa.
- **RNF25:** a inspeção foi feita num banco local, e não na validação.
