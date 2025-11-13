<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
	public function up(): void
	{
		if (!Schema::hasTable('users')) {
			return; // Base table missing; nothing to alter
		}

		Schema::table('users', function (Blueprint $table) {
			if (!Schema::hasColumn('users', 'hourly_rate')) {
				// Avoid placing AFTER a column that may not exist in this schema
				$table->decimal('hourly_rate', 10, 2)->nullable();
			}
		});
	}

	public function down(): void
	{
		if (!Schema::hasTable('users')) {
			return;
		}
		Schema::table('users', function (Blueprint $table) {
			if (Schema::hasColumn('users', 'hourly_rate')) {
				$table->dropColumn('hourly_rate');
			}
		});
	}
};

