<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Pointage;
use Carbon\Carbon;

class PointageSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $employeIds = range(146, 154); 
        $jours = 10; 

        foreach ($employeIds as $employeId) {
            for ($i = 0; $i < $jours; $i++) {
                $date = Carbon::now()->subDays($i)->toDateString();
                
                
                $statut = collect(['present', 'absent', 'retard'])->random();

                
                if ($statut === 'present') {
                    $entree = '08:30:00';
                    $sortie = '17:30:00';
                } elseif ($statut === 'retard') {
                    $entree = '09:15:00';
                    $sortie = '17:30:00';
                } else { 
                    $entree = null;
                    $sortie = null;
                }

                Pointage::create([
                    'user_id' => $employeId,
                    'date' => $date,
                    'heureEntree' => $entree,
                    'heureSortie' => $sortie,
                    'statutJour' => $statut,
                    'overtimeHours' => $statut === 'present' ? rand(0, 2) : 0,
                ]);
            }
        }
    }
}
