<?php

namespace App\Exports;

use App\Models\Pointage;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class PointagesUserSummarySheet implements FromCollection, WithHeadings, WithTitle
{
    protected $startDate;
    protected $endDate;
    protected $specificDate;
    protected $month;
    protected $year;
    protected $exportAll;

    /**
     * Constants for time calculation
     */
    const MINUTES_IN_HOUR = 60;
    const STANDARD_WORK_HOURS = 8; // 8 heures par jour standard

    public function __construct($startDate = null, $endDate = null, $specificDate = null, $month = null, $year = null, $exportAll = false)
    {
        $this->startDate = $startDate;
        $this->endDate = $endDate;
        $this->specificDate = $specificDate;
        $this->exportAll = $exportAll;
        $this->month = $month;
        $this->year = $year;

        // Si le mois est au format `YYYY-MM`, on le sépare
        if ($month && strpos($month, '-') !== false) {
            $dateParts = explode('-', $month);
            $this->year = $dateParts[0];
            $this->month = $dateParts[1];
        }
    }

    /**
     * Titre de la feuille Excel
     */
    public function title(): string
    {
        return 'Résumé par Utilisateur';
    }

    /**
     * Génère la collection de résumé d'utilisateurs
     */
    public function collection()
    {
        try {
            $user = auth()->user();
    
            if (!$user->hasRole('RH')) {
                return collect([]);
            }
    
            $societeId = $user->societe_id;
    
            // Construction de la requête de base pour les pointages
            $query = Pointage::with(['user.departement', 'user.societe'])
                ->where('societe_id', $societeId);
    
            // Appliquer les filtres de date si nécessaire
            if (!$this->exportAll) {
                $this->applyDateFilters($query);
            }
    
            // Récupérer tous les pointages
            $pointages = $query->get();
            
            // Regrouper les pointages par utilisateur
            $pointagesParUtilisateur = $pointages->groupBy('user_id');
            
            $resultats = new Collection();
            
            foreach ($pointagesParUtilisateur as $userId => $userPointages) {
                if (empty($userPointages) || $userPointages->isEmpty()) {
                    continue;
                }
                
                $userData = $this->calculateUserStats($userPointages);
                $resultats->push($userData);
            }
            
            return $resultats;
    
        } catch (\Exception $e) {
            \Log::error('Erreur dans la génération du résumé par utilisateur : ' . $e->getMessage());
            return collect([]);
        }
    }

    /**
     * Applique les filtres de date à la requête
     */
    private function applyDateFilters($query)
    {
        try {
            // Vérifie et convertit les dates en objets Carbon
            $startDate = $this->startDate ? Carbon::parse($this->startDate)->startOfDay() : null;
            $endDate = $this->endDate ? Carbon::parse($this->endDate)->endOfDay() : null;
            $specificDate = $this->specificDate ? Carbon::parse($this->specificDate)->toDateString() : null;
    
            // Filtre par date spécifique
            if ($specificDate) {
                $query->whereDate('date', $specificDate);
            } 
            // Filtre par plage de dates
            elseif ($startDate && $endDate) {
                $query->whereBetween('date', [$startDate, $endDate]);
            } 
            // Filtre par mois et année (format YYYY-MM)
            elseif (!empty($this->month)) {
                try {
                    // Vérification et extraction du mois et de l'année
                    $date = Carbon::createFromFormat('Y-m', $this->year . '-' . $this->month);
                    $year = $date->year;
                    $month = $date->month;
    
                    $query->whereYear('date', $year)
                          ->whereMonth('date', $month);
                } catch (\Exception $e) {
                    \Log::error('Erreur lors de l\'extraction du mois et de l\'année : ' . $e->getMessage());
                }
            }
        } catch (\Exception $e) {
            \Log::error('Erreur lors de l\'application des filtres de date : ' . $e->getMessage());
        }
    }

    /**
     * Calcule les statistiques pour un utilisateur
     */
    private function calculateUserStats($userPointages)
{
    // Récupérer les informations de l'utilisateur depuis le premier pointage
    $firstPointage = $userPointages->first();
    $user = $firstPointage->user;
    $situationFm = $user->situationFamiliale ?? 'N/A';
    $nbEnfants = $user->nbEnfants ?? 'N/A';
    $nomComplet = trim(($user->prenom ?? '') . ' ' . ($user->name ?? 'N/A'));
    $societe = $user->societe->nom ?? 'N/A';
    $departement = $user->departement->nom ?? 'N/A';

    // Initialiser les compteurs
    $totalJoursTravailles = 0;
    $totalHeuresSupplementaires = null;
    $totalHeuresNormales = null;
    $totalHeuresTravaillees = null;
    $totalJoursPresenceSansRetard = 0;
    $totalJoursEnRetard = 0;
    $totalJoursAbsent = 0;

    foreach ($userPointages as $pointage) {
        $statutJour = strtolower($pointage->statutJour ?? '');

        if ($statutJour === 'présent' || $statutJour === 'present' || $statutJour === 'retard') {
            $totalJoursTravailles++;

            // Calcul des heures normales (peut retourner '')
            $heuresNormales = $this->calculateWorkHours($pointage);
            // Heures supplémentaires (on garde la valeur uniquement si positive)
            $heuresSupplementaires = (isset($pointage->overtimeHours) && is_numeric($pointage->overtimeHours) && floatval($pointage->overtimeHours) >= 0)
                ? floatval($pointage->overtimeHours) : '';

            // Sums
            if ($heuresNormales !== '') {
                $totalHeuresNormales = ($totalHeuresNormales ?? 0) + $heuresNormales;
                if ($heuresSupplementaires !== '') {
                    $totalHeuresSupplementaires = ($totalHeuresSupplementaires ?? 0) + $heuresSupplementaires;
                    $totalHeuresTravaillees = ($totalHeuresTravaillees ?? 0) + ($heuresNormales + $heuresSupplementaires);
                } else {
                    $totalHeuresTravaillees = ($totalHeuresTravaillees ?? 0) + $heuresNormales;
                }
            } elseif ($heuresSupplementaires !== '') {
                $totalHeuresSupplementaires = ($totalHeuresSupplementaires ?? 0) + $heuresSupplementaires;
                $totalHeuresTravaillees = ($totalHeuresTravaillees ?? 0) + $heuresSupplementaires;
            }

            // Compter les présences sans retard et les retards
            if ($statutJour === 'présent' || $statutJour === 'present') {
                $totalJoursPresenceSansRetard++;
            } else if ($statutJour === 'retard') {
                $totalJoursEnRetard++;
            }
        } else if ($statutJour === 'absent') {
            $totalJoursAbsent++;
        }
    }

    return [
        'Nom Complet' => $nomComplet,
        'situation Familiale' => $situationFm,
        "Nombre d'enfants" => $nbEnfants,
        'Société' => $societe,
        'Département' => $departement,
        'Total Jours Travaillés' => $totalJoursTravailles,
        'Total Heures Normales' => is_null($totalHeuresNormales) ? '' : round($totalHeuresNormales, 2),
        'Total Heures Supplémentaires' => is_null($totalHeuresSupplementaires) ? '' : round($totalHeuresSupplementaires, 2),
        'Total Heures Travaillées' => is_null($totalHeuresTravaillees) ? '' : round($totalHeuresTravaillees, 2),
        'Total Jours Présence Sans Retard' => $totalJoursPresenceSansRetard,
        'Total Jours En Retard' => $totalJoursEnRetard,
        'Total Présence + Retard' => ($totalJoursPresenceSansRetard + $totalJoursEnRetard),
        'Total Jours Absent' => $totalJoursAbsent
    ];
}


    /**
     * Calcule les heures de travail normales (sans heures supplémentaires)
     */
    private function calculateWorkHours($pointage)
{
    try {
        // Si les heures d'entrée ou de sortie sont manquantes, on laisse vide
        if (!$pointage->heureEntree || !$pointage->heureSortie) {
            return '';
        }

        // Prend en charge "H:i:s" ou "H:i"
        $formatEntree = strlen($pointage->heureEntree) > 5 ? 'H:i:s' : 'H:i';
        $formatSortie = strlen($pointage->heureSortie) > 5 ? 'H:i:s' : 'H:i';

        $date = $pointage->date ?? date('Y-m-d');
        $dateEntree = Carbon::createFromFormat('Y-m-d ' . $formatEntree, $date . ' ' . $pointage->heureEntree);
        $dateSortie = Carbon::createFromFormat('Y-m-d ' . $formatSortie, $date . ' ' . $pointage->heureSortie);

        // Si la sortie est censée être après minuit, ou si erreur d'ordre : toujours durée absolue
        $diffMinutes = abs($dateSortie->diffInMinutes($dateEntree, false));

        // Si la durée est 0, ou pas crédible, on laisse vide
        if ($diffMinutes <= 0) return '';

        $heuresTravaillees = $diffMinutes / self::MINUTES_IN_HOUR;
        return round($heuresTravaillees, 2);

    } catch (\Exception $e) {
        \Log::error('Erreur lors du calcul des heures de travail : ' . $e->getMessage());
        return '';
    }
}


    /**
     * Déclare les en-têtes du fichier Excel
     */
    public function headings(): array
    {
        return [
            'Nom Complet',
            'situation Familiale',
            "Nombre d'enfants",
            'Société',
            'Département',
            'Total Jours Travaillés',
            'Total Heures Normales',
            'Total Heures Supplémentaires',
            'Total Heures Travaillées',
            'Total Jours Présence Sans Retard',
            'Total Jours En Retard',
            'Total Présence + Retard',
            'Total Jours Absent'
        ];
    }
}