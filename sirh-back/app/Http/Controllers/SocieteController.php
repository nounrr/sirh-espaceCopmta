<?php

namespace App\Http\Controllers;

use App\Models\Societe;
use Illuminate\Http\Request;
use App\Models\User;

class SocieteController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index() {
        $user = auth()->user(); 

        if ($user->hasRole('Employe')) {
            $societe = $user->societe;  
            return response()->json([$societe]);
        } elseif ($user->hasAnyRole(['Chef_Dep', 'Chef_Projet','Chef_Chant'])) {
            $societe = $user->societe;  
            return response()->json([$societe]);
        } elseif ($user->hasAnyRole(['RH', 'Gest_RH'])) {
            $societes = Societe::all();
            return response()->json($societes);
        } else {
            return response()->json(['message' => 'Role non autorisé'], 403);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request) {
        $data = $request->all();
        $rules = ['nom' => 'required|string|unique:societes,nom'];

        if (isset($data[0])) {
            foreach ($data as $d) {
                validator($d, $rules)->validate();
                Societe::create($d);
            }
            return response()->json(['message' => 'Sociétés ajoutées']);
        } else {
            $validated = validator($data, $rules)->validate();
            return Societe::create($validated);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request) {
        foreach ($request->all() as $updateData) {
            $societe = Societe::findOrFail($updateData['id']);
            $rules = ['nom' => 'sometimes|string|unique:societes,nom,' . $updateData['id']];
            $validated = validator($updateData, $rules)->validate();
            $societe->update($validated);
        }
        return response()->json(['message' => 'Sociétés modifiées']);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request) {
        $ids = $request->input('ids');
        Societe::whereIn('id', $ids)->delete();
        return response()->json(['message' => 'Sociétés supprimées']);
    }
}
