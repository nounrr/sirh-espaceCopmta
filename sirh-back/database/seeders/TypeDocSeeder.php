<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TypeDoc;

class TypeDocSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $types = [
            'Copie CIN recto verso',
            'Photos',
            'Copie Fiche anthropométrique',
            'Aptitude physique générale',
            'Aptitude physique spécifique',
            'AT nominative (pour l\'ensemble des agents)',
            'Attestation d\'habilitation travaux en hauteur si applicable',
            'Attestation d\'habilitation espace confiné si applicable',
            'Curriculum Vitae (CV)',
            'Une copie de votre carte CNSS',
            'Le relevé d’identité bancaire (RIB)',
            'Une copie de vos diplômes et certifications',
        ];

        foreach ($types as $type) {
            TypeDoc::create([
                'nom' => $type,
            ]);
        }
    }
}
