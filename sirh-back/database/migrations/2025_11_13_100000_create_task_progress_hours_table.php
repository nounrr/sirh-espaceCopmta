<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('task_progress_hours')) {
            Schema::create('task_progress_hours', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->foreignId('task_id')->constrained('todo_tasks')->onDelete('cascade');
                $table->dateTime('start_datetime');
                $table->dateTime('end_datetime')->nullable();
                $table->timestamps();

                $table->index(['user_id', 'start_datetime']);
                $table->index(['task_id']);
            });
        }

        // Optional data migration from time_entries if it exists
        if (Schema::hasTable('time_entries')) {
            DB::statement('INSERT INTO task_progress_hours (user_id, task_id, start_datetime, end_datetime, created_at, updated_at)
                           SELECT user_id, todo_task_id as task_id, started_at as start_datetime, stopped_at as end_datetime, created_at, updated_at
                           FROM time_entries');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('task_progress_hours');
    }
};
