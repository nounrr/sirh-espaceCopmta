<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // pour associer les cibles
        Schema::create('publication_targets', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('publication_id');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->unsignedBigInteger('societe_id')->nullable();
            $table->unsignedBigInteger('departement_id')->nullable();
            $table->string('role')->nullable();
            $table->string('typeContrat')->nullable();
            $table->timestamps();
        
            $table->foreign('publication_id')->references('id')->on('publications')->onDelete('cascade');
            // facultatif: $table->foreign('departement_id')->references('id')->on('departements');
            // facultatif: $table->foreign('societe_id')->references('id')->on('societes');
        });
        

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('publication_targets');
    }
};
