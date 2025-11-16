<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
	public function up(): void
	{
		Schema::create('task_progress_hours', function (Blueprint $table) {
			$table->id();
			$table->foreignId('todo_task_id')->constrained('todo_tasks')->cascadeOnDelete();
			$table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
			$table->date('work_date');
			$table->unsignedInteger('minutes_spent')->default(0);
			$table->decimal('cost', 12, 2)->default(0);
			$table->timestamps();

			$table->unique(['todo_task_id', 'user_id', 'work_date'], 'task_progress_hours_unique');
		});
	}

	public function down(): void
	{
		Schema::dropIfExists('task_progress_hours');
	}
};

