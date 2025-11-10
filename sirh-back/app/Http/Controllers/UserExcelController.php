<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Imports\UsersImport;
use App\Exports\UsersExport;
use Maatwebsite\Excel\Facades\Excel;

class UserExcelController extends Controller
{
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,csv', 
        ]);

        
        Excel::import(new UsersImport, $request->file('file'));

        return back()->with('success', 'Les employés ont été importés avec succès.');
    }

    public function exportUsers()
    {
        return Excel::download(new UsersExport, 'employes.xlsx');
    }
}
