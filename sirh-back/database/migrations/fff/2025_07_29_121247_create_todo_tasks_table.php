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
        Schema::create('todo_tasks', function (Blueprint $table) {
    $table->id();
    $table->foreignId('todo_list_id')->constrained('todo_lists')->onDelete('cascade');
    $table->string('description');
    $table->enum('status', ['Non commencée', 'En cours', 'Terminée'])->default('Non commencée');
    $table->date('start_date')->nullable();
    $table->date('end_date')->nullable();
    $table->timestamps();
});

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('todo_tasks');
    }
};
