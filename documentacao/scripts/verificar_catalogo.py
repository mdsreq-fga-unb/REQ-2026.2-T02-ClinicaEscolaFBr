"""Confere o catálogo de requisitos contra as páginas do site (docs-check).

Uso: python documentacao/scripts/verificar_catalogo.py

Falha (código 1) quando:
- um requisito está no catálogo e não tem registro na página 8.1 ou 8.2, ou o contrário;
- o nome no catálogo é diferente do título do registro;
- um registro não usa as macros de Origem e de Prioridade/Entrega;
- um campo do catálogo está fora do formato (CP, escalas, ciclo, estado, dependências);
- uma decisão (DF) citada não existe, ou o texto de um requisito cita uma DF que
  não está na Origem dele (o vínculo requisito-decisão tem um sentido só, AUD-32);
- um link para uma decisão não leva a âncora da linha (decisoes-fbr.md#dfnn).
"""

import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from macros.catalogo import carregar  # noqa: E402

DOCS = RAIZ / "docs"
ESTADOS = {
    "Planejada", "Em design", "Design inspecionado", "Código concluído", "Código inspecionado",
    "Promovida para a versão integrada", "Demonstrada", "Aceita",
}
CLASSIFICACOES = {"Obrigatório para o MVP", "Associado a RF do MVP", "Evolutivo", "Não aplicável ao MVP"}

erros = []


def erro(msg):
    erros.append(msg)


def registros(pagina, prefixo):
    """{código: (nome, texto do registro até a linha de Prioridade/Entrega)}."""
    texto = (DOCS / pagina).read_text(encoding="utf-8")
    achados = {}
    partes = re.split(rf"(?=^\*\*{prefixo}\d+ — )", texto, flags=re.M)
    for parte in partes[1:]:
        m = re.match(rf"\*\*({prefixo}\d+) — (.+?)\*\*\{{ #({prefixo.lower()}\d+) \}}", parte)
        if not m:
            erro(f"{pagina}: título de registro fora do formato: {parte.splitlines()[0][:80]}")
            continue
        codigo, nome, ancora = m.groups()
        if ancora != codigo.lower():
            erro(f"{pagina}: {codigo} com âncora #{ancora}")
        fim = parte.find(f'{{{{ registro("{codigo}") }}}}')
        if fim < 0:
            erro(f"{pagina}: {codigo} sem a linha {{{{ registro(\"{codigo}\") }}}}")
            fim = len(parte)
        if codigo in achados:
            erro(f"{pagina}: {codigo} registrado duas vezes")
        achados[codigo] = (nome, parte[:fim])
    return achados


def main():
    dados = carregar()
    cps = dados["cps"]
    rfs = {r["id"]: r for r in dados["rfs"]}
    rnfs = {r["id"]: r for r in dados["rnfs"]}
    dfs = {d["id"]: d for d in dados["decisoes"]}
    ciclos = {c["numero"] for c in dados["ciclos"]}

    if len(rfs) != len(dados["rfs"]) or len(rnfs) != len(dados["rnfs"]):
        erro("catálogo: código de requisito repetido")

    # ---- Catálogo x páginas ------------------------------------------------
    for pagina, prefixo, catalogo in (
        ("requisitos/funcionais.md", "RF", rfs),
        ("requisitos/nao-funcionais.md", "RNF", rnfs),
    ):
        regs = registros(pagina, prefixo)
        for codigo in catalogo.keys() - regs.keys():
            erro(f"{codigo} está no catálogo, mas não tem registro em {pagina}")
        for codigo in regs.keys() - catalogo.keys():
            erro(f"{codigo} tem registro em {pagina}, mas não está no catálogo")
        for codigo, (nome, texto) in regs.items():
            r = catalogo.get(codigo)
            if not r:
                continue
            if r["nome"] != nome:
                erro(f"{codigo}: nome no catálogo ({r['nome']!r}) diferente do registro ({nome!r})")
            removido = r.get("removido") or r.get("consolidado_em")
            if not removido and f'{{{{ origem("{codigo}") }}}}' not in texto:
                erro(f"{codigo}: a linha de rastreabilidade não termina com {{{{ origem(\"{codigo}\") }}}}")
            if re.search(r"Origem: \[?DF", texto):
                erro(f"{codigo}: Origem escrita à mão; use {{{{ origem(\"{codigo}\") }}}} e o campo origem do catálogo")
            citadas = set(re.findall(r"\bDF\d+\b", texto))
            faltando = citadas - set(r.get("origem", []))
            if faltando:
                erro(f"{codigo}: o texto cita {', '.join(sorted(faltando))}, que não está na Origem do catálogo")

    # ---- Campos dos RFs ----------------------------------------------------
    ordens = {}
    for r in dados["rfs"]:
        c = r["id"]
        if r["cp"] not in cps:
            erro(f"{c}: CP {r['cp']} desconhecida")
        if r["valor"] not in (1, 2, 3, 4):
            erro(f"{c}: valor de negócio fora da escala 1 a 4")
        if len(r["esforco"]) != 3 or any(x not in (1, 2, 3, 4) for x in r["esforco"]):
            erro(f"{c}: esforco deve ter três notas de 1 a 4")
        if r.get("removido"):
            continue
        if not isinstance(r.get("mvp"), bool):
            erro(f"{c}: mvp deve ser true ou false (ou o requisito deve ter removido)")
            continue
        if not r.get("lider"):
            erro(f"{c}: sem Líder de Feature")
        if r["mvp"]:
            if r.get("ciclo") not in ciclos:
                erro(f"{c}: ciclo {r.get('ciclo')} desconhecido")
            if r.get("estado") not in ESTADOS:
                erro(f"{c}: estado {r.get('estado')!r} não é um estado da feature (FDD)")
            if r.get("ordem") in ordens:
                erro(f"{c}: ordem {r['ordem']} repetida ({ordens[r['ordem']]})")
            ordens[r.get("ordem")] = c
        for campo in ("depende", "apoio"):
            for d in r.get(campo, []):
                if d not in rfs or rfs[d].get("removido"):
                    erro(f"{c}: {campo} cita {d}, que não existe ou foi removido")
    esperado = list(range(1, len(ordens) + 1))
    if sorted(o for o in ordens if o is not None) != esperado:
        erro("backlog: a ordem dos RFs do MVP deve ir de 1 a N, sem lacunas")

    # ---- Campos dos RNFs ---------------------------------------------------
    for r in dados["rnfs"]:
        if r["classificacao"] not in CLASSIFICACOES:
            erro(f"{r['id']}: classificação {r['classificacao']!r} desconhecida")
        if r.get("consolidado_em") and r["consolidado_em"] not in rnfs:
            erro(f"{r['id']}: consolidado em {r['consolidado_em']}, que não existe")

    # ---- Decisões ------------------------------------------------------------
    for r in dados["rfs"] + dados["rnfs"]:
        for df in r.get("origem", []):
            if df not in dfs:
                erro(f"{r['id']}: Origem cita {df}, que não está no Registro de Decisões")
    for d in dados["decisoes"]:
        for campo in ("substituida_por", "substituida_em_parte_por"):
            if d.get(campo) and d[campo] not in dfs:
                erro(f"{d['id']}: {campo} cita {d[campo]}, que não existe")

    # ---- Conjuntos de features --------------------------------------------
    nos_conjuntos = [x for c in dados["conjuntos"] for x in c["rfs"]]
    for x in set(nos_conjuntos) - rfs.keys():
        erro(f"conjuntos: {x} não está no catálogo")
    for x in rfs.keys() - set(nos_conjuntos):
        erro(f"conjuntos: {x} não está em nenhum conjunto de features")
    for x in {x for x in nos_conjuntos if nos_conjuntos.count(x) > 1}:
        erro(f"conjuntos: {x} aparece em mais de um conjunto")

    # ---- Links para as decisões ----------------------------------------------
    for pagina in sorted(DOCS.rglob("*.md")):
        texto = pagina.read_text(encoding="utf-8")
        for m in re.finditer(r"\[[^\]]*\bDF(\d+)[^\]]*\]\(([^)]*decisoes-fbr\.md)(#[^)]*)?\)", texto):
            if m.group(3) != f"#df{m.group(1)}":
                linha = texto.count("\n", 0, m.start()) + 1
                erro(f"{pagina.relative_to(DOCS)}:{linha}: link para DF{m.group(1)} sem a âncora #df{m.group(1)}")

    if erros:
        print(f"Catálogo de requisitos: {len(erros)} problema(s).")
        for e in erros:
            print(" -", e)
        return 1
    print(f"Catálogo de requisitos: {len(rfs)} RFs, {len(rnfs)} RNFs e {len(dfs)} decisões conferidos.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
