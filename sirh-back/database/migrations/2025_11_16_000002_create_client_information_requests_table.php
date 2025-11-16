<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('client_information_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('todo_task_id')->nullable();
            $table->unsignedBigInteger('client_id')->nullable();
            $table->unsignedBigInteger('handled_by')->nullable();
            $table->string('subject');
            $table->string('channel')->nullable();
            $table->enum('status', ['pending', 'in_progress', 'resolved'])->default('pending');
            $table->timestamp('requested_at')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->integer('response_minutes')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('todo_task_id')->references('id')->on('todo_tasks')->nullOnDelete();
            $table->foreign('client_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('handled_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_information_requests');
    }
};
