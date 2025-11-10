<?php
namespace App\Http\Controllers;
use Illuminate\Support\Facades\Schema;
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
use App\Services\TimeCalculationService;
use App\Services\PresenceSheetService;
use DateTime;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
class SalaryExportController extends Controller
{
    // Cache des statistiques des temporaires (heures totales, heures supp, jours travaillés)
    private array $temporaryStats = [];
    // Fonction d'arrondi personnalisée : si décimale >= 0.5 arrondir vers le haut, sinon supprimer la décimale
 private function formatRange($sheet, string $range, int $decimals = 0): void
{
   $nbsp = "\xC2\xA0"; // espace insécable
    $fmt = $decimals > 0
        ? "[$-fr-FR] #{$nbsp}##0." . str_repeat('0', $decimals)
        : "[$-fr-FR] #{$nbsp}##0";
    $sheet->getStyle($range)->getNumberFormat()->setFormatCode($fmt);
}

// --- Helpers requis par createRecapSheet ---
/** @var \PhpOffice\PhpSpreadsheet\Spreadsheet|null */
private ?\PhpOffice\PhpSpreadsheet\Spreadsheet $currentSpreadsheet = null;

private function col(int $n): string
{
    return \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($n);
}

private function spreadsheetHasSheetNamed($spreadsheet, string $name): ?\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet
{
    if (!$spreadsheet) return null;
    $sheet = $spreadsheet->getSheetByName($name);
    return $sheet ?: null;
}

/**
 * Début des colonnes de jours de présence (mapping fixe, aligné avec MonthlyPresenceExportController)
 * Permanents: A=Nom, B=Fonction, C=Département => présence en colonne 4 (D)
 * Temporaires: A=Nom, B=Prénom, C=Fonction, D=Département => présence en colonne 5 (E)
 */
private function presenceStartCol(bool $isPermanent): int
{
    return $isPermanent ? 4 : 5;
}



    // Fonction pour formater les nombres avec séparateur de milliers
    // Fonction pour déterminer si un utilisateur est permanent
    private function isPermanent($user)
    {
        $typeContrat = strtolower(trim($user->typeContrat ?? ''));
        return in_array($typeContrat, ['permanent', 'permanente', 'cdi', 'indéterminée', 'indeterminee']) ||
               str_contains($typeContrat, 'permanent') ||
               str_contains($typeContrat, 'cdi');
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
        $userAuth = Auth::user();
        // Vérification des rôles pour l'accès aux feuilles salaires
        $userRoleRaw = (string)($userAuth->role ?? '');
        $userRole = strtolower(trim($userRoleRaw));
        $spatieRoles = [];
        if (method_exists($userAuth, 'getRoleNames')) {
            try {
                $spatieRoles = $userAuth->getRoleNames()->map(fn($r)=>strtolower(trim($r)))->toArray();
            } catch (\Throwable $e) {
                Log::warning('Impossible de récupérer les rôles Spatie', ['err'=>$e->getMessage()]);
            }
        }
        // Vérifier l'accès aux feuilles salaires
        $exclusionList = ['gest_rh','rh_manager'];
        $shouldExclude = in_array($userRole, $exclusionList, true) || count(array_intersect($exclusionList, $spatieRoles))>0;
        if ($shouldExclude) {
            return response()->json(['error' => 'Accès non autorisé aux données de salaires'], 403);
        }
        $spreadsheet = new Spreadsheet();
        
        // Récupérer les filtres optionnels
        $departementId = $request->input('departement_id') ? (int)$request->input('departement_id') : null;
        $userId = $request->input('user_id') ? (int)$request->input('user_id') : null;
        
        /* ===================== FEUILLES PRÉSENCE (même logique que Monthly) ===================== */
        $presenceController = new MonthlyPresenceExportController();
        $excludedUserIds = [80, 265, 270, 271]; // Mêmes exclusions que MonthlyPresenceExportController
        $presenceService = new \App\Services\PresenceUserService();
        $presenceCollections = $presenceService->getPresenceUserCollections(
            $userAuth->societe_id,
            $excludedUserIds,
            $departementId,
            $userId
        );
        $presenceCallbacks = $presenceController->getPresenceCallbacks();
        $sheetService = new PresenceSheetService();
        $sheetService->createPermanentSheet($spreadsheet, $dateRange, $presenceCollections['permanent'], $presenceCallbacks);
        $sheetService->createTemporarySheet($spreadsheet, $dateRange, $presenceCollections['temporary'], $presenceCallbacks);
        /* ===================== FEUILLE SALAIRE PERMANENTS ===================== */
        $this->createSalairePermanentSheet($spreadsheet, $userAuth->societe_id, $dateRange, $presenceCollections['permanent']);
        /* ===================== FEUILLE SALAIRE TEMPORAIRES ===================== */
        $this->createSalaireTemporaireSheet($spreadsheet, $userAuth->societe_id, $dateRange, $presenceCollections['temporary']);
        /* ===================== FEUILLE RECAP CHARGE PERSONNEL ===================== */
        // Ne pas créer les récaps si un département OU un utilisateur est sélectionné
        if (!$userId && !$departementId) {
            $this->createRecapChargePersonnelSheet($spreadsheet, $userAuth->societe_id, $dateRange);
            $this->currentSpreadsheet = $spreadsheet;
            $this->createRecapSheet($spreadsheet, $userAuth->societe_id, $dateRange, $departementId, $userId);
        }
        
        // Si un utilisateur spécifique est sélectionné, masquer les feuilles non pertinentes selon son type
        if ($userId) {
            $user = \DB::table('users')->where('id', $userId)->first();
            if ($user) {
                $isPermanent = $this->isPermanent($user);
                
                // Masquer les feuilles selon le type d'employé
                if ($isPermanent) {
                    // Employé permanent: masquer les feuilles temporaires
                    $tempPresenceSheet = $spreadsheet->getSheetByName('Employés Temporaires');
                    $tempSalaireSheet = $spreadsheet->getSheetByName('Salaire Temporaire');
                    if ($tempPresenceSheet) $tempPresenceSheet->setSheetState(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet::SHEETSTATE_HIDDEN);
                    if ($tempSalaireSheet) $tempSalaireSheet->setSheetState(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet::SHEETSTATE_HIDDEN);
                } else {
                    // Employé temporaire: masquer les feuilles permanentes
                    $permPresenceSheet = $spreadsheet->getSheetByName('Employés Permanents');
                    $permSalaireSheet = $spreadsheet->getSheetByName('Salaire Permanent');
                    if ($permPresenceSheet) $permPresenceSheet->setSheetState(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet::SHEETSTATE_HIDDEN);
                    if ($permSalaireSheet) $permSalaireSheet->setSheetState(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet::SHEETSTATE_HIDDEN);
                }
            }
        }
        
        return $this->exportExcel($spreadsheet, $dateRange, 'Salaires');
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
    private function createSalairePermanentSheet($spreadsheet, $societeId, $dateRange, $permanentUsersCollection = null)
    {
        $sheet = new Worksheet($spreadsheet, 'Salaire Permanent');
        $spreadsheet->addSheet($sheet);
        $spreadsheet->setActiveSheetIndex($spreadsheet->getIndex($sheet));
        
        // Si une collection filtrée est fournie, l'utiliser directement
        if ($permanentUsersCollection !== null) {
            // Enrichir avec les données de salaires
            $userIds = $permanentUsersCollection->pluck('id')->toArray();
            $salaires = DB::table('salaires')
                ->whereIn('user_id', $userIds)
                ->select('user_id', DB::raw('MAX(salaire_base) as salaire_base'), DB::raw('MAX(salaire_net) as salaire_net'))
                ->groupBy('user_id')
                ->get()
                ->keyBy('user_id');
            
            $employes = $permanentUsersCollection->map(function($user) use ($salaires) {
                $salaire = $salaires->get($user->id);
                $user->salaire_base = $salaire->salaire_base ?? null;
                $user->salaire_net = $salaire->salaire_net ?? null;
                return $user;
            })->filter(function($user) use ($dateRange) {
                $statutGlobal = strtolower(trim((string)($user->statut ?? '')));
                if ($statutGlobal === 'inactif') {
                    return $this->hasPointagesInPeriod($user->id, $dateRange);
                }
                return true;
            });
        } else {
            // Comportement par défaut (legacy): récupérer tous les employés permanents
            $allEmployes = DB::table('users')
                ->leftJoin('departements', 'users.departement_id', '=', 'departements.id')
                ->leftJoin('salaires', 'users.id', '=', 'salaires.user_id')
                ->where('users.societe_id', $societeId)
                ->where(function($query) {
                    $query->whereIn(DB::raw('LOWER(TRIM(COALESCE(users.typeContrat, "")))'), 
                        ['permanent', 'permanente', 'cdi', 'indéterminée', 'indeterminee'])
                          ->orWhere('users.typeContrat', 'LIKE', '%permanent%')
                          ->orWhere('users.typeContrat', 'LIKE', '%CDI%');
                })
                ->select(
                    'users.id', 'users.name', 'users.prenom', 'users.fonction','users.statut',
                    DB::raw('MAX(salaires.salaire_base) as salaire_base'),
                    DB::raw('MAX(salaires.salaire_net) as salaire_net'),
                    'departements.nom as departement_nom'
                )
                ->groupBy('users.id','users.name','users.prenom','users.fonction','users.statut','departements.nom')
                ->orderBy('users.name')
                ->get();
            // Filtrer les employés : actifs + inactifs avec pointages dans la période
            $employes = $allEmployes->filter(function($user) use ($dateRange) {
                $statutGlobal = strtolower(trim((string)($user->statut ?? '')));
                if ($statutGlobal === 'inactif') {
                    return $this->hasPointagesInPeriod($user->id, $dateRange);
                }
                return true; // Utilisateurs actifs
            });
        }
        // Titre principal
        $row = 1;
        $sheet->setCellValue('A' . $row, 'SALAIRES EMPLOYÉS PERMANENTS');
        $sheet->mergeCells('A' . $row . ':Q' . $row);
        $sheet->getStyle('A' . $row . ':Q' . $row)->applyFromArray([
            'font' => ['bold' => true, 'size' => 16],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'D9EAD3']],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THICK]]
        ]);
        $row += 2;
        // En-têtes principales (ligne 3)
        $sheet->setCellValue('A3', 'MATRICULES');
        $sheet->setCellValue('B3', 'NOMS ET PRÉNOMS');
        $sheet->setCellValue('C3', 'FONCTION');
        $sheet->setCellValue('D3', 'DÉPARTEMENT');
        $sheet->setCellValue('E3', 'TOTAL JOURS TRAVAILLÉS');
        $sheet->setCellValue('F3', 'CONGÉ');
        // Fusionner la cellule "Salaires" (G3:J3)
        $sheet->mergeCells('G3:J3');
        $sheet->setCellValue('G3', 'SALAIRES');
        // Fusionner "Prime d'ancienneté" (K3)
        $sheet->setCellValue('K3', "PRIME D'ANCIENNETÉ");
        // Fusionner "Primes et indemnités" (L3:O3)
        $sheet->mergeCells('L3:O3');
        $sheet->setCellValue('L3', 'PRIMES ET INDEMNITÉS');
        // Fusionner "CNSS Parts patronales" (P3:Q3)
        $sheet->mergeCells('P3:Q3');
        $sheet->setCellValue('P3', 'CNSS PARTS PATRONALES');
    $sheet->setCellValue('R3', 'COÛT TOTAL PAR SALARIÉS');
    $sheet->setCellValue('S3', 'SALAIRE NET TOTAL');
    // Colonnes helpers cachées pour heures mensuelles (permanents) afin d'alimenter les récapitulatifs
    $sheet->setCellValue('T3', 'HN MOIS');
    $sheet->setCellValue('U3', 'HS MOIS');
        // Sous-en-têtes (ligne 4)
        $sheet->setCellValue('A4', ''); // Matricules
        $sheet->setCellValue('B4', ''); // Noms
        $sheet->setCellValue('C4', ''); // Fonction
        $sheet->setCellValue('D4', ''); // Département
        $sheet->setCellValue('E4', ''); // Total Jours
        $sheet->setCellValue('F4', ''); // Congé
        // Sous-cellules pour "Salaires"
        $sheet->setCellValue('G4', 'SALAIRE NET 26J');
        $sheet->setCellValue('H4', 'SALAIRE DE BASE');
        $sheet->setCellValue('I4', 'JOURNALIERS');
        $sheet->setCellValue('J4', 'MENSUELS');
        $sheet->setCellValue('K4', ''); // Prime ancienneté
        // Sous-cellules pour "Primes et indemnités"
        $sheet->setCellValue('L4', 'PANIER');
        $sheet->setCellValue('M4', 'REPRÉSENT.');
        $sheet->setCellValue('N4', 'TRANSP.');
        $sheet->setCellValue('O4', 'DÉPLACEMENT');
        // Sous-cellules pour "CNSS Parts patronales"
        $sheet->setCellValue('P4', '8.98%');
        $sheet->setCellValue('Q4', '12.11%');
    $sheet->setCellValue('R4', ''); // Coût total
    $sheet->setCellValue('S4', ''); // Salaire net total
    $sheet->setCellValue('T4', ''); // HN helper
    $sheet->setCellValue('U4', ''); // HS helper
        // Fusionner les cellules qui n'ont pas de sous-cellules (de ligne 3 à 4)
        $sheet->mergeCells('A3:A4');
        $sheet->mergeCells('B3:B4');
        $sheet->mergeCells('C3:C4');
        $sheet->mergeCells('D3:D4');
        $sheet->mergeCells('E3:E4');
        $sheet->mergeCells('F3:F4');
        $sheet->mergeCells('K3:K4');
        $sheet->mergeCells('R3:R4');
        $sheet->mergeCells('S3:S4');
        // Style des en-têtes
        $sheet->getStyle('A3:U4')->applyFromArray([
            'font' => ['bold' => true, 'size' => 10],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER
            ],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E8F4FD']],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
        ]);
        // Ajouter AutoFilter pour les en-têtes
    $sheet->setAutoFilter('A4:S4');
        $row = 5;
        
        // Calculer les colonnes dynamiques pour les permanents dans 'Employés Permanents'
        // Structure : A=Nom, B=Fonction, C=Département, puis présence à partir de colonne 4 (D)
        $permPresenceStart = 4;
        $permPresenceEnd = $permPresenceStart + $dateRange['totalDays'] - 1;
        $permTotalsStart = $permPresenceEnd + 1;
        // Colonne Total Jours Travaillés = +3 (Absences +0, Jour Recup +1, Congés +2, Total Jours +3)
        $permColJoursTrav = $permTotalsStart + 3;
        // Convertir en lettre de colonne
        $permColJoursTravLetter = Coordinate::stringFromColumnIndex($permColJoursTrav);
        
        // Ajouter les données des employés
        foreach ($employes as $emp) {
            // Calculer les jours travaillés et congés pour cet employé
            $statsEmploye = $this->calculateEmployeeStats($emp->id, $dateRange);
            // Normaliser le libellé département pour cohérence avec Monthly (UPPER TRIM, fallback NON AFFECTÉ)
            $deptLabel = strtoupper(trim((string)($emp->departement_nom ?? '')));
            if ($deptLabel === '' || $deptLabel === 'NON DEFINI' || $deptLabel === 'NON DÉFINI' || $deptLabel === 'NON-DEFINI') {
                $deptLabel = 'NON AFFECTÉ';
            }
            // Formule XLOOKUP avec colonne DYNAMIQUE
            $formulaJoursTravailles = sprintf(
                "=IFERROR(XLOOKUP(B%d,'Employés Permanents'!A:A,'Employés Permanents'!%s:%s,0),0)",
                $row,
                $permColJoursTravLetter,
                $permColJoursTravLetter
            );
            $data = [
                $emp->id, // Matricule
                strtoupper(trim(($emp->name ?? '') . ' ' . ($emp->prenom ?? ''))), // Noms et prénoms
                $emp->fonction ?? '', // Fonction
                $deptLabel, // Département (normalisé)
                null,
                $statsEmploye['conges'], // Congé
                ($emp->salaire_net ?? 0), // Salaire net 26j (valeur brute)
                ($emp->salaire_base ?? 0), // Salaire de base (valeur brute)
                '', // Journaliers (colonne vide)
                '', // Mensuels (colonne vide)
                '', // Prime d'ancienneté (colonne vide)
                '', // Panier (colonne vide)
                '', // Représentation (colonne vide)
                '', // Transport (colonne vide)
                '', // Déplacement (colonne vide)
                '', // CNSS 8.98% (colonne vide)
                '', // CNSS 12.11% (colonne vide)
                ''  // Coût total (colonne vide)
            ];
            $sheet->fromArray($data, null, 'A' . $row);
            $sheet->setCellValue('E' . $row, $formulaJoursTravailles);

            // Calculer HN/HS mensuels (logique Monthly) et les poser dans S/T (helpers cachés)
            $permanentStats = $this->getDataFromMonthlyExport($emp, $dateRange, true);
            $hn = max(0, ($permanentStats['total_heures'] ?? 0) - ($permanentStats['heures_supp'] ?? 0));
            $hs = max(0, ($permanentStats['heures_supp'] ?? 0));
            // Colonne S: Salaire net total calculé
            // Formule qui calcule le salaire réel en fonction des jours travaillés
            $sheet->setCellValue('S'.$row, "=IF(E{$row}>0, G{$row}*E{$row}/26, G{$row})");
            // Colonnes T et U: helpers cachés pour HN/HS
            $sheet->setCellValue('T'.$row, $hn);
            $sheet->setCellValue('U'.$row, $hs);
            // Style alterné pour les lignes
            $fillColor = ($row % 2 === 0) ? 'F9F9F9' : 'FFFFFF';
            $sheet->getStyle('A' . $row . ':S' . $row)->applyFromArray([
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $fillColor]],
                'alignment' => ['vertical' => Alignment::VERTICAL_CENTER]
            ]);
            $row++;
        }
        // Appliquer format d'affichage (display-only)
        $firstDataRow = 5;
        $lastDataRow  = $row - 1;
        if ($lastDataRow >= $firstDataRow) {
            // E (jours) et F (congé) en entier
            $this->formatRange($sheet, 'E' . $firstDataRow . ':F' . $lastDataRow, 0);
            // G (salaire net) et H (salaire base) en entier avec séparateur
            $this->formatRange($sheet, 'G' . $firstDataRow . ':H' . $lastDataRow, 0);
            // R (coût total) si rempli plus tard, garder format entier
            $this->formatRange($sheet, 'R' . $firstDataRow . ':R' . $lastDataRow, 0);
            // S (Salaire net total) format entier
            $this->formatRange($sheet, 'S' . $firstDataRow . ':S' . $lastDataRow, 0);
            // Helpers HN/HS cachés
            $this->formatRange($sheet, 'T' . $firstDataRow . ':U' . $lastDataRow, 0);
        }
        // Auto-ajuster les colonnes
        foreach (range('A', 'S') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
        // Cacher les colonnes helpers T et U (HN/HS)
        $sheet->getColumnDimension('T')->setVisible(false);
        $sheet->getColumnDimension('U')->setVisible(false);
        $sheet->freezePane('A5');
    }
    private function createSalaireTemporaireSheet($spreadsheet, $societeId, $dateRange, $temporaryUsersCollection = null)
    {
        $sheet = new Worksheet($spreadsheet, 'Salaire Temporaire');
        $spreadsheet->addSheet($sheet);
        $spreadsheet->setActiveSheetIndex($spreadsheet->getIndex($sheet));
        
        // Si une collection filtrée est fournie, l'utiliser
        if ($temporaryUsersCollection !== null) {
            $rawTemporaires = $temporaryUsersCollection->filter(function($user) use ($dateRange) {
                $statutGlobal = strtolower(trim((string)($user->statut ?? '')));
                if ($statutGlobal === 'inactif') {
                    return $this->hasPointagesInPeriod($user->id, $dateRange);
                }
                return true;
            });
        } else {
            // Comportement par défaut (legacy)
            $allTemporaires = DB::table('users')
                ->where('users.societe_id', $societeId)
                ->get()
                ->filter(function($u){ return !$this->isPermanent($u); });
            // Filtrer les temporaires : actifs + inactifs avec pointages dans la période
            $rawTemporaires = $allTemporaires->filter(function($user) use ($dateRange) {
                $statutGlobal = strtolower(trim((string)($user->statut ?? '')));
                if ($statutGlobal === 'inactif') {
                    return $this->hasPointagesInPeriod($user->id, $dateRange);
                }
                return true; // Utilisateurs actifs
            });
        }
        $ids = $rawTemporaires->pluck('id')->all();
        $employes = collect();
        if (!empty($ids)) {
            // Utiliser le service pour déterminer les utilisateurs avec au moins un statut présent/retard
            $presentUserIds = [];
            foreach ($ids as $uid) {
                $pts = TimeCalculationService::getUserPointagesGrouped((int)$uid, $dateRange);
                foreach ($pts as $p) {
                    $st = strtolower(trim((string)($p->statutJour ?? '')));
                    if (preg_match('/pr[eé]sent|retard/i', $st)) { $presentUserIds[] = $uid; break; }
                }
            }
            if (!empty($presentUserIds)) {
                $employes = DB::table('users')
                    ->leftJoin('departements', 'users.departement_id', '=', 'departements.id')
                    ->leftJoin('salaires', 'users.id', '=', 'salaires.user_id')
                    ->whereIn('users.id', $presentUserIds)
                    ->select(
                        'users.id','users.name','users.prenom','users.fonction','users.statut',
                        DB::raw('MAX(salaires.salaire_base) as salaire_base'),
                        DB::raw('MAX(COALESCE(salaires.panier,0)) as panier'),
                        'departements.nom as departement_nom'
                    )
                    ->groupBy('users.id','users.name','users.prenom','users.fonction','users.statut','departements.nom')
                    ->orderBy('users.name')
                    ->get();
            }
        }
        // Titre principal
        $row = 1;
        $sheet->setCellValue('A' . $row, 'SALAIRES EMPLOYÉS TEMPORAIRES');
        $sheet->mergeCells('A' . $row . ':K' . $row);
        $sheet->getStyle('A' . $row . ':K' . $row)->applyFromArray([
            'font' => ['bold' => true, 'size' => 16],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'D9EAD3']],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THICK]]
        ]);
        $row += 2;
        // Ligne 3 (grandes cellules)
        // A: Nom & Prénom (fusion A3:A4), B: Fonction (fusion B3:B4)
        $sheet->setCellValue('A3', 'NOM ET PRÉNOM');
        $sheet->mergeCells('A3:A4');
        $sheet->setCellValue('B3', 'FONCTION');
        $sheet->mergeCells('B3:B4');
    // C: DEPARTEMENT (fusion C3:C4)
    $sheet->setCellValue('C3', 'DÉPARTEMENT');
    $sheet->mergeCells('C3:C4');
    // D-G: DÉTAIL DES HEURES -> Sous: Heures Normales / HS 25 / HS 50 / Total Heures
    $sheet->mergeCells('D3:G3');
    $sheet->setCellValue('D3', 'DÉTAIL DES HEURES');
    $sheet->setCellValue('D4', 'HEURES NORMALES');
    $sheet->setCellValue('E4', 'HS 25');
    $sheet->setCellValue('F4', 'HS 50');
    $sheet->setCellValue('G4', 'TOTAL HEURES');
    // H: Total Jours Travaillés (fusion H3:H4)
    $sheet->setCellValue('H3', 'TOTAL JOURS TRAVAILLÉS');
    $sheet->mergeCells('H3:H4');
    // I-J: COÛT -> Sous: Taux H / Prime de panier
    $sheet->mergeCells('I3:J3');
    $sheet->setCellValue('I3', 'COÛT');
    $sheet->setCellValue('I4', 'TAUX H');
    $sheet->setCellValue('J4', 'PRIME DE PANIER');
    // K: Salaire net (fusion K3:K4)
    $sheet->setCellValue('K3', 'SALAIRE NET');
    $sheet->mergeCells('K3:K4');
    // L: Helper caché pour Recap (fusion L3:L4)
    $sheet->setCellValue('L3', 'SALAIRE TOTAL');
    $sheet->mergeCells('L3:L4');
        // Style en-têtes
    $sheet->getStyle('A3:L4')->applyFromArray([
            'font' => ['bold' => true, 'size' => 10],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER
            ],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E1F5FE']],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
        ]);
    $sheet->setAutoFilter('A4:L4');
        $row = 5;
        
        // Calculer les colonnes dynamiques pour les temporaires dans 'Employés Temporaires'
        // Structure de la feuille "Employés Temporaires" : A=Nom, B=Prénom, C=Fonction, D=Département
        // Puis présence à partir de colonne 5 (E)
        $tempPresenceStart = 5;
        $tempPresenceEnd = $tempPresenceStart + $dateRange['totalDays'] - 1;
        $tempTotalsStart = $tempPresenceEnd + 1;
        // Colonnes des totaux temporaires : HN (+0), HS25 (+1), HS50 (+2)
        $tempColHN = $tempTotalsStart + 0;
        $tempColHS25 = $tempTotalsStart + 1;
        $tempColHS50 = $tempTotalsStart + 2;
        // Convertir en lettres de colonnes
        $tempColHNLetter = Coordinate::stringFromColumnIndex($tempColHN);
        $tempColHS25Letter = Coordinate::stringFromColumnIndex($tempColHS25);
        $tempColHS50Letter = Coordinate::stringFromColumnIndex($tempColHS50);
        
        // Pour récupérer les valeurs détaillées des heures, on va calculer les nouvelles métriques
        foreach ($employes as $emp) {
            $detailedStats = \App\Services\TimeCalculationService::computeDetailedTemporaryStats($emp, $dateRange);
            // Taux horaire = salaire_base (si présent) sinon 0
            $tauxH = $emp->salaire_base ?? 0;
            // Prime de panier récupérée depuis la table salaires (colonne panie ou panier)
            $primePanier = $emp->panier ?? 0;
            // Coût total = (HeuresNormales * TauxH) + (HS25 * TauxH * 1.25) + (HS50 * TauxH * 1.5) + (PrimePanier * TotalJours)
            $coutTotal = ($detailedStats['heures_normales'] * $tauxH)
                + ($detailedStats['hs_25'] * $tauxH * 1.25)
                + ($detailedStats['hs_50'] * $tauxH * 1.5)
                + ($primePanier * $detailedStats['jours_travailles']);
            // Set row cells individually so we can put a formula for Salaire Net (col J)
            // === Formules de récupération depuis la feuille "Employés Temporaires" avec colonnes DYNAMIQUES ===
            $hnFormula   = sprintf("=IFERROR(XLOOKUP(A%d, UPPER(TRIM('Employés Temporaires'!A:A&\" \"&'Employés Temporaires'!B:B)), 'Employés Temporaires'!%s:%s, 0), 0)", $row, $tempColHNLetter, $tempColHNLetter);
            $hs25Formula = sprintf("=IFERROR(XLOOKUP(A%d, UPPER(TRIM('Employés Temporaires'!A:A&\" \"&'Employés Temporaires'!B:B)), 'Employés Temporaires'!%s:%s, 0), 0)", $row, $tempColHS25Letter, $tempColHS25Letter);
            $hs50Formula = sprintf("=IFERROR(XLOOKUP(A%d, UPPER(TRIM('Employés Temporaires'!A:A&\" \"&'Employés Temporaires'!B:B)), 'Employés Temporaires'!%s:%s, 0), 0)", $row, $tempColHS50Letter, $tempColHS50Letter);


            
            $sheet->setCellValue('A' . $row, strtoupper(trim(($emp->name ?? '') . ' ' . ($emp->prenom ?? ''))));
            $sheet->setCellValue('B' . $row, strtoupper($emp->fonction ?? ''));
            $tmpDeptLabel = strtoupper(trim((string)($emp->departement_nom ?? '')));
            if ($tmpDeptLabel === '' || $tmpDeptLabel === 'NON DEFINI' || $tmpDeptLabel === 'NON DÉFINI' || $tmpDeptLabel === 'NON-DEFINI') {
                $tmpDeptLabel = 'NON AFFECTÉ';
            }


            $sheet->setCellValue('C' . $row, $tmpDeptLabel);
            $sheet->setCellValue('D' . $row, $hnFormula);
$sheet->setCellValue('E' . $row, $hs25Formula);
$sheet->setCellValue('F' . $row, $hs50Formula);
            $sheet->setCellValue('G' . $row, sprintf("=D%d+E%d+F%d", $row, $row, $row));

            $sheet->setCellValue('H' . $row, $detailedStats['jours_travailles']);
            $sheet->setCellValue('I' . $row, $tauxH);
            $sheet->setCellValue('J' . $row, $primePanier);
            // Salaire net formula: =D{row}*I{row} + E{row}*I{row}*1.25 + F{row}*I{row}*1.5 + H{row}*J{row}
            $formula = sprintf('=D%1$d*I%1$d + E%1$d*I%1$d*1.25 + F%1$d*I%1$d*1.5 + H%1$d*J%1$d', $row);
            $sheet->setCellValue('K' . $row, $formula);
            // Colonne L: Helper pour Recap (même valeur que K)
            $sheet->setCellValue('L' . $row, "=K{$row}");
            $fillColor = ($row % 2 === 0) ? 'F9F9F9' : 'FFFFFF';
            $sheet->getStyle('A' . $row . ':L' . $row)->applyFromArray([
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $fillColor]],
                'alignment' => ['vertical' => Alignment::VERTICAL_CENTER]
            ]);
            $row++;
        }
        // Appliquer format d'affichage (display-only) pour la feuille temporaires
        $firstDataRow = 5;
        $lastDataRow  = $row - 1;
        if ($lastDataRow >= $firstDataRow) {
            // Heures D..G en affichage entier (arrondi visuel)
            $this->formatRange($sheet, 'D' . $firstDataRow . ':G' . $lastDataRow, 0);
            // Jours H entier
            $this->formatRange($sheet, 'H' . $firstDataRow . ':H' . $lastDataRow, 0);
            // Taux H, Panier et Salaire net (I..K) entier pour affichage
            $this->formatRange($sheet, 'I' . $firstDataRow . ':L' . $lastDataRow, 0);
        }
        foreach (range('A','K') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
        // Cacher la colonne helper L
        $sheet->getColumnDimension('L')->setVisible(false);
        $sheet->freezePane('A5');
    }
    // computeDailyRawHours and checkNightOverlap are provided by TimeCalculationService
    private function computeTemporarySalaryStats($user, $dateRange)
    {
        if (isset($this->temporaryStats[$user->id])) {
            return $this->temporaryStats[$user->id];
        }
        // Utiliser MonthlyPresenceExportController pour obtenir les données calculées
        $monthlyController = new \App\Http\Controllers\MonthlyPresenceExportController();
        $monthlyStats = $this->getDataFromMonthlyExport($user, $dateRange, false); // false = temporaire
        if ($monthlyStats) {
            $result = [
                'total_heures' => $monthlyStats['total_heures'],
                'heures_supp' => $monthlyStats['heures_supp'],
                'jours_travailles' => $monthlyStats['jours_travailles']
            ];
        } else {
            // Fallback: calcul direct si pas trouvé
            $result = $this->computeTemporarySalaryStatsDirect($user, $dateRange);
        }
        $this->temporaryStats[$user->id] = $result;
        return $result;
    }
    private function getDataFromMonthlyExport($user, $dateRange, $isPermanent)
    {
        // Utiliser les services pour récupérer les données (jours fériés et pointages)
        $joursFeries = TimeCalculationService::getHolidays($dateRange);
        $groupedPointages = TimeCalculationService::getUserPointagesGrouped((int)$user->id, $dateRange);
        // Indexer par date
        $pointagesByDate = [];
        foreach ($groupedPointages as $pt) {
            $date = $pt->date;
            if (!isset($pointagesByDate[$date])) $pointagesByDate[$date] = [];
            $pointagesByDate[$date][] = $pt;
        }
        if ($isPermanent) {
            // Logique permanents du MonthlyPresenceExportController
            $totalHeures = 0.0;
            $heuresSupp = 0.0;
            $joursTravailles = 0;
            $currentDate = clone $dateRange['startDate'];
            while ($currentDate <= $dateRange['endDate']) {
                $dateStr = $currentDate->format('Y-m-d');
                $dayOfWeek = $currentDate->format('w');
                $isHoliday = in_array($dateStr, $joursFeries);
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
                    $st = (string)($pt->statutJour ?? '');
                    if (preg_match('/pr[eé]sent|retard/i', $st)) { $hasPresent = true; }
                }
                // permanents: utiliser la règle dédiée (+pause si pas de nuit)
                $totalDailyHours = TimeCalculationService::computeDailyTotalHoursForPermanent($pointages);
                $nightBaseHours  = TimeCalculationService::calculateNightBaseHours($pointages);
                if ($conge) {
                    // Jour de congé
                } elseif ($isHoliday) {
                    if ($hasPresent) {
                        $totalHeures += $totalDailyHours;
                        // Permanents: HS si > 8h (au lieu de > 9h) pour jours fériés
                        if ($totalDailyHours > 8) $heuresSupp += ($totalDailyHours - 8);
                        $joursTravailles += 1;
                    }
                } elseif (count($pointages) === 0 || !$hasPresent) {
                    // Absence
                } else {
                    if ($dayOfWeek != 0) $joursTravailles += 1;
                    // Permanents: HS si > 8h (au lieu de > 9h) pour jours normaux
                    if ($totalDailyHours > 8 && $nightBaseHours < 8) {
                        $heuresSupp += ($totalDailyHours - 8);
                    }
                    $totalHeures += $totalDailyHours;
                }
                $currentDate->modify('+1 day');
            }
            return [
                'total_heures' => $totalHeures,
                'heures_supp' => $heuresSupp,
                'jours_travailles' => $joursTravailles
            ];
        } else {
            // Logique temporaires du MonthlyPresenceExportController
            $totalHeures = 0.0;
            $heuresSupp = 0.0;
            $joursTravailles = 0;
            $currentDate = clone $dateRange['startDate'];
            while ($currentDate <= $dateRange['endDate']) {
                $dateStr = $currentDate->format('Y-m-d');
                $dayOfWeek = $currentDate->format('w');
                $isHoliday = in_array($dateStr, $joursFeries);
                $pointages = $pointagesByDate[$dateStr] ?? [];
                $conge = DB::table('absence_requests')
                    ->where('user_id', $user->id)
                    ->whereIn('type', ['Congé', 'maladie'])
                    ->where('statut', 'approuvé')
                    ->whereDate('dateDebut', '<=', $dateStr)
                    ->whereDate('dateFin', '>=', $dateStr)
                    ->first();
                if ($conge) {
                    // Jour de congé
                } else {
                    $daily = TimeCalculationService::computeDailyTotalHoursForTemporary($pointages);
                    if ($daily > 0) {
                        $joursTravailles++;
                        $totalHeures += $daily;
                        if ($dayOfWeek == 0 || $isHoliday) {
                            $heuresSupp += $daily; // tout le jour
                        } elseif ($daily > 9) {
                            $heuresSupp += ($daily - 9);
                        }
                    }
                }
                $currentDate->modify('+1 day');
            }
            return [
                'total_heures' => $totalHeures,
                'heures_supp' => $heuresSupp,
                'jours_travailles' => $joursTravailles
            ];
        }
    }
    private function computeTemporarySalaryStatsDirect($user, $dateRange)
    {
        // Ancien calcul direct en fallback
        $totalHeures = 0.0;
        $heuresSupp = 0.0;
        $joursTravailles = 0;
        // Utiliser les services partagés
        $joursFeries = TimeCalculationService::getHolidays($dateRange);
        $groupedPointages = TimeCalculationService::getUserPointagesGrouped((int)$user->id, $dateRange);
        $pointagesByDate = [];
        foreach ($groupedPointages as $pt) {
            $date = $pt->date;
            if (!isset($pointagesByDate[$date])) $pointagesByDate[$date] = [];
            $pointagesByDate[$date][] = $pt;
        }
        $currentDate = clone $dateRange['startDate'];
        while ($currentDate <= $dateRange['endDate']) {
            $dateStr = $currentDate->format('Y-m-d');
            $dayOfWeek = (int)$currentDate->format('w');
            $isHoliday = in_array($dateStr, $joursFeries, true);
            $conge = DB::table('absence_requests')
                ->where('user_id', $user->id)
                ->whereIn('type', ['Congé', 'maladie'])
                ->where('statut', 'approuvé')
                ->whereDate('dateDebut', '<=', $dateStr)
                ->whereDate('dateFin', '>=', $dateStr)
                ->first();
            if ($conge) {
                $currentDate->modify('+1 day');
                continue;
            }
            $pointages = $pointagesByDate[$dateStr] ?? [];
            $daily = TimeCalculationService::computeDailyTotalHoursForTemporary($pointages);
            if ($daily > 0) {
                $joursTravailles++;
                $totalHeures += $daily;
                if ($dayOfWeek === 0 || $isHoliday) {
                    $heuresSupp += $daily;
                } elseif ($daily > 9) {
                    $heuresSupp += ($daily - 9);
                }
            }
            $currentDate->modify('+1 day');
        }
        return [
            'total_heures' => $totalHeures,
            'heures_supp' => $heuresSupp,
            'jours_travailles' => $joursTravailles
        ];
    }
    // ==== LOGIQUE ALIGNÉE AVEC MonthlyPresenceExportController (calcul heures) ====
    // computeDaily* and night-base helpers are provided by TimeCalculationService
    private function getMoisFrancais($moisNum)
    {
        $mois = [
            1 => 'Janvier', 2 => 'Février', 3 => 'Mars', 4 => 'Avril',
            5 => 'Mai', 6 => 'Juin', 7 => 'Juillet', 8 => 'Août',
            9 => 'Septembre', 10 => 'Octobre', 11 => 'Novembre', 12 => 'Décembre'
        ];
        return $mois[$moisNum] ?? 'Mois';
    }
    private function calculateEmployeeStats($userId, $dateRange)
    {
        // Récupérer les données depuis MonthlyPresenceExportController pour plus de cohérence
        $user = DB::table('users')->where('id', $userId)->first();
        if (!$user) {
            return ['jours_travailles' => 0, 'conges' => 0, 'total_heures' => 0, 'heures_supp' => 0];
        }
        $monthlyStats = $this->getDataFromMonthlyExport($user, $dateRange, true); // true = permanent
        if ($monthlyStats) {
            return [
                'jours_travailles' => $monthlyStats['jours_travailles'],
                'conges' => $this->calculateConges($userId, $dateRange),
                'total_heures' => $monthlyStats['total_heures'],
                'heures_supp' => $monthlyStats['heures_supp']
            ];
        }
        // Fallback: calcul direct
        return $this->calculateEmployeeStatsDirect($userId, $dateRange);
    }
    private function calculateConges($userId, $dateRange)
    {
        $conges = 0;
        $currentDate = clone $dateRange['startDate'];
        while ($currentDate <= $dateRange['endDate']) {
            $dateStr = $currentDate->format('Y-m-d');
            $conge = DB::table('absence_requests')
                ->where('user_id', $userId)
                ->whereIn('type', ['Congé', 'maladie'])
                ->where('statut', 'approuvé')
                ->whereDate('dateDebut', '<=', $dateStr)
                ->whereDate('dateFin', '>=', $dateStr)
                ->first();
            if ($conge) {
                $conges++;
            }
            $currentDate->modify('+1 day');
        }
        return $conges;
    }
    private function calculateEmployeeStatsDirect($userId, $dateRange)
    {
        $joursTravailles = 0;
        $conges = 0;
        // Précharger les pointages groupés par date via service
        $pts = TimeCalculationService::getUserPointagesGrouped((int)$userId, $dateRange);
        $byDate = [];
        foreach ($pts as $p) { $byDate[$p->date][] = $p; }
        $currentDate = clone $dateRange['startDate'];
        while ($currentDate <= $dateRange['endDate']) {
            $dateStr = $currentDate->format('Y-m-d');
            // Vérifier les pointages
            $hasPresent = false;
            foreach ($byDate[$dateStr] ?? [] as $p) {
                $st = strtolower(trim((string)($p->statutJour ?? '')));
                if (preg_match('/pr[eé]sent|retard/i', $st)) { $hasPresent = true; break; }
            }
            // Vérifier les congés
            $conge = DB::table('absence_requests')
                ->where('user_id', $userId)
                ->whereIn('type', ['Congé', 'maladie'])
                ->where('statut', 'approuvé')
                ->whereDate('dateDebut', '<=', $dateStr)
                ->whereDate('dateFin', '>=', $dateStr)
                ->first();
            if ($conge) {
                $conges++;
            } elseif ($hasPresent) {
                $joursTravailles++;
            }
            $currentDate->modify('+1 day');
        }
        return [
            'jours_travailles' => $joursTravailles,
            'conges' => $conges,
            'total_heures' => 0,
            'heures_supp' => 0
        ];
    }
    private function exportExcel($spreadsheet, $dateRange, $prefix = 'Export')
    {
        $filename = $prefix . "_" . $dateRange['label'] . ".xlsx";
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
    private function createRecapChargePersonnelSheet($spreadsheet, $societeId, $dateRange)
    {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Recap');
        // Titre principal
        $row = 1;
        $sheet->setCellValue('A' . $row, 'CHARGE PERSONNEL DCT');
        $sheet->mergeCells('A' . $row . ':N' . $row);
        $sheet->getStyle('A' . $row . ':N' . $row)->applyFromArray([
            'font' => ['bold' => true, 'size' => 16],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'D9EAD3']],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THICK]]
        ]);
        $row += 2;
        // Récupérer le mois de la période exportée
        $exportMonth = $dateRange['startDate']->format('n'); // Numéro du mois (1-12)
        $exportYear = $dateRange['startDate']->format('Y');
        $currentYear = date('Y');
        
        // Générer les en-têtes de mois (12 mois de l'année courante)
        // Le mois exporté aura 2 colonnes (DB et EXCEL), les autres 1 seule colonne
        $monthHeaders = [''];  // Première colonne vide pour les libellés
        $monthMapping = [];    // Map pour savoir quelle colonne correspond à quel mois
        $colIndex = 2;         // Commence à la colonne B
        
        for ($m = 1; $m <= 12; $m++) {
            $monthName = date('M-y', mktime(0, 0, 0, $m, 1, $currentYear));
            
            if ($m == $exportMonth && $exportYear == $currentYear) {
                // Mois exporté : 2 colonnes
                $monthHeaders[] = $monthName . ' - DB';
                $monthHeaders[] = $monthName . ' - EXCEL';
                $monthMapping[$m] = ['db' => $colIndex, 'excel' => $colIndex + 1];
                $colIndex += 2;
            } else {
                // Autres mois : 1 seule colonne
                $monthHeaders[] = $monthName;
                $monthMapping[$m] = ['db' => $colIndex];
                $colIndex += 1;
            }
        }
        
        // Récupérer toutes les données de charge_personnels pour cette société et cette année
        $chargeData = DB::table('charge_personnels')
            ->where('societe_id', $societeId)
            ->whereYear('mois', $currentYear)
            ->get()
            ->keyBy(function($item) {
                return date('n', strtotime($item->mois)); // Index par numéro de mois (1-12)
            });
        
        // En-têtes du tableau
        foreach ($monthHeaders as $index => $header) {
            $colLetter = Coordinate::stringFromColumnIndex($index + 1);
            $sheet->setCellValue($colLetter . $row, $header);
        }
        $lastCol = Coordinate::stringFromColumnIndex(count($monthHeaders));
        $sheet->getStyle('A' . $row . ':' . $lastCol . $row)->applyFromArray([
            'font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => 'FFFFFF']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4472C4']],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
        ]);
        $row++;
        
        // Lignes de données : catégories simples
        $dataRows = [
            'SALAIRE PERMANENT',
            'CHARGES PERMANENT',
            'SALAIRE TEMPORAIRE',
            'CHARGES TEMPORAIRE',
            'AUTRES CHARGES RH',
            'TOTAL CHARGE PERSONNEL'
        ];
        
        // Remplir les montants pour chaque ligne selon chaque mois
        $startRowData = $row;
        foreach ($dataRows as $index => $rowLabel) {
            $sheet->setCellValue('A' . $row, $rowLabel);
            
            // Pour chaque mois (12 mois)
            for ($m = 1; $m <= 12; $m++) {
                $mapping = $monthMapping[$m];
                $colDB = $mapping['db'];
                $colLetterDB = Coordinate::stringFromColumnIndex($colDB);
                
                // Si le mois a une colonne EXCEL (mois exporté uniquement)
                $hasExcel = isset($mapping['excel']);
                $colLetterExcel = $hasExcel ? Coordinate::stringFromColumnIndex($mapping['excel']) : null;
                
                if ($rowLabel === 'SALAIRE PERMANENT') {
                    // Colonne DB: valeur depuis charge_personnels
                    $value = isset($chargeData[$m]) ? (float)$chargeData[$m]->salaire_permanent : 0;
                    $sheet->setCellValue($colLetterDB . $row, $value);
                    
                    // Colonne EXCEL: formule utilisant colonne S (SALAIRE NET TOTAL visible) au lieu de G (dynamique)
                    if ($hasExcel) {
                        $sheet->setCellValue($colLetterExcel . $row, "=IFERROR(SUM('Salaire Permanent'!S:S),0)");
                    }
                    
                } elseif ($rowLabel === 'CHARGES PERMANENT') {
                    // Colonne DB: valeur depuis charge_personnels
                    $value = isset($chargeData[$m]) ? (float)$chargeData[$m]->charge_salaire_permanent : 0;
                    $sheet->setCellValue($colLetterDB . $row, $value);
                    
                    // Colonne EXCEL: 27% du salaire permanent EXCEL (ligne précédente)
                    if ($hasExcel) {
                        $permanentRow = $startRowData;
                        $sheet->setCellValue($colLetterExcel . $row, "={$colLetterExcel}{$permanentRow}*0.27");
                    }
                    
                } elseif ($rowLabel === 'SALAIRE TEMPORAIRE') {
                    // Colonne DB: valeur depuis charge_personnels
                    $value = isset($chargeData[$m]) ? (float)$chargeData[$m]->salaire_temporaire : 0;
                    $sheet->setCellValue($colLetterDB . $row, $value);
                    
                    // Colonne EXCEL: formule utilisant colonne helper L (fixe) au lieu de K (dynamique)
                    if ($hasExcel) {
                        $sheet->setCellValue($colLetterExcel . $row, "=IFERROR(SUM('Salaire Temporaire'!L:L),0)");
                    }
                    
                } elseif ($rowLabel === 'CHARGES TEMPORAIRE') {
                    // Colonne DB: valeur depuis charge_personnels
                    $value = isset($chargeData[$m]) ? (float)$chargeData[$m]->charge_salaire_temp : 0;
                    $sheet->setCellValue($colLetterDB . $row, $value);
                    
                    // Colonne EXCEL: 27% du salaire temporaire EXCEL
                    if ($hasExcel) {
                        $temporaireRow = $startRowData + 2;
                        $sheet->setCellValue($colLetterExcel . $row, "={$colLetterExcel}{$temporaireRow}*0.27");
                    }
                    
                } elseif ($rowLabel === 'AUTRES CHARGES RH') {
                    // Colonne DB: valeur depuis charge_personnels
                    $value = isset($chargeData[$m]) ? (float)$chargeData[$m]->autres_charge : 0;
                    $sheet->setCellValue($colLetterDB . $row, $value);
                    
                    // Colonne EXCEL: référence à la valeur DB
                    if ($hasExcel) {
                        $sheet->setCellValue($colLetterExcel . $row, "={$colLetterDB}{$row}");
                    }
                    
                } elseif ($rowLabel === 'TOTAL CHARGE PERSONNEL') {
                    $permRow = $startRowData;
                    $chargPermRow = $startRowData + 1;
                    $tempRow = $startRowData + 2;
                    $chargTempRow = $startRowData + 3;
                    $autresRow = $startRowData + 4;
                    
                    // Colonne DB: somme des DB
                    $sheet->setCellValue($colLetterDB . $row, 
                        "={$colLetterDB}{$permRow}+{$colLetterDB}{$chargPermRow}+{$colLetterDB}{$tempRow}+{$colLetterDB}{$chargTempRow}+{$colLetterDB}{$autresRow}"
                    );
                    
                    // Colonne EXCEL: somme des EXCEL (uniquement pour mois exporté)
                    if ($hasExcel) {
                        $sheet->setCellValue($colLetterExcel . $row, 
                            "={$colLetterExcel}{$permRow}+{$colLetterExcel}{$chargPermRow}+{$colLetterExcel}{$tempRow}+{$colLetterExcel}{$chargTempRow}+{$colLetterExcel}{$autresRow}"
                        );
                    }
                }
            }
            
            // Style pour la ligne
            if ($rowLabel === 'TOTAL CHARGE PERSONNEL') {
                $sheet->getStyle('A' . $row . ':' . $lastCol . $row)->applyFromArray([
                    'font' => ['bold' => true],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E2EFDA']],
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
                ]);
            } else {
                $sheet->getStyle('A' . $row . ':' . $lastCol . $row)->applyFromArray([
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
                ]);
            }
            $row++;
        }
        
        // Appliquer format d'affichage (display-only) pour toutes les cellules numériques du bloc données
        $endRowData = $row - 1;
        if ($endRowData >= $startRowData) {
            $this->formatRange($sheet, 'B' . $startRowData . ':' . $lastCol . $endRowData, 0);
        }
        
        // Colorer les colonnes DB et EXCEL pour le mois exporté dans l'en-tête
        if ($exportYear == $currentYear) {
            $mapping = $monthMapping[$exportMonth];
            $colDB = $mapping['db'];
            $colExcel = isset($mapping['excel']) ? $mapping['excel'] : null;
            
            if ($colExcel) {
                $colLetterDB = Coordinate::stringFromColumnIndex($colDB);
                $colLetterExcel = Coordinate::stringFromColumnIndex($colExcel);
                
                // Colonne DB en bleu
                $sheet->getStyle($colLetterDB . ($startRowData - 1))->applyFromArray([
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'B4C7E7']]
                ]);
                
                // Colonne EXCEL en vert
                $sheet->getStyle($colLetterExcel . ($startRowData - 1))->applyFromArray([
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'C6E0B4']]
                ]);
            }
        }
        
        // Auto-ajuster les colonnes
        for ($c = 1; $c <= count($monthHeaders); $c++) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($c))->setAutoSize(true);
        }
        $sheet->freezePane('B4');
    }
    /**
 * Construit une expression Excel de plage figée via INDIRECT
 * ex: INDIRECT("'Employés Permanents'!C5:C29")
 */
private function xlIndirectRange(string $sheetName, int $colIndex, int $rowStart, int $rowEnd): string
{
    $col = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIndex);
    // échapper d'éventuels apostrophes dans le nom de feuille
    $sheetEsc = str_replace("'", "''", $sheetName);
    return "INDIRECT(\"'{$sheetEsc}'!{$col}{$rowStart}:{$col}{$rowEnd}\")";
}

/**
 * Feuille "Récap" — agrège effectif moyen / total effectif / HN / HS par département,
 * en gelant les plages des feuilles source via INDIRECT pour éviter tout glissement.
 * 
 * @param int|null $filterDepartementId Filtre optionnel par département
 * @param int|null $filterUserId Filtre optionnel par utilisateur
 */
private function createRecapSheet(\PhpOffice\PhpSpreadsheet\Spreadsheet $spreadsheet, $societeId, array $dateRange, ?int $filterDepartementId = null, ?int $filterUserId = null)
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

    // Feuilles & bornes fixes (lignes de données commencent à 5)
    $dataStartRow = 5;

    $permSheet = $spreadsheet->getSheetByName('Employés Permanents');
    $tempSheet = $spreadsheet->getSheetByName('Employés Temporaires');

    // Dernières lignes réelles sur chaque feuille (on force un min à 5)
    $permLastRow = $permSheet ? max($dataStartRow, (int)$permSheet->getHighestDataRow()) : $dataStartRow;
    $tempLastRow = $tempSheet ? max($dataStartRow, (int)$tempSheet->getHighestDataRow()) : $dataStartRow;

    $permName = $permSheet ? $permSheet->getTitle() : null;
    $tempName = $tempSheet ? $tempSheet->getTitle() : null;

    // Liste des départements (basée sur les pointages, avec filtres optionnels)
    $departementsQuery = \DB::table('pointages')
        ->join('users', 'users.id', '=', 'pointages.user_id')
        ->leftJoin('departements', 'departements.id', '=', 'pointages.departement_id')
        ->where('users.societe_id', $societeId)
        ->whereBetween('pointages.date', [
            $dateRange['startDate']->format('Y-m-d'),
            $dateRange['endDate']->format('Y-m-d')
        ]);
    
    // Appliquer les filtres
    if ($filterUserId) {
        $departementsQuery->where('users.id', $filterUserId);
    }
    if ($filterDepartementId) {
        $departementsQuery->where('pointages.departement_id', $filterDepartementId);
    }
    
    $departements = $departementsQuery
        ->select(\DB::raw("UPPER(TRIM(COALESCE(NULLIF(TRIM(departements.nom), ''), 'NON AFFECTÉ'))) as dept"))
        ->distinct()
        ->orderBy('dept')
        ->pluck('dept')
        ->toArray();

    // Feuille récap
    $recap = $spreadsheet->createSheet();
    $recap->setTitle('Récap Departements');

    $r = 1;
    $recap->setCellValue('A'.$r, 'RÉCAPITULATIF (agrégation feuilles — 7 métriques)');
    $recap->mergeCells('A'.$r.':H'.$r);
    $recap->getStyle('A'.$r.':H'.$r)->applyFromArray([
        'font'=>['bold'=>true,'size'=>15],
        'alignment'=>['horizontal'=>\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER],
        'fill'=>['fillType'=>\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,'startColor'=>['rgb'=>'D9EAD3']],
        'borders'=>['allBorders'=>['borderStyle'=>\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THICK]],
    ]);
    $r += 2;

    // Helper jours effectifs
    $startY = (int)$dateRange['startDate']->format('Y');
    $startM = (int)$dateRange['startDate']->format('n');
    $startD = (int)$dateRange['startDate']->format('j');
    $endY   = (int)$dateRange['endDate']->format('Y');
    $endM   = (int)$dateRange['endDate']->format('n');
    $endD   = (int)$dateRange['endDate']->format('j');
    $daysFormula = "=MAX(1, MIN(DATE($endY,$endM,$endD), TODAY()) - DATE($startY,$startM,$startD) + 1)";
    $recap->setCellValue('I1', $daysFormula);
    $recap->getStyle('I1')->getNumberFormat()->setFormatCode('#,##0');

    // En-têtes
    $headers = [
        'DÉPARTEMENT',
        'MOYENNE EFFECTIF PAR JOUR', // = TOTAL EFFECTIF / jours effectifs
        'TOTAL EFFECTIF',
        'TOTAL HEURES NORMALES',
        'TOTAL HEURES SUPP',
        'SALAIRE',     // Somme des salaires par département (P + T)
        'COÛT',        // = SALAIRE + CHARGE
        'CHARGE'       // = SALAIRE * 27%
    ];
    foreach ($headers as $i=>$h) {
        $recap->setCellValue($this->col($i+1).$r, $h);
    }
    $recap->getStyle('A'.$r.':'.$this->col(count($headers)).$r)->applyFromArray([
        'font'=>['bold'=>true,'color'=>['rgb'=>'FFFFFF']],
        'alignment'=>['horizontal'=>\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER],
        'fill'=>['fillType'=>\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,'startColor'=>['rgb'=>'4472C4']],
        'borders'=>['allBorders'=>['borderStyle'=>\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN]],
    ]);
    $r++;

    // Construit les plages (même méthode, mêmes colonnes, même ligne de départ = 5)
    $permDeptRange = $this->col($permDeptCol).$dataStartRow.':'.$this->col($permDeptCol).$permLastRow;     // ex: C5:C29
    $permJTRange   = $this->col($permColJoursTrav).$dataStartRow.':'.$this->col($permColJoursTrav).$permLastRow; // ex: AL5:AL29
    $permHNRange   = $this->col($permColHN).$dataStartRow.':'.$this->col($permColHN).$permLastRow;
    $permHSRange   = $this->col($permColHS).$dataStartRow.':'.$this->col($permColHS).$permLastRow;

    $tempDeptRange = $this->col($tempDeptCol).$dataStartRow.':'.$this->col($tempDeptCol).$tempLastRow;     // ex: D5:D38
    $tempHNRange   = $this->col($tempColHN).$dataStartRow.':'.$this->col($tempColHN).$tempLastRow;         // ex: AJ5:AJ38
    $tempHS25Range = $this->col($tempColHS25).$dataStartRow.':'.$this->col($tempColHS25).$tempLastRow;     // ex: AK5:AK38
    $tempHS50Range = $this->col($tempColHS50).$dataStartRow.':'.$this->col($tempColHS50).$tempLastRow;     // ex: AL5:AL38

    // Feuilles salaires pour agrégations financières
    $dataStartRowSal = 5;
    $permSalSheet = $spreadsheet->getSheetByName('Salaire Permanent');
    $tempSalSheet = $spreadsheet->getSheetByName('Salaire Temporaire');
    $permSalLastRow = $permSalSheet ? max($dataStartRowSal, (int)$permSalSheet->getHighestDataRow()) : $dataStartRowSal;
    $tempSalLastRow = $tempSalSheet ? max($dataStartRowSal, (int)$tempSalSheet->getHighestDataRow()) : $dataStartRowSal;
    $permSalName = $permSalSheet ? $permSalSheet->getTitle() : null;
    $tempSalName = $tempSalSheet ? $tempSalSheet->getTitle() : null;
    // Plages: Département et Salaire dans feuilles salaires (D/S pour permanents, C/L pour temporaires)
    $permSalDeptRange = "D{$dataStartRowSal}:D{$permSalLastRow}";
    $permSalValRange  = "S{$dataStartRowSal}:S{$permSalLastRow}"; // SALAIRE NET TOTAL (colonne S)
    $tempSalDeptRange = "C{$dataStartRowSal}:C{$tempSalLastRow}";
    $tempSalValRange  = "L{$dataStartRowSal}:L{$tempSalLastRow}"; // SALAIRE NET (colonne L)

    // Lignes par département
    foreach ($departements as $dept) {
        // Libellé
        $recap->setCellValue('A'.$r, $dept);

        // Critère
        $critDept = ($dept === 'NON AFFECTÉ') ? '"NON AFFECTÉ"' : ('A'.$r);

        // TOTAL EFFECTIF (même structure que ton exemple correct)
        $parts = [];
        if ($permName) {
            $parts[] = "SUMPRODUCT(--('".$permName."'!".$permDeptRange."=".$critDept."),--('".$permName."'!".$permJTRange.">0))";
        }
        if ($tempName) {
            $parts[] = "SUMPRODUCT(--('".$tempName."'!".$tempDeptRange."=".$critDept."),--(('".$tempName."'!".$tempHNRange."+"
                     . "'".$tempName."'!".$tempHS25Range."+"
                     . "'".$tempName."'!".$tempHS50Range.")>0))";
        }
        $recap->setCellValue('C'.$r, '='.(count($parts) ? implode('+', $parts) : '0'));

        // MOYENNE EFFECTIF PAR JOUR
        $recap->setCellValue('B'.$r, '=IF($I$1>0, C'.$r.'/$I$1, 0)');

        // TOTAL HEURES NORMALES
        $sumHN = [];
        if ($permName) $sumHN[] = "SUMIF('".$permName."'!".$permDeptRange.",".$critDept.",'".$permName."'!".$permHNRange.")";
        if ($tempName) $sumHN[] = "SUMIF('".$tempName."'!".$tempDeptRange.",".$critDept.",'".$tempName."'!".$tempHNRange.")";
        $recap->setCellValue('D'.$r, "=".(count($sumHN)?implode('+',$sumHN):'0'));

        // TOTAL HEURES SUPP
        $sumHS = [];
        if ($permName) $sumHS[] = "SUMIF('".$permName."'!".$permDeptRange.",".$critDept.",'".$permName."'!".$permHSRange.")";
        if ($tempName) {
            $sumHS[] = "SUMIF('".$tempName."'!".$tempDeptRange.",".$critDept.",'".$tempName."'!".$tempHS25Range.")";
            $sumHS[] = "SUMIF('".$tempName."'!".$tempDeptRange.",".$critDept.",'".$tempName."'!".$tempHS50Range.")";
        }
        $recap->setCellValue('E'.$r, "=".(count($sumHS)?implode('+',$sumHS):'0'));

        // SALAIRE par département = PERM(G) + TEMP(K)
        $sumSalaire = [];
        if ($permSalName) $sumSalaire[] = "SUMIF('{$permSalName}'!{$permSalDeptRange},{$critDept},'{$permSalName}'!{$permSalValRange})";
        if ($tempSalName) $sumSalaire[] = "SUMIF('{$tempSalName}'!{$tempSalDeptRange},{$critDept},'{$tempSalName}'!{$tempSalValRange})";
        $recap->setCellValue('F'.$r, '='.(count($sumSalaire)?implode('+',$sumSalaire):'0'));

        // CHARGE = 27% du SALAIRE (col F)
        $recap->setCellValue('H'.$r, '=F'.$r.'*0.27');
        // COÛT = SALAIRE + CHARGE (F + H)
        $recap->setCellValue('G'.$r, '=F'.$r.'+H'.$r);

        // Style ligne
        $recap->getStyle('A'.$r.':H'.$r)->applyFromArray([
            'borders'=>['allBorders'=>['borderStyle'=>\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN]],
            'alignment'=>['vertical'=>\PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER],
        ]);

        $r++;
    }

    // TOTAL général
    $recap->setCellValue('A'.$r, 'TOTAL');
    $startRowDepts = $r - count($departements);

    // B total = somme des effectifs moyens par département
    $recap->setCellValue('B'.$r, "=SUM(B{$startRowDepts}:B".($r-1).")");
    // C..H = sommes par colonne
    foreach (['C','D','E','F','G','H'] as $L) {
        $recap->setCellValue($L.$r, "=SUM(".$L.($r - count($departements)).":".$L.($r-1).")");
    }
    $recap->getStyle('A'.$r.':H'.$r)->applyFromArray([
        'font'=>['bold'=>true],
        'fill'=>['fillType'=>\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,'startColor'=>['rgb'=>'E2EFDA']],
        'borders'=>['allBorders'=>['borderStyle'=>\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THICK]],
    ]);

    // Formats : B en décimal (2), C..H en entier
    $recap->getStyle('B3:B'.$r)->getNumberFormat()->setFormatCode('#,##0.00');
    $this->formatRange($recap, 'C3:H'.$r, 0);

    // Auto-size
    foreach (range('A','H') as $c) {
        $recap->getColumnDimension($c)->setAutoSize(true);
    }
}



    private function calculatePermanentSalaryTotalForMonth($societeId, $year, $month)
    {
        // Créer les dates de début et fin du mois
        $startOfMonth = new DateTime("$year-$month-01");
        $endOfMonth = (clone $startOfMonth)->modify('last day of this month');
        // Récupérer la somme des salaires nets des employés permanents actifs dans ce mois
        $total = DB::table('users')
            ->leftJoin('salaires', 'users.id', '=', 'salaires.user_id')
            ->where('users.societe_id', $societeId)
            ->where(function($query) use ($startOfMonth, $endOfMonth) {
                $query->where(function($q) {
                    // Employés actifs (pas de statut inactif OU pas de date de sortie)
                    $q->whereRaw('LOWER(TRIM(COALESCE(users.statut, ""))) != "inactif"')
                      ->orWhereNull('users.date_sortie');
                })
                ->orWhere(function($q) use ($endOfMonth) {
                    // OU employés inactifs mais avec date de sortie >= fin du mois
                    $q->whereRaw('LOWER(TRIM(COALESCE(users.statut, ""))) = "inactif"')
                      ->whereNotNull('users.date_sortie')
                      ->whereDate('users.date_sortie', '>=', $endOfMonth->format('Y-m-d'));
                });
            })
            ->where(function($query) {
                $query->whereIn(DB::raw('LOWER(TRIM(COALESCE(users.typeContrat, "")))'), 
                    ['permanent', 'permanente', 'cdi', 'indéterminée', 'indeterminee'])
                      ->orWhere('users.typeContrat', 'LIKE', '%permanent%')
                      ->orWhere('users.typeContrat', 'LIKE', '%CDI%');
            })
            ->sum('salaires.salaire_net');
        return $total ?? 0;
    }
    private function calculateTemporaryCostTotalForMonth($societeId, $year, $month)
    {
        // Créer la période du mois
        $startOfMonth = new DateTime("$year-$month-01");
        $endOfMonth = (clone $startOfMonth)->modify('last day of this month');
        $monthDateRange = [
            'startDate' => $startOfMonth,
            'endDate' => $endOfMonth
        ];
        // Récupérer les temporaires actifs dans ce mois
        $rawTemporaires = DB::table('users')
            ->where('users.societe_id', $societeId)
            ->where(function($query) use ($startOfMonth, $endOfMonth) {
                $query->where(function($q) {
                    // Employés actifs (pas de statut inactif OU pas de date de sortie)
                    $q->whereRaw('LOWER(TRIM(COALESCE(users.statut, ""))) != "inactif"')
                      ->orWhereNull('users.date_sortie');
                })
                ->orWhere(function($q) use ($endOfMonth) {
                    // OU employés inactifs mais avec date de sortie >= fin du mois
                    $q->whereRaw('LOWER(TRIM(COALESCE(users.statut, ""))) = "inactif"')
                      ->whereNotNull('users.date_sortie')
                      ->whereDate('users.date_sortie', '>=', $endOfMonth->format('Y-m-d'));
                });
            })
            ->get()
            ->filter(function($u){ return !$this->isPermanent($u); });
        $ids = $rawTemporaires->pluck('id')->all();
        $totalCout = 0;
        if (!empty($ids)) {
            // Déterminer les utilisateurs ayant au moins un statut present/retard durant le mois via service
            $presentUserIds = [];
            foreach ($ids as $uid) {
                $pts = TimeCalculationService::getUserPointagesGrouped((int)$uid, $monthDateRange);
                foreach ($pts as $p) {
                    $st = strtolower(trim((string)($p->statutJour ?? '')));
                    if (preg_match('/pr[eé]sent|retard/i', $st)) { $presentUserIds[] = $uid; break; }
                }
            }
            if (!empty($presentUserIds)) {
                $employes = DB::table('users')
                    ->leftJoin('salaires', 'users.id', '=', 'salaires.user_id')
                    ->whereIn('users.id', $presentUserIds)
                    ->select(
                        'users.*',
                        'salaires.salaire_base',
                        DB::raw('COALESCE(salaires.panier, salaires.panier, 0) as panier')
                    )
                    ->get();
                foreach ($employes as $emp) {
                    $detailedStats = \App\Services\TimeCalculationService::computeDetailedTemporaryStats($emp, $monthDateRange);
                    $tauxH = $emp->salaire_base ?? 0;
                    $primePanier = $emp->panier ?? 0;
                    // Nouveau calcul avec les heures détaillées
                    $coutTotal = ($detailedStats['heures_normales'] * $tauxH)
                        + ($detailedStats['hs_25'] * $tauxH * 1.25)
                        + ($detailedStats['hs_50'] * $tauxH * 1.5)
                        + ($primePanier * $detailedStats['jours_travailles']);
                    $totalCout += $coutTotal;
                }
            }
        }
                return $totalCout;
    }
    public function exportSalaries(Request $request)
    {
        return $this->export($request);
    }
    /**
     * Vérifier si un utilisateur a des pointages dans la période donnée
     */
    private function hasPointagesInPeriod($userId, $dateRange)
{
    return \App\Services\TimeCalculationService::hasPointagesInPeriod((int)$userId, $dateRange);
}
// Temporaires — règles Monthly, filtrées par column_id
private function computeDetailedTemporaryStatsForColumn($user, $dateRange, $columnId): array
{
    $hn=0.0; $hs25=0.0; $hs50=0.0; $tot=0.0; $jours=0;
    $joursFeries = TimeCalculationService::getHolidays($dateRange);
    $groupedPointages = TimeCalculationService::getUserPointagesGrouped((int)$user->id, $dateRange);
    $byDate = [];
    foreach ($groupedPointages as $pt) {
        $d = $pt->date;
        if (!isset($byDate[$d])) $byDate[$d] = [];
        $byDate[$d][] = $pt;
    }
    $d = clone $dateRange['startDate'];
    while ($d <= $dateRange['endDate']) {
        $ds = $d->format('Y-m-d');
        $isHoliday = in_array($ds,$joursFeries,true);
        $isSunday = ((int)$d->format('w')===0);
        // congé ?
        $conge = DB::table('absence_requests')
            ->where('user_id',$user->id)->whereIn('type',['Congé','maladie'])
            ->where('statut','approuvé')->whereDate('dateDebut','<=',$ds)->whereDate('dateFin','>=',$ds)->first();
        if ($conge){ $d->modify('+1 day'); continue; }
        $pts = array_values(array_filter($byDate[$ds] ?? [], function($p) use ($columnId) {
            return ((int)($p->column_id ?? 0)) === (int)$columnId;
        }));
        $daily = TimeCalculationService::computeDailyTotalHoursForTemporary($pts);
        if ($daily > 0){
            $jours++; $tot += $daily;
            if ($isSunday || $isHoliday){
                $hs50 += $daily;
            } else {
                $adjusted = $daily;
                if ($adjusted <= 8) $hn += $adjusted;
                else { $hn += 8; $hs25 += ($adjusted - 8); }
            }
        }
        $d->modify('+1 day');
    }
    return ['heures_normales'=>$hn,'hs_25'=>$hs25,'hs_50'=>$hs50,'total_heures'=>$tot,'jours_travailles'=>$jours];
}
private function computeDetailedTemporaryStatsForDepartement($user, $dateRange, $departementId): array
{
    $hn=0.0; $hs25=0.0; $hs50=0.0; $tot=0.0; $jours=0;
    $joursFeries = TimeCalculationService::getHolidays($dateRange);
    $groupedPointages = TimeCalculationService::getUserPointagesGrouped((int)$user->id, $dateRange);
    $byDate = [];
    foreach ($groupedPointages as $pt) {
        $d = $pt->date;
        if (!isset($byDate[$d])) $byDate[$d] = [];
        $byDate[$d][] = $pt;
    }
    $d = clone $dateRange['startDate'];
    while ($d <= $dateRange['endDate']) {
        $ds = $d->format('Y-m-d');
        $isHoliday = in_array($ds,$joursFeries,true);
        $isSunday = ((int)$d->format('w')===0);
        $conge = DB::table('absence_requests')
            ->where('user_id',$user->id)
            ->whereIn('type',['Congé','maladie'])
            ->where('statut','approuvé')
            ->whereDate('dateDebut','<=',$ds)
            ->whereDate('dateFin','>=',$ds)
            ->first();
        if ($conge){ $d->modify('+1 day'); continue; }
        $pts = array_values(array_filter($byDate[$ds] ?? [], function($p) use ($departementId) {
            if (is_null($departementId)) {
                return !isset($p->departement_id) || $p->departement_id === null || (int)$p->departement_id === 0;
            }
            return ((int)($p->departement_id ?? 0)) === (int)$departementId;
        }));
        $daily = TimeCalculationService::computeDailyTotalHoursForTemporary($pts);
        if ($daily > 0){
            $jours++; $tot += $daily;
            if ($isSunday || $isHoliday){
                $hs50 += $daily;
            } else {
                if ($daily <= 8) $hn += $daily;
                else { $hn += 8; $hs25 += ($daily - 8); }
            }
        }
        $d->modify('+1 day');
    }
    return [
        'heures_normales'=>$hn,
        'hs_25'=>$hs25,
        'hs_50'=>$hs50,
        'total_heures'=>$tot,
        'jours_travailles'=>$jours
    ];
}
private function getDataFromMonthlyExportForDepartement($user, $dateRange, $departementId): array
{
    // Jours fériés et pointages groupés via service
    $joursFeries = TimeCalculationService::getHolidays($dateRange);
    $groupedPointages = TimeCalculationService::getUserPointagesGrouped((int)$user->id, $dateRange);
    $byDate = [];
    foreach ($groupedPointages as $pt) {
        $d = $pt->date;
        if (!isset($byDate[$d])) $byDate[$d] = [];
        $byDate[$d][] = $pt;
    }
    $totalHeures=0.0; $heuresSupp=0.0; $joursTravailles=0;
    $d = clone $dateRange['startDate'];
    while ($d <= $dateRange['endDate']) {
        $ds = $d->format('Y-m-d');
        $dow=(int)$d->format('w');
        $isHoliday=in_array($ds,$joursFeries,true);
        $pts = array_values(array_filter($byDate[$ds] ?? [], function($p) use ($departementId) {
            if (is_null($departementId)) {
                return !isset($p->departement_id) || $p->departement_id === null || (int)$p->departement_id === 0;
            }
            return ((int)($p->departement_id ?? 0)) === (int)$departementId;
        }));
        $conge = DB::table('absence_requests')
            ->where('user_id',$user->id)
            ->whereIn('type',['Congé','maladie'])
            ->where('statut','approuvé')
            ->whereDate('dateDebut','<=',$ds)
            ->whereDate('dateFin','>=',$ds)
            ->first();
        if ($conge){ $d->modify('+1 day'); continue; }
        $daily = TimeCalculationService::computeDailyTotalHoursForTemporary($pts);
        $nightBase = TimeCalculationService::calculateNightBaseHours($pts);
        if ($isHoliday) {
            if ($daily > 0) {
                $totalHeures += $daily;
                $joursTravailles += 1; // Compté comme travaillé si présent un jour férié
                if ($daily > 8) $heuresSupp += ($daily - 8);
            }
        } else {
            if ($daily > 0) {
                if ($dow !== 0) $joursTravailles += 1; // pas de jour ouvré pour dimanche
                if ($daily > 8 && $nightBase < 8) $heuresSupp += ($daily - 8);
                $totalHeures += $daily;
            }
        }
        $d->modify('+1 day');
    }
    return [
        'total_heures'=>$totalHeures,
        'heures_supp'=>$heuresSupp,
        'jours_travailles'=>$joursTravailles
    ];
}
// Permanents — règles Monthly, filtrées par column_id
private function getDataFromMonthlyExportForColumn($user, $dateRange, $columnId): array
{
    $joursFeries = TimeCalculationService::getHolidays($dateRange);
    $groupedPointages = TimeCalculationService::getUserPointagesGrouped((int)$user->id, $dateRange);
    $byDate = [];
    foreach ($groupedPointages as $pt) {
        $d = $pt->date;
        if (!isset($byDate[$d])) $byDate[$d] = [];
        $byDate[$d][] = $pt;
    }
    $totalHeures=0.0; $heuresSupp=0.0; $joursTravailles=0;
    $d = clone $dateRange['startDate'];
    while ($d <= $dateRange['endDate']) {
        $ds = $d->format('Y-m-d'); $dow=(int)$d->format('w');
        $isHoliday=in_array($ds,$joursFeries,true);
        $pts = array_values(array_filter($byDate[$ds] ?? [], function($p) use ($columnId) {
            return ((int)($p->column_id ?? 0)) === (int)$columnId;
        }));
        $conge = DB::table('absence_requests')
            ->where('user_id',$user->id)->whereIn('type',['Congé','maladie'])
            ->where('statut','approuvé')->whereDate('dateDebut','<=',$ds)->whereDate('dateFin','>=',$ds)->first();
        if ($conge){ $d->modify('+1 day'); continue; }
        $daily = TimeCalculationService::computeDailyTotalHoursForTemporary($pts);
        $nightBase = TimeCalculationService::calculateNightBaseHours($pts);
        if ($isHoliday) {
            if ($daily > 0) {
                $totalHeures += $daily; $joursTravailles += 1;
                if ($daily > 8) $heuresSupp += ($daily - 8);
            }
        } else {
            if ($daily > 0) {
                if ($dow !== 0) $joursTravailles += 1;
                if ($daily > 8 && $nightBase < 8) $heuresSupp += ($daily - 8);
                $totalHeures += $daily;
            }
        }
        $d->modify('+1 day');
    }
    return ['total_heures'=>$totalHeures,'heures_supp'=>$heuresSupp,'jours_travailles'=>$joursTravailles];
}
}