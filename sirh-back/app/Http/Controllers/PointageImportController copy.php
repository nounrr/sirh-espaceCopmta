<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Pointage;
use Maatwebsite\Excel\Facades\Excel;

class PointageImportController extends Controller
{
    public function import(Request $request)
    {
        $file = $request->file('file');
        $data = Excel::toArray([], $file)[0];

        // Supposons que la première ligne est le header
        $header = $data[0];

        // Jours à ignorer
        $jours_ignores = ['31'];

        for ($i = 1; $i < count($data); $i++) {
            $row = $data[$i];
            $nom = trim($row[0]);
            $prenom = trim($row[1]);

            // Recherche user par nom et prénom
            // Remplace ici par la bonne logique selon ta table users :
            $user = User::where('name', $nom)->where('prenom', $prenom)->first();
            // Si tu n'as qu'un seul champ "name", utilise :
            // $user = User::where('name', $nom . ' ' . $prenom)->first();

            if (!$user) continue;

            // Parcourir chaque colonne jour (de 01 à 30)
            for ($col = 4; $col <= 31; $col++) { // colonnes 01 à 30 (index Excel, à ajuster si besoin)
                $jour = $header[$col];
                if (in_array($jour, $jours_ignores)) continue;

                // Sécurité : s'il n'y a pas de cellule ce jour-là, on saute
                if (!isset($row[$col])) continue;

                $value = trim($row[$col]);
                if ($value === '') continue;

                // Contrôle si $jour est bien un chiffre de 1 à 28
                if (!is_numeric($jour) || (int)$jour < 1 || (int)$jour > 31) continue;

                $statutJour = 'present';
                $heureEntree = '09:00:00';
                $heuresTravaillees = 0;
                $overtime = 0;
                $heureSortie = null;

                if (strtolower($value) == 'x') {
                    $statutJour = 'absent';
                    $heureEntree = null;
                    $heureSortie = null;
                } else {
                    $heuresTravaillees = (int) $value;
                    if ($heuresTravaillees < 8) {
                        $heureSortie = date('H:i:s', strtotime('09:00:00 +' . $heuresTravaillees . ' hours'));
                    } else {
                        $heureSortie = date('H:i:s', strtotime('09:00:00 +8 hours'));
                        $overtime = $heuresTravaillees - 8;
                        if ($overtime < 0) $overtime = 0;
                        if ($heuresTravaillees > 8) {
                            // Si on veut afficher la vraie heure de sortie
                            $heureSortie = date('H:i:s', strtotime('09:00:00 +' . $heuresTravaillees . ' hours'));
                        }
                    }
                }

                // Format de la date
                $date = '2025-05-' . str_pad($jour, 2, '0', STR_PAD_LEFT);

                // Création du pointage
                Pointage::create([
                    'user_id' => $user->id,
                    'date' => $date,
                    'heureEntree' => $heureEntree,
                    'heureSortie' => $heureSortie,
                    'statutJour' => $statutJour,
                    'overtimeHours' => $overtime,
                    'valider' => 1,
                    'societe_id' => 1,
                ]);
            }
        }

        return back()->with('success', 'Importation terminée');
    }
}



