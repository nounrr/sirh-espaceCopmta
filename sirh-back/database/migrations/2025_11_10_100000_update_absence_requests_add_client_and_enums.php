<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Add client_id column (nullable) referencing users
        Schema::table('absence_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('absence_requests', 'client_id')) {
                $table->unsignedBigInteger('client_id')->nullable()->after('user_id');
                $table->foreign('client_id')->references('id')->on('users')->onDelete('set null');
            }
        });

        // Expand type enum to include 'demande document'
        try {
            DB::statement("ALTER TABLE `absence_requests` MODIFY `type` ENUM('Congé','maladie','autre','AttestationTravail','demande document') NOT NULL");
        } catch (\Throwable $e) {
            // ignore if driver not MySQL or already adjusted
        }

        // Expand statut enum to include 'En demande'
        try {
            DB::statement("ALTER TABLE `absence_requests` MODIFY `statut` ENUM('en_attente','validé','rejeté','approuvé','En demande') NOT NULL DEFAULT 'en_attente'");
        } catch (\Throwable $e) {
            // ignore
        }
    }

    public function down(): void
    {
        // Revert statut enum removal of 'En demande'
        try {
            DB::statement("ALTER TABLE `absence_requests` MODIFY `statut` ENUM('en_attente','validé','rejeté','approuvé') NOT NULL DEFAULT 'en_attente'");
        } catch (\Throwable $e) {}

        // Revert type enum removal of 'demande document'
        try {
            DB::statement("ALTER TABLE `absence_requests` MODIFY `type` ENUM('Congé','maladie','autre','AttestationTravail') NOT NULL");
        } catch (\Throwable $e) {}

        Schema::table('absence_requests', function (Blueprint $table) {
            if (Schema::hasColumn('absence_requests', 'client_id')) {
                $table->dropForeign(['client_id']);
                $table->dropColumn('client_id');
            }
        });
    }
};
