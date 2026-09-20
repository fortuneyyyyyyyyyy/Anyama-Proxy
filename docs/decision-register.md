# Anyama Proxy — Cadrage AKATech abrégé

## Classification

**Type :** web app / annuaire local. **Workflow :** niveau 2, application interactive avec persistance. **Canal prioritaire :** mobile-first, car la recherche d’un artisan est contextuelle et majoritairement réalisée depuis un téléphone.

## Decision Gate 1 — Problème

Les habitants ont besoin d’identifier rapidement un artisan local et de le contacter sans dépendre d’un tableau partagé ou d’un bouche-à-oreille non structuré. Le produit répond à ce problème par une recherche simple, des profils courts et un contact direct.

## Decision Gate 2 — Opportunité

L’angle de différenciation retenu est **la proxymité vérifiable** : Anyama d’abord, zones explicites, publication après vérification. Le produit ne cherche pas à devenir une marketplace complète au MVP.

## Scope Lock

| Priorité | Périmètre |
|---|---|
| MUST HAVE | Annuaire public, recherche, filtres métier/zone, profil artisan, inscription persistante, modération par statut |
| SHOULD HAVE | Espace admin, import de profils existants, statistiques de demandes |
| COULD HAVE | Avis, géolocalisation, réservation, notifications WhatsApp automatisées |
| OUT OF SCOPE | Paiement en ligne, marketplace avec commission, chat temps réel, application native |

## ADR-001 — Flask + SQLAlchemy + PostgreSQL/Neon

**Contexte :** l’utilisateur demande explicitement une application Flask persistante et cite Neon comme cible PostgreSQL. **Décision :** utiliser Flask avec SQLAlchemy et un driver psycopg, en conservant SQLite comme fallback de développement. **Alternatives rejetées :** tableau JavaScript en mémoire (perte des données), Django (plus lourd pour ce MVP), microservices (hors complexity budget). **Conséquences :** déploiement simple et portabilité PostgreSQL ; migrations formelles à introduire avant une V1.1 évolutive.

## ADR-002 — Modération avant publication

Toute inscription est enregistrée avec `is_approved=false`. Cela protège la qualité de l’annuaire et réduit les profils frauduleux. L’espace d’administration n’est pas inclus dans le MVP afin de conserver le périmètre ; l’activation se fera par procédure contrôlée en base jusqu’à la prochaine itération.

## Module Registry

| Module | Statut | Justification |
|---|---|---|
| Persistence / DB | ACTIF | Inscription durable demandée |
| API read-only | ACTIF | Contrat de lecture pour futurs canaux |
| Auth / RBAC | OFF MVP | Aucun espace privé livré |
| Redis / queue | OFF | Aucun besoin asynchrone identifié |
| Analytics / tracking | OFF | Pas de consentement ni attribution multi-source définis |
| Upload médias | OFF | Aucun média requis pour valider le MVP |

## Assumptions & Risks

| ID | Hypothèse / risque | Confiance / probabilité | Mitigation |
|---|---|---|---|
| A-001 | Les artisans disposent d’un téléphone joignable | Moyenne | Champ téléphone obligatoire, WhatsApp facultatif |
| A-002 | Une validation humaine est disponible | Moyenne | Statut `is_approved`, procédure admin à prévoir |
| R-001 | Spam sur le formulaire public | Moyenne | Ajouter rate limiting et honeypot avant production publique |
| R-002 | Données de contact obsolètes | Moyenne | Revalidation périodique et bouton de signalement en V1.1 |
| R-003 | Mauvaise configuration Neon | Faible | `DATABASE_URL` documentée, endpoint `/health`, test de connexion au déploiement |

## QA Release Gate — état initial

Le MVP est fonctionnellement testé en local. Avant production, il reste à confirmer sur l’environnement réel : HTTPS, rate limiting du formulaire, sauvegarde PostgreSQL, procédure de modération, variables d’environnement et mesure performance.


## CIP — Mise à jour du formulaire et de l’identité visuelle

La décision d’interface a été mise à jour pour utiliser le logo fourni `anyama-proxy-logo.png` dans le header, le footer et le manifeste PWA. Le formulaire demande désormais prénom et nom, conserve une liste de métiers enrichie automatiquement par les nouvelles valeurs enregistrées, et propose « Autre métier… » avec saisie libre. La zone d’intervention est retirée du parcours ; les données existantes restent compatibles et la valeur backend par défaut est `Anyama`. Le service devient facultatif et au moins un contact parmi Téléphone ou WhatsApp reste obligatoire.
