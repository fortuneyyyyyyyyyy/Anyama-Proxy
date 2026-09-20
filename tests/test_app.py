import pytest
from app import Artisan, create_app, db

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
    response = client.post('/api/artisans', json={"first_name": "Test", "last_name": "Pro", "category": "Plomberie", "consent": "on"})
    assert response.status_code == 400
    assert "contact" in response.get_json()["error"]

def test_registration_accepts_only_whatsapp_and_optional_service(client):
    response = client.post('/api/artisans', json={"first_name": "Nouveau", "last_name": "Pro", "category": "Réparation de vélos", "whatsapp": "0700000000", "consent": "on"})
    assert response.status_code == 201
    with client.application.app_context():
        artisan = Artisan.query.filter_by(name="Nouveau Pro").first()
        assert artisan is not None
        assert artisan.phone == "0700000000"
        assert artisan.service == ""
        assert artisan.is_approved is False

def test_new_category_is_returned_in_meta(client):
    client.post('/api/artisans', json={"first_name": "Nouveau", "last_name": "Pro", "category": "Réparation de vélos", "whatsapp": "0700000000", "consent": "on"})
    payload = client.get('/api/meta').get_json()
    assert "Réparation de vélos" in payload["categories"]

def test_api_returns_only_approved_artisans_and_cors(client):
    response = client.get('/api/artisans', headers={"Origin": "https://example.vercel.app"})
    payload = response.get_json()
    assert response.status_code == 200
    assert payload["success"] is True
    assert response.headers["Access-Control-Allow-Origin"] == "*"
    assert all(item["name"] != "Nouveau Pro" for item in payload["data"])
