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
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Models\JourFerie;
use DateTime;
use App\Services\TimeCalculationService;
use App\Services\PresenceUserService;
// PresenceDataService merged into TimeCalculationService
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use App\Services\PresenceSheetService;
class MonthlyPresenceExportController extends Controller
{
    // Cache des statistiques des temporaires (heures totales, heures supp, jours travaillés)
    private array $temporaryStats = [];
    // Liste des IDs des temporaires réellement affichés dans la feuille "Employés Temporaires"
    private array $temporaryListed = [];
    // IDs d'utilisateurs à exclure de tous les exports visibles
    private array $excludedUserIds = [80, 265, 270, 271];
    // Rôles toujours affichés même sans pointages (ex: staff RH/gestion)
    private array $alwaysIncludeRoles = ['rh','gest_rh']; // gest_projet retiré (à exclure)
    // Plus d'infos personnelles dans les feuilles => seules colonnes d'identité demandées
    private function presenceStartCol(bool $isPermanent = true): int
    {
        // Permanents: A: Noms et prénoms, B: Fonction, C: Département => présence colonne 4
        // Temporaires: A: Nom, B: Prénom, C: Fonction, D: Département => présence colonne 5
        return $isPermanent ? 4 : 5;
    }
    private function formatRange($sheet, string $range, int $decimals = 0): void
{
    $fmt = $decimals > 0
        ? '#,##0.' . str_repeat('0', $decimals)
        : '#,##0';
    $sheet->getStyle($range)->getNumberFormat()->setFormatCode($fmt);
}
private function col(int $i): string {
    return \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($i);
}
    // Remplacer le mot 'total' par 'T-' (respecte la casse via regex insensible)
    private function replaceTotalWord(string $text): string
    {
        return preg_replace('/\btotal\b/i', 'T-', $text);
    }
    // Fonction d'arrondi personnalisée : si décimale >= 0.5 arrondir vers le haut, sinon supprimer la décimale
    private function customRound($number)
    {
        if ($number == 0) return 0;
        $intPart = intval($number);
        $decimalPart = $number - $intPart;
        if ($decimalPart >= 0.5) {
            return $intPart + 1;
        } else {
            return $intPart;
        }
    }
    public function export(Request $request)
    {
        // Étendre limites pour gros exports
        @set_time_limit(300);
        @ini_set('memory_limit', '512M');
        $exportType = $this->determineExportType($request);
        $dateRange  = $this->calculateDateRange($request, $exportType);
        if (!$dateRange) {
            return response()->json(['error' => 'Paramètres de date requis'], 400);
        }
        // Diagnostic log: vérifier accès DB et présence des pointages de la période pour la société
        $diag_tableExists = null;
        $diag_totalAll = 0; $diag_totalPeriodAll = 0; $diag_totalPeriodSociete = 0;
        $diag_maxDateAll = null; $diag_maxDateSociete = null;
        try {
            $dbName = \DB::connection()->getDatabaseName();
            $userAuth = \Auth::user();
            $societeId = $userAuth->societe_id ?? null;
            $start = $dateRange['startDate']->format('Y-m-d');
            $end   = $dateRange['endDate']->format('Y-m-d');
            $tableExists = true;
            try {
                // Test simple d'existence en listant 1 ligne
                \DB::table('pointages')->limit(1)->first();
            } catch (\Throwable $e) {
                $tableExists = false;
            }
            $totalAll = 0; $totalPeriodAll = 0; $totalPeriodSociete = 0; $sample = [];
            $maxDateAll = null; $maxDateSociete = null; $sampleRecentSociete = [];
            if ($tableExists) {
                $totalAll = (int) \DB::table('pointages')->count();
                $maxDateAll = \DB::table('pointages')->max('date');
                $totalPeriodAll = (int) \DB::table('pointages')
                    ->whereBetween('date', [$start, $end])
                    ->count();
                if ($societeId) {
                    $totalPeriodSociete = (int) \DB::table('pointages')
                        ->join('users','users.id','=','pointages.user_id')
                        ->where('users.societe_id', $societeId)
                        ->whereBetween('pointages.date', [$start, $end])
                        ->count();
                    $maxDateSociete = \DB::table('pointages')
                        ->join('users','users.id','=','pointages.user_id')
                        ->where('users.societe_id', $societeId)
                        ->max('pointages.date');
                    $sample = \DB::table('pointages')
                        ->join('users','users.id','=','pointages.user_id')
                        ->leftJoin('departements','departements.id','=','pointages.departement_id')
                        ->where('users.societe_id', $societeId)
                        ->whereBetween('pointages.date', [$start, $end])
                        ->select('pointages.date','pointages.user_id','pointages.statutJour','pointages.heureEntree','pointages.heureSortie',\DB::raw('COALESCE(departements.nom, "") as dept'))
                        ->orderBy('pointages.date')
                        ->limit(5)
                        ->get()
                        ->toArray();
                    // échantillon récent (5 dernières lignes de la société toutes périodes)
                    $sampleRecentSociete = \DB::table('pointages')
                        ->join('users','users.id','=','pointages.user_id')
                        ->leftJoin('departements','departements.id','=','pointages.departement_id')
                        ->where('users.societe_id', $societeId)
                        ->select('pointages.date','pointages.user_id','pointages.statutJour','pointages.heureEntree','pointages.heureSortie',\DB::raw('COALESCE(departements.nom, "") as dept'))
                        ->orderBy('pointages.date','desc')
                        ->limit(5)
                        ->get()
                        ->toArray();
                }
            }
            // Exposer les diagnostics hors du bloc try
            $diag_tableExists = $tableExists;
            $diag_totalAll = $totalAll; $diag_totalPeriodAll = $totalPeriodAll; $diag_totalPeriodSociete = $totalPeriodSociete;
            $diag_maxDateAll = $maxDateAll; $diag_maxDateSociete = $maxDateSociete;
            \Log::info('📊 DIAGNOSTIC POINTAGES', [
                'db' => $dbName,
                'table_pointages_exists' => $tableExists,
                'period' => $start.' to '.$end,
                'total_pointages_all' => $totalAll,
                'total_pointages_period_all' => $totalPeriodAll,
                'total_pointages_period_societe' => $totalPeriodSociete,
                'max_date_all' => $maxDateAll,
                'max_date_societe' => $maxDateSociete,
                'sample_period_societe' => $sample,
                'sample_recent_societe' => $sampleRecentSociete,
            ]);
        } catch (\Throwable $e) {
            \Log::warning('Diagnostic pointages failed', ['error' => $e->getMessage()]);
        }
        // Fallback automatique: si aucune donnée pour la période, basculer sur le dernier mois contenant des données
        if ($diag_tableExists === true && $diag_totalPeriodAll === 0) {
            $fallbackDateStr = $diag_maxDateSociete ?: $diag_maxDateAll; // privilégier la société
            if (!empty($fallbackDateStr)) {
                try {
                    $fallbackDate = new DateTime($fallbackDateStr);
                    // Aller au premier jour du mois de la dernière donnée
                    $startDate = new DateTime($fallbackDate->format('Y-m-01'));
                    $endDate   = (clone $startDate)->modify('last day of this month');
                    $currentMonth = date('Y-m');
                    $month = $startDate->format('Y-m');
                    // Construire un nouveau dateRange
                    $dateRange = [
                        'type' => 'month',
                        'startDate' => $startDate,
                        'endDate'   => $endDate,
                        'totalDays' => (int)$startDate->format('t'),
                        'label'     => $startDate->format('Y-m'),
                        'is_current_month' => ($month === $currentMonth)
                    ];
                    \Log::warning('Aucune donnée sur la période demandée: bascule automatique sur le dernier mois avec données', [
                        'fallback_month' => $dateRange['label'],
                        'max_date_all' => $diag_maxDateAll,
                        'max_date_societe' => $diag_maxDateSociete,
                    ]);
                } catch (\Throwable $e) {
                    \Log::warning('Échec du fallback automatique de période', ['error' => $e->getMessage(), 'fallback_date' => $fallbackDateStr]);
                }
            }
        }
        $spreadsheet = new Spreadsheet();
        // Utilisateurs préparés via helper réutilisable
        $userAuth = Auth::user();
        
        // Récupérer les filtres optionnels
        $departementId = $request->input('departement_id') ? (int)$request->input('departement_id') : null;
        $userId = $request->input('user_id') ? (int)$request->input('user_id') : null;
        
        // Déléguer la construction des collections au service réutilisable
        $presenceCollections = (new PresenceUserService())->getPresenceUserCollections(
            $userAuth->societe_id, 
            $this->excludedUserIds,
            $departementId,
            $userId
        );
        $users = $presenceCollections['all'];
        $permanentUsers = $presenceCollections['permanent'];
        $temporaryUsers = $presenceCollections['temporary'];
        $inactiveUsers = $presenceCollections['inactive'];
        /* ===================== FEUILLES PRESENCE (via service réutilisable) ===================== */
        $presenceService = new PresenceSheetService();
        $callbacks = $this->getPresenceCallbacks();
        // Permanents
        $presenceService->createPermanentSheet($spreadsheet, $dateRange, $permanentUsers, $callbacks);
        // Temporaires
        $presenceService->createTemporarySheet($spreadsheet, $dateRange, $temporaryUsers, $callbacks);
        /* ===================== FEUILLE SORTANTS ===================== */
        $this->createSortantsSheet($spreadsheet, $userAuth->societe_id);
    /* ===================== FEUILLES LISTE PERSONNEL & NON AFFECTÉS ===================== */
    // Liste des employés sans affectation de département
    $this->createNonAffectesSheet($spreadsheet, $userAuth->societe_id);
    // Liste du personnel affecté (exclut explicitement les "Non Affectés")
    $this->createListePersonnelSheet($spreadsheet, $userAuth->societe_id);
        // Déterminer les rôles utilisateur (corrige l'erreur Undefined variable $userRole)
        $userRoleRaw = (string)($userAuth->role ?? '');
        $userRole = strtolower(trim($userRoleRaw));
        $spatieRoles = [];
        if ($userAuth && method_exists($userAuth, 'getRoleNames')) {
            try { $spatieRoles = $userAuth->getRoleNames()->map(fn($r)=>strtolower(trim((string)$r)))->toArray(); } catch (\Throwable $e) {}
        }
        $showRecap = ($userRole === 'rh') || in_array('rh', $spatieRoles, true);
        // Ne pas créer le récap si un département OU un utilisateur est sélectionné
        if ($showRecap && !$userId && !$departementId) {
            $this->createRecapSheet($spreadsheet, $userAuth->societe_id, $dateRange, $departementId, $userId);
        } else if (!$showRecap) {
            Log::info('Feuille Récap non générée (non RH)', ['user_id' => $userAuth->id ?? null, 'role' => $userRole]);
        }
        
        // Si un utilisateur spécifique est sélectionné, masquer les feuilles non pertinentes selon son type
        if ($userId) {
            $user = \DB::table('users')->where('id', $userId)->first();
            if ($user) {
                $typeContrat = strtolower(trim($user->typeContrat ?? ''));
                $isPermanent = in_array($typeContrat, ['permanent', 'permanente', 'cdi', 'indéterminée', 'indeterminee']) ||
                               strpos($typeContrat, 'permanent') !== false ||
                               strpos($typeContrat, 'cdi') !== false;
                
                // Masquer les feuilles selon le type d'employé
                if ($isPermanent) {
                    // Employé permanent: masquer la feuille temporaire
                    $tempSheet = $spreadsheet->getSheetByName('Employés Temporaires');
                    if ($tempSheet) $tempSheet->setSheetState(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet::SHEETSTATE_HIDDEN);
                } else {
                    // Employé temporaire: masquer la feuille permanente
                    $permSheet = $spreadsheet->getSheetByName('Employés Permanents');
                    if ($permSheet) $permSheet->setSheetState(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet::SHEETSTATE_HIDDEN);
                }
            }
        }
        
        // Réordonner les feuilles selon la demande: Sortants, Non Affectés, Liste Personnel,
        // Employés Permanents, Employés Temporaires, Récap
        $this->reorderSheets($spreadsheet, [
            'Sortants',
            'Non Affectés',
            'Liste Personnel',
            'Employés Permanents',
            'Employés Temporaires',
            'Récap',
        ]);
        return $this->exportExcel($spreadsheet, $dateRange);
    }
    /**
     * Prépare les collections d'utilisateurs (tous, permanents, temporaires, inactifs)
     * afin de réutiliser exactement la même base de calcul ailleurs (ex: export salaires).
     */
    public function getPresenceUserCollections(int $societeId): array
    {
        // Conserver la signature publique pour compatibilité, mais déléguer au service
        return (new PresenceUserService())->getPresenceUserCollections($societeId, $this->excludedUserIds);
    }
    /**
     * Retourne les callbacks utilisés par PresenceSheetService pour construire les feuilles.
     * Cela permet d'assurer que d'autres exports consomment exactement la même logique.
     */
    public function getPresenceCallbacks(): array
    {
        return [
            'setupHeaders'   => function($sheet, $dr, $isP) { return $this->setupHeaders($sheet, $dr, $isP); },
            'processUser'    => function($sheet, $user, $dr, &$row, $isP) { return $this->processUser($sheet, $user, $dr, $row, $isP); },
            'addTotalsRow'   => function($sheet, $dr, $last, $isP) { return $this->addTotalsRow($sheet, $dr, $last, $isP); },
            'autoSizeColumns'=> function($sheet) { return $this->autoSizeColumns($sheet); },
            'addHolidayInfo' => function($sheet, $dr, $start) { return $this->addHolidayInfo($sheet, $dr, $start); },
        ];
    }
    /* ----------------------- Totals footer row ----------------------- */
    private function addTotalsRow($sheet, $dateRange, $lastDataRow, $isPermanent = true)
    {
        // if no data rows (header starts at row 5)
        if ($lastDataRow < 5) return null;
    $presenceStartCol = $this->presenceStartCol($isPermanent);
        $presenceEndCol   = $presenceStartCol + $dateRange['totalDays'] - 1;
        $totalsRow        = $lastDataRow + 1;
        // Label
    $labelEndIndex = $this->presenceStartCol($isPermanent) - 1; // last identity column
    $labelEndLetter = Coordinate::stringFromColumnIndex($labelEndIndex);
    $sheet->setCellValue("A{$totalsRow}", 'Total');
    $sheet->mergeCells("A{$totalsRow}:{$labelEndLetter}{$totalsRow}");
    // For permanents, total columns: Absences, Jour Recup, Congés, Total Jours Travaillés, Heures Supp., Heures Normales
    // Fin de zone numérique (présence + totaux)
    // Permanents: +6 colonnes de totaux; Temporaires: +3 (HN, HS25, HS50)
    $endCol    = $isPermanent ? ($presenceEndCol + 6) : ($presenceEndCol + 3);
        $endLetter = Coordinate::stringFromColumnIndex($endCol);
        if (!$isPermanent) {
            // TEMPORAIRES: somme chaque colonne jour
            for ($c = $presenceStartCol; $c <= $presenceEndCol; $c++) {
                $L = Coordinate::stringFromColumnIndex($c);
                $sheet->setCellValue("{$L}{$totalsRow}", "=SUM({$L}5:{$L}{$lastDataRow})");
            }
            // Heures Normales, HS25, HS50
            $colHN   = $presenceEndCol + 1;
            $colHS25 = $presenceEndCol + 2;
            $colHS50 = $presenceEndCol + 3;
            foreach ([$colHN,$colHS25,$colHS50] as $c) {
                $L = Coordinate::stringFromColumnIndex($c);
                $sheet->setCellValue("{$L}{$totalsRow}", "=SUM({$L}5:{$L}{$lastDataRow})");
            }
        } else {
            // PERMANENTS: sum only the "Totaux" section on the right (6 colonnes)
            $cols = [
                $presenceEndCol + 1, // Absences
                $presenceEndCol + 2, // Jour Recup
                $presenceEndCol + 3, // Congés
                $presenceEndCol + 4, // Total Jours Travaillés
                $presenceEndCol + 5, // Heures Supp.
                $presenceEndCol + 6, // Heures Normales
            ];
            foreach ($cols as $c) {
                $L = Coordinate::stringFromColumnIndex($c);
                $sheet->setCellValue("{$L}{$totalsRow}", "=SUM({$L}5:{$L}{$lastDataRow})");
            }
            // Extra info columns (9) not summed
        }
        // Style
        $sheet->getStyle("A{$totalsRow}:{$endLetter}{$totalsRow}")->applyFromArray([
            'font'      => ['bold' => true],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E2EFDA']],
            'borders'   => [
                'top'    => ['borderStyle' => Border::BORDER_THIN],
                'bottom' => ['borderStyle' => Border::BORDER_THIN],
            ],
        ]);
        // Format numérique sans décimales pour la ligne de totaux (affichage uniquement)
        // Présence + colonnes totaux (en évitant les colonnes identité A..labelEndLetter)
        $firstNumericColIndex = $this->presenceStartCol($isPermanent); // début présence
        $lastNumericColIndex  = $endCol; // dernière colonne numérique
        $firstNumericLetter   = Coordinate::stringFromColumnIndex($firstNumericColIndex);
        $lastNumericLetter    = Coordinate::stringFromColumnIndex($lastNumericColIndex);
        $this->formatRange($sheet, $firstNumericLetter.$totalsRow.':'.$lastNumericLetter.$totalsRow, 0);
        return $totalsRow;
    }
    /* ----------------------- Helpers: dates & type ----------------------- */
    private function determineExportType(Request $request)
    {
        if ($request->has('month')) return 'month';
        if ($request->has('specificDate')) return 'day';
        if ($request->has('startDate') && $request->has('endDate')) return 'period';
        if ($request->has('exportAll')) return 'all';
        return null;
    }
    private function calculateDateRange(Request $request, $exportType)
    {
        switch ($exportType) {
            case 'month':
                $month = $request->input('month');
                if (!$month) return null;
                $startDate = new DateTime("$month-01");
                $endDate   = (clone $startDate)->modify('last day of this month');
                $currentMonth = date('Y-m');
                $currentDay   = new DateTime();
                if ($month === $currentMonth) {
                    $endDate   = $currentDay;
                    $totalDays = $startDate->diff($endDate)->days + 1;
                } else {
                    $totalDays = $startDate->format('t');
                }
                return [
                    'type' => 'month',
                    'startDate' => $startDate,
                    'endDate' => $endDate,
                    'totalDays' => $totalDays,
                    'label' => $startDate->format('Y-m'),
                    'is_current_month' => ($month === $currentMonth)
                ];
            case 'day':
                $specificDate = $request->input('specificDate');
                if (!$specificDate) return null;
                $date = new DateTime($specificDate);
                return [
                    'type' => 'day',
                    'startDate' => $date,
                    'endDate'   => $date,
                    'totalDays' => 1,
                    'label' => $date->format('Y-m-d'),
                    'is_current_month' => false
                ];
            case 'period':
                $startDate = $request->input('startDate');
                $endDate   = $request->input('endDate');
                if (!$startDate || !$endDate) return null;
                $start      = new DateTime($startDate);
                $end        = new DateTime($endDate);
                $currentDay = new DateTime();
                if ($end >= $currentDay && $start <= $currentDay) $end = $currentDay;
                $totalDays = $start->diff($end)->days + 1;
                return [
                    'type' => 'period',
                    'startDate' => $start,
                    'endDate'   => $end,
                    'totalDays' => $totalDays,
                    'label' => $start->format('Y-m-d') . '_to_' . $end->format('Y-m-d'),
                    'is_current_month' => false
                ];
            case 'all':
                $start = new DateTime('2020-01-01');
                $end   = new DateTime();
                return [
                    'type' => 'all',
                    'startDate' => $start,
                    'endDate'   => $end,
                    'totalDays' => $start->diff($end)->days + 1,
                    'label'     => 'tous_pointages',
                    'is_current_month' => false
                ];
            default:
                return null;
        }
    }
    /* ----------------------- Headers & formatting ----------------------- */
    private function setupHeaders($sheet, $dateRange, $isPermanent = true)
    {
        $spreadsheet = $sheet->getParent();
        $spreadsheet->getDefaultStyle()->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
    if ($isPermanent) {
            // Permanents: A: Noms et prénoms, B: Fonction, C: Département
            foreach (['A','B','C'] as $col) {
                $sheet->mergeCells("{$col}3:{$col}4");
            }
            $sheet->setCellValue('A3', 'Noms et prénoms');
            $sheet->setCellValue('B3', 'Fonction');
            $sheet->setCellValue('C3', 'Département');
        } else {
            // Temporaires: A: Nom, B: Prénom, C: Fonction, D: Département
            foreach (['A','B','C','D'] as $col) {
                $sheet->mergeCells("{$col}3:{$col}4");
            }
            $sheet->setCellValue('A3', 'Nom');
            $sheet->setCellValue('B3', 'Prénom');
            $sheet->setCellValue('C3', 'Fonction');
            $sheet->setCellValue('D3', 'Département');
        }
        $presenceStartCol   = $this->presenceStartCol($isPermanent);
        $presenceEndCol     = $presenceStartCol + $dateRange['totalDays'] - 1;
        $presenceStartLetter= Coordinate::stringFromColumnIndex($presenceStartCol);
        $presenceEndLetter  = Coordinate::stringFromColumnIndex($presenceEndCol);
        $sheet->mergeCells("{$presenceStartLetter}3:{$presenceEndLetter}3")
              ->setCellValue("{$presenceStartLetter}3", 'Présence');
        $totalStartCol = $presenceEndCol + 1;
    if ($isPermanent) {
        // Permanents Totaux: 6 colonnes (Absences, Jour Recup, Congés, Total Jours Travaillés, Heures Supp., Heures Normales)
        $totalEndCol   = $totalStartCol + 5; // 6 columns total
            $totalStartLetter = Coordinate::stringFromColumnIndex($totalStartCol);
            $totalEndLetter   = Coordinate::stringFromColumnIndex($totalEndCol);
        $sheet->mergeCells("{$totalStartLetter}3:{$totalEndLetter}3")
            ->setCellValue("{$totalStartLetter}3", 'Totaux');
            $dateHeaders = $this->generateDateHeaders($dateRange);
        $subHeaders  = array_merge($dateHeaders, ['Absences', 'Jour Recup', 'Congés', 'Total Jours Travaillés', 'Heures Supp.', 'Heures Normales']);
        // Remplacements 'Total' -> 'T-'
        $subHeaders = array_map(fn($h) => $this->replaceTotalWord($h), $subHeaders);
        } else {
    $totalEndCol   = $totalStartCol + 2; // Heures Normales, HS25, HS50 (3 cols)
            $totalStartLetter = Coordinate::stringFromColumnIndex($totalStartCol);
            $totalEndLetter   = Coordinate::stringFromColumnIndex($totalEndCol);
        $sheet->mergeCells("{$totalStartLetter}3:{$totalEndLetter}3")
            ->setCellValue("{$totalStartLetter}3", $this->replaceTotalWord('Total des heures'));
            $dateHeaders = $this->generateDateHeaders($dateRange);
      // For temporaries we now want columns: Heures Normales, HS25, HS50
      $subHeaders  = array_merge($dateHeaders, ['Heures Normales', 'HS25', 'HS50']);
      $subHeaders = array_map(fn($h) => $this->replaceTotalWord($h), $subHeaders);
        }
        $sheet->fromArray($subHeaders, null, $presenceStartLetter . '4');
        $headerStyle = [
            'font' => ['bold' => true],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical'   => Alignment::VERTICAL_CENTER
            ],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'D9EAD3']],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
        ];
    $sheet->getStyle("A3:{$totalEndLetter}4")->applyFromArray($headerStyle);
    // Ajouter AutoFilter pour les en-têtes (ligne 4 contient les sous-en-têtes)
    $sheet->setAutoFilter("A4:{$totalEndLetter}4");
        $this->colorHolidayHeaders($sheet, $dateRange, $isPermanent);
    }
    private function colorHolidayHeaders($sheet, $dateRange, $isPermanent = true)
    {
                $joursFeries = JourFerie::whereBetween('date', [
            $dateRange['startDate']->format('Y-m-d'),
            $dateRange['endDate']->format('Y-m-d')
        ])->where('actif', true)->pluck('date')
          ->map(fn($d)=>date('Y-m-d',strtotime($d)))->toArray();
        if (!empty($joursFeries)) {
            $currentDate = clone $dateRange['startDate'];
            $dayIndex    = 0;
            // Dynamic start (A=1,B=2 then info headers)
            $presenceStartCol = $this->presenceStartCol($isPermanent);
            while ($currentDate <= $dateRange['endDate']) {
                $currentDateStr = $currentDate->format('Y-m-d');
                if (in_array($currentDateStr, $joursFeries)) {
                    $colLetter = Coordinate::stringFromColumnIndex($presenceStartCol + $dayIndex);
                    $sheet->getStyle($colLetter . '3:' . $colLetter . '4')->getFill()
                          ->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('FFCCCC');
                }
                $currentDate->modify('+1 day');
                $dayIndex++;
            }
        }
    }
    private function generateDateHeaders($dateRange)
    {
        $headers = [];
        $currentDate = clone $dateRange['startDate'];
        while ($currentDate <= $dateRange['endDate']) {
            $headers[] = ($dateRange['type'] === 'month') ? $currentDate->format('j') : $currentDate->format('d/m');
            $currentDate->modify('+1 day');
        }
        return $headers;
    }
    /* ----------------------- Lignes utilisateurs ----------------------- */
    private function processUser($sheet, $user, $dateRange, &$row, $isPermanent = true)
    {
        // Vérifier si l'utilisateur inactif a des pointages dans la période
        $statutGlobal = strtolower(trim((string)($user->statut ?? '')));
        $roleLower = strtolower(trim((string)($user->role ?? '')));
        // Exclure explicitement gest_projet (demande utilisateur)
        if ($roleLower === 'gest_projet') {
            return false;
        }
        $forceInclude = in_array($roleLower, $this->alwaysIncludeRoles, true);
        if ($statutGlobal === 'inactif') {
            Log::info("Traitement utilisateur inactif", [
                'user_id' => $user->id,
                'user_name' => $user->name ?? 'N/A',
                'statut' => $user->statut ?? 'N/A'
            ]);
            // Si inactif, vérifier s'il y a des pointages dans la période
            if (!$this->hasPointagesInPeriod($user->id, $dateRange) && !$forceInclude) {
                Log::info("Utilisateur inactif exclu (pas de pointages)", [
                    'user_id' => $user->id,
                    'user_name' => $user->name ?? 'N/A'
                ]);
                return false; // Inactif sans pointages -> ne pas afficher
            }
            // Inactif avec pointages -> continuer l'affichage
            Log::info("Utilisateur inactif inclus (a des pointages)", [
                'user_id' => $user->id,
                'user_name' => $user->name ?? 'N/A'
            ]);
        }
        // Exclure certains rôles des permanents
        // Plus d'exclusion de rôles : afficher tous les rôles dans les permanents
        if ($isPermanent) {
            // Permanents: Noms et prénoms, Fonction, Département
            $ligne = [
                strtoupper(trim(($user->name ?? '') . ' ' . ($user->prenom ?? ''))),
                strtoupper($user->fonction ?? ''),
                strtoupper($user->departement_nom ?? '')
            ];
        } else {
            // Temporaires: Nom, Prénom, Fonction, Département
            $ligne = [
                strtoupper(trim($user->name ?? '')),
                strtoupper(trim($user->prenom ?? '')),
                strtoupper($user->fonction ?? ''),
                strtoupper($user->departement_nom ?? '')
            ];
        }
        $joursFeries = JourFerie::whereBetween('date', [
            $dateRange['startDate']->format('Y-m-d'),
            $dateRange['endDate']->format('Y-m-d')
        ])->where('actif', true)->pluck('date')->map(fn($d)=>date('Y-m-d',strtotime($d)))->toArray();
        $presence = [];
        if ($isPermanent) {
            $absent = 0;
            $recup = 0;
            $totalHeures = 0.0;
            $joursTravailles = 0;
            $heuresSupp = 0.0;
            $congeCount = 0;
            // Récupérer tous les pointages de l'utilisateur pour la période
            $allUserPointages = DB::table('pointages')
                ->where('user_id', $user->id)
                ->whereBetween('date', [
                    $dateRange['startDate']->format('Y-m-d'),
                    $dateRange['endDate']->format('Y-m-d')
                ])
                ->get()
                ->all();
            // Appliquer le groupement des pointages de nuit (service réutilisable)
            $groupedPointages = TimeCalculationService::groupNightShiftPointages($allUserPointages, $user->id, $dateRange);
            // Organiser les pointages groupés par date pour traitement jour par jour
            $pointagesByDate = [];
            foreach ($groupedPointages as $pointage) {
                $date = $pointage->date;
                if (!isset($pointagesByDate[$date])) {
                    $pointagesByDate[$date] = [];
                }
                $pointagesByDate[$date][] = $pointage;
            }
            $currentDate = clone $dateRange['startDate'];
            while ($currentDate <= $dateRange['endDate']) {
                $dateStr   = $currentDate->format('Y-m-d');
                $dayOfWeek = $currentDate->format('w'); // 0 dimanche
                $isHoliday = in_array($dateStr, $joursFeries);
                // Utiliser les pointages groupés pour cette date
                $pointages = $pointagesByDate[$dateStr] ?? [];
                $conge = DB::table('absence_requests')
                    ->where('user_id', $user->id)
                    ->whereIn('type', ['Congé', 'maladie'])
                    ->where('statut', 'approuvé')
                    ->whereDate('dateDebut', '<=', $dateStr)
                    ->whereDate('dateFin', '>=', $dateStr)
                    ->first();
                $hasPresent = false;
                foreach ($pointages as $pt) {
                    $stRaw = (string)($pt->statutJour ?? '');
                    if (preg_match('/pr[eé]sent|retard/i', $stRaw)) { $hasPresent = true; }
                }
                $totalDailyHours = TimeCalculationService::computeDailyTotalHoursForPermanent($pointages);
                $nightBaseHours  = TimeCalculationService::calculateNightBaseHours($pointages);
                if ($conge) {
                    // Compter le congé
                    $congeCount++;
                    $presence[] = ($conge->type === 'maladie') ? 'M' : 'C';
                } elseif ($isHoliday) {
                    if ($hasPresent) {
                        // Jour férié travaillé: compter comme récupération + heures faites
                        $presence[] = $totalDailyHours;
                        $recup += 1;
                        $totalHeures += $totalDailyHours;
                        // Permanents: HS si > 8h (au lieu de > 9h)
                        if ($totalDailyHours > 8) $heuresSupp += ($totalDailyHours - 8);
                        $joursTravailles += 1; // on le considère travaillé
                    } else {
                        $presence[] = '';
                    }
                } elseif (count($pointages) === 0 || !$hasPresent) {
                    if ($dayOfWeek >= 1 && $dayOfWeek <= 5) {
                        $presence[] = 'A'; // marquer absence
                        $absent++;
                    } elseif ($dayOfWeek == 6) {
                        if ($user->role === 'Employe' || $user->role === 'Chef_Chant') {
                            $presence[] = 'A';
                            $absent++;
                        } else {
                            $presence[] = '';
                        }
                    } else {
                        $presence[] = '';
                    }
                } else {
                    // Présence travaillée: si heures calculées > 0, mettre les heures, sinon marquer 'P'
                    $presence[] = ($totalDailyHours > 0) ? $totalDailyHours : 'P';
                    if ($totalDailyHours > 0) {
                        if ($dayOfWeek != 0) $joursTravailles += 1;
                        // Permanents: HS si > 8h (au lieu de > 9h) et base nuit < 8h
                        if ($totalDailyHours > 8 && $nightBaseHours < 8) {
                            $heuresSupp += ($totalDailyHours - 8);
                        }
                        if ($dayOfWeek == 0) $recup += 1;
                        $totalHeures += $totalDailyHours;
                    }
                }
                $currentDate->modify('+1 day');
            }
            // Heures normales = Total Heures - Heures Supp (min 0) (Total Heures interne pas exporté)
            $heuresNormales = $totalHeures - $heuresSupp;
            if ($heuresNormales < 0) { $heuresNormales = 0; }
            // Construire ligne permanents: Identité + Présence + Totaux (incluant Heures Normales)
            $ligne = array_merge($ligne, $presence, [
                $absent,
                $recup,
                $congeCount,
                $joursTravailles,
                $heuresSupp,
                $heuresNormales
            ]);
        } else {
            // Temporaires : heures réelles + calcul heures supp (règle: >9h/jour + dimanche + férié)
            $totalHeures = 0.0;
            $heuresSupp = 0.0;
            // Récupérer tous les pointages de l'utilisateur temporaire pour la période
            $allUserPointages = DB::table('pointages')
                ->where('user_id', $user->id)
                ->whereBetween('date', [
                    $dateRange['startDate']->format('Y-m-d'),
                    $dateRange['endDate']->format('Y-m-d')
                ])
                ->get()
                ->all();
            // Appliquer le groupement des pointages de nuit (service réutilisable)
            $groupedPointages = TimeCalculationService::groupNightShiftPointages($allUserPointages, $user->id, $dateRange);
            // Organiser les pointages groupés par date pour traitement jour par jour
            $pointagesByDate = [];
            foreach ($groupedPointages as $pointage) {
                $date = $pointage->date;
                if (!isset($pointagesByDate[$date])) {
                    $pointagesByDate[$date] = [];
                }
                $pointagesByDate[$date][] = $pointage;
            }
            $currentDate = clone $dateRange['startDate'];
            while ($currentDate <= $dateRange['endDate']) {
                $dateStr = $currentDate->format('Y-m-d');
                $dayOfWeek = $currentDate->format('w'); // 0 dimanche
                $isHoliday = in_array($dateStr, $joursFeries);
                // Utiliser les pointages groupés pour cette date
                $pointages = $pointagesByDate[$dateStr] ?? [];
                // Détecter présence déclarée même sans heures
                $hasPresent = false;
                foreach ($pointages as $pt) {
                    $stRaw = (string)($pt->statutJour ?? '');
                    if (preg_match('/pr[eé]sent|retard/i', $stRaw)) { $hasPresent = true; }
                }
                $conge = DB::table('absence_requests')
                    ->where('user_id', $user->id)
                    ->whereIn('type', ['Congé', 'maladie'])
                    ->where('statut', 'approuvé')
                    ->whereDate('dateDebut', '<=', $dateStr)
                    ->whereDate('dateFin', '>=', $dateStr)
                    ->first();
                if ($conge) {
                    $presence[] = ($conge->type === 'maladie') ? 'M' : 'C';
                } else {
                    // build presence cell
                    $daily = TimeCalculationService::computeDailyTotalHoursForTemporary($pointages);
                    if ($daily > 0) {
                        $presence[] = $daily;
                        $totalHeures += $daily;
                        if ($dayOfWeek == 0 || $isHoliday) {
                            $heuresSupp += $daily; // tout le jour
                        } elseif ($daily > 9) {
                            $heuresSupp += ($daily - 9);
                        }
                    } else {
                        // Si déclaré présent mais aucune heure valide, marquer 'P' pour visualiser la présence
                        $presence[] = $hasPresent ? 'P' : '';
                    }
                }
                $currentDate->modify('+1 day');
            }
            // Si aucun total d'heures calculé, on exclut seulement si l'utilisateur n'a aucun pointage dans la période
            if ($totalHeures <= 0 && !$forceInclude) {
                $statutGlobal = strtolower(trim((string)($user->statut ?? '')));
                if ($statutGlobal === 'inactif') {
                    if (!$this->hasPointagesInPeriod($user->id, $dateRange)) {
                        return false;
                    }
                } else {
                    return false;
                }
            }
            // Get detailed breakdown for temporaries (heures normales, HS25, HS50)
            $detailed = TimeCalculationService::computeDetailedTemporaryStats($user, $dateRange);
            $ligne = array_merge($ligne, $presence, [
                $detailed['heures_normales'],
                $detailed['hs_25'],
                $detailed['hs_50']
            ]);
        }
        $sheet->fromArray($ligne, null, 'A' . $row);
        // Calculer les colonnes pour les formules Excel
        $presenceStartCol = $this->presenceStartCol($isPermanent);
        $presenceEndCol = $presenceStartCol + $dateRange['totalDays'] - 1;
        $totalStartCol = $presenceEndCol + 1;
        if ($isPermanent) {
    // Colonnes de présence (jours)
    $presenceStartLetter = Coordinate::stringFromColumnIndex($presenceStartCol);
    $presenceEndLetter   = Coordinate::stringFromColumnIndex($presenceEndCol);
    // Début de la section Totaux pour PERMANENTS :
    // +0 = Absences, +1 = Jour Recup, +2 = Congés, +3 = Total Jours Travaillés,
    // +4 = Heures Supp., +5 = Heures Normales
    $colHS = $totalStartCol + 4;  // Heures Supp.
    $colHN = $totalStartCol + 5;  // Heures Normales
    // Mise en forme (présence et totaux de la ligne)
    $this->formatRange($sheet, $presenceStartLetter.$row.':'.$presenceEndLetter.$row, 0);
    $totalsStartLetter = Coordinate::stringFromColumnIndex($totalStartCol);
    $totalsEndLetter   = Coordinate::stringFromColumnIndex($totalStartCol + 5);
    $this->formatRange($sheet, $totalsStartLetter.$row.':'.$totalsEndLetter.$row, 0);
} else {
    // Colonnes de présence (jours)
    $presenceStartLetter = Coordinate::stringFromColumnIndex($presenceStartCol);
    $presenceEndLetter   = Coordinate::stringFromColumnIndex($presenceEndCol);
    // Début de la section Totaux pour TEMPORAIRES :
    // +0 = Heures Normales, +1 = HS25, +2 = HS50
    $colHN   = $totalStartCol + 0; // Heures Normales
    $colHS25 = $totalStartCol + 1; // HS25
    $colHS50 = $totalStartCol + 2; // HS50
    // Mise en forme (présence et totaux de la ligne)
    $this->formatRange($sheet, $presenceStartLetter.$row.':'.$presenceEndLetter.$row, 0);
    $totalsStartLetter = Coordinate::stringFromColumnIndex($totalStartCol);
    $totalsEndLetter   = Coordinate::stringFromColumnIndex($totalStartCol + 2);
    $this->formatRange($sheet, $totalsStartLetter.$row.':'.$totalsEndLetter.$row, 0);
}
        $this->applyRowStyle($sheet, $row, $dateRange, $isPermanent);
        $this->applyPresenceColors($sheet, $user, $dateRange, $row, $joursFeries, $isPermanent);
        if (!$isPermanent) {
            $this->temporaryListed[$user->id] = true; // mémoriser pour feuille Salaire Temporaire
        }
        return true;
    }
    /* ----------------------- Calculs heures ----------------------- */
    /**
     * Détecte et groupe les pointages de nuit qui traversent minuit
     * Retourne un tableau de pointages groupés où les sessions de nuit sont fusionnées
     */
    private function groupNightShiftPointages($pointages, $userId, $dateRange)
    {
        if (!$pointages || count($pointages) === 0) return [];
        // Convertir en tableau et trier par date puis heure d'entrée
        $sortedPointages = collect($pointages)->sortBy(['date', 'heureEntree'])->values()->all();
        $groupedPointages = [];
        $i = 0;
        while ($i < count($sortedPointages)) {
            $current = $sortedPointages[$i];
            // Vérifier si c'est le début d'une session de nuit (se termine à 23:59 ou proche)
            if ($this->isEndOfDayPointage($current)) {
                // Chercher le pointage du jour suivant qui commencerait à 00:00 ou proche
                $nextDayPointage = $this->findNextDayPointage($sortedPointages, $i, $userId);
                if ($nextDayPointage) {
                    // Fusionner les deux pointages en un seul
                    $mergedPointage = $this->mergeNightShiftPointages($current, $nextDayPointage['pointage']);
                    $groupedPointages[] = $mergedPointage;
                    $i = $nextDayPointage['index'] + 1; // Passer le pointage fusionné
                    Log::info("Pointages de nuit fusionnés", [
                        'user_id' => $userId,
                        'date_debut' => $current->date,
                        'heure_entree' => $current->heureEntree,
                        'date_fin' => $nextDayPointage['pointage']->date,
                        'heure_sortie' => $nextDayPointage['pointage']->heureSortie,
                        'heures_totales' => $this->calculateDailyHours($mergedPointage)
                    ]);
                } else {
                    // Pas de pointage suivant, garder tel quel
                    $groupedPointages[] = $current;
                    $i++;
                }
            } else {
                // Pointage normale, garder tel quel
                $groupedPointages[] = $current;
                $i++;
            }
        }
        return $groupedPointages;
    }
    /**
     * Vérifie si un pointage se termine en fin de journée (proche de 23:59)
     */
    private function isEndOfDayPointage($pointage)
    {
        if (empty($pointage->heureSortie)) return false;
        $sortieTime = $this->parseTime($pointage->heureSortie);
        if ($sortieTime === false) return false;
        $sortieHour = date('H', $sortieTime);
        $sortieMinute = date('i', $sortieTime);
        // Considérer comme fin de journée si sortie après 23:00 ou exactement 23:59
        return ($sortieHour >= 23) || ($sortieHour == 23 && $sortieMinute >= 50);
    }
    /**
     * Trouve le pointage du jour suivant qui pourrait être la continuation d'une session de nuit
     */
    private function findNextDayPointage($pointages, $currentIndex, $userId)
    {
        $current = $pointages[$currentIndex];
        $currentDate = new DateTime($current->date);
        $nextDay = $currentDate->modify('+1 day')->format('Y-m-d');
        // Chercher dans les pointages suivants
        for ($j = $currentIndex + 1; $j < count($pointages); $j++) {
            $candidate = $pointages[$j];
            // Même utilisateur et jour suivant
            if ($candidate->user_id == $userId && $candidate->date == $nextDay) {
                // Vérifier si ça commence tôt le matin (avant 10:00)
                if ($this->isStartOfDayPointage($candidate)) {
                    return ['pointage' => $candidate, 'index' => $j];
                }
            }
            // Si on dépasse le jour suivant, arrêter la recherche
            if ($candidate->date > $nextDay) break;
        }
        return null;
    }
    /**
     * Vérifie si un pointage commence en début de journée (proche de 00:00)
     */
    private function isStartOfDayPointage($pointage)
    {
        if (empty($pointage->heureEntree)) return false;
        $entreeTime = $this->parseTime($pointage->heureEntree);
        if ($entreeTime === false) return false;
        $entreeHour = date('H', $entreeTime);
        // Considérer comme début de journée si entrée avant 10:00
        return $entreeHour < 10;
    }
    /**
     * Fusionne deux pointages de nuit en un seul pointage virtuel
     */
    private function mergeNightShiftPointages($firstPointage, $secondPointage)
    {
        $merged = clone $firstPointage;
        // Garder la date et l'heure d'entrée du premier pointage
        $merged->date = $firstPointage->date;
        $merged->heureEntree = $firstPointage->heureEntree;
        // Prendre l'heure de sortie du deuxième pointage
        $merged->heureSortie = $secondPointage->heureSortie;
        // Marquer comme session de nuit fusionnée
        $merged->is_night_shift = true;
        $merged->original_end_date = $secondPointage->date;
        return $merged;
    }
    private function calculateDailyHours($pointage)
    {
        if (empty($pointage->heureEntree) || empty($pointage->heureSortie)) return 0.0;
        $start = $this->parseTime($pointage->heureEntree);
        $end   = $this->parseTime($pointage->heureSortie);
        if ($start === false || $end === false) return 0.0;
        // Pour les sessions de nuit fusionnées, calculer correctement la durée
        if (isset($pointage->is_night_shift) && $pointage->is_night_shift) {
            // Pour une session de nuit qui traverse minuit, on calcule différemment
            // Exemple: 20:00 → 07:00 = 11 heures
            if ($end < $start) {
                $end += 86400; // Ajouter 24h pour le jour suivant
            }
        } else {
            // Logique normale pour les pointages qui ne traversent pas minuit
            if ($end < $start) $end += 86400;
        }
        $seconds = $end - $start;
        if ($seconds <= 0) return 0.0;
        if ($seconds > 86400) {
            Log::warning('Durée de travail > 24h détectée', [
                'in' => $pointage->heureEntree, 'out' => $pointage->heureSortie, 'seconds' => $seconds,
                'is_night_shift' => isset($pointage->is_night_shift) ? $pointage->is_night_shift : false
            ]);
            return 0.0;
        }
        $hours = $seconds / 3600.0;
        return max(0.0, $hours);
    }
    private function computeDailyTotalHours($pointages)
    {
        if (!$pointages || count($pointages) === 0) return 0.0;
        $totalRaw = 0.0;
        $overlapsNight = false;
        foreach ($pointages as $p) {
            $totalRaw += $this->calculateDailyHours($p);
            $start = $this->parseTime($p->heureEntree);
            $end   = $this->parseTime($p->heureSortie);
            if ($start === false || $end === false) continue;
            if ($end < $start) $end += 86400;
            $s = $start / 3600.0;
            $e = $end   / 3600.0;
            $ovNight1 = max(0.0, min($e, 9.0)  - max($s, 0.0));
            $ovNight2 = max(0.0, min($e, 33.0) - max($s, 24.0));
            if (($ovNight1 + $ovNight2) > 0) $overlapsNight = true;
        }
        if (!$overlapsNight && $totalRaw > 8.0) {
            $totalRaw -= 1.0;
        }
        return max(0.0, $totalRaw);
    }
    // computeDailyTotalHoursForTemporary now provided by shared TimeCalculationService
    private function calculateNightBaseHours($pointages)
    {
        $total = 0.0;
        foreach ($pointages as $p) {
            $start = $this->parseTime($p->heureEntree);
            $end   = $this->parseTime($p->heureSortie);
            if ($start === false || $end === false) continue;
            if ($end < $start) $end += 86400;
            $s = $start / 3600.0;
            $e = $end   / 3600.0;
            $ov1 = max(0.0, min($e, 8.0)  - max($s, 0.0));
            $ov2 = max(0.0, min($e, 32.0) - max($s, 24.0));
            $total += ($ov1 + $ov2);
        }
        return $total;
    }
    /* ----------------------- Divers helpers ----------------------- */
    private function isPermanent($user)
    {
        if (empty($user->typeContrat)) return false;
        $contractType = strtolower(trim($user->typeContrat));
        return in_array($contractType, ['permanent','permanente','cdi','indéterminée','indeterminee']);
    }
    private function checkSpecialDay($dateStr, $joursFeries)
    {
        $date = new DateTime($dateStr);
        $dayOfWeek = $date->format('w');
        $isWeekend = ($dayOfWeek == 0 || $dayOfWeek == 6);
        $isHoliday = in_array($dateStr, $joursFeries);
        return [
            'est_weekend' => $isWeekend,
            'est_ferie'   => $isHoliday,
            'jour_semaine'=> $dayOfWeek
        ];
    }
    private function parseTime($timeString)
    {
        if (empty($timeString)) return false;
        $timeString = trim($timeString);
        if (preg_match('/^(\d{1,2}):(\d{2}):(\d{2})$/', $timeString, $m)) {
            $h=intval($m[1]); $i=intval($m[2]); $s=intval($m[3]);
            if ($h>=0&&$h<=23 && $i>=0&&$i<=59 && $s>=0&&$s<=59) return mktime($h,$i,$s);
        }
        if (preg_match('/^(\d{1,2}):(\d{2})$/', $timeString, $m)) {
            $h=intval($m[1]); $i=intval($m[2]);
            if ($h>=0&&$h<=23 && $i>=0&&$i<=59) return mktime($h,$i,0);
        }
        if (preg_match('/^(\d):(\d{2})$/', $timeString, $m)) {
            $h=intval($m[1]); $i=intval($m[2]);
            if ($h>=0&&$h<=9 && $i>=0&&$i<=59) return mktime($h,$i,0);
        }
        $ts = strtotime($timeString);
        if ($ts !== false) {
            $h = date('H', $ts);
            $i = date('i', $ts);
            $s = date('s', $ts);
            return mktime($h,$i,$s);
        }
        Log::warning("Format d'heure non reconnu", ['heure_originale' => $timeString]);
        return false;
    }
    private function applyRowStyle($sheet, $row, $dateRange, $isPermanent = true)
    {
        foreach (['A','B'] as $col) {
            $sheet->getStyle($col . $row)->getFill()
                ->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('E8F4FD');
        }
    $presenceStartCol = $this->presenceStartCol($isPermanent);
        $joursFeries = JourFerie::whereBetween('date', [
            $dateRange['startDate']->format('Y-m-d'),
            $dateRange['endDate']->format('Y-m-d')
        ])->where('actif', true)->pluck('date')->map(fn($d)=>date('Y-m-d',strtotime($d)))->toArray();
        $currentDate = clone $dateRange['startDate'];
        for ($i=0; $i<$dateRange['totalDays']; $i++) {
            $colLetter = Coordinate::stringFromColumnIndex($presenceStartCol + $i);
            $currentDateStr = $currentDate->format('Y-m-d');
            if (in_array($currentDateStr, $joursFeries)) {
                $sheet->getStyle($colLetter . $row)->getFill()
                    ->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('FFCCCC');
            } elseif ($i % 2 === 0) {
                $sheet->getStyle($colLetter . $row)->getFill()
                    ->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('F2F2F2');
            }
            $currentDate->modify('+1 day');
        }
    }
    private function applyPresenceColors($sheet, $user, $dateRange, $row, $joursFeries = [], $isPermanent = true)
    {
        $formattedJoursFeries = array_map(fn($d)=>date('Y-m-d', strtotime($d)), $joursFeries);
        $currentDate = clone $dateRange['startDate'];
        $dayIndex = 0;
    $presenceStartCol = $this->presenceStartCol($isPermanent);
        while ($currentDate <= $dateRange['endDate']) {
            $dateStr   = $currentDate->format('Y-m-d');
            $dayOfWeek = $currentDate->format('w');
            $isHoliday = in_array($dateStr, $formattedJoursFeries);
            $pointage = DB::table('pointages')
                ->where('user_id', $user->id)
                ->whereDate('date', $dateStr)
                ->first();
            $colLetter = Coordinate::stringFromColumnIndex($presenceStartCol + $dayIndex);
            $cellValue = $sheet->getCell($colLetter . $row)->getValue();
            if ($dayOfWeek == 0 && !$isHoliday) {
                $sheet->getStyle($colLetter . $row)->getFill()
                    ->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('FFE6CC');
            }
            if ($cellValue === 'P' || $cellValue === '✔') {
                if ($pointage) {
                    $isValidated = !empty($pointage->valider) && $pointage->valider == 1;
                    $sheet->getStyle($colLetter . $row)->getFont()->getColor()
                        ->setRGB($isValidated ? '008000' : '0000FF');
                }
            } elseif ($cellValue === 'F') {
                $sheet->getStyle($colLetter . $row)->getFont()->getColor()->setRGB('FF0000');
            } elseif ($cellValue === 'A' || $cellValue === 'X') {
                if ($pointage) {
                    $isValidated = !empty($pointage->valider) && $pointage->valider == 1;
                    $sheet->getStyle($colLetter . $row)->getFont()->getColor()
                        ->setRGB($isValidated ? 'FF0000' : '0000FF');
                } else {
                    $sheet->getStyle($colLetter . $row)->getFont()->getColor()->setRGB('FF0000');
                }
            }
            $currentDate->modify('+1 day');
            $dayIndex++;
        }
    }
    private function addHolidayInfo($sheet, $dateRange, $startRow)
    {
        $joursFeries = JourFerie::whereBetween('date', [
            $dateRange['startDate']->format('Y-m-d'),
            $dateRange['endDate']->format('Y-m-d')
        ])->where('actif', true)->orderBy('date')->get();
        if ($joursFeries->count() > 0) {
            $infoRow = $startRow + 2;
            $sheet->setCellValue('A' . $infoRow, 'JOURS FÉRIÉS DE LA PÉRIODE:');
            $sheet->getStyle('A' . $infoRow)->getFont()->setBold(true)->setSize(12)->getColor()->setRGB('FF0000');
            $infoRow++;
            $sheet->setCellValue('A' . $infoRow, 'Date');
            $sheet->setCellValue('B' . $infoRow, 'Nom du jour férié');
            $sheet->setCellValue('C' . $infoRow, 'Jour de la semaine');
            $sheet->getStyle('A' . $infoRow . ':C' . $infoRow)->applyFromArray([
                'font' => ['bold' => true],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FFCCCC']],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
            ]);
            $infoRow++;
            $dayNames = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
            foreach ($joursFeries as $jf) {
                $d = new DateTime($jf->date);
                $sheet->setCellValue('A' . $infoRow, $d->format('d/m/Y'));
                $sheet->setCellValue('B' . $infoRow, $jf->nom ?? 'Jour férié');
                $sheet->setCellValue('C' . $infoRow, $dayNames[$d->format('w')]);
                $sheet->getStyle('A' . $infoRow . ':C' . $infoRow)->applyFromArray([
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
                    'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FFF0F0']]
                ]);
                $infoRow++;
            }
            $sheet->getColumnDimension('A')->setWidth(12);
            $sheet->getColumnDimension('B')->setWidth(25);
            $sheet->getColumnDimension('C')->setWidth(15);
        }
    }
    private function autoSizeColumns($sheet)
    {
        $highestColumn = $sheet->getHighestColumn();
        $highestIndex  = Coordinate::columnIndexFromString($highestColumn);
        for ($col = 1; $col <= $highestIndex; $col++) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($col))->setAutoSize(true);
        }
    }
    private function createServiceSheet($spreadsheet, $societeId)
    {
        $serviceSheet = $spreadsheet->createSheet();
        $serviceSheet->setTitle('Liste Personnel');
        $employes = DB::table('users')
            ->leftJoin('departements', 'users.departement_id', '=', 'departements.id')
            ->where('users.societe_id', $societeId)
            ->whereRaw('LOWER(TRIM(COALESCE(users.statut, ""))) != "inactif"')
            ->whereNotIn('users.id', $this->excludedUserIds)
            ->select('users.*', 'departements.nom as departement_nom')
            ->orderBy('departements.nom')
            ->orderBy('users.name')
            ->get();
        $row = 1;
        $serviceSheet->setCellValue('A' . $row, 'LISTE DU PERSONNEL');
        $serviceSheet->mergeCells('A' . $row . ':N' . $row); // A -> N (14 colonnes)
        $serviceSheet->getStyle('A' . $row . ':N' . $row)->applyFromArray([
            'font' => ['bold' => true, 'size' => 16],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'D9EAD3']],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THICK]]
        ]);
        $row += 2;
        // Nouvel en-tête demandé
        $headers = [
            'Matricule',               // id
            'Noms et prénoms',        // nom + prénom
            'Fonctions',              // fonction
            'Affectation',            // département
            'CNSS',                   // cnss
            'CIN',                    // cin
            'Date Naissance',         // dateNaissance
            'Adresse',                // adresse
            'Situation Familiale',    // situation_familiale
            "Nombre d'enfants",      // nbEnfants
            'Date Embauche',          // dateEmbauche
            'Téléphone',              // telephone
            'RIB',                    // rib
            'Salaire',                // salaire
            'Type Contrat'            // typeContrat
        ];
        $colIndex = 0;
        foreach ($headers as $h) {
            $colLetter = Coordinate::stringFromColumnIndex($colIndex + 1);
            $serviceSheet->setCellValue($colLetter . $row, $h);
            $colIndex++;
        }
        $lastHeaderColLetter = Coordinate::stringFromColumnIndex(count($headers));
        $serviceSheet->getStyle('A' . $row . ':' . $lastHeaderColLetter . $row)->applyFromArray([
            'font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => 'FFFFFF']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4472C4']],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
        ]);
        $serviceSheet->setAutoFilter('A' . $row . ':' . $lastHeaderColLetter . ($row + $employes->count()));
        $row++;
        foreach ($employes as $employee) {
            $rowData = [
                $employee->id ?? '',
                strtoupper(trim(($employee->name ?? '') . ' ' . ($employee->prenom ?? ''))),
                strtoupper($employee->fonction ?? ''),
                strtoupper($employee->departement_nom ?? 'NON ASSIGNÉ'),
                strtoupper($employee->cnss ?? ''),
                strtoupper($employee->cin ?? ''),
                $employee->dateNaissance ?? $employee->date_naissance ?? '',
                strtoupper($employee->adresse ?? $employee->address ?? ''),
                strtoupper($employee->situation_familiale ?? $employee->situationFamiliale ?? ''),
                $employee->nbEnfants ?? '',
                $employee->dateEmbauche ?? '',
                $employee->telephone ?? $employee->tel ?? $employee->phone ?? '',
                strtoupper($employee->rib ?? ''),
                $employee->salaire ?? '',
                strtoupper($employee->typeContrat ?? '')
            ];
            $serviceSheet->fromArray($rowData, null, 'A' . $row);
            $fillColor = ($row % 2 === 0) ? 'F2F2F2' : 'FFFFFF';
            $serviceSheet->getStyle('A' . $row . ':' . $lastHeaderColLetter . $row)->applyFromArray([
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
                'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $fillColor]],
                'alignment' => ['vertical' => Alignment::VERTICAL_CENTER]
            ]);
            if (empty($employee->departement_nom) || strtoupper($employee->departement_nom) === 'NON ASSIGNÉ') {
                // Affectation now column D (A=Matricule,B=Noms,C=Fonctions,D=Affectation)
                $serviceSheet->getStyle('D' . $row)->applyFromArray([
                    'font' => ['color' => ['rgb' => 'FF0000'], 'italic' => true]
                ]);
            }
            $row++;
        }
        $row++;
        $serviceSheet->setCellValue('A' . $row, 'TOTAL EMPLOYÉS: ' . $employes->count());
        $serviceSheet->mergeCells('A' . $row . ':C' . $row);
        $serviceSheet->getStyle('A' . $row . ':C' . $row)->applyFromArray([
            'font' => ['bold' => true, 'size' => 12],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FFE6CC']],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
        ]);
        $departementStats = DB::table('users')
            ->leftJoin('departements', 'users.departement_id', '=', 'departements.id')
            ->where('users.societe_id', $societeId)
            ->select(DB::raw('COALESCE(departements.nom, "Non assigné") as dept_nom'), DB::raw('COUNT(*) as nombre'))
            ->groupBy('departements.nom')
            ->orderBy('nombre', 'desc')
            ->get();
        $row += 2;
        $serviceSheet->setCellValue('A' . $row, 'RÉPARTITION PAR DÉPARTEMENT');
        $serviceSheet->mergeCells('A' . $row . ':C' . $row);
        $serviceSheet->getStyle('A' . $row . ':C' . $row)->applyFromArray([
            'font' => ['bold' => true, 'size' => 12],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E8F4FD']],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
        ]);
        $row++;
        $serviceSheet->setCellValue('A' . $row, 'Département');
        $serviceSheet->setCellValue('B' . $row, "Nombre d'employés");
        $serviceSheet->getStyle('A' . $row . ':B' . $row)->applyFromArray([
            'font' => ['bold' => true],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'D9EAD3']],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
        ]);
        $row++;
        foreach ($departementStats as $stat) {
            $serviceSheet->setCellValue('A' . $row, strtoupper($stat->dept_nom));
            $serviceSheet->setCellValue('B' . $row, $stat->nombre);
            $serviceSheet->getStyle('A' . $row . ':B' . $row)->applyFromArray([
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT]
            ]);
            if (strtoupper($stat->dept_nom) === 'NON ASSIGNÉ') {
                $serviceSheet->getStyle('A' . $row)->applyFromArray([
                    'font' => ['color' => ['rgb' => 'FF0000'], 'italic' => true]
                ]);
            }
            $row++;
        }
        // Auto size all header columns A -> N
        for ($c = 1; $c <= count($headers); $c++) {
            $serviceSheet->getColumnDimension(Coordinate::stringFromColumnIndex($c))->setAutoSize(true);
        }
        $serviceSheet->freezePane('A4');
    }
    private function createSortantsSheet($spreadsheet, $societeId)
    {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Sortants');
        // Récupérer les employés inactifs (statut = inactif) de la société
        $employes = DB::table('users')
            ->leftJoin('departements', 'users.departement_id', '=', 'departements.id')
            ->where('users.societe_id', $societeId)
            ->whereRaw('LOWER(COALESCE(users.statut, "")) = "inactif"')
            ->where('users.id', '!=', 79)
            ->whereNotIn('users.id', $this->excludedUserIds)
            ->select(
                'users.id', 'users.name', 'users.prenom', 'users.dateEmbauche', 'users.fonction', 'users.typeContrat',
                'users.cnss', 'users.nbEnfants', 'users.date_sortie', 'departements.nom as departement_nom'
            )
            ->orderBy('departements.nom')
            ->orderBy('users.name')
            ->get();
        // Titre
        $row = 1;
        $sheet->setCellValue('A' . $row, 'EMPLOYÉS SORTANTS');
        $sheet->mergeCells('A' . $row . ':I' . $row);
        $sheet->getStyle('A' . $row . ':I' . $row)->applyFromArray([
            'font' => ['bold' => true, 'size' => 16],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'D9EAD3']],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THICK]]
        ]);
        $row += 2;
        // En-têtes demandés
        $headers = [
            'Matricule',
            'Nom Complet',
            'Département',
            'Date Embauche',
            'Fonction',
            'Type Contrat',
            'CNSS',
            'Nbr Enfants',
            'Salaire',
            'Date Sortie'
        ];
        foreach ($headers as $i => $h) {
            $colLetter = Coordinate::stringFromColumnIndex($i + 1); // 1-based
            $sheet->setCellValue($colLetter . $row, $h);
        }
        $lastCol = Coordinate::stringFromColumnIndex(count($headers));
        $sheet->getStyle('A' . $row . ':' . $lastCol . $row)->applyFromArray([
            'font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => 'FFFFFF']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4472C4']],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
        ]);
        // Ajouter AutoFilter pour la feuille Sortants
        $dataRowEnd = $row + max(1, $employes->count());
        $sheet->setAutoFilter('A' . $row . ':' . $lastCol . $dataRowEnd);
        $row++;
        if ($employes->count() === 0) {
            $sheet->setCellValue('A' . $row, 'Aucun employé sortant.');
            $sheet->mergeCells('A' . $row . ':' . $lastCol . $row);
            $sheet->getStyle('A' . $row . ':' . $lastCol . $row)->applyFromArray([
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                'font' => ['italic' => true, 'color' => ['rgb' => '555555']]
            ]);
        } else {
            foreach ($employes as $emp) {
                $data = [
                    $emp->id,
                    strtoupper(trim(($emp->name ?? '') . ' ' . ($emp->prenom ?? ''))),
                    strtoupper($emp->departement_nom ?? 'NON ASSIGNÉ'),
                    $emp->dateEmbauche ?? '',
                    strtoupper($emp->fonction ?? ''),
                    strtoupper($emp->typeContrat ?? ''),
                    strtoupper($emp->cnss ?? ''),
                    $emp->nbEnfants ?? '',
                    $emp->salaire ?? '',
                    $emp->date_sortie ?? ''
                ];
                $sheet->fromArray($data, null, 'A' . $row);
                $fillColor = ($row % 2 === 0) ? 'F2F2F2' : 'FFFFFF';
                $sheet->getStyle('A' . $row . ':' . $lastCol . $row)->applyFromArray([
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
                    'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $fillColor]],
                    'alignment' => ['vertical' => Alignment::VERTICAL_CENTER]
                ]);
                if (empty($emp->departement_nom) || strtoupper($emp->departement_nom) === 'NON ASSIGNÉ') {
                    $sheet->getStyle('C' . $row)->applyFromArray([
                        'font' => ['color' => ['rgb' => 'FF0000'], 'italic' => true]
                    ]);
                }
                $row++;
            }
        }
        // Auto-size colonnes
        for ($c = 1; $c <= count($headers); $c++) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($c))->setAutoSize(true);
        }
        $sheet->freezePane('A4');
    }
   private function createRecapSheet(Spreadsheet $spreadsheet, $societeId, array $dateRange, ?int $filterDepartementId = null, ?int $filterUserId = null)
{
    // -------- Indices colonnes dynamiques selon la période --------
    // Permanents
    $permPresenceStart = $this->presenceStartCol(true);
    $permPresenceEnd   = $permPresenceStart + $dateRange['totalDays'] - 1;
    $permTotalsStart   = $permPresenceEnd + 1;
    $permColJoursTrav  = $permTotalsStart + 3; // Total Jours Travaillés
    $permColHS         = $permTotalsStart + 4; // Heures Supp.
    $permColHN         = $permTotalsStart + 5; // Heures Normales
    $permDeptCol       = 3; // C
    // Temporaires
    $tempPresenceStart = $this->presenceStartCol(false);
    $tempPresenceEnd   = $tempPresenceStart + $dateRange['totalDays'] - 1;
    $tempTotalsStart   = $tempPresenceEnd + 1;
    $tempColHN         = $tempTotalsStart + 0; // Heures Normales
    $tempColHS25       = $tempTotalsStart + 1; // HS25
    $tempColHS50       = $tempTotalsStart + 2; // HS50
    $tempDeptCol       = 4; // D
    // Feuilles & bornes
    $permSheet    = $spreadsheet->getSheetByName('Employés Permanents');
    $tempSheet    = $spreadsheet->getSheetByName('Employés Temporaires');
    $dataStartRow = 5;
    $permLastRow  = $permSheet ? max($dataStartRow, (int)$permSheet->getHighestDataRow()) : $dataStartRow;
    $tempLastRow  = $tempSheet ? max($dataStartRow, (int)$tempSheet->getHighestDataRow()) : $dataStartRow;
    $permName     = $permSheet ? $permSheet->getTitle() : null;
    $tempName     = $tempSheet ? $tempSheet->getTitle() : null;
    // Liste départements basée sur les pointages (pas l'affectation utilisateur)
    // Null ou vide => 'NON AFFECTÉ' (affiché en UPPER)
    $departementsQuery = DB::table('pointages')
        ->join('users', 'users.id', '=', 'pointages.user_id')
        ->leftJoin('departements', 'departements.id', '=', 'pointages.departement_id')
        ->where('users.societe_id', $societeId)
        ->whereBetween('pointages.date', [
            $dateRange['startDate']->format('Y-m-d'),
            $dateRange['endDate']->format('Y-m-d')
        ]);
    
    // Appliquer les filtres optionnels
    if ($filterUserId) {
        $departementsQuery->where('users.id', $filterUserId);
    }
    if ($filterDepartementId) {
        $departementsQuery->where('pointages.departement_id', $filterDepartementId);
    }
    
    $departements = $departementsQuery
        ->select(DB::raw("UPPER(TRIM(COALESCE(NULLIF(TRIM(departements.nom), ''), 'NON AFFECTÉ'))) as dept"))
        ->distinct()
        ->orderBy('dept')
        ->pluck('dept')
        ->toArray();
    // Créer feuille Récap
    $recap = $spreadsheet->createSheet();
    $recap->setTitle('Récap');
    $r = 1;
    $recap->setCellValue('A'.$r, 'RÉCAPITULATIF (agrégation feuilles — 4 métriques)');
    $recap->mergeCells('A'.$r.':E'.$r);
    $recap->getStyle('A'.$r.':E'.$r)->applyFromArray([
        'font'=>['bold'=>true,'size'=>15],
        'alignment'=>['horizontal'=>\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER],
        'fill'=>['fillType'=>\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,'startColor'=>['rgb'=>'D9EAD3']],
        'borders'=>['allBorders'=>['borderStyle'=>\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THICK]],
    ]);
    $r += 2;
    // Cellule helper pour le dénominateur: nombre de jours effectifs de la période (borné à aujourd'hui)
    // = MAX(1, MIN(endDate, TODAY()) - startDate + 1)
    $startY = (int)$dateRange['startDate']->format('Y');
    $startM = (int)$dateRange['startDate']->format('n');
    $startD = (int)$dateRange['startDate']->format('j');
    $endY   = (int)$dateRange['endDate']->format('Y');
    $endM   = (int)$dateRange['endDate']->format('n');
    $endD   = (int)$dateRange['endDate']->format('j');
    $daysFormula = "=MAX(1, MIN(DATE($endY,$endM,$endD), TODAY()) - DATE($startY,$startM,$startD) + 1)";
    $recap->setCellValue('I1', $daysFormula);
    // Optionnel: formater et/ou masquer la colonne I si besoin
    $recap->getStyle('I1')->getNumberFormat()->setFormatCode('#,##0');
    // En-têtes : Département + 4 colonnes demandées
    $headers = [
        'DÉPARTEMENT',
        'MOYENNE EFFECTIF PAR JOUR', // = TOTAL EFFECTIF / jours effectifs (cap à aujourd\'hui)
        'TOTAL EFFECTIF',
        'TOTAL HEURES NORMALES',
        'TOTAL HEURES SUPP'
    ];
    foreach ($headers as $i=>$h) $recap->setCellValue($this->col($i+1).$r, $h);
    $recap->getStyle('A'.$r.':'.$this->col(count($headers)).$r)->applyFromArray([
        'font'=>['bold'=>true,'color'=>['rgb'=>'FFFFFF']],
        'alignment'=>['horizontal'=>\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER],
        'fill'=>['fillType'=>\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,'startColor'=>['rgb'=>'4472C4']],
        'borders'=>['allBorders'=>['borderStyle'=>\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN]],
    ]);
    $r++;
    // Ranges utiles
    $permDeptRange = $this->col($permDeptCol).$dataStartRow.':'.$this->col($permDeptCol).$permLastRow;
    $tempDeptRange = $this->col($tempDeptCol).$dataStartRow.':'.$this->col($tempDeptCol).$tempLastRow;
    $permJTRange   = $this->col($permColJoursTrav).$dataStartRow.':'.$this->col($permColJoursTrav).$permLastRow;
    $permHNRange   = $this->col($permColHN).$dataStartRow.':'.$this->col($permColHN).$permLastRow;
    $permHSRange   = $this->col($permColHS).$dataStartRow.':'.$this->col($permColHS).$permLastRow;
    $tempHNRange   = $this->col($tempColHN).$dataStartRow.':'.$this->col($tempColHN).$tempLastRow;
    $tempHS25Range = $this->col($tempColHS25).$dataStartRow.':'.$this->col($tempColHS25).$tempLastRow;
    $tempHS50Range = $this->col($tempColHS50).$dataStartRow.':'.$this->col($tempColHS50).$tempLastRow;
    foreach ($departements as $dept) {
        // Libellé
        $recap->setCellValue('A'.$r, $dept);
        // TOTAL EFFECTIF via formules Excel (distinct par employé ayant travaillé au moins 1 jour)
        $critDept = ($dept === 'NON AFFECTÉ') ? '"NON AFFECTÉ"' : ('A'.$r);
        $parts = [];
        if ($permName) {
            $parts[] = "SUMPRODUCT(--('".$permName."'!".$permDeptRange."=".$critDept."),--('".$permName."'!".$permJTRange.">0))";
        }
        if ($tempName) {
            $parts[] = "SUMPRODUCT(--('".$tempName."'!".$tempDeptRange."=".$critDept."),--(('".$tempName."'!".$tempHNRange."+'".$tempName."'!".$tempHS25Range."+'".$tempName."'!".$tempHS50Range.")>0))";
        }
        $formulaEffectif = '='.(!empty($parts) ? implode('+', $parts) : '0');
        $recap->setCellValue('C'.$r, $formulaEffectif);
    // Col B = MOYENNE EFFECTIF PAR JOUR = TOTAL EFFECTIF / jours effectifs (I1)
    // Attention: utiliser des quotes simples pour éviter l'interpolation PHP de $I
    $recap->setCellValue('B'.$r, '=IF($I$1>0, C'.$r.'/$I$1, 0)');
    // Col D = TOTAL HEURES NORMALES via SUMIF (toujours basé sur présence de département par feuille)
    $sumHN = [];
    $critDept = ($dept === 'NON AFFECTÉ') ? '"NON AFFECTÉ"' : ('A'.$r);
    if ($permName) $sumHN[] = "SUMIF('".$permName."'!".$permDeptRange.",".$critDept.",'".$permName."'!".$permHNRange.")";
    if ($tempName) $sumHN[] = "SUMIF('".$tempName."'!".$tempDeptRange.",".$critDept.",'".$tempName."'!".$tempHNRange.")";
    $recap->setCellValue('D'.$r, "=".(count($sumHN)?implode('+',$sumHN):'0'));
        // Col E = TOTAL HEURES SUPP = P(HS) + T(HS25+HS50)
        $sumHS = [];
        $critDeptHS = ($dept === 'NON AFFECTÉ') ? '"NON AFFECTÉ"' : ('A'.$r);
        if ($permName) $sumHS[] = "SUMIF('".$permName."'!".$permDeptRange.",".$critDeptHS.",'".$permName."'!".$permHSRange.")";
        if ($tempName) {
            $sumHS[] = "SUMIF('".$tempName."'!".$tempDeptRange.",".$critDeptHS.",'".$tempName."'!".$tempHS25Range.")";
            $sumHS[] = "SUMIF('".$tempName."'!".$tempDeptRange.",".$critDeptHS.",'".$tempName."'!".$tempHS50Range.")";
        }
        $recap->setCellValue('E'.$r, "=".(count($sumHS)?implode('+',$sumHS):'0'));
        // Style ligne
        $recap->getStyle('A'.$r.':E'.$r)->applyFromArray([
            'borders'=>['allBorders'=>['borderStyle'=>\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN]],
            'alignment'=>['vertical'=>\PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER],
        ]);
        $r++;
    }
    // Ligne TOTAL (sommes)
    $recap->setCellValue('A'.$r, 'TOTAL');
    // B total = somme des effectifs moyens par département (équivaut à la moyenne globale)
    $startRowDepts = $r - count($departements);
    $recap->setCellValue('B'.$r, "=SUM(B{$startRowDepts}:B".($r-1).")");
    // C..E = sommes par colonne
    foreach (['C','D','E'] as $L) {
        $recap->setCellValue($L.$r, "=SUM(".$L.($r - count($departements)).":".$L.($r-1).")");
    }
    $recap->getStyle('A'.$r.':E'.$r)->applyFromArray([
        'font'=>['bold'=>true],
        'fill'=>['fillType'=>\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,'startColor'=>['rgb'=>'E2EFDA']],
        'borders'=>['allBorders'=>['borderStyle'=>\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THICK]],
    ]);
    // Formats : B en décimal (2), C..E en entier
    $recap->getStyle('B3:B'.$r)->getNumberFormat()->setFormatCode('#,##0.00');
    $this->formatRange($recap, 'C3:E'.$r, 0);
    // Auto-size
    foreach (range('A','E') as $c) {
        $recap->getColumnDimension($c)->setAutoSize(true);
    }
}
    /**
     * Calculer les statistiques pour un département basé sur ses pointages
     */
    private function calculateStatsForDepartmentFromPointages($pointages, $dateRange, $joursFeries)
{
    $userIds = $pointages->pluck('user_id')->unique();
    $totalEffectif = 0;
    $totalHeures = 0.0;
    $totalHeuresSupp = 0.0;
    $totalRecup = 0;
    $dailyPresence = [];
    // ✅ NOUVEAU: Stockage des données détaillées par utilisateur
    $detailedData = [];
    // Initialiser les jours
    $currentDate = clone $dateRange['startDate'];
    while ($currentDate <= $dateRange['endDate']) {
        $dailyPresence[$currentDate->format('Y-m-d')] = 0;
        $currentDate->modify('+1 day');
    }
    foreach ($userIds as $userId) {
        $userPointages = $pointages->where('user_id', $userId);
        $hasWorked = false;
        $userTotalHours = 0.0;
        $userHeuresSupp = 0.0;
        $userRecup = 0;
        $userJoursTravailles = 0;
        // Déterminer si l'utilisateur est permanent
        $firstPointage = $userPointages->first();
        $isPermanent = $this->isPermanentByTypeContrat($firstPointage->typeContrat ?? '');
        $userName = $firstPointage->user_name ?? 'Inconnu';
        // Grouper pointages par date
        $pointagesByDate = $userPointages->groupBy('date');
        foreach ($pointagesByDate as $dateStr => $dayPointages) {
            $date = new DateTime($dateStr);
            $dayOfWeek = (int)$date->format('w');
            $isHoliday = in_array($dateStr, $joursFeries, true);
            // Congé ?
            $conge = DB::table('absence_requests')
                ->where('user_id', $userId)
                ->whereIn('type', ['Congé', 'maladie'])
                ->where('statut', 'approuvé')
                ->whereDate('dateDebut', '<=', $dateStr)
                ->whereDate('dateFin', '>=', $dateStr)
                ->first();
            if ($conge) continue;
            // Heures du jour (avec la même logique que feuilles) - mais on exige au moins une entrée ET sortie
            $hasValidInOut = $dayPointages->contains(function($pt){
                return !empty($pt->heureEntree) && !empty($pt->heureSortie);
            });
            $dailyHours = $hasValidInOut ? TimeCalculationService::computeDailyTotalHoursForTemporary($dayPointages->all()) : 0;
            $nightBaseHours = $hasValidInOut ? TimeCalculationService::calculateNightBaseHours($dayPointages->all()) : 0;
            if ($dailyHours > 0 && $hasValidInOut) {
                $hasWorked = true;
                $dailyPresence[$dateStr]++;
                $userTotalHours += $dailyHours;
                $userJoursTravailles++;
                // ✅ RÉCUP si dimanche ou férié TRAVAILLÉ et au moins une entrée ET sortie valides
                if ($dayOfWeek === 0 || $isHoliday) {
                    $hasValidInOut = $dayPointages->contains(function($pt){
                        return !empty($pt->heureEntree) && !empty($pt->heureSortie);
                    });
                    if ($hasValidInOut) {
                        $totalRecup += 1;
                        $userRecup += 1;
                    }
                }
                if ($isPermanent) {
                    // ✅ Permanents: HS si > 8h ET base nuit < 8h
                    if ($dailyHours > 8 && $nightBaseHours < 8) {
                        $userHeuresSupp += ($dailyHours - 8);
                    }
                } else {
                    // Temporaires
                    if ($dayOfWeek === 0 || $isHoliday) {
                        $userHeuresSupp += $dailyHours;
                    } elseif ($dailyHours > 9) {
                        $userHeuresSupp += ($dailyHours - 9);
                    }
                }
            }
        }
        if ($hasWorked) {
            $totalEffectif++;
            $totalHeures += $userTotalHours;
            $totalHeuresSupp += $userHeuresSupp;
            // ✅ NOUVEAU: Stocker les données détaillées de l'utilisateur
            $detailedData[] = [
                'nom' => $userName,
                'type_contrat' => $firstPointage->typeContrat ?? 'N/A',
                'is_permanent' => $isPermanent ? 'Permanent' : 'Temporaire',
                'jours_travailles' => $userJoursTravailles,
                'heures_totales' => round($userTotalHours, 2),
                'heures_supp' => round($userHeuresSupp, 2),
                'jours_recup' => $userRecup
            ];
        }
    }
    $totalJoursPresents = array_sum($dailyPresence);
    // ✅ Calculer le nombre RÉEL de jours dans la période (pas seulement les jours avec présence)
    $startDate = new \DateTime($dateRange['start']);
    $endDate = new \DateTime($dateRange['end']);
    $nbJoursPeriode = $startDate->diff($endDate)->days + 1; // +1 pour inclure le dernier jour
    $moyenneEffectifParJour = $nbJoursPeriode > 0 ? ($totalJoursPresents / $nbJoursPeriode) : 0;
    return [
        'stats' => [
            'totalEffectif' => $totalEffectif,
            'moyenneEffectifParJour' => $moyenneEffectifParJour,
            'totalHeures' => $totalHeures,
            'totalHeuresSupp' => $totalHeuresSupp,
            'totalRecup' => $totalRecup,
            'moyenneHeuresParPersonne' => $totalEffectif > 0 ? ($totalHeures / $totalEffectif) : 0,
            'moyenneHeureParJour' => $nbJoursPeriode > 0 ? ($totalHeures / $nbJoursPeriode) : 0
        ],
        'detailedData' => $detailedData
    ];
}
    /**
     * Déterminer si un type de contrat est permanent
     */
    private function isPermanentByTypeContrat($typeContrat)
    {
        $typeNormalized = strtoupper(trim($typeContrat ?? ''));
        return in_array($typeNormalized, ['CDI', 'CDD'], true);
    }
    private function calculateStatsForUsers($users, $dateRange, $isPermanent = null)
{
    Log::info('--- CALCUL STATS POUR ' . $users->count() . ' UTILISATEURS ---');
    $totalEffectif = 0;
    $totalHeures = 0.0;
    $totalHeuresSupp = 0.0;
    $dailyPresence = [];
    $joursFeries = JourFerie::whereBetween('date', [
        $dateRange['startDate']->format('Y-m-d'),
        $dateRange['endDate']->format('Y-m-d')
    ])->where('actif', true)->pluck('date')->map(fn($d)=>date('Y-m-d',strtotime($d)))->toArray();
    $currentDate = clone $dateRange['startDate'];
    while ($currentDate <= $dateRange['endDate']) {
        $dailyPresence[$currentDate->format('Y-m-d')] = 0;
        $currentDate->modify('+1 day');
    }
    foreach ($users as $user) {
        $userTotalHours = 0.0;
        $userHeuresSupp = 0.0;
        $hasWorked = false;
        $currentDate = clone $dateRange['startDate'];
        while ($currentDate <= $dateRange['endDate']) {
            $dateStr = $currentDate->format('Y-m-d');
            $dayOfWeek = (int)$currentDate->format('w');
            $isHoliday = in_array($dateStr, $joursFeries, true);
            $pointages = DB::table('pointages')
                ->where('user_id', $user->id)
                ->whereDate('date', $dateStr)
                ->get();
            $conge = DB::table('absence_requests')
                ->where('user_id', $user->id)
                ->whereIn('type', ['Congé', 'maladie'])
                ->where('statut', 'approuvé')
                ->whereDate('dateDebut', '<=', $dateStr)
                ->whereDate('dateFin', '>=', $dateStr)
                ->first();
            if (!$conge && $pointages->count() > 0) {
                $hasPresent = $pointages->contains(function($pt){
                    $st = strtolower(trim((string)($pt->statutJour ?? '')));
                    return in_array($st, ['present','retard'], true);
                });
                if ($hasPresent) {
                    $dailyHours = TimeCalculationService::computeDailyTotalHoursForTemporary($pointages);
                    $nightBaseHours = TimeCalculationService::calculateNightBaseHours($pointages);
                    if ($dailyHours > 0) {
                        $hasWorked = true;
                        $dailyPresence[$dateStr]++;
                        $userTotalHours += $dailyHours;
                        if ($isPermanent === true) {
                            // ✅ Permanents: HS si > 8h ET base nuit < 8h
                            if ($dailyHours > 8 && $nightBaseHours < 8) {
                                $userHeuresSupp += ($dailyHours - 8);
                            }
                        } elseif ($isPermanent === false) {
                            if ($dayOfWeek === 0 || $isHoliday) {
                                $userHeuresSupp += $dailyHours;
                            } elseif ($dailyHours > 9) {
                                $userHeuresSupp += ($dailyHours - 9);
                            }
                        } else {
                            // mixte fallback
                            if ($dailyHours > 8) {
                                $userHeuresSupp += ($dailyHours - 8);
                            }
                        }
                    }
                }
            }
            $currentDate->modify('+1 day');
        }
        if ($hasWorked) {
            $totalEffectif++;
            $totalHeures += $userTotalHours;
            $totalHeuresSupp += $userHeuresSupp;
        }
    }
    $totalJoursPresents = array_sum($dailyPresence);
    // ✅ Calculer le nombre RÉEL de jours dans la période (pas seulement les jours avec présence)
    $nbJoursPeriode = $dateRange['startDate']->diff($dateRange['endDate'])->days + 1; // +1 pour inclure le dernier jour
    $moyenneEffectifParJour = $nbJoursPeriode > 0 ? ($totalJoursPresents / $nbJoursPeriode) : 0;
    return [
        'totalEffectif' => $totalEffectif,
        'moyenneEffectifParJour' => $moyenneEffectifParJour,
        'totalHeures' => $totalHeures,
        'totalHeuresSupp' => $totalHeuresSupp,
        'moyenneHeuresParPersonne' => $totalEffectif > 0 ? ($totalHeures / $totalEffectif) : 0,
        'moyenneHeureParJour' => $nbJoursPeriode > 0 ? ($totalHeures / $nbJoursPeriode) : 0
    ];
}
    private function addRecapRow($sheet, $row, $typePoste, $stats, $style = 'default')
{
    $sheet->setCellValue('A' . $row, $typePoste);
    $sheet->setCellValue('B' . $row, $stats['totalEffectif']);
    $sheet->setCellValue('C' . $row, $stats['moyenneEffectifParJour']);
    $sheet->setCellValue('D' . $row, $stats['totalHeures']);
    $sheet->setCellValue('E' . $row, $stats['totalHeuresSupp']);
    $sheet->setCellValue('F' . $row, $stats['totalRecup'] ?? 0); // ✅ NEW
    $range = 'A' . $row . ':F' . $row; // ✅ 6 colonnes
    switch ($style) {
        case 'departement':
            $sheet->getStyle($range)->applyFromArray([
                'font' => ['bold' => false, 'color' => ['rgb' => '1B5E20']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E8F5E9']],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
            ]);
            break;
        case 'permanent':
            $sheet->getStyle($range)->applyFromArray([
                'font' => ['bold' => true, 'color' => ['rgb' => '1E88E5']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E3F2FD']],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THICK]]
            ]);
            break;
        case 'temporaire':
            $sheet->getStyle($range)->applyFromArray([
                'font' => ['bold' => true, 'color' => ['rgb' => '42A5F5']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E1F5FE']],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THICK]]
            ]);
            break;
        case 'total':
            $sheet->getStyle($range)->applyFromArray([
                'font' => ['bold' => true, 'color' => ['rgb' => '0D47A1']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E8EAF6']],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THICK]]
            ]);
            break;
        default:
            $sheet->getStyle($range)->applyFromArray([
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
            ]);
            break;
    }
}
    private function exportExcel($spreadsheet, $dateRange)
    {
        $filename = "Pointages_" . $dateRange['label'] . ".xlsx";
        $writer   = new Xlsx($spreadsheet);
        return response()->streamDownload(function () use ($writer, $spreadsheet) {
            while (ob_get_level() > 0) {
                ob_end_clean();
            }
            $writer->save('php://output');
            if (method_exists($spreadsheet, 'disconnectWorksheets')) {
                $spreadsheet->disconnectWorksheets();
            }
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'max-age=0, no-cache, no-store, must-revalidate',
            'Pragma' => 'public',
        ]);
    }
    public function exportPointages(Request $request)
    {
        return $this->export($request);
    }
    private function reorderSheets(Spreadsheet $spreadsheet, array $desiredOrder): void
    {
        // Position d'insertion courante
        $insertIndex = 0;
        foreach ($desiredOrder as $title) {
            $sheet = $spreadsheet->getSheetByName($title);
            if ($sheet) {
                // Mémoriser l'objet et son index actuel
                $currentIndex = $spreadsheet->getIndex($sheet);
                $sheetObj = $spreadsheet->getSheet($currentIndex);
                if ($currentIndex !== $insertIndex) {
                    // Retirer puis réinsérer à la position souhaitée
                    $spreadsheet->removeSheetByIndex($currentIndex);
                    $spreadsheet->addSheet($sheetObj, $insertIndex);
                }
                $insertIndex++;
            }
        }
        // Définir la première feuille active sur la première du classement si elle existe
        if (!empty($desiredOrder)) {
            foreach ($desiredOrder as $title) {
                $sheet = $spreadsheet->getSheetByName($title);
                if ($sheet) {
                    $spreadsheet->setActiveSheetIndex($spreadsheet->getIndex($sheet));
                    break;
                }
            }
        }
    }
    /* ===================== NOUVELLES FEUILLES DEMANDÉES ===================== */
    private function createNonAffectesSheet(Spreadsheet $spreadsheet, $societeId)
    {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Non Affectés');
        $users = DB::table('users')
            ->leftJoin('departements', 'users.departement_id', '=', 'departements.id')
            ->where('users.societe_id', $societeId)
            ->whereRaw('LOWER(COALESCE(users.statut, "")) != "inactif"')
            ->where(function($q){
                $q->whereNull('departements.nom')
                  ->orWhereRaw('TRIM(COALESCE(departements.nom, "")) = ""')
                  ->orWhereRaw('LOWER(TRIM(COALESCE(departements.nom, ""))) = "non assigné"')
                  ->orWhereRaw('LOWER(TRIM(COALESCE(departements.nom, ""))) = "non assigne"')
                  ->orWhereRaw('LOWER(TRIM(COALESCE(departements.nom, ""))) = "non affecté"')
                  ->orWhereRaw('LOWER(TRIM(COALESCE(departements.nom, ""))) = "non affecte"');
            })
            ->whereNotIn('users.id', $this->excludedUserIds)
            ->select('users.*','departements.nom as departement_nom')
            ->orderBy('users.name')
            ->get();
        $row = 1;
        $sheet->setCellValue('A'.$row, 'EMPLOYÉS NON AFFECTÉS À UN DÉPARTEMENT');
        $sheet->mergeCells('A'.$row.':H'.$row);
        $sheet->getStyle('A'.$row.':H'.$row)->applyFromArray([
            'font'=>['bold'=>true,'size'=>16],
            'alignment'=>['horizontal'=>Alignment::HORIZONTAL_CENTER],
            'fill'=>['fillType'=>Fill::FILL_SOLID,'startColor'=>['rgb'=>'FCE4D6']],
            'borders'=>['allBorders'=>['borderStyle'=>Border::BORDER_THICK]]
        ]);
        $row += 2;
        $headers = ['Matricule','Nom Complet','Fonction','Type Contrat','Statut','Date Embauche','Département (brut)','Téléphone'];
        foreach ($headers as $i=>$h) {
            $col = Coordinate::stringFromColumnIndex($i+1);
            $sheet->setCellValue($col.$row, $h);
        }
        $lastHeaderCol = Coordinate::stringFromColumnIndex(count($headers));
        $sheet->getStyle('A'.$row.':'.$lastHeaderCol.$row)->applyFromArray([
            'font'=>['bold'=>true,'color'=>['rgb'=>'FFFFFF']],
            'alignment'=>['horizontal'=>Alignment::HORIZONTAL_CENTER,'vertical'=>Alignment::VERTICAL_CENTER],
            'fill'=>['fillType'=>Fill::FILL_SOLID,'startColor'=>['rgb'=>'C55A11']],
            'borders'=>['allBorders'=>['borderStyle'=>Border::BORDER_THIN]]
        ]);
        $sheet->setAutoFilter('A'.$row.':'.$lastHeaderCol.($row + max(1,$users->count())));
        $row++;
        foreach ($users as $u) {
            $data = [
                $u->id,
                strtoupper(trim(($u->name ?? '').' '.($u->prenom ?? ''))),
                strtoupper($u->fonction ?? ''),
                strtoupper($u->typeContrat ?? ''),
                strtoupper($u->statut ?? ''),
                $u->dateEmbauche ?? '',
                strtoupper($u->departement_nom ?? ''),
                $u->telephone ?? $u->tel ?? $u->phone ?? ''
            ];
            $sheet->fromArray($data,null,'A'.$row);
            $fill = ($row % 2 ===0)?'F9F9F9':'FFFFFF';
            $sheet->getStyle('A'.$row.':'.$lastHeaderCol.$row)->applyFromArray([
                'borders'=>['allBorders'=>['borderStyle'=>Border::BORDER_THIN]],
                'fill'=>['fillType'=>Fill::FILL_SOLID,'startColor'=>['rgb'=>$fill]]
            ]);
            $row++;
        }
        for ($c=1;$c<=count($headers);$c++) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($c))->setAutoSize(true);
        }
        $sheet->freezePane('A4');
    }
    private function createListePersonnelSheet(Spreadsheet $spreadsheet, $societeId)
    {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Liste Personnel');
        $users = DB::table('users')
            ->leftJoin('departements','users.departement_id','=','departements.id')
            ->where('users.societe_id',$societeId)
            ->whereRaw('LOWER(COALESCE(users.statut, "")) != "inactif"')
            ->whereNot(function($q){
                $q->whereNull('departements.nom')
                  ->orWhereRaw('TRIM(COALESCE(departements.nom, "")) = ""')
                  ->orWhereRaw('LOWER(TRIM(COALESCE(departements.nom, ""))) = "non assigné"')
                  ->orWhereRaw('LOWER(TRIM(COALESCE(departements.nom, ""))) = "non assigne"')
                  ->orWhereRaw('LOWER(TRIM(COALESCE(departements.nom, ""))) = "non affecté"')
                  ->orWhereRaw('LOWER(TRIM(COALESCE(departements.nom, ""))) = "non affecte"');
            })
            // Afficher maintenant tous les rôles (suppression du filtre whereNotIn sur les rôles)
            ->whereNotIn('users.id', $this->excludedUserIds)
            ->select('users.*','departements.nom as departement_nom')
            ->orderBy('departements.nom')
            ->orderBy('users.name')
            ->get();
        $row = 1;
        $sheet->setCellValue('A'.$row,'LISTE DU PERSONNEL (AFFECTÉS)');
        // La fusion sera ajustée après définition des en-têtes si besoin (mis à jour plus bas)
        $sheet->mergeCells('A'.$row.':V'.$row); // couverture large
        $sheet->getStyle('A'.$row.':V'.$row)->applyFromArray([
            'font'=>['bold'=>true,'size'=>16],
            'alignment'=>['horizontal'=>Alignment::HORIZONTAL_CENTER],
            'fill'=>['fillType'=>Fill::FILL_SOLID,'startColor'=>['rgb'=>'D9EAD3']],
            'borders'=>['allBorders'=>['borderStyle'=>Border::BORDER_THICK]]
        ]);
        $row += 2;
        $headers = [
            'Matricule',          // 1
            'Nom Complet',        // 2 (full upper pour lisibilité)
            'CIN',                // 3
            'CNSS',               // 4
            'Email',              // 5
            'Rôle',               // 6
            'Fonction',           // 7
            'Département',        // 8
            'Type Contrat',       // 9
            'Statut',             // 10
            'Date Embauche',      // 11
            'Sexe',               // 12
            'Date Naissance',     // 13
            'Téléphone',          // 14
            'Adresse',            // 15
            'RIB',                // 16
            'Situation Familiale',// 17
            'NB Enfants',         // 18
            'Info Suppl. 1',      // 19
            'Info Suppl. 2'       // 20
        ];
        foreach ($headers as $i=>$h) {
            $col = Coordinate::stringFromColumnIndex($i+1);
            $sheet->setCellValue($col.$row,$h);
        }
        $lastCol = Coordinate::stringFromColumnIndex(count($headers));
        $sheet->getStyle('A'.$row.':'.$lastCol.$row)->applyFromArray([
            'font'=>['bold'=>true,'color'=>['rgb'=>'FFFFFF']],
            'alignment'=>['horizontal'=>Alignment::HORIZONTAL_CENTER,'vertical'=>Alignment::VERTICAL_CENTER],
            'fill'=>['fillType'=>Fill::FILL_SOLID,'startColor'=>['rgb'=>'2F5597']],
            'borders'=>['allBorders'=>['borderStyle'=>Border::BORDER_THIN]]
        ]);
        $sheet->setAutoFilter('A'.$row.':'.$lastCol.($row + max(1,$users->count())));
        $row++;
        foreach ($users as $u) {
            $fullName = strtoupper(trim(($u->name ?? '').' '.($u->prenom ?? '')));
            $data = [
                $u->id,                                                   // Matricule
                $fullName,                                                // Nom Complet
                strtoupper($u->cin ?? ''),                                // CIN
                strtoupper($u->cnss ?? ''),                               // CNSS
                strtolower($u->email ?? ''),                              // Email
                strtoupper($u->role ?? ''),                               // Rôle
                strtoupper($u->fonction ?? ''),                           // Fonction
                strtoupper($u->departement_nom ?? ''),                    // Département
                strtoupper($u->typeContrat ?? ''),                        // Type Contrat
                strtoupper($u->statut ?? ''),                             // Statut
                $u->dateEmbauche ?? '',                                   // Date Embauche
                strtoupper($u->sex ?? ''),                                // Sexe
                $u->date_naissance ?? '',                                 // Date Naissance
                $u->telephone ?? $u->tel ?? $u->phone ?? '',              // Téléphone
                strtoupper($u->adresse ?? $u->address ?? ''),             // Adresse
                strtoupper($u->rib ?? ''),                                // RIB
                strtoupper($u->situationFamiliale ?? $u->situation_familiale ?? ''), // Situation Familiale
                $u->nbEnfants ?? '',                                      // NB Enfants
                strtoupper($u->information_supplementaire ?? ''),         // Info Suppl. 1
                strtoupper($u->information_supplementaire2 ?? ''),        // Info Suppl. 2
            ];
            $sheet->fromArray($data,null,'A'.$row);
            $fill = ($row % 2 === 0)?'F2F2F2':'FFFFFF';
            $sheet->getStyle('A'.$row.':'.$lastCol.$row)->applyFromArray([
                'borders'=>['allBorders'=>['borderStyle'=>Border::BORDER_THIN]],
                'fill'=>['fillType'=>Fill::FILL_SOLID,'startColor'=>['rgb'=>$fill]]
            ]);
            $row++;
        }
        for ($c=1;$c<=count($headers);$c++) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($c))->setAutoSize(true);
        }
        $sheet->freezePane('A4');
    }
    private function addDetailedPermanentTable($sheet, &$row, $permanentUsers, $dateRange)
{
    $sheet->setCellValue('A' . $row, 'DÉTAIL DES HEURES PAR EMPLOYÉ PERMANENT');
    $sheet->mergeCells('A' . $row . ':F' . $row);
    $sheet->getStyle('A' . $row . ':F' . $row)->applyFromArray([
        'font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => '1565C0']],
        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E8F4FD']],
        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
    ]);
    $row++;
    $detailHeaders = ['MATRICULE','NOM & PRÉNOM','FONCTION','TOTAL HEURES','HEURES SUPP','STATUS'];
    $detailHeaders = array_map(fn($h) => $this->replaceTotalWord($h), $detailHeaders);
    foreach ($detailHeaders as $index => $header) {
        $sheet->setCellValue(chr(65 + $index) . $row, $header);
    }
    $sheet->getStyle('A' . $row . ':F' . $row)->applyFromArray([
        'font' => ['bold' => true, 'size' => 10, 'color' => ['rgb' => 'FFFFFF']],
        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4472C4']],
        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
    ]);
    $row++;
    $joursFeries = JourFerie::whereBetween('date', [
        $dateRange['startDate']->format('Y-m-d'),
        $dateRange['endDate']->format('Y-m-d')
    ])->where('actif', true)->pluck('date')->map(fn($d)=>date('Y-m-d',strtotime($d)))->toArray();
    $totalHeuresGlobal = 0.0;
    $totalSuppGlobal = 0.0;
    $compteurUtilisateurs = 0;
    foreach ($permanentUsers as $user) {
        $userTotalHours = 0.0;
        $userHeuresSupp = 0.0;
        $hasWorked = false;
        $currentDate = clone $dateRange['startDate'];
        while ($currentDate <= $dateRange['endDate']) {
            $dateStr = $currentDate->format('Y-m-d');
            $conge = DB::table('absence_requests')
                ->where('user_id', $user->id)
                ->whereIn('type', ['Congé', 'maladie'])
                ->where('statut', 'approuvé')
                ->whereDate('dateDebut', '<=', $dateStr)
                ->whereDate('dateFin', '>=', $dateStr)
                ->first();
            if (!$conge) {
                $pointages = DB::table('pointages')
                    ->where('user_id', $user->id)
                    ->whereDate('date', $dateStr)
                    ->get();
                if ($pointages->count() > 0 && $pointages->contains(function($pt){
                    $stRaw = (string)($pt->statutJour ?? '');
                    return preg_match('/pr[eé]sent|retard/i', $stRaw) === 1;
                })) {
                    $dailyHours = TimeCalculationService::computeDailyTotalHoursForTemporary($pointages);
                    $nightBaseHours = TimeCalculationService::calculateNightBaseHours($pointages);
                    if ($dailyHours > 0) {
                        $hasWorked = true;
                        $userTotalHours += $dailyHours;
                        // ✅ Permanents: HS si > 8h ET base nuit < 8h
                        if ($dailyHours > 8 && $nightBaseHours < 8) {
                            $userHeuresSupp += ($dailyHours - 8);
                        }
                    }
                }
            }
            $currentDate->modify('+1 day');
        }
        if ($hasWorked) {
            $compteurUtilisateurs++;
            $totalHeuresGlobal += $userTotalHours;
            $totalSuppGlobal += $userHeuresSupp;
            $fullName = strtoupper(trim(($user->name ?? '') . ' ' . ($user->prenom ?? '')));
            $data = [
                $user->id,
                $fullName,
                strtoupper($user->fonction ?? ''),
                $userTotalHours,
                $userHeuresSupp,
                '✓ Travaillé'
            ];
            $sheet->fromArray($data, null, 'A' . $row);
            $fillColor = ($row % 2 === 0) ? 'F9F9F9' : 'FFFFFF';
            $sheet->getStyle('A' . $row . ':F' . $row)->applyFromArray([
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $fillColor]],
                'alignment' => ['vertical' => Alignment::VERTICAL_CENTER]
            ]);
            $row++;
        }
    }
    // Total
    $sheet->setCellValue('A' . $row, 'TOTAL (' . $compteurUtilisateurs . ' employés)');
    $sheet->setCellValue('B' . $row, '');
    $sheet->setCellValue('C' . $row, '');
    $sheet->setCellValue('D' . $row, $totalHeuresGlobal);
    $sheet->setCellValue('E' . $row, $totalSuppGlobal);
    $sheet->setCellValue('F' . $row, 'TOTAL');
    $sheet->getStyle('A' . $row . ':F' . $row)->applyFromArray([
        'font' => ['bold' => true],
        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E2EFDA']],
        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THICK]]
    ]);
    $row++;
    foreach (range('A', 'F') as $col) {
        $sheet->getColumnDimension($col)->setAutoSize(true);
    }
}
    /**
     * ✅ NOUVEAU: Ajouter une table détaillée des données brutes utilisées pour les calculs du récap
     */
    private function addDetailedDataTable($sheet, &$row, $detailedData, $dateRange)
    {
        // Titre de la section
        $row += 2;
        $sheet->setCellValue('A' . $row, 'DONNÉES BRUTES UTILISÉES POUR LES CALCULS - ' . strtoupper($dateRange['label']));
        $sheet->mergeCells('A' . $row . ':G' . $row);
        $sheet->getStyle('A' . $row . ':G' . $row)->applyFromArray([
            'font' => ['bold' => true, 'size' => 14, 'color' => ['rgb' => 'FFFFFF']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FF6B35']],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THICK]]
        ]);
        $row += 2;
        // En-têtes de la table détaillée
        $detailedHeaders = [
            'DÉPARTEMENT',
            'NOM EMPLOYÉ',
            'TYPE CONTRAT',
            'CATÉGORIE',
            'JOURS TRAVAILLÉS',
            'HEURES TOTALES',
            'HEURES SUPP',
            'JOURS RÉCUP'
        ];
        foreach ($detailedHeaders as $i => $header) {
            $sheet->setCellValue(chr(65 + $i) . $row, $header);
        }
        $sheet->getStyle('A' . $row . ':H' . $row)->applyFromArray([
            'font' => ['bold' => true, 'size' => 11, 'color' => ['rgb' => 'FFFFFF']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '5B9BD5']],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
        ]);
        $row++;
        // Trier les données par département puis par nom
        usort($detailedData, function($a, $b) {
            $deptCompare = strcmp($a['departement'] ?? '', $b['departement'] ?? '');
            if ($deptCompare !== 0) return $deptCompare;
            return strcmp($a['nom'] ?? '', $b['nom'] ?? '');
        });
        // Ajouter les lignes de données
        $currentDept = '';
        $totals = [
            'jours_travailles' => 0,
            'heures_totales' => 0,
            'heures_supp' => 0,
            'jours_recup' => 0
        ];
        foreach ($detailedData as $data) {
            // Changement de département - ajouter une ligne visuelle
            if ($currentDept !== '' && $currentDept !== $data['departement']) {
                $sheet->getStyle('A' . ($row - 1) . ':H' . ($row - 1))->applyFromArray([
                    'borders' => ['bottom' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['rgb' => '4472C4']]]
                ]);
            }
            $currentDept = $data['departement'];
            $sheet->setCellValue('A' . $row, $data['departement'] ?? '');
            $sheet->setCellValue('B' . $row, $data['nom'] ?? '');
            $sheet->setCellValue('C' . $row, $data['type_contrat'] ?? '');
            $sheet->setCellValue('D' . $row, $data['is_permanent'] ?? '');
            $sheet->setCellValue('E' . $row, $data['jours_travailles'] ?? 0);
            $sheet->setCellValue('F' . $row, $data['heures_totales'] ?? 0);
            $sheet->setCellValue('G' . $row, $data['heures_supp'] ?? 0);
            $sheet->setCellValue('H' . $row, $data['jours_recup'] ?? 0);
            // Style alterné pour faciliter la lecture
            $fillColor = ($row % 2 === 0) ? 'F2F2F2' : 'FFFFFF';
            $sheet->getStyle('A' . $row . ':H' . $row)->applyFromArray([
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $fillColor]],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'D0D0D0']]]
            ]);
            // Couleur de catégorie
            $categoryColor = ($data['is_permanent'] === 'Permanent') ? 'E3F2FD' : 'FFF3E0';
            $sheet->getStyle('D' . $row)->applyFromArray([
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $categoryColor]],
                'font' => ['bold' => true]
            ]);
            // Accumuler les totaux
            $totals['jours_travailles'] += ($data['jours_travailles'] ?? 0);
            $totals['heures_totales'] += ($data['heures_totales'] ?? 0);
            $totals['heures_supp'] += ($data['heures_supp'] ?? 0);
            $totals['jours_recup'] += ($data['jours_recup'] ?? 0);
            $row++;
        }
        // Ligne de totaux
        if (count($detailedData) > 0) {
            $row++;
            $sheet->setCellValue('A' . $row, 'TOTAL');
            $sheet->mergeCells('A' . $row . ':D' . $row);
            $sheet->setCellValue('E' . $row, $totals['jours_travailles']);
            $sheet->setCellValue('F' . $row, round($totals['heures_totales'], 2));
            $sheet->setCellValue('G' . $row, round($totals['heures_supp'], 2));
            $sheet->setCellValue('H' . $row, $totals['jours_recup']);
            $sheet->getStyle('A' . $row . ':H' . $row)->applyFromArray([
                'font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => 'FFFFFF']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4472C4']],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THICK]]
            ]);
        }
        // Auto-size pour les colonnes de la table détaillée
        foreach (range('A', 'H') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
        // Format numérique
        if (count($detailedData) > 0) {
            $dataStartRow = $row - count($detailedData) - 1;
            $this->formatRange($sheet, 'E' . $dataStartRow . ':H' . $row, 2);
        }
        Log::info('✅ Table de données brutes ajoutée avec ' . count($detailedData) . ' lignes');
    }
    /**
     * Vérifier si un utilisateur a des pointages dans la période donnée
     */
    private function hasPointagesInPeriod($userId, $dateRange)
    {
        return TimeCalculationService::hasPointagesInPeriod((int)$userId, $dateRange);
    }
    /**
     * Fonction de test pour vérifier la détection des pointages de nuit
     * À utiliser pour debugging si nécessaire
     */
    public function testNightShiftDetection($userId, $dateRange)
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
    $grouped = TimeCalculationService::groupNightShiftPointages($pointages, $userId, $dateRange);
        return [
            'original_count' => count($pointages),
            'grouped_count' => count($grouped),
            'original_pointages' => $pointages,
            'grouped_pointages' => $grouped,
            'night_shifts_detected' => count($pointages) - count($grouped)
        ];
    }
}
