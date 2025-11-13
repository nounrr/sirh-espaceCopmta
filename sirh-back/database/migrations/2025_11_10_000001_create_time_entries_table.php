<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
	/**
	 * Run the migrations.
	 */
	public function up(): void
	{
		if (!Schema::hasTable('time_entries')) {
			Schema::create('time_entries', function (Blueprint $table) {
				$table->id();
				$table->foreignId('user_id')->constrained()->onDelete('cascade');
				$table->foreignId('todo_task_id')->constrained('todo_tasks')->onDelete('cascade');
				$table->dateTime('started_at');
				$table->dateTime('stopped_at')->nullable();
				$table->timestamps();

				$table->index(['user_id', 'started_at']);
				$table->index('todo_task_id');
			});
		}
	}

	/**
	 * Reverse the migrations.
	 */
	public function down(): void
	{
		Schema::dropIfExists('time_entries');
	}
};
