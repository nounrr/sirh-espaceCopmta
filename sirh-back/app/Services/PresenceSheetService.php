<?php

namespace App\Services;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * PresenceSheetService: factorise la création des feuilles Permanents/Temporaires
 * en réutilisant EXACTEMENT la même logique que celle portée par les méthodes
 * du contrôleur (setupHeaders, processUser, addTotalsRow, autoSizeColumns, addHolidayInfo).
 *
 * Le service orchestre seulement; il délègue toute la logique au "$builder" passé
 * en paramètre (généralement l'instance du contrôleur qui possède déjà ces méthodes).
 * Ainsi, aucune logique n'est dupliquée ni modifiée.
 */
class PresenceSheetService
{
    /**
     * Crée la feuille des employés permanents
     *
     * @param object      $builder     Instance possédant setupHeaders, processUser, addTotalsRow, autoSizeColumns, addHolidayInfo
     * @param Spreadsheet $spreadsheet
     * @param array       $dateRange
     * @param iterable    $permanentUsers
     * @return Worksheet
     */
    public function createPermanentSheet(Spreadsheet $spreadsheet, array $dateRange, iterable $permanentUsers, array $callbacks): Worksheet
    {
        // Réutiliser la feuille par défaut si elle est encore vide, sinon en créer une nouvelle
        if ($spreadsheet->getSheetCount() === 1) {
            $candidate = $spreadsheet->getActiveSheet();
            $isEmpty = ($candidate->getHighestRow() === 1
                && $candidate->getHighestColumn() === 'A'
                && $candidate->getCell('A1')->getValue() === null);
            if ($isEmpty) {
                $sheet = $candidate;
                $sheet->setTitle('Employés Permanents');
            } else {
                $sheet = new Worksheet($spreadsheet, 'Employés Permanents');
                $spreadsheet->addSheet($sheet);
            }
        } else {
            $sheet = new Worksheet($spreadsheet, 'Employés Permanents');
            $spreadsheet->addSheet($sheet);
        }
        $spreadsheet->setActiveSheetIndex($spreadsheet->getIndex($sheet));

        // En-têtes
        $callbacks['setupHeaders']($sheet, $dateRange, true);

        // Lignes
        $row = 5;
        foreach ($permanentUsers as $user) {
            $ok = $callbacks['processUser']($sheet, $user, $dateRange, $row, true);
            if ($ok === false) {
                continue;
            }
            $row++;
        }
        $lastDataRow = $row - 1;

        // Totaux
        $totalsRow = $callbacks['addTotalsRow']($sheet, $dateRange, $lastDataRow, true);

        // Auto-size + Infos jours fériés
        $callbacks['autoSizeColumns']($sheet);
        $callbacks['addHolidayInfo']($sheet, $dateRange, $totalsRow ?? $row);

        return $sheet;
    }

    /**
     * Crée la feuille des employés temporaires
     *
     * @param object      $builder     Instance possédant setupHeaders, processUser, addTotalsRow, autoSizeColumns, addHolidayInfo
     * @param Spreadsheet $spreadsheet
     * @param array       $dateRange
     * @param iterable    $temporaryUsers
     * @return Worksheet
     */
    public function createTemporarySheet(Spreadsheet $spreadsheet, array $dateRange, iterable $temporaryUsers, array $callbacks): Worksheet
    {
    $sheet = new Worksheet($spreadsheet, 'Employés Temporaires');
    $spreadsheet->addSheet($sheet);
    $spreadsheet->setActiveSheetIndex($spreadsheet->getIndex($sheet));

        // En-têtes
        $callbacks['setupHeaders']($sheet, $dateRange, false);

        // Lignes
        $row = 5;
        foreach ($temporaryUsers as $user) {
            $ok = $callbacks['processUser']($sheet, $user, $dateRange, $row, false);
            if ($ok === false) {
                continue;
            }
            $row++;
        }
        $lastDataRow = $row - 1;

        // Totaux
        $totalsRow = $callbacks['addTotalsRow']($sheet, $dateRange, $lastDataRow, false);

        // Auto-size + Infos jours fériés
        $callbacks['autoSizeColumns']($sheet);
        $callbacks['addHolidayInfo']($sheet, $dateRange, $totalsRow ?? $row);

        return $sheet;
    }
}
