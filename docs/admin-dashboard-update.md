# Évolution du tableau de bord administrateur

## Analytics

Un nouvel onglet **Analytics** présente les visiteurs anonymes uniques par jour, les inscriptions d’artisans par jour et une courbe des actions principales. La période peut être réglée sur 7, 14, 30 ou 90 jours. Les parcours récents regroupent les événements par identifiant anonyme et date; les chemins enregistrés excluent les paramètres de requête et peuvent conserver une ancre publique comme `#annuaire`.

Les interactions suivies comprennent les pages vues, l’exploration et la recherche dans l’annuaire, l’ouverture d’un profil, les clics téléphone/WhatsApp, les actions de signalement, les entrées dans le flux d’inscription, le feedback et le clic « Compris ». Les champs des formulaires et les adresses IP ne sont pas ajoutés à ces événements. Le consentement « Compris » est dédupliqué par visiteur et jour; une page déjà vue sur le même chemin n’est pas enregistrée à nouveau le même jour.

## Modération et historique

L’onglet **Artisans** sépare les inscriptions **À traiter**, les profils publiés dans **Gestion plateforme**, et l’ensemble des profils actifs. Valider une inscription l’envoie vers la file des profils publiés. Refuser une inscription ou archiver un profil le retire des listes actives et le conserve dans **Historique**.

L’onglet **Signalements** distingue les éléments **À traiter** des éléments **Traités**. Les refus et archivages sont déplacés vers l’historique; les éléments acceptés/traités restent visibles dans la file des signalements traités. Les actions d’archivage ne suppriment aucune ligne de la base.

## Compatibilité

Au démarrage, une migration additive ajoute `analytics_events.page_path` et son index aux bases qui possèdent déjà `analytics_events`. Aucune migration manuelle ni suppression de données n’est nécessaire. Les événements antérieurs à cette évolution restent présents; leur chemin n’est simplement pas renseigné.

## Vérification

La suite actuelle compte 29 tests réussis. Le JavaScript frontend passe également le contrôle syntaxique `node --check frontend/app.js`.
