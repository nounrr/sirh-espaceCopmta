<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
{
    Schema::table('users', function (Blueprint $table) {
        $table->date('date_sortie')->nullable();
        $table->string('cnss', 30)->nullable();
        $table->decimal('solde_conge', 6, 2)->nullable()->default(0); // exemple : 15.50 jours
    });
}

public function down()
{
    Schema::table('users', function (Blueprint $table) {
        $table->dropColumn(['date_depart', 'date_sortie', 'cnss', 'solde_conge']);
    });
}

};
