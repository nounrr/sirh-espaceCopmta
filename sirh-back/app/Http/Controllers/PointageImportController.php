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

        $header = $data[0];

        // On suppose toujours : colonne 0 = nom, 1 = prenom, puis jours
        // Début de la boucle sur les utilisateurs
        for ($i = 1; $i < count($data); $i++) {
            $row = $data[$i];
            $nom = trim($row[0]);
            $prenom = trim($row[1]);

            // Recherche du user
            $user = User::where('name', $nom)->where('prenom', $prenom)->first();
            if (!$user) continue;

            // Boucle sur les colonnes jours (ici 2, 3, 4)
            for ($col = 2; $col < count($header); $col++) {
                $jour = $header[$col];
                if (!isset($row[$col])) continue;
                $value = trim((string)$row[$col]);
                if ($value === '') continue;

                // Convertit la colonne date "1900-01-28 00:00:00" → '2025-05-28'
                $date_obj = date_create($jour);
                if (!$date_obj) continue;
                // Tu peux fixer le mois/année ici si tu veux
                $day = $date_obj->format('d');
                $date = '2025-05-' . $day; // Forcé pour mai 2025

                // Traitement des valeurs
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
                            $heureSortie = date('H:i:s', strtotime('09:00:00 +' . $heuresTravaillees . ' hours'));
                        }
                    }
                }

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
