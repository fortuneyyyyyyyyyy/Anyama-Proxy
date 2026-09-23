# ANYAMA PROXY
## Roadmap produit → observation → monétisation → architecture Full Stack

> **État au 23 septembre 2026 :** la V2 « Confiance & Réputation » est livrée et n’est plus une étape à construire. Le produit est actuellement dans la phase **V2 Verso — Observation & Feedback**, avec le feedback public, le stockage anonyme, les statistiques admin, le suivi des visites et l’affichage de la note d’expérience sur la landing.

---

# 0. Vision globale

Anyama Proxy évolue progressivement d'un simple annuaire local vers une plateforme numérique locale permettant aux habitants de trouver des professionnels et aux artisans de développer leur visibilité.

```text
V1
ANNuaire local
        ↓
V2 ✅
CONFIANCE & RÉPUTATION — LIVRÉE
        ↓
V2 VERSO 🚧
OBSERVATION & FEEDBACK — EN COURS
        ↓
V3
PLATEFORME LOCALE
        ↓
V4
BUSINESS + NOUVELLE ARCHITECTURE
        ↓
FULL STACK
Next.js + NestJS + PostgreSQL
```

> **Ne pas construire la plateforme finale trop tôt.**

Chaque version répond à une question produit différente.

---

# V1 — ANNuaire local

## Question produit

> « Est-ce qu'Anyama Proxy permet réellement de trouver facilement un artisan ? »

La V1 constitue le produit de base. L'objectif est de résoudre un problème concret :

> Trouver un professionnel local et pouvoir le contacter rapidement.

## Fonctionnement

```text
Visiteur
   ↓
Recherche
   ↓
Liste des artisans
   ↓
Profil
   ↓
Appeler / WhatsApp
```

## Fonctionnalités

### Recherche

- recherche par métier ;
- recherche par nom ;
- recherche par quartier/localité ;
- affichage des résultats.

### Profil

Chaque artisan possède une fiche contenant notamment :

- nom ;
- profession ;
- localisation ;
- informations de contact ;
- téléphone ;
- WhatsApp ;
- informations fournies lors de l'inscription.

### Contact

- 📞 Appeler ;
- 🟢 WhatsApp.

### Confiance minimale

- signaler une erreur ;
- signaler un profil ;
- demander le retrait d'un profil.

### Administration

```text
Artisan
   ↓
Inscription
   ↓
Validation
   ↓
Publication
```

L'administration permet notamment :

- validation des artisans ;
- modération ;
- traitement des signalements ;
- traitement des demandes de retrait.

## Architecture V1

```text
Frontend
HTML / CSS / JS
        │
        ▼
Flask API
        │
        ▼
PostgreSQL / Neon
```

Déploiement :

```text
Frontend → Vercel
Backend  → Render
Database → PostgreSQL / Neon
```

La V1 reste volontairement simple.

---

# V2 — CONFIANCE & RÉPUTATION — LIVRÉE / ARCHIVÉE

## Question produit

> « Maintenant que les utilisateurs trouvent des artisans, comment les aider à avoir davantage confiance dans les profils ? »

La V2 a ajouté une couche de confiance au-dessus de l'annuaire. Cette version est maintenant livrée ; elle est conservée ici comme référence fonctionnelle et historique, mais elle ne constitue plus une étape future du roadmap.

## 1. Avis

Un visiteur peut donner une note de 1 à 5 étoiles avec éventuellement un commentaire.

## 2. Visiteur anonyme

Aucun compte visiteur obligatoire.

```text
Navigateur
    ↓
visitor_id
    ↓
Avis
```

Un même visiteur ne peut pas noter plusieurs fois le même artisan.

## 3. Anti-abus

Le système surveille notamment :

- fréquence des avis ;
- volume provenant d'une même source technique ;
- vagues d'avis ;
- répétitions suspectes ;
- longueur des commentaires.

Les données techniques utilisées pour la détection sont traitées de manière limitée et les éléments techniques peuvent être hachés.

## 4. Modération des avis

```text
Publié
À vérifier
Rejeté
```

L'administrateur peut :

- valider ;
- rejeter ;
- masquer un avis publié.

## 5. Réputation

Le profil peut afficher :

- moyenne ;
- nombre d'avis ;
- étoiles ;
- derniers avis publiés.

## 6. Popularité

Anyama Proxy commence à mesurer :

- consultations de profil ;
- clics téléphone ;
- clics WhatsApp ;
- activité récente ;
- avis.

Cela permet d'identifier progressivement :

- profils populaires ;
- profils appréciés ;
- profils en croissance.

> **Popularité ≠ publicité.**

## 7. Signalements et corrections

La V2 conserve :

- signalement de profil ;
- correction d'informations ;
- demande de retrait ;
- validation administrative.

L'administration conserve le contrôle des modifications.

## 8. Notifications

Notifications possibles pour :

- nouvelle inscription ;
- signalement ;
- demande de retrait ;
- nouvel avis ;
- avis nécessitant une vérification.

## Question de sortie de V2

```text
Les visiteurs utilisent-ils réellement l'annuaire ?
        ↓
Consultent-ils les profils ?
        ↓
Contactent-ils les artisans ?
        ↓
La réputation est-elle utilisée ?
        ↓
Les avis apportent-ils réellement de la confiance ?
```

---

# V2 VERSO — OBSERVATION & FEEDBACK — PHASE ACTIVE

## Question produit

> « Qu'est-ce que les utilisateurs veulent réellement ? »

Cette phase n'est pas une V3 déguisée. Elle sert à **arrêter de supposer** ce que les utilisateurs veulent. Les premiers éléments sont déjà implémentés : bouton feedback public hors admin, parcours Visiteur / Artisan, stockage dans `product_feedback`, événements anonymes dans `analytics_events`, onglet admin **Feedback & Expérience**, notifications Resend et note d’expérience dynamique sur la landing.

## 1. Feedback visiteurs

### Expérience générale

- facilité d'utilisation ;
- design ;
- navigation ;
- recherche ;
- utilisation sur téléphone.

### Compréhension

- bouton difficile à comprendre ;
- information manquante ;
- élément qui prête à confusion ;
- difficulté à trouver un artisan.

### Accessibilité d'usage

Mesurer si l'interface reste compréhensible pour les personnes peu habituées aux sites web ou ayant des difficultés de lecture.

> **Objectif : savoir si l'interface est suffisamment simple pour le public réel d'Anyama.**

### Suggestions

- « Qu'aimeriez-vous ajouter ? »
- « Qu'est-ce qui devrait être amélioré ? »
- « Qu'est-ce qui vous a gêné ? »

## 2. Feedback artisans

- Le profil vous semble-t-il utile ?
- Les informations affichées sont-elles suffisantes ?
- Les visiteurs vous contactent-ils grâce à Anyama Proxy ?
- Qu'aimeriez-vous ajouter à votre profil ?
- Qu'est-ce qui pourrait vous aider à obtenir davantage de visibilité ?
- Seriez-vous intéressé par une visibilité supplémentaire ?
- Pour quels services seriez-vous éventuellement prêt à payer ?

## 3. Deux types de données

### Données comportementales

```text
Recherches
    ↓
Consultations
    ↓
Clics téléphone
    ↓
Clics WhatsApp
    ↓
Avis
```

### Données déclaratives

```text
Feedback
    ↓
Problèmes
    ↓
Besoins
    ↓
Suggestions
    ↓
Intentions
```

Les deux sont nécessaires pour comprendre le produit.

## 4. Observation

```text
                    ANYAMA PROXY
                         │
          ┌──────────────┴──────────────┐
          │                             │
     COMPORTEMENT                   FEEDBACK
          │                             │
          ├── Recherches                ├── Difficultés
          ├── Vues                      ├── Suggestions
          ├── Appels                    ├── Besoins
          ├── WhatsApp                 └── Demandes
          └── Avis
          │                             │
          └──────────────┬──────────────┘
                         ↓
                  DONNÉES RÉELLES
                         ↓
                       V3
```

## 5. Première validation commerciale

Sans construire toute la V4, Anyama Proxy peut expérimenter :

### 🔥 Mise en avant

Un artisan peut payer pour obtenir davantage de visibilité.

Exemples :

- **Profil mis en avant**
- **À la une à Anyama**

Séparation obligatoire :

```text
POPULARITÉ
→ basée sur l'activité réelle

RÉPUTATION
→ basée sur les avis

PROMOTION
→ payée par l'artisan
```

## Critères de sortie de V2 Verso

La V3 peut être préparée lorsque les données permettent de répondre à des questions comme :

- Qu'est-ce que les visiteurs cherchent le plus ?
- Quels métiers sont les plus demandés ?
- Quels quartiers sont les plus recherchés ?
- Où les utilisateurs rencontrent-ils des difficultés ?
- Quelles informations manquent sur les profils ?
- Quelles fonctionnalités sont réellement demandées ?
- Les artisans utilisent-ils la plateforme ?
- Les artisans veulent-ils davantage de visibilité ?
- Existe-t-il une demande pour une offre payante ?

La V2 Verso produit donc une **liste de priorités fondée sur le terrain**.

---

# V3 — PLATEFORME LOCALE

## Question produit

> « Maintenant que nous savons ce que les utilisateurs veulent, comment transformer l'annuaire en véritable plateforme locale ? »

La V3 reste sur l'architecture actuelle.

## 1. Recherche avancée

La recherche peut prendre en compte :

- métier ;
- catégorie ;
- quartier ;
- localisation ;
- disponibilité des contacts ;
- activité récente ;
- réputation ;
- popularité ;
- pertinence.

Une recherche tolérante aux fautes et des suggestions peuvent être introduites.

## 2. Catégorisation

```text
Bâtiment
 ├── Plombier
 ├── Électricien
 ├── Maçon
 └── Peintre

Beauté
 ├── Coiffeur
 ├── Esthéticienne
 └── Barbier

Automobile
 ├── Mécanicien
 ├── Électricien auto
 └── ...
```

Cela facilite :

- recherche ;
- navigation ;
- SEO ;
- statistiques ;
- recommandations ;
- future monétisation.

## 3. Profils publics riches

Le simple modal devient progressivement une vraie page.

```text
/artisan/jean-kouassi-plombier
```

La page peut contenir :

- identité ;
- métier ;
- catégorie ;
- quartier ;
- description ;
- services ;
- zone d'intervention ;
- contacts ;
- horaires si pertinents ;
- réputation ;
- avis ;
- badges ;
- informations complémentaires.

## 4. SEO local

```text
/anyama/plombiers
/anyama/coiffeurs
/anyama/mecaniciens

/artisan/jean-kouassi-plombier
/artisan/marie-coiffure
```

L'objectif est que la plateforme ne dépende pas uniquement de son trafic direct.

## 5. Statistiques

L'administration obtient une vision plus complète :

```text
CONSULTATIONS
APPELS
WHATSAPP
AVIS
RECHERCHES
MÉTIERS
QUARTIERS
TENDANCES
```

## 6. Intelligence du catalogue

Pas nécessairement de l'IA.

```text
Recherche
    +
Interactions
    +
Réputation
    +
Localisation
    +
Activité
    ↓
Pertinence du catalogue
```

## 7. Test commercial

La visibilité payante continue à être testée :

```text
Artisan
   ↓
Voit l'offre
   ↓
Achète la visibilité
   ↓
Obtient davantage d'exposition
   ↓
Observe les résultats
```

Ces données servent directement à concevoir la V4.

---

# V4 — BUSINESS + GRANDE MIGRATION FULL STACK

## Question produit

> « Comment transformer Anyama Proxy en véritable produit numérique exploitable commercialement ? »

C'est ici que le projet change de dimension.

**À partir de V4, Anyama Proxy passe à une architecture Full Stack : Next.js + NestJS + PostgreSQL.**

## Pourquoi migrer maintenant ?

Avant V4, Flask reste suffisant.

La migration devient pertinente lorsque le produit doit gérer simultanément :

```text
Utilisateurs
Artisans
Comptes
Profils
Avis
Statistiques
Promotions
Abonnements
Paiements
Notifications
Permissions
Dashboards
```

La migration est donc une **conséquence de la croissance du produit**, pas un changement technologique gratuit.

---

# Nouvelle architecture V4

```text
                         ANYAMA PROXY
                              │
                 ┌────────────┴────────────┐
                 │                         │
              FRONTEND                  BACKEND
                 │                         │
              Next.js                   NestJS
                 │                         │
       ┌─────────┼─────────┐       ┌───────┼────────┐
       │         │         │       │       │        │
     Public    Search   Dashboard  Auth   API    Services
       │                             │
       │                             ├── Profiles
       │                             ├── Reviews
       │                             ├── Analytics
       │                             ├── Notifications
       │                             ├── Promotions
       │                             └── Billing
       │
       └──────────────┬──────────────┘
                      │
                      ▼
                 PostgreSQL
```

---

# FRONTEND — Next.js

Next.js devient la couche web principale.

## Partie publique

```text
Accueil
Recherche
Catégories
Quartiers
Profils
Avis
Pages SEO
```

## Partie professionnelle

```text
Connexion
Dashboard
Profil
Statistiques
Promotion
Abonnement
Facturation
```

## Partie administration

```text
Dashboard admin
Artisans
Avis
Signalements
Feedback
Statistiques
Promotions
Utilisateurs
Paiements
```

---

# BACKEND — NestJS

NestJS devient le cœur métier.

Modules possibles :

```text
src/
│
├── auth/
├── users/
├── artisans/
├── categories/
├── locations/
├── reviews/
├── reports/
├── feedback/
├── analytics/
├── notifications/
├── promotions/
├── subscriptions/
├── payments/
└── admin/
```

Le découpage exact sera défini pendant la conception V4.

---

# AUTHENTIFICATION

Avant V4 :

```text
Visiteur
→ pas de compte
```

En V4 :

```text
Visiteur
      │
      └── navigation libre

Artisan
      │
      └── compte professionnel

Admin
      │
      └── espace administration
```

Les comptes professionnels permettent enfin de donner à l'artisan le contrôle de son activité.

---

# DASHBOARD ARTISAN

```text
MON ACTIVITÉ

👁️ Consultations
📞 Appels
🟢 WhatsApp
⭐ Note
💬 Avis

────────────────

Mon profil
Mes informations
Mes statistiques
Ma visibilité
Mon abonnement
```

---

# PROFIL PRO

Le profil gratuit reste accessible.

Le profil payant peut ajouter des avantages définis à partir des données de V2 Verso et V3.

```text
PROFIL STANDARD
✓ Présence dans l'annuaire
✓ Contacts
✓ Avis

PROFIL PRO
✓ Profil enrichi
✓ Statistiques
✓ Visibilité renforcée
✓ Mise en avant
✓ Options supplémentaires
```

Les avantages exacts doivent être décidés à partir des résultats du test commercial.

---

# PROMOTION

Un artisan peut acheter de la visibilité.

```text
🔥 Mise en avant

Durée :
7 jours

Zone :
Anyama

Catégorie :
Plombiers
```

Le système peut gérer :

- campagne ;
- durée ;
- emplacement ;
- statut ;
- budget/prix ;
- résultats.

---

# ANALYTICS PROFESSIONNELS

```text
Cette semaine

👁️ 428 vues
📞 32 appels
🟢 57 clics WhatsApp
⭐ +3 nouveaux avis
```

L'artisan peut comprendre ce que sa présence sur Anyama Proxy lui apporte.

---

# MONÉTISATION

## 1. Mise en avant

Paiement ponctuel :

```text
7 jours
14 jours
30 jours
```

## 2. Profil Pro

Abonnement récurrent :

```text
Mensuel
Annuel
```

## 3. Options de visibilité

Selon les résultats du marché :

- position renforcée ;
- présence dans certaines catégories ;
- campagne locale ;
- visibilité temporaire.

Les tarifs ne doivent pas être figés avant d'avoir observé la demande.

---

# PAIEMENTS

```text
Artisan
   ↓
Choisit une offre
   ↓
Paiement
   ↓
Confirmation
   ↓
Webhook
   ↓
NestJS
   ↓
Activation de la visibilité
```

Le backend devient l'autorité sur l'état du paiement.

```text
PENDING
   ↓
PAID
   ↓
ACTIVE
   ↓
EXPIRED
```

L'activation ne doit pas dépendre uniquement de ce que le frontend croit avoir reçu.

---

# NOTIFICATIONS

V4 peut centraliser :

```text
Inscription
Avis
Signalement
Promotion
Paiement
Expiration
Abonnement
```

---

# AUTORISATIONS

```text
VISITEUR
   ↓
lecture

ARTISAN
   ↓
gestion de son profil

ADMIN
   ↓
gestion globale

SUPER ADMIN
   ↓
gestion critique
```

Un artisan ne doit pouvoir modifier que ses propres données.

---

# DONNÉES

PostgreSQL devient la source de vérité centrale.

Le modèle de données évolue progressivement vers :

```text
users
artisans
categories
locations
profiles
reviews
reports
feedback
analytics_events
promotions
subscriptions
payments
notifications
```

Le schéma exact sera défini pendant la conception V4.

---

# MIGRATION DE L'ANCIEN SYSTÈME

La migration ne doit pas être :

```text
Supprimer Flask
↓
Recommencer tout à zéro
```

Mais :

```text
APPLICATION ACTUELLE
        │
        ▼
Audit de l'existant
        │
        ▼
Modèle de données cible
        │
        ▼
NestJS API
        │
        ▼
Next.js
        │
        ▼
Migration progressive
        │
        ▼
Tests
        │
        ▼
Bascule
        │
        ▼
Ancien système retiré
```

## Principe de migration

Les données existantes doivent être conservées :

```text
Artisans
Avis
Historique utile
Catégories
Signalements
Statistiques pertinentes
```

La base restant PostgreSQL, la transition peut être préparée sans repartir d'une base vide.

---

# Architecture finale cible

```text
                         INTERNET
                            │
                            ▼
                     ┌─────────────┐
                     │   Next.js   │
                     │             │
                     │ Public Web  │
                     │ SEO         │
                     │ Dashboard   │
                     │ Admin       │
                     └──────┬──────┘
                            │
                            ▼
                     ┌─────────────┐
                     │   NestJS    │
                     │             │
                     │ Auth        │
                     │ Artisans    │
                     │ Reviews     │
                     │ Analytics   │
                     │ Promotions  │
                     │ Payments    │
                     │ Notifications│
                     └──────┬──────┘
                            │
                ┌───────────┼───────────┐
                │           │           │
                ▼           ▼           ▼
           PostgreSQL    Storage    Services
                          /Media     externes
```

---

# ÉVOLUTION GLOBALE

```text
┌─────────────────────────────────────────────────────────┐
│ V1 — ANNuaire                                            │
│ Trouver → consulter → contacter                          │
│                                                         │
│ Flask + PostgreSQL                                      │
└───────────────────────┬─────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ V2 — CONFIANCE — LIVRÉE / ARCHIVÉE                      │
│ Avis → réputation → anti-abus → modération              │
│                                                         │
│ Flask + PostgreSQL                                      │
└───────────────────────┬─────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ V2 VERSO — OBSERVATION — PHASE ACTIVE                   │
│ Feedback → comportement → besoins → test commercial     │
│                                                         │
│ Flask + PostgreSQL                                      │
└───────────────────────┬─────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ V3 — PLATEFORME LOCALE                                  │
│ Recherche → profils riches → SEO → analytics            │
│                                                         │
│ Flask + PostgreSQL                                      │
└───────────────────────┬─────────────────────────────────┘
                        ↓
              GRANDE TRANSITION
                        ↓
┌─────────────────────────────────────────────────────────┐
│ V4 — BUSINESS                                            │
│ Profils Pro → visibilité → dashboard → paiements        │
│                                                         │
│                    FULL STACK                            │
│             Next.js + NestJS + PostgreSQL               │
└───────────────────────┬─────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ ANYAMA PROXY — PLATEFORME LOCALE                        │
│                                                         │
│ Visiteurs ↔ Artisans ↔ Administration                   │
│             ↕                                           │
│      Visibilité + données + services                    │
└─────────────────────────────────────────────────────────┘
```

---

# Logique fondamentale

### V1
> **Est-ce que les gens ont besoin d'un annuaire local ?**

### V2
> **Est-ce qu'ils font confiance aux informations et aux profils ?**

### V2 Verso
> **Qu'est-ce que les utilisateurs veulent réellement ?**

### V3
> **Comment transformer ces apprentissages en une vraie plateforme locale ?**

### V4
> **Comment permettre aux professionnels de tirer une valeur commerciale de la plateforme ?**

### Nouvelle architecture
> **Comment supporter proprement cette nouvelle complexité ?**

Le changement d'architecture accompagne donc le changement de nature du produit :

```text
ANNuaire
   ↓
ANNuaire de confiance
   ↓
Produit observé par ses utilisateurs
   ↓
Plateforme locale
   ↓
Business numérique
   ↓
Full Stack
```

**Cette trajectoire constitue la roadmap de référence d'Anyama Proxy.**
