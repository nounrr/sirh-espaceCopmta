<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
	public function up(): void
	{
		Schema::table('todo_tasks', function (Blueprint $table) {
			$table->unsignedInteger('planned_minutes')->nullable()->after('end_date');
			$table->unsignedInteger('actual_minutes_cache')->default(0)->after('planned_minutes');
			$table->boolean('is_billable')->default(true)->after('priority');
			$table->decimal('billing_rate', 10, 2)->nullable()->after('is_billable');
		});
	}

	public function down(): void
	{
		Schema::table('todo_tasks', function (Blueprint $table) {
			$table->dropColumn(['planned_minutes', 'actual_minutes_cache', 'is_billable', 'billing_rate']);
		});
	}
};

