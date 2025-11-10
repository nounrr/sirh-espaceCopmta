<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Exports\DepartementsExport;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\DepartementsImport;

class DepartementExcelController extends Controller
{
    public function importDepartements(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv'
        ]);

        Excel::import(new DepartementsImport, $request->file('file'));

        return back()->with('success', 'Départements importés avec succès.');
    }
    public function exportDepartements()
    {
        return Excel::download(new DepartementsExport, 'departements.xlsx');
    }
}
