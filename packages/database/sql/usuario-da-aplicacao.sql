-- Usuário com que a API se conecta ao banco na implantação (RNF52 e RNF51).
-- As migrations continuam rodando com o dono do banco; a API usa este usuário,
-- que pode ler e gravar os dados, mas só inserir e consultar os registros que
-- não podem mudar: as tabelas com o gatilho impedir_alteracao_registro, como os
-- acessos ao prontuário (RNF52), a auditoria, as evoluções e as decisões de
-- prioridade. Uma tabela nova com esse gatilho entra sozinha.
--
-- Na implantação, o serviço "migrador" roda este script depois das migrations, a
-- cada deploy, e define a senha do clinica_app (CLINICA_APP_SENHA). No
-- desenvolvimento, rode com o dono do banco depois de cada `pnpm db:migrate`.
-- Procedimento: documentacao/docs/unidade-3/seguranca-da-implantacao.md

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'clinica_app') THEN
    CREATE ROLE clinica_app LOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO clinica_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO clinica_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO clinica_app;

-- Registros que só podem ser inseridos e consultados: toda tabela com o gatilho
-- impedir_alteracao_registro. O gatilho já recusa a alteração; aqui, nem a
-- permissão existe.
DO $$
DECLARE
  tabela regclass;
BEGIN
  FOR tabela IN
    SELECT DISTINCT t.tgrelid::regclass
    FROM pg_trigger t
    JOIN pg_proc f ON f.oid = t.tgfoid
    WHERE f.proname = 'impedir_alteracao_registro' AND NOT t.tgisinternal
  LOOP
    EXECUTE format('REVOKE UPDATE, DELETE, TRUNCATE ON %s FROM clinica_app', tabela);
  END LOOP;
END
$$;
