<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\JourFerie;

class PresenceDataService
{
    /**
     * Retourne la liste des jours fériés actifs de la période au format Y-m-d
     */
    public function getHolidays(array $dateRange): array
    {
        return JourFerie::whereBetween('date', [
                $dateRange['startDate']->format('Y-m-d'),
                $dateRange['endDate']->format('Y-m-d')
            ])
            ->where('actif', true)
            ->pluck('date')
            ->map(fn($d) => date('Y-m-d', strtotime($d)))
            ->toArray();
    }

    /**
     * Vérifie si un utilisateur a des pointages dans la période donnée
     */
    public function hasPointagesInPeriod(int $userId, array $dateRange): bool
    {
        $startDate = $dateRange['startDate']->format('Y-m-d');
        $endDate   = $dateRange['endDate']->format('Y-m-d');

        $exists = DB::table('pointages')
            ->where('user_id', $userId)
            ->whereDate('date', '>=', $startDate)
            ->whereDate('date', '<=', $endDate)
            ->exists();

        if ($exists) {
            $user = DB::table('users')->find($userId);
            $samplePointages = DB::table('pointages')
                ->where('user_id', $userId)
                ->whereDate('date', '>=', $startDate)
                ->whereDate('date', '<=', $endDate)
                ->select('date', 'heureEntree', 'heureSortie', 'statutJour')
                ->orderBy('date')
                ->limit(3)
                ->get();

            Log::info('🔍 UTILISATEUR (actif/inactif) AVEC POINTAGES', [
                'user_id' => $userId,
                'user_name' => ($user->name ?? 'N/A') . ' ' . ($user->prenom ?? ''),
                'period' => $startDate . ' to ' . $endDate,
                'sample_pointages' => $samplePointages->toArray()
            ]);
        }

        return $exists;
    }

    /**
     * Récupère tous les pointages d'un utilisateur et applique le groupement des nuits
     */
    public function getUserPointagesGrouped(int $userId, array $dateRange): array
    {
        $pointages = DB::table('pointages')
            ->where('user_id', $userId)
            ->whereBetween('date', [
                $dateRange['startDate']->format('Y-m-d'),
                $dateRange['endDate']->format('Y-m-d')
            ])
            ->orderBy('date')
            ->orderBy('heureEntree')
            ->get()
            ->all();

        return TimeCalculationService::groupNightShiftPointages($pointages, $userId, $dateRange);
    }
}
