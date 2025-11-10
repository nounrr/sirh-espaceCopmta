<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('todo_tasks', function (Blueprint $table) {
            if (!Schema::hasColumn('todo_tasks','task_kind')) {
                $table->string('task_kind',20)->nullable()->after('type'); // 'continues' | 'ponctuelle'
            }
            if (!Schema::hasColumn('todo_tasks','is_recurring')) {
                $table->boolean('is_recurring')->default(false)->after('task_kind');
            }
            if (!Schema::hasColumn('todo_tasks','recurrence')) {
                $table->string('recurrence',20)->nullable()->after('is_recurring'); // 'monthly' | 'quarterly' | 'custom'
            }
            if (!Schema::hasColumn('todo_tasks','recurrence_interval_days')) {
                $table->unsignedInteger('recurrence_interval_days')->nullable()->after('recurrence');
            }
            if (!Schema::hasColumn('todo_tasks','period_start')) {
                $table->date('period_start')->nullable()->after('recurrence_interval_days');
            }
            if (!Schema::hasColumn('todo_tasks','period_end')) {
                $table->date('period_end')->nullable()->after('period_start');
            }
            if (!Schema::hasColumn('todo_tasks','next_run_at')) {
                $table->dateTime('next_run_at')->nullable()->after('period_end');
            }
        });
    }

    public function down(): void {
        Schema::table('todo_tasks', function (Blueprint $table) {
            foreach (['task_kind','is_recurring','recurrence','recurrence_interval_days','period_start','period_end','next_run_at'] as $col) {
                if (Schema::hasColumn('todo_tasks', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};