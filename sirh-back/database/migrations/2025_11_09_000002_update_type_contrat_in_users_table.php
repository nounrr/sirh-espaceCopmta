<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1) Drop the stray varchar column if it exists
        if (Schema::hasColumn('users', 'type_contrat')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('type_contrat');
            });
        }

        // 2) Replace legacy 'Temporaire' values by 'Permanent' before shrinking enum
        DB::table('users')
            ->where('typeContrat', 'Temporaire')
            ->update(['typeContrat' => 'Permanent']);

        // 3) Restrict enum to the supported values (Permanent + Client)
        DB::statement("ALTER TABLE `users` MODIFY COLUMN `typeContrat` ENUM('Permanent','Client') NOT NULL");
    }

    public function down(): void
    {
        // Recreate the dropped varchar (optional rollback safety)
        if (!Schema::hasColumn('users', 'type_contrat')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('type_contrat')->nullable();
            });
        }

    // Revert enum to original values (including Temporaire)
    DB::statement("ALTER TABLE `users` MODIFY COLUMN `typeContrat` ENUM('Permanent','Temporaire','Client') NOT NULL");
    }
};
