<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\JourFerie;

class JoursFeriesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $joursFeries = [
            // Jours fériés fixes du Maroc
            ['date' => '2025-01-01', 'nom' => 'Nouvel An', 'description' => 'Jour de l\'An'],
            ['date' => '2025-01-11', 'nom' => 'Manifeste de l\'Indépendance', 'description' => 'Commémoration du Manifeste de l\'Indépendance'],
            ['date' => '2025-05-01', 'nom' => 'Fête du Travail', 'description' => 'Fête internationale du travail'],
            ['date' => '2025-07-30', 'nom' => 'Fête du Trône', 'description' => 'Fête du Trône'],
            ['date' => '2025-08-14', 'nom' => 'Journée de Oued Ed-Dahab', 'description' => 'Récupération de Oued Ed-Dahab'],
            ['date' => '2025-08-20', 'nom' => 'Révolution du Roi et du Peuple', 'description' => 'Anniversaire de la Révolution du Roi et du Peuple'],
            ['date' => '2025-08-21', 'nom' => 'Fête de la Jeunesse', 'description' => 'Anniversaire de Sa Majesté le Roi Mohammed VI'],
            ['date' => '2025-11-06', 'nom' => 'Marche Verte', 'description' => 'Anniversaire de la Marche Verte'],
            ['date' => '2025-11-18', 'nom' => 'Fête de l\'Indépendance', 'description' => 'Fête de l\'Indépendance'],
            
            // Jours fériés religieux (dates approximatives pour 2025 - à ajuster selon le calendrier lunaire)
            ['date' => '2025-03-31', 'nom' => 'Aïd Al-Fitr', 'description' => 'Fête de la rupture du jeûne'],
            ['date' => '2025-04-01', 'nom' => 'Aïd Al-Fitr (2ème jour)', 'description' => 'Deuxième jour de l\'Aïd Al-Fitr'],
            ['date' => '2025-06-07', 'nom' => 'Aïd Al-Adha', 'description' => 'Fête du sacrifice'],
            ['date' => '2025-06-08', 'nom' => 'Aïd Al-Adha (2ème jour)', 'description' => 'Deuxième jour de l\'Aïd Al-Adha'],
            ['date' => '2025-06-28', 'nom' => 'Nouvel An Hégirien', 'description' => 'Premier jour de l\'année hégirienne'],
            ['date' => '2025-09-06', 'nom' => 'Mawlid Nabawi', 'description' => 'Anniversaire de la naissance du Prophète Mohammed'],
            
            // 2024
            ['date' => '2024-01-01', 'nom' => 'Nouvel An', 'description' => 'Jour de l\'An'],
            ['date' => '2024-01-11', 'nom' => 'Manifeste de l\'Indépendance', 'description' => 'Commémoration du Manifeste de l\'Indépendance'],
            ['date' => '2024-04-10', 'nom' => 'Aïd Al-Fitr', 'description' => 'Fête de la rupture du jeûne'],
            ['date' => '2024-04-11', 'nom' => 'Aïd Al-Fitr (2ème jour)', 'description' => 'Deuxième jour de l\'Aïd Al-Fitr'],
            ['date' => '2024-05-01', 'nom' => 'Fête du Travail', 'description' => 'Fête internationale du travail'],
            ['date' => '2024-06-17', 'nom' => 'Aïd Al-Adha', 'description' => 'Fête du sacrifice'],
            ['date' => '2024-06-18', 'nom' => 'Aïd Al-Adha (2ème jour)', 'description' => 'Deuxième jour de l\'Aïd Al-Adha'],
            ['date' => '2024-07-07', 'nom' => 'Nouvel An Hégirien', 'description' => 'Premier jour de l\'année hégirienne'],
            ['date' => '2024-07-30', 'nom' => 'Fête du Trône', 'description' => 'Fête du Trône'],
            ['date' => '2024-08-14', 'nom' => 'Journée de Oued Ed-Dahab', 'description' => 'Récupération de Oued Ed-Dahab'],
            ['date' => '2024-08-20', 'nom' => 'Révolution du Roi et du Peuple', 'description' => 'Anniversaire de la Révolution du Roi et du Peuple'],
            ['date' => '2024-08-21', 'nom' => 'Fête de la Jeunesse', 'description' => 'Anniversaire de Sa Majesté le Roi Mohammed VI'],
            ['date' => '2024-09-16', 'nom' => 'Mawlid Nabawi', 'description' => 'Anniversaire de la naissance du Prophète Mohammed'],
            ['date' => '2024-11-06', 'nom' => 'Marche Verte', 'description' => 'Anniversaire de la Marche Verte'],
            ['date' => '2024-11-18', 'nom' => 'Fête de l\'Indépendance', 'description' => 'Fête de l\'Indépendance'],
        ];

        foreach ($joursFeries as $jourFerie) {
            JourFerie::updateOrCreate(
                ['date' => $jourFerie['date']],
                $jourFerie
            );
        }
    }
}
