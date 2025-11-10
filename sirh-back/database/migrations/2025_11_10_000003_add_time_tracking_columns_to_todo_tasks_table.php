<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('todo_tasks', function (Blueprint $table) {
            if (!Schema::hasColumn('todo_tasks','real_start_at')) {
                $table->dateTime('real_start_at')->nullable()->after('end_date');
            }
            if (!Schema::hasColumn('todo_tasks','real_end_at')) {
                $table->dateTime('real_end_at')->nullable()->after('real_start_at');
            }
        });
    }

    public function down(): void {
        Schema::table('todo_tasks', function (Blueprint $table) {
            if (Schema::hasColumn('todo_tasks','real_start_at')) {
                $table->dropColumn('real_start_at');
            }
            if (Schema::hasColumn('todo_tasks','real_end_at')) {
                $table->dropColumn('real_end_at');
            }
        });
    }
};