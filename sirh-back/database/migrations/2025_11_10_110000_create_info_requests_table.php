<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('info_requests')) {
            Schema::create('info_requests', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('client_id')->nullable()->index();
                $table->unsignedBigInteger('todo_task_id')->nullable()->index();
                $table->unsignedBigInteger('requested_by')->nullable()->index();
                $table->string('subject', 180);
                $table->text('details')->nullable();
                $table->date('period_start')->nullable();
                $table->date('period_end')->nullable();
                $table->enum('status', ['en attente','en relance','reçu','incomplet','validé'])->default('en attente')->index();
                $table->timestamp('requested_at')->nullable();
                $table->timestamp('responded_at')->nullable();
                $table->timestamps();

                $table->foreign('client_id')->references('id')->on('users')->nullOnDelete();
                $table->foreign('todo_task_id')->references('id')->on('todo_tasks')->nullOnDelete();
                $table->foreign('requested_by')->references('id')->on('users')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('info_requests');
    }
};
