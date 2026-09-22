import json

from app import Artisan, create_app, db


def make_client(tmp_path, monkeypatch):
    monkeypatch.setenv('ADMIN_EMAIL', 'admin@example.com')
    monkeypatch.setenv('RESEND_API_KEY', 're_test_key')
    monkeypatch.setenv('RESEND_FROM_EMAIL', 'notifications@example.com')
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': f'sqlite:///{tmp_path / "resend.db"}'})
    return app, app.test_client()


def test_resend_notifications_cover_registration_and_all_profile_report_types(tmp_path, monkeypatch):
    app, client = make_client(tmp_path, monkeypatch)
    calls = []

    class FakeResponse:
        status = 200
        def __enter__(self):
            return self
        def __exit__(self, *args):
            return False

    def fake_urlopen(request, timeout=10):
        calls.append({
            'url': request.full_url,
            'headers': dict(request.header_items()),
            'payload': json.loads(request.data.decode('utf-8')),
            'timeout': timeout,
        })
        return FakeResponse()

    monkeypatch.setattr('app.urlopen', fake_urlopen)
    registration = client.post('/api/artisans', json={
        'first_name': 'Nouvel', 'last_name': 'Artisan', 'category': 'Plomberie',
        'zone': 'Anyama Centre', 'phone': '+225 07 00 00 00 00', 'consent': 'on',
    })
    assert registration.status_code == 201

    correction = client.post('/api/profile-reports', json={
        'artisan_id': 1, 'report_type': 'error', 'reasons': ['Mauvais métier'],
        'reporter_name': 'Visiteur Test', 'reporter_phone': '+225 05 00 00 00 00',
        'proposed_profile': {'name': 'Kouassi Corrigé', 'category': 'Plomberie', 'zone': 'Anyama Centre', 'phone': '+225 07 08 09 10 11', 'whatsapp': '', 'service': 'Service corrigé', 'description': 'Description corrigée'},
    })
    safety = client.post('/api/profile-reports', json={
        'artisan_id': 1, 'report_type': 'safety', 'reasons': ['Escroquerie présumée'],
        'reporter_phone': '+225 05 00 00 00 00', 'details': 'Vérification demandée',
    })
    withdrawal = client.post('/api/profile-reports', json={
        'artisan_id': 1, 'report_type': 'withdraw', 'reasons': ['Activité arrêtée'],
        'reporter_name': 'Visiteur Test', 'reporter_phone': '+225 05 00 00 00 00',
    })
    assert correction.status_code == 201
    assert safety.status_code == 201
    assert withdrawal.status_code == 201
    assert len(calls) == 4
    assert all(call['url'] == 'https://api.resend.com/emails' for call in calls)
    assert all(call['payload']['to'] == ['admin@example.com'] for call in calls)
    assert all(call['payload']['from'] == 'notifications@example.com' for call in calls)
    subjects = [call['payload']['subject'] for call in calls]
    assert any('Nouvelle inscription' in subject for subject in subjects)
    assert any('Erreur sur les informations' in subject for subject in subjects)
    assert any('Signalement sérieux' in subject for subject in subjects)
    assert any('Demande de retrait' in subject for subject in subjects)
    assert all('admin?tab=' in call['payload']['html'] for call in calls)
    assert all('email-card' in call['payload']['html'] for call in calls)
    assert all('email-header' in call['payload']['html'] for call in calls)
    assert all(call['headers'].get('User-agent') == 'anyama-proxy/1.0' for call in calls)
    with app.app_context():
        db.drop_all()


def test_resend_failure_does_not_break_submission(tmp_path, monkeypatch):
    app, client = make_client(tmp_path, monkeypatch)

    def failing_urlopen(request, timeout=10):
        raise OSError('Resend unavailable')

    monkeypatch.setattr('app.urlopen', failing_urlopen)
    response = client.post('/api/artisans', json={
        'first_name': 'Inscription', 'last_name': 'Sans Mail', 'category': 'Plomberie',
        'zone': 'Anyama Centre', 'phone': '+225 07 00 00 00 00', 'consent': 'on',
    })
    assert response.status_code == 201
    with app.app_context():
        assert Artisan.query.filter_by(name='Inscription Sans Mail').first() is not None
        db.drop_all()
