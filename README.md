# Anyama Proxy

Anyama Proxy est un annuaire local pour trouver rapidement un artisan à Anyama. Le **frontend public** est déployé sur Vercel et le **backend Flask** sur Render avec PostgreSQL/Neon. Le domaine public de référence est [anyama-proxy.vercel.app](https://anyama-proxy.vercel.app/).

## Fonctionnalités

- Annuaire public avec recherche par mot-clé, métier et quartier.
- Quartier affiché depuis la valeur réellement enregistrée dans `artisans.zone`.
- Profils avec bouton Appeler ; le bouton WhatsApp apparaît uniquement lorsqu’un numéro WhatsApp est renseigné.
- Inscription sans compte avec prénom, nom, métier, quartier, consentement et au moins un contact.
- Publication immédiate des inscriptions valides et consenties.
- Option **Autre métier…** et **Autre quartier…** avec saisie libre.
- Demande de retrait via le signalement « Demander le retrait » dans le modal de chaque fiche artisan (plus de page dédiée `/retrait.html`).
- Formulaire de contact en panneau « morph » repliable (`détails/summary`), avec la même expérience d’ouverture/fermeture que le formulaire d’inscription.
- Footer et section « Vous êtes artisan ? » qui suivent le fond de la landing page en mode clair et sombre (plus de bande forcée en sombre).
- Bannière cookies en rectangle compact ancré en bas à gauche sur ordinateur, pleine largeur et responsive sur mobile.
- Dashboard admin avec recherche, onglets Analytics / Artisans / Signalements / Avis / Feedback / Messages / Historique, pagination 10 sur PC et 6 sur mobile.
- Mode clair/sombre complet dans l’administration, mémorisé dans le navigateur.
- Actualisation automatique du dashboard admin toutes les 30 secondes, avec conservation de l’onglet courant.
- Cartes de modération différenciées pour les demandes de retrait et les signalements sérieux, avec actions adaptées.
- Notifications e-mail Resend pour chaque nouvelle inscription, avis, signalement (erreur/sérieux/retrait), feedback et message de contact, avec lien direct vers l’onglet admin correspondant.
- Récapitulatif hebdomadaire automatique par e-mail (Resend) : visiteurs uniques et inscriptions par jour sur les 7 derniers jours, envoyé au plus une fois par semaine ; envoi manuel possible depuis l’onglet Analytics (« Envoyer le récap hebdo »).
- Pages légales V2 harmonisées : mentions légales, confidentialité, cookies et CGU.
- Bannière cookies affichée uniquement sur l’accueil avec les actions **Compris** et **En savoir plus**, mémorisée localement.
- Bouton flottant **Feedback & Expérience** sur les pages publiques uniquement, avec parcours Visiteur et Artisan / professionnel.
- Onglet admin **Feedback & Expérience** avec réponses anonymisées, identifiant visiteur technique, métriques visiteurs/artisans et compteur des consentements « Compris ».
- Mesure interne et anonyme des visites quotidiennes et du taux `consentements « Compris » / visites`, sans publicité ni outil d’analyse externe.
- La landing affiche dynamiquement la note moyenne d’expérience des visiteurs, ses étoiles et le nombre de retours via `/api/feedback/summary`.
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
- connexion admin : `https://anyama-proxy.vercel.app/admin/login` ;
- dashboard : `https://anyama-proxy.vercel.app/admin`.

## Administration, signalements et retrait

Les inscriptions valides sont enregistrées avec `is_approved=true` et `status=approved`, puis peuvent apparaître immédiatement dans l’annuaire. L’administrateur peut les rechercher, les publier, les désactiver ou les retirer.

Une demande de retrait est un signalement de type `withdraw` créé par `POST /api/profile-reports` depuis le modal de la fiche artisan (nom du demandeur, numéro, motifs, détail facultatif). Un retrait validé passe le profil à `status=withdrawn` et `is_approved=false` sans supprimer automatiquement la ligne de base.

Les signalements de profil sont centralisés dans l’onglet **Signalements**. Les types pris en charge sont l’erreur d’information, le signalement sérieux et la demande de retrait. Une proposition de correction est affichée sous forme de comparaison avant/après et n’est appliquée qu’après validation par l’administrateur.

L’onglet **Avis** permet de publier, rejeter ou masquer les avis visiteurs. Les actions de modération restent protégées par la session administrateur.

Chaque nouvelle inscription, avis, signalement, feedback ou message de contact déclenche une notification Resend qui ouvre le dashboard sur l’onglet correspondant (`?tab=artisans`, `?tab=reviews`, `?tab=reports`, `?tab=feedback` ou `?tab=messages`). L’authentification reste obligatoire. La requête serveur inclut un `User-Agent` compatible avec Resend ; en cas d’échec d’envoi, la donnée soumise reste enregistrée.

### Récapitulatif hebdomadaire (visites & inscriptions)

Un job interne (déclenché par le trafic entrant, sans dépendance externe) vérifie au plus toutes les 6 heures si 7 jours se sont écoulés depuis le dernier envoi. Le cas échéant, il calcule, pour chacun des 7 derniers jours, le nombre de visiteurs uniques (`analytics_events`, `page_view`) et le nombre d’inscriptions artisanales reçues, puis envoie un e-mail Resend récapitulatif (`?tab=analytics`) à l’administrateur. La date du dernier envoi est conservée dans la table `app_settings` pour survivre aux redémarrages du service. Un bouton **Envoyer le récap hebdo** dans l’onglet Analytics permet un envoi manuel immédiat (utile pour tester la configuration Resend).

### V2 Verso — Feedback & Expérience

Le bouton flottant n’est pas rendu dans l’espace `/admin`. Il ouvre un formulaire court à deux parcours. Les réponses sont enregistrées dans `product_feedback` avec un `visitor_id` technique, le type de répondant, les réponses JSON et la date. Un même visiteur ne peut pas renvoyer le même parcours dans les 24 heures.

Les événements `page_view` et `cookie_consent_accepted` sont stockés dans `analytics_events`. Ils ne contiennent ni adresse IP, ni identité personnelle, ni données publicitaires. Le suivi des visites est limité à une occurrence par visiteur et par jour ; le consentement « Compris » est dédupliqué par visiteur et par jour. Le dashboard permet de comparer le volume de visites et le nombre de consentements.

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
templates/                     # pages Flask (admin, inscription, 404)
frontend/index.html            # landing page Vercel
frontend/app.js                # API, recherche, formulaires, PWA
frontend/styles.css            # design clair/sombre
frontend/vercel.json            # façade publique vers Render
frontend/legal/                # documents légaux
frontend/assets/               # logos et assets
```

**Dernière mise à jour : 25 septembre 2026** — formulaire de contact en morph panel, footer/join-cta adaptatifs clair/sombre, bannière cookies compacte, demande de retrait unifiée via le modal de signalement, récapitulatif hebdomadaire Resend (visites & inscriptions).



git add .
git commit -m "la V2 Verso finni"

git push -u origin main