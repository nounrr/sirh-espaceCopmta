<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('info_request_reminders')) {
            Schema::create('info_request_reminders', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('info_request_id')->index();
                $table->unsignedBigInteger('sent_by')->nullable()->index();
                $table->timestamp('sent_at')->nullable();
                $table->text('note')->nullable();
                $table->timestamps();

                $table->foreign('info_request_id')->references('id')->on('info_requests')->cascadeOnDelete();
                $table->foreign('sent_by')->references('id')->on('users')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('info_request_reminders');
    }
};
