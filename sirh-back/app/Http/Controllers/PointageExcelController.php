<?php

namespace App\Http\Controllers;
use App\Exports\PointagesExport;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Http\Request;

class PointageExcelController extends Controller
{
    public function import(Request $request)
    {
        return back()->with('success', 'Importation réussie !');
    }

    public function exportPointages(Request $request)
    {
        try {
            // Récupérer les paramètres de la requête
            $startDate = $request->query('startDate');
            $endDate = $request->query('endDate');
            $specificDate = $request->query('specificDate');
            $month = $request->query('month');
            $exportAll = $request->query('exportAll', false);
            
            // Log des paramètres reçus
            \Log::info('Paramètres reçus pour l\'export:', [
                'startDate' => $startDate,
                'endDate' => $endDate,
                'specificDate' => $specificDate,
                'month' => $month,
                'exportAll' => $exportAll
            ]);

            // Créer l'export avec les paramètres (export multi-feuilles)
            $export = new PointagesExport(
                $startDate, 
                $endDate, 
                $specificDate, 
                $month, 
                null, // $year is extracted from $month in the constructor
                $exportAll
            );

            // Générer le fichier Excel avec plusieurs feuilles
            return Excel::download($export, 'pointages.xlsx');
        } catch (\Exception $e) {
            \Log::error('Erreur lors de l\'export des pointages: ' . $e->getMessage());
            return response()->json(['error' => 'Une erreur est survenue lors de l\'export'], 500);
        }
    }
}
