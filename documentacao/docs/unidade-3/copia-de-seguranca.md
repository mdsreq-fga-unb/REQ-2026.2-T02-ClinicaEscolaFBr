# Cópia de segurança e restauração

Procedimento da cópia de segurança e da restauração dos dados, exigido pelo [RNF53](../unidade-2/requisitos/nao-funcionais.md#rnf53). O RNF53 pede:

- uma cópia completa por dia, para que uma falha perca no máximo 24 horas de registros;
- a volta do serviço com os dados da última cópia em até 8 horas depois da detecção da falha;
- cópias cifradas e guardadas fora do servidor principal;
- a restauração testada pelo menos uma vez por semestre, seguindo um procedimento documentado, que é esta página.

## O que já está pronto

Os scripts ficam em `scripts/copia-de-seguranca/`:

| Script | O que faz |
| --- | --- |
| `fazer-copia.sh` | Faz a cópia completa de um ambiente com `pg_dump`, cifra com a chave pública do `gpg`, grava o hash SHA-256 ao lado, apaga as cópias do ambiente mais antigas que `RETENCAO_DIAS` (padrão: 30) e registra cada execução, com sucesso ou falha, no `copias-<ambiente>.log`. As cópias e o log só podem ser lidos pelo dono (`umask 077`). |
| `restaurar-copia.sh` | Confere o ambiente e o hash, decifra e restaura num banco vazio, numa transação só: se algo falhar, nada fica pela metade. Recusa a cópia de outro ambiente e um banco que já tenha tabelas. |
| `conferir-restauracao.sh` | Compara o banco de origem e o restaurado, no mesmo servidor, tabela a tabela, pelo número de linhas e por um hash do conteúdo. |
| `comum.sh` | O acesso ao banco dos três, sempre sem a senha na linha de comando. |

**Acesso ao banco.** Na VPS, os scripts rodam no host e usam `CONTEINER_BANCO=banco-<uuid>`: os comandos do Postgres rodam dentro do contêiner do banco, pelo socket, sem senha nenhuma e com o `pg_dump` da mesma versão do servidor. O host tem o `gpg` e o `sha256sum`. Fora da VPS, eles usam as variáveis padrão do Postgres (`PGHOST`, `PGUSER`, `PGDATABASE` e a senha em `PGPASSWORD` ou num `PGPASSFILE` com permissão 0600), nunca uma URL com a senha, que apareceria no `ps` e no histórico do shell.

**Teste de restauração no CI.** O workflow "Cópia de segurança" roda quando os scripts ou as migrations mudam, manualmente e toda segunda-feira. O agendamento semanal só começa depois da primeira PR `main <- development`, porque o GitHub roda o `schedule` pela branch padrão. O workflow:

1. enche o banco com o e2e, que passa por todas as features do Ciclo 3;
2. cria um par de chaves do `gpg` só para o teste;
3. faz a cópia cifrada, conferindo a permissão 0600 e o registro no log;
4. restaura num banco vazio, cronometrando;
5. confere tabela a tabela e exige dados nas tabelas principais (usuários, inscrições, triagem, casos, vínculos, prontuários, acessos, sessões e auditoria);
6. aplica as migrations e as permissões do `clinica_app` no banco restaurado, como o migrador da implantação;
7. decifra um dado de saúde restaurado com a `CHAVE_DADOS`;
8. sobe a API com o banco restaurado, conectada como `clinica_app` quando ele existe, e faz uma entrada.

O resultado e o tempo da restauração ficam no resumo da execução. O workflow usa a imagem `postgres:17.10`, fixada.

## As chaves

São duas, e cada ambiente (produção e validação) tem a sua `CHAVE_DADOS`:

- **Chave das cópias:** um par de chaves do `gpg`. A VPS guarda só a **chave pública**, que cifra as cópias e não abre nenhuma: quem invadir o servidor não lê as cópias. A **chave privada**, protegida por senha, fica fora do servidor e longe das cópias, e só entra numa máquina na hora de restaurar.
- **`CHAVE_DADOS`:** a chave da criptografia dos dados de saúde ([RNF51](../unidade-2/requisitos/nao-funcionais.md#rnf51)). A cópia guarda esses dados ainda cifrados: sem a `CHAVE_DADOS` do ambiente, a restauração termina, mas a queixa, o histórico, a triagem e o prontuário ficam ilegíveis. Por isso, a cópia de um ambiente não serve no outro. **Depois de uma troca da `CHAVE_DADOS`** (página "Segurança da implantação", da [#174](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/174)), guarde também a chave antiga até a última cópia feita antes da troca expirar: sem ela, essas cópias ficam ilegíveis.

**Quem guarda a chave privada das cópias e a cópia das `CHAVE_DADOS` ainda precisa ser decidido com a FBr.** Um cofre da coordenação, com pelo menos duas pessoas, garante que as chaves não se percam; acesso só do responsável técnico designado pela FBr reduz quem pode ler os dados. A pergunta vai para a reunião de 06/11.

Para criar o par de chaves, fora da VPS:

```bash
gpg --quick-gen-key "Cópias da Clínica Escola FBr <copias-clinica@fbr.edu.br>" default default never
gpg --armor --export copias-clinica@fbr.edu.br > copias-publica.asc
gpg --armor --export-secret-keys copias-clinica@fbr.edu.br > copias-privada.asc
```

Leve só o `copias-publica.asc` para a VPS e importe no `gpg` do `root`: `gpg --import copias-publica.asc`. Guarde o `copias-privada.asc` com as outras chaves, fora do servidor.

## Fazer a cópia

Na VPS, copie a pasta `scripts/copia-de-seguranca/` para `/opt/clinica/scripts/` e agende uma cópia por dia **para cada banco**, de madrugada, no `cron` do `root`. O `banco-<uuid>` é o contêiner do banco de cada recurso no Coolify:

```bash
0 3 * * * CONTEINER_BANCO=banco-<uuid da produção> AMBIENTE=producao DESTINATARIO_COPIAS=copias-clinica@fbr.edu.br DESTINO_COPIAS=/mnt/copias/producao bash /opt/clinica/scripts/copia-de-seguranca/fazer-copia.sh >> /var/log/clinica-copias.log 2>&1
30 3 * * * CONTEINER_BANCO=banco-<uuid da validação> AMBIENTE=validacao DESTINATARIO_COPIAS=copias-clinica@fbr.edu.br DESTINO_COPIAS=/mnt/copias/validacao bash /opt/clinica/scripts/copia-de-seguranca/fazer-copia.sh >> /var/log/clinica-copias.log 2>&1
```

- **Destino:** `/mnt/copias` deve ficar fora do servidor principal, como um disco de rede ou uma pasta sincronizada com um armazenamento externo. Isso depende da hospedagem combinada com a FBr.
- **Falhas:** cada execução deixa uma linha no `copias-<ambiente>.log` da pasta das cópias, com `ok` ou `FALHOU`. Confira o log toda semana e, se o servidor tiver e-mail configurado, ponha o `MAILTO` no `cron`, para a falha chegar a alguém. O histórico do log é a evidência de uma cópia por dia.

No desenvolvimento, com o Postgres do `docker compose`, sem a senha na linha de comando:

```bash
CONTEINER_BANCO=<contêiner do postgres> AMBIENTE=desenvolvimento DESTINATARIO_COPIAS=<sua chave> DESTINO_COPIAS=./copias bash scripts/copia-de-seguranca/fazer-copia.sh
```

## Restaurar

Cronometre do primeiro passo até o último: o RNF53 pede no máximo 8 horas a partir da detecção da falha. Na VPS, com o recurso do ambiente no Coolify:

1. **Registre a hora da detecção da falha.** A partir daí, a clínica usa o registro manual.
2. **Pare a API e o site**, deixando o banco no ar: `docker stop api-<uuid> web-<uuid>`.
3. **Recrie o banco vazio:**

    ```bash
    docker exec banco-<uuid> dropdb -U clinica clinica
    docker exec banco-<uuid> createdb -U clinica clinica
    ```

4. **Pegue a cópia mais recente do ambiente** e o arquivo `.sha256` dela no destino das cópias.
5. **Restaure**, com a chave privada num `gpg` temporário, apagado logo depois:

    ```bash
    export GNUPGHOME=$(mktemp -d) && gpg --import copias-privada.asc
    CONTEINER_BANCO=banco-<uuid> AMBIENTE=producao bash /opt/clinica/scripts/copia-de-seguranca/restaurar-copia.sh /mnt/copias/producao/<arquivo>.dump.gpg
    rm -rf "$GNUPGHOME" copias-privada.asc
    ```

    O `gpg` pede a senha da chave privada. As permissões não voltam com a cópia.
6. **Faça o redeploy do recurso no Coolify.** O migrador aplica as migrations da versão em uso e as permissões do `clinica_app`, e a API sobe com a **mesma `CHAVE_DADOS`** de antes, que continua nas variáveis do ambiente.
7. **Confira:** uma entrada com uma conta da equipe, a lista de casos e um prontuário.
8. **Registre na ata** a hora de volta do serviço, o tempo total, a data da cópia usada e quem fez.

Se a VPS inteira se perder, suba o recurso num servidor novo pelo Coolify, com as mesmas variáveis. O migrador cria as tabelas no primeiro deploy, então recrie o banco vazio (passo 3) antes de restaurar.

## Teste semestral de restauração

Uma vez por semestre, repita a restauração sem tocar no banco em uso: faça uma cópia na hora, restaure num banco separado do mesmo servidor e compare com o original.

```bash
CONTEINER_BANCO=banco-<uuid> AMBIENTE=producao DESTINATARIO_COPIAS=copias-clinica@fbr.edu.br DESTINO_COPIAS=/mnt/copias/producao bash /opt/clinica/scripts/copia-de-seguranca/fazer-copia.sh
docker exec banco-<uuid> createdb -U clinica clinica_restaurada
export GNUPGHOME=$(mktemp -d) && gpg --import copias-privada.asc
CONTEINER_BANCO=banco-<uuid> PGDATABASE=clinica_restaurada AMBIENTE=producao bash /opt/clinica/scripts/copia-de-seguranca/restaurar-copia.sh /mnt/copias/producao/<arquivo>.dump.gpg
CONTEINER_BANCO=banco-<uuid> bash /opt/clinica/scripts/copia-de-seguranca/conferir-restauracao.sh clinica clinica_restaurada
docker exec banco-<uuid> dropdb -U clinica clinica_restaurada
rm -rf "$GNUPGHOME" copias-privada.asc
```

Com a clínica em uso, o banco original pode mudar entre a cópia e a conferência: faça o teste fora do horário de atendimento. O resultado da conferência e o tempo da restauração vão para a ata do teste.

## Verificação do RNF53 (D4.5)

O RNF53 é obrigatório para o MVP e não tem patamar mínimo. O teste do CI mostra que a cópia e a restauração funcionam e que os dados voltam iguais, mas não cobre o que só existe na implantação:

- a cópia diária agendada;
- o destino fora do servidor;
- o histórico de uma cópia por dia;
- a restauração cronometrada em ambiente separado.

Por isso, o D4.5 do RNF53 fecha na implantação. Com o histórico inspecionado e o teste de restauração registrado em ata, alguém comenta `/rnf RNF53 <link da ata>` nas issues das features (convenção em [Boas práticas de utilização do GitHub](../unidade-1/gestao/boas-praticas-github.md#verificacao-dos-rnfs-d45)).
