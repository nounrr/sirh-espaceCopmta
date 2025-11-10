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
        Schema::create('pointages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->time('heureEntree')->nullable();
            $table->time('heureSortie')->nullable();
            $table->enum('statutJour', ['present', 'absent', 'retard'])->nullable();
            $table->integer('overtimeHours')->default(0);
            $table->boolean('valider')->default(0)->after('statutJour')->comment('Validation du pointage (0: Non validé, 1: Validé)');
            $table->foreignId('societe_id')->nullable()->constrained('societes')->onDelete('set null');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pointages');
    }
};
