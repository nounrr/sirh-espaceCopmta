<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use Illuminate\Support\Facades\DB;
use DateTime;

class CongeExportController extends Controller
{
    public function exportCongés(Request $request)
    {
        // Récupération de l'année (par défaut année actuelle)
        $year = $request->input('year', date('Y'));
        
        $spreadsheet = new Spreadsheet();
        
        // Récupération des utilisateurs
        $userAuth = auth()->user();
        $users = DB::table('users')
            ->leftJoin('departements', 'users.departement_id', '=', 'departements.id')
            ->where('users.societe_id', $userAuth->societe_id)
            ->select('users.*', 'departements.nom as departement_nom')
            ->orderBy('departements.nom')
            ->orderBy('users.name')
            ->get();

        // Créer la feuille principale
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle("Congés $year");
        
        $this->setupCongeHeaders($sheet, $year);
        
        $row = 4;
        foreach ($users as $user) {
            $this->processUserConge($sheet, $user, $year, $row);
            $row++;
        }
        
        $this->autoSizeColumns($sheet);
        $this->addSummarySheet($spreadsheet, $users, $year);
        
        // Export du fichier
        return $this->exportExcel($spreadsheet, $year);
    }

    private function setupCongeHeaders($sheet, $year)
    {
        // Titre principal
        $sheet->setCellValue('A1', "GESTION DES CONGÉS - ANNÉE $year");
        $sheet->mergeCells('A1:M1');
        $sheet->getStyle('A1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 16],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'D9EAD3']]
        ]);

        // En-têtes des colonnes
        $headers = [
            'A3' => 'Matricule',
            'B3' => 'Nom Complet', 
            'C3' => 'Département',
            'D3' => 'Fonction',
            'E3' => 'Type Contrat',
            'F3' => 'Date Embauche',
            'G3' => 'Rôle',
            'H3' => 'Mois Travaillés',
            'I3' => 'Congés Acquis',
            'J3' => 'Congés Consommés',
            'K3' => 'Solde Congés',
            'L3' => 'Congés Restants',
            'M3' => 'Statut'
        ];

        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
        }

        // Style des en-têtes
        $sheet->getStyle('A3:M3')->applyFromArray([
            'font' => ['bold' => true],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E8F4FD']],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
        ]);

        // Filtres
        $sheet->setAutoFilter('A3:M3');
    }

    private function processUserConge($sheet, $user, $year, $row)
    {
        // Calcul des congés selon le rôle
        $hireDate = $user->dateEmbauche ? new DateTime($user->dateEmbauche) : null;
        $yearStart = new DateTime("$year-01-01");
        $yearEnd = new DateTime("$year-12-31");
        $now = new DateTime();
        
        // Déterminer la date de fin pour le calcul (soit fin d'année soit date actuelle)
        $endDate = $now < $yearEnd ? $now : $yearEnd;
        
        if ($user->role === 'Chef_Dep') {
            // Pour Chef_Dep : différence entre date embauche et date actuelle / 2.1666666666666666666666666666667
            $monthsWorked = $hireDate ? $this->calculateTotalMonthsWorked($hireDate, $endDate) : 0;
            $congesAcquis = round($monthsWorked / 2.1666666666666666666666666666667, 2);
        } else {
            // Pour Employe et Chef_Chant : calcul normal
            $monthsWorked = $hireDate ? $this->calculateMonthsWorked($hireDate, $yearStart, $endDate) : 0;
            $congesAcquis = round($monthsWorked * (18 / 12), 2);
        }

        // Calcul des congés consommés pour l'année
        $congesConsommes = DB::table('absence_requests')
            ->where('user_id', $user->id)
            ->where('type', 'Congé')
            ->where('statut', 'approuvé')
            ->whereYear('dateDebut', $year)
            ->sum(DB::raw('DATEDIFF(dateFin, dateDebut) + 1'));

        $soldeConge = round($congesAcquis - $congesConsommes, 2);
        
        // Congés restants (ne peut pas être négatif)
        $congesRestants = max(0, $soldeConge);
        
        // Déterminer le statut
        $statut = $this->determineStatutConge($soldeConge, $congesAcquis);

        // Ligne de données
        $ligne = [
            $user->id ?? '',
            trim(($user->name ?? '') . ' ' . ($user->prenom ?? '')),
            $user->departement_nom ?? 'Non assigné',
            $user->fonction ?? '',
            $user->typeContrat ?? '',
            $user->dateEmbauche ?? '',
            $user->role ?? 'Employe',
            $monthsWorked,
            $congesAcquis,
            $congesConsommes,
            $soldeConge,
            $congesRestants,
            $statut
        ];

        $sheet->fromArray($ligne, null, 'A' . $row);
        
        // Appliquer les styles selon le statut
        $this->applyCongeRowStyle($sheet, $row, $statut, $soldeConge);
    }

    private function calculateMonthsWorked($hireDate, $yearStart, $endDate)
    {
        $start = $hireDate > $yearStart ? $hireDate : $yearStart;
        $interval = $start->diff($endDate);
        return ($interval->y * 12) + $interval->m + ($interval->d > 0 ? 1 : 0);
    }

    private function calculateTotalMonthsWorked($hireDate, $endDate)
    {
        $interval = $hireDate->diff($endDate);
        return ($interval->y * 12) + $interval->m + ($interval->d > 0 ? 1 : 0);
    }

    private function determineStatutConge($soldeConge, $congesAcquis)
    {
        if ($soldeConge < 0) {
            return 'DÉPASSEMENT';
        } elseif ($soldeConge == 0) {
            return 'ÉPUISÉ';
        } elseif ($soldeConge < ($congesAcquis * 0.2)) {
            return 'FAIBLE';
        } elseif ($soldeConge >= ($congesAcquis * 0.8)) {
            return 'ÉLEVÉ';
        } else {
            return 'NORMAL';
        }
    }

    private function applyCongeRowStyle($sheet, $row, $statut, $soldeConge)
    {
        // Couleurs selon le statut
        $colors = [
            'DÉPASSEMENT' => 'FFB3B3', // Rouge clair
            'ÉPUISÉ' => 'FFD700',      // Jaune/Or
            'FAIBLE' => 'FFE6CC',      // Orange clair
            'NORMAL' => 'E8F4FD',      // Bleu clair
            'ÉLEVÉ' => 'D4FFD4'        // Vert clair
        ];

        $color = $colors[$statut] ?? 'FFFFFF';
        
        // Appliquer la couleur à toute la ligne
        $sheet->getStyle("A$row:M$row")->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()->setRGB($color);

        // Bordures
        $sheet->getStyle("A$row:M$row")->applyFromArray([
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
        ]);

        // Style spécial pour les dépassements
        if ($soldeConge < 0) {
            $sheet->getStyle("K$row")->getFont()->getColor()->setRGB('FF0000'); // Rouge
            $sheet->getStyle("K$row")->getFont()->setBold(true);
        }
    }

    private function addSummarySheet($spreadsheet, $users, $year)
    {
        $summarySheet = $spreadsheet->createSheet();
        $summarySheet->setTitle('Résumé');

        // Titre
        $summarySheet->setCellValue('A1', "RÉSUMÉ DES CONGÉS - ANNÉE $year");
        $summarySheet->mergeCells('A1:D1');
        $summarySheet->getStyle('A1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 14],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'D9EAD3']]
        ]);

        // Statistiques globales
        $totalEmployes = $users->count();
        $totalCongesAcquis = 0;
        $totalCongesConsommes = 0;
        $employesDepassement = 0;
        $employesEpuise = 0;
        $employesFaible = 0;

        foreach ($users as $user) {
            $hireDate = $user->dateEmbauche ? new DateTime($user->dateEmbauche) : null;
            $yearStart = new DateTime("$year-01-01");
            $yearEnd = new DateTime("$year-12-31");
            $now = new DateTime();
            $endDate = $now < $yearEnd ? $now : $yearEnd;
            
            if ($user->role === 'Chef_Dep') {
                $monthsWorked = $hireDate ? $this->calculateTotalMonthsWorked($hireDate, $endDate) : 0;
                $congesAcquis = round($monthsWorked / 2.1666666666666666666666666666667, 2);
            } else {
                $monthsWorked = $hireDate ? $this->calculateMonthsWorked($hireDate, $yearStart, $endDate) : 0;
                $congesAcquis = round($monthsWorked * (18 / 12), 2);
            }

            $congesConsommes = DB::table('absence_requests')
                ->where('user_id', $user->id)
                ->where('type', 'Congé')
                ->where('statut', 'approuvé')
                ->whereYear('dateDebut', $year)
                ->sum(DB::raw('DATEDIFF(dateFin, dateDebut) + 1'));

            $totalCongesAcquis += $congesAcquis;
            $totalCongesConsommes += $congesConsommes;

            $soldeConge = $congesAcquis - $congesConsommes;
            
            if ($soldeConge < 0) $employesDepassement++;
            elseif ($soldeConge == 0) $employesEpuise++;
            elseif ($soldeConge < ($congesAcquis * 0.2)) $employesFaible++;
        }

        // Affichage des statistiques
        $stats = [
            ['Statistique', 'Valeur'],
            ['Total Employés', $totalEmployes],
            ['Total Congés Acquis', round($totalCongesAcquis, 2)],
            ['Total Congés Consommés', round($totalCongesConsommes, 2)],
            ['Solde Global', round($totalCongesAcquis - $totalCongesConsommes, 2)],
            ['', ''],
            ['Répartition par Statut', ''],
            ['Employés en Dépassement', $employesDepassement],
            ['Employés Épuisés', $employesEpuise],
            ['Employés avec Solde Faible', $employesFaible],
            ['Taux de Consommation', round(($totalCongesConsommes / max($totalCongesAcquis, 1)) * 100, 2) . '%']
        ];

        $summarySheet->fromArray($stats, null, 'A3');

        // Style du résumé
        $summarySheet->getStyle('A3:B3')->applyFromArray([
            'font' => ['bold' => true],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E8F4FD']]
        ]);

        $summarySheet->getStyle('A7')->applyFromArray([
            'font' => ['bold' => true],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FFE6CC']]
        ]);

        // Auto-size colonnes
        foreach (['A', 'B'] as $col) {
            $summarySheet->getColumnDimension($col)->setAutoSize(true);
        }
    }

    private function autoSizeColumns($sheet)
    {
        foreach (range('A', 'M') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
    }

    private function exportExcel($spreadsheet, $year)
    {
        $filename = "Conges_$year.xlsx";
        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ]);
    }
}
