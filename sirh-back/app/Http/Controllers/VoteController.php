<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Vote;
use App\Models\Answer;
use Illuminate\Support\Facades\Auth;

class VoteController extends Controller
{
    // Voter pour une réponse à une question d'un sondage
    public function store(Request $request)
    {
        $request->validate([
            'answer_id' => 'required|exists:answers,id',
        ]);

        $userId = Auth::id();

        // Empêcher de voter deux fois pour la même question
        $answer = Answer::with('question')->findOrFail($request->answer_id);

        $alreadyVoted = Vote::whereHas('answer', function($q) use ($answer) {
            $q->where('question_id', $answer->question_id);
        })->where('user_id', $userId)->exists();

        if ($alreadyVoted) {
            return response()->json(['message' => 'Vous avez déjà voté pour cette question.'], 403);
        }

        $vote = Vote::create([
            'answer_id' => $answer->id,
            'user_id' => $userId,
        ]);

        return response()->json(['message' => 'Vote enregistré !', 'vote_id' => $vote->id], 201);
    }
    // Récupérer les votes (tous pour RH, sinon ceux de l'utilisateur connecté)
    public function index(Request $request)
    {
        $user = Auth::user();
        if ($user->role && strtolower($user->role) === 'rh') {
            $votes = Vote::with(['answer', 'user'])->get();
        } else {
            $votes = Vote::with(['answer', 'user'])->where('user_id', $user->id)->get();
        }
        return response()->json($votes);
    }
}
