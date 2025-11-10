<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('absence_request_documents')) {
            Schema::create('absence_request_documents', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('absence_request_id');
                $table->string('path');
                $table->string('original_name');
                $table->string('mime_type', 100)->nullable();
                $table->unsignedInteger('size')->nullable(); // size in KB
                $table->timestamps();

                $table->foreign('absence_request_id')
                      ->references('id')->on('absence_requests')
                      ->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('absence_request_documents');
    }
};
