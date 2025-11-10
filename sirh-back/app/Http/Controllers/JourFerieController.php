<?php

namespace App\Http\Controllers;

use App\Models\JourFerie;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class JourFerieController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $joursFeries = JourFerie::orderBy('date', 'asc')->get();
        return response()->json($joursFeries);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'date' => 'required|date|unique:jours_feries,date',
            'nom' => 'required|string|max:255',
            'description' => 'nullable|string',
            'actif' => 'boolean'
        ]);

        $jourFerie = JourFerie::create($request->all());
        return response()->json($jourFerie, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(JourFerie $jourFerie): JsonResponse
    {
        return response()->json($jourFerie);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, JourFerie $jourFerie): JsonResponse
    {
        $request->validate([
            'date' => 'required|date|unique:jours_feries,date,' . $jourFerie->id,
            'nom' => 'required|string|max:255',
            'description' => 'nullable|string',
            'actif' => 'boolean'
        ]);

        $jourFerie->update($request->all());
        return response()->json($jourFerie);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(JourFerie $jourFerie): JsonResponse
    {
        $jourFerie->delete();
        return response()->json(['message' => 'Jour férié supprimé avec succès']);
    }

    /**
     * Get holidays for a specific year
     */
    public function getByYear(int $year): JsonResponse
    {
        $joursFeries = JourFerie::whereYear('date', $year)
            ->where('actif', true)
            ->orderBy('date', 'asc')
            ->get();
        
        return response()->json($joursFeries);
    }

    /**
     * Get holidays for a date range
     */
    public function getByDateRange(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date'
        ]);

        $joursFeries = JourFerie::whereBetween('date', [
            $request->start_date,
            $request->end_date
        ])->where('actif', true)
          ->orderBy('date', 'asc')
          ->get();
        
        return response()->json($joursFeries);
    }
}
