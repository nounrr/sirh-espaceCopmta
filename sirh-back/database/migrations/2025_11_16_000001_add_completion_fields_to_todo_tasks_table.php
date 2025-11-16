<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('todo_tasks', function (Blueprint $table) {
            $table->timestamp('completed_at')->nullable()->after('status');
            $table->integer('completion_delay_minutes')->nullable()->after('completed_at');
        });
    }

    public function down(): void
    {
        Schema::table('todo_tasks', function (Blueprint $table) {
            $table->dropColumn(['completed_at', 'completion_delay_minutes']);
        });
    }
};
