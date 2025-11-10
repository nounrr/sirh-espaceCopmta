<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Pointage;
use Illuminate\Http\Request;
use Carbon\Carbon;

class PointageDetailController extends Controller
{
    public function index(Request $request)
    {
        try {
            $user = auth()->user();
            if (!$user->hasAnyRole(['RH', 'Gest_RH'])) {
                return response()->json([], 403);
            }

            $societeId = $user->societe_id;

            $query = Pointage::with(['user.departement', 'user.societe'])
                ->where('societe_id', $societeId);

            // Filtres depuis les query params
            $startDate = $request->query('startDate');
            $endDate = $request->query('endDate');
            $specificDate = $request->query('specificDate');
            $month = $request->query('month');
            $year = $request->query('year');
            $exportAll = $request->boolean('exportAll', false);

            if (!$exportAll) {
                if ($specificDate) {
                    $query->whereDate('date', Carbon::parse($specificDate)->toDateString());
                } elseif ($startDate && $endDate) {
                    $query->whereBetween('date', [
                        Carbon::parse($startDate)->startOfDay(),
                        Carbon::parse($endDate)->endOfDay()
                    ]);
                } elseif ($month) {
                    // Peut être 'YYYY-MM' ou séparé
                    if (strpos($month, '-') !== false) {
                        [$year, $month] = explode('-', $month);
                    }
                    $year = $year ?? now()->year;
                    $query->whereYear('date', $year)
                          ->whereMonth('date', $month);
                }
            }

            // On récupère tous les pointages filtrés
            $pointagesCollection = $query->get();

            // Calcul des totaux
            $stats = [
                'total'   => $pointagesCollection->count(),
                'present' => $pointagesCollection->where('statutJour', 'present')->count(),
                'absent'  => $pointagesCollection->where('statutJour', 'absent')->count(),
                'retard'  => $pointagesCollection->where('statutJour', 'retard')->count(),
            ];

            // Mapping des résultats pour la liste détaillée
            $pointages = $pointagesCollection->map(function ($item) {
                $nom = $item->user->name ?? 'N/A';
                $prenom = $item->user->prenom ?? 'N/A';
                $nomComplet = trim("$prenom $nom");
                $situationFm = $item->user->situationFamiliale ?? 'N/A';
                $nbEnfants = $item->user->nbEnfants ?? 'N/A';
                $societe = $item->user->societe->nom ?? 'N/A';
                $departement = $item->user->departement->nom ?? 'N/A';

                return [
                    'nom_complet' => $nomComplet,
                    'situation_familiale' => $situationFm,
                    'nombre_enfants' => $nbEnfants,
                    'societe' => $societe,
                    'departement' => $departement,
                    'date' => $item->date ? Carbon::parse($item->date)->format('Y-m-d') : null,
                    'heure_entree' => $item->heureEntree ?? 'N/A',
                    'heure_sortie' => $item->heureSortie ?? 'N/A',
                    'statut_jour' => $item->statutJour ?? 'N/A',
                    'heures_supplementaires' => $item->overtimeHours ?? 0,
                ];
            });

            // Retourne les données + stats
            return response()->json([
                'stats' => $stats,
                'pointages' => $pointages->values(),
            ]);
        } catch (\Exception $e) {
            \Log::error('[API] Pointage details : ' . $e->getMessage());
            return response()->json(['error' => 'Erreur serveur'], 500);
        }
    }
}
