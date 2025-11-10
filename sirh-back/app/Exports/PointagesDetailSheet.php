<?php

namespace App\Exports;

use App\Models\Pointage;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use Carbon\Carbon;

class PointagesDetailSheet implements FromCollection, WithHeadings, WithTitle
{
    protected $startDate;
    protected $endDate;
    protected $specificDate;
    protected $month;
    protected $year;
    protected $exportAll;

    const STANDARD_WORK_MINUTES = 8 * 60; // 8 heures

    public function __construct($startDate = null, $endDate = null, $specificDate = null, $month = null, $year = null, $exportAll = false)
    {
        $this->startDate = $startDate;
        $this->endDate = $endDate;
        $this->specificDate = $specificDate;
        $this->exportAll = $exportAll;
        $this->month = $month;
        $this->year = $year;

        if ($month && strpos($month, '-') !== false) {
            $dateParts = explode('-', $month);
            $this->year = $dateParts[0];
            $this->month = $dateParts[1];
        }
    }

    public function title(): string
    {
        return 'Pointages Détaillés';
    }

    public function collection()
    {
        try {
            $user = auth()->user();

            if (!$user->hasRole('RH')) {
                return collect([]);
            }

            $societeId = $user->societe_id;

            $query = Pointage::with(['user.departement', 'user.societe'])
                ->where('societe_id', $societeId);

            if (!$this->exportAll) {
                $startDate = $this->startDate ? Carbon::parse($this->startDate)->startOfDay() : null;
                $endDate = $this->endDate ? Carbon::parse($this->endDate)->endOfDay() : null;
                $specificDate = $this->specificDate ? Carbon::parse($this->specificDate)->toDateString() : null;

                if ($specificDate) {
                    $query->whereDate('date', $specificDate);
                } elseif ($startDate && $endDate) {
                    $query->whereBetween('date', [$startDate, $endDate]);
                } elseif (!empty($this->month)) {
                    try {
                        $date = Carbon::createFromFormat('Y-m', $this->year . '-' . $this->month);
                        $year = $date->year;
                        $month = $date->month;
                        $query->whereYear('date', $year)
                            ->whereMonth('date', $month);
                    } catch (\Exception $e) {
                        \Log::error('Erreur lors de l\'extraction du mois et de l\'année : ' . $e->getMessage());
                    }
                }
            }

            return $query->get()->map(function ($item) {
                $nom = $item->user->name ?? 'N/A';
                $prenom = $item->user->prenom ?? 'N/A';
                $nomComplet = trim("$prenom $nom");
                $situationFm = $item->user->situationFamiliale ?? 'N/A';
                $nbEnfants = $item->user->nbEnfants ?? 'N/A';
                $societe = $item->user->societe->nom ?? 'N/A';
                $departement = $item->user->departement->nom ?? 'N/A';

                // Calcul des heures supp. dynamique et correct
                $heuresSupp = $this->calculateOvertime($item);

                return [
                    'Nom Complet Employé' => $nomComplet,
                    'situation Familiale' => $situationFm,
                    "Nombre d'enfants" => $nbEnfants,
                    'Société' => $societe,
                    'Département' => $departement,
                    'Date' => Carbon::parse($item->date)->format('Y-m-d'),
                    'Heure Entrée' => $item->heureEntree ?? 'N/A',
                    'Heure Sortie' => $item->heureSortie ?? 'N/A',
                    'Statut Jour' => $item->statutJour ?? 'N/A',
                    'Heures Supplémentaires' => $heuresSupp,
                ];
            });

        } catch (\Exception $e) {
            \Log::error('Erreur dans la méthode collection : ' . $e->getMessage());
            return collect([]);
        }
    }

    /**
     * Calcule correctement les heures supplémentaires même si sortie après minuit.
     */
    private function calculateOvertime($pointage)
    {
        try {
            if (
                !$pointage->heureEntree ||
                !$pointage->heureSortie ||
                !in_array(strtolower($pointage->statutJour), ['present', 'présent', 'retard'])
            ) {
                return 0;
            }

            // Date de référence (date du pointage)
            $dateEntree = $pointage->date ? Carbon::parse($pointage->date) : Carbon::today();

            // Entrée sur la bonne date
            $heureEntree = Carbon::createFromFormat('Y-m-d H:i:s', $dateEntree->format('Y-m-d') . ' ' . $pointage->heureEntree);

            // Par défaut, la sortie le même jour
            $dateSortie = $dateEntree;
            if ($pointage->heureSortie < $pointage->heureEntree) {
                // Sortie le lendemain
                $dateSortie = $dateSortie->copy()->addDay();
            }
            $heureSortie = Carbon::createFromFormat('Y-m-d H:i:s', $dateSortie->format('Y-m-d') . ' ' . $pointage->heureSortie);

            $diffMinutes = $heureSortie->diffInMinutes($heureEntree);
            $heuresSupp = 0;
            if ($diffMinutes > self::STANDARD_WORK_MINUTES) {
                $heuresSupp = round(($diffMinutes - self::STANDARD_WORK_MINUTES) / 60, 2);
            }
            return $heuresSupp;
        } catch (\Exception $e) {
            \Log::error('Erreur lors du calcul des heures supp. : ' . $e->getMessage());
            return 0;
        }
    }

    public function headings(): array
    {
        return [
            'Nom Complet Employé',
            'situation Familiale',
            "Nombre d'enfants",
            'Société',
            'Département',
            'Date',
            'Heure Entrée',
            'Heure Sortie',
            'Statut Jour',
            'Heures Supplémentaires'
        ];
    }
}
