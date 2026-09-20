# Anyama Proxy

Annuaire de proxymité pour trouver rapidement un artisan à Anyama. La version actuelle sépare le **frontend statique HTML/CSS/JS**, prévu pour Vercel, et le **backend Flask persistant**, prévu pour Render avec PostgreSQL/Neon.

## Fonctionnalités

- Annuaire public, recherche par mot-clé, métier et zone.
- Profils artisans avec appel téléphonique et WhatsApp.
- Inscription via l’API JSON ; un contact Téléphone ou WhatsApp suffit, les deux peuvent être remplis.
- Bouton d’envoi grisé tant que les champs nécessaires, le consentement et au moins un contact ne sont pas complets.
- Modération par défaut : les inscriptions sont persistées mais restent masquées (`is_approved=false`).
- Interface orange, thème clair/sombre, watermark ANYAMA PROXY dans le footer.
- Branding : « Créé par Fortuney & AKATech Studio ».
- Interactions morphing : recherche et formulaire se déploient, boutons révèlent leur libellé.
- Lucide Icons, PWA installable, service worker et cache shell.

## Déploiement recommandé

### Backend sur Render

Le dossier racine contient `render.yaml`, `Procfile` et `requirements.txt`.

Variables Render :

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
SECRET_KEY=une-cle-secrete-longue
FRONTEND_ORIGIN=https://votre-frontend.vercel.app
```

Render utilise `gunicorn app:app` et vérifie `/health`.

### Frontend sur Vercel

Importer le même dépôt et choisir `frontend` comme **Root Directory**. Le dossier est statique et ne nécessite pas de build.

Après création du service Render, modifier `frontend/app.js` :

```js
const API_BASE = 'https://votre-api.onrender.com';
```

Le site public est `https://anyama-proxy.vercel.app/`. Le backend Render reste utilisé uniquement comme API et espace d’administration. La page publique de retrait est intégrée dans la landing page à l’ancre `#retrait` et envoie les demandes à `/api/removal-requests`; l’administrateur les traite ensuite depuis `/admin`.

Pour éviter une nouvelle compilation, on peut aussi injecter `window.ANYAMA_API_URL` dans la page avant `app.js`.

## Développement local

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

L’ancienne interface Flask server-rendered reste disponible pour compatibilité. Le frontend Vercel est dans `frontend/`.

## Tests

```bash
pytest -q
```

## Structure

```text
app.py                         # Flask, modèle, API CORS
render.yaml                    # service Render
frontend/index.html            # frontend Vercel
frontend/app.js                # API, thème, PWA, validation
frontend/styles.css            # design orange clair/sombre
frontend/manifest.webmanifest  # installation PWA
frontend/sw.js                 # cache offline du shell
frontend/assets/               # assets AKATech
```

## Mise à jour formulaire et identité

Le logo fourni `anyama-proxy-logo.png` est maintenant utilisé dans le header, le footer et comme icône PWA. Le formulaire utilise séparément **Prénom** et **Nom**. Le métier est choisi dans une liste dynamique comprenant les métiers déjà enregistrés ; l’option **Autre métier…** permet d’en saisir un nouveau, qui sera ensuite proposé aux prochains utilisateurs. La zone d’intervention a été retirée. Le champ **Service proposé** est facultatif. Le formulaire exige toujours au moins un numéro parmi Téléphone et WhatsApp.

## Administration et retrait de profil

Les inscriptions publiques sont enregistrées et publiées automatiquement après validation du formulaire. Le quartier est obligatoire et est stocké dans `artisans.zone`. L’interface d’administration est disponible sur `/admin/login` et protège le tableau de bord par `ADMIN_EMAIL` et `ADMIN_PASSWORD_HASH`. Pour générer le hash sans afficher le mot de passe, lancer `python create_admin_hash.py`, puis copier les deux variables dans Render.

La page `/retrait` permet de déposer une doléance avec nom, numéro, artisan concerné et motif facultatif. Le modérateur peut traiter ou refuser la demande. Un retrait passe le profil en `status=withdrawn` et `is_approved=false` sans supprimer la ligne de base de données.

Le script `seed.py` est idempotent : il supprime uniquement les anciennes fiches de démonstration nommées « Roland » et « Jean (Monsieur) » dans les zones « Ferraille » et « Carrefour Ferraille », puis ajoute le contact de démonstration Fofana uniquement si la base est vide. En production, exécuter `python seed.py` avec `DATABASE_URL` Neon configurée ; ne pas activer de reset global afin de préserver les inscriptions réelles.

## Icône favicon / PWA

La nouvelle icône carrée fournie est utilisée dans `frontend/assets/favicon.ico`, `icon-192.png` et `icon-512.png`. Le frontend référence `favicon.ico`, le manifeste PWA utilise les deux tailles PNG et le service worker les met en cache.



git add .
git commit -m "derniere version11134"

git push -u origin main
