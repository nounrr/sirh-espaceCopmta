<?php

namespace App\Http\Controllers;

use App\Models\UserTypeDoc;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;

class UserTypeDocController extends Controller
{
public function getUserDocs($userId = null)
{
    $user = Auth::user();

    // RH (and optionally Gest_RH) should see docs for:
    // - all employees in the same company (societe_id)
    // - all clients (typeContrat = 'Client') regardless of societe
    $isRHOrManager = (($user->role ?? null) === 'RH') || (($user->role ?? null) === 'Gest_RH');
    if ($isRHOrManager) {
        $userIds = \App\Models\User::query()
            ->where('societe_id', $user->societe_id)
            ->orWhere('typeContrat', 'Client')
            ->pluck('id');

        $docs = \App\Models\UserTypeDoc::whereIn('user_id', $userIds)
            ->get()
            ->groupBy('user_id')
            ->values();

        return response()->json($docs);
    } else {
        // Default: only own docs
        $docs = \App\Models\UserTypeDoc::where('user_id', $user->id)->get();
        $grouped = collect([$user->id => $docs])->values();
        return response()->json($grouped);
    }
}



    public function uploadDocument(Request $request, $userId)
{
    $request->validate([
        'type_doc_id' => 'required|exists:type_docs,id',
        'document' => 'required|file|max:10240'
    ]);
// $userId=$request->user_id;
    // $user = Auth::user();
    // $targetUser = User::findOrFail($userId);

    // if (!$user->hasRole('RH') && $user->id !== $targetUser->id) {
    //     return response()->json(['message' => 'Non autorisé'], 403);
    // }

    $file = $request->file('document');
    $path = $file->store('documents/' . $userId, 'public');

    $userTypeDoc = \App\Models\UserTypeDoc::create([
    'user_id' => $userId,
    'type_doc_id' => $request->type_doc_id,
    'is_provided' => true,
    'file_path' => $path
]);


    return response()->json($userTypeDoc);
}


    public function uploadMultipleDocuments(Request $request, $userId)
    {
        $request->validate([
            'documents' => 'required|array',
            'documents.*.type_doc_id' => 'required|exists:type_docs,id',
            'documents.*.file' => 'required|file|max:10240'
        ]);

        $user = Auth::user();
        $targetUser = User::findOrFail($userId);

        $isRH = (($user->role ?? null) === 'RH');
        if (!$isRH && $user->id !== $targetUser->id) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $results = [];
        foreach ($request->file('documents') as $document) {
            $path = $document['file']->store('documents/' . $userId, 'public');
            
            $userTypeDoc = UserTypeDoc::updateOrCreate(
                [
                    'user_id' => $userId,
                    'type_doc_id' => $document['type_doc_id']
                ],
                [
                    'is_provided' => true,
                    'file_path' => $path
                ]
            );

            $results[] = $userTypeDoc;
        }

        return response()->json($results);
    }

    public function deleteDocument($userId, $typeDocId)
    {
        $user = Auth::user();
        $targetUser = User::findOrFail($userId);

        $isRH = (($user->role ?? null) === 'RH');
        if (!$isRH && $user->id !== $targetUser->id) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $userTypeDoc = UserTypeDoc::where('user_id', $userId)
            ->where('type_doc_id', $typeDocId)
            ->firstOrFail();

        if ($userTypeDoc->file_path) {
            Storage::disk('public')->delete($userTypeDoc->file_path);
        }

        $userTypeDoc->delete();

        return response()->json(['message' => 'Document supprimé']);
    }
}