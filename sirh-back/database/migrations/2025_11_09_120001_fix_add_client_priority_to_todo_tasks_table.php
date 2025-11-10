<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Recreate properly formatted columns if previous migration failed to run
        Schema::table('todo_tasks', function (Blueprint $table) {
            if (!Schema::hasColumn('todo_tasks', 'client_id')) {
                $table->unsignedBigInteger('client_id')->nullable()->after('assigned_to');
                $table->foreign('client_id')->references('id')->on('users')->onDelete('set null');
            }
            if (!Schema::hasColumn('todo_tasks', 'priority')) {
                $table->enum('priority', ['basse', 'normale', 'haute', 'critique'])->default('normale')->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('todo_tasks', function (Blueprint $table) {
            if (Schema::hasColumn('todo_tasks', 'client_id')) {
                $table->dropForeign(['client_id']);
                $table->dropColumn('client_id');
            }
            if (Schema::hasColumn('todo_tasks', 'priority')) {
                $table->dropColumn('priority');
            }
        });
    }
};
