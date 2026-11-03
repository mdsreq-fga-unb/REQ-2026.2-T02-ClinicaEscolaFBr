"""Visões do catálogo integrado de requisitos (AUD-30), geradas no build do site.

O plugin mkdocs-macros chama define_env ao carregar o mkdocs.yml. As páginas que
usam as macros declaram "render_macros: true" no cabeçalho; as demais não passam
pelo Jinja, para que exemplos com chaves duplas (como os do docker) fiquem intactos.

Fonte dos dados: documentacao/dados/requisitos.yml.
"""

import datetime
import os
import posixpath
import re
import subprocess
from pathlib import Path

import yaml

RAIZ = Path(__file__).resolve().parent.parent
CATALOGO = RAIZ / "dados" / "requisitos.yml"

PAGINA_RF = "unidade-2/requisitos/funcionais.md"
PAGINA_RNF = "unidade-2/requisitos/nao-funcionais.md"
PAGINA_DF = "unidade-2/requisitos/decisoes-fbr.md"
PAGINA_BACKLOG = "unidade-2/requisitos/backlog.md"
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
    """Arredondamento matemático (0,5 para cima), regras 1 e 3 da seção 10.2.1.3."""
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
        return {
            "rfs": len(self.rfs),
            "rfs_vigentes": len(rfs_vigentes),
            "rfs_removidos": len(self.rfs) - len(rfs_vigentes),
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
        """Quantos RFs do MVP e de fora dele por categoria (texto da seção 10.2.3)."""
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

    # ---- Tabelas da priorização (10.2) -----------------------------------
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

    # ---- Índices (8.1 e 8.2) ---------------------------------------------
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

    # ---- Registro de cada requisito (8.1 e 8.2) ---------------------------
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
                          f"([10.2.3]({self.href(PAGINA_BACKLOG + '#1023-definicao-do-mvp')}))")
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

    # ---- Registro de Decisões (8.4) --------------------------------------
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

    # ---- Features e backlog (visão geral) ---------------------------------
    def tabela_situacao_ciclos(self):
        n = self.n
        linhas = ["| Ciclo | Período | Features | Status do ciclo |", "| --- | --- | --- | --- |"]
        for c in self.dados["ciclos"]:
            qtd = sum(1 for r in self.rfs if r.get("mvp") and r.get("ciclo") == c["numero"])
            linhas.append(f"| [Ciclo {c['numero']}](#ciclo-{c['numero']}) | {c['periodo']} | {qtd or 'sem novas features'} | {c['status']} |")
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
    cat = Catalogo(carregar())

    # Cada visão vira uma macro com o mesmo nome; os links saem relativos à página.
    def na_pagina(metodo):
        def macro(*args):
            cat.pagina = env.page.file.src_uri
            return metodo(*args)
        return macro

    for nome in ("tabela_consolidada", "tabela_mvp", "lista_fora_do_mvp", "matriz", "tabela_rnfs",
                 "indice", "origem", "registro", "tabela_decisoes", "tabela_situacao_ciclos",
                 "tabela_ciclo", "tabela_posteriores", "tabela_conjuntos", "link", "rfs_da_cp"):
        env.macro(na_pagina(getattr(cat, nome)), nome)
    env.variables["composicao_mvp"] = cat.composicao_mvp()

    env.variables["n"] = cat.n
    env.variables["ciclos"] = cat.ciclos
    env.variables["catalogo_atualizado_em"] = cat.dados["atualizado_em"]

    # Números da página inicial (overrides/home.html), calculados do catálogo.
    for stat in env.conf["extra"].get("home", {}).get("stats", []):
        if stat.get("label") == "requisitos funcionais":
            stat["value"] = str(cat.n["rfs_vigentes"])
        elif stat.get("label") == "requisitos não funcionais":
            stat["value"] = str(cat.n["rnfs_vigentes"])
    env.conf["extra"]["ultima_publicacao"] = data_publicacao()
    env.variables["ultima_publicacao"] = env.conf["extra"]["ultima_publicacao"]
