<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('todo_tasks', function (Blueprint $table) {
            if (!Schema::hasColumn('todo_tasks', 'type')) {
                $table->enum('type', ['AC','AP'])->nullable()->after('pourcentage');
            }
            if (!Schema::hasColumn('todo_tasks', 'origine')) {
                $table->string('origine')->nullable()->after('type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('todo_tasks', function (Blueprint $table) {
            if (Schema::hasColumn('todo_tasks', 'origine')) {
                $table->dropColumn('origine');
            }
            if (Schema::hasColumn('todo_tasks', 'type')) {
                $table->dropColumn('type');
            }
        });
    }
};
