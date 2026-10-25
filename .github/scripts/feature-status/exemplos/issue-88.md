### Feature

Registrar solicitação de atendimento on-line

### Característica de Produto (CP) e conjunto de features

CP1 — Inscrição on-line

### RF(s) declarado(s)

[RF1 — Registrar solicitação de atendimento on-line](https://mdsreq-fga-unb.github.io/REQ-2026.2-T02-ClinicaEscolaFBr/unidade-2/requisitos/funcionais/#rf1)

### RNFs que restringem a feature

RNF1 — Identificação e recuperação de erros no formulário; RNF51 — Criptografia dos dados (queixa e dados pessoais); RNF53 — Cópia de segurança e recuperação dos dados; transversal CP14 — RNF56, RNF57, RNF58 (acessibilidade das páginas de inscrição)

### Rastreabilidade

Feature "Registrar solicitação de atendimento on-line" → CP1 — Inscrição on-line → OE1/OE4

### Depende de

Nenhuma. (RF13 e RF52 são integrações referenciadas no texto do RF1, não bloqueiam a entrada em construção.)

### Ciclo de construção

Ciclo 3 (14/10 a 27/10)

### Líder de Feature e revisor

Líder: Jônatas · Revisor: Luís Henrique

### Projeto da feature (Projetar por Feature)

[Modelo detalhado, diagrama de sequência, rotas, regras e dados de teste](https://mdsreq-fga-unb.github.io/REQ-2026.2-T02-ClinicaEscolaFBr/unidade-3/projeto-features-ciclo-3/#rf1-registrar-solicitacao-de-atendimento-on-line-88) — publicado no site com o merge da base técnica.

### Estado da feature (FDD)

Planejada

### DoR — Estrutura e rastreabilidade

- [x] R1.1 [B] A feature segue o formato <ação> <resultado> <objeto> e está na lista de features, dentro de uma Área e de um Conjunto.
- [x] R1.2 [B] Cada RF tem o cabeçalho "RFn — título" igual ao da feature e a linha de Rastreabilidade Feature → CP → OE.
- [x] R1.3 [B] Dependências, integrações e restrições transversais declaradas, e os requisitos dos quais a feature depende já estão prontos ou em construção.
- [x] R1.4 [B] A feature não está marcada como entrega posterior ou adiada (ou a condição registrada já foi resolvida).
- [x] R1.5 [B] A feature consta no Backlog de Produto e está no escopo do MVP, ou foi decidida explicitamente como fora dele.
- [x] R1.6 [R] A issue da feature está vinculada no título da feature na documentação (#NN).

### DoR — Clareza e completude da descrição

- [x] R2.1 [B] O requisito expressa uma única funcionalidade.
- [x] R2.2 [B] O ator está identificado por perfil, sem termos genéricos como "usuário".
- [x] R2.3 [B] Não há termos vagos ("pode", "quando aplicável", "rapidamente", "a definir") em regras a implementar.
- [x] R2.4 [B] Prazos, limites e valores definidos ou declarados como parâmetro configurável, com valor padrão e perfil que pode alterá-lo.
- [x] R2.5 [B] Dados de entrada e de saída enumerados, incluindo o que cada perfil vê.
- [x] R2.6 [B] Termos de domínio definidos (prioridade clínica ≠ prioridade no backlog).
- [x] R2.7 [B] A descrição não contradiz outro RF, RNF, critério de aceitação, título ou modelo de domínio.
- [x] R2.8 [B] O requisito respeita o que está fora do escopo (atendimento remoto, gestão de semestres letivos, sugestão automática de cor).

### DoR — Critérios de aceitação

- [x] R3.1 [B] Critérios de aceitação em lista de verificação, uma afirmação curta e verificável por comportamento.
- [x] R3.2 [B] Os critérios cobrem o fluxo principal, os fluxos de exceção e as negações de acesso por perfil.
- [x] R3.3 [B] Cada critério tem resultado observável e valores concretos quando há prazo, limite ou contagem.
- [x] R3.4 [B] Nenhuma regra da descrição fica sem critério, e nenhum critério exige algo que a descrição não declara.
- [x] R3.5 [B] Critérios de acesso e sigilo usam os perfis da CP12, sem expor dados clínicos a perfis sem acesso ao prontuário.

### DoR — Dependências e validação com a FBr

- [x] R4.1 [B] Regras de negócio confirmadas pela FBr (ata ou resposta registrada) ou registradas como pendência de validação.
- [x] R4.2 [B] Toda pendência com a FBr está na seção Pendências de validação com a FBr (8.3), com o valor padrão adotado.
- [x] R4.3 [B] Nenhuma decisão em aberto altera o comportamento central da feature.
- [x] R4.4 [B] Regras, termos e modelos da FBr que definem uma condição essencial da feature estão aprovados e versionados (documento só complementar: pendência registrada em R4.2).

### DoR — Requisitos não funcionais associados

- [x] R5.1 [B] RNFs que restringem a feature identificados, cobrindo as categorias URPS+ aplicáveis.
- [x] R5.2 [B] Cada RNF tem meta mensurável, método de verificação, classificação URPS+ e rastreabilidade (evolutivo: patamar mínimo de lançamento, seção 10.2.3.1).
- [x] R5.3 [B] Metas de desempenho e disponibilidade indicam o cenário de referência (carga, massa de dados, janela).
- [x] R5.4 [R] Regras transversais referenciadas, e não repetidas (RNF10, RNF56, CP12).
- [x] R5.5 [B] Com dados pessoais ou de saúde, os RNFs de criptografia, acesso, auditoria e retenção da CP12 foram considerados.

### DoR — Segurança, privacidade e conformidade

- [x] R6.1 [B] Matriz de acesso por perfil definida: quem executa, quem consulta e o que cada perfil vê.
- [x] R6.2 [B] Paciente ou responsável usa a verificação de identidade (RF52), e não "usuário autenticado".
- [x] R6.3 [B] Operações que alteram dados relevantes têm auditoria (autor, data/hora, estado anterior e novo).
- [x] R6.4 [B] O tratamento de dados pessoais e de saúde tem finalidade clara, e pontos não validados estão como pendência.

### DoR — Interface e acessibilidade

- [x] R7.1 [B] Páginas do público externo consideram os requisitos da CP14 (RNF56, RNF57 e RNF58). Marque também se a feature não tiver página externa.
- [x] R7.2 [R] Estados vazios e mensagens esperadas descritos.
- [x] R7.3 [R] Esboço ou protótipo validado para as features de maior interação.

### DoR — Viabilidade técnica e tamanho

- [x] R8.1 [B] A equipe entende o requisito e consegue estimá-lo sem esclarecimentos pendentes.
- [x] R8.2 [B] A feature cabe em uma iteração (ou foi dividida sem perder a rastreabilidade).
- [x] R8.3 [R] Integrações externas (e-mail, SMS, PDF) e a massa de dados de teste identificadas.

### Registro da avaliação do DoR

Data: <dd/mm/aaaa>    Avaliador: <nome>    Revisor: <nome>
Resultado: Pronta | Pronta com ressalvas | Não pronta
Critérios [B] não atendidos: <códigos e motivo, ou "nenhum">
Pendências [R] e/ou com a FBr: <descrição, responsável, prazo, ou "nenhuma">
Justificativas: <por que cada critério pendente não impede ou impede a entrada>


### DoD 1 — Design inspecionado

- [ ] D1.1 Modelo detalhado, diagramas, protótipos, regras e critérios revisados pela equipe. Evidência: links dos artefatos e quem revisou.
- [ ] D1.2 Consistência com o modelo de domínio verificada. Evidência: classes e relacionamentos usados, citados na inspeção.
- [ ] D1.3 Viabilidade técnica confirmada. Evidência: quem confirmou, tecnologias, integrações, dados de teste e riscos.
- [ ] D1.4 Acessibilidade verificada. Evidência: RNFs da CP14 aplicáveis e o resultado de cada um.
- [ ] D1.5 Segurança e LGPD verificadas. Evidência: RNFs da CP12 aplicáveis e o resultado de cada um.
- [ ] D1.6 Conformidade com as normas do CRP verificada. Evidência: normas consideradas e conclusão.
- [ ] D1.7 Restrições da modalidade presencial consideradas. Evidência: restrições citadas na inspeção.
- [ ] D1.8 Resultado da inspeção registrado. Evidência: comentário com data, participantes, resultado e apontamentos.

### DoD 2 — Código concluído

- [ ] D2.1 Todos os critérios de aceitação implementados. Evidência: cada critério com o commit ou PR que o implementa.
- [ ] D2.2 Feature integrada aos componentes necessários. Evidência: componentes e integrações descritos no PR.
- [ ] D2.3 Nenhuma regra aprovada alterada sem registro e validação. Evidência: ausência de alteração ou link do registro.
- [ ] D2.4 Testes unitários escritos e passando. Evidência: execução dos testes no PR (CI) sem falhas.

### DoD 3 — Código inspecionado

- [ ] D3.1 Código revisado por outro integrante (nunca o autor). Evidência: aprovação no PR.
- [ ] D3.2 Legibilidade e padrões da equipe respeitados. Evidência: revisão sem apontamentos de padrão em aberto.
- [ ] D3.3 Tratamento de erros adequado. Evidência: fluxos de exceção cobertos por testes ou verificados na revisão.
- [ ] D3.4 Segurança e controle de acesso verificados. Evidência: negações de acesso por perfil testadas ou revisadas.
- [ ] D3.5 Proteção de dados sensíveis (LGPD) verificada. Evidência: verificação registrada na revisão.
- [ ] D3.6 Aderência aos critérios de aceitação confirmada. Evidência: critérios marcados pelo revisor.
- [ ] D3.7 Apontamentos impeditivos (critério de aceitação, acesso, dados, teste ou build) corrigidos no PR; só os não impeditivos viram pendência. Evidência: comentários resolvidos e issue vinculada para cada pendência.

### DoD 4 — Promovido para a versão integrada (Promote to Build)

- [ ] D4.1 Aprovada nas inspeções de design e de código. Evidência: registros D1.8 e D3.1 na issue.
- [ ] D4.2 Testes unitários e de integração passando. Evidência: execução na versão integrada sem falhas.
- [ ] D4.3 Integrada sem quebrar a build. Evidência: PR mesclado e build da main concluída.
- [ ] D4.4 Resultado registrado. Evidência: comentário com o link do PR, o resultado dos testes e as pendências.
- [ ] D4.5 RNFs da feature verificados no patamar exigido (meta completa ou patamar mínimo dos evolutivos). Evidência: resultado de cada verificação na issue.

### DoD 5 — Demonstrada

- [ ] D5.1 Feature apresentada à coordenação e à equipe da FBr, junto ao seu conjunto. Evidência: ata vinculada.
- [ ] D5.2 Demonstração com cenários próximos da operação real da clínica. Evidência: cenários listados na ata.

### DoD 6 — Aceita

- [ ] D6.1 Aceite formal da FBr registrado. Evidência: link da ata ou da mensagem da FBr.
- [ ] D6.2 Observações, pendências e correções da FBr registradas. Evidência: itens listados, cada correção com issue própria.

### Registro do DoD

Inspeção de design: <data> | <participantes> | <resultado>
Inspeção de código: <link do PR> | <revisor> | <resultado>
Promote to Build: <link do PR mesclado> | <resultado dos testes> | <RNFs verificados e patamar>
Demonstração: <data> | <link da ata>
Aceite da FBr: Aceita | Não aceita | <data> | <link da ata ou mensagem>
Pendências: <descrição, responsável, prazo>
Correções solicitadas: <descrição e issue vinculada>





