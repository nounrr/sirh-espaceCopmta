<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
	public function up(): void
	{
		Schema::create('time_entries', function (Blueprint $table) {
			$table->id();
			$table->foreignId('todo_task_id')->constrained('todo_tasks')->cascadeOnDelete();
			$table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
			$table->timestamp('started_at');
			$table->timestamp('ended_at')->nullable();
			$table->unsignedInteger('duration_minutes')->default(0);
			$table->string('source')->nullable();
			$table->text('notes')->nullable();
			$table->timestamps();

			$table->index(['user_id', 'started_at']);
			$table->index(['todo_task_id', 'started_at']);
		});
	}

	public function down(): void
	{
		Schema::dropIfExists('time_entries');
	}
};

