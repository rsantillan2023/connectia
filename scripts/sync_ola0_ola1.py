# -*- coding: utf-8 -*-
"""Cierra Ola 0 y sincroniza Ola 1 en CSV + STATUS.md"""
from __future__ import annotations

import csv
import io
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "CONNECTIA-STATUS.csv"
MD_PATH = ROOT / "CONNECTIA-STATUS.md"

E0_NOTE = "Ola0 cerrada 2026-07-27: proto connectia/ operativo"
E0_NA = {"E0.02", "E0.03", "E0.11", "E0.12", "E0.16", "E0.17", "E0.19"}

OLA1 = {
    "01.01": ("desarrollado", "configurado", "cerrado", "login mode=id legajo 1001"),
    "01.02": ("desarrollado", "configurado", "cerrado", "login + lockout 5/15m"),
    "01.03": ("desarrollado", "configurado", "cerrado", "pre-login branding/methods"),
    "01.04": ("diferido", "diferido", "diferido", "Azure/Entra adapter fase packs"),
    "01.05": ("diferido", "diferido", "diferido", "Login token deep-link fase 2"),
    "01.06": ("diferido", "diferido", "diferido", "Enlace externo encuestas fase 2"),
    "01.07": ("diferido", "diferido", "diferido", "Legacy por capability pack"),
    "01.08": ("diferido", "diferido", "diferido", "2FA email fase 2"),
    "01.09": ("diferido", "diferido", "diferido", "SMS Twilio fase 2"),
    "01.10": (
        "desarrollado",
        "configurado",
        "desarrollado_y_configurado",
        "forgot+reset API + /reset-password U; email prod diferido",
    ),
    "01.11": ("desarrollado", "configurado", "cerrado", "remember local/session storage"),
    "01.12": ("desarrollado", "configurado", "cerrado", "logout current|all"),
    "01.13": ("desarrollado", "configurado", "cerrado", "accept-terms gate"),
    "01.14": (
        "desarrollado",
        "pendiente",
        "desarrollado",
        "host→subdomain basico; dominio custom pendiente",
    ),
    "01.15": ("diferido", "diferido", "diferido", "Selector multi-empresa cuando user multi-tenant"),
    "01.16": ("desarrollado", "configurado", "cerrado", "GET legal/privacy"),
    "01.17": ("desarrollado", "configurado", "cerrado", "GET legal/terms"),
    "01.QA": ("parcial", "n/a", "en_curso", "Smoke checklist humano pendiente"),
    "01.SEC": ("desarrollado", "n/a", "cerrado", "tenant por codigo; sin Emp_Id hardcode"),
    "01.UX": (
        "desarrollado",
        "n/a",
        "desarrollado_y_configurado",
        "tabs usuario/ID + terminos + reset",
    ),
    "01.ADM": (
        "desarrollado",
        "configurado",
        "desarrollado_y_configurado",
        "loginMethods/allowDesktop en ComunidadView",
    ),
    "01.DOC": (
        "desarrollado",
        "n/a",
        "desarrollado_y_configurado",
        "openapi auth + forgot/reset",
    ),
}


def main() -> None:
    rows = list(csv.reader(CSV_PATH.open(encoding="utf-8-sig"), delimiter=";"))
    out = []
    for r in rows:
        if not r:
            out.append(r)
            continue
        rid = r[0]
        if rid.startswith("E0."):
            r[6] = "desarrollado"
            r[7] = "n/a" if rid in E0_NA else "configurado"
            r[8] = "cerrado"
            r[9] = E0_NOTE
        elif rid in OLA1:
            d, c, g, n = OLA1[rid]
            r[6], r[7], r[8], r[9] = d, c, g, n
        out.append(r)

    buf = io.StringIO()
    csv.writer(buf, delimiter=";", lineterminator="\n").writerows(out)
    CSV_PATH.write_text("\ufeff" + buf.getvalue(), encoding="utf-8")

    dict_rows = list(csv.DictReader(CSV_PATH.open(encoding="utf-8-sig"), delimiter=";"))
    by_mod: dict[str, list] = defaultdict(list)
    for r in dict_rows:
        by_mod[r["modulo"]].append(r)

    def table_md(mod: str) -> str:
        lines = [
            "| ID | Punto | Capa | Dev | Config | Global |",
            "|----|-------|------|-----|--------|--------|",
        ]
        for r in by_mod[mod]:
            punto = r["punto"].replace("|", "/")
            if len(punto) > 90:
                punto = punto[:87] + "…"
            lines.append(
                "| `{id}` | {punto} | {capa} | `{dev}` | `{cfg}` | `{glob}` |".format(
                    id=r["id"],
                    punto=punto,
                    capa=r["capa"],
                    dev=r["estado_dev"],
                    cfg=r["estado_config"],
                    glob=r["estado_global"],
                )
            )
        return "\n".join(lines)

    md = MD_PATH.read_text(encoding="utf-8")

    g = Counter(r["estado_global"] for r in dict_rows)
    total = len(dict_rows)
    sum_lines = [
        "| estado_global | Cantidad | % |",
        "|---------------|----------|---|",
    ]
    for k, v in sorted(g.items(), key=lambda x: -x[1]):
        sum_lines.append(f"| `{k}` | {v} | {100 * v / total:.1f}% |")
    summary_block = "\n".join(sum_lines) + "\n\n"
    md = re.sub(
        r"\| estado_global \| Cantidad \| % \|\n\|---------------\|----------\|---\|\n(?:\|.*\|\n)+",
        summary_block,
        md,
        count=1,
    )

    mod_lines = [
        "| Módulo | Puntos | Pendientes | Cerrados | Diferidos | % cerrado* |",
        "|--------|--------|------------|----------|-----------|------------|",
    ]
    for mod in sorted(
        by_mod.keys(),
        key=lambda m: (m.split(".")[0].zfill(3) if m[0].isdigit() else "zzz", m),
    ):
        items = by_mod[mod]
        pend = sum(1 for x in items if x["estado_global"] == "pendiente")
        cerr = sum(1 for x in items if x["estado_global"] == "cerrado")
        dif = sum(1 for x in items if x["estado_global"] == "diferido")
        skip = {"diferido", "descartado", "meta", "transversal"}
        accion = sum(1 for x in items if x["estado_global"] not in skip)
        pct = f"{100 * cerr / accion:.0f}%" if accion else "—"
        mod_lines.append(
            f"| {mod[:60]} | {len(items)} | {pend} | {cerr} | {dif} | {pct} |"
        )
    mod_block = "\n".join(mod_lines) + "\n\n"
    md = re.sub(
        r"\| Módulo \| Puntos \| Pendientes \| Cerrados \| Diferidos \| % cerrado\* \|\n"
        r"\|--------\|--------\|------------\|----------\|-----------\|------------\|\n"
        r"(?:\|.*\|\n)+",
        mod_block,
        md,
        count=1,
    )

    def replace_section(md_text: str, heading: str, table: str) -> str:
        pattern = (
            rf"(### {re.escape(heading)}\n\n\*Fase:.*?\*\n\n)"
            rf"(\| ID \| Punto \|.*?\n(?:\|.*?\n)+)"
        )
        m = re.search(pattern, md_text, re.S)
        if not m:
            print("WARN no match", heading)
            return md_text
        return md_text[: m.start(2)] + table + "\n" + md_text[m.end(2) :]

    mod0 = next(m for m in by_mod if m.startswith("0."))
    mod1 = next(m for m in by_mod if m.startswith("1."))
    md = replace_section(md, "0. Fundación local (stack Hiryx)", table_md(mod0))
    md = replace_section(md, "1. Acceso, sesión e identidad", table_md(mod1))

    if "## Olas (estado)" not in md:
        insert = """## Olas (estado)

| Ola | Estado | Nota |
|-----|--------|------|
| **0** Fundación | **cerrada** | 2026-07-27 · todos `E0.*` → `cerrado` |
| **1** Acceso | **núcleo cerrado** | Adapters Azure/SMS/2FA/legacy/token/selector **diferidos**; falta QA smoke + host custom |
| **2** Tenant+menú | hecha | PLATFORM Suscriptores |
| **3** Muro | en curso | Esqueleto; falta audiencia/media/comentarios/Instagram |

"""
        md = md.replace(
            "## Inventario exhaustivo por módulo",
            insert + "## Inventario exhaustivo por módulo",
            1,
        )

    MD_PATH.write_text(md, encoding="utf-8")
    e0c = sum(1 for r in dict_rows if r["id"].startswith("E0.") and r["estado_global"] == "cerrado")
    print(f"E0 cerrados: {e0c}/20")
    gaps = [
        (r["id"], r["estado_global"])
        for r in dict_rows
        if r["id"].startswith("01.") and r["estado_global"] not in ("cerrado", "diferido")
    ]
    print("01 abiertos (no cerrado/diferido):", gaps)


if __name__ == "__main__":
    main()
