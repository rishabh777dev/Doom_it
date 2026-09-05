from fastapi.testclient import TestClient
from backend.main import app
from backend.models import Team, CompetitionState, AntiCheatIncident
from backend.database import SessionLocal
from backend.auth import create_access_token

client = TestClient(app)

def get_admin_headers():
    db = SessionLocal()
    try:
        admin_team = db.query(Team).filter(Team.team_name == "admin").first()
        assert admin_team is not None, "Admin team must exist in seed"
        token = create_access_token({
            "sub": admin_team.team_name,
            "role": "admin",
            "session_token": "admin-session-token"
        })
        return {"Authorization": f"Bearer {token}"}
    finally:
        db.close()

def test_ceremony_toggle(admin_headers):
    # Toggle ceremony on
    res = client.post("/api/admin/ceremony/toggle", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "ceremony_active" in data
    prev_state = data["ceremony_active"]

    # Toggle ceremony off/flip
    res2 = client.post("/api/admin/ceremony/toggle", headers=admin_headers)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["ceremony_active"] != prev_state

def test_announcements(admin_headers):
    # Broadcast an announcement
    payload = {
        "message": "🔥 Final 10 minutes of Round 1! Submit your payloads.",
        "severity": "warning"
    }
    res = client.post("/api/admin/announcements", json=payload, headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["global_announcement"] is not None
    assert data["global_announcement"]["message"] == payload["message"]
    assert data["global_announcement"]["severity"] == "warning"

    # Clear announcement
    res_clear = client.delete("/api/admin/announcements", headers=admin_headers)
    assert res_clear.status_code == 200
    data_clear = res_clear.json()
    assert data_clear["global_announcement"] is None

def test_round_qualification_and_cutoff(admin_headers):
    # Get qualification status
    res = client.get("/api/admin/rounds/qualification-status", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "teams" in data
    assert "advancing_cutoff" in data

    # Execute round 1 cutoff
    res_cutoff = client.post("/api/admin/rounds/execute-cutoff", json={"target_round": 1}, headers=admin_headers)
    assert res_cutoff.status_code == 200
    cutoff_data = res_cutoff.json()
    assert cutoff_data["cutoff_executed"] is True

def test_anticheat_radar(admin_headers):
    # Get incidents list
    res = client.get("/api/admin/anticheat/incidents", headers=admin_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)

    # Get a test participant team
    db = SessionLocal()
    try:
        team = db.query(Team).filter(Team.team_name != "admin").first()
        assert team is not None
        team_id = str(team.id)
    finally:
        db.close()

    # Warn action
    warn_res = client.post("/api/admin/anticheat/action", json={
        "team_id": team_id,
        "action": "warn",
        "message": "Arbiter warning test"
    }, headers=admin_headers)
    assert warn_res.status_code == 200
    assert warn_res.json()["action"] == "warn"

    # Cooldown action
    cd_res = client.post("/api/admin/anticheat/action", json={
        "team_id": team_id,
        "action": "cooldown_60"
    }, headers=admin_headers)
    assert cd_res.status_code == 200
    assert cd_res.json()["action"] == "cooldown_60"

    # Pardon action
    pardon_res = client.post("/api/admin/anticheat/action", json={
        "team_id": team_id,
        "action": "pardon"
    }, headers=admin_headers)
    assert pardon_res.status_code == 200
    assert pardon_res.json()["action"] == "pardon"

def test_war_room_matrix(admin_headers):
    res = client.get("/api/admin/war-room/matrix", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "teams" in data
    assert "total_breaches" in data
    assert "first_blood_owners" in data
