<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class EmployeSeeder extends Seeder
{
    public function run()
    {
        // Créer un employé RH
        $employe = User::create([
            'name' => 'test',
            'prenom' => 'RH',
            'cin' => 'test',
            'rib' => 'MA6400012345678901234567890',
            'situationFamiliale' => 'Marié',
            'nbEnfants' => 2,
            'adresse' => '10, Rue des RH, Casablanca',
            'tel' => '0601010203',
            'email' => 'rh@example.com',
            'password' => Hash::make('password'), // mot de passe simple
            'role' => 'RH', // champ textuel dans la table User (pour affichage rapide)
            'typeContrat' => 'Permanent',
            'date_naissance' => '1985-01-01',
            'statut' => 'Actif',
            'departement_id' => 1, // Assure-toi que ce département existe
            'societe_id' => 1, // Assure-toi que ce département existe
        ]);

        // Assigner le rôle RH via Spatie
        $role = Role::where('name', 'RH')->first();
        if ($role) {
            $employe->assignRole($role);
        }
    }
}
