# Estratégia de verificação e validação { #estrategia-de-verificacao-e-validacao }

Esta página reúne a estratégia de verificação e validação (V&V) dos requisitos e das features do sistema. Para cada momento do processo, ela diz quando a V&V é aplicada, o que é verificado, o que é validado, o nível de rigor e qual evidência fica registrada. As técnicas estão em [Engenharia de Requisitos](engenharia-requisitos.md#verificacao-e-validacao-de-requisitos). Os critérios de cada marco, com a evidência de cada um, estão no [DoR e DoD](../requisitos/dor-dod.md). O que já foi feito está em [Execução do processo](../visao-geral/execucao-do-processo.md#6-engenharia-de-requisitos-na-pratica).

## Verificação e validação { #conceitos }

- **Verificação:** confere se o requisito, ou a feature construída a partir dele, está **certo segundo o que foi especificado**. A pergunta é: "o requisito está bem escrito, completo, consistente e testável, e o sistema faz o que ele diz?". É feita pela equipe, com revisões, checklists, inspeções, testes e conferências automáticas.
- **Validação:** confere se o requisito é **o certo para a Clínica Escola**. A pergunta é: "é isso que a clínica precisa, do jeito que ela trabalha?". É feita com quem usa e decide: a coordenação da FBr, a secretaria, os supervisores e os estagiários. As técnicas são a validação orientada a cenários, as demonstrações, os protótipos e os testes de usabilidade.

As duas se completam, e uma não substitui a outra. A FBr valida o comportamento e o valor. A conformidade com a LGPD, com as normas do CRP e com a acessibilidade é verificada pela equipe e não é delegada ao cliente ([processo de validação](equipe-e-cliente.md#73-processo-de-validacao)).

## Quando aplicar, o que verificar e o que validar { #quando-aplicar }

A V&V acompanha o requisito do registro ao aceite, seguindo os processos do FDD. O nível de rigor de cada momento está na [seção seguinte](#nivel-de-rigor).

| Momento (quando) | O que verificar | O que validar | Quem | Evidência |
| --- | --- | --- | --- | --- |
| **1. Registro ou mudança de um requisito**, em toda PR que muda os requisitos ou o catálogo | Formato da declaração, rastreabilidade (feature → CP → OE), origem numa decisão da FBr (DF) e consistência entre o catálogo e as páginas | — (a regra nova vem de uma decisão já validada, momento 2) | Autor e revisor da PR | `verificar_catalogo.py` e `mkdocs build --strict` no CI; PR aprovada por outro integrante |
| **2. Decisão ou resposta da FBr** (reunião, e-mail ou grupo da FBr) | Impacto nos RFs e RNFs já escritos e conflito com decisões anteriores (DF substituída) | A regra de negócio, com quem decide na clínica ([DF39](../requisitos/decisoes-fbr.md#df39)) | Quem conduziu a conversa e o Líder de Requisitos | Decisão no [Registro de Decisões](../requisitos/decisoes-fbr.md), com a data e a fonte; ata ou print em [Reuniões](../historico/unidade-3/reunioes.md) |
| **3. Lista de features e MVP** (Construir uma Lista de Features e Planejar por Feature) | Tamanho, sobreposição e correspondência com o modelo do domínio de cada feature; limite de capacidade do MVP | Prioridade, valor de negócio e recorte do MVP | Equipe; coordenação da FBr | [Revisão da lista de features](../visao-geral/execucao-do-processo.md#2-revisao-da-lista-de-features) e [validação do MVP](../requisitos/priorizacao-e-mvp.md#1024-validacao-do-mvp-com-o-cliente) |
| **4. Entrada no ciclo (DoR)**, antes de a feature ser construída | Checklist do [DoR](../requisitos/dor-dod.md#913-checklist-de-criterios): estrutura, clareza, critérios de aceitação verificáveis, dependências, RNFs, segurança, acessibilidade e viabilidade, mais a [verificação rápida da redação](../requisitos/dor-dod.md#914-verificacao-rapida-da-redacao) | Se alguma decisão em aberto com a FBr muda o comportamento central da feature (R4) | Líder de Feature e um revisor | Checklist na issue e [registro da avaliação](../requisitos/dor-dod.md#915-resultado-da-avaliacao) com data, avaliador, revisor e resultado (R8.1) |
| **5. Protótipo do ciclo**, antes da construção | Se as telas seguem os critérios de aceitação e os RNFs de acessibilidade (CP14) | As telas e os fluxos, com a FBr, em cenários da clínica | Equipe; coordenação e equipe técnica da FBr | [Protótipos](../construcao/prototipos.md) e ata da validação (por exemplo, a [do Ciclo 3](../historico/unidade-3/reunioes.md#reuniao-de-validacao-do-prototipo-do-ciclo-3-com-a-fbr)) |
| **6. Design inspecionado (DoD 1)**, ao fim do Projetar por Feature | Modelo detalhado, consistência com o domínio, viabilidade, acessibilidade, segurança e LGPD, normas do CRP e restrições do atendimento presencial | — | Líder de Feature, um revisor e a confirmação de outro integrante | Comentário "Inspeção de design (DoD 1)" e o `/de-acordo` (D1.8) na issue |
| **7. Código concluído e inspecionado (DoD 2 e 3)**, durante o Construir por Feature | Cada critério de aceitação coberto por teste que cita o RF; padrões de código; revisão por quem não é o autor | — | Desenvolvedor e revisor da PR | CI verde (lint, tipos, testes de API e de web, e2e) e PR aprovada (D3.1) |
| **8. Promovido para a versão integrada (DoD 4)**, no merge na `development` | Testes de novo na versão integrada e RNFs da feature no patamar exigido (D4.5) | — | Robô de acompanhamento e Líder de Feature | Tabela de RNFs do robô na issue, a partir dos relatórios dos testes e dos registros `/rnf` ([Verificação dos RNFs](boas-praticas-github.md#verificacao-dos-rnfs-d45)) |
| **9. Demonstrada e aceita (DoD 5 e 6)**, ao fim de cada ciclo | — | Comportamento e valor da feature, com cenários próximos da operação da clínica; observações e correções pedidas | Coordenação da FBr (Robson Araújo registra o aceite, [DF39](../requisitos/decisoes-fbr.md#df39)) e a equipe | Ata ou mensagem da FBr; `/demonstrada` e `/aceite` na issue; cada correção numa issue própria (D6.2) |
| **10. Teste de usabilidade com usuários** | — | Se pessoas sem treinamento fazem as tarefas principais ([RNF22](../requisitos/nao-funcionais.md#rnf22) e [RNF30](../requisitos/nao-funcionais.md#rnf30)) | Supervisores e estagiários, aplicados pela FBr | Planilha de tarefas e observações, registrada em [Reuniões](../historico/unidade-3/reunioes.md) e com `/rnf` na issue |
| **11. Revisão externa** (verificação cruzada e issues do professor) | Problemas de qualidade apontados por quem não escreveu os requisitos | — | Equipe revisora e professor; Líder de Requisitos responde | [Análise do Feedback](../requisitos/analise-feedback.md), com a decisão sobre cada apontamento |
| **12. Fechamento do ciclo** | Estado de cada feature na issue e no catálogo; previsto e realizado | Pendências de validação que ficam para o ciclo seguinte | Equipe | [Fechamento dos ciclos](../visao-geral/cronograma.md#fechamento-dos-ciclos) e [pendências de validação](../requisitos/analise-feedback.md#pendencias-de-validacao-com-a-fbr) |

## Nível de rigor { #nivel-de-rigor }

O rigor da V&V é proporcional ao risco do requisito. Um erro com dado de saúde, com o sigilo do prontuário ou com o acesso de quem usa leitor de tela tem consequência maior para a clínica e para o paciente (LGPD, Código de Ética do Psicólogo e normas do CRP) do que um erro de texto. O nível é decidido na avaliação do DoR, pelos RNFs que restringem a feature.

| Nível | Quando se aplica | O que é exigido |
| --- | --- | --- |
| **Alto** | Features com dados de saúde, prontuário, evolução, sigilo ou controle de acesso (CP6, CP7 e CP12) e os RNFs de segurança, auditoria, acessibilidade e usabilidade: RNF10, RNF22, RNF24, RNF25, RNF51, RNF52 e RNF56 | Tudo do nível padrão, e cada RNF desses só conta como verificado com **duas fontes de evidência diferentes**: teste automatizado da API ou e2e **e** um registro de inspeção, do leitor de tela de verdade ou do teste com pessoas. O robô de acompanhamento exige essas duas fontes no D4.5. As regras críticas também ficam no banco (gravação só por inserção e permissões do usuário da aplicação), e as respostas negadas são testadas |
| **Padrão** | As demais features do MVP | DoR com todos os critérios [B]; inspeção de design com confirmação independente (D1.8); um teste por critério de aceitação, citando o RF e os RNFs no nome; e2e com verificação automática de acessibilidade e as larguras de 320 a 1920 px; revisão da PR por outro integrante; demonstração e aceite da FBr |
| **Básico** | Mudança só de documentação que não altera regra de negócio, e mudança de CI | Build estrito do site, conferência do catálogo, CI verde e revisão da PR por outro integrante. Se a mudança alterar uma regra, ela passa a seguir o nível da feature afetada |

Os requisitos fora do MVP passam pelos momentos 1, 2, 3 e 11: a redação é verificada e a prioridade é validada com a FBr. O DoR e os momentos seguintes só se aplicam quando eles entram num ciclo.

## Onde ficam as evidências { #evidencias }

Toda evidência fica num lugar público do projeto, ligada ao requisito ou à feature. Uma verificação sem evidência registrada não conta como feita.

| Evidência | Onde fica | Ligação com o requisito |
| --- | --- | --- |
| Avaliação do DoR, inspeção de design, `/de-acordo`, `/rnf`, `/demonstrada` e `/aceite` | Comentários na issue da feature | A issue é o campo "issue" do catálogo e aparece no título do RF |
| Revisão do código e da documentação | Pull request aprovada | A PR cita a issue da feature (conferido no CI) |
| Resultados dos testes e verificação dos RNFs | Execuções do CI e tabela de RNFs do robô na issue | O nome de cada teste cita o RF e o RNF |
| Decisões e respostas da FBr | [Registro de Decisões](../requisitos/decisoes-fbr.md) e [Reuniões](../historico/unidade-3/reunioes.md) | A DF é a "Origem" de cada requisito no catálogo |
| Apontamentos externos | [Análise do Feedback](../requisitos/analise-feedback.md) e issues do professor | Cada apontamento cita o requisito |
| Situação de cada feature no ciclo | [Fechamento dos ciclos](../visao-geral/cronograma.md#fechamento-dos-ciclos) e o "Estado da feature" da issue | O estado é o marco do FDD alcançado |

## Limites conhecidos { #limites-conhecidos }

- **Pacientes e responsáveis:** não houve validação direta com esse público. O contato com os pacientes passa pela clínica, por causa do sigilo e da LGPD. A área pública (inscrição, consulta da fila e confirmação de presença) foi validada com a coordenação e verificada pelos RNFs de usabilidade e acessibilidade. A pergunta está nas [pendências de validação](../requisitos/analise-feedback.md#pendencias-de-validacao-com-a-fbr).
- **Demonstrações a distância:** a demonstração do Ciclo 4 foi enviada por e-mail, com o link dos protótipos, e a FBr respondeu no grupo. O registro está em [Reuniões](../historico/unidade-3/reunioes.md#respostas-da-fbr-sobre-a-demonstracao-do-ciclo-4). A demonstração ao vivo, no ambiente de validação, continua sendo a forma preferida.
- **Teste de usabilidade:** é aplicado pela própria FBr, com supervisores e estagiários. A equipe recebe as tarefas e as observações, mas não acompanha a sessão.
