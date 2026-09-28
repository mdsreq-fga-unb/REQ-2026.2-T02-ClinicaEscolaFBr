# 10. Backlog de Produto

## 10.2 Priorização e Recorte do MVP

### 10.2.1 Avaliação do Esforço Técnico

#### 10.2.1.1 Escalas adotadas

Foram mantidas as três escalas propostas pela disciplina, todas orientadas no mesmo sentido (quanto maior a pontuação, maior o custo ou o risco).

**Esforço necessário para implementação**

| Pontuação | Interpretação | Descrição |
| --- | --- | --- |
| 1 | Esforço baixo | até 2 horas |
| 2 | Esforço moderado | entre 2 e 6 horas |
| 3 | Esforço alto | entre 6 e 12 horas |
| 4 | Esforço muito alto | mais de 12 horas |

O esforço considera o desenvolvimento completo do requisito — persistência, regra de negócio, serviço de aplicação, interface e testes —, conforme o fluxo de construção por feature adotado pela equipe.

**Complexidade técnica**

| Pontuação | Interpretação |
| --- | --- |
| 1 | Utiliza solução conhecida, com poucas dependências |
| 2 | Exige alguma investigação ou integração |
| 3 | Possui várias dependências ou incertezas técnicas |
| 4 | Apresenta elevada incerteza, integração crítica ou tecnologia não dominada |

**Lacuna de capacidade da equipe**

| Pontuação | Interpretação |
| --- | --- |
| 1 | A equipe domina plenamente os conhecimentos necessários |
| 2 | A equipe possui conhecimento suficiente, com pouca aprendizagem adicional |
| 3 | A equipe precisa desenvolver conhecimentos relevantes |
| 4 | A equipe ainda não possui os conhecimentos ou recursos necessários |

#### 10.2.1.2 Regra de consolidação

O esforço técnico consolidado de cada requisito é a média aritmética simples dos três critérios:

```
Esforço técnico = (esforço + complexidade + lacuna de capacidade) / 3
```

Regras definidas previamente e aplicadas de forma uniforme a todos os requisitos:

1. O resultado é apresentado com **uma casa decimal**, com arredondamento matemático padrão (2,666… → 2,7).
2. **Nenhum critério recebe peso maior que os outros.** A equipe considerou ponderar a lacuna de capacidade, mas optou pela média simples para manter a regra previsível e auditável ao longo de todas as CPs.
3. O valor decimal é o valor de referência. Quando for necessário convertê-lo para a escala de 1 a 4 (por exemplo, para posicionar o requisito na matriz 4 × 4), aplica-se o arredondamento para o inteiro mais próximo, com 0,5 arredondado para cima.
4. A avaliação considerou a **descrição completa** de cada requisito, seus critérios de aceitação, suas dependências declaradas e as restrições transversais indicadas na rastreabilidade — não apenas o nome do requisito.

#### 10.2.1.3 Tabela consolidada

| Código | Requisito | CP | Valor de negócio | Justificativa do cliente | Esforço | Complexidade | Lacuna de capacidade | Esforço técnico consolidado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RF1 | Registrar solicitação de atendimento on-line | CP1 | 4 | Ponto de entrada de todo o fluxo; sem isso nada começa | 4 | 2 | 2 | **2,7** |
| RF2 | Emitir comprovante de inscrição | CP1 | 3 | Importante pro paciente, mas dá pra suprir manualmente no início | 2 | 1 | 1 | **1,3** |
| RF3 | Registrar inscrição assistida | CP1 | 3 | Atende exclusão digital, mas pode ter canal alternativo manual por ora | 2 | 2 | 2 | **2,0** |
| RF4 | Organizar informações da inscrição para triagem | CP2 | 4 | Base para a supervisão fazer a triagem | 2 | 2 | 2 | **2,0** |
| RF5 | Sinalizar pontos de atenção da inscrição | CP2 | 3 | Ajuda a triagem, mas dá pra ler as informações manualmente | 4 | 4 | 3 | **3,7** |
| RF6 | Registrar prioridade clínica do inscrito | CP2 | 4 | Alimenta a ordenação da fila (CP3); sem isso a fila não tem critério | 3 | 3 | 2 | **2,7** |
| RF7 | Ordenar inscritos na fila de espera | CP3 | 4 | Núcleo de como o paciente entra no atendimento | 3 | 3 | 2 | **2,7** |
| RF8 | Consultar posição individual na fila | CP3 | 4 | Melhora a experiência, mas a fila funciona sem essa consulta | 2 | 3 | 2 | **2,3** |
| RF9 | Manter e informar condições gerais da fila | CP3 | 2 | Informação geral, não bloqueia a operação | 3 | 2 | 2 | **2,3** |
| RF10 | Agendar sessão do paciente | CP4 | 3 | Núcleo do agendamento | 4 | 3 | 2 | **3,0** |
| RF11 | Consultar agenda de sessões do estagiário | CP4 | 4 | Estagiário precisa disso pra atuar no dia a dia | 2 | 2 | 1 | **1,7** |
| RF12 | Reagendar sessão do paciente | CP4 | 4 | Importante, mas pode ser tratado manualmente no início | 4 | 4 | 2 | **3,3** |
| RF13 | Enviar lembrete de sessão agendada | CP4 | 3 | Reduz falta, mas não é essencial pra operação existir | 4 | 4 | 4 | **4,0** |
| RF14 | Confirmar presença em sessão agendada | CP4 | 4 | Alimenta assiduidade (CP9), mas dá pra registrar manualmente | 3 | 3 | 3 | **3,0** |
| RF15 | Registrar cancelamento de sessão pelo paciente | CP4 | 3 | Libera vaga, mas dá pra anotar manualmente no início | 3 | 3 | 2 | **2,7** |
| RF16 | Registrar cancelamento de sessão pelo estagiário | CP4 | 3 | Mesma lógica do RF15 | 2 | 2 | 1 | **1,7** |
| RF17 | Notificar paciente sobre ausência do estagiário | CP4 | 3 | Comunicação útil, não bloqueia o fluxo | 2 | 2 | 2 | **2,0** |
| RF18 | Listar casos aguardando distribuição | CP5 | 4 | Visibilidade operacional essencial | 2 | 2 | 1 | **1,7** |
| RF19 | Registrar áreas de especialidade do supervisor | CP5 | 4 | Necessário pra lógica de distribuição funcionar | 2 | 1 | 1 | **1,3** |
| RF20 | Distribuir caso a supervisor conforme área de especialidade | CP5 | 4 | Lógica central de distribuição | 3 | 3 | 2 | **2,7** |
| RF21 | Vincular paciente a estagiário responsável | CP5 | 4 | Base pra tudo que depende de responsável (prontuário, evolução) | 3 | 3 | 2 | **2,7** |
| RF22 | Consultar responsáveis pelo caso | CP5 | 2 | Consulta útil, mas inferível de outras telas no início | 1 | 1 | 1 | **1,0** |
| RF23 | Consultar casos sob responsabilidade do estagiário ou supervisor | CP5 | 4 | Necessário pro trabalho diário de estagiários/supervisores | 2 | 2 | 1 | **1,7** |
| RF24 | Visualizar distribuição de casos por supervisor | CP5 | 2 | Visão gerencial, não bloqueia a operação | 2 | 1 | 1 | **1,3** |
| RF25 | Transferir caso para outro estagiário ou supervisor | CP5 | 3 | Importante, mas pode ser feito manualmente no início | 4 | 4 | 3 | **3,7** |
| RF26 | Consultar histórico de responsáveis do caso | CP5 | 1 | Auditoria/histórico, valioso mas não bloqueia | 2 | 3 | 2 | **2,3** |
| RF27 | Consultar prontuário do paciente | CP6 | 4 | Razão de existir do sistema | 4 | 4 | 3 | **3,7** |
| RF28 | Registrar evolução da sessão realizada | CP7 | 4 | Registro clínico central | 3 | 2 | 2 | **2,3** |
| RF29 | Corrigir evolução registrada | CP7 | 3 | Importante pra qualidade do dado, mas não bloqueia o uso inicial | 3 | 3 | 2 | **2,7** |
| RF30 | Registrar complemento de evolução da sessão | CP7 | 3 | Novo (resposta da FBr); complementa o registro principal, não o substitui | 2 | 2 | 2 | **2,0** |
| RF31 | Consultar evolução de uma sessão específica | CP7 | 4 | Necessário pra continuidade do acompanhamento | 3 | 2 | 2 | **2,3** |
| RF32 | Consultar histórico de evolução do paciente | CP7 | 4 | Necessário pra supervisão e continuidade | 3 | 3 | 2 | **2,7** |
| RF33 | Gerar relatório final de evolução | CP8 | 4 | Entregável importante, mas pode ser compilado manualmente no início | 4 | 4 | 3 | **3,7** |
| RF34 | Registrar falta do paciente na sessão | CP9 | 4 | Dado base para toda a política de faltas | 2 | 2 | 1 | **1,7** |
| RF35 | Contabilizar faltas do paciente no ciclo | CP9 | 4 | Necessário para disparar a política de duas faltas | 2 | 2 | 2 | **2,0** |
| RF36 | Emitir alerta de limite de faltas atingido | CP9 | 4 | Comportamento central da política de assiduidade do paciente | 2 | 2 | 1 | **1,7** |
| RF37 | Desligar paciente por faltas e liberar vaga | CP9 | 4 | Fecha o ciclo da política e libera a vaga para reaproveitamento | 4 | 4 | 3 | **3,7** |
| RF38 | Reverter desligamento de paciente por faltas | CP9 | 4 | Regra de exceção confirmada pela FBr; exige preservar histórico e tratar vaga já realocada | 4 | 4 | 3 | **3,7** |
| RF39 | Consolidar faltas do estagiário para a supervisão | CP9 | 3 | Consulta de apoio à supervisão; não bloqueia o fluxo clínico principal | 2 | 2 | 1 | **1,7** |
| RF40 | Contabilizar faltas do estagiário no semestre | CP9 | 4 | Base para a regra institucional de reprovação por três faltas | 2 | 2 | 2 | **2,0** |
| RF63 | Sinalizar reprovação do estagiário por faltas | CP9 | 4 | Novo requisito derivado da regra confirmada de três faltas; valor de negócio alinhado ao RF40 conforme orientação da equipe | 3 | 2 | 2 | **2,3** |
| RF64 | Registrar decisão institucional sobre a reprovação do estagiário | CP9 | 4 | Completa o fluxo da reprovação do estagiário; valor de negócio alinhado ao RF40 conforme orientação da equipe | 3 | 2 | 2 | **2,3** |
| RF41 | Registrar pagamento da contribuição social | CP10 | 4 | Controle administrativo necessário para a regra institucional da contribuição | 3 | 2 | 2 | **2,3** |
| RF42 | Consultar situação da contribuição social | CP10 | 4 | Dá visibilidade da situação da contribuição aos perfis autorizados | 3 | 2 | 2 | **2,3** |
| RF43 | Bloquear agendamento por contribuição social pendente | CP10 | 4 | Regra de negócio dependente do registro e consulta da contribuição; exige integração com agendamento | 3 | 3 | 2 | **2,7** |
| RF44 | Listar sessões com comparecimento registrado do paciente | CP10 | 3 | Apoia a emissão da declaração de comparecimento | 2 | 2 | 2 | **2,0** |
| RF45 | Emitir declaração de comparecimento do paciente | CP10 | 4 | Entregável externo recorrente e concreto para o paciente | 4 | 3 | 2 | **3,0** |
| RF46 | Reemitir declaração de comparecimento | CP10 | 3 | Suporte útil, mas não é a necessidade principal de emissão | 2 | 2 | 1 | **1,7** |
| RF47 | Validar autenticidade da declaração | CP10 | 2 | Controle antifraude útil, mas não bloqueia o lançamento inicial | 3 | 3 | 2 | **2,7** |
| RF48 | Consultar indicadores operacionais | CP11 | 3 | Valioso para gestão, mas não bloqueia a operação clínica diária | 4 | 4 | 3 | **3,7** |
| RF49 | Exportar relatório institucional em PDF | CP11 | 1 | Conveniência institucional de menor prioridade para a primeira versão | 3 | 2 | 2 | **2,3** |
| RF50 | Autenticar usuário institucional | CP12 | 4 | Base de segurança para todas as funcionalidades internas | 3 | 2 | 2 | **2,3** |
| RF51 | Encerrar sessão do usuário | CP12 | 4 | Controle básico de segurança e sessão | 1 | 1 | 1 | **1,0** |
| RF52 | Verificar identidade do paciente ou responsável | CP12 | 4 | Necessário para acesso seguro a informações pessoais sem login institucional | 4 | 4 | 3 | **3,7** |
| RF53 | Cadastrar usuário institucional | CP12 | 4 | Necessário para provisionar contas e perfis institucionais | 4 | 3 | 3 | **3,3** |
| RF54 | Desativar usuário institucional | CP12 | 4 | Necessário para revogar acesso de usuários que deixam a clínica/estágio | 2 | 2 | 2 | **2,0** |
| RF55 | Restringir acesso ao prontuário | CP12 | 4 | Obrigação de sigilo e proteção de dados de saúde | 4 | 4 | 3 | **3,7** |
| RF56 | Consultar registro de acessos ao prontuário | CP12 | 4 | Trilha de auditoria importante para segurança e conformidade | 3 | 3 | 2 | **2,7** |
| RF57 | Registrar consentimento para tratamento de dados | CP12 | 4 | Base de privacidade/compliance para tratamento de dados no cenário adotado pelo projeto | 3 | 3 | 3 | **3,0** |
| RF65 | Registrar revogação do consentimento | CP12 | 4 | Complementa o fluxo de consentimento e privacidade; valor de negócio alinhado ao RF57 conforme orientação da equipe | 4 | 4 | 3 | **3,7** |
| RF58 | Listar casos elegíveis para continuidade entre semestres | CP13 | 3 | Apoia a virada de semestre; depende de critérios e calendário institucional | 3 | 3 | 2 | **2,7** |
| RF59 | Registrar decisão de continuidade do caso | CP13 | 3 | Registra decisão institucional e suas versões; depende do fluxo de continuidade | 4 | 4 | 3 | **3,7** |
| RF60 | Vincular caso a novo estagiário na continuidade | CP13 | 3 | Efetiva a continuidade com preservação de histórico e troca de responsável | 3 | 3 | 2 | **2,7** |
| RF61 | Ativar modo de alto contraste | CP14 | 2 | Recurso específico de acessibilidade; a acessibilidade geral já é obrigatória pelo RNF56 | 2 | 2 | 2 | **2,0** |
| RF62 | Ajustar tamanho do texto | CP14 | 2 | Recurso específico de acessibilidade complementar ao RNF56 | 3 | 3 | 2 | **2,7** |

#### 10.2.1.4 Classificação preliminar dos Requisitos Não Funcionais

A classificação abaixo é **preliminar** e foi produzida para permitir a continuidade da priorização antes da consolidação final da matriz 4 × 4. Como cenário de referência, foram considerados o núcleo provável do MVP, as dependências necessárias para completar esses fluxos e os RNFs mínimos de segurança, privacidade, acessibilidade, integridade e operação.

| Código | Requisito não funcional | Classificação | RF/escopo relacionado | Justificativa |
| --- | --- | --- | --- | --- |
| RNF1 | Identificação e recuperação de erros no formulário | Associado a RF do MVP | RF1 | Aplica-se diretamente à inscrição on-line e evita perda dos dados válidos durante correções. |
| RNF2 | Proteção das informações no comprovante de inscrição | Não aplicável ao MVP | RF2 | Depende do comprovante de inscrição; reavaliar caso RF2 seja selecionado no recorte final. |
| RNF3 | Sigilo das informações de triagem | Obrigatório para o MVP | CP2 | Protege dados sensíveis de triagem e é condição mínima de privacidade. |
| RNF4 | Rastreabilidade das regras de sinalização | Não aplicável ao MVP | RF5 | Depende da sinalização automática de pontos de atenção; reavaliar se RF5 entrar no MVP. |
| RNF5 | Integridade e auditoria das decisões de prioridade | Obrigatório para o MVP | RF6 | A prioridade clínica afeta a fila e precisa preservar autoria, histórico e integridade. |
| RNF6 | Privacidade e controle de acesso à consulta da fila | Obrigatório para o MVP | RF8, RF52 | A consulta individual envolve dado pessoal e exige verificação de identidade. |
| RNF7 | Compreensibilidade das informações sobre a posição na fila | Associado a RF do MVP | RF8 | Acompanha a consulta de posição e evita interpretação da posição como garantia de prazo. |
| RNF8 | Confiabilidade das informações institucionais da fila | Não aplicável ao MVP | RF9 | Relaciona-se às informações gerais da fila; reavaliar caso RF9 seja selecionado. |
| RNF9 | Integridade do agendamento | Obrigatório para o MVP | CP4 | Evita conflitos de agenda e estados incompatíveis; condição operacional mínima. |
| RNF10 | Auditoria das operações sobre a sessão | Associado a RF do MVP | RF10, RF12, RF14, RF15, RF16 | Acompanha operações de sessão e preserva rastreabilidade das alterações. |
| RNF11 | Confiabilidade do envio de lembretes | Evolutivo | RF13 | A meta de confiabilidade do envio pode ser refinada após o fluxo básico de agendamento. |
| RNF12 | Tempo de resposta nas operações de agendamento | Evolutivo | CP4 | Meta quantitativa de desempenho que pode ser calibrada com testes de carga. |
| RNF13 | Minimização de dados na agenda | Obrigatório para o MVP | RF11 | Reduz exposição de dados e atende ao princípio de minimização. |
| RNF14 | Disponibilidade do módulo de agendamento | Evolutivo | CP4 | Meta formal de disponibilidade depende de infraestrutura e monitoramento. |
| RNF15 | Usabilidade da confirmação de presença pelo paciente | Associado a RF do MVP | RF14 | Acompanha a confirmação de presença e a proteção do fluxo público. |
| RNF16 | Autorização para distribuição, vínculo e transferência de casos | Obrigatório para o MVP | RF20, RF21, RF25 | Alterações de responsabilidade clínica exigem autorização por perfil. |
| RNF17 | Privacidade dos dados nas telas de distribuição e consulta | Obrigatório para o MVP | CP5 | As telas de distribuição não devem expor dados além do necessário. |
| RNF18 | Auditoria de atribuições, vínculos e transferências | Associado a RF do MVP | RF20, RF21, RF25 | Acompanha alterações de responsáveis e preserva rastreabilidade. |
| RNF19 | Integridade dos vínculos de responsabilidade | Obrigatório para o MVP | RF20, RF21 | Impede vínculos incompatíveis e preserva consistência de responsabilidade. |
| RNF20 | Continuidade do histórico na troca de responsável | Não aplicável ao MVP | RF25 | Depende da transferência de caso; reavaliar se RF25 for selecionado. |
| RNF21 | Desempenho das listagens e operações de vínculo | Evolutivo | CP5 | Meta de desempenho a refinar com massa de dados representativa. |
| RNF22 | Usabilidade da distribuição e do vínculo de casos | Evolutivo | RF20, RF21 | Meta específica de usabilidade que pode ser refinada após validação do fluxo. |
| RNF23 | Manutenibilidade das áreas de especialidade | Evolutivo | RF19 | Propriedade de modificabilidade importante, mas não impede a operação mínima. |
| RNF24 | Acessibilidade das telas de distribuição e consulta | Obrigatório para o MVP | CP5 | Acessibilidade mínima das interfaces internas deve existir desde a primeira versão utilizável. |
| RNF25 | Sigilo do conteúdo do prontuário | Obrigatório para o MVP | RF27, RF55 | O prontuário contém dados de saúde e exige proteção desde qualquer versão utilizável. |
| RNF26 | Sigilo do conteúdo da evolução | Obrigatório para o MVP | RF28, RF55 | As evoluções contêm dados clínicos sensíveis e exigem sigilo. |
| RNF27 | Integridade e proveniência dos registros de evolução | Obrigatório para o MVP | RF28, RF31, RF32 | Registros clínicos precisam preservar autor, sessão, paciente e histórico. |
| RNF28 | Auditoria das correções de evolução | Não aplicável ao MVP | RF29 | Depende da funcionalidade específica de correção; reavaliar se RF29 entrar no MVP. |
| RNF29 | Desempenho do registro e da consulta de evolução | Evolutivo | CP7 | Meta quantitativa de desempenho a aferir após implementação do fluxo funcional. |
| RNF30 | Usabilidade do registro de evolução | Evolutivo | RF28 | Meta de tempo/interações que pode ser refinada com testes de estagiários. |
| RNF31 | Fidelidade e rastreabilidade do relatório final | Associado a RF do MVP | RF33 | Acompanha o relatório final e garante correspondência com as evoluções e versões. |
| RNF32 | Integridade e auditoria da contagem de faltas | Obrigatório para o MVP | RF34–RF38 | A política de faltas pode gerar desligamento; contagem e decisões precisam ser íntegras e auditáveis. |
| RNF33 | Visibilidade do alerta de limite de faltas | Associado a RF do MVP | RF36 | Acompanha o alerta e garante percepção também sem dependência exclusiva de cor. |
| RNF34 | Tempo de liberação da vaga após desligamento | Associado a RF do MVP | RF37 | Acompanha a liberação de vaga e evita ociosidade indevida. |
| RNF35 | Privacidade dos dados de faltas do estagiário | Obrigatório para o MVP | RF39, RF40, RF63, RF64 | Abrange consulta, contagem, sinalização e decisão sobre faltas do estagiário. |
| RNF36 | Auditoria dos registros de contribuição social | Associado a RF do MVP | RF41 | Acompanha registro/correção da contribuição e alteração do parâmetro de valor. |
| RNF37 | Privacidade dos dados na declaração | Associado a RF do MVP | RF45 | Evita inclusão de dados clínicos desnecessários no documento. |
| RNF38 | Autorização para emissão e consulta | Obrigatório para o MVP | RF45, RF50, RF52 | Emissão/consulta envolvem dados pessoais e exigem perfis e identidade verificada. |
| RNF39 | Auditoria de emissões e reemissões | Associado a RF do MVP | RF45, RF46 | Acompanha emissão e reemissão, registrando autoria e operação. |
| RNF40 | Tempo de geração da declaração | Evolutivo | RF45 | Meta de desempenho que pode ser calibrada após o fluxo de emissão. |
| RNF41 | Usabilidade da emissão | Evolutivo | RF45 | Meta de interações/taxa de sucesso a aperfeiçoar em testes posteriores. |
| RNF42 | Portabilidade do documento | Associado a RF do MVP | RF45 | Acompanha a emissão e garante PDF A4 legível para uso externo. |
| RNF43 | Acessibilidade da tela de emissão | Obrigatório para o MVP | RF44, RF45 | A interface de emissão deve atender requisitos mínimos de acessibilidade. |
| RNF44 | Integridade do conteúdo da declaração | Associado a RF do MVP | RF45, RF46 | Garante coerência entre documento emitido/reemitido e registro de origem. |
| RNF45 | Segurança da consulta pública de autenticidade | Não aplicável ao MVP | RF47 | É exclusiva da validação pública de autenticidade, de menor prioridade no cenário provisório. |
| RNF46 | Atualização dos indicadores operacionais | Não aplicável ao MVP | RF48 | Depende da consulta de indicadores; reavaliar se RF48 entrar no MVP. |
| RNF47 | Tempo de geração do relatório institucional | Não aplicável ao MVP | RF48, RF49 | Aplica-se a indicadores/exportação institucional, tratados como posterior no cenário provisório. |
| RNF48 | Auditoria de relatórios institucionais | Não aplicável ao MVP | RF49 | É exclusiva da exportação do relatório institucional. |
| RNF49 | Proteção das credenciais de acesso | Obrigatório para o MVP | RF50, RF53 | Senha, hash e bloqueio contra tentativas são controles mínimos de autenticação. |
| RNF50 | Expiração da sessão por inatividade | Obrigatório para o MVP | RF50, RF51 | Reduz exposição de dados em computadores compartilhados. |
| RNF51 | Criptografia dos dados | Obrigatório para o MVP | Transversal | Protege dados sensíveis em trânsito e em repouso; condição de segurança e privacidade. |
| RNF52 | Trilha de auditoria de acessos ao prontuário | Obrigatório para o MVP | RF55, RF56 | Acesso ao prontuário exige rastreabilidade de acessos permitidos e negados. |
| RNF53 | Cópia de segurança e recuperação dos dados | Obrigatório para o MVP | Transversal | Requisito mínimo de continuidade operacional e preservação dos registros. |
| RNF54 | Auditoria das decisões de continuidade | Não aplicável ao MVP | RF59 | Depende do fluxo de continuidade entre semestres; reavaliar se RF59 entrar no MVP. |
| RNF55 | Integridade do histórico na continuidade | Não aplicável ao MVP | RF60 | Aplica-se à continuidade/transferência entre semestres; reavaliar se RF60 entrar no MVP. |
| RNF56 | Conformidade com WCAG 2.2 nível AA | Obrigatório para o MVP | CP14 / páginas externas | Acessibilidade foi confirmada como mandatória pela FBr/MEC e deve existir desde o MVP. |
| RNF57 | Aparência reforçada do indicador de foco | Evolutivo | RF61, RF62 / páginas externas | Exigência adicional de nível AAA; importante para baixa visão, mas vai além do mínimo AA obrigatório. |
| RNF58 | Responsividade da interface | Obrigatório para o MVP | Páginas externas | A solução é web responsiva e precisa funcionar entre 320 e 1920 px sem perda funcional. |


### 10.2.2 Matriz de Priorização (Valor de Negócio × Esforço Técnico)

A matriz cruza o valor de negócio de cada RF (1 a 4, resposta da Clínica Escola FBr à planilha de avaliação) com o esforço técnico consolidado, convertido para a escala inteira de 1 a 4 pela regra 3 da seção [10.2.1.2](#1021-avaliacao-do-esforco-tecnico) (arredondamento para o inteiro mais próximo, com 0,5 para cima). Os 65 RFs atualmente declarados (RF1 a RF65) estão distribuídos nas 16 células abaixo.

| Valor de negócio (linhas) / Esforço técnico (colunas) | 1 — baixo | 2 — moderado | 3 — alto | 4 — muito alto |
| --- | --- | --- | --- | --- |
| **4** | **RF19**, **RF51** | **RF4**, **RF8**, **RF11**, **RF18**, **RF23**, **RF28**, **RF31**, **RF34**, **RF35**, **RF36**, **RF40**, **RF63**, **RF64**, **RF41**, **RF42**, **RF50**, **RF54** | **RF1**, **RF6**, **RF7**, **RF12**, **RF14**, **RF20**, **RF21**, **RF32**, **RF43**, **RF45**, **RF53**, **RF56**, **RF57** | **RF27**, **RF33**, **RF37**, **RF38**, **RF52**, **RF55**, **RF65** |
| **3** | **RF2** | **RF3**, **RF16**, **RF17**, **RF30**, **RF39**, **RF44**, **RF46** | RF10, RF15, RF29, RF58, RF60 | RF5, RF13, RF25, RF48, RF59 |
| **2** | **RF22**, **RF24** | RF9, RF61 | RF47, RF62 | — |
| **1** | — | RF26, RF49 | — | — |

Os códigos em **negrito** compõem o recorte de MVP proposto na seção 10.2.3; os demais ficam para uma versão posterior. O critério de corte, célula a célula, está detalhado a seguir.

### 10.2.3 Definição do MVP

O corte de MVP foi definido a partir da própria escala de valor de negócio usada na avaliação com a Clínica Escola FBr, que segue o MoSCoW (4 — *Must have*, indispensável; 3 — *Should have*, o sistema opera um tempo sem isso; 2 — *Could have*, agrega valor mas pode esperar; 1 — *Won't have now*, não é prioridade para esta versão). O esforço técnico entra como critério de desempate dentro de cada faixa de valor, para não inflar o MVP com itens caros que o próprio valor de negócio já qualifica como adiáveis:

1. **Valor 4 (Must have):** entra no MVP independentemente do esforço técnico. Por definição, o sistema não funciona sem esses requisitos.
2. **Valor 1 (Won't have now):** fica fora do MVP independentemente do esforço técnico, porque o próprio cliente já definiu que não é prioridade para esta versão.
3. **Valor 3 (Should have):** entra no MVP somente com esforço técnico baixo ou moderado (1 ou 2). Com esforço alto ou muito alto (3 ou 4), fica para depois — o sistema consegue operar um tempo sem esses requisitos, e não vale o risco de entregar algo caro que não é indispensável.
4. **Valor 2 (Could have):** entra no MVP somente com esforço técnico muito baixo (1), quando o custo de entregar já é praticamente o de não entregar. Com esforço 2 ou mais, fica para depois.

Aplicando o critério aos 65 RFs (RF1 a RF65): **49 entram no MVP** e **16 ficam para uma versão posterior** — 39 por serem *Must have*, 8 *Should have* de baixo esforço e 2 *Could have* de esforço mínimo; dos 16 de fora, 10 são *Should have* de esforço alto, 4 são *Could have* de esforço moderado/alto e 2 são *Won't have now*.

A tabela abaixo aplica o critério requisito a requisito, mantendo a rastreabilidade entre CP, valor de negócio, esforço técnico e a decisão:

| Código | CP | Valor de negócio | Esforço técnico (1-4) | No MVP? | Motivo |
| --- | --- | --- | --- | --- | --- |
| RF1 | CP1 | 4 | 3 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF2 | CP1 | 3 | 1 | Sim | Should have com esforço baixo/moderado — vale entregar já. |
| RF3 | CP1 | 3 | 2 | Sim | Should have com esforço baixo/moderado — vale entregar já. |
| RF4 | CP2 | 4 | 2 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF5 | CP2 | 3 | 4 | Não | Should have com esforço alto — o sistema opera um tempo sem isso; adiado para reduzir risco do MVP. |
| RF6 | CP2 | 4 | 3 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF7 | CP3 | 4 | 3 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF8 | CP3 | 4 | 2 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF9 | CP3 | 2 | 2 | Não | Could have com esforço moderado/alto — pode esperar, conforme a própria definição do cliente. |
| RF10 | CP4 | 3 | 3 | Não | Should have com esforço alto — o sistema opera um tempo sem isso; adiado para reduzir risco do MVP. |
| RF11 | CP4 | 4 | 2 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF12 | CP4 | 4 | 3 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF13 | CP4 | 3 | 4 | Não | Should have com esforço alto — o sistema opera um tempo sem isso; adiado para reduzir risco do MVP. |
| RF14 | CP4 | 4 | 3 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF15 | CP4 | 3 | 3 | Não | Should have com esforço alto — o sistema opera um tempo sem isso; adiado para reduzir risco do MVP. |
| RF16 | CP4 | 3 | 2 | Sim | Should have com esforço baixo/moderado — vale entregar já. |
| RF17 | CP4 | 3 | 2 | Sim | Should have com esforço baixo/moderado — vale entregar já. |
| RF18 | CP5 | 4 | 2 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF19 | CP5 | 4 | 1 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF20 | CP5 | 4 | 3 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF21 | CP5 | 4 | 3 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF22 | CP5 | 2 | 1 | Sim | Could have com esforço muito baixo — praticamente gratuito, entra. |
| RF23 | CP5 | 4 | 2 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF24 | CP5 | 2 | 1 | Sim | Could have com esforço muito baixo — praticamente gratuito, entra. |
| RF25 | CP5 | 3 | 4 | Não | Should have com esforço alto — o sistema opera um tempo sem isso; adiado para reduzir risco do MVP. |
| RF26 | CP5 | 1 | 2 | Não | Won't have now — o próprio cliente definiu que não é prioridade para esta versão. |
| RF27 | CP6 | 4 | 4 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF28 | CP7 | 4 | 2 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF29 | CP7 | 3 | 3 | Não | Should have com esforço alto — o sistema opera um tempo sem isso; adiado para reduzir risco do MVP. |
| RF30 | CP7 | 3 | 2 | Sim | Should have com esforço baixo/moderado — vale entregar já. |
| RF31 | CP7 | 4 | 2 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF32 | CP7 | 4 | 3 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF33 | CP8 | 4 | 4 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF34 | CP9 | 4 | 2 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF35 | CP9 | 4 | 2 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF36 | CP9 | 4 | 2 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF37 | CP9 | 4 | 4 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF38 | CP9 | 4 | 4 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF39 | CP9 | 3 | 2 | Sim | Should have com esforço baixo/moderado — vale entregar já. |
| RF40 | CP9 | 4 | 2 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF63 | CP9 | 4 | 2 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF64 | CP9 | 4 | 2 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF41 | CP10 | 4 | 2 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF42 | CP10 | 4 | 2 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF43 | CP10 | 4 | 3 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF44 | CP10 | 3 | 2 | Sim | Should have com esforço baixo/moderado — vale entregar já. |
| RF45 | CP10 | 4 | 3 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF46 | CP10 | 3 | 2 | Sim | Should have com esforço baixo/moderado — vale entregar já. |
| RF47 | CP10 | 2 | 3 | Não | Could have com esforço moderado/alto — pode esperar, conforme a própria definição do cliente. |
| RF48 | CP11 | 3 | 4 | Não | Should have com esforço alto — o sistema opera um tempo sem isso; adiado para reduzir risco do MVP. |
| RF49 | CP11 | 1 | 2 | Não | Won't have now — o próprio cliente definiu que não é prioridade para esta versão. |
| RF50 | CP12 | 4 | 2 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF51 | CP12 | 4 | 1 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF52 | CP12 | 4 | 4 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF53 | CP12 | 4 | 3 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF54 | CP12 | 4 | 2 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF55 | CP12 | 4 | 4 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF56 | CP12 | 4 | 3 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF57 | CP12 | 4 | 3 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF65 | CP12 | 4 | 4 | Sim | Must have — indispensável; entra independentemente do esforço. |
| RF58 | CP13 | 3 | 3 | Não | Should have com esforço alto — o sistema opera um tempo sem isso; adiado para reduzir risco do MVP. |
| RF59 | CP13 | 3 | 4 | Não | Should have com esforço alto — o sistema opera um tempo sem isso; adiado para reduzir risco do MVP. |
| RF60 | CP13 | 3 | 3 | Não | Should have com esforço alto — o sistema opera um tempo sem isso; adiado para reduzir risco do MVP. |
| RF61 | CP14 | 2 | 2 | Não | Could have com esforço moderado/alto — pode esperar, conforme a própria definição do cliente. |
| RF62 | CP14 | 2 | 3 | Não | Could have com esforço moderado/alto — pode esperar, conforme a própria definição do cliente. |

**Este recorte é uma proposta técnica da equipe**, construída a partir dos dados já validados com a FBr (valor de negócio) e da avaliação interna de esforço; segue para validação em conjunto com a equipe antes de ser considerado definitivo, no mesmo espírito das demais pendências registradas na [seção 8.3](analise-feedback.md#pendencias-de-validacao-com-a-fbr). A classificação preliminar dos RNFs (seção 10.2.1.4) ainda precisa ser revisitada à luz deste recorte final de RFs, como já registrado naquela seção.
