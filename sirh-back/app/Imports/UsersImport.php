<?php

namespace App\Imports;

use App\Models\User;
use App\Models\Departement;
use App\Models\Societe;
use Illuminate\Support\Facades\Hash;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterImport;
use Carbon\Carbon;

class UsersImport implements ToModel, WithHeadingRow, WithEvents
{
    protected $usersWithRoles = [];

    public function model(array $row)
    {
        $nomDepartement = trim($row['nom_departement']);  
        $departement = Departement::firstOrCreate([
            'nom' => $nomDepartement,
        ]);

        // Récupération ou création de la société
        $nomsociete = trim($row['nom_societe']);  
        $societe = Societe::firstOrCreate([
            'nom' => $nomsociete,
        ]);

        // Conversion de la date
        $dateNaissance = $this->convertExcelDate($row['date_naissance']);

        $user = new User([
            'cin' => $row["cin"],                     
            'rib' => $row['rib'],             
            'situationFamiliale' => $row['situation_familiale'],
            'nbEnfants' => $row['nombre_enfants'],
            'adresse' => $row['adresse'],
            'name' => trim($row['nom']),    // <-- Ajout du trim ici   
  
            'password' => Hash::make($row['mot_de_passe']),
            'picture' => $row['photo_profil'],                 
            'prenom' => trim($row['prenom']),               
            'date_naissance' => $dateNaissance, 
            'tel' => $row['telephone'],             
            'email' => $row['email'],                 
            'statut' => $row['statut'],               
            'typeContrat' => $row['type_contrat'],     
            'role' => $row['role'],
            'departement_id' => $departement->id,
            'societe_id' => $societe->id, // Correctement assigné
        ]);

        // Stock temporairement l'info du rôle avec le user (à assigner après)
        $this->usersWithRoles[] = [
            'user' => $user,
            'role' => $row['role']
        ];

        return $user;
    }

    /**
     * Convertit la date Excel en format `Y-m-d`.
     *
     * @param mixed $excelDate
     * @return string|null
     */
    private function convertExcelDate($excelDate)
    {
        if (is_numeric($excelDate)) {
            try {
                return Carbon::instance(\PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($excelDate))->format('Y-m-d');
            } catch (\Exception $e) {
                return null;
            }
        }

        return $excelDate;
    }

    public function registerEvents(): array
    {
        return [
            AfterImport::class => function (AfterImport $event) {
                foreach ($this->usersWithRoles as $userData) {
                    $user = User::where('email', $userData['user']->email)->first();
                    if ($user && !empty($userData['role'])) {
                        $user->assignRole($userData['role']);
                    }
                }
            },
        ];
    }
}
