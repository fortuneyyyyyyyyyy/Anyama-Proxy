import hmac
import os
from datetime import datetime
from functools import wraps

from flask import Flask, flash, jsonify, redirect, render_template, request, session, url_for
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import inspect, or_, text
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import check_password_hash


db = SQLAlchemy()
CATEGORIES = ["Plomberie", "Électricité", "Menuiserie", "Maçonnerie", "Peinture", "Coiffure & beauté", "Cuisine", "Réparation"]
ZONES = ["Anyama Centre", "Anyama-Adjamé", "Anyama PK18", "Ebimpé", "Azaguié route", "Autre quartier d’Anyama"]
REMOVAL_STATUSES = {"pending": "En attente", "processed": "Retrait effectué", "rejected": "Refusée"}


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
        number = "".join(ch for ch in (self.whatsapp or self.phone) if ch.isdigit() or ch == "+")
        return f"https://wa.me/{number.replace('+', '')}" if number else "#"


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


def admin_configured():
    return bool(os.getenv("ADMIN_EMAIL") and os.getenv("ADMIN_PASSWORD_HASH"))


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

    @app.route("/retrait", methods=["GET", "POST"])
    def removal_request():
        if request.method == "POST":
            payload = request.form
            requester_name = str(payload.get("requester_name", "")).strip()
            requester_phone = str(payload.get("requester_phone", "")).strip()
            artisan_name = str(payload.get("artisan_name", "")).strip()
            if not requester_name or not requester_phone or not artisan_name:
                flash("Merci de renseigner votre nom, votre numéro et l’artisan concerné.", "error")
            else:
                artisan = Artisan.query.filter(Artisan.name.ilike(artisan_name)).first()
                db.session.add(RemovalRequest(requester_name=requester_name, requester_phone=requester_phone,
                                               artisan_name=artisan_name, artisan_id=artisan.id if artisan else None,
                                               reason=str(payload.get("reason", "")).strip() or None))
                db.session.commit()
                return render_template("removal_success.html")
        return render_template("removal_request.html", form=request.form)

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

    @app.route("/admin/login", methods=["GET", "POST"])
    def admin_login():
        if request.method == "POST":
            email = str(request.form.get("email", "")).strip().lower()
            password = str(request.form.get("password", ""))
            password_hash = os.getenv("ADMIN_PASSWORD_HASH", "")
            valid = admin_configured() and hmac.compare_digest(email, os.getenv("ADMIN_EMAIL", "").strip().lower()) and check_password_hash(password_hash, password)
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
                               removal_requests=RemovalRequest.query.order_by(RemovalRequest.created_at.desc()).all(),
                               removal_statuses=REMOVAL_STATUSES)

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

    @app.post("/admin/removals/<int:request_id>/status")
    @admin_required
    def admin_removal_status(request_id):
        removal = RemovalRequest.query.get_or_404(request_id)
        action = request.form.get("action")
        if action == "process":
            removal.status, removal.processed_at = "processed", datetime.utcnow()
            if removal.artisan_id:
                artisan = db.session.get(Artisan, removal.artisan_id)
                if artisan:
                    artisan.is_approved, artisan.status, artisan.withdrawn_at = False, "withdrawn", datetime.utcnow()
        elif action == "reject":
            removal.status, removal.processed_at = "rejected", datetime.utcnow()
        db.session.commit()
        return redirect(url_for("admin_dashboard"))

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
    db.session.commit()


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
    phone = str(payload.get("phone", "")).strip()
    whatsapp = str(payload.get("whatsapp", "")).strip()
    if not phone and not whatsapp:
        return None, "Renseignez au moins un contact : téléphone ou WhatsApp."
    artisan = Artisan(name=full_name, service=str(payload.get("service", "")).strip(), category=category,
                      zone=zone, phone=phone or whatsapp, whatsapp=whatsapp or None,
                      description=str(payload.get("description", "")).strip() or None,
                      is_approved=True, status="approved")
    db.session.add(artisan)
    db.session.commit()
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
