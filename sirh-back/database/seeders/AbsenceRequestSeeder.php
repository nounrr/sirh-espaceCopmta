<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\AbsenceRequest;

class AbsenceRequestSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        AbsenceRequest::insert([
            [
                'user_id' => 1,
                'type' => 'Congé',
                'dateDebut' => '2025-05-10',
                'dateFin' => '2025-05-15',
                'motif' => 'Vacances familiales',
                'statut' => 'en_attente',
                'justification' => 'justificatifs/conge1.pdf',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        ]);
    }
}
