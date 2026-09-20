from app import Artisan, create_app, db

app = create_app()

CONTACTS = [
    {
        "name": "Fofana", "category": "Électricité", "service": "Réparation TV et électronique",
        "phone": "0554134901", "description": "Réparateur TV et dispositifs électroniques à Anyama.", "is_featured": False,
    },
    {
        "name": "Roland", "category": "Coiffure & beauté", "service": "Coiffure & soins",
        "phone": "0704314542", "description": "Coiffeur local disponible pour coupes et soins.", "is_featured": False,
    },
    {
        "name": "Jean (Monsieur)", "category": "Autre", "service": "Coursier / chauffeur",
        "phone": "0712413549", "description": "Service de livraison et transport local rapide.", "is_featured": False,
    },
    {
        "name": "Abdoulaye Coulibaly", "category": "Chauffeur", "service": "Chauffeur yango / chauffeur personnel",
        "phone": "0787105895", "description": "Je vous conduis ou je vous apprends à conduire.", "is_featured": False,
    },
    {
        "name": "Toussaint Toussaint", "category": "Réparation", "service": "Réparateur de ventilateur et mixeur",
        "phone": "0160807453", "description": "Je répare vos ventilateurs et mixeurs. Entretien de vos appareils électroménagers.", "is_featured": False,
    },
    {
        "name": "Ayouba Diaby", "category": "Autre", "service": "Technicien canal",
        "phone": "0779393481", "description": "J’installe et je dépanne vos équipements Canal.", "is_featured": False,
    },
]

with app.app_context():
    legacy_demo_names = ["Kouassi Électricité", "Atelier Grâce", "Bâtir Plus", "Maman Awa"]
    legacy_demo = Artisan.query.filter(Artisan.name.in_(legacy_demo_names)).all()
    for artisan in legacy_demo:
        db.session.delete(artisan)
    if legacy_demo:
        db.session.flush()

    for data in CONTACTS:
        artisan = Artisan.query.filter_by(name=data["name"]).first()
        if artisan is None:
            artisan = Artisan(name=data["name"])
            db.session.add(artisan)
        artisan.category = data["category"]
        artisan.service = data["service"]
        artisan.zone = "Carrefour Ferraille"
        artisan.phone = data["phone"]
        artisan.whatsapp = None
        artisan.description = data["description"]
        artisan.is_featured = data["is_featured"]
        artisan.is_approved = True
        artisan.status = "approved"
    db.session.commit()
    print(f"{len(CONTACTS)} contacts créés ou mis à jour avec le quartier Carrefour Ferraille.")
