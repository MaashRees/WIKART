"""Connexion partagée à AuraDB, utilisée par tous les scripts du dossier database/."""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from neo4j import GraphDatabase, Driver

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

NEO4J_URI = os.environ["NEO4J_URI"]
NEO4J_USERNAME = os.environ["NEO4J_USERNAME"]
NEO4J_PASSWORD = os.environ["NEO4J_PASSWORD"]
NEO4J_DATABASE = os.environ.get("NEO4J_DATABASE", "neo4j")


def get_driver() -> Driver:
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))
    driver.verify_connectivity()
    return driver


def run_query(driver: Driver, query: str, parameters: dict | None = None) -> list[dict]:
    records, _, _ = driver.execute_query(query, parameters or {}, database_=NEO4J_DATABASE)
    return [r.data() for r in records]
