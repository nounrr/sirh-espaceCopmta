<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('prenom')->nullable();
            $table->string('tel')->nullable();
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->string('role')->nullable();
            $table->decimal('hourly_rate', 10, 2)->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('todo_lists', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('assigned_to')->nullable()->constrained('users');
            $table->foreignId('project_id')->nullable();
            $table->timestamps();
        });

        Schema::create('todo_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('todo_list_id')->constrained('todo_lists')->cascadeOnDelete();
            $table->text('description');
            $table->string('status')->default('En attente');
            $table->timestamp('completed_at')->nullable();
            $table->integer('completion_delay_minutes')->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('pourcentage')->default(0);
            $table->unsignedInteger('planned_minutes')->nullable();
            $table->unsignedInteger('actual_minutes_cache')->default(0);
            $table->string('type')->nullable();
            $table->string('origine')->nullable();
            $table->foreignId('client_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('priority')->default('normale');
            $table->boolean('is_billable')->default(true);
            $table->decimal('billing_rate', 10, 2)->nullable();
            $table->timestamps();
        });

        Schema::create('todo_task_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('todo_task_id')->constrained('todo_tasks')->cascadeOnDelete();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('original_name');
            $table->string('stored_path');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->timestamps();
        });

        Schema::create('task_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('todo_task_id')->constrained('todo_tasks')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('content')->nullable();
            $table->timestamps();
        });

        Schema::create('todo_task_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('todo_task_id')->constrained('todo_tasks')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('todo_task_cancellation_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('todo_task_id')->constrained('todo_tasks')->cascadeOnDelete();
            $table->foreignId('requester_id')->constrained('users')->cascadeOnDelete();
            $table->text('reason')->nullable();
            $table->timestamps();
        });

        Schema::create('todo_task_proofs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('todo_task_id')->constrained('todo_tasks')->cascadeOnDelete();
            $table->foreignId('uploaded_by')->constrained('users')->cascadeOnDelete();
            $table->string('original_name');
            $table->string('stored_path');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->timestamps();
        });

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
        });

        Schema::create('task_progress_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('todo_task_id')->constrained('todo_tasks')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedTinyInteger('pourcentage')->default(0);
            $table->string('status')->nullable();
            $table->text('comment')->nullable();
            $table->timestamps();
        });

        Schema::create('task_progress_hours', function (Blueprint $table) {
            $table->id();
            $table->foreignId('todo_task_id')->constrained('todo_tasks')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('work_date');
            $table->unsignedInteger('minutes_spent')->default(0);
            $table->decimal('cost', 12, 2)->default(0);
            $table->timestamps();

            $table->unique(['todo_task_id', 'user_id', 'work_date'], 'tph_unique_constraint');
        });

        Schema::create('client_information_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('todo_task_id')->nullable()->constrained('todo_tasks')->nullOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('subject');
            $table->string('channel')->nullable();
            $table->enum('status', ['pending', 'in_progress', 'resolved'])->default('pending');
            $table->timestamp('requested_at')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->integer('response_minutes')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('audits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('auditable_type');
            $table->unsignedBigInteger('auditable_id');
            $table->string('event');
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('url')->nullable();
            $table->string('ip_address')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_information_requests');
        Schema::dropIfExists('task_progress_hours');
        Schema::dropIfExists('task_progress_logs');
        Schema::dropIfExists('time_entries');
        Schema::dropIfExists('audits');
        Schema::dropIfExists('todo_task_proofs');
        Schema::dropIfExists('todo_task_cancellation_requests');
        Schema::dropIfExists('todo_task_user');
        Schema::dropIfExists('task_comments');
        Schema::dropIfExists('todo_task_attachments');
        Schema::dropIfExists('todo_tasks');
        Schema::dropIfExists('todo_lists');
        Schema::dropIfExists('users');
    }
};
