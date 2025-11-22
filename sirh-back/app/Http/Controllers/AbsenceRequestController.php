<?php

namespace App\Http\Controllers;

use App\Models\AbsenceRequest;
use App\Models\AbsenceRequestDocument;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\Auth;


use App\Models\User;

use Illuminate\Http\Request;

class AbsenceRequestController extends Controller
{
    /**
     * Display a listing of the resource.
     */

     public function index()
     {
         /** @var \App\Models\User $authUser */
         $authUser = Auth::user();
         $societeId = $authUser->societe_id;
 
         if ($authUser->hasRole('Employe')) {
             // Employé : uniquement ses demandes d'absence
             $absences = AbsenceRequest::with(['user.departement','client','documents'])
                 ->where('user_id', $authUser->id)
                 ->get();
 
         } elseif ($authUser->hasAnyRole(['Chef_Dep','Chef_Chant', 'Chef_Projet'])) {
             // Chef_Dep ou Chef_Projet : demandes des employés de son département ET de sa société
             $absences = AbsenceRequest::with(['user.departement','client','documents'])
                 ->whereHas('user', function ($query) use ($authUser, $societeId) {
                     $query->where('departement_id', $authUser->departement_id)
                           ->where('societe_id', $societeId);
                 })
                 ->get();
 
         } elseif ($authUser->hasAnyRole(['RH', 'Gest_RH'])) {
             // RH : toutes les demandes sans restriction
             $absences = AbsenceRequest::with(['user.departement','client','documents'])
             ->whereHas('user', function ($query) use ($societeId) {
                $query->where('societe_id', $societeId);
            })
             ->get();

 
         } else {
             return response()->json(['message' => 'Rôle non autorisé'], 403);
         }
 
         return response()->json($absences);
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
        $rules = [
            'user_id' => 'required|exists:users,id',
            'client_id' => 'nullable|exists:users,id',
            'type' => 'required|in:Congé,maladie,autre,AttestationTravail,demande document',
            'dateDebut' => 'nullable|date|required_unless:type,AttestationTravail,demande document',
            'dateFin' => 'nullable|date|after_or_equal:dateDebut|required_unless:type,AttestationTravail,demande document',
            'motif' => 'nullable|string',
            'statut' => 'required|in:en_attente,validé,rejeté,approuvé,En demande',
            'justification' => 'nullable',
            'documents.*' => 'nullable|file|mimes:jpeg,png,pdf,doc,docx,xls,xlsx,csv,zip|max:8192',
        ];
    
        $data = $request->except('justification');

        // Ensure documents is taken from files, not input (if any conflict)
        if ($request->hasFile('documents')) {
            $data['documents'] = $request->file('documents');
        } else {
            unset($data['documents']);
        }
        
        if (isset($data[0])) {
            foreach ($data as $a) {
                $sanitized = $this->normalizeAbsencePayload($a);
                $validator = validator($sanitized, $rules);
                if ($validator->fails()) {
                    return response()->json(['error' => $validator->errors()], 422);
                }
                
                if ($request->hasFile('justification')) {
                    $file = $request->file('justification');
                    $fileName = time() . '_' . $file->getClientOriginalName();
                    $file->storeAs('justifications', $fileName, 'public');
                    $sanitized['justification'] = 'justifications/' . $fileName;
                    
                }
                
                // Ensure user_id is included
                if (!isset($sanitized['user_id'])) {
                    return response()->json(['error' => 'user_id is required'], 422);
                }
                if(isset($sanitized["type"]) && ($sanitized["type"] == "AttestationTravail")) {
                    $sanitized['dateDebut'] = null;
                    $sanitized['dateFin'] = null;
                }
                // Default statut when not provided
                if (!isset($sanitized['statut']) || $sanitized['statut'] === null || (is_string($sanitized['statut']) && trim($sanitized['statut']) === '')) {
                    $sanitized['statut'] = 'en_attente';
                }

                // Check overlap
                if (isset($sanitized['dateDebut']) && isset($sanitized['dateFin']) && $sanitized['dateDebut'] && $sanitized['dateFin'] && $sanitized['type'] !== 'demande document') {
                    if ($this->checkOverlap($sanitized['user_id'], $sanitized['dateDebut'], $sanitized['dateFin'])) {
                        return response()->json(['error' => ['dateDebut' => ['Une demande existe déjà pour cette période.']]], 422);
                    }
                }

                $created = AbsenceRequest::create($sanitized);
            }
            return response()->json(['message' => 'Absences ajoutées']);
        } else {
            $data = $this->normalizeAbsencePayload($data);
            $validator = validator($data, $rules);
            if ($validator->fails()) {
                return response()->json(['error' => $validator->errors()], 422);
            }
            
            if ($request->hasFile('justification')) {
                $file = $request->file('justification');
                $fileName = time() . '_' . $file->getClientOriginalName();
                $file->storeAs('justifications', $fileName, 'public');
                $data['justification'] = 'justifications/' . $fileName;

            }
            $absence = null;
            
            // Ensure user_id is included
            if (!isset($data['user_id'])) {
                return response()->json(['error' => 'user_id is required'], 422);
            }
            if(isset($data["type"]) && ($data["type"] == "AttestationTravail")) {
                $data['dateDebut'] = null;
                $data['dateFin'] = null;
            }
            if (!isset($data['statut']) || $data['statut'] === null || (is_string($data['statut']) && trim($data['statut']) === '')) {
                $data['statut'] = 'en_attente';
            }

            // Check overlap
            if (isset($data['dateDebut']) && isset($data['dateFin']) && $data['dateDebut'] && $data['dateFin'] && $data['type'] !== 'demande document') {
                if ($this->checkOverlap($data['user_id'], $data['dateDebut'], $data['dateFin'])) {
                    return response()->json(['error' => ['dateDebut' => ['Une demande existe déjà pour cette période.']]], 422);
                }
            }

            $absence = AbsenceRequest::create($data);
            // handle multiple documents[] on create
            if ($request->hasFile('documents')) {
                foreach ((array)$request->file('documents') as $doc) {
                    $stored = $doc->store('absence_docs', 'public');
                    AbsenceRequestDocument::create([
                        'absence_request_id' => $absence->id,
                        'path' => $stored,
                        'original_name' => $doc->getClientOriginalName(),
                        'mime_type' => $doc->getClientMimeType(),
                        'size' => (int) round($doc->getSize() / 1024),
                    ]);
                }
            }
            return $absence->load(['user.departement','client','documents']);
        }
    }
    

    /**
     * Display the specified resource.
     */
    public function show(AbsenceRequest $absenceRequest)
    {
        //
    }


    public function update(Request $request, $id)
    {
        $rules = [
            'user_id' => 'sometimes|required|exists:users,id',
            'client_id' => 'nullable|exists:users,id',
            'type' => 'sometimes|required|in:Congé,maladie,autre,AttestationTravail,demande document',
            'dateDebut' => 'sometimes|nullable|date',
            'dateFin' => 'sometimes|nullable|date|after_or_equal:dateDebut',
            'motif' => 'nullable|string',
            'statut' => 'sometimes|required|in:en_attente,validé,rejeté,approuvé,En demande',
            'justification' => 'nullable|file|mimes:jpeg,png,pdf,doc,docx,xls,xlsx,csv|max:5120',
            'documents.*' => 'nullable|file|mimes:jpeg,png,pdf,doc,docx,xls,xlsx,csv,zip|max:8192',
        ];
    
        $input = $this->normalizeAbsencePayload($request->all());

        // Ensure documents is taken from files, not input (if any conflict)
        if ($request->hasFile('documents')) {
            $input['documents'] = $request->file('documents');
        } else {
            unset($input['documents']);
        }

        $validator = validator($input, $rules);
    
        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 422);
        }

        // Check overlap for update
        $checkStart = $input['dateDebut'] ?? $request->input('dateDebut'); // Use input or request
        $checkEnd = $input['dateFin'] ?? $request->input('dateFin');
        
        // If dates are not in input, we might need to fetch them from DB if we want to be strict, 
        // but usually update sends changed fields. If dates are changed, we check.
        // If only one date is changed, we should probably fetch the other from DB to check range correctly.
        // For now, let's assume if dates are being updated, both or the range is relevant.
        
        $absence = AbsenceRequest::findOrFail($id);

        $newStart = array_key_exists('dateDebut', $input) ? $input['dateDebut'] : $absence->dateDebut;
        $newEnd = array_key_exists('dateFin', $input) ? $input['dateFin'] : $absence->dateFin;
        $userIdToCheck = array_key_exists('user_id', $input) ? $input['user_id'] : $absence->user_id;

        $typeToCheck = array_key_exists('type', $input) ? $input['type'] : $absence->type;

        if ($newStart && $newEnd && ($typeToCheck !== 'AttestationTravail' && $typeToCheck !== 'demande document')) {
             if ($this->checkOverlap($userIdToCheck, $newStart, $newEnd, $id)) {
                return response()->json(['error' => ['dateDebut' => ['Une demande existe déjà pour cette période.']]], 422);
             }
        }

        if ($request->hasFile('justification')) {
            $justificationValidator = validator($request->all(), [
                'justification' => 'file|mimes:jpeg,png,pdf,doc,docx,xls,xlsx,csv|max:5120',
            ]);

            if ($justificationValidator->fails()) {
                return response()->json(['error' => $justificationValidator->errors()], 422);
            }
        }
    
    $absence = AbsenceRequest::findOrFail($id);
    
        $validatedData = $validator->validated();
    
        // Mise à jour des champs présents dans la requête validée
        if (array_key_exists('user_id', $validatedData)) {
            $absence->user_id = $validatedData['user_id'];
        }
        if (array_key_exists('type', $validatedData)) {
            $absence->type = $validatedData['type'];
        }
        if (array_key_exists('client_id', $validatedData)) {
            $absence->client_id = $validatedData['client_id'];
        }
        if (array_key_exists('dateDebut', $validatedData)) {
            $absence->dateDebut = $validatedData['dateDebut'];
        }
        if (array_key_exists('dateFin', $validatedData)) {
            $absence->dateFin = $validatedData['dateFin'];
        }
        if (array_key_exists('motif', $validatedData)) {
            $absence->motif = $validatedData['motif'];
        }
        if (array_key_exists('statut', $validatedData)) {
            $absence->statut = $validatedData['statut'];
        }
    
        // Gestion du fichier justification
        if ($request->hasFile('justification')) {
            // Supprimer l'ancien fichier s'il existe
            if ($absence->justification && Storage::disk('public')->exists($absence->justification)) {
                Storage::disk('public')->delete($absence->justification);
            }
    
            // Enregistrer le nouveau fichier
            $path = $request->file('justification')->store('justifications', 'public');
            $absence->justification = $path;
    
    } elseif ($request->has('justification') && trim((string)$request->input('justification')) === '') {
            // Si le champ `justification` est explicitement `null`, supprimer le fichier existant
            if ($absence->justification && Storage::disk('public')->exists($absence->justification)) {
                Storage::disk('public')->delete($absence->justification);
            }
            $absence->justification = null;
    
        } elseif (is_string($request->input('justification'))) {
            // Si la justification est une chaîne (lien existant), ne pas modifier
        }

        // Ajout de nouveaux documents[] (additive)
        if ($request->hasFile('documents')) {
            foreach ((array)$request->file('documents') as $doc) {
                $stored = $doc->store('absence_docs', 'public');
                AbsenceRequestDocument::create([
                    'absence_request_id' => $absence->id,
                    'path' => $stored,
                    'original_name' => $doc->getClientOriginalName(),
                    'mime_type' => $doc->getClientMimeType(),
                    'size' => (int) round($doc->getSize() / 1024),
                ]);
            }
        }
    if($absence->type== "AttestationTravail") {
             $absence->dateDebut = null;
            $absence->dateFin = null;
        }
        $absence->save();
        $absence->load(['user.departement','client','documents']);
    
        return response()->json([
            'message' => 'Demande mise à jour avec succès.',
            'absence' => $absence
        ]);
    }
    
     
public function updateStatus(Request $request, $id)
{
    /** @var \App\Models\User $auth */
    $auth = Auth::user();
    $absence = AbsenceRequest::with('user')->findOrFail($id);

    // Normalisation de l'action (accepte 'action' OU 'status' depuis le frontend)
    $action = strtolower(trim((string) $request->input('action', '')));

    // Si le frontend envoie 'status', on le mappe vers une action attendue
    if ($action === '') {
        $statusInput = strtolower(trim((string) $request->input('status', '')));
        if ($statusInput !== '') {
            $statusToAction = [
                // vers validation
                'validé'    => 'valider',
                'valide'    => 'valider',
                'valider'   => 'valider',
                'approuvé'  => 'valider',
                'approuver' => 'valider',
                'approved'  => 'valider',
                'approve'   => 'valider',
                // vers annulation
                'annulé'    => 'annulé',
                'annule'    => 'annulé',
                'annuler'   => 'annulé',
                'canceled'  => 'annulé',
                'cancel'    => 'annulé',
                'rejeté'    => 'annulé',
                'rejete'    => 'annulé',
            ];
            if (isset($statusToAction[$statusInput])) {
                $action = $statusToAction[$statusInput];
            }
        }
    }

    // alias possibles pour 'action'
    $map = [
        'validate' => 'valider',
        'approval' => 'valider',
        'approve'  => 'valider',
        'cancel'   => 'annulé',
        'annulé'   => 'annulé',
        'annule'  => 'annulé',
    ];
    if (isset($map[$action])) {
        $action = $map[$action];
    }

    // défaut : valider si rien d'explicite
    if ($action === '') {
        $action = 'valider';
    }

    if (!in_array($action, ['valider','annulé'], true)) {
        return response()->json([
            'message' => 'Action invalide. Utilisez action=valider ou action=annulé.'
        ], 422);
    }

    // Statut courant (DB utilise : en_attente, validé, rejeté, approuvé)
    $current = mb_strtolower($absence->statut ?? 'en_attente');

    // --- Contrôles de périmètre communs ---
    // RH/Gest_RH : même société
    $sameSociete = $absence->user?->societe_id === $auth->societe_id;
    // Chef_* : même société + même département
    $sameDept = $absence->user?->departement_id === $auth->departement_id;

    if ($action === 'valider') {
        // RH ou Gest_RH => approuvé
        if ($auth->hasAnyRole(['RH','Gest_RH'])) {
            if (!$sameSociete) {
                return response()->json(['message' => 'Accès refusé : autre société.'], 403);
            }
            $newStatut = $current !== 'approuvé' ? 'approuvé' : $current;

        // Chefs => validé
        } elseif ($auth->hasAnyRole(['Chef_Dep','Chef_Projet','Chef_Chant'])) {
            if (!$sameSociete || !$sameDept) {
                return response()->json(['message' => 'Accès refusé : hors périmètre (société/département).'], 403);
            }
            if ($current === 'approuvé') {
                return response()->json(['message' => 'Déjà approuvée ; modification non autorisée pour ce rôle.'], 403);
            }
            // Chef peut passer en_attente -> validé ; si déjà validé, no-op
            $newStatut = $current === 'en_attente' ? 'validé' : $current;

        } else {
            return response()->json(['message' => 'Rôle non autorisé.'], 403);
        }

    } elseif ($action === 'annulé') { // action === 'annulé'
        // annulé = passer à "rejeté" (seulement RH/Gest_RH)
        if (!$auth->hasAnyRole(['RH','Gest_RH'])) {
            return response()->json(['message' => 'Seul le RH peut annulé.'], 403);
        }
        if (!$sameSociete) {
            return response()->json(['message' => 'Accès refusé : autre société.'], 403);
        }
    // Forcer le changement vers "rejeté" même si déjà rejeté (pour annulation)
    $newStatut = 'rejeté';
    } else {
        return response()->json(['message' => 'Statut non selectionner.'], 401);
    }

    // Rien à changer ? (sauf pour annulation qui doit toujours passer)
    if ($newStatut === $current && $action !== 'annulé') {
        return response()->json([
            'message' => 'Aucune modification nécessaire.',
            'absence' => $absence,
            'Newstatut' => $newStatut,
            'statut' => $newStatut
        ]);
    }

    // Eviter le mass-assignment au cas où 'statut' n'est pas fillable
    $absence->statut = $newStatut;
    $absence->save();

    // Retourner directement l'objet mis à jour pour correspondre au frontend
    return response()->json($absence->fresh(['user','client','documents']));
}

    public function downloadDocument($id)
    {
        \Illuminate\Support\Facades\Log::info("Download requested for document ID: {$id}");
        $document = AbsenceRequestDocument::findOrFail($id);
        
        if (!Storage::disk('public')->exists($document->path)) {
            \Illuminate\Support\Facades\Log::error("File not found: {$document->path}");
            abort(404, 'Fichier introuvable');
        }
        
        \Illuminate\Support\Facades\Log::info("Downloading file: {$document->path}");
        return Storage::disk('public')->download($document->path, $document->original_name);
    }

    public function downloadJustification($id)
    {
        \Illuminate\Support\Facades\Log::info("Download requested for justification ID: {$id}");
        $absence = AbsenceRequest::findOrFail($id);
        
        if (!$absence->justification || !Storage::disk('public')->exists($absence->justification)) {
            \Illuminate\Support\Facades\Log::error("Justification not found: {$absence->justification}");
            abort(404, 'Justification introuvable');
        }
        
        \Illuminate\Support\Facades\Log::info("Downloading justification: {$absence->justification}");
        return Storage::disk('public')->download($absence->justification);
    }

    public function downloadAttestation($id)
    {
        \Illuminate\Support\Facades\Log::info("Download requested for attestation ID: {$id}");
        $absence = AbsenceRequest::findOrFail($id);
        
        if (!$absence->attestation_url || !Storage::disk('public')->exists($absence->attestation_url)) {
            \Illuminate\Support\Facades\Log::error("Attestation not found: {$absence->attestation_url}");
            abort(404, 'Attestation introuvable');
        }
        
        \Illuminate\Support\Facades\Log::info("Downloading attestation: {$absence->attestation_url}");
        return Storage::disk('public')->download($absence->attestation_url);
    }

    private function normalizeAbsencePayload(array $payload): array
    {
        foreach (['dateDebut', 'dateFin', 'client_id'] as $field) {
            if (array_key_exists($field, $payload)) {
                $value = $payload[$field];
                if ($value === '' || $value === 'null') {
                    $payload[$field] = null;
                }
            }
        }

        return $payload;
    }



    /**
     * Remove the specified resource from storage.
     */

    public function destroy(Request $request) {
        $ids = $request->input('ids');
        AbsenceRequest::whereIn('id', $ids)->delete();
        return response()->json(['message' => 'Absences supprimées']);
    }



    public function exportAttestationTravail($id)
{
    // On récupère la demande avec l'utilisateur lié
    $demande = AbsenceRequest::with('user')->findOrFail($id);

    // Vérifie les conditions : type et statut
    if (
        strtolower($demande->type) === 'attestationtravail'
        && strtolower($demande->statut) === 'approuvé'
    ) {
        $user = $demande->user;
        $ville = 'Tanger'; // À adapter
        $date = Carbon::now()->format('d/m/Y');

        

        return Pdf::loadView('pdf.attestation_travail', compact('user', 'ville', 'date'/*, 'signature', 'cachet'*/))
            ->download('Attestation_Travail_'.$user->name.'.pdf');
    } else {
        return redirect()->back()->with('error', 'Document possible uniquement pour une demande approuvée de type Attestation de travail.');
    }
}

public function generateCongePdf($congeId)
{
    $conge = AbsenceRequest::with('user')->findOrFail($congeId);

    if (strtolower($conge->type) !== 'congé' || strtolower($conge->statut) !== 'approuvé') {
        abort(403, 'PDF disponible uniquement pour les congés approuvés');
    }

    $user = $conge->user;

    $dateDebut = Carbon::parse($conge->dateDebut)->startOfDay();
    $dateFin   = Carbon::parse($conge->dateFin)->startOfDay();

    // Durée (inclusif)
    $nbJoursTotal = $dateDebut->diffInDays($dateFin) + 1;

    // Jours fériés dans la période demandée
    $joursFeriesPeriode = DB::table('jours_feries')
        ->whereBetween('date', [$dateDebut->toDateString(), $dateFin->toDateString()])
        ->pluck('date')
        ->map(fn ($d) => Carbon::parse($d)->format('Y-m-d'))
        ->unique()
        ->values()
        ->toArray();

    $nbJoursFeries = count($joursFeriesPeriode);

    // Dimanches dans la période
    $periode = CarbonPeriod::create($dateDebut, $dateFin);
    $dimanchesPeriode = collect($periode)
        ->filter(fn (Carbon $d) => $d->isSunday())
        ->map(fn (Carbon $d) => $d->format('Y-m-d'))
        ->unique()
        ->values()
        ->toArray();

    // Dimanches non fériés
    $dimanchesNonFeries = array_values(array_diff($dimanchesPeriode, $joursFeriesPeriode));
    $nbDimanchesNonFeries = count($dimanchesNonFeries);

    // Jours de congé effectifs
    $nbJoursConge = max(0, $nbJoursTotal - $nbJoursFeries - $nbDimanchesNonFeries);

    /** -------------------------------
     *  Calcul de la date de reprise
     *  -------------------------------
     *  On part du lendemain de dateFin,
     *  et on avance tant que c'est dimanche OU férié.
     */
    $dateReprise = $dateFin->copy()->addDay();
    while (
        $dateReprise->isSunday() ||
        DB::table('jours_feries')->whereDate('date', $dateReprise->toDateString())->exists()
    ) {
        $dateReprise->addDay();
    }

    $pdf = Pdf::loadView('pdf.demande_conge', [
        'user'               => $user,
        'conge'              => $conge,
        'nbJoursTotal'       => $nbJoursTotal,
        'nbJoursFeries'      => $nbJoursFeries,
        'nbJoursConge'       => $nbJoursConge,
        'joursFeriesPeriode' => $joursFeriesPeriode,
        // ➕ on envoie la date de reprise calculée
        'dateReprise'        => $dateReprise->toDateString(),
    ])->setPaper('A4');

    return $pdf->download('demande_conge_'.$user->name.'.pdf');
}

    private function checkOverlap($userId, $start, $end, $excludeId = null)
    {
        if (!$start || !$end) return false;

        $query = AbsenceRequest::where('user_id', $userId)
            ->whereNotIn('statut', ['rejeté', 'annulé'])
            ->whereNotIn('type', ['demande document', 'AttestationTravail'])
            ->where(function ($q) use ($start, $end) {
                $q->where(function ($sub) use ($start, $end) {
                    $sub->where('dateDebut', '<=', $end)
                        ->where('dateFin', '>=', $start);
                });
            });        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }

    public function deleteDocument($id)
    {
        $document = AbsenceRequestDocument::findOrFail($id);
        
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $absence = $document->absenceRequest;
        
        // Check permissions: Owner or RH/Gest_RH
        if ($user->id !== $absence->user_id && !$user->hasAnyRole(['RH', 'Gest_RH'])) {
             return response()->json(['message' => 'Non autorisé'], 403);
        }

        if (Storage::disk('public')->exists($document->path)) {
            Storage::disk('public')->delete($document->path);
        }
        
        $document->delete();
        
        return response()->json(['message' => 'Document supprimé']);
    }
}