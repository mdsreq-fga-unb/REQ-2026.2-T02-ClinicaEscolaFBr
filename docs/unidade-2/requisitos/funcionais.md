# 8. Requisitos de Software

<!-- Aqui só cobre o CP 9-->
## CP9 - Emissão de declaração de comparecimento

**Característica de Produto:** gerar automaticamente a declaração de comparecimento do paciente, contendo data, horário e nome do estagiário que realizou o atendimento (Solução Proposta, §2.3).

**Valor de negócio:** atender de imediato uma demanda recorrente dos pacientes, sem trabalho manual da secretaria.

**Escopo:** fora do MVP (escopo desejável, conforme §2.3).

**Rastreabilidade:** Problema (processo manual e presencial, com trabalho repetitivo da secretaria) → Objetivo Geral → OE6 (principal) / OE5 (secundário) → CP9 → features RF9.1 a RF9.5.

**Situação:** rascunho para revisão interna e validação com a FBr.

---

### Lista de features (FDD)

```
Área: Emissão de documentos
  Conjunto: Declaração de comparecimento
    Feature: Listar sessões com comparecimento registrado do paciente
    Feature: Emitir declaração de comparecimento do paciente
    Feature: Reemitir declaração de comparecimento
    Feature: Emitir declaração consolidada por período
    Feature: Validar autenticidade da declaração
```

### Resumo dos requisitos funcionais

| ID | Feature | Ator Principal | Prioridade (MoSCoW) | Dependências |
|----|---------|----------------|---------------------|--------------|
| RF9.1 | Listar sessões com comparecimento registrado do paciente | Secretaria; Paciente/Responsável | Should Have | CP9/OE6 | CP4 (registro de presença), CP11 |
| RF9.2 | Emitir declaração de comparecimento do paciente |  Secretaria; Paciente/Responsável | Should Have | CP9/OE6, OE5 | RF9.1, CP11 |
| RF9.3 | Reemitir declaração de comparecimento | Secretaria; Paciente/Responsável | Could Have | CP9/OE6 | RF9.2 |
| RF9.4 | Emitir declaração consolidada por período (A validar) | Secretaria; Paciente/Responsável | Could Have | CP9/OE6 | RF9.1, RF9.2 |
| RF9.5 | Validar autenticidade da declaração (A validar) | Terceiro (empregador, escola) | Could Have | CP9/OE6 | RF9.2 |

> **Nota de priorização:** a CP9 está fora do MVP; por isso nenhuma feature é *Must Have*. A priorização final será revisada na atividade de priorização e definição do MVP.

---

### Regras de negócio relacionadas

| ID | Regra | Situação |
|----|-------|----------|
| RN9.1 | A declaração deve conter, no mínimo, a data, o horário e o nome do estagiário que realizou o atendimento (definido na CP9). | Confirmada |
| RN9.2 | Só é possível emitir declaração para sessão com presença do paciente registrada. Sessões com falta ou cancelamento não geram declaração. | A validar |
| RN9.3 | A declaração não deve conter informação clínica (queixa, prioridade, diagnóstico, evolução), preservando o sigilo do atendimento. | A validar |
| RN9.4 | Toda emissão e reemissão deve ser registrada para auditoria (quem emitiu, quando, para qual sessão). | Proposta |
| RN9.5 | Para paciente menor de idade, a solicitação é feita pelo responsável legal. | A validar |
| RN9.6 | Os campos obrigatórios adicionais do documento (CPF, dados da instituição, assinatura ou carimbo do supervisor) serão definidos com a FBr. | A validar |

---

### Detalhamento das features

#### RF9.1 - Listar sessões com comparecimento registrado do paciente

**Descrição:** o sistema deve listar as sessões do paciente nas quais a presença foi registrada, para que o usuário escolha a(s) sessão(ões) a declarar.

**Atores:** Secretaria; Paciente/Responsável (este apenas para as próprias sessões).

**Pré-condições:** usuário autenticado com perfil autorizado; existência de ao menos uma sessão com presença registrada.

**Critérios de aceitação**

- A lista exibe apenas sessões com presença registrada, com data, horário e nome do estagiário.
- O paciente/responsável visualiza somente as suas próprias sessões.
- Quando não há sessão elegível, o sistema informa isso de forma clara, sem exibir erro técnico.
**Cenários**

```gherkin
Cenário: Listar sessões elegíveis
  Dado que o paciente possui 3 sessões, sendo 2 com presença registrada e 1 com falta
  Quando a secretaria abre a lista de sessões para declaração
  Então o sistema exibe somente as 2 sessões com presença registrada
 
Cenário: Paciente sem sessões elegíveis
  Dado que o paciente ainda não possui sessão com presença registrada
  Quando o paciente acessa a área de declarações
  Então o sistema informa que não há sessões disponíveis para declaração
```

---

#### RF9.2 - Emitir declaração de comparecimento do paciente

**Descrição:** o sistema deve gerar automaticamente a declaração de comparecimento para a sessão escolhida, contendo, no mínimo, data, horário e nome do estagiário (RN9.1), em formato pronto para impressão ou compartilhamento.

**Atores:** Secretaria; Paciente/Responsável.

**Pré-condições:** sessão com presença registrada (RN9.2); usuário autenticado e autorizado.

**Fluxo principal**

1. O usuário seleciona a sessão elegível (RF9.1).
2. O usuário solicita a emissão.
3. O sistema gera o documento com os dados da sessão.
4. O sistema registra a emissão para auditoria (RN9.4).
5. O sistema disponibiliza o documento para download/impressão.
**Fluxos alternativos**

- **A1 — Sessão sem presença registrada:** o sistema bloqueia a emissão e informa o motivo.
- **A2 — Usuário sem permissão:** o sistema nega a emissão e registra a tentativa.
**Critérios de aceitação**

- O documento contém data, horário e nome do estagiário corretos, conforme o registro da sessão.
- O documento não contém dados clínicos (RN9.3).
- A emissão fica registrada com usuário, data/hora e sessão de origem.
- Não é possível emitir para sessão com falta ou cancelamento.
**Cenários**

```gherkin
Cenário: Emissão bem-sucedida
  Dado que existe uma sessão com presença registrada em 10/09/2026 às 14h, atendida pelo estagiário X
  Quando a secretaria solicita a declaração dessa sessão
  Então o sistema gera um documento com a data 10/09/2026, o horário 14h e o nome do estagiário X
  E registra a emissão com o usuário e a data/hora da solicitação
 
Cenário: Tentativa de emissão para sessão com falta
  Dado que a sessão do paciente foi registrada como falta
  Quando o usuário tenta emitir a declaração dessa sessão
  Então o sistema bloqueia a emissão
  E informa que só há declaração para sessões com presença registrada
 
Cenário: Paciente tenta emitir declaração de outro paciente
  Dado que o paciente A está autenticado
  Quando ele tenta emitir a declaração de uma sessão do paciente B
  Então o sistema nega o acesso
```

---

#### RF9.3 - Reemitir declaração de comparecimento

**Descrição:** o sistema deve permitir gerar novamente uma declaração já emitida (por exemplo, por perda do documento), mantendo o conteúdo consistente com o registro da sessão.

**Atores:** Secretaria; Paciente/Responsável.

**Critérios de aceitação**

- A reemissão gera documento com o mesmo conteúdo da emissão original, a menos que o registro da sessão tenha sido corrigido.
- Cada reemissão é registrada para auditoria, distinguindo emissão original de reemissão.

```gherkin
Cenário: Reemissão de declaração
  Dado que a declaração da sessão de 10/09/2026 já foi emitida
  Quando o usuário solicita a reemissão
  Então o sistema gera o documento novamente
  E registra a reemissão vinculada à emissão original
```

---

#### RF9.4 - Emitir declaração consolidada por período *(A validar)*

**Descrição:** o sistema deve permitir gerar uma única declaração que reúna várias sessões com presença registrada em um período (por exemplo, para justificar ausências recorrentes no trabalho ou na escola).

**Critérios de aceitação**

- O usuário informa o período e o sistema inclui somente as sessões com presença registrada dentro dele.
- Cada sessão listada apresenta data, horário e nome do estagiário.
- Se nenhuma sessão elegível existir no período, o sistema informa e não gera o documento.

> **Pendência:** confirmar com a FBr se a demanda por declaração consolidada existe; caso contrário, esta feature sai da lista.

---

#### RF9.5 — Validar autenticidade da declaração *(A validar)*

**Descrição:** o sistema deve permitir que um terceiro (empregador, escola) confirme que a declaração apresentada foi emitida pela Clínica Escola, por meio de um código de verificação impresso no documento.

**Critérios de aceitação**

- Cada declaração emitida possui um código único de verificação.
- A consulta ao código confirma a autenticidade sem expor dados pessoais além dos estritamente necessários.

> **Pendência:** confirmar com a FBr se há necessidade de verificação por terceiros. Se sim, avaliar o risco de exposição de dados na consulta pública (ver RNF9.1).

---

### Pendências para validação com a FBr

| # | Pergunta | Impacta |
|---|----------|---------|
| 1 | Quem emite a declaração: apenas a secretaria, o paciente pelo portal, ou ambos? | RF9.1, RF9.2 |
| 2 | Quais campos são obrigatórios além de data, horário e estagiário (CPF, assinatura/carimbo, dados da instituição)? | RN9.6, RF9.2 |
| 3 | Qual o formato preferido: PDF para download, impressão, envio por e-mail/WhatsApp? | RF9.2, RNF9.6 |
| 4 | Existe demanda por declaração consolidada de várias sessões? | RF9.4 |
| 5 | A declaração pode indicar que o atendimento é psicológico ou deve ter texto neutro por sigilo? | RN9.3, RNF9.1 |
| 6 | No caso de menores, o responsável solicita a declaração? | RN9.5 |
| 7 | É necessário verificar a autenticidade por terceiros? | RF9.5 |

---

### Histórico de revisão

| Data | Versão | Descrição | Autor |
|------|--------|-----------|-------|
| 21/09/2026 | 0.1 | Decomposição inicial da CP9 em features e critérios | Maria Clara |
