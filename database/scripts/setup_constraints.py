"""Applique schema/constraints.cypher sur la base AuraDB.
Usage : uv run scripts/setup_constraints.py
"""
from pathlib import Path

from connection import get_driver, NEO4J_DATABASE

CONSTRAINTS_FILE = Path(__file__).resolve().parent.parent / "schema" / "constraints.cypher"


def main() -> None:
    raw = CONSTRAINTS_FILE.read_text(encoding="utf-8")
    without_comments = "\n".join(
        line for line in raw.splitlines() if not line.strip().startswith("//")
    )
    statements = [s.strip() for s in without_comments.split(";") if s.strip()]

    driver = get_driver()
    try:
        with driver.session(database=NEO4J_DATABASE) as session:
            for stmt in statements:
                session.run(stmt)
                print(f"OK  {stmt.splitlines()[0][:80]}")
    finally:
        driver.close()
    print(f"\n{len(statements)} instructions appliquées.")


if __name__ == "__main__":
    main()
