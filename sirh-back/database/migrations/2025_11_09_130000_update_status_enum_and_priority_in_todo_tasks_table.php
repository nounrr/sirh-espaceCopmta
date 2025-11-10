<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Map legacy values before altering enum
        try {
            // Normalize old "Non commencée" to new "En attente"
            DB::table('todo_tasks')->where('status', 'Non commencée')->update(['status' => 'En attente']);
        } catch (\Throwable $e) {
            // ignore if table missing during fresh setup
        }

        // Change status column to the new enum set
        // Use raw SQL to avoid doctrine/dbal requirement
        try {
            DB::statement("ALTER TABLE `todo_tasks` MODIFY `status` ENUM('En attente','En cours','En validation','Terminée','Annulé') NOT NULL DEFAULT 'En attente'");
        } catch (\Throwable $e) {
            // Fallback: if driver is not MySQL or statement fails, skip silently
        }

        // Ensure priority column exists
        Schema::table('todo_tasks', function (Blueprint $table) {
            if (!Schema::hasColumn('todo_tasks', 'priority')) {
                $table->enum('priority', ['basse','normale','haute','critique'])->default('normale')->after('status');
            }
        });
    }

    public function down(): void
    {
        // Best-effort revert: map back values and restore older enum
        try {
            // Map new statuses back to old set
            // En attente -> Non commencée, En validation -> En cours, Annulé -> En cours (closest)
            DB::table('todo_tasks')->where('status', 'En attente')->update(['status' => 'Non commencée']);
            DB::table('todo_tasks')->where('status', 'En validation')->update(['status' => 'En cours']);
            DB::table('todo_tasks')->where('status', 'Annulé')->update(['status' => 'En cours']);
        } catch (\Throwable $e) {
            // ignore
        }

        try {
            DB::statement("ALTER TABLE `todo_tasks` MODIFY `status` ENUM('Non commencée','En cours','Terminée') NOT NULL DEFAULT 'Non commencée'");
        } catch (\Throwable $e) {
            // ignore
        }

        Schema::table('todo_tasks', function (Blueprint $table) {
            if (Schema::hasColumn('todo_tasks', 'priority')) {
                $table->dropColumn('priority');
            }
        });
    }
};
