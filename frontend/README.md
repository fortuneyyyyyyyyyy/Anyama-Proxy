# Anyama Proxy — Frontend Vercel

Ce dossier est un frontend statique HTML/CSS/JS, sans build Node obligatoire.

## Déploiement Vercel

1. Importer le dépôt dans Vercel.
2. Définir **Root Directory** sur `frontend`.
3. Laisser le framework sur `Other` / Static.
4. Utiliser `index.html` comme point d’entrée.

Le frontend utilise par défaut `https://anyama-proxy-api.onrender.com`. Pour l’URL Render réelle, modifier la première ligne de `app.js` ou injecter `window.ANYAMA_API_URL` avant le script.

## Fonctionnalités

- PWA installable avec `manifest.webmanifest` et `sw.js`.
- Thème clair/sombre persistant dans `localStorage`.
- Icônes Lucide via CDN.
- Morphing controls via `details/summary`, boutons extensibles et panneaux déployables.
- Validation : nom, service, métier, zone, consentement et au moins un des deux contacts Téléphone / WhatsApp.
- Survol souris / maintien mobile : révélation du visuel AKATech Studio.
