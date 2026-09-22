import pytest
from app import Artisan, ProfileReport, create_app, db

@pytest.fixture()
def client(tmp_path):
    app = create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": f"sqlite:///{tmp_path / 'test.db'}"})
    with app.test_client() as client:
        yield client
    with app.app_context():
        db.drop_all()

def test_homepage_lists_approved_artisans(client):
    response = client.get('/')
    assert response.status_code == 200
    assert b"Kouassi" in response.data

def test_search_filters_by_category(client):
    response = client.get('/?category=Menuiserie')
    assert response.status_code == 200
    assert b"Atelier Gr" in response.data
    assert b"Kouassi" not in response.data

def test_registration_requires_a_contact(client):
    response = client.post('/api/artisans', json={"first_name": "Test", "last_name": "Pro", "category": "Plomberie", "zone": "Anyama Centre", "consent": "on"})
    assert response.status_code == 400
    assert "contact" in response.get_json()["error"]

def test_registration_accepts_only_whatsapp_and_optional_service(client):
    response = client.post('/api/artisans', json={"first_name": "Nouveau", "last_name": "Pro", "category": "Réparation de vélos", "zone": "Anyama PK18", "whatsapp": "+225 07 00 00 00 00", "consent": "on"})
    assert response.status_code == 201
    with client.application.app_context():
        artisan = Artisan.query.filter_by(name="Nouveau Pro").first()
        assert artisan is not None
        assert artisan.phone == ""
        assert artisan.service == ""
        assert artisan.is_approved is False
        assert artisan.status == "pending"


def test_registration_requires_ci_prefix(client):
    response = client.post('/api/artisans', json={"first_name": "Test", "last_name": "CI", "category": "Plomberie", "zone": "Anyama Centre", "phone": "07 00 00 00 00", "consent": "on"})
    assert response.status_code == 400
    assert "+225" in response.get_json()["error"]


def test_registration_keeps_phone_and_whatsapp_separate(client):
    response = client.post('/api/artisans', json={"first_name": "Double", "last_name": "Contact", "category": "Plomberie", "zone": "Anyama Centre", "phone": "+225 07 00 00 00 00", "whatsapp": "+225 05 00 00 00 00", "consent": "on"})
    assert response.status_code == 201
    with client.application.app_context():
        artisan = Artisan.query.filter_by(name="Double Contact").first()
        assert artisan.phone == "+225 07 00 00 00 00"
        assert artisan.whatsapp == "+225 05 00 00 00 00"
        assert artisan.is_approved is False
        assert artisan.status == "pending"


def test_new_category_is_returned_in_meta(client):
    client.post('/api/artisans', json={"first_name": "Nouveau", "last_name": "Pro", "category": "Réparation de vélos", "zone": "Anyama PK18", "whatsapp": "+225 07 00 00 00 00", "consent": "on"})
    payload = client.get('/api/meta').get_json()
    assert "Réparation de vélos" in payload["categories"]

def test_api_returns_only_approved_artisans_and_cors(client):
    response = client.get('/api/artisans', headers={"Origin": "https://example.vercel.app"})
    payload = response.get_json()
    assert response.status_code == 200
    assert payload["success"] is True
    assert response.headers["Access-Control-Allow-Origin"] == "*"
    assert all(item["name"] != "Nouveau Pro" for item in payload["data"])


def test_profile_report_is_private_and_saved(client):
    response = client.post('/api/profile-reports', json={
        "artisan_id": 1,
        "report_type": "safety",
        "reasons": ["Escroquerie présumée", "Autre"],
        "details": "Le numéro ne correspond pas à l’activité.",
        "reporter_phone": "+225 07 00 00 00 00",
    })
    assert response.status_code == 201
    with client.application.app_context():
        report = ProfileReport.query.one()
        assert report.status == "pending"
        assert "Escroquerie présumée" in report.reasons_display
        assert report.reporter_phone == "+225 07 00 00 00 00"

