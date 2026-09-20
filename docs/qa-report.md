# Anyama Proxy — QA / Release Gate initial

**Date :** 2026-09-20  
**Classification :** web app / annuaire local  
**Modules actifs :** persistance SQLAlchemy, API de lecture, recherche/filtres, formulaire d’inscription

## Verdict : PASS AVEC RÉSERVES

| Section | Vérification | Résultat |
|---|---|---|
| Fonctionnel | Page d’accueil, recherche, profil, inscription | Passé |
| Persistance | Inscription enregistrée et non publiée par défaut | Passé |
| API | `/api/artisans` retourne uniquement les profils approuvés | Passé |
| Erreurs | Page 404 et validation du consentement | Passé |
| Responsive | CSS mobile-first avec paliers 800px / 500px | Passé par inspection et structure |
| Accessibilité | labels, skip-link, focus natif, textes alternatifs non requis (pas d’images) | Passé par inspection |
| Tests automatisés | 5 tests pytest | Passé |

## Réserves avant production publique

1. Ajouter un rate limiting sur `/inscription` et une protection anti-spam.
2. Mettre en place l’espace de modération authentifié ou une procédure d’administration contrôlée.
3. Configurer sauvegardes PostgreSQL/Neon et vérifier HTTPS sur l’hébergement.
4. Ajouter une migration Alembic avant toute modification de schéma.
5. Réaliser un test Lighthouse et un test mobile réel sur l’URL de production.


## Refonte Vercel / Render — vérifications complémentaires

- **API Render simulée :** `/health`, `/api/meta`, CORS et POST JSON validés.
- **Règle contacts :** Téléphone seul ou WhatsApp seul accepté ; absence des deux refusée ; inscription non approuvée par défaut.
- **Frontend statique :** `index.html`, `manifest.webmanifest` et `sw.js` servis correctement.
- **JavaScript :** syntaxe validée avec Node.js.
- **Thème :** clair/sombre persistant via `localStorage`.
- **PWA :** manifeste, bouton d’installation et service worker présents.
- **Mobile :** reveal tactile du visuel AKATech par classe `touch-reveal`, contrôles expansibles sur petits écrans.

## Réserve de configuration

L’URL `https://anyama-proxy-api.onrender.com` dans `frontend/app.js` est un placeholder de déploiement. Elle doit être remplacée par l’URL Render réelle avant publication Vercel.


## SEO, GEO et légal — ajout final

La marque visible est désormais **Anyama Proxy**. La homepage contient un title, une meta description, canonical, Open Graph, Twitter Card et deux blocs JSON-LD `WebSite` et `Organization`. Le frontend contient `robots.txt`, `sitemap.xml` et `llms.txt`. Les pages publiques suivantes sont reliées depuis le footer : mentions légales, politique de confidentialité et CGU.

Les champs `[À COMPLÉTER]` des mentions légales doivent être remplacés par l’identité juridique réelle, l’adresse, l’email de contact, le directeur de publication et les coordonnées d’hébergement avant production. La politique de confidentialité décrit les données réellement présentes dans le formulaire et le fonctionnement actuel sans analytics ni publicité.


## Correction finale header / landing / footer

Le logo horizontal fourni est affiché sans fusion sombre incorrecte en mode clair, et reste lisible en mode sombre. Le header contient maintenant les sections Accueil, Annuaire, Comment ça marche et Inscrire mon activité. Une section « Comment ça marche ? » en trois étapes a été ajoutée à la landing page. Les liens Mentions légales, Confidentialité et CGU sont retirés du header et présents dans le footer uniquement.


## Correction favicon / hero

Le visuel AKATech au survol du hero et sa logique tactile ont été supprimés. L’orange dominant de l’icône fournie a été mesuré à `#f82000`, puis appliqué aux variables d’accent du frontend, au fallback Flask et au `theme_color` PWA. Les icônes 192×192, 512×512 et ICO ont été régénérées ; le service worker utilise le cache `anyama-proxy-v5`.
