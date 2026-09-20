from app import Artisan, create_app, db

app = create_app()

with app.app_context():
    demo_names = ["Fofana", "Roland", "Jean (Monsieur)"]
    demo_contacts = Artisan.query.filter(Artisan.name.in_(demo_names)).all()
    for artisan in demo_contacts:
        artisan.zone = "Carrefour Ferraille"
        artisan.is_approved = True
        artisan.status = "approved"
    if demo_contacts:
        db.session.commit()
        print(f"{len(demo_contacts)} contact(s) de seed mis à jour vers Carrefour Ferraille.")

    if Artisan.query.count() == 0:
        demo = [
            {"name": "Fofana", "service": "Réparation TV et électronique", "category": "Électricité", "zone": "Carrefour Ferraille", "phone": "0554134901", "whatsapp": "0554134901", "description": "Réparateur TV et dispositifs électroniques à Anyama.", "is_approved": True, "is_featured": False, "status": "approved"},
            {"name": "Roland", "service": "Coiffure & soins", "category": "Coiffure & beauté", "zone": "Carrefour Ferraille", "phone": "0704314542", "whatsapp": "0704314542", "description": "Coiffeur local disponible pour coupes et soins.", "is_approved": True, "is_featured": False, "status": "approved"},
            {"name": "Jean (Monsieur)", "service": "Coursier / chauffeur", "category": "Autre", "zone": "Carrefour Ferraille", "phone": "0712413549", "whatsapp": "0712413549", "description": "Service de livraison et transport local rapide.", "is_approved": True, "is_featured": False, "status": "approved"},
        ]
        db.session.add_all(Artisan(**item) for item in demo)
        db.session.commit()
        print("3 contacts de démonstration ajoutés à Carrefour Ferraille.")
    elif not demo_contacts:
        print("Aucun des trois contacts de seed trouvé ; aucun profil existant n’a été modifié.")
    else:
        print("Seed terminé sans suppression de données réelles.")
