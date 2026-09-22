# Anyama Proxy

Anyama Proxy est un annuaire local pour trouver rapidement un artisan à Anyama. Le **frontend public** est déployé sur Vercel et le **backend Flask** sur Render avec PostgreSQL/Neon. Le domaine public de référence est [anyama-proxy.vercel.app](https://anyama-proxy.vercel.app/).

## Fonctionnalités

- Annuaire public avec recherche par mot-clé, métier et quartier.
- Quartier affiché depuis la valeur réellement enregistrée dans `artisans.zone`.
- Profils avec bouton Appeler ; le bouton WhatsApp apparaît uniquement lorsqu’un numéro WhatsApp est renseigné.
- Inscription sans compte avec prénom, nom, métier, quartier, consentement et au moins un contact.
- Publication immédiate des inscriptions valides et consenties.
- Option **Autre métier…** et **Autre quartier…** avec saisie libre.
- Page publique dédiée de retrait : `https://anyama-proxy.vercel.app/retrait.html`.
- Dashboard admin avec recherche, onglets Artisans / Signalements / Avis, pagination 10 sur PC et 6 sur mobile.
- Mode clair/sombre complet dans l’administration, mémorisé dans le navigateur.
- Actualisation automatique du dashboard admin toutes les 30 secondes, avec conservation de l’onglet courant.
- Cartes de modération différenciées pour les demandes de retrait et les signalements sérieux, avec actions adaptées.
- Notifications e-mail Resend pour les inscriptions et doléances, avec lien vers l’onglet admin correspondant.
- Pages légales V2 harmonisées : mentions légales, confidentialité, cookies et CGU.
- Bannière cookies affichée uniquement sur l’accueil avec les actions **Compris** et **En savoir plus**, mémorisée localement.
- PWA installable, service worker et cache du shell statique.

## Déploiement

### Backend Render

Le dossier racine contient `render.yaml`, `Procfile` et `requirements.txt`. Variables Render :

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
SECRET_KEY=une-cle-secrete-longue
FRONTEND_ORIGIN=https://anyama-proxy.vercel.app
ADMIN_EMAIL=adresse-admin@example.com
ADMIN_PASSWORD=mot-de-passe-admin
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
```

`RESEND_API_KEY` ne doit jamais être copié dans le frontend, le dépôt ou un fichier public. Si une clé est exposée, elle doit être révoquée et remplacée.

Render utilise `gunicorn app:app` et vérifie `/health`.

### Frontend Vercel

Importer le dépôt et choisir `frontend` comme **Root Directory**. Le frontend est statique et ne nécessite pas de build. `frontend/app.js` utilise des routes relatives et `frontend/vercel.json` relaie vers Render : `/api/*`, `/admin/*`, `/static/*` et `/health`.

Les URLs publiques sont :

- site : `https://anyama-proxy.vercel.app/` ;
- retrait : `https://anyama-proxy.vercel.app/retrait.html` ;
- connexion admin : `https://anyama-proxy.vercel.app/admin/login` ;
- dashboard : `https://anyama-proxy.vercel.app/admin`.

## Administration, signalements et retrait

Les inscriptions valides sont enregistrées avec `is_approved=true` et `status=approved`, puis peuvent apparaître immédiatement dans l’annuaire. L’administrateur peut les rechercher, les publier, les désactiver ou les retirer.

Une doléance est créée par `POST /api/removal-requests` avec le nom du demandeur, son numéro, l’artisan concerné et un motif facultatif. L’administrateur peut traiter ou refuser la demande. Un retrait passe le profil à `status=withdrawn` et `is_approved=false` sans supprimer automatiquement la ligne de base.

Les signalements de profil sont centralisés dans l’onglet **Signalements**. Les types pris en charge sont l’erreur d’information, le signalement sérieux et la demande de retrait. Une proposition de correction est affichée sous forme de comparaison avant/après et n’est appliquée qu’après validation par l’administrateur.

L’onglet **Avis** permet de publier, rejeter ou masquer les avis visiteurs. Les actions de modération restent protégées par la session administrateur.

Les notifications Resend ouvrent le dashboard avec `?tab=artisans` ou `?tab=reports`. L’authentification reste obligatoire. La requête serveur inclut un `User-Agent` compatible avec Resend ; en cas d’échec d’envoi, la donnée soumise reste enregistrée.

## Pages légales et spécifications

Les documents publics sont dans `frontend/legal/` :

- `mentions-legales.html` ;
- `politique-confidentialite.html` ;
- `politique-cookies.html` ;
- `cgu.html`.

Les pages légales partagent la feuille `frontend/legal/legal.css` et le thème clair/sombre. Elles décrivent les inscriptions, les avis, les signalements, les demandes de retrait, les notifications Resend et le fonctionnement PWA de la V2. La bannière cookies est volontairement limitée à la page d’accueil.

Le cahier des charges à jour est dans `cahier-de-charge.md`.

## Développement local

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

## Tests

```bash
pytest -q
```

## Structure

```text
app.py                         # Flask, modèles, API, notifications Resend
render.yaml                    # service Render et variables attendues
cahier-de-charge.md            # spécification fonctionnelle à jour
frontend/index.html            # landing page Vercel
frontend/retrait.html          # page publique de retrait
frontend/app.js                # API, recherche, formulaires, PWA
frontend/styles.css            # design clair/sombre
frontend/vercel.json            # façade publique vers Render
frontend/legal/                # documents légaux
frontend/assets/               # logos et assets
```

**Version V2 finalisée — dernière mise à jour : 22 septembre 2026.**
git add .
git commit -m "la V2 termineyyyy"

git push -u origin main
