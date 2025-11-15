<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('todo_tasks')) {
            return;
        }

        Schema::create('todo_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('todo_list_id')->constrained('todo_lists')->cascadeOnDelete();
            $table->string('description');
            $table->string('status')->default('En attente');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->integer('pourcentage')->default(0);
            $table->dateTime('start_date')->nullable();
            $table->dateTime('end_date')->nullable();
            $table->string('type', 10)->nullable();
            $table->string('origine')->nullable();
            $table->foreignId('client_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('priority')->nullable();
            $table->timestamps();

            $table->index(['todo_list_id']);
            $table->index(['assigned_to']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('todo_tasks');
    }
};
