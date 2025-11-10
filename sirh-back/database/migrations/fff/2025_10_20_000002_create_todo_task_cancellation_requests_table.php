<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateTodoTaskCancellationRequestsTable extends Migration
{
    public function up()
    {
        Schema::create('todo_task_cancellation_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('todo_task_id');
            $table->unsignedBigInteger('requested_by')->nullable(); // must be nullable for SET NULL
            $table->text('reason')->nullable();
            $table->string('status')->default('pending'); // pending, approved, refused
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->text('resolution_note')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->foreign('todo_task_id')->references('id')->on('todo_tasks')->onDelete('cascade');
            $table->foreign('requested_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('reviewed_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down()
    {
        Schema::dropIfExists('todo_task_cancellation_requests');
    }
}

