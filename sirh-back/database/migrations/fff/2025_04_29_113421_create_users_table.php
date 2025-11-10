<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email');
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->string('cin')->unique();
            $table->string('rib')->nullable();
            $table->enum('situationFamiliale', ['Célibataire', 'Marié','Divorcé'])->nullable();
            $table->integer('nbEnfants')->default(0)->nullable();
            $table->string('adresse')->nullable();
            $table->string('prenom');
            $table->date('date_naissance')->nullable();
            $table->string('tel')->nullable();
            $table->enum('role', ['Employe', 'Chef_Dep', 'RH','Chef_Projet']);
            $table->enum('statut', [ 'Actif','Inactif', 'Congé', 'Malade']);
            $table->enum('typeContrat', [ 'Permanent', 'Temporaire']);
            $table->string('picture')->nullable();
            $table->foreignId('departement_id')->nullable()->constrained()->nullOnDelete(); 
            $table->foreignId('societe_id')->nullable()->constrained()->nullOnDelete(); 
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
