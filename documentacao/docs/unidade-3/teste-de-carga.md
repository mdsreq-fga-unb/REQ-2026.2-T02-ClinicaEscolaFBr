# Teste de carga

Procedimento do teste de desempenho do [RNF12](../unidade-2/requisitos/nao-funcionais.md#rnf12) (agendamento em até 2 segundos) e do [RNF21](../unidade-2/requisitos/nao-funcionais.md#rnf21) (listagens, distribuição e vínculo em até 3 segundos), no percentil 95. Os dois são evolutivos: o patamar mínimo do lançamento é a meta verificada uma vez no cenário de referência, **no ambiente de homologação** (ver o [backlog](../unidade-2/requisitos/backlog.md#patamar-minimo-de-lancamento-dos-rnfs-evolutivos)).

## Cenário de referência

- **Carga:** 30 pessoas da equipe usando o sistema ao mesmo tempo, por 10 minutos, cada uma com a sua conta. Um terço é coordenação, que lista e distribui casos; um terço são supervisores, que veem os seus casos e vinculam estagiários; um terço é secretaria, que busca pacientes e agenda sessões.
- **Massa de dados:** dois semestres de operação, com 360 inscrições, 200 pacientes em atendimento e 4.000 sessões, criados pelo `semear-carga`.
- **Ambiente:** a homologação, com a mesma configuração do servidor de produção.

Cada operação tem o seu limite: o RNF só passa se **todas** as operações dele ficarem abaixo do limite no percentil 95 e tiverem acontecido durante a carga. As gravações seguem um ritmo calculado pela duração, para os 160 casos pendentes durarem os 10 minutos inteiros: cada pessoa da coordenação distribui no máximo um caso por intervalo, e cada supervisor vincula no mesmo ritmo.

As operações medidas são as que existem hoje:

- **RNF12:** buscar paciente e agendar sessão (RF10). Remarcar, confirmar presença e cancelar entram quando forem construídos (Ciclo 4).
- **RNF21:** listar casos pendentes, ver a disponibilidade dos supervisores, distribuir (RF18, RF20), ver os próprios casos e vincular estagiário (RF21). A consulta de responsáveis (RF22) entra quando for construída.

## Arquivos

| Arquivo | O que faz |
| --- | --- |
| `apps/api/src/scripts/semear-carga.ts` | Cria a massa de dados fictícia e as 30 contas da carga, com a senha de `SENHA_CARGA`. Recusa `NODE_ENV=production` e exige `AMBIENTE_DE_TESTE=sim`. Não repete a massa se ela já existir. |
| `scripts/carga/rnf12-rnf21.js` | O teste no k6: as 30 pessoas, as operações de cada papel e os limites. Grava o resultado no formato dos relatórios de teste, para o D4.5. |
| Workflow "Carga" | Roda o teste. Sem endereço, sobe a API e o banco no próprio runner, como alerta antecipado (todo dia 1º). Com o endereço da homologação, roda contra ela. |

## Rodar na homologação

1. **Prepare a homologação.** No servidor de homologação, de `apps/api`, depois do build:

    ```bash
    AMBIENTE_DE_TESTE=sim DATABASE_URL=<banco da homologação> CHAVE_DADOS=<a da homologação> SENHA_CARGA=<senha> node dist/scripts/semear-carga.js
    ```

2. **Configure o segredo `SENHA_CARGA`** no repositório (Settings → Secrets → Actions), com a mesma senha.
3. **Rode o workflow "Carga"** na `main` (aba Actions, "Run workflow"):
    - em "api", o endereço da API da homologação;
    - marque "homologacao".
4. **Confira o resultado.** O resumo da execução mostra, para cada operação, a quantidade de requisições e o percentil 95. Quando a execução conta como evidência, a duração é sempre 10 minutos, seja qual for a escolhida. Se os dois limites passarem, o Feature Status marca o RNF12 no RF10 (#96) e o RNF21 no RF18 (#92), com o link da execução.

Uma execução no runner, sem endereço, nunca conta como evidência, porque o runner não é igual ao servidor de produção. Ela serve para avisar cedo se uma mudança deixou alguma operação lenta.

## Resultado local de referência

Na massa de dois semestres, com 30 pessoas por 10 minutos num computador de desenvolvimento, todas as verificações foram aprovadas, e a fila de pendentes durou até o fim (14 casos ainda aguardavam distribuição):

| RNF | Operação | Requisições | Percentil 95 |
| --- | --- | --- | --- |
| RNF12 | Buscar paciente | 2.909 | 15 ms |
| RNF12 | Agendar | 2.909 | 25 ms |
| RNF21 | Listar pendentes | 2.900 | 27 ms |
| RNF21 | Disponibilidade dos supervisores | 2.900 | 11 ms |
| RNF21 | Distribuir | 147 | 21 ms |
| RNF21 | Meus casos | 2.905 | 18 ms |
| RNF21 | Estagiários disponíveis | 124 | 13 ms |
| RNF21 | Vincular | 124 | 19 ms |

Não é evidência, mas mostra uma folga grande em relação às metas.

## Observação da carga sobre a entrada no sistema

Com a mesma conta entrando 3 ou mais vezes **ao mesmo tempo**, algumas tentativas recebem "Acesso bloqueado por 15 minutos", mesmo com a senha certa. O motivo é a proteção do RNF49: cada tentativa é contada antes de a senha ser conferida, para que tentativas simultâneas não passem do limite de 3. O bloqueio dura até a primeira entrada certa terminar. No uso real, só acontece se a mesma pessoa entrar de vários aparelhos no mesmo instante. Por isso, o teste de carga usa uma conta por pessoa. A correção está na issue [#176](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/176).
