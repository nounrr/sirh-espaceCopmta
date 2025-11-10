<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Informations légales / entreprise
            $table->string('raison_sociale')->nullable();
            $table->string('rc')->nullable()->unique(); // Registre du commerce
            $table->string('ice')->nullable()->unique(); // Identifiant Commun d'Entreprise
            $table->string('identifiant_fiscale')->nullable();
            $table->string('domaine_activite')->nullable();
            $table->decimal('revenu_mensuel_net', 12, 2)->nullable();
            $table->decimal('chiffre_affaires_dernier_ex', 15, 2)->nullable();
            $table->year('exercice_annee')->nullable();
            $table->string('forme_juridique')->nullable();
            $table->date('date_creation')->nullable();
            $table->decimal('capital_social', 15, 2)->nullable();
            $table->text('associes')->nullable(); // Peut être remplacé par ->json() si besoin structuré
            $table->string('statut_juridique')->nullable();
            $table->string('regime_fiscal')->nullable();
            // Collaboration
            $table->date('date_debut_collaboration')->nullable();
            $table->string('type_mission')->nullable();
            $table->string('representant')->nullable();
            $table->decimal('montant_total', 15, 2)->nullable();
            // On n'ajoute pas de colonne 'type_contrat' séparée car 'typeContrat' (enum) existe déjà
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'raison_sociale', 'rc', 'ice', 'identifiant_fiscale', 'domaine_activite',
                'revenu_mensuel_net', 'chiffre_affaires_dernier_ex', 'exercice_annee', 'forme_juridique',
                'date_creation', 'capital_social', 'associes', 'statut_juridique', 'regime_fiscal',
                'date_debut_collaboration', 'type_mission', 'representant', 'montant_total'
            ]);
        });
    }
};
