<?php

namespace App\Http\Controllers;

use App\Models\Departement;
use Illuminate\Http\Request;
use App\Models\User;

class DepartementController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index() {
        // return Departement::all();
        $user = auth()->user(); 

        if ($user->hasRole('Employe')) {
            $departement = $user->departement;  
            return response()->json([$departement]);
        } elseif ($user->hasAnyRole(['Chef_Dep', 'Chef_Projet','Chef_Chant'])) {
            $departement = $user->departement;  
            return response()->json([$departement]);
        } elseif ($user->hasAnyRole(['RH', 'Gest_RH'])) {
            $departements = Departement::all();
            return response()->json($departements);
        } else {
            return response()->json(['message' => 'Role non autorisé'], 403);
        }
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request) {
        $data = $request->all();
        $rules = ['nom' => 'required|string|unique:departements,nom'];

        if (isset($data[0])) {
            foreach ($data as $d) {
                validator($d, $rules)->validate();
                Departement::create($d);
            }
            return response()->json(['message' => 'Départements ajoutés']);
        } else {
            $validated = validator($data, $rules)->validate();
            return Departement::create($validated);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Departement $departement)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Departement $departement)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request) {
        foreach ($request->all() as $updateData) {
            $departement = Departement::findOrFail($updateData['id']);
            $rules = ['nom' => 'sometimes|string|unique:departements,nom,' . $updateData['id']];
            $validated = validator($updateData, $rules)->validate();
            $departement->update($validated);
        }
        return response()->json(['message' => 'Départements modifiés']);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request) {
        $ids = $request->input('ids');
        Departement::whereIn('id', $ids)->delete();
        return response()->json(['message' => 'Départements supprimés']);
    }
}
