<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\JourFerie;
use DateTime;

class TimeCalculationService
{
    // same rounding policy as controllers
    private static function customRound($number)
    {
        if ($number == 0) return 0;
        $isNegative = $number < 0;
        $number = abs($number);
        $intPart = intval($number);
        $decimalPart = $number - $intPart;
        $result = ($decimalPart >= 0.5) ? $intPart + 1 : $intPart;
        return $isNegative ? -$result : $result;
    }

    // compute raw hours for a pointage row (expects heureEntree/heureSortie strings)
    public static function calculateDailyHoursFromTimes($startTs, $endTs)
    {
        if ($endTs < $startTs) $endTs += 86400;
        $seconds = $endTs - $startTs;
        if ($seconds <= 0) return 0.0;
        if ($seconds > 86400) {
            Log::warning('Durée de travail > 24h détectée (service)', ['start' => $startTs, 'end' => $endTs, 'seconds' => $seconds]);
            return 0.0;
        }
        $hours = $seconds / 3600.0;
        return max(0.0, $hours);
    }

    // compute total adjusted hours for temporaries: per-pointage, split day/night and -1h per portion >7h
    public static function computeDailyTotalHoursForTemporary($pointages)
    {
        if (!$pointages || count($pointages) === 0) return 0.0;
        $total = 0.0;
        foreach ($pointages as $p) {
            if (empty($p->heureEntree) || empty($p->heureSortie)) continue;
            $start = strtotime($p->heureEntree);
            $end   = strtotime($p->heureSortie);
            if ($start === false || $end === false) continue;
            if ($end < $start) $end += 86400;
            $seconds = $end - $start;
            if ($seconds <= 0) continue;
            $hours = $seconds / 3600.0;

            $s = $start / 3600.0;
            $e = $end   / 3600.0;
            $night1 = max(0.0, min($e, 8.0)  - max($s, 0.0));
            $night2 = max(0.0, min($e, 32.0) - max($s, 24.0));
            $nightHours = $night1 + $night2;

            $dayHours = max(0.0, $hours - $nightHours);

            if ($dayHours > 7.0) $dayHours -= 1.0;
            if ($nightHours > 7.0) $nightHours -= 1.0;

            $total += max(0.0, $dayHours) + max(0.0, $nightHours);
        }
        return max(0.0, $total);
    }

    // compute raw total (sum of calculateDailyHoursFromTimes) before pause adjustment
    public static function computeDailyRawHours($pointages)
    {
        if (!$pointages || count($pointages) === 0) return 0.0;
        $totalRaw = 0.0;
        foreach ($pointages as $p) {
            if (empty($p->heureEntree) || empty($p->heureSortie)) continue;
            $start = strtotime($p->heureEntree);
            $end   = strtotime($p->heureSortie);
            if ($start === false || $end === false) continue;
            $totalRaw += self::calculateDailyHoursFromTimes($start, $end);
        }
        return max(0.0, $totalRaw);
    }

    // check if any pointage overlaps night hours (0-9 or 24-33 windows as used historically)
    public static function checkNightOverlap($pointages)
    {
        if (!$pointages || count($pointages) === 0) return false;
        foreach ($pointages as $p) {
            if (empty($p->heureEntree) || empty($p->heureSortie)) continue;
            $start = strtotime($p->heureEntree);
            $end   = strtotime($p->heureSortie);
            if ($start === false || $end === false) continue;
            if ($end < $start) $end += 86400;
            $s = $start / 3600.0;
            $e = $end   / 3600.0;
            $ov1 = max(0.0, min($e, 9.0)  - max($s, 0.0));
            $ov2 = max(0.0, min($e, 33.0) - max($s, 24.0));
            if (($ov1 + $ov2) > 0) return true;
        }
        return false;
    }

    // Compute detailed temporary stats for a user over a date range: heures_normales, hs_25, hs_50, total_heures, jours_travailles
    public static function computeDetailedTemporaryStats($user, $dateRange)
    {
        $heuresNormales = 0.0;
        $hs25 = 0.0;
        $hs50 = 0.0;
        $totalHeures = 0.0;
        $joursTravailles = 0;

        $joursFeries = JourFerie::whereBetween('date', [
            $dateRange['startDate']->format('Y-m-d'),
            $dateRange['endDate']->format('Y-m-d')
        ])->where('actif', true)->pluck('date')->map(fn($d)=>date('Y-m-d',strtotime($d)))->toArray();

        $currentDate = clone $dateRange['startDate'];
        while ($currentDate <= $dateRange['endDate']) {
            $dateStr = $currentDate->format('Y-m-d');
            $dayOfWeek = (int)$currentDate->format('w');
            $isHoliday = in_array($dateStr, $joursFeries, true);
            $isSunday = ($dayOfWeek === 0);

            $conge = DB::table('absence_requests')
                ->where('user_id', $user->id)
                ->whereIn('type', ['Congé', 'maladie'])
                ->where('statut', 'approuvé')
                ->whereDate('dateDebut', '<=', $dateStr)
                ->whereDate('dateFin', '>=', $dateStr)
                ->first();

            if ($conge) { $currentDate->modify('+1 day'); continue; }

            $pointages = DB::table('pointages')
                ->where('user_id', $user->id)
                ->whereDate('date', $dateStr)
                ->get();

            $dailyHours = self::computeDailyTotalHoursForTemporary($pointages);
            if ($dailyHours > 0) {
                $joursTravailles++;
                $totalHeures += $dailyHours;
                if ($isSunday || $isHoliday) {
                    $hs50 += $dailyHours;
                } else {
                    // adjusted hours already exclude pause according to temp rule
                    if ($dailyHours <= 8) {
                        $heuresNormales += $dailyHours;
                    } else {
                        $heuresNormales += 8;
                        $hs25 += ($dailyHours - 8);
                    }
                }
            }
            $currentDate->modify('+1 day');
        }

        return [
            'heures_normales' => $heuresNormales,
            'hs_25' => $hs25,
            'hs_50' => $hs50,
            'total_heures' => $totalHeures,
            'jours_travailles' => $joursTravailles
        ];
    }

    // ---------- Additional shared helpers for presence exports ----------

    public static function parseTime(string $timeString)
    {
        $timeString = trim($timeString);
        if (preg_match('/^(\d{1,2}):(\d{2}):(\d{2})$/', $timeString, $m)) {
            return mktime((int)$m[1], (int)$m[2], (int)$m[3]);
        }
        if (preg_match('/^(\d{1,2}):(\d{2})$/', $timeString, $m)) {
            return mktime((int)$m[1], (int)$m[2], 0);
        }
        $ts = strtotime($timeString);
        return $ts !== false ? mktime((int)date('H',$ts),(int)date('i',$ts),(int)date('s',$ts)) : false;
    }

    public static function calculateDailyHoursFromPointage($pointage): float
    {
        if (empty($pointage->heureEntree) || empty($pointage->heureSortie)) return 0.0;
        $start = self::parseTime($pointage->heureEntree);
        $end   = self::parseTime($pointage->heureSortie);
        if ($start === false || $end === false) return 0.0;
        if (!empty($pointage->is_night_shift) && $pointage->is_night_shift && $end < $start) {
            $end += 86400;
        } elseif ($end < $start) {
            $end += 86400;
        }
        $seconds = $end - $start;
        if ($seconds <= 0 || $seconds > 86400) return 0.0;
        return max(0.0, $seconds / 3600.0);
    }

    public static function computeDailyTotalHoursForPermanent($pointages): float
    {
        if (!$pointages || count($pointages) === 0) return 0.0;
        $totalRaw = 0.0;
        $overlapsNight = false;
        foreach ($pointages as $p) {
            $totalRaw += self::calculateDailyHoursFromPointage($p);
            if (empty($p->heureEntree) || empty($p->heureSortie)) continue;
            $start = self::parseTime($p->heureEntree);
            $end   = self::parseTime($p->heureSortie);
            if ($start === false || $end === false) continue;
            if ($end < $start) $end += 86400;
            $s = $start / 3600.0; $e = $end / 3600.0;
            $ov1 = max(0.0, min($e, 9.0)  - max($s, 0.0));
            $ov2 = max(0.0, min($e, 33.0) - max($s, 24.0));
            if (($ov1 + $ov2) > 0) $overlapsNight = true;
        }
        if (!$overlapsNight && $totalRaw > 8.0) $totalRaw -= 1.0;
        return max(0.0, $totalRaw);
    }

    public static function calculateNightBaseHours($pointages): float
    {
        $total = 0.0;
        foreach ($pointages as $p) {
            if (empty($p->heureEntree) || empty($p->heureSortie)) continue;
            $start = self::parseTime($p->heureEntree);
            $end   = self::parseTime($p->heureSortie);
            if ($start === false || $end === false) continue;
            if ($end < $start) $end += 86400;
            $s = $start / 3600.0; $e = $end / 3600.0;
            $ov1 = max(0.0, min($e, 8.0)  - max($s, 0.0));
            $ov2 = max(0.0, min($e, 32.0) - max($s, 24.0));
            $total += ($ov1 + $ov2);
        }
        return $total;
    }

    public static function isEndOfDayPointage($pointage): bool
    {
        if (empty($pointage->heureSortie)) return false;
        $t = self::parseTime($pointage->heureSortie);
        if ($t === false) return false;
        $h = (int)date('H', $t); $i = (int)date('i', $t);
        return ($h >= 23) || ($h === 23 && $i >= 50);
    }

    public static function isStartOfDayPointage($pointage): bool
    {
        if (empty($pointage->heureEntree)) return false;
        $t = self::parseTime($pointage->heureEntree);
        if ($t === false) return false;
        $h = (int)date('H', $t);
        return $h < 10;
    }

    public static function findNextDayPointage($pointages, int $currentIndex, int $userId)
    {
        $current = $pointages[$currentIndex];
        $currentDate = new \DateTime($current->date);
        $nextDay = $currentDate->modify('+1 day')->format('Y-m-d');
        for ($j = $currentIndex + 1; $j < count($pointages); $j++) {
            $candidate = $pointages[$j];
            if ($candidate->user_id == $userId && $candidate->date == $nextDay) {
                if (self::isStartOfDayPointage($candidate)) {
                    return ['pointage' => $candidate, 'index' => $j];
                }
            }
            if ($candidate->date > $nextDay) break;
        }
        return null;
    }

    public static function mergeNightShiftPointages($firstPointage, $secondPointage)
    {
        $merged = clone $firstPointage;
        $merged->date = $firstPointage->date;
        $merged->heureEntree = $firstPointage->heureEntree;
        $merged->heureSortie = $secondPointage->heureSortie;
        $merged->is_night_shift = true;
        $merged->original_end_date = $secondPointage->date;
        return $merged;
    }

    public static function groupNightShiftPointages($pointages, int $userId, array $dateRange)
    {
        if (!$pointages || count($pointages) === 0) return [];
        $sorted = collect($pointages)->sortBy(['date','heureEntree'])->values()->all();
        $grouped = [];
        $i = 0;
        while ($i < count($sorted)) {
            $current = $sorted[$i];
            if (self::isEndOfDayPointage($current)) {
                $next = self::findNextDayPointage($sorted, $i, $userId);
                if ($next) {
                    $merged = self::mergeNightShiftPointages($current, $next['pointage']);
                    $grouped[] = $merged;
                    $i = $next['index'] + 1;
                    Log::info('Pointages de nuit fusionnés (service)', [
                        'user_id'=>$userId,
                        'date_debut'=>$current->date,
                        'heure_entree'=>$current->heureEntree,
                        'date_fin'=>$next['pointage']->date,
                        'heure_sortie'=>$next['pointage']->heureSortie,
                    ]);
                } else {
                    $grouped[] = $current;
                    $i++;
                }
            } else {
                $grouped[] = $current;
                $i++;
            }
        }
        return $grouped;
    }

    // ---------- Merged from PresenceDataService ----------

    /**
     * Retourne la liste des jours fériés actifs de la période au format Y-m-d
     */
    public static function getHolidays(array $dateRange): array
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
    public static function hasPointagesInPeriod(int $userId, array $dateRange): bool
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
        } else {
            // Log when there are NO pointages to help diagnose missing data/access
            try {
                $totalForUser = DB::table('pointages')->where('user_id', $userId)->count();
                $lastDate = DB::table('pointages')->where('user_id', $userId)->max('date');
            } catch (\Throwable $e) {
                $totalForUser = null;
                $lastDate = null;
                Log::warning('DB error while checking user pointages', ['user_id'=>$userId, 'error'=>$e->getMessage()]);
            }
            Log::info('ℹ️ Aucun pointage pour la période', [
                'user_id' => $userId,
                'period' => $startDate . ' to ' . $endDate,
                'total_for_user_all_time' => $totalForUser,
                'last_pointage_date' => $lastDate,
            ]);
        }

        return $exists;
    }

    /**
     * Récupère tous les pointages d'un utilisateur et applique le groupement des nuits
     */
    public static function getUserPointagesGrouped(int $userId, array $dateRange): array
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

        return self::groupNightShiftPointages($pointages, $userId, $dateRange);
    }
}
