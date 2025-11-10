<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Publication;
use App\Models\PublicationTarget;
use App\Models\Question;
use App\Models\Answer;
use Illuminate\Support\Facades\Auth;

class PublicationController extends Controller
{



    /**
     * Affiche les publications ciblées pour l'utilisateur connecté (par user, département, société, rôle ou typeContrat)
     */
    public function index(Request $request)
    {
        $user = Auth::user();


        // Construction dynamique des critères OR
        $targetQuery = \App\Models\PublicationTarget::query();
        $targetQuery->where(function($q) use ($user) {
            // Par user direct
            $q->orWhere('user_id', $user->id);

            // Par département + société
            if ($user->departement_id && $user->societe_id) {
                $q->orWhere(function($sub) use ($user) {
                    $sub->where('departement_id', $user->departement_id)
                        ->where('societe_id', $user->societe_id);
                });
            }

            // Par rôle + société
            if ($user->role && $user->societe_id) {
                $q->orWhere(function($sub) use ($user) {
                    $sub->where('role', $user->role)
                        ->where('societe_id', $user->societe_id);
                });
            }

            // Par typeContrat
            if ($user->typeContrat) {
                $q->orWhere(function($sub) use ($user) {
                    $sub->where('typeContrat', $user->typeContrat);
                    if ($user->typeContrat !== 'temporaire' && $user->societe_id) {
                        $sub->where('societe_id', $user->societe_id);
                    }
                });
            }

            // Par société seule (societe_id sans user_id, departement_id, role, typeContrat)
            if ($user->societe_id) {
                $q->orWhere(function($sub) use ($user) {
                    $sub->where('societe_id', $user->societe_id)
                        ->whereNull('user_id')
                        ->whereNull('departement_id')
                        ->whereNull('role')
                        ->whereNull('typeContrat');
                });
            }

            // Par département seul (departement_id sans user_id, societe_id, role, typeContrat)
            if ($user->departement_id) {
                $q->orWhere(function($sub) use ($user) {
                    $sub->where('departement_id', $user->departement_id)
                        ->whereNull('user_id')
                        ->whereNull('societe_id')
                        ->whereNull('role')
                        ->whereNull('typeContrat');
                });
            }
        });

        $targetedPublicationIds = $targetQuery->pluck('publication_id')->unique()->toArray();

        // Récupérer les publications correspondantes (avec relations utiles)

        $isRH = $user && isset($user->role) && (stripos($user->role, 'rh') !== false);
        if ($isRH && $user->societe_id) {
            // RH : voir toutes les publications qui ciblent sa société (peu importe le département, user, etc.)
            // ou qui ciblent typeContrat = temporaire (toutes sociétés)
            $pubsSociete = PublicationTarget::where('societe_id', $user->societe_id)
                ->pluck('publication_id')->toArray();
            $pubsTemporaire = PublicationTarget::where('typeContrat', 'temporaire')
                ->pluck('publication_id')->toArray();
            $pubsRH = array_unique(array_merge($pubsSociete, $pubsTemporaire));
            $publicationsQuery = Publication::with(['questions.answers', 'targets', 'createdBy'])
                ->whereIn('id', $pubsRH);
        } else {
            // Non RH : logique classique, masquer les publications fermées
            $publicationsQuery = Publication::with(['questions.answers', 'targets', 'createdBy'])
                ->whereIn('id', $targetedPublicationIds)
                ->where('statut', '!=', 'ferme');
        }

        $publications = $publicationsQuery
            ->orderByDesc('created_at')
            ->get();

        return response()->json($publications);
    }

    // Création d'une publication (news ou sondage)
    public function store(Request $request)
{
    $request->validate([
        'type'   => 'required|in:news,sondage',
        'titre'  => 'required|string|max:255',
        'texte'  => 'nullable|string',
        'questions' => 'array', // obligatoire pour un sondage
        'questions.*.question' => 'required_if:type,sondage|string',
        'questions.*.answers' => 'required_if:type,sondage|array|min:2',
        'targets' => 'required|array',
        'statut' => 'nullable|in:brouillon,publie,ferme',
    ]);

    $user = Auth::user();

    // Création publication
    $publication = Publication::create([
        'type' => $request->type,
        'titre' => $request->titre,
        'texte' => $request->texte,
        'created_by' => $user->id,
        'statut' => $request->statut ?? 'brouillon',
    ]);

    $targets = $request->targets;

    // user_ids
    if (!empty($targets['user_ids'])) {
        foreach ($targets['user_ids'] as $userId) {
            PublicationTarget::create([
                'publication_id' => $publication->id,
                'user_id' => $userId,
                'societe_id' => $user->societe_id,
            ]);
        }
    }
    // departements
    if (!empty($targets['departements'])) {
        foreach ($targets['departements'] as $depId) {
            PublicationTarget::create([
                'publication_id' => $publication->id,
                'departement_id' => $depId,
                'societe_id' => $user->societe_id,
            ]);
        }
    }
    // sociétés (ajout du support de societe_ids)
    if (!empty($targets['societe_ids'])) {
        foreach ($targets['societe_ids'] as $societeId) {
            PublicationTarget::create([
                'publication_id' => $publication->id,
                'societe_id' => $societeId,
            ]);
        }
    }
    // roles
    if (!empty($targets['roles'])) {
        foreach ($targets['roles'] as $role) {
            PublicationTarget::create([
                'publication_id' => $publication->id,
                'role' => $role,
                'societe_id' => $user->societe_id,
            ]);
        }
    }
    // typeContrat (peut être tableau ou string)
    if (!empty($targets['typeContrat'])) {
        $typeContrats = is_array($targets['typeContrat']) ? $targets['typeContrat'] : [$targets['typeContrat']];
        foreach ($typeContrats as $typeContrat) {
            if ($typeContrat === "temporaire") {
                PublicationTarget::create([
                    'publication_id' => $publication->id,
                    'typeContrat' => $typeContrat,
                    'societe_id' => null,
                ]);
            } else {
                PublicationTarget::create([
                    'publication_id' => $publication->id,
                    'typeContrat' => $typeContrat,
                    'societe_id' => $user->societe_id,
                ]);
            }
        }
    }

    // Si sondage : questions + answers
    if ($publication->type === 'sondage' && !empty($request->questions)) {
        foreach ($request->questions as $questionData) {
            $question = Question::create([
                'publication_id' => $publication->id,
                'question' => $questionData['question'],
            ]);
            foreach ($questionData['answers'] as $answerText) {
                Answer::create([
                    'question_id' => $question->id,
                    'answer' => $answerText,
                ]);
            }
        }
    }

    // NOTIFICATION OneSignal
    $this->notifyTargets($publication);

    return response()->json(['message' => 'Publication créée !', 'id' => $publication->id], 201);
}
// Route: PUT /publications/{id}/statut

public function update(Request $request, $id)
{
    $request->validate([
        'statut' => 'required|in:publie,brouillon,ferme',
    ]);
    $publication = Publication::findOrFail($id);
    $publication->statut = $request->statut;
    $publication->save();

    return response()->json($publication);
}

/**
 * Envoie les notifications OneSignal aux utilisateurs ciblés.
 */
protected function notifyTargets($publication)
{
    // On va chercher tous les user_id ciblés
    $targets = $publication->targets;
    $userIds = [];

    foreach ($targets as $target) {
        // Par user direct
        if ($target->user_id) { $userIds[] = $target->user_id; }
        // Par département + société
        if ($target->departement_id) {
            $ids = \App\Models\User::where('departement_id', $target->departement_id);
            if ($target->societe_id) { $ids = $ids->where('societe_id', $target->societe_id); }
            $userIds = array_merge($userIds, $ids->pluck('id')->toArray());
        }
        // Par rôle + société
        if ($target->role) {
            $ids = \App\Models\User::role($target->role);
            if ($target->societe_id) { $ids = $ids->where('societe_id', $target->societe_id); }
            $userIds = array_merge($userIds, $ids->pluck('id')->toArray());
        }
        // Par typeContrat
        if ($target->typeContrat) {
            $ids = \App\Models\User::where('typeContrat', $target->typeContrat);
            // Cas temporaire = toutes sociétés (PAS de where(societe_id))
            if ($target->typeContrat !== "temporaire" && $target->societe_id) {
                $ids = $ids->where('societe_id', $target->societe_id);
            }
            $userIds = array_merge($userIds, $ids->pluck('id')->toArray());
        }
        // Par société seule (societe_id sans user_id, departement_id, role, typeContrat)
        if ($target->societe_id && !$target->user_id && !$target->departement_id && !$target->role && !$target->typeContrat) {
            $ids = \App\Models\User::where('societe_id', $target->societe_id)->pluck('id')->toArray();
            $userIds = array_merge($userIds, $ids);
        }
    }
    // Envoie unique pour chaque user
    $userIds = array_unique($userIds);

    // Récupérer les PlayerIDs OneSignal des users
    $players = \App\Models\User::whereIn('id', $userIds)
        ->whereNotNull('onesignal_player_id')
        ->pluck('onesignal_player_id')
        ->toArray();

    if (count($players)) {
        $title = $publication->titre;
        $msg = $publication->texte ?? 'Nouvelle publication';
        $this->sendOneSignal($players, $title, $msg);

    }
}

/**
 * Envoie une notif OneSignal à une liste de PlayerIDs
 */
protected function sendOneSignal(array $subscriptionIds, string $title, string $body)
{
    // Nettoyage basique des IDs
    $subscriptionIds = array_values(array_filter(array_unique($subscriptionIds)));
    if (empty($subscriptionIds)) {
        \Log::warning('[OneSignal] No subscription ids to send', ['title' => $title]);
        return ['ok' => false, 'reason' => 'no_subscription_ids'];
    }
$appId = config('services.onesignal.app_id');
    $payload = [
        'app_id' => "7d3c9662-61d2-47bd-8f2d-dd448659fc79",
        'include_subscription_ids' => $subscriptionIds, // Ciblage par SUBSCRIPTION uniquement
        'headings' => ['en' => $title, 'fr' => $title],
        'contents' => ['en' => $body, 'fr' => $body],
    ];

    // --- cURL call ---
    $ch = curl_init('https://onesignal.com/api/v1/notifications');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json; charset=utf-8',
        'Authorization: Basic ' . "os_v2_app_pu6jmytb2jd33dzn3vcimwp4phjrah4wrehunpm2quyumnytxn32p7b6pcywozfxu5ibbsqm5ee3jwii3ea4mv5g4yw2hwbokim53uy",
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_UNESCAPED_UNICODE));

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch); // <-- toujours défini
    curl_close($ch);

    // Sécurise l'analyse des erreurs
    if ($response === false && !$curlErr) {
        $curlErr = 'curl_exec returned false';
    }

    if ($curlErr) {
        \Log::error('[OneSignal] cURL error: ' . $curlErr, ['payload' => $payload]);
        return ['ok' => false, 'http' => $httpCode, 'error' => $curlErr];
    }

    // Parse JSON OneSignal
    $data = json_decode($response, true);

    if ($httpCode < 200 || $httpCode >= 300) {
        \Log::error('[OneSignal] HTTP error '.$httpCode, ['resp' => $response, 'payload' => $payload]);
        return ['ok' => false, 'http' => $httpCode, 'response' => $data ?: $response];
    }

    \Log::info('[OneSignal] Notification sent', [
        'http' => $httpCode,
        'id' => $data['id'] ?? null,
        'recipients' => $data['recipients'] ?? null
    ]);

    return ['ok' => true, 'http' => $httpCode, 'response' => $data];
}



    // Afficher une publication précise (avec questions et réponses)
    public function show($id)
    {
        $publication = Publication::with(['questions.answers', 'targets', 'createdBy'])->findOrFail($id);
        return response()->json($publication);
    }

    // Supprimer une publication unique
public function destroy($id)
{
    $publication = Publication::findOrFail($id);
    $publication->delete();

    return response()->json(['message' => 'Publication supprimée']);
}

// Supprimer plusieurs publications (reçois un tableau d'IDs)
public function destroyMany(Request $request)
{
    $request->validate([
        'ids' => 'required|array|min:1',
        'ids.*' => 'integer|exists:publications,id'
    ]);

    Publication::whereIn('id', $request->ids)->delete();

    return response()->json(['message' => 'Publications supprimées']);
}

}
