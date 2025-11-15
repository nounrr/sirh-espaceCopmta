<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('todo_task_user')) {
            return;
        }

        Schema::create('todo_task_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('todo_task_id')->constrained('todo_tasks')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['todo_task_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('todo_task_user');
    }
};
