<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('type_docs', function (Blueprint $table) {
            // MySQL enum for clarity; fallback could be string if needed
            $table->enum('type_contrat', ['Client','Employe'])->default('Employe')->after('nom');
        });
    }

    public function down(): void
    {
        Schema::table('type_docs', function (Blueprint $table) {
            $table->dropColumn('type_contrat');
        });
    }
};
