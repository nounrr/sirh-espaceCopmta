<?php

namespace App\Http\Controllers;

use App\Models\Salaire;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class SalaireController extends Controller
{
    /**
     * Afficher la liste des salaires
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();
            $query = Salaire::with('user');

            // Filtrer par société si l'utilisateur n'est pas admin global
            if ($user->role !== 'admin') {
                $query->whereHas('user', function ($q) use ($user) {
                    $q->where('societe_id', $user->societe_id);
                });
            }

            // Filtres optionnels
            if ($request->has('user_id')) {
                $query->where('user_id', $request->user_id);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->whereHas('user', function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('prenom', 'like', "%{$search}%");
                });
            }

            // Gestion de la pagination personnalisée (per_page param ou 'all')
            $perPage = $request->get('per_page', 15);

            if (strtolower($perPage) === 'all') {
                // Récupérer tous les enregistrements sans pagination
                $collection = $query->orderBy('created_at', 'desc')->get();
                // Recréer une structure similaire à celle de paginate() pour ne pas casser le front
                $salaires = [
                    'data' => $collection,
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $collection->count(),
                    'total' => $collection->count(),
                    'from' => $collection->isEmpty() ? null : 1,
                    'to' => $collection->count(),
                ];
            } else {
                $perPage = (int)$perPage > 0 ? (int)$perPage : 15;
                $salaires = $query->orderBy('created_at', 'desc')->paginate($perPage);
            }

            return response()->json([
                'success' => true,
                'data' => $salaires
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des salaires: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des salaires'
            ], 500);
        }
    }

    /**
     * Afficher un salaire spécifique
     */
    public function show($id)
    {
        try {
            $user = Auth::user();
            $salaire = Salaire::with('user')->findOrFail($id);

            // Vérifier les permissions
            if ($user->role !== 'admin' && $salaire->user->societe_id !== $user->societe_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Accès non autorisé'
                ], 403);
            }

            return response()->json([
                'success' => true,
                'data' => $salaire
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération du salaire: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Salaire non trouvé'
            ], 404);
        }
    }

    /**
     * Créer un nouveau salaire
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'user_id' => 'required|exists:users,id',
                'salaire_base' => 'required|numeric|min:0',
                'panier' => 'nullable|numeric|min:0',
                'represent' => 'nullable|numeric|min:0',
                'transport' => 'nullable|numeric|min:0',
                'deplacement' => 'nullable|numeric|min:0',
                'salaire_net' => 'nullable|numeric|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            $user = Auth::user();
            $targetUser = User::findOrFail($request->user_id);

            // Vérifier les permissions
            if ($user->role !== 'admin' && $targetUser->societe_id !== $user->societe_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Accès non autorisé'
                ], 403);
            }

            $salaire = Salaire::create([
                'user_id' => $request->user_id,
                'salaire_base' => $request->salaire_base ?? 0,
                'panier' => $request->panier ?? 0,
                'represent' => $request->represent ?? 0,
                'transport' => $request->transport ?? 0,
                'deplacement' => $request->deplacement ?? 0,
                'salaire_net' => $request->salaire_net ?? 0
            ]);

            Log::info('Nouveau salaire créé', [
                'salaire_id' => $salaire->id,
                'user_id' => $salaire->user_id,
                'created_by' => $user->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Salaire créé avec succès',
                'data' => $salaire->load('user')
            ], 201);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la création du salaire: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création du salaire'
            ], 500);
        }
    }

    /**
     * Mettre à jour un salaire
     */
    public function update(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'salaire_base' => 'nullable|numeric|min:0',
                'panier' => 'nullable|numeric|min:0',
                'represent' => 'nullable|numeric|min:0',
                'transport' => 'nullable|numeric|min:0',
                'deplacement' => 'nullable|numeric|min:0',
                'salaire_net' => 'nullable|numeric|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            $user = Auth::user();
            $salaire = Salaire::with('user')->findOrFail($id);

            // Vérifier les permissions
            if ($user->role !== 'admin' && $salaire->user->societe_id !== $user->societe_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Accès non autorisé'
                ], 403);
            }

            $salaire->update($request->only([
                'salaire_base', 'panier', 'represent', 'transport', 'deplacement', 'salaire_net'
            ]));

            Log::info('Salaire mis à jour', [
                'salaire_id' => $salaire->id,
                'user_id' => $salaire->user_id,
                'updated_by' => $user->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Salaire mis à jour avec succès',
                'data' => $salaire->fresh()->load('user')
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la mise à jour du salaire: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour du salaire'
            ], 500);
        }
    }

    /**
     * Supprimer un salaire
     */
    public function destroy($id)
    {
        try {
            $user = Auth::user();
            $salaire = Salaire::with('user')->findOrFail($id);

            // Vérifier les permissions
            if ($user->role !== 'admin' && $salaire->user->societe_id !== $user->societe_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Accès non autorisé'
                ], 403);
            }

            $salaire->delete();

            Log::info('Salaire supprimé', [
                'salaire_id' => $id,
                'user_id' => $salaire->user_id,
                'deleted_by' => $user->id
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Salaire supprimé avec succès'
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la suppression du salaire: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression du salaire'
            ], 500);
        }
    }

    /**
     * Obtenir le salaire actuel d'un utilisateur
     */
    public function getSalaireActuel($userId)
    {
        try {
            $user = Auth::user();
            $targetUser = User::findOrFail($userId);

            // Vérifier les permissions
            if ($user->role !== 'admin' && $targetUser->societe_id !== $user->societe_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Accès non autorisé'
                ], 403);
            }

            $salaireActuel = $targetUser->salaireActuel;

            if (!$salaireActuel) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucun salaire trouvé pour cet utilisateur'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $salaireActuel
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération du salaire actuel: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération du salaire'
            ], 500);
        }
    }

    /**
     * Obtenir l'historique des salaires d'un utilisateur
     */
    public function getHistorique($userId)
    {
        try {
            $user = Auth::user();
            $targetUser = User::findOrFail($userId);

            // Vérifier les permissions
            if ($user->role !== 'admin' && $targetUser->societe_id !== $user->societe_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Accès non autorisé'
                ], 403);
            }

            $historique = $targetUser->salaires()
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $historique
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération de l\'historique: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de l\'historique'
            ], 500);
        }
    }

    /**
     * Statistiques des salaires
     */
    public function getStatistiques()
    {
        try {
            $user = Auth::user();
            $query = Salaire::with('user');

            // Filtrer par société si nécessaire
            if ($user->role !== 'admin') {
                $query->whereHas('user', function ($q) use ($user) {
                    $q->where('societe_id', $user->societe_id);
                });
            }

            $salaires = $query->get();

            $stats = [
                'total_employes' => $salaires->count(),
                'salaire_moyen' => $salaires->avg('salaire_base'),
                'salaire_min' => $salaires->min('salaire_base'),
                'salaire_max' => $salaires->max('salaire_base'),
                'total_panier' => $salaires->sum('panier'),
                'total_represent' => $salaires->sum('represent'),
                'total_transport' => $salaires->sum('transport'),
                'total_deplacement' => $salaires->sum('deplacement'),
                'masse_salariale_base' => $salaires->sum('salaire_base'),
                'masse_salariale_totale' => $salaires->sum(function ($s) {
                    return $s->salaire_total;
                })
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur lors du calcul des statistiques: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du calcul des statistiques'
            ], 500);
        }
    }
}