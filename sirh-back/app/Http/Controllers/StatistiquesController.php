<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Carbon\Carbon;
use App\Models\User;
use App\Models\Pointage;
use Illuminate\Support\Facades\Log;

class StatistiquesController extends Controller
{
    public function statistiquesPresence(Request $request)
    {
        try {
            $user = auth()->user();
            $periode = $request->get('periode', 'jour');
            $filterUserId = $request->get('user_id'); // Optionnel pour RH
            $typeContrat = $request->get('typeContrat');

            // Récupérer la société de l'utilisateur connecté
            $societeId = $user->societe_id;

            // Log params
            \Log::info('Params:', [
                'periode' => $periode,
                'date' => $request->get('date'),
                'dateDebut' => $request->get('dateDebut'),
                'dateFin' => $request->get('dateFin'),
                'mois' => $request->get('mois'),
                'societe_id' => $societeId,
                'user_id' => $filterUserId
            ]);

            // Période
            switch ($periode) {
                case 'semaine':
                    $dateDebut = Carbon::parse($request->get('dateDebut'));
                    $dateFin = Carbon::parse($request->get('dateFin'));
                    $start = $dateDebut->startOfDay();
                    $end = $dateFin->endOfDay();
                    break;
                case 'mois':
                    $mois = Carbon::parse($request->get('mois'));
                    $start = $mois->copy()->startOfMonth();
                    $end = $mois->copy()->endOfMonth();
                    break;
                default: // jour
                    $date = Carbon::parse($request->get('date', now()));
                    $start = $date->copy()->startOfDay();
                    $end = $date->copy()->endOfDay();
                    break;
            }

            // Déterminer les employés concernés
            if ($user->hasAnyRole(['RH', 'Gest_RH'])) {
                $employes = $filterUserId
                    ? User::where('id', $filterUserId)
                    : User::query();
                if ($typeContrat) {
                    $employes->where('typeContrat', $typeContrat);
                }
                $employes->where('societe_id', $societeId);
                $employes = $employes->get();
            } elseif ($user->hasAnyRole(['Chef_Dep', 'Chef_Projet','Chef_Chant'])) {
                $employes = User::where('departement_id', $user->departement_id)
                    ->where('societe_id', $societeId);
                if ($typeContrat) {
                    $employes->where('typeContrat', $typeContrat);
                }
                $employes = $employes->get();
            } elseif ($user->hasRole('Employe')) {
                $employes = collect([$user]);
            } else {
                return response()->json(['message' => 'Non autorisé'], 403);
            }

            $userIds = $employes->pluck('id');

            // Filtrage par société directement (déjà fait via user->societe_id)
            $pointages = Pointage::whereBetween('date', [$start, $end])
                ->whereIn('user_id', $userIds)
                ->where('societe_id', $societeId)
                ->get();

            // Stats globales
            $present = $pointages->where('statutJour', 'present')->count();
            $absent = $pointages->where('statutJour', 'absent')->count();
            $enRetard = $pointages->where('statutJour', 'retard')->count();

            $totalUsers = $employes->count();
            $presentPercentage = $totalUsers ? number_format(($present / $totalUsers) * 100, 2) : 0;
            $absentPercentage = $totalUsers ? number_format(($absent / $totalUsers) * 100, 2) : 0;
            $enRetardPercentage = $totalUsers ? number_format(($enRetard / $totalUsers) * 100, 2) : 0;

            // Si filtre sur un user précis (RH uniquement)
            $userStats = null;
            if ($user->hasAnyRole(['RH', 'Gest_RH']) && $filterUserId) {
                $userPointages = Pointage::where('user_id', $filterUserId)
                    ->whereBetween('date', [$start, $end])
                    ->where('societe_id', $societeId)
                    ->orderBy('date')
                    ->get();

                $userStats = [
                    'user_id' => $filterUserId,
                    'user' => User::find($filterUserId),
                    'total_pointages' => $userPointages->count(),
                    'present' => $userPointages->where('statutJour', 'present')->count(),
                    'absent' => $userPointages->where('statutJour', 'absent')->count(),
                    'en_retard' => $userPointages->where('statutJour', 'retard')->count(),
                    'pointages' => $userPointages,
                ];
            }

            return response()->json([
                'role' => $user->getRoleNames()->first(),
                'periode' => $periode,
                'date' => $start->toDateString(),
                'dateDebut' => $periode === 'semaine' ? $dateDebut->toDateString() : null,
                'dateFin' => $periode === 'semaine' ? $dateFin->toDateString() : null,
                'mois' => $periode === 'mois' ? $mois->format('Y-m') : null,
                'societe_id' => $societeId,
                'total_employes' => $totalUsers,
                'present' => $present,
                'absent' => $absent,
                'en_retard' => $enRetard,
                'pourcentage_present' => $presentPercentage,
                'pourcentage_absent' => $absentPercentage,
                'pourcentage_en_retard' => $enRetardPercentage,
                'user_stats' => $userStats
            ]);
        } catch (\Exception $e) {
            \Log::error('Erreur statistiquesPresence:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['message' => 'Erreur statistiques'], 500);
        }
    }
}
