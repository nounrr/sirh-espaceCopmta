<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('time_entries')) {
            return;
        }

        if (Schema::hasColumn('time_entries', 'stopped_at') && !Schema::hasColumn('time_entries', 'ended_at')) {
            DB::statement('ALTER TABLE `time_entries` CHANGE `stopped_at` `ended_at` DATETIME NULL');
        } elseif (!Schema::hasColumn('time_entries', 'ended_at')) {
            Schema::table('time_entries', function (Blueprint $table) {
                $table->timestamp('ended_at')->nullable()->after('started_at');
            });
        }

        if (!Schema::hasColumn('time_entries', 'duration_minutes')) {
            Schema::table('time_entries', function (Blueprint $table) {
                $table->unsignedInteger('duration_minutes')->default(0)->after('ended_at');
            });
        }

        if (Schema::hasColumn('time_entries', 'note') && !Schema::hasColumn('time_entries', 'notes')) {
            DB::statement('ALTER TABLE `time_entries` CHANGE `note` `notes` TEXT NULL');
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('time_entries')) {
            return;
        }

        if (Schema::hasColumn('time_entries', 'notes') && !Schema::hasColumn('time_entries', 'note')) {
            DB::statement('ALTER TABLE `time_entries` CHANGE `notes` `note` TEXT NULL');
        }

        if (Schema::hasColumn('time_entries', 'ended_at') && !Schema::hasColumn('time_entries', 'stopped_at')) {
            DB::statement('ALTER TABLE `time_entries` CHANGE `ended_at` `stopped_at` DATETIME NULL');
        }

        if (Schema::hasColumn('time_entries', 'duration_minutes')) {
            Schema::table('time_entries', function (Blueprint $table) {
                $table->dropColumn('duration_minutes');
            });
        }
    }
};
