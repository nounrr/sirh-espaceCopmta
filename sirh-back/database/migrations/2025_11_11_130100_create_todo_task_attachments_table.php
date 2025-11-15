<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('todo_task_attachments')) {
            return;
        }

        Schema::create('todo_task_attachments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('todo_task_id');
            $table->string('file_name')->nullable();
            $table->string('file_path')->nullable();
            $table->timestamps();

            $table->foreign('todo_task_id')->references('id')->on('todo_tasks')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('todo_task_attachments');
    }
};
