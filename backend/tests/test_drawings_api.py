import os
import sys
import sqlite3
import tempfile
import shutil
import pytest
from fastapi.testclient import TestClient

# Ensure the backend app package is importable when tests are run from the project root
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../..", "backend", "app"))
if backend_path not in sys.path:
    sys.path.append(backend_path)

from app.main import app
from app.core import database as db

client = TestClient(app)

@pytest.fixture(scope="function")
def temp_db(monkeypatch):
    """Create a temporary SQLite DB with the schema and monkey‑patch DB_PATH.
    The fixture tears down the temp directory after each test.
    """
    tmp_dir = tempfile.mkdtemp()
    db_file = os.path.join(tmp_dir, "test_marketlab.db")

    # Load the schema (migrations folder is at project root)
    schema_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../migrations/001_initial_schema.sql"))
    with open(schema_path, "r") as f:
        schema_sql = f.read()

    conn = sqlite3.connect(db_file)
    conn.executescript(schema_sql)
    conn.commit()
    conn.close()

    # Monkey‑patch the DB_PATH used by core.database
    monkeypatch.setattr(db, "DB_PATH", db_file)

    # Insert a dummy instrument so foreign‑key constraints succeed
    conn = sqlite3.connect(db_file)
    conn.execute("INSERT INTO instruments (symbol, name) VALUES (?, ?)", ("EUR/USD", "Euro / US Dollar"))
    conn.commit()
    conn.close()

    yield db_file

    # Cleanup
    shutil.rmtree(tmp_dir)

def test_get_drawings_empty(temp_db):
    """GET /api/drawings should return an empty list when no drawings exist."""
    resp = client.get("/api/drawings?workspace_id=1&instrument_id=1")
    assert resp.status_code == 200
    assert resp.json() == []

def test_create_and_fetch_drawing(temp_db):
    """POST a drawing and then GET it back.
    The API stores the drawing in SQLite; we verify persistence.
    """
    drawing_payload = {
        "id": "draw_12345",
        "workspace_id": 1,
        "instrument_id": 1,
        "object_type": "trendline",
        "anchor_data_json": "[{\"time\": 1700000000, \"price\": 1.1234}, {\"time\": 1700000600, \"price\": 1.1240}]",
        "style_json": "{}"
    }
    # Create drawing
    resp = client.post("/api/drawings", json=drawing_payload)
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok", "id": "draw_12345"}

    # Retrieve drawings – should contain the one we just added
    resp = client.get("/api/drawings?workspace_id=1&instrument_id=1")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 1
    drawing = data[0]
    # Verify a few fields – others (updated_at) are auto‑generated
    assert drawing["id"] == drawing_payload["id"]
    assert drawing["object_type"] == drawing_payload["object_type"]
    assert drawing["anchor_data_json"] == drawing_payload["anchor_data_json"]

def test_delete_drawing(temp_db):
    """Create a drawing, delete it, and ensure it is gone."""
    payload = {
        "id": "draw_to_delete",
        "workspace_id": 1,
        "instrument_id": 1,
        "object_type": "horizontal_line",
        "anchor_data_json": "[{\"time\": 1700000000, \"price\": 1.1300}]",
        "style_json": "{}"
    }
    # Insert
    client.post("/api/drawings", json=payload)

    # Delete
    del_resp = client.delete(f"/api/drawings/{payload['id']}")
    assert del_resp.status_code == 200
    assert del_resp.json() == {"status": "ok", "deleted_id": payload["id"]}

    # Confirm empty list
    get_resp = client.get("/api/drawings?workspace_id=1&instrument_id=1")
    assert get_resp.status_code == 200
    assert get_resp.json() == []
