# Projeto das features do Ciclo 3

Esta página registra o processo **Projetar por Feature** do FDD para as 13 features do Ciclo 3 (o RF19 foi removido em 24/10/2026, por decisão da FBr): o modelo detalhado, os diagramas de sequência, as rotas da API, as regras ligadas aos critérios de aceitação e os dados de teste de cada feature. Ela é o material da **inspeção de design** (marco 1 do [DoD](../unidade-2/requisitos/dor-dod.md#1-design-inspecionado)). O resultado da inspeção de cada feature é registrado na sua issue.

Os requisitos de origem estão na [seção 8.1](../unidade-2/requisitos/funcionais.md), e os itens do ciclo, no [Backlog de Produto](../unidade-2/requisitos/backlog.md#1012-itens-de-trabalho-do-mvp).

## Convenções

- **API:** NestJS, um módulo por área do FDD (`acesso`, `inscricao`, `triagem`, `casos`, `agendamento`, `acompanhamento-clinico`). As rotas internas exigem sessão e usam o `PerfisGuard` com o decorator `@Perfis(...)`. As rotas públicas (inscrição e ativação de conta) não exigem sessão.
- **Banco:** PostgreSQL com Drizzle, em `packages/database`. Os nomes de tabela e coluna seguem o português sem acento, como as tabelas `usuarios` e `auditoria` da base técnica.
- **Validação:** esquemas Zod em `packages/shared`, usados tanto pela API quanto pela interface.
- **Auditoria:** toda operação que altera dados relevantes chama o `AuditoriaService`, que grava na tabela `auditoria` (somente inserção) o autor, a operação, a entidade, o estado anterior e o novo.
- **Datas:** gravadas com fuso horário (`timestamptz`) e exibidas no horário de Brasília.
- **Criptografia em repouso (RNF51):** os dados de saúde (queixa, percepção de urgência, histórico, prioridade clínica e dados iniciais do prontuário) ficam em colunas `*_cifrada`, cifradas com AES-256-GCM pela aplicação (`apps/api/src/common/criptografia.ts`). A chave fica na variável `CHAVE_DADOS`, fora do banco e do repositório. Como a cor fica cifrada, as listas ordenadas pela prioridade (RF18) são ordenadas na aplicação, depois de decifrar.
- **Dados de teste:** sempre fictícios. Nenhum dado real de paciente entra no repositório, no banco de desenvolvimento ou em prints.

## Modelo detalhado do Ciclo 3

O diagrama reúne as classes usadas pelas 13 features e já reflete as decisões da reunião com a FBr de 23/10/2026 ([Registro de Decisões](../unidade-2/requisitos/decisoes-fbr.md)). Ele detalha o [modelo de domínio](../unidade-2/requisitos/funcionais.md) de cada CP no nível de implementação.

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
      +string queixaCifrada
      +string percepcaoUrgenciaCifrada
      +string historicoRelevanteCifrado
      +datetime criadaEm
    }
    class DecisaoPrioridade {
      +uuid id
      +string corCifrada
      +datetime decididaEm
      +bool vigente
    }
    class Caso {
      +uuid id
      +SituacaoCaso situacao
      +int cicloAtendimento
    }
    class AtribuicaoSupervisor {
      +uuid id
      +datetime atribuidoEm
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
      +string anamneseCifrada
      +string contratoCifrado
      +date dataAssinaturaContrato
    }
    class SessaoAtendimento {
      +uuid id
      +datetime inicio
      +datetime termino
      +datetime fimIntervaloAnotacoes
      +StatusSessao status
      +datetime mensagemWhatsappEm
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
    DecisaoPrioridade "0..*" --> "1" Usuario : decidida por
    Inscricao "1" --> "0..1" Caso
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
- `Canal`: email, whatsapp, ligacao. O SMS não é usado ([DF24](../unidade-2/requisitos/decisoes-fbr.md)); WhatsApp e ligação exigem o celular.
- `Cor`: vermelha, amarela, verde.
- `SituacaoCaso`: aguardando_distribuicao, aguardando_vinculo, em_atendimento, encerrado.
- `StatusSessao`: agendada (os demais status entram com o RF14, o RF15 e o RF16 no Ciclo 4).

**Restrições de integridade no banco** (RNF19, RNF9):

- No máximo uma `DecisaoPrioridade` vigente por inscrição, uma `AtribuicaoSupervisor` vigente por caso e um `VinculoEstagiario` vigente por caso. São índices únicos parciais `WHERE vigente`.
- Um `Prontuario` por caso e ciclo de atendimento: índice único em `(caso_id, ciclo_atendimento)`.
- `SessaoAtendimento.termino` maior que `inicio` e `fimIntervaloAnotacoes` igual ou maior que `termino`, garantidos por restrições `CHECK`.

**Parâmetros iniciais** (tabela `parametros`, alterados pela coordenação):

| Chave | Valor padrão | Usado em |
| --- | --- | --- |
| `duracao_sessao_minutos` | 50 | RF10 |
| `intervalo_anotacoes_minutos` | 10 | RF10 |
| `limite_casos_supervisor` | 50 | RF20 |
| `validade_convite_horas` | 72 | RF53 |

---

## Acesso e segurança (CP12)

### RF50 — Autenticar usuário institucional ([#45](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/45))

**Rotas:**
- `POST /auth/login` (pública): recebe e-mail e senha e devolve um cookie de sessão `httpOnly`.
- `POST /auth/logout`.

O `SessaoGuard` valida a sessão em cada requisição e preenche `req.usuario`, que o `PerfisGuard` já usa. A cada requisição válida, ele renova `expiraEm` para 30 minutos depois, e a sessão parada por 30 minutos expira (RNF50). O cookie é `httpOnly`, `Secure` e `SameSite=Lax`, e só o hash do token fica no banco.

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
        A->>DB: soma tentativa falha (bloqueia por 15 min na 3ª, RNF49)
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
| Contador `tentativasFalhas` e `bloqueadoAte` no usuário ([DF25](../unidade-2/requisitos/decisoes-fbr.md)) | Na 3ª tentativa seguida com erro, o acesso fica bloqueado por 15 minutos |
| O menu e as rotas são filtrados pelo perfil (`PerfisGuard`) | Usuário ativo vê apenas as funcionalidades do seu perfil |

**Dados de teste:** um usuário de cada perfil, ativo; um desativado; um pendente de ativação; um com 2 tentativas falhas (para testar o bloqueio na 3ª).

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
- **O que entra agora:** a regra de acesso protege o prontuário criado pelo RF66; os dados iniciais (RF69) entram no Ciclo 4 sob a mesma regra.
- **O que entra depois:** a mesma política passa a valer para a evolução (CP7, a partir do Ciclo 4). O critério da transferência entre estagiários é verificado quando a transferência (RF25) for construída, no Ciclo 4, e a política passa a proteger também o relatório final (RF33) no Ciclo 6.

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
        A->>DB: cifra a queixa, a urgência e o histórico, grava a inscrição e gera o número único
        A-->>W: 201 com número, data e hora
        W-->>I: confirmação e comprovante (RF2)
    end
```

| Regra | Critério de aceitação |
| --- | --- |
| O mesmo esquema Zod é usado na interface e na API | Envio com campo obrigatório vazio é bloqueado, e os dados são mantidos |
| A idade é calculada a partir da data de nascimento, e o responsável legal é obrigatório para menores de 18 anos | Menor de idade sem responsável legal é bloqueado |
| Pelo menos um contato (celular ou e-mail) e o canal preferencial (e-mail, WhatsApp ou ligação) são obrigatórios; WhatsApp e ligação exigem o celular | Formato validado, um contato exigido e o preferencial registrado |
| CPF com 11 números; RG como texto livre, como está no documento, sem órgão emissor e sem upload | Nenhum envio de cópia do documento |
| A API só grava com `confirmado: true` | Sem confirmação, a solicitação não é registrada |
| Número no formato `AAAA-NNNNN`, com o ano do registro e a sequência `inscricoes_numero_seq`, que não reinicia a cada ano | Cada inscrição recebe um número único, como "2026-00487" |
| Queixa, urgência e histórico são cifrados antes de gravar (RNF51) | Nenhum desses campos aparece legível no banco |
| A interface só mostra a confirmação após a resposta 201 | Nenhuma confirmação sem registro efetivo |
| Componente `AvisoEmergencia` fixo no layout do formulário | Aviso do CVV e do SAMU em todas as etapas |

**Dados de teste:** um adulto com e-mail como canal preferencial; um menor com responsável legal, só celular e WhatsApp como canal; uma inscrição com ligação como canal e sem celular (recusada); uma inscrição com CPF em formato inválido; um RG com letra ("12.345.678-X").

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

**Rota:** `GET /triagem/inscricoes` (supervisor e coordenação). Devolve as inscrições sem decisão de prioridade vigente, com o campo calculado `diasAguardando` (dias desde `criadaEm`), e aceita ordenação por esse campo. A FBr não adota prazo de triagem ([DF19](../unidade-2/requisitos/decisoes-fbr.md)), então não há sinal de "além do prazo".

```mermaid
sequenceDiagram
    actor S as Supervisor ou coordenação
    participant A as API (triagem)
    participant DB as Banco
    S->>A: GET /triagem/inscricoes
    A->>DB: inscrições sem decisão vigente
    A->>A: calcula diasAguardando e deixa os campos vazios como ausentes
    alt não há inscrições aguardando
        A-->>S: lista vazia, e a tela informa que não há pendências
    else há inscrições
        A-->>S: número, queixa, urgência, histórico (como declaração do interessado) e os dias aguardando
    end
```

| Regra | Critério de aceitação |
| --- | --- |
| `@Perfis('supervisor','coordenacao')` | Usuários sem autorização não veem as respostas |
| Campo vazio é enviado como `null`, e a interface mostra "não informado" | Campo sem resposta aparece como ausente |
| As respostas aparecem num bloco "Declarado pelo interessado", separado da decisão da equipe | Declaração separada da avaliação da equipe |
| `diasAguardando` calculado a partir de `criadaEm` | Cada inscrição mostra há quantos dias aguarda, sem sinal de prazo |

**Dados de teste:** uma inscrição de hoje; uma de 8 dias atrás sem triagem (aparece com 8 dias aguardando, sem sinal de prazo); uma inscrição legada com o histórico vazio.

### RF6 — Registrar prioridade clínica do inscrito ([#91](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/91))

**Rota:** `POST /triagem/inscricoes/:id/prioridade` (supervisor e coordenação). Recebe a cor. A primeira decisão cria o `Caso` com a situação `aguardando_distribuicao`.

```mermaid
sequenceDiagram
    actor S as Supervisor ou coordenação
    participant A as API (triagem)
    participant DB as Banco
    S->>A: POST prioridade com a cor
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

**Dados de teste:** uma inscrição sem decisão; uma com decisão amarela que muda para vermelha; uma secretaria tentando registrar (recebe 403).

---

## Distribuição de casos (CP5)

### RF18 — Listar casos aguardando distribuição ([#92](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/92))

**Rota:** `GET /casos/aguardando-distribuicao` (coordenação e supervisor). Devolve os casos com a situação `aguardando_distribuicao`, ordenados pela cor (vermelha, amarela, verde, decifrada na aplicação) e pela data da inscrição, da mais antiga para a mais recente. Cada item traz só o número da inscrição, o nome, a cor e a data.

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

**Removido em 24/10/2026.** A FBr não divide os atendimentos por área de especialidade ([DF26](../unidade-2/requisitos/decisoes-fbr.md)). Não há rotas nem tabelas de áreas no Ciclo 3.

### RF20 — Distribuir caso a supervisor ([#94](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/94))

**Rotas:**
- `GET /supervisores/disponibilidade` (coordenação): devolve os supervisores ativos com a contagem de casos ativos (com atribuição vigente e situação diferente de `encerrado`) e o parâmetro `limite_casos_supervisor` (padrão de 50).
- `POST /casos/:id/supervisor` (coordenação): recebe o supervisor.

```mermaid
sequenceDiagram
    actor C as Coordenação
    participant A as API (casos)
    participant DB as Banco
    C->>A: GET /supervisores/disponibilidade
    A-->>C: supervisores com "casos ativos de limite"
    C->>A: POST /casos/:id/supervisor
    A->>DB: busca a atribuição vigente e conta os casos ativos do supervisor
    alt o caso já tem supervisor
        A-->>C: 409 use a transferência de caso (RF25)
    else supervisor no limite de casos
        A-->>C: 422 limite de casos atingido
    else supervisor abaixo do limite
        A->>DB: AtribuicaoSupervisor vigente com autor e data e situação aguardando_vinculo
        A->>DB: auditoria (RNF18)
        A-->>C: caso distribuído
    end
```

| Regra | Critério de aceitação |
| --- | --- |
| A contagem e a atribuição acontecem na mesma transação, com bloqueio da linha do supervisor | Supervisor no limite não recebe novo caso, mesmo com duas distribuições simultâneas |
| Limite vindo do parâmetro `limite_casos_supervisor` ([DF17](../unidade-2/requisitos/decisoes-fbr.md)) | A lista mostra "12 de 50" e o motivo quando o supervisor está no limite |
| `@Perfis('coordenacao')` | Usuário sem perfil de coordenação não distribui casos |

**Dados de teste:** um supervisor com 12 casos; um supervisor com 50 casos (no limite); todos os supervisores no limite (mensagem de nenhum disponível); um caso já distribuído.

### RF21 — Vincular paciente a estagiário responsável ([#95](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/95))

**Rota:** `POST /casos/:id/estagiario` (supervisor responsável pelo caso). Mostra como opções apenas estagiários com a situação `ativo`. O vínculo e a criação do prontuário (RF66) acontecem na mesma transação. O caso tem um único estagiário responsável vigente, garantido por índice único parcial; os estagiários de apoio só observam e não são vinculados ([DF27](../unidade-2/requisitos/decisoes-fbr.md)).

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

**Rota:** `POST /sessoes` (secretaria, ou o estagiário responsável pelo caso). Recebe o caso, o início e, opcionalmente, o término. Sem término, ele é calculado com o parâmetro `duracao_sessao_minutos` (padrão de 50). O fim do intervalo para anotações é `termino + intervalo_anotacoes_minutos` (padrão de 10) ([DF18](../unidade-2/requisitos/decisoes-fbr.md)).

**Escopo no Ciclo 3:** o agendamento gera o link de confirmação. Com e-mail como canal preferencial, a API envia o link por e-mail; com WhatsApp ou ligação, a resposta traz a mensagem pronta e o endereço `https://wa.me/55<celular>?text=<mensagem>`, e a interface mostra o botão "Enviar pelo WhatsApp", que chama `POST /sessoes/:id/whatsapp` para registrar `mensagemWhatsappEm` ([DF24](../unidade-2/requisitos/decisoes-fbr.md)). O SMS não é usado. A página que confirma a presença entra com o RF14, no Ciclo 4.

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
        alt canal preferencial e-mail
            A->>M: envia o link de confirmação de presença
            A-->>U: sessão agendada, link enviado por e-mail
        else canal WhatsApp ou ligação
            A-->>U: sessão agendada, com a mensagem pronta e o endereço do WhatsApp
        end
    end
```

**Garantia no banco (RNF9):** além da verificação na API, duas restrições de exclusão na tabela `sessoes_atendimento` impedem a sobreposição mesmo com duas requisições simultâneas; a API traduz a violação em 409.

**Regra de sobreposição:** para o mesmo estagiário, existe conflito quando outra sessão `agendada` tem `inicio < novoFimIntervalo` e `fimIntervaloAnotacoes > novoInicio`; para o mesmo paciente, quando `inicio < novoTermino` e `termino > novoInicio`. Como as desigualdades são estritas, uma sessão do estagiário das 14h00 às 14h50, com anotações até as 15h00, não conflita com outra que começa às 15h00.

**Dados de teste:** uma sessão existente das 14h00 às 14h50, com anotações até as 15h00, e as tentativas do mesmo estagiário às 14h50 (bloqueada) e às 15h00 (permitida); um paciente com e-mail e outro com WhatsApp como canal; um paciente sem estagiário; um estagiário que não é o responsável; um término anterior ao início.

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
