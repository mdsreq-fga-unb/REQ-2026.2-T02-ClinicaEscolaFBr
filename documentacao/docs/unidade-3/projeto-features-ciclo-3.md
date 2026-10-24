# Projeto das features do Ciclo 3

Esta página registra o processo **Projetar por Feature** do FDD para as 14 features do Ciclo 3: o modelo detalhado, os diagramas de sequência, as rotas da API, as regras ligadas aos critérios de aceitação e os dados de teste de cada feature. Ela é o material da **inspeção de design** (marco 1 do [DoD](../unidade-2/requisitos/dor-dod.md#1-design-inspecionado)). O resultado da inspeção de cada feature é registrado na sua issue.

Os requisitos de origem estão na [seção 8.1](../unidade-2/requisitos/funcionais.md), e os itens do ciclo, no [Backlog de Produto](../unidade-2/requisitos/backlog.md#1012-itens-de-trabalho-do-mvp).

## Convenções

- **API:** NestJS, um módulo por área do FDD (`acesso`, `inscricao`, `triagem`, `casos`, `agendamento`, `acompanhamento-clinico`). As rotas internas exigem sessão e usam o `PerfisGuard` com o decorator `@Perfis(...)`. As rotas públicas (inscrição e ativação de conta) não exigem sessão.
- **Banco:** PostgreSQL com Drizzle, em `packages/database`. Os nomes de tabela e coluna seguem o português sem acento, como as tabelas `usuarios` e `auditoria` da base técnica.
- **Validação:** esquemas Zod em `packages/shared`, usados tanto pela API quanto pela interface.
- **Auditoria:** toda operação que altera dados relevantes chama o `AuditoriaService`, que grava na tabela `auditoria` (somente inserção) o autor, a operação, a entidade, o estado anterior e o novo.
- **Datas:** gravadas com fuso horário (`timestamptz`) e exibidas no horário de Brasília.
- **Dados de teste:** sempre fictícios. Nenhum dado real de paciente entra no repositório, no banco de desenvolvimento ou em prints.

## Modelo detalhado do Ciclo 3

O diagrama reúne as classes usadas pelas 14 features. Ele detalha o [modelo de domínio](../unidade-2/requisitos/funcionais.md) de cada CP no nível de implementação.

```mermaid
classDiagram
    direction LR
    class Usuario {
      +uuid id
      +string nome
      +string email
      +Perfil perfil
      +SituacaoUsuario situacao
      +string senhaHash
      +int tentativasFalhas
      +datetime bloqueadoAte
    }
    class ConviteAtivacao {
      +uuid id
      +string tokenHash
      +datetime expiraEm
      +datetime usadoEm
      +datetime invalidadoEm
    }
    class SessaoLogin {
      +uuid id
      +datetime criadaEm
      +datetime expiraEm
      +datetime revogadaEm
    }
    class Inscricao {
      +uuid id
      +string numero
      +string nomeCompleto
      +date dataNascimento
      +string cpf
      +string rg
      +string endereco
      +string estadoCivil
      +string responsavelLegal
      +string celular
      +string email
      +Canal canalPreferencial
      +string queixa
      +string percepcaoUrgencia
      +string historicoRelevante
      +datetime criadaEm
    }
    class DecisaoPrioridade {
      +uuid id
      +Cor cor
      +datetime decididaEm
      +bool vigente
    }
    class AreaEspecialidade {
      +uuid id
      +string nome
    }
    class Caso {
      +uuid id
      +SituacaoCaso situacao
      +int cicloAtendimento
    }
    class AtribuicaoSupervisor {
      +uuid id
      +datetime atribuidoEm
      +string justificativaExcecao
      +bool vigente
    }
    class VinculoEstagiario {
      +uuid id
      +datetime vinculadoEm
      +bool vigente
    }
    class Prontuario {
      +uuid id
      +int cicloAtendimento
      +datetime criadoEm
      +string anamnese
      +string contrato
      +date dataAssinaturaContrato
    }
    class SessaoAtendimento {
      +uuid id
      +datetime inicio
      +datetime termino
      +StatusSessao status
    }
    class LinkConfirmacao {
      +uuid id
      +string tokenHash
      +datetime expiraEm
    }
    class Parametro {
      +string chave
      +string valor
      +datetime alteradoEm
    }

    Usuario "1" --> "0..*" ConviteAtivacao
    Usuario "1" --> "0..*" SessaoLogin
    Inscricao "1" --> "0..*" DecisaoPrioridade : histórico
    DecisaoPrioridade "0..*" --> "0..1" AreaEspecialidade : área exigida
    DecisaoPrioridade "0..*" --> "1" Usuario : decidida por
    Inscricao "1" --> "0..1" Caso
    Usuario "0..*" --> "0..*" AreaEspecialidade : supervisor atende
    Caso "1" --> "0..*" AtribuicaoSupervisor : histórico
    AtribuicaoSupervisor "0..*" --> "1" Usuario : supervisor
    Caso "1" --> "0..*" VinculoEstagiario : histórico
    VinculoEstagiario "0..*" --> "1" Usuario : estagiário
    Caso "1" --> "0..*" Prontuario : um por ciclo
    Caso "1" --> "0..*" SessaoAtendimento
    SessaoAtendimento "0..*" --> "1" Usuario : estagiário
    SessaoAtendimento "1" --> "1" LinkConfirmacao
```

**Valores dos tipos enumerados:**

- `Perfil`: secretaria, estagiario, supervisor, coordenacao (já existe em `@clinica/shared`).
- `SituacaoUsuario`: pendente_ativacao, ativo, desativado. Substitui a coluna booleana `ativo` da base técnica, que não representa o estado "pendente de ativação" do RF53.
- `Canal`: celular, email.
- `Cor`: vermelha, amarela, verde.
- `SituacaoCaso`: aguardando_distribuicao, aguardando_vinculo, em_atendimento, encerrado.
- `StatusSessao`: agendada (os demais status entram com o RF14, o RF15 e o RF16 no Ciclo 4).

**Restrições de integridade no banco** (RNF19, RNF9):

- No máximo uma `DecisaoPrioridade` vigente por inscrição, uma `AtribuicaoSupervisor` vigente por caso e um `VinculoEstagiario` vigente por caso. São índices únicos parciais `WHERE vigente`.
- Um `Prontuario` por caso e ciclo de atendimento: índice único em `(caso_id, ciclo_atendimento)`.
- `SessaoAtendimento.termino` maior que `inicio`, garantido por restrição `CHECK`.

**Parâmetros iniciais** (tabela `parametros`, alterados pela coordenação):

| Chave | Valor padrão | Usado em |
| --- | --- | --- |
| `prazo_maximo_triagem_dias` | 7 | RF4 |
| `duracao_sessao_minutos` | 50 | RF10 |
| `validade_convite_horas` | 72 | RF53 |

---

## Acesso e segurança (CP12)

### RF50 — Autenticar usuário institucional ([#45](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/45))

**Rotas:**
- `POST /auth/login` (pública): recebe e-mail e senha e devolve um cookie de sessão `httpOnly`.
- `POST /auth/logout`.

O `SessaoGuard` valida a sessão em cada requisição e preenche `req.usuario`, que o `PerfisGuard` já usa.

```mermaid
sequenceDiagram
    actor U as Usuário institucional
    participant W as Web
    participant A as API (acesso)
    participant DB as Banco
    U->>W: e-mail e senha
    W->>A: POST /auth/login
    A->>DB: busca usuário pelo e-mail
    alt usuário inexistente, senha errada ou situação diferente de ativo
        A->>DB: soma tentativa falha (bloqueia por 15 min na 5ª, RNF49)
        A-->>W: 401 com mensagem genérica
    else credenciais corretas e conta ativa
        A->>DB: cria SessaoLogin e zera tentativas
        A-->>W: cookie de sessão e perfil
        W-->>U: menu só com as funções do perfil
    end
```

| Regra | Critério de aceitação |
| --- | --- |
| A senha é comparada com o hash (bcrypt ou Argon2), e a mesma mensagem é usada para qualquer falha | E-mail ou senha incorretos negam o acesso sem indicar o campo |
| Só a situação `ativo` autentica | Usuário desativado (RF54) não entra; usuário pendente (RF53) também não |
| O menu e as rotas são filtrados pelo perfil (`PerfisGuard`) | Usuário ativo vê apenas as funcionalidades do seu perfil |

**Dados de teste:** um usuário de cada perfil, ativo; um desativado; um pendente de ativação; um com 4 tentativas falhas (para testar o bloqueio na 5ª).

### RF53 — Cadastrar usuário institucional com perfil de acesso ([#48](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/48))

**Rotas:**
- `POST /usuarios` (coordenação);
- `POST /usuarios/:id/convite` (coordenação, para reenviar o convite);
- `POST /ativacao` (pública): recebe o token e a nova senha.

```mermaid
sequenceDiagram
    actor C as Coordenação
    participant A as API (acesso)
    participant DB as Banco
    participant M as E-mail
    actor N as Novo usuário
    C->>A: POST /usuarios com nome, e-mail e perfil
    alt e-mail já cadastrado
        A-->>C: 409 e-mail já cadastrado
    else e-mail novo
        A->>DB: cria usuário pendente_ativacao e convite com validade de 72 h
        A->>DB: auditoria do cadastro
        A->>M: envia link de ativação
        A-->>C: 201 usuário pendente
    end
    N->>A: POST /ativacao com token e senha
    alt token usado, invalidado ou vencido
        A-->>N: 410 pedir novo convite à coordenação
    else token válido e senha conforme o RNF49
        A->>DB: grava hash da senha, situação ativo, marca convite como usado
        A->>DB: auditoria da ativação
        A-->>N: conta ativa
    end
```

| Regra | Critério de aceitação |
| --- | --- |
| O token é guardado só como hash, é de uso único e vale 72 h (parâmetro) | Link já usado ou com mais de 72 horas é recusado |
| O reenvio marca o convite anterior como `invalidadoEm` e cria outro | O reenvio invalida o link anterior |
| Índice único no e-mail | E-mail já cadastrado não pode ser cadastrado de novo |
| Rota com `@Perfis('coordenacao')` | Usuário sem perfil de coordenação não cadastra |
| O cadastro, o reenvio e a ativação chamam o `AuditoriaService` | Operações registradas com autor, usuário afetado e data/hora |

**Dados de teste:** um convite válido, um vencido (criado há 73 h) e um já usado. Em desenvolvimento, o e-mail chega ao Mailpit (`http://localhost:8025`).

### RF54 — Desativar usuário institucional ([#49](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/49))

**Rota:** `POST /usuarios/:id/desativacao` (coordenação).

```mermaid
sequenceDiagram
    actor C as Coordenação
    participant A as API (acesso)
    participant DB as Banco
    actor E as Estagiário desativado
    C->>A: POST /usuarios/:id/desativacao
    A->>DB: situação desativado e revoga as SessaoLogin abertas
    A->>DB: auditoria com quem desativou, o usuário e a data/hora
    A-->>C: 200 usuário desativado
    E->>A: próxima requisição com a sessão antiga
    A->>DB: SessaoGuard encontra a sessão revogada
    A-->>E: 401 sessão encerrada
```

| Regra | Critério de aceitação |
| --- | --- |
| Revogar as sessões e conferir a situação do usuário a cada requisição | A próxima requisição do desativado é recusada, mesmo com sessão aberta |
| Nada é apagado: os registros continuam ligados ao `usuarioId` | Registros anteriores continuam visíveis, com o nome de quem os fez |
| `@Perfis('coordenacao')` | Usuário sem perfil de coordenação não desativa |

**Dados de teste:** um estagiário ativo com sessão aberta e registros de auditoria em seu nome.

### RF55 — Restringir acesso ao prontuário do paciente ([#50](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/50))

**Escopo no Ciclo 3:**
- **O que entra agora:** a regra de acesso protege o prontuário criado pelo RF66 e os seus dados iniciais.
- **O que entra depois:** a mesma política passa a valer para a evolução (CP7, a partir do Ciclo 4). O critério da transferência entre estagiários é verificado quando a transferência (RF25) for construída, no Ciclo 4. O relatório final (CP8) está fora do MVP.

**Rotas:**
- `GET /prontuarios/:id`: estagiário responsável e supervisor do caso.
- `GET /pacientes/:id/dados-administrativos`: secretaria e coordenação.

```mermaid
sequenceDiagram
    actor U as Usuário
    participant A as API (acompanhamento clínico)
    participant P as PoliticaProntuario
    participant DB as Banco
    U->>A: GET /prontuarios/:id
    A->>P: pode acessar(usuário, prontuário)?
    P->>DB: vínculo vigente do caso (estagiário e supervisor)
    alt é o estagiário responsável ou o supervisor do caso
        P-->>A: permitido
        A->>DB: auditoria do acesso (RNF52)
        A-->>U: conteúdo clínico
    else qualquer outro perfil ou estagiário
        P-->>A: negado
        A->>DB: auditoria do acesso negado (RNF52)
        A-->>U: 403
    end
```

| Regra | Critério de aceitação |
| --- | --- |
| A verificação acontece na API (`PoliticaProntuario`), não só na interface | Estagiário não responsável tem o acesso negado, inclusive com requisição direta ao servidor |
| A rota administrativa devolve apenas nome, data de nascimento, contatos, responsável legal, situação do caso, sessões, faltas e contribuição | Secretaria e coordenação veem só os dados cadastrais e administrativos |
| Os dados são criptografados em repouso e em trânsito (RNF51) | Inspeção do banco e do HTTPS no ambiente de homologação |

**Dados de teste:** um caso com estagiário A e supervisor S; outro estagiário B; uma secretaria; uma coordenação.

---

## Inscrição on-line (CP1)

### RF1 — Registrar solicitação de atendimento on-line ([#88](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/88))

**Rota:** `POST /inscricoes` (pública), validada pelo esquema `inscricaoSchema` em `@clinica/shared`. A interface tem 3 etapas, com o aviso do CVV e do SAMU fixo em todas:
1. dados e contatos;
2. triagem (queixa, percepção de urgência e histórico relevante);
3. revisão e confirmação.

```mermaid
sequenceDiagram
    actor I as Interessado
    participant W as Web (formulário)
    participant A as API (inscricao)
    participant DB as Banco
    I->>W: preenche as etapas 1 e 2
    W->>W: valida os campos obrigatórios e o formato dos contatos (Zod)
    alt campo obrigatório vazio ou menor de idade sem responsável legal
        W-->>I: indica os campos pendentes e mantém o que já foi preenchido
    else formulário completo
        W-->>I: etapa 3 com a revisão dos dados
        I->>W: confirma o envio
        W->>A: POST /inscricoes com confirmado igual a true
        A->>A: valida de novo no servidor
        A->>DB: grava a inscrição e gera o número único
        A-->>W: 201 com número, data e hora
        W-->>I: confirmação e comprovante (RF2)
    end
```

| Regra | Critério de aceitação |
| --- | --- |
| O mesmo esquema Zod é usado na interface e na API | Envio com campo obrigatório vazio é bloqueado, e os dados são mantidos |
| A idade é calculada a partir da data de nascimento, e o responsável legal é obrigatório para menores de 18 anos | Menor de idade sem responsável legal é bloqueado |
| Pelo menos um canal (celular ou e-mail) e o canal preferencial são obrigatórios | Formato validado, um canal exigido e o preferencial registrado |
| CPF e RG são campos de texto, sem upload | Nenhum envio de cópia do documento |
| A API só grava com `confirmado: true` | Sem confirmação, a solicitação não é registrada |
| A interface só mostra a confirmação após a resposta 201 | Nenhuma confirmação sem registro efetivo |
| Componente `AvisoEmergencia` fixo no layout do formulário | Aviso do CVV e do SAMU em todas as etapas |

**Dados de teste:** um adulto com e-mail; um menor com responsável legal e só celular; uma inscrição com CPF em formato inválido.

### RF2 — Emitir comprovante de inscrição ([#89](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/89))

O comprovante é montado na interface a partir da resposta do `POST /inscricoes` (número, data e hora) e pode ser impresso ou salvo em PDF pelo navegador. Não há rota pública para consultar um comprovante por número, o que evita a enumeração de inscrições.

```mermaid
sequenceDiagram
    actor I as Interessado
    participant W as Web
    participant A as API (inscricao)
    W->>A: POST /inscricoes
    alt inscrição registrada
        A-->>W: 201 com número, data e hora
        W-->>I: comprovante com número, data, hora e aviso de que não garante vaga
    else erro no registro
        A-->>W: erro
        W-->>I: mensagem de erro, sem comprovante
    end
```

| Regra | Critério de aceitação |
| --- | --- |
| O comprovante só existe a partir da resposta 201 | Nenhum comprovante para inscrição não concluída |
| O componente recebe apenas o número, a data e a hora | O comprovante não contém a queixa nem dados clínicos |
| Texto fixo sobre triagem e vagas | Informa que o atendimento depende da triagem e das vagas |

---

## Triagem (CP2)

### RF4 — Organizar informações da inscrição para triagem ([#90](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/90))

**Rota:** `GET /triagem/inscricoes` (supervisor e coordenação). Devolve as inscrições sem decisão de prioridade vigente, com o campo calculado `alemDoPrazo`, que é verdadeiro quando o tempo desde `criadaEm` passa do parâmetro `prazo_maximo_triagem_dias` (padrão de 7).

```mermaid
sequenceDiagram
    actor S as Supervisor ou coordenação
    participant A as API (triagem)
    participant DB as Banco
    S->>A: GET /triagem/inscricoes
    A->>DB: inscrições sem decisão vigente e o parâmetro de prazo
    A->>A: marca alemDoPrazo e deixa os campos vazios como ausentes
    alt não há inscrições aguardando
        A-->>S: lista vazia, e a tela informa que não há pendências
    else há inscrições
        A-->>S: número, queixa, urgência, histórico (como declaração do interessado) e o sinal de além do prazo
    end
```

| Regra | Critério de aceitação |
| --- | --- |
| `@Perfis('supervisor','coordenacao')` | Usuários sem autorização não veem as respostas |
| Campo vazio é enviado como `null`, e a interface mostra "não informado" | Campo sem resposta aparece como ausente |
| As respostas aparecem num bloco "Declarado pelo interessado", separado da decisão da equipe | Declaração separada da avaliação da equipe |
| Prazo vindo do parâmetro (padrão de 7 dias corridos) | Sinalização além do prazo à coordenação |

**Dados de teste:** uma inscrição de hoje; uma de 8 dias atrás sem triagem (aparece além do prazo); uma inscrição legada com o histórico vazio.

### RF6 — Registrar prioridade clínica do inscrito ([#91](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/91))

**Rota:** `POST /triagem/inscricoes/:id/prioridade` (supervisor e coordenação). Recebe a cor e, opcionalmente, a área de especialidade exigida. A primeira decisão cria o `Caso` com a situação `aguardando_distribuicao`.

```mermaid
sequenceDiagram
    actor S as Supervisor ou coordenação
    participant A as API (triagem)
    participant DB as Banco
    S->>A: POST prioridade com cor e área opcional
    A->>DB: transação
    A->>DB: decisão anterior deixa de ser vigente
    A->>DB: nova DecisaoPrioridade vigente com autor e data/hora
    A->>DB: cria o Caso na primeira decisão
    A->>DB: auditoria (RNF5)
    A-->>S: prioridade registrada
```

| Regra | Critério de aceitação |
| --- | --- |
| Histórico com `vigente` e índice único parcial | A alteração mantém a decisão anterior no histórico |
| A tela mostra a referência vermelha/amarela/verde como texto, sem cor pré-selecionada | Nenhuma sugestão automática de cor |
| Sem decisão vigente, a fila e a distribuição tratam o caso como pendente | Inscrição sem classificação aparece como pendente |
| A área é opcional e fica na decisão vigente | A área exigida fica disponível para o RF20 |

**Dados de teste:** uma inscrição sem decisão; uma com decisão amarela que muda para vermelha; uma secretaria tentando registrar (recebe 403).

---

## Distribuição de casos (CP5)

### RF18 — Listar casos aguardando distribuição ([#92](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/92))

**Rota:** `GET /casos/aguardando-distribuicao` (coordenação e supervisor). Devolve os casos com a situação `aguardando_distribuicao`, ordenados pela cor (vermelha, amarela, verde) e pela data da inscrição, da mais antiga para a mais recente. Cada item traz só o número da inscrição, o nome, a cor e a data.

```mermaid
sequenceDiagram
    actor C as Coordenação ou supervisor
    participant A as API (casos)
    participant DB as Banco
    C->>A: GET /casos/aguardando-distribuicao
    A->>DB: casos sem supervisor vigente, ordenados por cor e data da inscrição
    alt nenhum caso
        A-->>C: lista vazia, e a tela informa que não há casos aguardando
    else há casos
        A-->>C: número, nome, prioridade clínica e data, sem a queixa
    end
```

**Dados de teste:** casos vermelho, amarelo e verde, com datas diferentes; dois casos vermelhos para testar o desempate; um caso já distribuído (não aparece).

### RF19 — Registrar áreas de especialidade do supervisor ([#93](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/93))

**Rotas:**
- `GET /areas`;
- `POST /areas` (coordenação), para o catálogo;
- `PUT /supervisores/:id/areas` (coordenação), que recebe a lista de áreas do supervisor.

Remover uma área do supervisor não mexe nas atribuições já feitas.

```mermaid
sequenceDiagram
    actor C as Coordenação
    participant A as API (casos)
    participant DB as Banco
    C->>A: GET /areas
    alt catálogo vazio
        A-->>C: lista vazia, e a tela orienta cadastrar a primeira área
    end
    C->>A: POST /areas com o nome
    A->>DB: grava a área no catálogo
    C->>A: PUT /supervisores/:id/areas com a lista de áreas
    A->>DB: substitui as associações, sem tocar nas atribuições de casos
    A-->>C: áreas do supervisor atualizadas
```

**Dados de teste:** catálogo vazio; catálogo com "Infância e adolescência", "Adultos" e "Casal e família"; um supervisor com duas áreas.

### RF20 — Distribuir caso a supervisor conforme área de especialidade ([#94](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/94))

**Rota:** `POST /casos/:id/supervisor` (coordenação). Recebe o supervisor e uma `justificativaExcecao`, obrigatória quando não há compatibilidade de área.

```mermaid
sequenceDiagram
    actor C as Coordenação
    participant A as API (casos)
    participant DB as Banco
    C->>A: POST /casos/:id/supervisor
    A->>DB: busca a atribuição vigente e a área exigida pelo caso
    alt o caso já tem supervisor
        A-->>C: 409 use a transferência de caso (RF25)
    else área exigida e supervisor sem essa área, sem justificativa
        A-->>C: 422 nenhum supervisor compatível, informe a justificativa
    else compatível, sem área exigida ou com justificativa
        A->>DB: AtribuicaoSupervisor vigente com autor e data e situação aguardando_vinculo
        A->>DB: auditoria (RNF18)
        A-->>C: caso distribuído
    end
```

**Dados de teste:** um caso com área "Infância e adolescência" e um supervisor compatível; um caso com área que nenhum supervisor atende; um caso sem área; um caso já distribuído.

### RF21 — Vincular paciente a estagiário responsável ([#95](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/95))

**Rota:** `POST /casos/:id/estagiario` (supervisor responsável pelo caso). Mostra como opções apenas estagiários com a situação `ativo`. O vínculo e a criação do prontuário (RF66) acontecem na mesma transação. Até a resposta da FBr sobre o atendimento em dupla (RN5.9), o caso tem um único vínculo vigente, garantido por índice único parcial.

```mermaid
sequenceDiagram
    actor S as Supervisor
    participant A as API (casos)
    participant DB as Banco
    S->>A: GET estagiários disponíveis
    alt nenhum estagiário ativo
        A-->>S: não há estagiários disponíveis para vínculo
    end
    S->>A: POST /casos/:id/estagiario
    A->>DB: confere se o supervisor é o responsável vigente do caso
    alt não é o supervisor do caso
        A-->>S: 403
    else é o supervisor do caso
        A->>DB: transação com VinculoEstagiario vigente (autor e data) e situação em_atendimento
        A->>DB: cria o Prontuario do ciclo (RF66)
        A->>DB: auditoria (RNF18)
        A-->>S: estagiário vinculado
    end
```

**Dados de teste:** um caso distribuído ao supervisor S; um supervisor T tentando vincular (recebe 403); um estagiário desativado, que não aparece nas opções.

---

## Agendamento (CP4)

### RF10 — Agendar sessão do paciente ([#96](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/96))

**Rota:** `POST /sessoes` (secretaria, ou o estagiário responsável pelo caso). Recebe o caso, o início e, opcionalmente, o término. Sem término, ele é calculado com o parâmetro `duracao_sessao_minutos` (padrão de 50).

**Escopo no Ciclo 3:** o agendamento gera o link de confirmação e o envia por e-mail. O envio por SMS e a página que confirma a presença entram com o RF14, no Ciclo 4.

```mermaid
sequenceDiagram
    actor U as Secretaria ou estagiário responsável
    participant A as API (agendamento)
    participant DB as Banco
    participant M as E-mail
    U->>A: POST /sessoes com caso, início e término opcional
    A->>DB: confere o perfil, o vínculo vigente e o estagiário responsável
    alt sem estagiário vinculado, ou usuário sem permissão
        A-->>U: 403 ou 422 com o motivo
    else término menor ou igual ao início
        A-->>U: 422 término deve ser posterior ao início
    else sobreposição com sessão do estagiário ou do paciente
        A-->>U: 409 conflito de horário
    else horário livre
        A->>DB: SessaoAtendimento agendada e LinkConfirmacao
        A->>DB: auditoria (RNF10)
        A->>M: envia o link de confirmação de presença
        A-->>U: sessão agendada
    end
```

**Regra de sobreposição:** existe conflito quando outra sessão `agendada` do mesmo estagiário ou do mesmo paciente tem `inicio < novoTermino` e `termino > novoInicio`. Como as desigualdades são estritas, uma sessão que termina às 14h50 não conflita com outra que começa às 14h50.

**Dados de teste:** uma sessão existente das 14h00 às 14h50 e as tentativas às 14h30 (bloqueada) e às 14h50 (permitida); um paciente sem estagiário; um estagiário que não é o responsável; um término anterior ao início.

---

## Prontuário (CP6)

### RF66 — Criar e inicializar o prontuário do paciente ([#97](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/97))

**Criação:** automática, na mesma transação do vínculo (RF21). Não há rota própria: o prontuário nasce com a identificação do paciente, do caso, do ciclo de atendimento, do estagiário responsável e do supervisor.

**Fora do Ciclo 3:** o registro da anamnese e do contrato terapêutico foi separado no [RF69](../unidade-2/requisitos/funcionais.md#rf69) em 24/10/2026 e entra no Ciclo 4, depois que a FBr enviar os modelos. No Ciclo 3, a tela do prontuário mostra a identificação e o espaço dos dados iniciais ainda vazio.

| Regra | Critério de aceitação |
| --- | --- |
| A criação acontece só dentro da transação do RF21 | Caso sem estagiário vinculado não tem prontuário |
| Índice único em `(caso_id, ciclo_atendimento)` | Não é criado um segundo prontuário no mesmo ciclo |
| A criação guarda a data/hora e o vínculo que a originou | O prontuário mostra quando e por qual vínculo foi criado |

**Dados de teste:** um caso recém-vinculado; uma tentativa de vincular de novo no mesmo ciclo.

---

## Roteiro da inspeção de design

A inspeção é feita pelo Líder de Feature com o revisor da issue, que nunca pode ser o autor do design. Para cada feature, o resultado é registrado num comentário da issue, usando os itens abaixo:

```text
Inspeção de design — <feature> (#NN)
Data: <dd/mm/aaaa>    Participantes: <Líder>, <revisor>
D1.1 Modelo, diagrama de sequência, rotas e regras revisados: sim | não
D1.2 Classes e relacionamentos usados: <lista>  — consistentes com o modelo de domínio: sim | não
D1.3 Viabilidade técnica: <tecnologias e integrações> · dados de teste: <ok> · riscos: <lista ou "nenhum">
D1.4 Acessibilidade (RNF56–RNF58, quando houver tela pública): <resultado>
D1.5 Segurança e LGPD (RNFs da CP12 aplicáveis): <resultado>
D1.6 Normas do CRP consideradas: <resultado>
D1.7 Modalidade presencial considerada: <resultado>
Resultado: aprovado | aprovado com ajustes | reprovado
Apontamentos: <lista>
```
