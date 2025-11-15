<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('type_docs')) {
            return;
        }

        Schema::table('type_docs', function (Blueprint $table) {
            // MySQL enum for clarity; fallback could be string if needed
            $table->enum('type_contrat', ['Client','Employe'])->default('Employe')->after('nom');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('type_docs') || !Schema::hasColumn('type_docs', 'type_contrat')) {
            return;
        }

        Schema::table('type_docs', function (Blueprint $table) {
            $table->dropColumn('type_contrat');
        });
    }
};
