"""Testes da sincronização do catálogo com o GitHub (documentacao/macros/catalogo.py).

Não acessam a rede: as funções recebem os dados das issues e dos milestones prontos.
Rodam no docs-check: python documentacao/scripts/testar_sincronizacao.py
"""

import copy
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "macros"))

import catalogo  # noqa: E402


def issue(numero, estado, nivel="###", atualizada="2026-11-20T12:00:00Z"):
    corpo = f"### Objetivo\n\nTexto.\n\n{nivel} Estado da feature (FDD)\n\n{estado}\n\n### DoR\n"
    return {"number": numero, "body": corpo, "updated_at": atualizada}


class EstadoDaIssue(unittest.TestCase):
    def test_titulo_com_tres_ou_dois_sustenidos(self):
        self.assertEqual(catalogo.estado_da_issue("### Estado da feature (FDD)\n\nAceita"), "Aceita")
        self.assertEqual(catalogo.estado_da_issue("## Estado da feature (FDD)\n\nAceita"), "Aceita")

    def test_valor_que_nao_e_marco_e_ignorado(self):
        self.assertIsNone(catalogo.estado_da_issue("### Estado da feature (FDD)\n\n_No response_"))
        self.assertIsNone(catalogo.estado_da_issue("Sem a seção"))
        self.assertIsNone(catalogo.estado_da_issue(None))


class SituacaoDosCiclos(unittest.TestCase):
    def test_fechado_em_andamento_e_aguardando(self):
        milestones = [
            {"title": "Ciclo 4 — Continuação", "state": "closed"},
            {"title": "Ciclo 6 — Conclusão", "state": "open"},
            {"title": "Ciclo 5 — Consolidação", "state": "open"},
            {"title": "Unidade 3 — Entrega", "state": "open"},
        ]
        self.assertEqual(
            catalogo.situacao_dos_ciclos(milestones),
            {4: "Encerrado", 5: "Em andamento", 6: "Aguardando"},
        )

    def test_sem_milestone_aberto(self):
        self.assertEqual(catalogo.situacao_dos_ciclos([{"title": "Ciclo 3", "state": "closed"}]), {3: "Encerrado"})


class AplicarGithub(unittest.TestCase):
    def setUp(self):
        self.dados = {
            "rfs": [
                {"id": "RF1", "issue": 1, "estado": "Código concluído"},
                {"id": "RF2", "issue": 2, "estado": "Código concluído"},
                {"id": "RF3", "issue": 3, "estado": "Demonstrada"},
                {"id": "RF4", "estado": "Planejada"},
            ],
            "ciclos": [{"numero": 4, "status": "Em andamento"}, {"numero": 5, "status": "Aguardando"}],
        }

    def test_vale_o_marco_mais_adiantado(self):
        dados = copy.deepcopy(self.dados)
        issues = [
            issue(1, "Aceita"),
            issue(2, "Planejada"),  # a issue atrasada não faz o catálogo voltar
            issue(3, "Aceita", nivel="##"),
            {"number": 9, "body": "", "pull_request": {}},
        ]
        milestones = [{"title": "Ciclo 4", "state": "closed"}, {"title": "Ciclo 5", "state": "open"}]
        mudancas = catalogo.aplicar_github(dados, issues, milestones)
        estados = {r["id"]: r["estado"] for r in dados["rfs"]}
        self.assertEqual(estados, {"RF1": "Aceita", "RF2": "Código concluído", "RF3": "Aceita", "RF4": "Planejada"})
        self.assertEqual([c["status"] for c in dados["ciclos"]], ["Encerrado", "Em andamento"])
        self.assertIn("RF1: Código concluído -> Aceita", mudancas)
        self.assertIn("Ciclo 5: Aguardando -> Em andamento", mudancas)

    def test_issue_atras_do_catalogo_sem_regressao_gera_aviso(self):
        dados = copy.deepcopy(self.dados)
        mudancas = catalogo.aplicar_github(dados, [issue(2, "Planejada")], [])
        self.assertEqual(dados["rfs"][1]["estado"], "Código concluído")
        self.assertTrue(any(m.startswith("aviso: RF2: a issue está em Planejada") for m in mudancas))

    def test_regressao_registrada_nao_e_desfeita_pela_issue_antiga(self):
        dados = copy.deepcopy(self.dados)
        dados["rfs"][2].update(estado="Código inspecionado",
                               regressao={"de": "Aceita", "em": "28/11/2026", "motivo": "aceite revisto pela FBr"})
        mudancas = catalogo.aplicar_github(dados, [issue(3, "Aceita", atualizada="2026-11-27T18:00:00Z")], [])
        self.assertEqual(dados["rfs"][2]["estado"], "Código inspecionado")
        self.assertTrue(any("mantida a regressão de 28/11/2026" in m for m in mudancas))

    def test_issue_atualizada_depois_da_regressao_volta_a_valer(self):
        dados = copy.deepcopy(self.dados)
        dados["rfs"][2].update(estado="Código inspecionado",
                               regressao={"de": "Aceita", "em": "28/11/2026", "motivo": "aceite revisto pela FBr"})
        catalogo.aplicar_github(dados, [issue(3, "Demonstrada", atualizada="2026-11-29T10:00:00Z")], [])
        self.assertEqual(dados["rfs"][2]["estado"], "Demonstrada")

    def test_issue_que_regrediu_junto_com_o_catalogo_nao_gera_aviso(self):
        dados = copy.deepcopy(self.dados)
        dados["rfs"][2].update(estado="Demonstrada",
                               regressao={"de": "Aceita", "em": "28/11/2026", "motivo": "aceite revisto pela FBr"})
        mudancas = catalogo.aplicar_github(dados, [issue(3, "Código inspecionado")], [])
        self.assertEqual(dados["rfs"][2]["estado"], "Demonstrada")
        self.assertEqual(mudancas, [])


    def test_sem_token_nao_sincroniza(self):
        self.assertFalse(catalogo.sincronizar_com_github(copy.deepcopy(self.dados)))


class NotaDaRegressao(unittest.TestCase):
    def test_nota_so_enquanto_a_feature_esta_antes_do_marco_anterior(self):
        cat = catalogo.Catalogo.__new__(catalogo.Catalogo)
        g = {"de": "Aceita", "em": "28/11/2026", "motivo": "aceite revisto pela FBr"}
        self.assertEqual(cat._regressao({"estado": "Código inspecionado", "regressao": g}),
                         ' (voltou de "Aceita" em 28/11/2026: aceite revisto pela FBr)')
        self.assertEqual(cat._regressao({"estado": "Aceita", "regressao": g}), "")
        self.assertEqual(cat._regressao({"estado": "Aceita"}), "")


if __name__ == "__main__":
    unittest.main(verbosity=2)
