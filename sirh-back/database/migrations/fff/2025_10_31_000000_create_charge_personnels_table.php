<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('charge_personnels', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('societe_id');
            // Mois représenté par le premier jour du mois
            $table->date('mois');
            $table->decimal('salaire_permanent', 15, 2)->default(0);
            $table->decimal('charge_salaire_permanent', 15, 2)->default(0);
            $table->decimal('salaire_temporaire', 15, 2)->default(0);
            $table->decimal('charge_salaire_temp', 15, 2)->default(0);
            $table->decimal('autres_charge', 15, 2)->default(0);
            $table->timestamps();

            $table->index('societe_id');
            $table->unique(['societe_id', 'mois'], 'uniq_societe_mois');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('charge_personnels');
    }
};
