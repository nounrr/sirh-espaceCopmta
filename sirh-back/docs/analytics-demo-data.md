# Jeu de données Analytics

Ce seeder alimente toutes les tuiles Analytics (statuts, temps, coûts, clients, exports) avec des données de démonstration cohérentes. Il crée :

- 1 administrateur (`demo.admin@analytics.test`), 3 collaborateurs avec des taux horaires différents et 2 clients fictifs.
- Des listes et tâches couvrant toute la matrice de statuts (En attente, En cours, En validation, Terminée, Annulée) avec des minutes planifiées / réelles.
- Des entrées de temps réparties sur les 14 derniers jours pour alimenter les graphiques journaliers.
- Des demandes d'information client (`ClientInformationRequest`) dans les états `pending`, `in_progress` et `resolved`.

## Commandes utiles

> Toutes les commandes ci-dessous doivent être exécutées depuis le dossier `sirh-back`.

```powershell
php artisan migrate --path=database/test_migrations --seed --class=Database\Seeders\AnalyticsDemoSeeder
# ou si votre schéma est déjà en place
php artisan db:seed --class=Database\Seeders\AnalyticsDemoSeeder
```

Le seeder est idempotent : relancez-le autant que nécessaire. Les enregistrements existants sont mis à jour via leurs identifiants (emails, descriptions de tâches, sujets de demandes) afin de conserver une base stable pour les démonstrations et tests.
