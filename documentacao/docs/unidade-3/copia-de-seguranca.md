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
| `fazer-copia.sh` | Faz a cópia completa com `pg_dump`, cifra com `gpg` (AES-256), grava o hash SHA-256 ao lado e apaga as cópias mais antigas que `RETENCAO_DIAS` (padrão: 30). |
| `restaurar-copia.sh` | Confere o hash, decifra e restaura num banco vazio, numa transação só: se algo falhar, nada fica pela metade. Recusa um banco que já tenha tabelas. |
| `conferir-restauracao.sh` | Compara o banco de origem e o restaurado tabela a tabela, pelo número de linhas e por um hash do conteúdo. |

Os scripts precisam do `pg_dump` da mesma versão do servidor, do `gpg` e do `sha256sum`. A imagem `postgres:17`, a mesma do `docker-compose.yml`, tem os três, então os comandos abaixo rodam dentro dela.

**Teste de restauração no CI.** O workflow "Cópia de segurança" roda toda segunda-feira, quando os scripts ou as migrations mudam e manualmente. Ele:

1. enche o banco com o e2e, que passa por todas as features do Ciclo 3;
2. faz a cópia cifrada e restaura num banco vazio, cronometrando;
3. confere tabela a tabela e exige dados nas tabelas principais (usuários, inscrições, triagem, casos, vínculos, prontuários, acessos, sessões e auditoria);
4. aplica as migrations da versão atual no banco restaurado;
5. decifra um dado de saúde restaurado com a `CHAVE_DADOS`;
6. sobe a API com o banco restaurado e faz uma entrada.

O resultado e o tempo da restauração ficam no resumo da execução.

## As duas chaves

Guarde as duas fora do servidor e longe das cópias, por exemplo no cofre de senhas da coordenação, com pelo menos duas pessoas com acesso.

- **`CHAVE_COPIAS`:** a senha que cifra as cópias. Sem ela, nenhuma cópia abre.
- **`CHAVE_DADOS`:** a chave da criptografia dos dados de saúde ([RNF51](../unidade-2/requisitos/nao-funcionais.md#rnf51)). A cópia guarda esses dados ainda cifrados: sem a `CHAVE_DADOS`, a restauração termina, mas a queixa, o histórico, a triagem e o prontuário ficam ilegíveis.

## Fazer a cópia

Na implantação, agende uma vez por dia, de madrugada. Por exemplo, no `cron` do servidor:

```bash
0 3 * * * docker run --rm --network host -v /opt/clinica/scripts:/scripts:ro -v /mnt/copias:/copias -e DATABASE_URL -e CHAVE_COPIAS -e DESTINO_COPIAS=/copias postgres:17 bash /scripts/copia-de-seguranca/fazer-copia.sh
```

`/mnt/copias` deve ser um destino fora do servidor principal, como um disco de rede ou uma pasta sincronizada com um armazenamento externo. Isso depende da hospedagem combinada com a FBr.

No desenvolvimento, com o Postgres do `docker compose`:

```bash
docker run --rm --network req-20262-t02-clinicaescolafbr_default -v "$PWD/scripts:/scripts:ro" -v "$PWD/copias:/copias" -e DATABASE_URL=postgresql://clinica:clinica@postgres:5432/clinica -e CHAVE_COPIAS=uma-senha-de-teste -e DESTINO_COPIAS=/copias postgres:17 bash /scripts/copia-de-seguranca/fazer-copia.sh
```

## Restaurar

Cronometre do primeiro passo até o último: o RNF53 pede no máximo 8 horas a partir da detecção da falha.

1. **Registre a hora da detecção da falha.** A partir daí, a clínica usa o registro manual.
2. **Prepare um banco vazio** no servidor novo ou no de teste (`create database ...`).
3. **Pegue a cópia mais recente** e o arquivo `.sha256` dela no destino das cópias.
4. **Restaure:**

    ```bash
    docker run --rm --network host -v "$PWD/scripts:/scripts:ro" -v /mnt/copias:/copias -e DATABASE_URL=<banco vazio> -e CHAVE_COPIAS postgres:17 bash /scripts/copia-de-seguranca/restaurar-copia.sh /copias/<arquivo>.dump.gpg
    ```

5. **Aplique as migrations** da versão em produção: `DATABASE_URL=<banco restaurado> pnpm db:migrate`.
6. **Configure o `.env`** com o banco restaurado e a **mesma `CHAVE_DADOS`** de antes.
7. **Suba a API e o site** e confira: uma entrada com uma conta da equipe, a lista de casos e um prontuário.
8. **Registre na ata** a hora de volta do serviço, o tempo total, a data da cópia usada e quem fez.

## Teste semestral de restauração

Uma vez por semestre, repita a restauração num ambiente separado, sem tocar no servidor em produção. Siga os passos 2 a 7 e confira o resultado com:

```bash
docker run --rm --network host -v "$PWD/scripts:/scripts:ro" postgres:17 bash /scripts/copia-de-seguranca/conferir-restauracao.sh <banco de origem> <banco restaurado>
```

Se o banco de origem já mudou desde a cópia, confira com uma cópia feita na hora. O resultado e o tempo vão para a ata do teste.

## Verificação do RNF53 (D4.5)

O RNF53 é obrigatório para o MVP e não tem patamar mínimo. O teste do CI mostra que a cópia e a restauração funcionam e que os dados voltam iguais, mas não cobre o que só existe na implantação:

- a cópia diária agendada;
- o destino fora do servidor;
- o histórico de uma cópia por dia;
- a restauração cronometrada em ambiente separado.

Por isso, o D4.5 do RNF53 fecha na implantação. Com o histórico inspecionado e o teste de restauração registrado em ata, alguém comenta `/rnf RNF53 <link da ata>` nas issues das features (convenção em [Boas práticas de utilização do GitHub](../unidade-1/gestao/boas-praticas-github.md#verificacao-dos-rnfs-d45)).
