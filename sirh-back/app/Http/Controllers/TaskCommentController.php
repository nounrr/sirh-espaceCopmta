<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\TaskComment;
use App\Models\TodoTask;
use Illuminate\Support\Facades\Auth;

class TaskCommentController extends Controller
{
    const USER_SELECT_FIELDS = 'user:id,name,prenom';

    public function index($taskId)
    {
        try {
            // Vérifier que la tâche existe
            TodoTask::findOrFail($taskId);
            
            $comments = TaskComment::where('todo_task_id', $taskId)
                ->with(self::USER_SELECT_FIELDS)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json($comments);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erreur lors de la récupération des commentaires: ' . $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request, $taskId)
    {
        try {
            // Vérifier que la tâche existe
            TodoTask::findOrFail($taskId);
            
            $request->validate([
                'comment' => 'required|string|min:1|max:1000',
            ]);

            $comment = TaskComment::create([
                'todo_task_id' => $taskId,
                'user_id' => Auth::id(),
                'comment' => $request->comment,
            ]);

            // Charger l'utilisateur avec le commentaire
            $comment->load(self::USER_SELECT_FIELDS);

            return response()->json($comment, 201);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'error' => 'La tâche avec ID ' . $taskId . ' n\'existe pas.'
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erreur lors de la création du commentaire: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $commentId)
    {
        try {
            $comment = TaskComment::findOrFail($commentId);
            
            // Vérifier que l'utilisateur peut modifier ce commentaire
            if ($comment->user_id !== Auth::id() && Auth::user()->role !== 'RH') {
                return response()->json(['error' => 'Non autorisé à modifier ce commentaire'], 403);
            }

            $request->validate([
                'comment' => 'required|string|min:1|max:1000',
            ]);

            $comment->update([
                'comment' => $request->comment,
            ]);

            $comment->load(self::USER_SELECT_FIELDS);

            return response()->json($comment);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erreur lors de la mise à jour du commentaire: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($commentId)
    {
        try {
            $comment = TaskComment::findOrFail($commentId);
            
            // Vérifier que l'utilisateur peut supprimer ce commentaire
            if ($comment->user_id !== Auth::id() && Auth::user()->role !== 'RH') {
                return response()->json(['error' => 'Non autorisé à supprimer ce commentaire'], 403);
            }

            $comment->delete();

            return response()->json(['message' => 'Commentaire supprimé avec succès']);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erreur lors de la suppression du commentaire: ' . $e->getMessage()
            ], 500);
        }
    }
}
