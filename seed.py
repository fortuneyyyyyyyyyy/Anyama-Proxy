import os

from app import Artisan, create_app, db

app = create_app()

with app.app_context():
    reset_requested = os.getenv("RESET_PROD") == "1"
    if reset_requested:
        deleted = Artisan.query.delete()
        db.session.commit()
        print(f"{deleted} contact(s) supprimé(s) avant le seed.")

    if Artisan.query.count() == 0:
        demo = [
            {"name": "Fofana", "service": "Réparation TV et électronique", "category": "Électricité", "zone": "Anyama Centre", "phone": "0554134901", "whatsapp": "0554134901", "description": "Réparateur TV et dispositifs électroniques à Anyama.", "is_approved": True, "is_featured": False},
            {"name": "Roland", "service": "Coiffure & soins", "category": "Coiffure & beauté", "zone": "Ferraille", "phone": "0704314542", "whatsapp": "0704314542", "description": "Coiffeur local disponible pour coupes et soins.", "is_approved": True, "is_featured": False},
            {"name": "Jean (Monsieur)", "service": "Coursier / chauffeur", "category": "Autre", "zone": "Carrefour Ferraille", "phone": "0712413549", "whatsapp": "0712413549", "description": "Service de livraison et transport local rapide.", "is_approved": True, "is_featured": False},
        ]
        db.session.add_all(Artisan(**item) for item in demo)
        db.session.commit()
        print("3 contacts de démonstration ajoutés.")
    else:
        print("La base contient déjà des contacts, aucune modification.")
