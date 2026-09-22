import hmac
import json
import os
from html import escape
from datetime import datetime
from functools import wraps
from urllib.request import Request as UrlRequest, urlopen

from flask import Flask, flash, jsonify, redirect, render_template, request, session, url_for
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import inspect, or_, text
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import check_password_hash


db = SQLAlchemy()
CATEGORIES = ["Plomberie", "Électricité", "Menuiserie", "Maçonnerie", "Peinture", "Coiffure & beauté", "Cuisine", "Réparation"]
ZONES = ["Anyama Centre", "Anyama-Adjamé", "Anyama PK18", "Ebimpé", "Azaguié route", "Autre quartier d’Anyama"]
REMOVAL_STATUSES = {"pending": "En attente", "processed": "Retrait effectué", "rejected": "Refusée"}
REPORT_STATUSES = {"pending": "En attente", "processed": "Traité", "rejected": "Refusé"}
REPORT_TYPES = {"error": "Erreur sur les informations", "safety": "Signalement sérieux", "withdraw": "Demande de retrait"}


class Artisan(db.Model):
    __tablename__ = "artisans"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    service = db.Column(db.String(160), nullable=True)
    category = db.Column(db.String(80), nullable=False, index=True)
    zone = db.Column(db.String(100), nullable=False, index=True)
    phone = db.Column(db.String(30), nullable=False)
    whatsapp = db.Column(db.String(30), nullable=True)
    description = db.Column(db.Text, nullable=True)
    is_approved = db.Column(db.Boolean, nullable=False, default=True, index=True)
    is_featured = db.Column(db.Boolean, nullable=False, default=False)
    status = db.Column(db.String(20), nullable=False, default="approved", index=True)
    withdrawn_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "service": self.service, "category": self.category,
                "zone": self.zone, "phone": self.phone, "whatsapp": self.whatsapp,
                "description": self.description, "status": self.status,
                "created_at": self.created_at.isoformat(), "whatsapp_url": self.whatsapp_url}

    @property
    def whatsapp_url(self):
        if not self.whatsapp:
            return None
        number = "".join(ch for ch in self.whatsapp if ch.isdigit() or ch == "+")
        return f"https://wa.me/{number.replace('+', '')}" if number else None


class RemovalRequest(db.Model):
    __tablename__ = "removal_requests"
    id = db.Column(db.Integer, primary_key=True)
    requester_name = db.Column(db.String(120), nullable=False)
    requester_phone = db.Column(db.String(30), nullable=False)
    artisan_id = db.Column(db.Integer, db.ForeignKey("artisans.id"), nullable=True)
    artisan_name = db.Column(db.String(120), nullable=False)
    reason = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False, default="pending", index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    processed_at = db.Column(db.DateTime, nullable=True)
    artisan = db.relationship("Artisan", backref=db.backref("removal_requests", lazy=True))


class ProfileReport(db.Model):
    __tablename__ = "profile_reports"
    id = db.Column(db.Integer, primary_key=True)
    artisan_id = db.Column(db.Integer, db.ForeignKey("artisans.id"), nullable=True)
    artisan_name = db.Column(db.String(120), nullable=False)
    report_type = db.Column(db.String(20), nullable=False, default="error", index=True)
    reasons = db.Column(db.Text, nullable=False)
    details = db.Column(db.Text, nullable=True)
    profile_snapshot = db.Column(db.Text, nullable=True)
    proposed_profile = db.Column(db.Text, nullable=True)
    reporter_name = db.Column(db.String(120), nullable=True)
    reporter_phone = db.Column(db.String(30), nullable=True)
    reporter_email = db.Column(db.String(160), nullable=True)
    status = db.Column(db.String(20), nullable=False, default="pending", index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    processed_at = db.Column(db.DateTime, nullable=True)
    artisan = db.relationship("Artisan", backref=db.backref("profile_reports", lazy=True))



    @property
    def reasons_display(self):
        try:
            return ", ".join(json.loads(self.reasons))
        except (TypeError, json.JSONDecodeError):
            return self.reasons or "Aucun motif"

    @property
    def snapshot_display(self):
        try:
            data = json.loads(self.profile_snapshot or "{}")
            return " · ".join(f"{key}: {value or 'Non renseigné'}" for key, value in data.items())
        except (TypeError, json.JSONDecodeError):
            return self.profile_snapshot or "Informations indisponibles"

    @property
    def comparison_rows(self):
        labels = {"name": "Nom", "category": "Métier", "zone": "Quartier", "phone": "Téléphone", "whatsapp": "WhatsApp", "service": "Service", "description": "Description"}
        try:
            old = json.loads(self.profile_snapshot or "{}")
            proposed = json.loads(self.proposed_profile or "{}")
        except (TypeError, json.JSONDecodeError):
            return []
        old_by_label = {key: old.get(label, "") for key, label in labels.items()}
        return [{"key": key, "label": label, "old": old_by_label.get(key, ""), "new": proposed.get(key, ""), "changed": old_by_label.get(key, "") != proposed.get(key, "")} for key, label in labels.items()]


def admin_configured():
    return bool(os.getenv("ADMIN_EMAIL") and (os.getenv("ADMIN_PASSWORD") or os.getenv("ADMIN_PASSWORD_HASH")))


def send_admin_notification(subject, body_html, tab):
    """Send a best-effort Resend alert; form submissions never fail if email is unavailable."""
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    admin_email = os.getenv("ADMIN_EMAIL", "").strip()
    if not api_key or not admin_email:
        app.logger.warning("Notification email skipped: RESEND_API_KEY or ADMIN_EMAIL is missing")
        return False
    origin = os.getenv("FRONTEND_ORIGIN", "https://anyama-proxy.vercel.app").rstrip("/")
    admin_url = f"{origin}/admin?tab={tab}"
    html_body = f"{body_html}<p style='margin-top:24px'><a href='{escape(admin_url)}' style='display:inline-block;padding:12px 18px;background:#f82000;color:#17120e;text-decoration:none;border-radius:999px;font-weight:700'>Ouvrir l’administration</a></p>"
    payload = json.dumps({
        "from": os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev"),
        "to": [admin_email],
        "subject": subject,
        "html": html_body,
    }).encode("utf-8")
    try:
        request = UrlRequest("https://api.resend.com/emails", data=payload, headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}, method="POST")
        with urlopen(request, timeout=10) as response:
            return 200 <= response.status < 300
    except Exception:
        app.logger.exception("Resend notification failed")
        return False


def admin_logged_in():
    return bool(session.get("admin_authenticated"))


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not admin_logged_in():
            return redirect(url_for("admin_login", next=request.path))
        return view(*args, **kwargs)
    return wrapped


def create_app(test_config=None):
    app = Flask(__name__)
    database_url = os.getenv("DATABASE_URL", "sqlite:///anyama_proxy.db")
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+psycopg://", 1)
    elif database_url.startswith("postgresql://") and "+psycopg" not in database_url:
        database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    app.config.update(SECRET_KEY=os.getenv("SECRET_KEY", "dev-only-change-me"),
                      SQLALCHEMY_DATABASE_URI=database_url, SQLALCHEMY_TRACK_MODIFICATIONS=False)
    if test_config:
        app.config.update(test_config)
    db.init_app(app)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)

    @app.after_request
    def add_cors_headers(response):
        allowed = os.getenv("FRONTEND_ORIGIN", "*")
        response.headers["Access-Control-Allow-Origin"] = allowed
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Vary"] = "Origin"
        return response

    @app.context_processor
    def inject_globals():
        return {"current_year": datetime.now().year, "admin_configured": admin_configured()}

    @app.get("/")
    def index():
        q = request.args.get("q", "").strip()
        category = request.args.get("category", "").strip()
        zone = request.args.get("zone", "").strip()
        query = Artisan.query.filter_by(is_approved=True, status="approved")
        if q:
            term = f"%{q}%"
            query = query.filter(or_(Artisan.name.ilike(term), Artisan.service.ilike(term), Artisan.description.ilike(term)))
        if category:
            query = query.filter_by(category=category)
        if zone:
            query = query.filter_by(zone=zone)
        artisans = query.order_by(Artisan.is_featured.desc(), Artisan.created_at.desc()).all()
        return render_template("index.html", artisans=artisans, q=q, category=category, zone=zone, categories=CATEGORIES, zones=ZONES)

    @app.get("/artisan/<int:artisan_id>")
    def artisan_detail(artisan_id):
        artisan = Artisan.query.filter_by(id=artisan_id, is_approved=True, status="approved").first_or_404()
        return render_template("artisan_detail.html", artisan=artisan)

    @app.route("/inscription", methods=["GET", "POST"])
    def registration():
        if request.method == "POST":
            result, error = save_registration(request.form)
            if error:
                flash(error, "error")
                return render_template("registration.html", form=request.form, categories=CATEGORIES, zones=ZONES)
            return render_template("registration_success.html", artisan=result)
        return render_template("registration.html", form={}, categories=CATEGORIES, zones=ZONES)

    @app.route("/api/artisans", methods=["GET", "POST", "OPTIONS"])
    def api_artisans():
        if request.method == "OPTIONS":
            return ("", 204)
        if request.method == "POST":
            payload = request.get_json(silent=True) or {}
            result, error = save_registration(payload)
            if error:
                return jsonify({"success": False, "error": error}), 400
            return jsonify({"success": True, "message": "Inscription publiée", "data": result.to_dict()}), 201
        q = request.args.get("q", "").strip()
        category = request.args.get("category", "").strip()
        zone = request.args.get("zone", "").strip()
        query = Artisan.query.filter_by(is_approved=True, status="approved")
        if q:
            term = f"%{q}%"
            query = query.filter(or_(Artisan.name.ilike(term), Artisan.service.ilike(term), Artisan.description.ilike(term)))
        if category:
            query = query.filter_by(category=category)
        if zone:
            query = query.filter_by(zone=zone)
        artisans = query.order_by(Artisan.is_featured.desc(), Artisan.created_at.desc()).all()
        return jsonify({"success": True, "data": [a.to_dict() for a in artisans], "meta": {"total": len(artisans)}})

    @app.get("/api/meta")
    def api_meta():
        saved_categories = {item[0] for item in db.session.query(Artisan.category).filter(Artisan.category.isnot(None)).distinct().all()}
        categories = list(dict.fromkeys(CATEGORIES + sorted(saved_categories)))
        return jsonify({"success": True, "categories": categories, "zones": ZONES})

    @app.route("/api/profile-reports", methods=["POST", "OPTIONS"])
    def api_profile_reports():
        if request.method == "OPTIONS":
            return ("", 204)
        payload = request.get_json(silent=True) or {}
        report_type = str(payload.get("report_type", "error")).strip().lower()
        if report_type not in REPORT_TYPES:
            return jsonify({"success": False, "error": "Type de signalement invalide."}), 400
        artisan_id = payload.get("artisan_id")
        artisan = db.session.get(Artisan, artisan_id) if artisan_id else None
        if not artisan or not artisan.is_approved or artisan.status != "approved":
            return jsonify({"success": False, "error": "Ce profil n’est plus disponible."}), 404
        reasons = payload.get("reasons", [])
        if isinstance(reasons, str):
            reasons = [reasons]
        reasons = [str(reason).strip() for reason in reasons if str(reason).strip()]
        if not reasons:
            return jsonify({"success": False, "error": "Sélectionnez au moins un motif."}), 400
        details = str(payload.get("details", "")).strip() or None
        reporter_name = str(payload.get("reporter_name", "")).strip() or None
        reporter_phone = str(payload.get("reporter_phone", "")).strip() or None
        reporter_email = str(payload.get("reporter_email", "")).strip() or None
        if report_type == "error":
            if not reporter_name or not reporter_phone:
                return jsonify({"success": False, "error": "Votre nom et votre numéro sont obligatoires pour demander une correction."}), 400
            details = None
            reporter_email = None
        snapshot = {"Nom": artisan.name, "Métier": artisan.category, "Quartier": artisan.zone,
                    "Téléphone": artisan.phone or "", "WhatsApp": artisan.whatsapp or "",
                    "Service": artisan.service or "", "Description": artisan.description or ""}
        proposed = None
        if report_type == "error":
            raw_proposed = payload.get("proposed_profile") or {}
            if not isinstance(raw_proposed, dict):
                return jsonify({"success": False, "error": "Les corrections proposées sont invalides."}), 400
            proposed = {key: str(raw_proposed.get(key, "")).strip() for key in ("name", "category", "zone", "phone", "whatsapp", "service", "description")}
            if not proposed["name"] or not proposed["category"] or not proposed["zone"]:
                return jsonify({"success": False, "error": "Le nom, le métier et le quartier corrigés sont obligatoires."}), 400
            for key in ("phone", "whatsapp"):
                if proposed[key] and normalize_ci_contact(proposed[key]) is None:
                    return jsonify({"success": False, "error": "Chaque numéro corrigé doit commencer par +225."}), 400
            if not proposed["phone"] and not proposed["whatsapp"]:
                return jsonify({"success": False, "error": "Conservez au moins un numéro de contact dans la correction."}), 400
            if proposed == {"name": artisan.name, "category": artisan.category, "zone": artisan.zone, "phone": artisan.phone or "", "whatsapp": artisan.whatsapp or "", "service": artisan.service or "", "description": artisan.description or ""}:
                return jsonify({"success": False, "error": "Modifiez au moins une information avant d’envoyer la correction."}), 400
        report = ProfileReport(artisan_id=artisan.id, artisan_name=artisan.name, report_type=report_type,
                               reasons=json.dumps(reasons, ensure_ascii=False), details=details,
                               profile_snapshot=json.dumps(snapshot, ensure_ascii=False),
                               proposed_profile=json.dumps(proposed, ensure_ascii=False) if proposed else None,
                               reporter_name=reporter_name, reporter_phone=reporter_phone, reporter_email=reporter_email)
        db.session.add(report)
        db.session.commit()
        reporter = " · ".join(value for value in (reporter_name, reporter_phone, reporter_email) if value) or "Non renseigné"
        send_admin_notification(
            f"{REPORT_TYPES[report_type]} — {artisan.name}",
            f"<h2>{escape(REPORT_TYPES[report_type])}</h2><p><strong>Profil :</strong> {escape(artisan.name)} · {escape(artisan.category)} · {escape(artisan.zone)}</p><p><strong>Informations exposées :</strong> {escape(' · '.join(value for value in snapshot.values() if value))}</p><p><strong>Correction proposée :</strong> {escape(' · '.join(value for value in (proposed or {}).values() if value) or 'Aucune')}</p><p><strong>Motifs :</strong> {escape(', '.join(reasons))}</p><p><strong>Détails :</strong> {escape(details or 'Aucun détail')}</p><p><strong>Demandeur :</strong> {escape(reporter)}</p>",
            "reports",
        )
        return jsonify({"success": True, "message": "Votre signalement a été transmis à l’administration."}), 201

    @app.route("/admin/login", methods=["GET", "POST"])
    def admin_login():
        if request.method == "POST":
            email = str(request.form.get("email", "")).strip().lower()
            password = str(request.form.get("password", ""))
            configured_password = os.getenv("ADMIN_PASSWORD") or os.getenv("ADMIN_PASSWORD_HASH", "")
            if configured_password.startswith(("scrypt:", "pbkdf2:", "argon2:")):
                password_valid = check_password_hash(configured_password, password)
            else:
                password_valid = hmac.compare_digest(configured_password, password)
            valid = admin_configured() and hmac.compare_digest(email, os.getenv("ADMIN_EMAIL", "").strip().lower()) and password_valid
            if valid:
                session.clear()
                session["admin_authenticated"] = True
                return redirect(request.args.get("next") or url_for("admin_dashboard"))
            flash("Identifiants administrateur invalides.", "error")
        return render_template("admin_login.html")

    @app.post("/admin/logout")
    def admin_logout():
        session.clear()
        return redirect(url_for("admin_login"))

    @app.get("/admin")
    @admin_required
    def admin_dashboard():
        return render_template("admin_dashboard.html", artisans=Artisan.query.order_by(Artisan.created_at.desc()).all(),
                               reports=ProfileReport.query.order_by(ProfileReport.created_at.desc()).all(),
                               report_statuses=REPORT_STATUSES, report_types=REPORT_TYPES)

    @app.post("/admin/artisans/<int:artisan_id>/status")
    @admin_required
    def admin_artisan_status(artisan_id):
        artisan = Artisan.query.get_or_404(artisan_id)
        action = request.form.get("action")
        if action == "approve":
            artisan.is_approved, artisan.status, artisan.withdrawn_at = True, "approved", None
        elif action in {"disable", "reject"}:
            artisan.is_approved, artisan.status = False, "rejected"
        elif action == "withdraw":
            artisan.is_approved, artisan.status, artisan.withdrawn_at = False, "withdrawn", datetime.utcnow()
        db.session.commit()
        return redirect(url_for("admin_dashboard"))

    @app.post("/admin/reports/<int:report_id>/status")
    @admin_required
    def admin_report_status(report_id):
        report = ProfileReport.query.get_or_404(report_id)
        action = request.form.get("action")
        if action == "process":
            if report.report_type == "error" and report.proposed_profile and report.artisan_id:
                proposed = json.loads(report.proposed_profile)
                artisan = db.session.get(Artisan, report.artisan_id)
                if artisan:
                    artisan.name = proposed["name"]
                    artisan.category = proposed["category"]
                    artisan.zone = proposed["zone"]
                    artisan.phone = proposed["phone"]
                    artisan.whatsapp = proposed["whatsapp"] or None
                    artisan.service = proposed["service"] or ""
                    artisan.description = proposed["description"] or None
            report.status, report.processed_at = "processed", datetime.utcnow()
        elif action == "reject":
            report.status, report.processed_at = "rejected", datetime.utcnow()
        elif action == "withdraw":
            report.status, report.processed_at = "processed", datetime.utcnow()
            if report.artisan_id:
                artisan = db.session.get(Artisan, report.artisan_id)
                if artisan:
                    artisan.is_approved, artisan.status, artisan.withdrawn_at = False, "withdrawn", datetime.utcnow()
        db.session.commit()
        return redirect(url_for("admin_dashboard", tab="reports"))

    @app.get("/health")
    def health():
        return jsonify({"status": "ok", "service": "anyama-proxy"})

    @app.get("/mentions-legales")
    def legal_mentions():
        return redirect(f"{os.getenv('FRONTEND_ORIGIN', 'https://anyama-proxy.vercel.app').rstrip('/')}/legal/mentions-legales.html")

    @app.get("/politique-confidentialite")
    def legal_privacy():
        return redirect(f"{os.getenv('FRONTEND_ORIGIN', 'https://anyama-proxy.vercel.app').rstrip('/')}/legal/politique-confidentialite.html")

    @app.get("/cgu")
    def legal_terms():
        return redirect(f"{os.getenv('FRONTEND_ORIGIN', 'https://anyama-proxy.vercel.app').rstrip('/')}/legal/cgu.html")

    @app.errorhandler(404)
    def not_found(_error):
        return render_template("404.html"), 404

    with app.app_context():
        db.create_all()
        ensure_schema()
        if not os.getenv("DATABASE_URL"):
            seed_artisans()
    return app


def ensure_schema():
    """Additive migration for existing SQLite/Neon installations."""
    inspector = inspect(db.engine)
    artisan_columns = {column["name"] for column in inspector.get_columns("artisans")}
    additions = {
        "status": "VARCHAR(20) NOT NULL DEFAULT 'approved'",
        "withdrawn_at": "TIMESTAMP NULL",
    }
    for name, definition in additions.items():
        if name not in artisan_columns:
            db.session.execute(text(f"ALTER TABLE artisans ADD COLUMN {name} {definition}"))
    db.session.execute(text("UPDATE artisans SET status = CASE WHEN is_approved THEN 'approved' ELSE 'rejected' END WHERE status IS NULL OR status = ''"))
    report_columns = {column["name"] for column in inspect(db.engine).get_columns("profile_reports")}
    if "profile_snapshot" not in report_columns:
        db.session.execute(text("ALTER TABLE profile_reports ADD COLUMN profile_snapshot TEXT NULL"))
    if "proposed_profile" not in report_columns:
        db.session.execute(text("ALTER TABLE profile_reports ADD COLUMN proposed_profile TEXT NULL"))
    db.session.commit()


def normalize_ci_contact(value):
    """Return a cleaned Côte d’Ivoire number, or None when its +225 prefix is missing."""
    raw = " ".join(str(value or "").strip().split())
    if not raw:
        return ""
    compact = "".join(ch for ch in raw if ch.isdigit() or ch == "+")
    if not compact.startswith("+225"):
        return None
    national = compact[4:]
    if not national.isdigit() or len(national) < 8:
        return None
    return raw


def save_registration(payload):
    first_name = str(payload.get("first_name", "")).strip()
    last_name = str(payload.get("last_name", "")).strip()
    full_name = " ".join(part for part in (first_name, last_name) if part) or str(payload.get("name", "")).strip()
    category = str(payload.get("category", "")).strip()
    if category == "__other__":
        category = str(payload.get("category_custom", "")).strip()
    zone = str(payload.get("zone", "")).strip()
    required = [full_name, category, zone, str(payload.get("consent", "")).strip()]
    if any(not field for field in required):
        return None, "Merci de renseigner votre prénom, votre nom, votre métier, votre quartier et d’accepter la publication."

    phone = normalize_ci_contact(payload.get("phone"))
    whatsapp = normalize_ci_contact(payload.get("whatsapp"))
    if phone is None or whatsapp is None:
        return None, "Chaque numéro doit commencer par l’indicatif +225 (ex. +225 07 00 00 00 00)."
    if not phone and not whatsapp:
        return None, "Renseignez au moins un contact : téléphone ou WhatsApp."

    artisan = Artisan(name=full_name, service=str(payload.get("service", "")).strip(), category=category,
                      zone=zone, phone=phone, whatsapp=whatsapp or None,
                      description=str(payload.get("description", "")).strip() or None,
                      is_approved=False, status="pending")
    db.session.add(artisan)
    db.session.commit()
    send_admin_notification(
        "Nouvelle inscription à valider — Anyama Proxy",
        f"<h2>Nouvelle inscription en attente de validation</h2><p><strong>Nom :</strong> {escape(artisan.name)}</p><p><strong>Métier :</strong> {escape(artisan.category)}</p><p><strong>Quartier :</strong> {escape(artisan.zone)}</p><p><strong>Téléphone :</strong> {escape(artisan.phone or 'Non renseigné')}</p><p><strong>WhatsApp :</strong> {escape(artisan.whatsapp or 'Non renseigné')}</p>",
        "artisans",
    )
    return artisan, None


def seed_artisans():
    if Artisan.query.count():
        return
    demo = [
        Artisan(name="Kouassi Électricité", service="Installations & dépannage électrique", category="Électricité", zone="Anyama Centre", phone="07 08 09 10 11", whatsapp="0708091011", description="Interventions rapides pour installations domestiques, pannes et mise en sécurité.", is_approved=True, is_featured=True, status="approved"),
        Artisan(name="Atelier Grâce", service="Menuiserie sur mesure", category="Menuiserie", zone="Anyama-Adjamé", phone="05 44 20 18 32", whatsapp="0544201832", description="Meubles, portes et aménagements fabriqués avec soin à Anyama.", is_approved=True, is_featured=True, status="approved"),
        Artisan(name="Bâtir Plus", service="Maçonnerie & rénovation", category="Maçonnerie", zone="Ebimpé", phone="01 02 34 56 78", description="Petits et grands travaux de maçonnerie, rénovation et finitions.", is_approved=True, status="approved"),
        Artisan(name="Maman Awa", service="Coiffure à domicile", category="Coiffure & beauté", zone="Anyama PK18", phone="07 11 22 33 44", whatsapp="0711223344", description="Coiffures modernes et soins à domicile sur rendez-vous.", is_approved=True, status="approved"),
    ]
    db.session.add_all(demo)
    db.session.commit()


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=os.getenv("FLASK_DEBUG") == "1")
