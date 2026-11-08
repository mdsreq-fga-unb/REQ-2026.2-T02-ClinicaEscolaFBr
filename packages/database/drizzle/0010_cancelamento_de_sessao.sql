-- Antecedência mínima para cancelar sem falta (RF15, DF20), configurável pela coordenação.
-- A tabela cancelamentos_sessao veio com a 0008, do RF37.
INSERT INTO "parametros" ("chave", "valor") VALUES ('antecedencia_minima_cancelamento_minutos', '60');
