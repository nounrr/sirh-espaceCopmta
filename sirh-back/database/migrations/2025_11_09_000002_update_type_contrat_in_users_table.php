<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        // 1) Drop the stray varchar column if it exists
        if (Schema::hasColumn('users', 'type_contrat')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('type_contrat');
            });
        }

        // 2) Extend enum on users.typeContrat to include 'Client'
        // Note: Laravel's schema builder can't alter ENUM directly; use raw SQL.
        // Keep NOT NULL as in original migration.
        DB::statement("ALTER TABLE `users` MODIFY COLUMN `typeContrat` ENUM('Permanent','Temporaire','Client') NOT NULL");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        // Recreate the dropped varchar (optional rollback safety)
        if (!Schema::hasColumn('users', 'type_contrat')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('type_contrat')->nullable();
            });
        }

        // Revert enum to original values
        DB::statement("ALTER TABLE `users` MODIFY COLUMN `typeContrat` ENUM('Permanent','Temporaire') NOT NULL");
    }
};
