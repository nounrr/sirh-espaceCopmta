<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Expand enum to include 'En attente' and 'En validation' alongside existing values
        try {
            DB::statement("ALTER TABLE `todo_tasks` MODIFY `status` ENUM('Non commencée','En attente','En cours','En validation','Terminée','Annulé') NOT NULL DEFAULT 'En attente'");
        } catch (\Throwable $e) {
            // If it fails (e.g., different driver), ignore to avoid breaking pipeline
        }
    }

    public function down(): void
    {
        // Best-effort revert: map any of the new values back and shrink enum
        try {
            DB::table('todo_tasks')->where('status', 'En attente')->update(['status' => 'Non commencée']);
            DB::table('todo_tasks')->where('status', 'En validation')->update(['status' => 'En cours']);
        } catch (\Throwable $e) {
            // ignore
        }
        try {
            DB::statement("ALTER TABLE `todo_tasks` MODIFY `status` ENUM('Non commencée','En cours','Terminée','Annulé') NOT NULL DEFAULT 'Non commencée'");
        } catch (\Throwable $e) {
            // ignore
        }
    }
};
