-- Usuário com que a API se conecta ao banco na implantação (RNF52 e RNF51).
-- As migrations continuam rodando com o dono do banco; a API usa este usuário,
-- que pode ler e gravar os dados, mas só inserir e consultar os registros que
-- não podem mudar: os acessos ao prontuário (RNF52), a auditoria, as evoluções e
-- as decisões de prioridade.
--
-- Rode com o dono do banco depois de cada `pnpm db:migrate`, para valer também
-- nas tabelas novas. A senha é definida à parte, fora do repositório:
--   ALTER ROLE clinica_app PASSWORD '...';
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

-- Registros que só podem ser inseridos e consultados. Os gatilhos das migrations
-- já recusam a alteração; aqui, nem a permissão existe.
REVOKE UPDATE, DELETE, TRUNCATE
  ON acessos_prontuario, auditoria, evolucoes, decisoes_prioridade
  FROM clinica_app;
