"""Functional API checks for contracts, calculations, and demo-mode uploads."""
from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.planning import estimate
from app.schemas import PlanningRequest

client = TestClient(app)


def test_health_reports_demo_mode_without_api_key():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_planning_estimate_returns_inr_contract():
    response = client.post("/api/planning/estimate", json={
        "structure_type": "Residential house", "built_up_sqft": 2000,
        "location_tier": "Tier 1", "completion_percentage": 25, "city": "Pune",
    })
    assert response.status_code == 200
    body = response.json()
    assert body["currency"] == "INR"
    assert body["estimated_project_budget_inr"] == 5_250_000
    assert body["estimated_capex_incurred_inr"] == 1_312_500
    assert body["estimated_steel_kg"] > 0
    assert body["estimated_duration_days"] > 0
    assert body["task_schedule"][0]["task_name"] == "Pre-construction & permits"
    assert body["task_schedule"][-1]["status"] in {"Upcoming", "In progress", "Complete"}


def test_planning_rejects_out_of_range_completion():
    response = client.post("/api/planning/estimate", json={
        "structure_type": "Residential house", "built_up_sqft": 2000,
        "location_tier": "Tier 1", "completion_percentage": 120, "city": "Pune",
    })
    assert response.status_code == 422


def test_safety_demo_upload_returns_strict_report():
    image_data = BytesIO()
    Image.new("RGB", (80, 80), color="green").save(image_data, format="PNG")
    response = client.post("/api/safety/analyze", files={"photo": ("site.png", image_data.getvalue(), "image/png")}, data={"context": "Site entrance"})
    assert response.status_code == 200
    body = response.json()
    assert 0 <= body["safety_score"] <= 100
    assert body["analysis_mode"] in {"Gemini", "Demonstration"}
    assert "helmet" in body["ppe_detection"]
    assert isinstance(body["hazards"], list)
    assert set(body["ppe_detection"]) == {"helmet", "high_visibility_vest", "steel_toe_boots", "safety_harness"}


def test_crack_demo_upload_returns_classification_contract():
    image_data = BytesIO()
    Image.new("RGB", (80, 80), color="gray").save(image_data, format="JPEG")
    response = client.post("/api/cracks/analyze", files={"photo": ("wall.jpg", image_data.getvalue(), "image/jpeg")})
    assert response.status_code == 200
    body = response.json()
    assert body["defect_type"] in {"Hairline", "Settlement", "Structural Shear", "Thermal Expansion", "Spalling", "Unclear"}
    assert isinstance(body["root_causes"], list)
    assert body["engineering_note"]


def test_upload_rejects_non_image_content():
    response = client.post("/api/cracks/analyze", files={"photo": ("notes.txt", b"not an image", "text/plain")})
    assert response.status_code == 415


def test_upload_rejects_incomplete_image_bytes():
    response = client.post("/api/cracks/analyze", files={"photo": ("broken.png", b"\x89PNG\r\nnot-a-complete-image", "image/png")})
    assert response.status_code == 422


def test_planning_service_calculates_completion_capex():
    result = estimate(PlanningRequest(
        structure_type="Commercial building", built_up_sqft=1000,
        location_tier="Tier 2", completion_percentage=50, city="Mysuru",
    ))
    assert result.estimated_project_budget_inr == 3_200_000
    assert result.estimated_capex_incurred_inr == 1_600_000
