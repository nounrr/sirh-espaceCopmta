<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('info_request_comments')) {
            Schema::create('info_request_comments', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('info_request_id')->index();
                $table->unsignedBigInteger('user_id')->nullable()->index();
                $table->text('content');
                $table->timestamps();

                $table->foreign('info_request_id')->references('id')->on('info_requests')->cascadeOnDelete();
                $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('info_request_comments');
    }
};
