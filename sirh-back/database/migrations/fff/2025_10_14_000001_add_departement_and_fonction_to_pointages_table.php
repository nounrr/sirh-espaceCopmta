<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('pointages', function (Blueprint $table) {
            if (!Schema::hasColumn('pointages', 'departement_id')) {
                $table->unsignedBigInteger('departement_id')->nullable()->after('user_id');
            }
            if (!Schema::hasColumn('pointages', 'fonction')) {
                $table->string('fonction', 150)->nullable()->after('departement_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('pointages', function (Blueprint $table) {
            if (Schema::hasColumn('pointages', 'fonction')) {
                $table->dropColumn('fonction');
            }
            if (Schema::hasColumn('pointages', 'departement_id')) {
                $table->dropColumn('departement_id');
            }
        });
    }
};
