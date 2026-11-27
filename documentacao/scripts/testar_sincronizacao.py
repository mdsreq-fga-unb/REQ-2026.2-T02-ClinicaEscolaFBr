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


def issue(numero, estado, nivel="###"):
    corpo = f"### Objetivo\n\nTexto.\n\n{nivel} Estado da feature (FDD)\n\n{estado}\n\n### DoR\n"
    return {"number": numero, "body": corpo}


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

    def test_vale_o_estado_da_issue(self):
        dados = copy.deepcopy(self.dados)
        issues = [
            issue(1, "Aceita"),
            issue(2, "Em design"),  # o código entrou, mas o DoD da issue ainda não chegou lá
            issue(3, "Aceita", nivel="##"),
            {"number": 9, "body": "", "pull_request": {}},
        ]
        milestones = [{"title": "Ciclo 4", "state": "closed"}, {"title": "Ciclo 5", "state": "open"}]
        mudancas = catalogo.aplicar_github(dados, issues, milestones)
        estados = {r["id"]: r["estado"] for r in dados["rfs"]}
        self.assertEqual(estados, {"RF1": "Aceita", "RF2": "Em design", "RF3": "Aceita", "RF4": "Planejada"})
        fontes = {r["id"]: r.get("estado_fonte") for r in dados["rfs"]}
        self.assertEqual(fontes, {"RF1": "issue", "RF2": "issue", "RF3": "issue", "RF4": None})
        self.assertIn("RF2: Código concluído -> Em design", mudancas)
        self.assertEqual([c["status"] for c in dados["ciclos"]], ["Encerrado", "Em andamento"])
        self.assertIn("RF1: Código concluído -> Aceita", mudancas)
        self.assertIn("Ciclo 5: Aguardando -> Em andamento", mudancas)

    def test_issue_sem_estado_valido_mantem_o_catalogo(self):
        dados = copy.deepcopy(self.dados)
        catalogo.aplicar_github(dados, [issue(1, "_No response_")], [])
        self.assertEqual(dados["rfs"][0]["estado"], "Código concluído")
        self.assertNotIn("estado_fonte", dados["rfs"][0])

    def test_fonte_do_estado_com_a_data(self):
        dados = {"rfs": [], "rnfs": [], "decisoes": [], "ciclos": [], "atualizado_em": "25/11/2026",
                 "estado_lido_em": "27/11/2026"}
        cat = catalogo.Catalogo(dados)
        self.assertEqual(cat.fonte_do_estado({"estado_fonte": "issue"}), "estado lido da issue em 27/11/2026")
        self.assertEqual(cat.fonte_do_estado({}), "estado do catálogo de 25/11/2026")

    def test_sem_token_nao_sincroniza(self):
        self.assertFalse(catalogo.sincronizar_com_github(copy.deepcopy(self.dados)))


if __name__ == "__main__":
    unittest.main(verbosity=2)
