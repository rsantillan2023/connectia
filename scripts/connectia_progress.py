# -*- coding: utf-8 -*-
"""Resume avance Connectia desde CONNECTIA-STATUS.csv"""
from __future__ import annotations

import csv
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "CONNECTIA-STATUS.csv"


def main():
    rows = list(csv.DictReader(CSV_PATH.open(encoding="utf-8-sig"), delimiter=";"))
    total = len(rows)
    g = Counter(r["estado_global"] for r in rows)
    print(f"Total puntos: {total}\n")
    print("Por estado_global:")
    for k, v in sorted(g.items(), key=lambda x: -x[1]):
        print(f"  {k:28} {v:4}  ({100*v/total:5.1f}%)")

    # % avance útil: cerrado / (total - diferido - descartado - meta - transversal)
    skip = {"diferido", "descartado", "meta", "transversal"}
    base = [r for r in rows if r["estado_global"] not in skip]
    cerrados = sum(1 for r in base if r["estado_global"] == "cerrado")
    dyc = sum(1 for r in base if r["estado_global"] == "desarrollado_y_configurado")
    print(f"\nAvance (cerrado / accionables): {cerrados}/{len(base)} = {100*cerrados/len(base) if base else 0:.1f}%")
    print(f"Desarrollado+configurado: {dyc}")

    print("\nPor módulo (pendiente | cerrado | diferido | total):")
    by = defaultdict(list)
    for r in rows:
        by[r["modulo"]].append(r)
    for mod in sorted(by.keys(), key=lambda m: (m.split(".")[0].zfill(3) if m[0].isdigit() else "zzz", m)):
        items = by[mod]
        pend = sum(1 for x in items if x["estado_global"] == "pendiente")
        cerr = sum(1 for x in items if x["estado_global"] == "cerrado")
        dif = sum(1 for x in items if x["estado_global"] == "diferido")
        print(f"  {pend:3}/{cerr:3}/{dif:3}/{len(items):3}  {mod[:70]}")


if __name__ == "__main__":
    main()
