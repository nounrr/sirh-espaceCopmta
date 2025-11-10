<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('salaires', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->decimal('salaire_base', 12, 2)->default(0.00);
            $table->decimal('panier', 8, 2)->default(0.00);
            $table->decimal('represent', 8, 2)->default(0.00);
            $table->decimal('transport', 8, 2)->default(0.00);
            $table->decimal('deplacement', 8, 2)->default(0.00);
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('salaires');
    }
};