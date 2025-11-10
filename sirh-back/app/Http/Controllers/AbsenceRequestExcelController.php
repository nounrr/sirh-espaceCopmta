<?php

namespace App\Http\Controllers;
use App\Exports\AbsenceRequestsExport;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Http\Request;

class AbsenceRequestExcelController extends Controller
{
    public function import(Request $request)
    {
        
        return back()->with('success', 'Importation réussie !');
    }

    public function exportAbsences()
    {
        return Excel::download(new AbsenceRequestsExport, 'absence_requests.xlsx');
    }
}
