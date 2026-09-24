import pytest
from datetime import datetime, timedelta
from sqlalchemy import inspect, text
from app import AnalyticsEvent, Artisan, ProductFeedback, ProfileReport, Review, create_app, db, ensure_schema, purge_expired_history

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



def test_error_report_requires_reporter_name_and_phone(client):
    response = client.post('/api/profile-reports', json={
        "artisan_id": 1, "report_type": "error", "reasons": ["Coordonnées incorrectes"],
    })
    assert response.status_code == 400
    assert "nom" in response.get_json()["error"]


def test_error_report_saves_exposed_profile_snapshot_without_details_or_email(client):
    response = client.post('/api/profile-reports', json={
        "artisan_id": 1, "report_type": "error", "reasons": ["Mauvais métier"],
        "details": "Ne doit pas être conservé", "reporter_name": "Awa Test",
        "reporter_phone": "+225 07 00 00 00 00", "reporter_email": "awa@example.com",
        "proposed_profile": {"name": "Kouassi Corrigé", "category": "Plomberie", "zone": "Anyama Centre", "phone": "+225 07 00 00 00 00", "whatsapp": "", "service": "Dépannage corrigé", "description": "Profil corrigé"},
    })
    assert response.status_code == 201
    with client.application.app_context():
        from app import ProfileReport
        report = ProfileReport.query.one()
        assert report.details is None
        assert report.reporter_email is None
        assert "Nom" in report.snapshot_display
        assert "Téléphone" in report.snapshot_display



def test_admin_accepting_correction_updates_artisan_only_after_approval(client):
    payload = {
        "artisan_id": 1, "report_type": "error", "reasons": ["Mauvais métier"],
        "reporter_name": "Awa Admin Test", "reporter_phone": "+225 07 00 00 00 00",
        "proposed_profile": {"name": "Kouassi Modifié", "category": "Peinture", "zone": "Anyama PK18", "phone": "+225 05 00 00 00 00", "whatsapp": "", "service": "Service corrigé", "description": "Description corrigée"},
    }
    response = client.post('/api/profile-reports', json=payload)
    assert response.status_code == 201
    with client.application.app_context():
        artisan = Artisan.query.get(1)
        assert artisan.name == "Kouassi Électricité"
    with client.session_transaction() as session:
        session['admin_authenticated'] = True
    response = client.post('/admin/reports/1/status', data={'action': 'process'})
    assert response.status_code == 302
    with client.application.app_context():
        artisan = Artisan.query.get(1)
        assert artisan.name == "Kouassi Modifié"
        assert artisan.category == "Peinture"
        report = ProfileReport.query.one()
        assert report.status == "processed"



def test_admin_rejecting_correction_keeps_original_profile(client):
    response = client.post('/api/profile-reports', json={
        "artisan_id": 1, "report_type": "error", "reasons": ["Mauvais quartier"],
        "reporter_name": "Awa Refus Test", "reporter_phone": "+225 07 00 00 00 00",
        "proposed_profile": {"name": "Fausse correction", "category": "Plomberie", "zone": "Ebimpé", "phone": "+225 05 00 00 00 00", "whatsapp": "", "service": "", "description": ""},
    })
    assert response.status_code == 201
    with client.session_transaction() as session:
        session['admin_authenticated'] = True
    assert client.post('/admin/reports/1/status', data={'action': 'reject'}).status_code == 302
    with client.application.app_context():
        artisan = Artisan.query.get(1)
        assert artisan.name == "Kouassi Électricité"
        assert artisan.zone == "Anyama Centre"
        assert ProfileReport.query.one().status == "rejected"



def test_reviews_use_anonymous_cookie_and_block_duplicate(client):
    get_response = client.get('/api/artisans/1/reviews')
    assert get_response.status_code == 200
    assert 'visitor_id=' in get_response.headers.get('Set-Cookie', '')
    response = client.post('/api/artisans/1/reviews', json={"rating": 5, "comment": "Très bon service"})
    assert response.status_code == 201
    assert response.get_json()["status"] == "published"
    duplicate = client.post('/api/artisans/1/reviews', json={"rating": 4})
    assert duplicate.status_code == 409
    payload = client.get('/api/artisans/1/reviews').get_json()
    assert payload["summary"]["average"] == 5.0
    assert payload["summary"]["count"] == 1


def test_reviews_validate_rating_and_comment_length(client):
    assert client.post('/api/artisans/1/reviews', json={"rating": 6}).status_code == 400
    assert client.post('/api/artisans/1/reviews', json={"rating": 0}).status_code == 400
    assert client.post('/api/artisans/1/reviews', json={"rating": 4, "comment": "x" * 501}).status_code == 400


def test_reviews_require_published_artisan(client):
    response = client.post('/api/artisans/9999/reviews', json={"rating": 5})
    assert response.status_code == 404



def test_artisan_events_increment_popularity_counters(client):
    assert client.post('/api/artisans/1/events', json={"type": "view"}).status_code == 204
    assert client.post('/api/artisans/1/events', json={"type": "phone"}).status_code == 204
    assert client.post('/api/artisans/1/events', json={"type": "whatsapp"}).status_code == 204
    assert client.post('/api/artisans/1/events', json={"type": "invalid"}).status_code == 400
    with client.application.app_context():
        artisan = Artisan.query.get(1)
        assert artisan.view_count == 1
        assert artisan.phone_click_count == 1
        assert artisan.whatsapp_click_count == 1


def test_product_feedback_is_saved_and_duplicate_is_blocked(client):
    response = client.post('/api/feedback', json={
        "type": "visitor",
        "answers": {"ease_rating": "5", "design_rating": "4", "experience_rating": "5", "comment": "Très clair."},
    })
    assert response.status_code == 201
    duplicate = client.post('/api/feedback', json={"type": "visitor", "answers": {"experience_rating": "3", "comment": "Encore."}})
    assert duplicate.status_code == 409
    summary = client.get('/api/feedback/summary').get_json()
    assert summary["count"] == 1
    assert summary["average"] == 5.0
    with client.application.app_context():
        assert ProductFeedback.query.count() == 1


def test_landing_displays_visitor_experience_average(client):
    response = client.post('/api/feedback', json={
        "type": "visitor",
        "answers": {"ease_rating": "5", "design_rating": "4", "experience_rating": "4"},
    })
    assert response.status_code == 201
    landing = client.get('/')
    assert '★ 4.0'.encode() in landing.data
    assert '1 retour'.encode() in landing.data


def test_cookie_consent_is_counted_once_per_visitor(client):
    assert client.post('/api/analytics/events', json={"event": "cookie_consent_accepted"}).status_code == 204
    assert client.post('/api/analytics/events', json={"event": "cookie_consent_accepted"}).status_code == 204
    with client.application.app_context():
        assert AnalyticsEvent.query.filter_by(event_name="cookie_consent_accepted").count() == 1


def test_feedback_tab_is_admin_only(client):
    public = client.get('/')
    assert b'feedback-fab' in public.data
    with client.session_transaction() as session:
        session['admin_authenticated'] = True
    admin = client.get('/admin?tab=feedback')
    assert admin.status_code == 200
    assert 'Feedback &amp; Expérience'.encode() in admin.data
    assert b'feedback-fab' not in admin.data


def test_analytics_tracks_page_paths_and_repeated_page_views(client):
    first = client.post('/api/analytics/events', json={"event": "page_view", "path": "/inscription?source=home"})
    second = client.post('/api/analytics/events', json={"event": "directory_search", "path": "/#annuaire"})
    third = client.post('/api/analytics/events', json={"event": "page_view", "path": "/"})
    duplicate = client.post('/api/analytics/events', json={"event": "page_view", "path": "/?campaign=test"})
    assert first.status_code == second.status_code == third.status_code == duplicate.status_code == 204
    with client.application.app_context():
        events = AnalyticsEvent.query.order_by(AnalyticsEvent.id).all()
        assert [event.page_path for event in events] == ['/inscription', '/#annuaire', '/']
        assert [event.event_name for event in events] == ['page_view', 'directory_search', 'page_view']


def test_analytics_rejects_unknown_events_and_keeps_cookie_consent_deduplicated(client):
    assert client.post('/api/analytics/events', json={"event": "typed_password", "path": "/"}).status_code == 400
    assert client.post('/api/analytics/events', json={"event": "cookie_consent_accepted", "path": "/"}).status_code == 204
    assert client.post('/api/analytics/events', json={"event": "cookie_consent_accepted", "path": "/"}).status_code == 204
    with client.application.app_context():
        assert AnalyticsEvent.query.filter_by(event_name='cookie_consent_accepted').count() == 1


def test_existing_analytics_table_gets_additive_page_path_migration(client):
    with client.application.app_context():
        db.session.execute(text('DROP INDEX ix_analytics_events_page_path'))
        db.session.execute(text('ALTER TABLE analytics_events DROP COLUMN page_path'))
        db.session.execute(text('DROP INDEX ix_artisans_archived_at'))
        db.session.execute(text('ALTER TABLE artisans DROP COLUMN archived_at'))
        db.session.commit()
        db.engine.dispose()
        ensure_schema()
        columns = {column['name'] for column in inspect(db.engine).get_columns('analytics_events')}
        assert 'page_path' in columns
        artisan_columns = {column['name'] for column in inspect(db.engine).get_columns('artisans')}
        assert 'archived_at' in artisan_columns
        assert 'ix_artisans_archived_at' in {index['name'] for index in inspect(db.engine).get_indexes('artisans')}


def test_admin_analytics_dashboard_renders_daily_curves_and_journeys(client):
    client.post('/api/analytics/events', json={"event": "page_view", "path": "/"})
    client.post('/api/analytics/events', json={"event": "profile_open", "path": "/"})
    with client.session_transaction() as session:
        session['admin_authenticated'] = True
    response = client.get('/admin?tab=analytics&days=7')
    assert response.status_code == 200
    assert b'Visiteurs par jour' in response.data
    assert b'Inscriptions re' in response.data
    assert b'Parcours r' in response.data
    assert b'chartData' in response.data
    assert b'window.location.reload' not in response.data


def test_admin_archive_action_soft_archives_published_artisan(client):
    with client.session_transaction() as session:
        session['admin_authenticated'] = True
    response = client.post('/admin/artisans/1/status', data={'action': 'archive'})
    assert response.status_code == 302
    with client.application.app_context():
        artisan = db.session.get(Artisan, 1)
        assert artisan.status == 'withdrawn'
        assert artisan.is_approved is False
        assert artisan.withdrawn_at is not None
        assert artisan.archived_at is not None
        assert Artisan.query.count() >= 1


def test_admin_archived_report_is_retained_for_history(client):
    client.post('/api/profile-reports', json={
        "artisan_id": 1, "report_type": "safety", "reasons": ["Escroquerie présumée"]
    })
    with client.session_transaction() as session:
        session['admin_authenticated'] = True
    response = client.post('/admin/reports/1/status', data={'action': 'archive'})
    assert response.status_code == 302
    with client.application.app_context():
        report = ProfileReport.query.one()
        assert report.status == 'rejected'
        assert report.processed_at is not None
        assert ProfileReport.query.count() == 1


def test_expired_history_is_purged_after_30_days_and_recent_history_is_kept(client):
    now = datetime.utcnow()
    expired = now - timedelta(days=31)
    with client.application.app_context():
        db.session.add_all([
            Artisan(name='Ancienne archive', category='Couture', zone='Anyama Centre', phone='+225 0700000000', is_approved=False, status='rejected', created_at=expired, archived_at=expired),
            Artisan(name='Archive récente', category='Couture', zone='Anyama Centre', phone='+225 0700000001', is_approved=False, status='withdrawn', created_at=expired, withdrawn_at=now - timedelta(days=2), archived_at=now - timedelta(days=2)),
            ProfileReport(artisan_name='Ancien signalement', report_type='safety', reasons='[]', status='rejected', created_at=expired, processed_at=expired),
            ProfileReport(artisan_name='Signalement récent', report_type='safety', reasons='[]', status='rejected', created_at=expired, processed_at=now - timedelta(days=2)),
        ])
        db.session.commit()
        assert purge_expired_history(now) == (1, 1)
        assert Artisan.query.filter_by(name='Ancienne archive').first() is None
        assert Artisan.query.filter_by(name='Archive récente').first() is not None
        assert ProfileReport.query.filter_by(artisan_name='Ancien signalement').first() is None
        assert ProfileReport.query.filter_by(artisan_name='Signalement récent').first() is not None


def test_admin_can_permanently_delete_archived_artisan_and_detach_history(client):
    with client.application.app_context():
        artisan = db.session.get(Artisan, 1)
        artisan.status, artisan.is_approved, artisan.archived_at = 'withdrawn', False, datetime.utcnow()
        db.session.add(Review(artisan_id=artisan.id, visitor_id='delete-test', rating=5))
        db.session.add(ProfileReport(artisan_id=artisan.id, artisan_name=artisan.name, report_type='safety', reasons='[]', status='rejected'))
        db.session.commit()
    with client.session_transaction() as session:
        session['admin_authenticated'] = True
    response = client.post('/admin/history/artisans/1/delete')
    assert response.status_code == 302
    with client.application.app_context():
        assert db.session.get(Artisan, 1) is None
        assert Review.query.filter_by(visitor_id='delete-test').count() == 0
        report = ProfileReport.query.filter_by(artisan_name='Kouassi Électricité').one()
        assert report.artisan_id is None


def test_admin_can_permanently_delete_rejected_report_from_history(client):
    with client.application.app_context():
        report = ProfileReport(artisan_name='À effacer', report_type='safety', reasons='[]', status='rejected', processed_at=datetime.utcnow())
        db.session.add(report)
        db.session.commit()
        report_id = report.id
    with client.session_transaction() as session:
        session['admin_authenticated'] = True
    response = client.post(f'/admin/history/reports/{report_id}/delete')
    assert response.status_code == 302
    with client.application.app_context():
        assert db.session.get(ProfileReport, report_id) is None


def test_admin_history_renders_expiry_and_permanent_delete_buttons(client):
    with client.application.app_context():
        artisan = db.session.get(Artisan, 1)
        artisan.status, artisan.is_approved, artisan.archived_at = 'rejected', False, datetime.utcnow()
        report = ProfileReport(artisan_name='Signalement exemple', report_type='safety', reasons='[]', status='rejected', processed_at=datetime.utcnow())
        db.session.add(report)
        db.session.commit()
    with client.session_transaction() as session:
        session['admin_authenticated'] = True
    response = client.get('/admin?tab=history')
    assert response.status_code == 200
    assert b'suppression auto le' in response.data
    assert b'Supprimer d' in response.data
    assert b'data-confirm-delete' in response.data
