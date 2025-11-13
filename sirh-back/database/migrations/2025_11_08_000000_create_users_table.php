<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Anonymous, idempotent migration to avoid failures when the users table already exists
return new class extends Migration {
	public function up(): void
	{
		if (Schema::hasTable('users')) {
			return; // Table already exists (from dump or earlier migrations)
		}

		Schema::create('users', function (Blueprint $table) {
			$table->bigIncrements('id');
			$table->string('name');
			$table->string('email')->nullable()->unique();
			$table->timestamp('email_verified_at')->nullable();
			$table->string('password')->nullable();
			// Core enums used elsewhere in the app
			$table->enum('role', ['Employe','Chef_Dep','RH','Chef_Projet','Chef_Chant','Gest_RH','Gest_Projet'])->nullable();
			$table->enum('typeContrat', ['Permanent','Temporaire'])->nullable();
			$table->rememberToken();
			$table->timestamps();
		});
	}

	public function down(): void
	{
		Schema::dropIfExists('users');
	}
};

