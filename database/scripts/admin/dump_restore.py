"""Dump / restore de la base AuraDB (Bloc 3 — scripts d'administration).

AuraDB Free ne permet pas `neo4j-admin database dump` (réservé aux instances
auto-hébergées) et APOC n'y est disponible que dans un sous-ensemble limité.
On implémente donc un dump/restore portable **via le driver Python
uniquement** : export JSON des nœuds et relations, restore par MERGE (donc
idempotent — un restore sur une base déjà peuplée ne duplique rien).

Usage :
  uv run scripts/admin/dump_restore.py dump     # écrit dans scripts/admin/dumps/<timestamp>/
  uv run scripts/admin/dump_restore.py restore <dossier_dump>
"""
from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from connection import get_driver, run_query, NEO4J_DATABASE  # noqa: E402

DUMPS_DIR = Path(__file__).resolve().parent / "dumps"
BATCH_SIZE = 5000

# Labels de nœuds et leur(s) propriété(s) clé (doit rester synchro avec
# schema/constraints.cypher).
NODE_LABELS: dict[str, tuple[str, ...]] = {
    "Region": ("nom",),
    "Departement": ("nom",),
    "Ville": ("nom", "departement"),
    "Musee": ("code_museofile",),
    "MouvementArtistique": ("nom",),
    "Concept": ("nom",),
    "Artiste": ("nom",),
    "Oeuvre": ("reference",),
}

# (type_relation, label_depart, cles_depart, label_arrivee, cles_arrivee)
RELATIONSHIP_PATTERNS: list[tuple[str, str, tuple[str, ...], str, tuple[str, ...]]] = [
    ("DANS", "Ville", ("nom", "departement"), "Departement", ("nom",)),
    ("DANS", "Departement", ("nom",), "Region", ("nom",)),
    ("SITUE_A", "Musee", ("code_museofile",), "Ville", ("nom", "departement")),
    ("EXPOSEE_A", "Oeuvre", ("reference",), "Musee", ("code_museofile",)),
    ("A_CREE", "Artiste", ("nom",), "Oeuvre", ("reference",)),
    ("APPARTIENT_AU_MOUVEMENT", "Artiste", ("nom",), "MouvementArtistique", ("nom",)),
    ("INFLUENCE_PAR", "Artiste", ("nom",), "Artiste", ("nom",)),
    ("INFLUENCE_PAR", "Artiste", ("nom",), "Concept", ("nom",)),
]


def _projection(alias: str, keys: tuple[str, ...]) -> str:
    return f"{alias} {{{', '.join('.' + k for k in keys)}}}"


# --- DUMP -------------------------------------------------------------

def dump_nodes(driver, out_dir: Path, label: str) -> int:
    total = 0
    path = out_dir / f"nodes_{label}.jsonl"
    with path.open("w", encoding="utf-8") as f:
        skip = 0
        while True:
            rows = run_query(
                driver,
                f"MATCH (n:{label}) RETURN properties(n) AS props SKIP $skip LIMIT $limit",
                {"skip": skip, "limit": BATCH_SIZE},
            )
            if not rows:
                break
            for r in rows:
                f.write(json.dumps(r["props"], ensure_ascii=False) + "\n")
            total += len(rows)
            skip += BATCH_SIZE
    return total


def dump_relationships(
    driver, out_dir: Path, index: int,
    reltype: str, start_label: str, start_keys: tuple[str, ...],
    end_label: str, end_keys: tuple[str, ...],
) -> int:
    total = 0
    path = out_dir / f"rels_{index:02d}_{reltype}_{start_label}_{end_label}.jsonl"
    query = f"""
    MATCH (a:{start_label})-[r:{reltype}]->(b:{end_label})
    RETURN {_projection('a', start_keys)} AS start,
           {_projection('b', end_keys)} AS end,
           properties(r) AS rel_props
    SKIP $skip LIMIT $limit
    """
    with path.open("w", encoding="utf-8") as f:
        skip = 0
        while True:
            rows = run_query(driver, query, {"skip": skip, "limit": BATCH_SIZE})
            if not rows:
                break
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
            total += len(rows)
            skip += BATCH_SIZE
    return total


def cmd_dump() -> None:
    out_dir = DUMPS_DIR / datetime.now().strftime("%Y%m%d-%H%M%S")
    out_dir.mkdir(parents=True, exist_ok=True)

    driver = get_driver()
    try:
        for label in NODE_LABELS:
            n = dump_nodes(driver, out_dir, label)
            print(f"  {label:<20} {n} nœuds exportés")

        for i, (reltype, sl, sk, el, ek) in enumerate(RELATIONSHIP_PATTERNS):
            n = dump_relationships(driver, out_dir, i, reltype, sl, sk, el, ek)
            print(f"  {reltype:<25} {sl}->{el:<20} {n} relations exportées")
    finally:
        driver.close()
    print(f"\nDump terminé : {out_dir}")


# --- RESTORE ------------------------------------------------------------

def restore_nodes(driver, dump_dir: Path, label: str, keys: tuple[str, ...]) -> int:
    path = dump_dir / f"nodes_{label}.jsonl"
    if not path.exists():
        return 0
    rows = [json.loads(line) for line in path.read_text(encoding="utf-8").split(chr(10)) if line.strip()]
    set_clause = ", ".join(f"n.{k} = row.{k}" for k in keys) or ""
    merge_keys = ", ".join(f"{k}: row.{k}" for k in keys)
    query = f"""
    UNWIND $rows AS row
    MERGE (n:{label} {{{merge_keys}}})
    SET n += row
    """
    for i in range(0, len(rows), BATCH_SIZE):
        run_query(driver, query, {"rows": rows[i : i + BATCH_SIZE]})
    return len(rows)


def restore_relationships(
    driver, dump_dir: Path, index: int,
    reltype: str, start_label: str, start_keys: tuple[str, ...],
    end_label: str, end_keys: tuple[str, ...],
) -> int:
    path = dump_dir / f"rels_{index:02d}_{reltype}_{start_label}_{end_label}.jsonl"
    if not path.exists():
        return 0
    rows = [json.loads(line) for line in path.read_text(encoding="utf-8").split(chr(10)) if line.strip()]
    start_match = ", ".join(f"{k}: row.start.{k}" for k in start_keys)
    end_match = ", ".join(f"{k}: row.end.{k}" for k in end_keys)
    query = f"""
    UNWIND $rows AS row
    MATCH (a:{start_label} {{{start_match}}})
    MATCH (b:{end_label} {{{end_match}}})
    MERGE (a)-[r:{reltype}]->(b)
    SET r += row.rel_props
    """
    for i in range(0, len(rows), BATCH_SIZE):
        run_query(driver, query, {"rows": rows[i : i + BATCH_SIZE]})
    return len(rows)


def cmd_restore(dump_dir: Path) -> None:
    if not dump_dir.exists():
        raise SystemExit(f"Dossier de dump introuvable : {dump_dir}")

    driver = get_driver()
    try:
        for label, keys in NODE_LABELS.items():
            n = restore_nodes(driver, dump_dir, label, keys)
            print(f"  {label:<20} {n} nœuds restaurés")

        for i, (reltype, sl, sk, el, ek) in enumerate(RELATIONSHIP_PATTERNS):
            n = restore_relationships(driver, dump_dir, i, reltype, sl, sk, el, ek)
            print(f"  {reltype:<25} {sl}->{el:<20} {n} relations restaurées")
    finally:
        driver.close()
    print(f"\nRestore terminé depuis : {dump_dir}")


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] not in ("dump", "restore"):
        raise SystemExit(__doc__)
    if sys.argv[1] == "dump":
        cmd_dump()
    else:
        if len(sys.argv) < 3:
            raise SystemExit("Usage: dump_restore.py restore <dossier_dump>")
        cmd_restore(Path(sys.argv[2]))


if __name__ == "__main__":
    main()
