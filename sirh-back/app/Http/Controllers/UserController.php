<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;


class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
// UserController.php

public function updatePlayerId(Request $request) {
    Log::info('User auth:', ['user' => Auth::user()]);

    $request->validate([
        'onesignal_player_id' => 'required|string|max:64',
    ]);
    $user = Auth::user();
    $user->onesignal_player_id = $request->onesignal_player_id;
    $user->save();
    return response()->json(['status' => 'ok']);
}



    public function index(Request $request) {
    $perPage = (int) ($request->query('per_page', 15));
    $perPage = $perPage > 0 ? $perPage : 15;
    $page = (int) ($request->query('page', 1));
    $authUser = Auth::user();
        $societeId = $authUser->societe_id; 

        if ($authUser->hasRole('Employe')) {
            // Employé : Ne voir que lui-même
            $authUser->load('societe');
            $usersQuery = User::query()->where('id', $authUser->id)->with('societe');

        } elseif ($authUser->hasAnyRole(['Chef_Dep', 'Chef_Projet', 'Chef_Chant'])) {
            // Chef_Dep / Chef_Projet / Chef_Chant : Voir les employés du même département ET de la même société
            $departementId = $authUser->departement_id;

            $usersQuery = User::with('societe')
                         ->where('departement_id', $departementId)
                         ->where('societe_id', $societeId);

        } elseif ($authUser->hasAnyRole(['RH', 'Gest_RH', 'Gest_Projet'])) {
            // RH : Voir tous les employés sans restriction
            $usersQuery = User::with('societe')->where('societe_id', $societeId);
        } else {
            return response()->json(['message' => 'Rôle non autorisé'], 403);
        }
        // Si employé normal: retourner pagination artificielle d'un élément
        if ($authUser->hasRole('Employe')) {
            $single = $usersQuery->first();
            if ($single) { $single->profile_picture_url = $single->profile_picture_url; }
            return response()->json([
                'data' => $single ? [$single] : [],
                'meta' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => 1,
                    'total' => $single ? 1 : 0,
                ]
            ]);
        }

        $paginator = $usersQuery->paginate($perPage, ['*'], 'page', $page);
        $transformed = $paginator->getCollection()->map(function ($user) {
            $user->profile_picture_url = $user->profile_picture_url;
            return $user;
        });
        return response()->json([
            'data' => $transformed,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    /**
     * Liste des clients (typeContrat = Client) sans affectation de rôles spécifiques.
     */
    public function clients(Request $request)
    {
        $perPage = (int) ($request->query('per_page', 15));
        $perPage = $perPage > 0 ? $perPage : 15;
        $page = (int) ($request->query('page', 1));
        $query = User::query()->where('typeContrat', 'Client');
        if ($search = $request->query('search')) {
            $query->where(function($q) use ($search) {
                $q->where('name', 'LIKE', "%$search%")
                  ->orWhere('prenom', 'LIKE', "%$search%")
                  ->orWhere('cin', 'LIKE', "%$search%");
            });
        }
        $paginator = $query->paginate($perPage, ['*'], 'page', $page);
        $data = $paginator->getCollection()->map(function($c){
            $c->profile_picture_url = $c->profile_picture_url;
            return $c;
        });
        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ]
        ]);
    }

    /**
     * Retourne la liste des portefeuilles distincts pour tous les clients.
     */
    public function clientPortefeuilles()
    {
        $portefeuilles = User::query()
            ->where('typeContrat', 'Client')
            ->whereNotNull('porfeuille')
            ->where('porfeuille', '<>', '')
            ->distinct()
            ->orderBy('porfeuille')
            ->pluck('porfeuille')
            ->values();

        return response()->json($portefeuilles);
    }
    
    public function EmployeTemp(Request $request){
    $perPage = (int) ($request->query('per_page', 15));
    $perPage = $perPage > 0 ? $perPage : 15;
    $page = (int) ($request->query('page', 1));
    $authUser = Auth::user();
        // $societeId = $authUser->societe_id; 
        $query = User::with('societe')->where('typeContrat', "Temporaire");
        $paginator = $query->paginate($perPage, ['*'], 'page', $page);
        $data = $paginator->getCollection()->map(function($u){
            $u->profile_picture_url = $u->profile_picture_url;
            return $u;
        });
        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ]
        ]);

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
            'name' => 'nullable|string|max:100',
            'cin' => 'nullable|string|max:20',
            'rib' => 'nullable|string|max:32',
            'situationFamiliale' => 'nullable|in:Célibataire,Marié,Divorcé',
            'sex' => 'nullable|in:H,F',
            'nbEnfants' => 'nullable|integer|min:0',
            'adresse' => 'nullable|string|max:255',
            'fonction' => 'nullable|string|max:55',
            'prenom' => 'nullable|string|max:50',
            'fonction' => 'nullable|string|max:50',
            'tel' => 'nullable|string|max:20',
            'email' => 'nullable|email|unique:users,email',
            'password' => 'nullable|string|min:6',
            'role' => 'nullable|in:Employe,Chef_Dep,RH,Chef_Projet,Chef_Chant,Gest_RH,Gest_Projet',
            'typeContrat' => 'nullable|in:Permanent,Temporaire,Client',
            'date_naissance' => 'nullable|date',
            'dateEmbauche' => 'nullable|date',
            // statut rule adjusted below depending on typeContrat
            'departement_id' => 'nullable|exists:departements,id',
            'societe_id' => 'required_if:typeContrat,Permanent|nullable|exists:societes,id',
            'picture' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'date_sortie' => 'nullable|date',
            'cnss' => 'nullable|string|max:30',
            'solde_conge' => 'nullable|numeric|min:0|max:365',
            'information_supplementaire' => 'nullable|string',
            'information_supplementaire2' => 'nullable|string',
            // Champs entreprise / légaux (tous optionnels pour compat)
            'raison_sociale' => 'nullable|string|max:255',
            'rc' => 'nullable|string|max:100',
            'ice' => 'nullable|string|max:100',
            'identifiant_fiscale' => 'nullable|string|max:100',
            'domaine_activite' => 'nullable|string|max:255',
            'revenu_mensuel_net' => 'nullable|numeric',
            'chiffre_affaires_dernier_ex' => 'nullable|numeric',
            'exercice_annee' => 'nullable|integer',
            'forme_juridique' => 'nullable|string|max:150',
            'date_creation' => 'nullable|date',
            'capital_social' => 'nullable|numeric',
            'associes' => 'nullable|string',
            'statut_juridique' => 'nullable|string|max:150',
            'regime_fiscal' => 'nullable|string|max:150',
            'date_debut_collaboration' => 'nullable|date',
            'type_mission' => 'nullable|string|max:150',
            'representant' => 'nullable|string|max:150',
            'montant_total' => 'nullable|numeric',
            'porfeuille' => 'nullable|string|max:150',
        ];
        // Restreindre statut pour les clients
        if (($request->input('typeContrat') ?? null) === 'Client') {
            $rules['statut'] = 'nullable|in:Actif,Inactif';
        } else {
            $rules['statut'] = 'nullable|in:Actif,Inactif,Congé,Malade';
        }
    
        $data = $request->all();
    
        if (isset($data[0])) {
            foreach ($data as $record) {
                $validator = Validator::make($record, $rules);
    
                if ($validator->fails()) {
                    return response()->json(['error' => $validator->errors()], 422);
                }
    
                $validated = $validator->validated();
    
                // Handle picture as base64 or skip it
                if (!empty($record['picture'])) {
                    $image = $record['picture'];
                    $fileName = time() . '_' . uniqid() . '.jpg';
                    Storage::disk('public')->put("profile_picture/$fileName", base64_decode($image));
                    $validated['picture'] = $fileName;
                }
    
                // Génère un mot de passe aléatoire si non fourni (ex: création client sans mot de passe)
                if (!empty($validated['password'])) {
                    $validated['password'] = Hash::make($validated['password']);
                } else {
                    $validated['password'] = Hash::make(Str::random(24));
                }
                $user = User::create($validated);
    
                if (isset($validated['role'])) {
                    $user->assignRole($validated['role']);
                }
            }
    
            return response()->json(['message' => 'Employés ajoutés']);
        }
    
        // Single user
        $validated = $request->validate($rules);
    
        if ($request->hasFile('picture') && $request->file('picture')->isValid()) {
            $profilePicture = $request->file('picture');
            $fileName = time() . '_' . $profilePicture->getClientOriginalName();
            $profilePicture->storeAs('profile_picture', $fileName, 'public');
            $validated['picture'] = $fileName;
        }
    
        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            $validated['password'] = Hash::make(Str::random(24));
        }
        $user = User::create($validated);
    
        if (isset($validated['role'])) {
            $user->assignRole($validated['role']);
        }
    
        return $user;
    }

    /**
     * Création rapide d'un client : force typeContrat = Client.
     */
    public function storeClient(Request $request)
    {
        // On s'assure que le type est forcé
        $request->merge(['typeContrat' => 'Client']);
        // Statut par défaut pour client et validation stricte
        if (!$request->filled('statut')) {
            $request->merge(['statut' => 'Actif']);
        }
        if (!in_array($request->input('statut'), ['Actif','Inactif'])) {
            return response()->json(['error' => ['statut' => ['Statut client invalide']]], 422);
        }
        return $this->store($request);
    }

    /**
     * Display the specified resource.
     */
    public function show(User $user)
    {
        $user->load('societe');
        $user->profile_picture_url = $user->profile_picture_url;
        return $user;
    }

    public function update(Request $request, $id)
{
    $user = User::findOrFail($id);

    $rules = [
        'cin' => 'sometimes|string|max:20',
        'rib' => 'sometimes|string|max:32',
        'date_naissance' => 'nullable|date',
        'sex' => 'nullable|in:H,F',
        'situationFamiliale' => 'sometimes|in:Célibataire,Marié,Divorcé',
        'nbEnfants' => 'sometimes|integer|min:0',
        'fonction' => 'nullable|string|max:55',
        'adresse' => 'sometimes|string|max:255',
        'name' => 'sometimes|string|max:50',
        'prenom' => 'sometimes|string|max:50',
        'tel' => 'sometimes|string|max:20',
        'email' => 'sometimes|email|unique:users,email,' . $id,
        'password' => 'sometimes|string|min:6',
        'role' => 'sometimes|in:Employe,Chef_Dep,RH,Chef_Projet,Chef_Chant,Gest_RH,Gest_Projet',
        'typeContrat' => 'sometimes|in:Permanent,Temporaire,Client',
        'dateEmbauche' => 'nullable|date',
        // statut rule adjusted below depending on typeContrat
        'departement_id' => 'sometimes|exists:departements,id',
        'societe_id' => 'sometimes|required_if:typeContrat,Permanent|nullable|exists:societes,id',
        'picture' => 'sometimes|file|image|mimes:jpeg,png,jpg,gif|max:2048',
        'date_sortie' => 'nullable|date',
        'cnss' => 'nullable|string|max:30',
        'solde_conge' => 'nullable|numeric|min:0|max:365',
        'information_supplementaire' => 'nullable|string',
        'information_supplementaire2' => 'nullable|string',
        // Champs entreprise / légaux (tous optionnels)
        'raison_sociale' => 'sometimes|nullable|string|max:255',
        'rc' => 'sometimes|nullable|string|max:100',
        'ice' => 'sometimes|nullable|string|max:100',
        'identifiant_fiscale' => 'sometimes|nullable|string|max:100',
        'domaine_activite' => 'sometimes|nullable|string|max:255',
        'revenu_mensuel_net' => 'sometimes|nullable|numeric',
        'chiffre_affaires_dernier_ex' => 'sometimes|nullable|numeric',
        'exercice_annee' => 'sometimes|nullable|integer',
        'forme_juridique' => 'sometimes|nullable|string|max:150',
        'date_creation' => 'sometimes|nullable|date',
        'capital_social' => 'sometimes|nullable|numeric',
        'associes' => 'sometimes|nullable|string',
        'statut_juridique' => 'sometimes|nullable|string|max:150',
        'regime_fiscal' => 'sometimes|nullable|string|max:150',
        'date_debut_collaboration' => 'sometimes|nullable|date',
        'type_mission' => 'sometimes|nullable|string|max:150',
        'representant' => 'sometimes|nullable|string|max:150',
        'montant_total' => 'sometimes|nullable|numeric',
        'porfeuille' => 'sometimes|nullable|string|max:150',
    ];

    // Adapter la règle de statut selon le type du user ciblé
    if ($user->typeContrat === 'Client') {
        $rules['statut'] = 'sometimes|in:Actif,Inactif';
    } else {
        $rules['statut'] = 'sometimes|in:Actif,Inactif,Congé,Malade';
    }

    $validator = Validator::make($request->all(), $rules);
    if ($validator->fails()) {
        return response()->json(['error' => $validator->errors()], 422);
    }

    $data = $validator->validated();

    // Gérer l'image si elle est envoyée
    if ($request->hasFile('picture')) {
        $file = $request->file('picture');
        $fileName = time() . '_' . $file->getClientOriginalName();
        $file->storeAs('profile_picture', $fileName, 'public');

        // Supprimer l'ancienne image si elle existe
        if ($user->picture && Storage::disk('public')->exists('profile_picture/' . $user->picture)) {
            Storage::disk('public')->delete('profile_picture/' . $user->picture);
        }

        $data['picture'] = $fileName;
    }

    // Hasher le mot de passe si fourni
    if (isset($data['password'])) {
        $data['password'] = Hash::make($data['password']);
    }

    $user->update($data);

    // Gérer le rôle si fourni
    if (isset($data['role'])) {
        $user->syncRoles([$data['role']]);
    }

    return response()->json(['message' => 'Utilisateur mis à jour avec succès', 'user' => $user]);
}

    public function updateSocieteDepartement(Request $request, $id)
    {
    $authUser = Auth::user();

        if (!$authUser->hasAnyRole(['RH','Chef_Dep', 'Chef_Projet', 'Chef_Chant', 'Gest_RH', 'Gest_Projet'])) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $user = User::findOrFail($id);
        $user->departement_id = $authUser->departement_id;
        $user->societe_id = $authUser->societe_id;
        $user->save();

        return response()->json(['message' => 'Employé affecté avec succès']);
    }

public function affecterSocieteDepartement(Request $request)
{
    // Vérification des droits de l'utilisateur authentifié
    $authUser = Auth::user();
    if (!method_exists($authUser, 'hasAnyRole') || !$authUser->hasAnyRole(['RH', 'Chef_Dep', 'Chef_Projet', 'Chef_Chant', 'Gest_RH', 'Gest_Projet'])) {
        return response()->json(['message' => 'Non autorisé'], 403);
    }

    // Validation des données reçues
    $rules = [
        'departement_id' => 'required|exists:departements,id',
        'societe_id' => 'required|exists:societes,id',
        'user_ids' => 'required|array|min:1',
        'user_ids.*' => 'exists:users,id'
    ];
    $validator = Validator::make($request->all(), $rules);
    if ($validator->fails()) {
        return response()->json(['error' => $validator->errors()], 422);
    }

    // Mise à jour en masse
    $userIds = $request->input('user_ids');
    $departementId = $request->input('departement_id');
    $societeId = $request->input('societe_id');

    User::whereIn('id', $userIds)
        ->update([
            'departement_id' => $departementId,
            'societe_id' => $societeId
        ]);

    return response()->json([
        'message' => 'Affectation réussie pour les utilisateurs sélectionnés.'
    ]);
}

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request) {
        $ids = $request->input('ids');
        User::whereIn('id', $ids)->delete();
        return response()->json(['message' => 'Employés supprimés']);
    }
}