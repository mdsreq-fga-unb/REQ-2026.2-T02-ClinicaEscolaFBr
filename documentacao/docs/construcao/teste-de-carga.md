# Teste de carga

Procedimento do teste de desempenho do [RNF12](../requisitos/nao-funcionais.md#rnf12) (agendamento em até 2 segundos) e do [RNF21](../requisitos/nao-funcionais.md#rnf21) (listagens, distribuição e vínculo em até 3 segundos), no percentil 95, e do [RNF47](../requisitos/nao-funcionais.md#rnf47) (indicadores operacionais em até 5 segundos). Os dois são evolutivos: o patamar mínimo do lançamento é a meta verificada uma vez no cenário de referência, **no ambiente de homologação** (ver o [backlog](../requisitos/priorizacao-e-mvp.md#patamar-minimo-de-lancamento-dos-rnfs-evolutivos)).

## Cenário de referência

- **Carga:** 30 pessoas da equipe usando o sistema ao mesmo tempo, por 10 minutos, cada uma com a sua conta. Um quarto é coordenação, que lista e distribui casos; um quarto são supervisores, que veem os seus casos e vinculam estagiários; um quarto é secretaria, que consulta a lista de Pacientes e os responsáveis pelo caso, busca pacientes e agenda sessões; um quarto são estagiários, que abrem "Meus pacientes".
- **Massa de dados:** dois semestres de operação, com 360 inscrições, 200 pacientes em atendimento e 4.000 sessões, criados pelo `semear-carga`.
- **Ambiente:** a homologação, com a mesma configuração do servidor de produção.

Cada operação tem o seu limite: o RNF só passa se **todas** as operações dele ficarem abaixo do limite no percentil 95 e tiverem acontecido durante a carga, e se pelo menos 99% das verificações das respostas passarem. Sem essa última condição, respostas de erro rápidas puxariam o percentil 95 para baixo. As gravações seguem um ritmo calculado pela duração, para os 160 casos pendentes durarem os 10 minutos inteiros: cada pessoa da coordenação distribui no máximo um caso por intervalo, e cada supervisor vincula no mesmo ritmo.

As operações medidas são as que existem hoje:

- **RNF12:** buscar paciente e agendar sessão (RF10). Remarcar, confirmar presença e cancelar entram quando forem construídos (Ciclo 4).
- **RNF21:** listar casos pendentes, ver a disponibilidade dos supervisores, distribuir (RF18, RF20), ver os próprios casos e vincular estagiário (RF21), a lista de Pacientes e os responsáveis pelo caso (RF22), consultados pela secretaria, e os casos sob a responsabilidade do estagiário ("Meus pacientes") e do supervisor ("Meus casos") (RF23).

### Indicadores operacionais (RNF47)

Depois do cenário de referência, o mesmo workflow roda o RNF47 sobre a mesma massa de dados. A opção `somente_rnf47` roda só o RNF47, sem o cenário de referência antes, para separar o tempo dos indicadores do efeito da carga anterior. Essa execução é só diagnóstico e nunca conta como evidência do D4.5, mesmo contra a homologação: o Feature Status lê só o artefato `rnfs-carga` mais novo da `development`, e um artefato só com o RNF47 apagaria a evidência do RNF12 e do RNF21.

- **Carga:** 10 pessoas da coordenação ao mesmo tempo, por 5 minutos, cada uma com a sua conta, consultando os indicadores do RF48 de um período de 12 meses que termina no dia da consulta, o maior que o RNF47 cobre.
- **Limite:** o RNF47 diz "em até 5 segundos", sem falar em percentil. Por isso, o limite vale para a consulta mais lenta, e não para o percentil 95, e pelo menos 99% das respostas precisam estar certas.
- **Exportação em PDF:** o RNF47 também cobre a exportação do relatório institucional (RF49), que entra no teste quando for construída, no Ciclo 6.

## Arquivos

| Arquivo | O que faz |
| --- | --- |
| `apps/api/src/scripts/semear-carga.ts` | Cria a massa de dados fictícia e as 30 contas da carga, com a senha de `SENHA_CARGA`. Recusa `NODE_ENV=production` e exige `AMBIENTE_DE_TESTE=sim`. Não repete a massa se ela já existir. |
| `scripts/carga/rnf12-rnf21.js` | O teste no k6: as 30 pessoas, as operações de cada papel e os limites. Grava o resultado no formato dos relatórios de teste, para o D4.5. |
| `scripts/carga/rnf47.js` | O teste no k6 do RNF47: as 10 pessoas da coordenação consultando os indicadores de 12 meses, com o limite de 5 segundos. Grava o resultado do mesmo jeito, citando o RF48 e o RNF47. |
| Workflow "Carga" | Roda o teste. Sem endereço, sobe a API e o banco no próprio runner, como alerta antecipado (todo dia 1º). Com o endereço da homologação, roda contra ela. |

## Rodar na homologação

1. **Prepare a homologação.** No servidor de homologação, de `apps/api`, depois do build:

    ```bash
    AMBIENTE_DE_TESTE=sim DATABASE_URL=<banco da homologação> CHAVE_DADOS=<a da homologação> SENHA_CARGA=<senha> node dist/scripts/semear-carga.js
    ```

2. **Configure o segredo `SENHA_CARGA`** no repositório (Settings → Secrets → Actions), com a mesma senha.
3. **Rode o workflow "Carga"** na `development` (aba Actions, "Run workflow"):
    - em "api", o endereço da API da homologação;
    - marque "homologacao".
4. **Confira o resultado.** O resumo da execução mostra, para cada operação, a quantidade de requisições e o percentil 95. Quando a execução conta como evidência, a duração é sempre 10 minutos, seja qual for a escolhida. Se os dois limites e as verificações das respostas passarem, o Feature Status marca o RNF12 no RF10 (#96) e o RNF21 no RF18 (#92), com o link da execução.

O artefato `rnfs-carga`, que o Feature Status lê, só é publicado quando o cenário de referência passa, com o RNF12 e o RNF21 verificados. Assim, uma execução que falha não apaga a evidência anterior. As gravações do cenário consomem os casos pendentes da massa: antes de repetir a evidência na mesma homologação, confira se ainda há casos aguardando distribuição.

Uma execução no runner, sem endereço, nunca conta como evidência, porque o runner não é igual ao servidor de produção. Ela serve para avisar cedo se uma mudança deixou alguma operação lenta.

## Resultado local de referência

!!! note "Resultado local não é evidência"
    Os números abaixo são de um computador de desenvolvimento. A evidência do patamar de lançamento é a execução na homologação, registrada com o ambiente, a massa, o resultado de cada operação e as verificações das respostas em [Verificação dos RNFs](verificacao-rnfs.md#desempenho-na-homologacao).

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

O teste de carga encontrou um erro na entrada, registrado na issue [#176](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/issues/176) e corrigido na PR [#177](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/177): com a mesma conta entrando 3 ou mais vezes **ao mesmo tempo**, algumas tentativas recebiam "Acesso bloqueado por 15 minutos", mesmo com a senha certa. A proteção do RNF49 contava cada tentativa antes de conferir a senha. Com a correção, as entradas além de 3 esperam uma vaga por até 5 segundos, e só a senha errada conta como erro. O teste continua usando uma conta por pessoa, como no uso real.
