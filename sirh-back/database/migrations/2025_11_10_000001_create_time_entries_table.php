<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('time_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('todo_task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('started_at');
            $table->dateTime('stopped_at')->nullable();
            $table->string('source',50)->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
            $table->index(['user_id','started_at']);
            $table->index(['todo_task_id']);
            $table->index(['client_id']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('time_entries');
    }
};