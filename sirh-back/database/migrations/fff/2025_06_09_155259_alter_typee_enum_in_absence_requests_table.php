<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class AlterTypeeEnumInAbsenceRequestsTable extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        // Ajoute 'AttestationTravail' à l'enum
        DB::statement("ALTER TABLE `absence_requests` MODIFY COLUMN `type` ENUM('Congé','maladie','autre','AttestationTravail') NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down()
    {
        // Enlève 'AttestationTravail' pour revenir à l’état initial
        DB::statement("ALTER TABLE `absence_requests` MODIFY COLUMN `type` ENUM('Congé','maladie','autre') NOT NULL");
    }
}
