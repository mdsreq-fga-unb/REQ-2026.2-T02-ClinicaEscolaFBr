# Segurança da implantação

Procedimentos de segurança que só se completam com o sistema publicado, exigidos pelo [RNF51](../unidade-2/requisitos/nao-funcionais.md#rnf51) (criptografia dos dados) e pelo [RNF52](../unidade-2/requisitos/nao-funcionais.md#rnf52) (registro de acessos ao prontuário). A parte que dá para testar sem o sistema publicado já é verificada no CI. O restante é conferido na homologação e na produção, e a evidência entra nas issues com `/rnf`.

A cópia de segurança (RNF53) tem a sua própria página, "Cópia de segurança e restauração", criada na [#172](https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr/pull/172).

## O que o CI já verifica

| Verificação | Onde | RNF |
| --- | --- | --- |
| Dados de saúde gravados cifrados e legíveis só com a chave | Testes da API que citam o RNF51 | RNF51 |
| Nenhuma chave, senha ou token no repositório, em todo o histórico | Workflow "Segredos" (gitleaks, com as exceções do `.gitleaks.toml`) | RNF51 |
| Troca da chave sem perda de dados, inclusive nas tabelas que só aceitam inserção, registrada com o responsável | `troca-de-chave.spec.ts` | RNF51 |
| Registros de acesso ao prontuário gravados, sem poder ser alterados nem apagados | Testes da API que citam o RNF52 | RNF52 |
| Usuário da aplicação no banco só insere e consulta os registros que não podem mudar | `usuario-da-aplicacao.spec.ts` | RNF52 |

## Usuário da aplicação no banco (RNF52)

As migrations rodam com o dono do banco. A API se conecta com outro usuário, o `clinica_app`, que lê e grava os dados, mas só **insere e consulta** os acessos ao prontuário, a auditoria, as evoluções e as decisões de prioridade.

1. Depois de cada `pnpm db:migrate`, rode o script com o dono do banco, para as permissões valerem também nas tabelas novas:

    ```bash
    psql "$DATABASE_URL" -f packages/database/sql/usuario-da-aplicacao.sql
    ```

2. Na primeira vez, defina a senha do `clinica_app` fora do repositório: `ALTER ROLE clinica_app PASSWORD '...';`.
3. No `.env` da API em produção, use o `clinica_app` no `DATABASE_URL`. O dono do banco fica só para as migrations.
4. **Evidência:** a saída de `\dp acessos_prontuario` no `psql`, mostrando só `a` (inserir) e `r` (consultar) para o `clinica_app`. Registre com `/rnf RNF52 <link>` nas issues do RF55 e do RF66. A consulta dos registros pela coordenação (RF56) completa o RNF52 quando for construída.

A suíte e2e já foi rodada com a API conectada como `clinica_app`, sem erro de permissão.

## HTTPS e TLS (RNF51)

Depois de cada implantação, rode o workflow **Verificar implantação** (aba Actions, "Run workflow"), com o domínio publicado. Ele confere que:

- o acesso por HTTP é redirecionado para HTTPS;
- o TLS 1.2 ou superior é aceito;
- o TLS 1.0 e 1.1 são recusados;
- o certificado é válido para o domínio.

O mesmo script roda no terminal: `bash scripts/implantacao/verificar-https.sh <domínio>`.

## Gestão e troca da chave dos dados (RNF51)

- **Onde fica a chave:** a `CHAVE_DADOS` fica só no `.env` do servidor ou num cofre de segredos, nunca no repositório (o workflow "Segredos" confere) e nunca no banco. Só o responsável técnico designado pela FBr tem acesso.
- **Troca:** pelo menos uma vez por ano, e na hora se houver suspeita de vazamento. Faça na homologação antes da produção:
    1. Gere a chave nova com o comando do Passo 7 do README.
    2. Pare a API, para nada ser gravado durante a troca.
    3. Rode, de `apps/api`, depois do build:

        ```bash
        DATABASE_URL=<dono do banco> CHAVE_DADOS_ANTIGA=<atual> CHAVE_DADOS_NOVA=<nova> RESPONSAVEL="Nome" node dist/scripts/trocar-chave-dados.js
        ```

        A troca é feita numa transação só: se algum valor não decifrar com a chave antiga, nada é alterado. Ela fica registrada na auditoria (`trocar_chave_dados`), com a data, o responsável, as colunas e a quantidade de valores, sem nenhum dado.
    4. Troque a `CHAVE_DADOS` do `.env` pela nova, suba a API e abra um prontuário para conferir que os dados continuam legíveis.
    5. Guarde a chave nova junto da cópia das chaves, como diz a página da cópia de segurança. As cópias de segurança anteriores continuam com a chave antiga: guarde-a até elas expirarem.

## Evidência do RNF51 e do RNF52 no D4.5

Nas issues, o RNF51 e o RNF52 só ficam verificados com os testes **e** o registro da implantação (convenção em [Boas práticas de utilização do GitHub](../unidade-1/gestao/boas-praticas-github.md#verificacao-dos-rnfs-d45)). Na implantação, registre numa ata, ou num comentário com os links:

- **RNF51:** a execução do "Verificar implantação", a do "Segredos" na `main` e a troca de chave feita na homologação. Comente `/rnf RNF51 <link>` nas issues que têm o RNF51.
- **RNF52:** as permissões do `clinica_app` e a consulta do RF56. Comente `/rnf RNF52 <link>`.
