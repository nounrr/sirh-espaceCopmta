<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
	public function up(): void
	{
		Schema::create('task_progress_logs', function (Blueprint $table) {
			$table->id();
			$table->foreignId('todo_task_id')->constrained('todo_tasks')->cascadeOnDelete();
			$table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
			$table->unsignedTinyInteger('pourcentage')->default(0);
			$table->string('status')->nullable();
			$table->text('comment')->nullable();
			$table->timestamps();

			$table->index(['todo_task_id', 'created_at']);
		});
	}

	public function down(): void
	{
		Schema::dropIfExists('task_progress_logs');
	}
};

