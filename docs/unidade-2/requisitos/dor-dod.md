# 9. DoR e DoD
# Definição de Pronto (DoD)

A validação ocorre de forma incremental, acompanhando os marcos do FDD e combinando inspeções internas, testes e demonstrações com o cliente.

## Definição de Preparado (DoR)

Uma feature só entra no ciclo de desenvolvimento quando possuir:

- [ ] Descrição
- [ ] Prioridade definida
- [ ] Critérios de aceitação
- [ ] Vínculo com as necessidades do negócio

## Definição de Pronto (DoD)

Uma feature só é considerada **pronta** quando cumprir todos os critérios abaixo, na ordem.

### 1. Design inspecionado

- [ ] Modelo detalhado, diagramas de sequência, protótipos, regras de negócio e critérios de aceitação revisados pela equipe
- [ ] Consistência com o modelo de domínio verificada
- [ ] Viabilidade técnica confirmada
- [ ] Requisitos de acessibilidade verificados
- [ ] Requisitos de segurança e de LGPD verificados
- [ ] Conformidade com as normas do CRP verificada
- [ ] Restrições da modalidade presencial da Clínica Escola consideradas
- [ ] Resultado da inspeção registrado

### 2. Código concluído

- [ ] Todos os cenários previstos nos critérios de aceitação implementados
- [ ] Feature integrada aos componentes necessários
- [ ] Nenhuma regra aprovada alterada sem registro e validação
- [ ] Testes unitários escritos e passando

### 3. Código inspecionado

- [ ] Código revisado por outro integrante da equipe (nunca pelo próprio autor)
- [ ] Legibilidade e padrões definidos pela equipe respeitados
- [ ] Tratamento de erros adequado
- [ ] Segurança e controle de acesso verificados
- [ ] Proteção de dados sensíveis verificada (LGPD)
- [ ] Aderência aos critérios de aceitação confirmada
- [ ] Apontamentos da revisão corrigidos ou registrados como pendência

### 4. Promovido para a versão integrada (Promote to Build)

- [ ] Feature aprovada nas inspeções de design e de código
- [ ] Testes unitários e de integração passando
- [ ] Código integrado à base compartilhada sem quebrar a build
- [ ] Resultado registrado no GitHub, com evidências dos testes e pendências conhecidas

### 5. Demonstrada

- [ ] Feature apresentada a Robson e à equipe da FBr, junto ao seu conjunto de features
- [ ] Demonstração feita com cenários próximos da operação real da clínica (inscrição, triagem, consulta da fila, agendamento, confirmação de presença)

### 6. Aceita

- [ ] Aceite formal da FBr registrado e vinculado à feature
- [ ] Observações e solicitações de ajuste registradas e vinculadas à feature
- [ ] Caso não seja aceita, a feature **não está pronta**: retorna ao planejamento com prioridade e critérios revisados

> **Regra de conformidade:** o aceite da FBr avalia comportamento, valor e adequação às necessidades da clínica. Ele **não substitui** a verificação de conformidade com o CRP, a LGPD e os requisitos de acessibilidade, que é responsabilidade da equipe técnica e é feita nas etapas 1 (Design inspecionado) e 3 (Código inspecionado).

## DoD da entrega final (MVP)

- [ ] Todas as features do MVP cumprem a DoD acima
- [ ] Demonstração integrada do fluxo completo do MVP apresentada à FBr
- [ ] Limites conhecidos registrados
- [ ] Evoluções previstas registradas