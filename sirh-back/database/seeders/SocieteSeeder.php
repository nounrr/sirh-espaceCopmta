<?php

namespace Database\Seeders;

use App\Models\Societe;
use Illuminate\Database\Seeder;

class SocieteSeeder extends Seeder
{
    public function run(): void
    {
        $societes = [
            ['nom' => 'SMEE'],
            ['nom' => 'DCT'],
        ];

        foreach ($societes as $societe) {
            Societe::create($societe);
        }
    }
}