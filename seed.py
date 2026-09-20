import os

from app import create_app
from app.models import Artisan, db

app = create_app()

with app.app_context():
    if Artisan.query.count() == 0:
        demo = [
            {"name": "Fofana", "job": "Réparateur TV", "neighborhood": "Carrefour Ferraille", "phone": "05 54 13 49 01"},
            {"name": "Roland", "job": "Coiffeur", "neighborhood": "Ferraille", "phone": "07 04 31 45 42"},
            {"name": "Jean (Monsieur)", "job": "Coursier / Chauffeur", "neighborhood": "Carrefour Ferraille", "phone": "07 12 41 35 49"},
        ]
        db.session.add_all(Artisan(**item) for item in demo)
        db.session.commit()
        print("3 contacts de démonstration ajoutés.")
    else:
        print("La base contient déjà des contacts, aucune modification.")
