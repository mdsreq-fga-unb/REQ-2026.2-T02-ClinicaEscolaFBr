-- O rascunho do relatório final (RF33) passa a ser de quem o elabora: depois de uma
-- transferência (RF25), o novo estagiário responsável continua o rascunho do anterior e
-- assina a versão que enviar. Enviada, a autoria não muda. As outras regras são as da
-- migration 0024.
CREATE OR REPLACE FUNCTION "proteger_versao_relatorio"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'A versão do relatório final não pode ser apagada (RF33).';
  END IF;
  IF NEW.relatorio_id <> OLD.relatorio_id OR NEW.versao <> OLD.versao
     OR (OLD.estado <> 'rascunho' AND NEW.autor_id <> OLD.autor_id)
     OR NEW.criada_em <> OLD.criada_em THEN
    RAISE EXCEPTION 'A identificação da versão do relatório final não muda (RF33).';
  END IF;
  IF OLD.estado = 'rascunho' AND NEW.estado IN ('rascunho', 'em_revisao') THEN
    RETURN NEW;
  END IF;
  IF OLD.estado = 'em_revisao' AND NEW.estado IN ('aprovado', 'devolvido')
     AND NEW.secoes_cifradas = OLD.secoes_cifradas
     AND NEW.justificativa_excecao_cifrada IS NOT DISTINCT FROM OLD.justificativa_excecao_cifrada
     AND NEW.origem IS NOT DISTINCT FROM OLD.origem
     AND NEW.enviada_em IS NOT DISTINCT FROM OLD.enviada_em
     AND NEW.atualizada_em = OLD.atualizada_em THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'A versão % do relatório final (%) não pode ser alterada (RF33).', OLD.versao, OLD.estado;
END;
$$ LANGUAGE plpgsql;
