<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\TodoList;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class TodoListController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        // RH/Gest_RH : voit tout, Chef : voit ses projets, Employé : que ses propres
        if (in_array($user->role, ['RH', 'Gest_RH'])) {
            return TodoList::with('tasks')->get();
        }
        // Optionally, filter by project if needed for Chef roles
        return TodoList::with('tasks')->get();
    }

    public function store(Request $request)
    {

      $validated=  $request->validate([
            'title' => 'required|string',
            'project_id' => 'required',
        ]);

        $todo = TodoList::create([
            'title' => $validated['title'],
            'created_by' => Auth::id(),
            'project_id' => $validated['project_id'],
        ]);

        return response()->json($validated['project_id'], 201);
        // return response()->json($todo->load('tasks'), 201);
    }

    public function show($id)
    {
        $todo = TodoList::with('tasks')->findOrFail($id);
        // Optionally, add project-based access control here
        return $todo;
    }

    public function destroy($id)
    {
        $todo = TodoList::findOrFail($id);

        if (Auth::id() !== $todo->created_by && !in_array(Auth::user()->role, ['RH', 'Gest_RH'])) {
            return response()->json(['error' => 'Non autorisé'], 403);
        }

        $todo->delete();

        return response()->json(['message' => 'Supprimée avec succès']);
    }

    public function update(Request $request, $id)
    {
        $todo = TodoList::findOrFail($id);

        // Vérifier si l'utilisateur est autorisé à modifier cette liste
        if (Auth::id() !== $todo->created_by && !in_array(Auth::user()->role, ['RH', 'Gest_RH'])) {
            return response()->json(['error' => 'Non autorisé'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string',
            'project_id' => 'required',
        ]);

        $todo->update([
            'title' => $validated['title'],
            'project_id' => $validated['project_id'],
        ]);

        return response()->json($todo->load('tasks'), 200);
    }
}
