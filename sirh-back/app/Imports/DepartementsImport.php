<?php

namespace App\Imports;

use App\Models\Departement;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class DepartementsImport implements ToModel, WithHeadingRow
{
    public function model(array $row)
    {
        $nom = trim($row['nom']);

       
        if (!Departement::where('nom', $nom)->exists()) {
            return new Departement([
                'nom' => $nom,
            ]);
        }

        return null; 
    }
}