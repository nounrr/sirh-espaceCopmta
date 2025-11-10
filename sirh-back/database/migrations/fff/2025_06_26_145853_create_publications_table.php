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
        // php artisan make:migration create_publications_table
Schema::create('publications', function (Blueprint $table) {
    $table->id();
    $table->string('type'); // 'sondage' ou 'news'
    $table->string('titre');
    $table->text('texte')->nullable();
    $table->unsignedBigInteger('created_by'); // RH qui publie
    $table->timestamps();

    $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
});

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('publications');
    }
};
