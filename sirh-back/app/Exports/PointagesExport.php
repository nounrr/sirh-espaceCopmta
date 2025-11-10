<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Illuminate\Support\Facades\Log;

class PointagesExport implements WithMultipleSheets
{
    protected $startDate;
    protected $endDate;
    protected $specificDate;
    protected $month;
    protected $year;
    protected $exportAll;

    public function __construct($startDate = null, $endDate = null, $specificDate = null, $month = null, $year = null, $exportAll = false)
    {
        $this->startDate = $startDate;
        $this->endDate = $endDate;
        $this->specificDate = $specificDate;
        $this->exportAll = $exportAll;

        // Debugging : Vérifie les paramètres reçus
        \Log::info('Constructeur - Paramètres :', [
            'startDate' => $startDate,
            'endDate' => $endDate,
            'specificDate' => $specificDate,
            'month' => $month,
            'year' => $year,
            'exportAll' => $exportAll,
        ]);

        // Si le mois est au format `YYYY-MM`, on le sépare
        if ($month && strpos($month, '-') !== false) {
            $dateParts = explode('-', $month);
            $this->year = $dateParts[0];
            $this->month = $dateParts[1];
        } else {
            $this->month = $month;
            $this->year = $year;
        }
    }

    /**
     * @return array
     */
    public function sheets(): array
    {
        $sheets = [];

        // Créer la feuille principale des pointages détaillés
        $sheets[] = new PointagesDetailSheet(
            $this->startDate,
            $this->endDate,
            $this->specificDate,
            $this->month,
            $this->year,
            $this->exportAll
        );

        // Créer la feuille de résumé par utilisateur
        $sheets[] = new PointagesUserSummarySheet(
            $this->startDate,
            $this->endDate,
            $this->specificDate,
            $this->month,
            $this->year,
            $this->exportAll
        );

        return $sheets;
    }
}