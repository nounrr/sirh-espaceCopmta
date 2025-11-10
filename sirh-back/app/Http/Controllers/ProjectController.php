<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function index()
    {
        return Project::with('todoLists')->get()->map(function ($project) {
            $project->tasks = $project->todoLists;
            return $project;
        });
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'titre' => 'required|string|max:255',
            'description' => 'nullable|string',
            'date_debut' => 'nullable|date',
            'date_fin_prevu' => 'nullable|date',
            'pourcentage_progression' => 'nullable|integer|min:0|max:100',
        ]);
        $project = Project::create($validated);
        return response()->json($project, 201);
    }

    public function show($id)
    {
        $project = Project::with('todoLists')->findOrFail($id);
        $project->tasks = $project->todoLists;
        return $project;
    }

    public function update(Request $request, $id)
    {
        $project = Project::findOrFail($id);
        $validated = $request->validate([
            'titre' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'date_debut' => 'nullable|date',
            'date_fin_prevu' => 'nullable|date',
            'pourcentage_progression' => 'nullable|integer|min:0|max:100',
        ]);
        $project->update($validated);
        return response()->json($project);
    }

    public function destroy($id)
    {
        $project = Project::findOrFail($id);
        $project->delete();
        return response()->json(['message' => 'Projet supprimé']);
    }
}
