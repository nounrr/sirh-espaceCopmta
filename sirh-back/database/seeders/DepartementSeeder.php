<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Departement;

class DepartementSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Departement::insert([
            ['nom' => 'rh', 'created_at' => now(), 'updated_at' => now()],
            ['nom' => 'Administratif', 'created_at' => now(), 'updated_at' => now()],
            ['nom' => 'Technnique', 'created_at' => now(), 'updated_at' => now()],
            ['nom' => 'Achats & Logistique', 'created_at' => now(), 'updated_at' => now()],
        ]);  
    }
}
