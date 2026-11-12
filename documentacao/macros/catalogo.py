"""Visões do catálogo integrado de requisitos (AUD-30), geradas no build do site.

O plugin mkdocs-macros chama define_env ao carregar o mkdocs.yml. As páginas que
usam as macros declaram "render_macros: true" no cabeçalho; as demais não passam
pelo Jinja, para que exemplos com chaves duplas (como os do docker) fiquem intactos.

Fonte dos dados: documentacao/dados/requisitos.yml. Na publicação do site
(SINCRONIZAR_GITHUB=1, no deploy-docs), o estado de cada feature e a situação de
cada ciclo vêm do GitHub: ver sincronizar_com_github.
"""

import datetime
import json
import os
import posixpath
import re
import subprocess
import urllib.request
from pathlib import Path

import yaml

RAIZ = Path(__file__).resolve().parent.parent
CATALOGO = RAIZ / "dados" / "requisitos.yml"

PAGINA_RF = "requisitos/funcionais.md"
PAGINA_RNF = "requisitos/nao-funcionais.md"
PAGINA_DF = "requisitos/decisoes-fbr.md"
PAGINA_BACKLOG = "requisitos/priorizacao-e-mvp.md"
REPO = "https://github.com/mdsreq-fga-unb/REQ-2026.2-T02-ClinicaEscolaFBr"

MOSCOW = {4: "Must have", 3: "Should have", 2: "Could have", 1: "Won't have now"}

MOTIVO = {
    (4, None): "Must have — indispensável; entra independentemente do esforço.",
    (3, True): "Should have com esforço baixo/moderado — vale entregar já.",
    (3, False): "Should have com esforço alto — o sistema opera um tempo sem isso; adiado para reduzir risco do MVP.",
    (2, True): "Could have com esforço muito baixo — praticamente gratuito, entra.",
    (2, False): "Could have com esforço moderado/alto — pode esperar, conforme a própria definição do cliente.",
    (1, None): "Won't have now — o próprio cliente definiu que não é prioridade para esta versão.",
}

ESTADOS_ENTREGUES = {"Promovida para a versão integrada", "Demonstrada", "Aceita"}
# Marcos do FDD na ordem em que a feature passa por eles.
ORDEM_ESTADOS = [
    "Planejada", "Em design", "Design inspecionado", "Código concluído", "Código inspecionado",
    "Promovida para a versão integrada", "Demonstrada", "Aceita",
]


def carregar(caminho=CATALOGO):
    with open(caminho, encoding="utf-8") as f:
        dados = yaml.safe_load(f)
    for r in dados["rfs"]:
        r["tipo"] = "RF"
    for r in dados["rnfs"]:
        r["tipo"] = "RNF"
    return dados


def numero(codigo):
    return int(re.sub(r"\D", "", codigo))


def arredondar(valor, casas=0):
    """Arredondamento matemático (0,5 para cima), regras 1 e 3 da regra de consolidação (Priorização e MVP)."""
    fator = 10 ** casas
    return int(valor * fator + 0.5 + 1e-9) / fator


def esforco_decimal(rf):
    return arredondar(sum(rf["esforco"]) / 3, 1)


def esforco_inteiro(rf):
    return int(arredondar(esforco_decimal(rf)))


def decimal_br(valor):
    return f"{valor:.1f}".replace(".", ",")


def motivo_mvp(rf):
    if rf.get("motivo_mvp"):
        return rf["motivo_mvp"]
    valor, esforco = rf["valor"], esforco_inteiro(rf)
    if valor in (4, 1):
        return MOTIVO[(valor, None)]
    if valor == 3:
        return MOTIVO[(3, esforco <= 2)]
    return MOTIVO[(2, esforco == 1)]


def texto_removidos(removidos):
    """ "sem o RF19, removido em 24/10/2026" ou "sem o RF19 e o RF23, removidos"."""
    if not removidos:
        return ""
    if len(removidos) == 1:
        r = removidos[0]
        return f"sem o {r['id']}, removido em {r['removido']}"
    codigos = [f"o {r['id']}" for r in removidos]
    return f"sem {', '.join(codigos[:-1])} e {codigos[-1]}, removidos"


def expandir(texto, prefixo="RF"):
    """Códigos citados em um texto, inclusive intervalos como "RF34–RF38"."""
    achados = []
    for m in re.finditer(rf"\b{prefixo}(\d+)\s*[–-]\s*{prefixo}?(\d+)\b", texto):
        achados += [f"{prefixo}{n}" for n in range(int(m.group(1)), int(m.group(2)) + 1)]
    achados += re.findall(rf"\b{prefixo}\d+\b", texto)
    return list(dict.fromkeys(achados))


class Catalogo:
    def __init__(self, dados):
        self.dados = dados
        self.rfs = dados["rfs"]
        self.rnfs = dados["rnfs"]
        self.decisoes = dados["decisoes"]
        self.ciclos = {c["numero"]: c for c in dados["ciclos"]}
        # Quantas features do MVP cada ciclo tem, para os cronogramas usarem a mesma conta.
        for numero, c in self.ciclos.items():
            c["features"] = sum(1 for r in self.rfs if r.get("mvp") and r.get("ciclo") == numero)
        self.por_codigo = {r["id"]: r for r in self.rfs + self.rnfs}
        self.df = {d["id"]: d for d in self.decisoes}
        self.pagina = PAGINA_BACKLOG

    # ---- Contagens -------------------------------------------------------
    @property
    def n(self):
        rfs_vigentes = [r for r in self.rfs if not r.get("removido")]
        rnfs_vigentes = [r for r in self.rnfs if not r.get("removido") and not r.get("consolidado_em")]
        mvp = [r for r in rfs_vigentes if r["mvp"]]
        rnfs_mvp = [r for r in rnfs_vigentes if r["classificacao"] != "Não aplicável ao MVP"]
        removidos = [r for r in self.rfs if r.get("removido")]
        return {
            "rfs": len(self.rfs),
            "rfs_vigentes": len(rfs_vigentes),
            "rfs_removidos": len(self.rfs) - len(rfs_vigentes),
            # Trecho para "RF1 a RF69, sem o RF19, removido em 24/10/2026": com o
            # código e a data de cada removido, no singular ou no plural.
            "rfs_removidos_texto": texto_removidos(removidos),
            "rfs_mvp": len(mvp),
            "rfs_posteriores": len(rfs_vigentes) - len(mvp),
            "rnfs": len(self.rnfs),
            "rnfs_vigentes": len(rnfs_vigentes),
            "rnfs_mvp": len(rnfs_mvp),
            "rnfs_fora": len(rnfs_vigentes) - len(rnfs_mvp),
            "decisoes": len(self.decisoes),
            "ultimo_rf": max(self.rfs, key=lambda r: numero(r["id"]))["id"],
            "ultimo_rnf": max(self.rnfs, key=lambda r: numero(r["id"]))["id"],
        }

    def composicao_mvp(self):
        """Quantos RFs do MVP e de fora dele por categoria (texto da definição do MVP)."""
        dentro = {"must": 0, "should_baixo": 0, "dependencia": 0, "pedido": 0, "could": 0}
        fora = {"should": 0, "could": 0, "wont": 0}
        for r in self.rfs:
            if r.get("removido"):
                continue
            v, e = r["valor"], esforco_inteiro(r)
            if r["mvp"]:
                if v == 4:
                    dentro["must"] += 1
                elif v == 3 and e <= 2:
                    dentro["should_baixo"] += 1
                elif "dependência" in (r.get("motivo_mvp") or ""):
                    dentro["dependencia"] += 1
                elif v == 2:
                    dentro["could"] += 1
                else:
                    dentro["pedido"] += 1
            else:
                fora[{3: "should", 2: "could", 1: "wont"}[v]] += 1
        return {"dentro": dentro, "fora": fora}

    # ---- Links -----------------------------------------------------------
    def href(self, alvo):
        base = posixpath.dirname(self.pagina)
        caminho, _, ancora = alvo.partition("#")
        rel = posixpath.relpath(caminho, base) if caminho != self.pagina else ""
        return rel + ("#" + ancora if ancora else "")

    def link(self, codigo, com_nome=False):
        if codigo.startswith("DF"):
            alvo = f"{PAGINA_DF}#{codigo.lower()}"
        elif codigo.startswith("RNF"):
            alvo = f"{PAGINA_RNF}#{codigo.lower()}"
        else:
            alvo = f"{PAGINA_RF}#{codigo.lower()}"
        texto = codigo
        if com_nome and codigo in self.por_codigo:
            texto = f"{codigo} — {self.por_codigo[codigo]['nome']}"
        return f"[{texto}]({self.href(alvo)})"

    def links(self, codigos, sep=", "):
        return sep.join(self.link(c) for c in codigos) if codigos else "—"

    def issue(self, rf):
        return f"[#{rf['issue']}]({REPO}/issues/{rf['issue']})" if rf.get("issue") else "—"

    # ---- Tabelas da priorização ------------------------------------------
    def tabela_consolidada(self):
        linhas = [
            "| Código | Requisito | CP | Valor de negócio | Justificativa do cliente | Esforço | Complexidade | Lacuna de capacidade | Esforço técnico consolidado |",
            "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
        ]
        for r in self.rfs:
            nome = r["nome"] + (f" (removido em {r['removido']})" if r.get("removido") else "")
            e, c, l = r["esforco"]
            linhas.append(f"| {self.link(r['id'])} | {nome} | {r['cp']} | {r['valor']} | {r['justificativa']} | {e} | {c} | {l} | **{decimal_br(esforco_decimal(r))}** |")
        return "\n".join(linhas)

    def tabela_mvp(self):
        linhas = [
            "| Código | CP | Valor de negócio | Esforço técnico (1-4) | No MVP? | Motivo |",
            "| --- | --- | --- | --- | --- | --- |",
        ]
        for r in self.rfs:
            decisao = "Removido" if r.get("removido") else ("Sim" if r["mvp"] else "Não")
            linhas.append(f"| {self.link(r['id'])} | {r['cp']} | {r['valor']} | {esforco_inteiro(r)} | {decisao} | {motivo_mvp(r)} |")
        return "\n".join(linhas)

    def lista_fora_do_mvp(self):
        fora = sorted((r["id"] for r in self.rfs if not r.get("removido") and not r["mvp"]), key=numero)
        return ", ".join(fora)

    def matriz(self):
        """Matriz valor × esforço em tabela: versão estática, lida sem JavaScript."""
        nomes = {1: "baixo", 2: "moderado", 3: "alto", 4: "muito alto"}
        linhas = [
            "| Valor de negócio | " + " | ".join(f"Esforço {e} ({nomes[e]})" for e in range(1, 5)) + " |",
            "| --- | --- | --- | --- | --- |",
        ]
        for v in (4, 3, 2, 1):
            celulas = []
            for e in range(1, 5):
                itens = sorted((r for r in self.rfs if not r.get("removido") and r["valor"] == v and esforco_inteiro(r) == e),
                               key=lambda r: numero(r["id"]))
                celulas.append(", ".join(r["id"] if r["mvp"] else f"_{r['id']}_" for r in itens) or "—")
            linhas.append(f"| {v} — {MOSCOW[v]} | " + " | ".join(celulas) + " |")
        return "\n".join(linhas)

    def tabela_rnfs(self):
        linhas = [
            "| Código | Requisito não funcional | Classificação | RF/escopo relacionado | Justificativa |",
            "| --- | --- | --- | --- | --- |",
        ]
        for r in self.rnfs:
            classificacao = r["classificacao"]
            if r.get("removido"):
                classificacao = "Removido"
            elif r.get("consolidado_em"):
                classificacao = f"Consolidado no {r['consolidado_em']}"
            linhas.append(f"| {self.link(r['id'])} | {r['nome']} | {classificacao} | {r['relacionado']} | {r['justificativa']} |")
        return "\n".join(linhas)

    # ---- Índices dos RFs e RNFs ------------------------------------------
    def _rotulo_situacao(self, r):
        if r.get("removido"):
            return f" (removido em {r['removido']})"
        if r.get("consolidado_em"):
            return f" (consolidado no {r['consolidado_em']})"
        return ""

    def indice(self, tipo):
        itens = sorted(self.rfs if tipo == "RF" else self.rnfs, key=lambda r: numero(r["id"]))
        celulas = [f"[{r['id']} — {r['nome']}{self._rotulo_situacao(r)}](#{r['id'].lower()})" for r in itens]
        if len(celulas) % 2:
            celulas.append("")
        linhas = ["| Requisito | Requisito |", "| --- | --- |"]
        for i in range(0, len(celulas), 2):
            linhas.append(f"| {celulas[i]} | {celulas[i + 1]} |")
        return "\n".join(linhas)

    # ---- Registro de cada requisito --------------------------------------
    def origem(self, codigo):
        """Fim da linha de rastreabilidade: " Origem: DFnn." ou nada, sem decisão."""
        dfs = self.por_codigo[codigo].get("origem", [])
        return f" Origem: {self.links(dfs)}." if dfs else ""

    def _situacao_rf(self, r):
        if r.get("removido"):
            return f"removido em {r['removido']}; não entra nas contagens"
        if not r["mvp"]:
            return "versão posterior, reavaliada ao fim da Unidade 4"
        texto = f"Ciclo {r['ciclo']} · {r['estado']}"
        if r.get("issue"):
            texto += f" ({self.issue(r)})"
        if r.get("entrega"):
            texto += f". Entrega {r['entrega']}"
        return texto

    def registro(self, codigo):
        r = self.por_codigo[codigo]
        if r["tipo"] == "RF":
            if r.get("removido"):
                return f"_Entrega e situação:_ {self._situacao_rf(r)}."
            decisao = "no MVP" if r["mvp"] else "fora do MVP"
            prioridade = (f"{MOSCOW[r['valor']]} (valor {r['valor']}) · esforço técnico "
                          f"{decimal_br(esforco_decimal(r))} · {decisao} "
                          f"([definição do MVP]({self.href(PAGINA_BACKLOG + '#1023-definicao-do-mvp')}))")
            return f"_Prioridade:_ {prioridade}.\n\n_Entrega e situação:_ {self._situacao_rf(r)}."
        # RNF: linhas no mesmo parágrafo de "Classificação" e "Rastreabilidade"
        if r.get("removido") or r.get("consolidado_em"):
            return f"Entrega e situação: {self._situacao_rnf(r)}."
        return f"Prioridade: {r['classificacao']}.\nEntrega e situação: {self._situacao_rnf(r)}."

    def _situacao_rnf(self, r):
        if r.get("removido"):
            return f"removido em {r['removido']}; não entra nas contagens"
        if r.get("consolidado_em"):
            return f"consolidado no {r['consolidado_em']}; não entra nas contagens"
        if r["classificacao"] == "Não aplicável ao MVP":
            return f"fora do MVP; reavaliado se o requisito relacionado ({r['relacionado']}) for incorporado"
        rfs = [self.por_codigo[c] for c in expandir(r["relacionado"]) if c in self.por_codigo]
        rfs = [x for x in rfs if not x.get("removido") and x.get("mvp")]
        if rfs:
            partes = [f"{self.link(x['id'])} (Ciclo {x['ciclo']}, {x['estado']})" for x in rfs]
            return "verificado no D4.5 de " + ", ".join(partes)
        cps = re.findall(r"\bCP\d+\b", r["relacionado"])
        if cps:
            ciclos = sorted({x["ciclo"] for x in self.rfs if x.get("mvp") and x["cp"] in cps})
            if ciclos:
                return f"verificado no D4.5 das features da {', '.join(cps)} no MVP ({self._faixa(ciclos)})"
        ciclos = sorted({x["ciclo"] for x in self.rfs if x.get("mvp")})
        return f"transversal, verificado no D4.5 das features do MVP a que se aplica ({self._faixa(ciclos)})"

    @staticmethod
    def _faixa(ciclos):
        return f"Ciclo {ciclos[0]}" if len(ciclos) == 1 else f"Ciclos {ciclos[0]} a {ciclos[-1]}"

    def rfs_da_cp(self, *cps):
        """RFs do MVP das CPs indicadas, com o ciclo e o estado (página de arquitetura)."""
        itens = [r for r in self.rfs if r.get("mvp") and r["cp"] in cps]
        itens.sort(key=lambda r: (r["ciclo"], r["ordem"]))
        return "; ".join(f"{self.link(r['id'])} (C{r['ciclo']}, {r['estado'].lower()})" for r in itens) or "—"

    # ---- Registro de Decisões --------------------------------------------
    def requisitos_da_decisao(self, df):
        citam = [r["id"] for r in self.rfs + self.rnfs if df in r.get("origem", [])]
        return sorted(citam, key=lambda c: (c.startswith("RNF"), numero(c)))

    def tabela_decisoes(self):
        linhas = ["| Código | Data e fonte | Decisão | Requisitos |", "| --- | --- | --- | --- |"]
        for d in self.decisoes:
            decisao = d["decisao"]
            if d.get("substituida_por"):
                decisao = f"**Substituída pela {self.link(d['substituida_por'])}.** {decisao}"
            elif d.get("substituida_em_parte_por"):
                decisao = (f"**Substituída em parte pela {self.link(d['substituida_em_parte_por'])}**, "
                           f"{d['parte_substituida']}. {decisao}")
            reqs = []
            for c in self.requisitos_da_decisao(d["id"]):
                reqs.append(self.link(c) + (" (removido)" if self.por_codigo[c].get("removido") else ""))
            reqs += [self.link(c) + " (até a substituição)" for c in d.get("requisitos_anteriores", [])]
            reqs += d.get("outros", [])
            linhas.append(f"| <span id=\"{d['id'].lower()}\"></span>{d['id']} | {d['data']}, {d['fonte']} | {decisao} | {', '.join(reqs) or '—'} |")
        return "\n".join(linhas)

    # ---- Features e backlog (visão geral) --------------------------------
    def tabela_situacao_ciclos(self):
        n = self.n
        linhas = ["| Ciclo | Período | Features | Status do ciclo |", "| --- | --- | --- | --- |"]
        for c in self.dados["ciclos"]:
            linhas.append(f"| [Ciclo {c['numero']}](#ciclo-{c['numero']}) | {c['periodo']} | {c['features'] or 'sem novas features'} | {c['status']} |")
        linhas.append(f"| **MVP** | | **{n['rfs_mvp']}** | |")
        linhas.append(f"| [Versões posteriores](#versoes-posteriores) | reavaliadas ao fim da Unidade 4 | {n['rfs_posteriores']} | Fora do MVP |")
        return "\n".join(linhas)

    def tabela_ciclo(self, numero_ciclo):
        itens = sorted((r for r in self.rfs if r.get("mvp") and r.get("ciclo") == numero_ciclo), key=lambda r: r["ordem"])
        linhas = ["| Ordem | Feature (RF) | CP | Depende de | Líder de Feature | Issue |", "| --- | --- | --- | --- | --- | --- |"]
        for r in itens:
            nome = self.link(r["id"]) + f" — {r['nome']}" + (f" ({r['nota_backlog']})" if r.get("nota_backlog") else "")
            dep = self.links(r.get("depende", []))
            if r.get("apoio"):
                dep += " · apoio opcional: " + ", ".join(f"{self.link(c)} (fora do MVP)" for c in r["apoio"])
            linhas.append(f"| {r['ordem']} | {nome} | {r['cp']} | {dep} | {r['lider']} | {self.issue(r)} |")
        return "\n".join(linhas)

    def tabela_andamento(self, *numeros):
        """Features dos ciclos indicados com o estado do FDD (copiado da issue) e a
        issue, para mostrar o que foi realizado na unidade."""
        itens = sorted(
            (r for r in self.rfs if r.get("mvp") and r.get("ciclo") in numeros),
            key=lambda r: (r["ciclo"], r["ordem"]),
        )
        linhas = ["| Ciclo | Feature (RF) | Líder de Feature | Estado da feature | Issue |", "| --- | --- | --- | --- | --- |"]
        for r in itens:
            linhas.append(
                f"| {r['ciclo']} | {self.link(r['id'])} — {r['nome']} | {r['lider']} | {r.get('estado', 'Planejada')} | {self.issue(r)} |"
            )
        contagem = {}
        for r in itens:
            contagem[r.get("estado", "Planejada")] = contagem.get(r.get("estado", "Planejada"), 0) + 1
        resumo = "; ".join(f"{e}: {contagem[e]}" for e in ORDEM_ESTADOS if e in contagem)
        return "\n".join(linhas) + f"\n\n_Total: {len(itens)} features ({resumo})._"

    def tabela_posteriores(self):
        linhas = ["| Feature (RF) | CP | Líder de Feature | Issue |", "| --- | --- | --- | --- |"]
        for r in self.rfs:
            if r.get("removido") or r["mvp"]:
                continue
            linhas.append(f"| {self.link(r['id'])} — {r['nome']} | {r['cp']} | {r['lider']} | {self.issue(r)} |")
        return "\n".join(linhas)

    def tabela_conjuntos(self):
        linhas = [
            "| Área (FDD) | Conjunto de features | Features no MVP | Features para versão posterior | Líder de Feature | Conclusão prevista |",
            "| --- | --- | --- | --- | --- | --- |",
        ]
        total_mvp = total_post = 0
        for c in self.dados["conjuntos"]:
            membros = [self.por_codigo[x] for x in c["rfs"]]
            mvp = [x["id"] for x in membros if not x.get("removido") and x["mvp"]]
            post = [x["id"] for x in membros if not x.get("removido") and not x["mvp"]]
            removidos = [x["id"] for x in membros if x.get("removido")]
            total_mvp += len(mvp)
            total_post += len(post)
            col_mvp = self.links(mvp)
            if removidos:
                col_mvp += " · " + ", ".join(f"{x} removido" for x in removidos)
            linhas.append(f"| {c['area']} | {c['conjunto']} | {col_mvp} | {self.links(post)} | {c['lider']} | {c['conclusao'] or '—'} |")
        linhas.append(f"| **Total** | | **{total_mvp}** | **{total_post}** | | |")
        return "\n".join(linhas)


# ---- Sincronização com o GitHub ------------------------------------------
# O estado da feature é registrado na issue (seção "Estado da feature (FDD)", que o
# robô de acompanhamento atualiza pelo DoR, pelo DoD e pelos comandos /demonstrada e
# /aceite), e a situação do ciclo, no milestone. Na publicação, o site lê os dois do
# GitHub, para não depender de uma PR a cada mudança. Sem token, ou se o GitHub não
# responder, vale o que está no requisitos.yml.

API_GITHUB = "https://api.github.com"
REPO_API = REPO.replace("https://github.com/", "")
BRASILIA = datetime.timezone(datetime.timedelta(hours=-3))


def _get_github(caminho, token):
    pedido = urllib.request.Request(
        f"{API_GITHUB}/{caminho}",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json",
                 "User-Agent": "catalogo-docs"},
    )
    with urllib.request.urlopen(pedido, timeout=20) as resposta:
        return json.load(resposta)


def _paginas_github(caminho, token):
    itens, pagina = [], 1
    while True:
        lote = _get_github(f"{caminho}&per_page=100&page={pagina}", token)
        itens += lote
        if len(lote) < 100:
            return itens
        pagina += 1


def estado_da_issue(corpo):
    """Valor da seção "Estado da feature (FDD)" do corpo da issue, se for um marco válido."""
    m = re.search(r"^###\s*Estado da feature[^\n]*\n+\s*([^\n]+)", corpo or "", re.M)
    if not m:
        return None
    valor = m.group(1).strip()
    return valor if valor in ORDEM_ESTADOS else None


def situacao_dos_ciclos(milestones):
    """Situação de cada ciclo pelo milestone "Ciclo N — …": fechado é "Encerrado"; dos
    abertos, o de menor número está "Em andamento", e os demais, "Aguardando"."""
    ciclos = {}
    for ms in milestones:
        m = re.match(r"Ciclo (\d+)\b", ms.get("title", ""))
        if m:
            ciclos[int(m.group(1))] = ms["state"]
    abertos = sorted(n for n, estado in ciclos.items() if estado == "open")
    return {n: "Encerrado" if estado == "closed" else ("Em andamento" if n == abertos[0] else "Aguardando")
            for n, estado in ciclos.items()}


def aplicar_github(dados, issues, milestones):
    """Aplica ao catálogo o estado das issues e a situação dos milestones. Devolve as
    mudanças feitas, para o log da publicação."""
    mudancas = []
    corpos = {i["number"]: i.get("body") for i in issues if "pull_request" not in i}
    for r in dados["rfs"]:
        if not r.get("issue") or int(r["issue"]) not in corpos:
            continue
        estado = estado_da_issue(corpos[int(r["issue"])])
        atual = r.get("estado", "Planejada")
        # O yml é atualizado na PR que conclui o código, antes de o checklist da issue
        # chegar lá; por isso vale o marco mais adiantado dos dois.
        if estado and ORDEM_ESTADOS.index(estado) > ORDEM_ESTADOS.index(atual):
            mudancas.append(f"{r['id']}: {atual} -> {estado}")
            r["estado"] = estado
    for c in dados["ciclos"]:
        status = situacao_dos_ciclos(milestones).get(c["numero"])
        if status and status != c["status"]:
            mudancas.append(f"Ciclo {c['numero']}: {c['status']} -> {status}")
            c["status"] = status
    return mudancas


def sincronizar_com_github(dados):
    """Só na publicação (SINCRONIZAR_GITHUB=1, com GITHUB_TOKEN). O docs-check das PRs e
    o build local continuam usando só o requisitos.yml."""
    token = os.environ.get("GITHUB_TOKEN")
    if os.environ.get("SINCRONIZAR_GITHUB") != "1" or not token:
        return False
    try:
        issues = _paginas_github(f"repos/{REPO_API}/issues?state=all", token)
        milestones = _paginas_github(f"repos/{REPO_API}/milestones?state=all", token)
    except (OSError, ValueError) as erro:
        print(f"catalogo: GitHub indisponível ({erro}); o site usa o requisitos.yml.")
        return False
    for mudanca in aplicar_github(dados, issues, milestones):
        print(f"catalogo: {mudanca}")
    return True


def data_publicacao():
    """Data do último commit publicado (ou DATA_PUBLICACAO, definida pelo workflow)."""
    data = os.environ.get("DATA_PUBLICACAO")
    if not data:
        try:
            data = subprocess.run(["git", "log", "-1", "--format=%cs"], cwd=RAIZ, capture_output=True,
                                  text=True, check=True).stdout.strip()
        except (OSError, subprocess.CalledProcessError):
            data = ""
    try:
        return datetime.date.fromisoformat(data).strftime("%d/%m/%Y")
    except ValueError:
        return datetime.date.today().strftime("%d/%m/%Y")


def define_env(env):
    dados = carregar()
    sincronizado = sincronizar_com_github(dados)
    cat = Catalogo(dados)

    # Cada visão vira uma macro com o mesmo nome; os links saem relativos à página.
    def na_pagina(metodo):
        def macro(*args):
            cat.pagina = env.page.file.src_uri
            return metodo(*args)
        return macro

    for nome in ("tabela_consolidada", "tabela_mvp", "lista_fora_do_mvp", "matriz", "tabela_rnfs",
                 "indice", "origem", "registro", "tabela_decisoes", "tabela_situacao_ciclos",
                 "tabela_ciclo", "tabela_andamento", "tabela_posteriores", "tabela_conjuntos", "link", "rfs_da_cp"):
        env.macro(na_pagina(getattr(cat, nome)), nome)
    env.variables["composicao_mvp"] = cat.composicao_mvp()

    env.variables["n"] = cat.n
    env.variables["ciclos"] = cat.ciclos
    # Sincronizado com o GitHub, o catálogo está atualizado no dia da publicação.
    env.variables["catalogo_atualizado_em"] = (
        datetime.datetime.now(BRASILIA).strftime("%d/%m/%Y") if sincronizado else cat.dados["atualizado_em"]
    )

    # Números da página inicial (overrides/home.html), calculados do catálogo.
    for stat in env.conf["extra"].get("home", {}).get("stats", []):
        if stat.get("label") == "requisitos funcionais":
            stat["value"] = str(cat.n["rfs_vigentes"])
        elif stat.get("label") == "requisitos não funcionais":
            stat["value"] = str(cat.n["rnfs_vigentes"])
    env.conf["extra"]["ultima_publicacao"] = data_publicacao()
    env.variables["ultima_publicacao"] = env.conf["extra"]["ultima_publicacao"]
