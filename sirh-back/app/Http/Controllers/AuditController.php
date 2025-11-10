<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuditController extends Controller
{
    /**
     * Récupérer la liste des audits avec filtres optionnels
     */
    public function index(Request $request)
    {
        // Vérifier que l'utilisateur est RH ou Gest_RH
        if (!in_array(Auth::user()->role, ['RH', 'Gest_RH', 'admin'])) {
            return response()->json(['error' => 'Non autorisé'], 403);
        }
        
        $query = Audit::with('user')->orderBy('created_at', 'desc');
        
        // Filtrage par type d'entité
        if ($request->filled('entity_type')) {
            $entityType = $request->entity_type;
            switch ($entityType) {
                case 'project':
                    $query->where('auditable_type', 'App\Models\Project');
                    break;
                case 'todolist':
                    $query->where('auditable_type', 'App\Models\TodoList');
                    break;
                case 'todotask':
                    $query->where('auditable_type', 'App\Models\TodoTask');
                    break;
            }
        }
        
        // Filtrage par ID d'entité
        if ($request->filled('entity_id')) {
            $query->where('auditable_id', $request->entity_id);
        }
        
        // Filtrage par type d'événement
        if ($request->filled('event')) {
            $query->where('event', $request->event);
        }
        
        // Filtrage par utilisateur
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        
        // Filtrage par date
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }
        
        // Pagination
        $perPage = $request->per_page ?? 15;
        
        return $query->paginate($perPage);
    }
    
    /**
     * Obtenir les détails d'un audit spécifique
     */
    public function show($id)
    {
        // Vérifier que l'utilisateur est RH ou Gest_RH
        if (!in_array(Auth::user()->role, ['RH', 'Gest_RH', 'admin'])) {
            return response()->json(['error' => 'Non autorisé'], 403);
        }
        
        $audit = Audit::with('user')->findOrFail($id);
        return response()->json($audit);
    }
    
    /**
     * Récupérer l'historique d'audit pour une entité spécifique
     */
    public function entityHistory(Request $request)
    {
        // Vérifier que l'utilisateur est RH ou Gest_RH
        if (!in_array(Auth::user()->role, ['RH', 'Gest_RH', 'admin'])) {
            return response()->json(['error' => 'Non autorisé'], 403);
        }
        
        $request->validate([
            'entity_type' => 'required|string|in:project,todolist,todotask',
            'entity_id' => 'required|integer'
        ]);
        
        $entityTypeMap = [
            'project' => 'App\Models\Project',
            'todolist' => 'App\Models\TodoList',
            'todotask' => 'App\Models\TodoTask'
        ];
        
        $auditableType = $entityTypeMap[$request->entity_type];
        $auditableId = $request->entity_id;
        
        $audits = Audit::with('user')
            ->where('auditable_type', $auditableType)
            ->where('auditable_id', $auditableId)
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json($audits);
    }
    
    /**
     * Tableau de bord des statistiques d'audit
     */
    public function dashboard(Request $request)
    {
        // Vérifier que l'utilisateur est RH ou Gest_RH
        if (!in_array(Auth::user()->role, ['RH', 'Gest_RH', 'admin'])) {
            return response()->json(['error' => 'Non autorisé'], 403);
        }
        
        // Date de début par défaut (il y a 30 jours)
        $startDate = $request->start_date ?? now()->subDays(30)->format('Y-m-d');
        $endDate = $request->end_date ?? now()->format('Y-m-d');
        
        // Statistiques par entité
        $entityStats = Audit::selectRaw('auditable_type, COUNT(*) as count')
            ->whereDate('created_at', '>=', $startDate)
            ->whereDate('created_at', '<=', $endDate)
            ->groupBy('auditable_type')
            ->get();
            
        // Statistiques par événement
        $eventStats = Audit::selectRaw('event, COUNT(*) as count')
            ->whereDate('created_at', '>=', $startDate)
            ->whereDate('created_at', '<=', $endDate)
            ->groupBy('event')
            ->get();
            
        // Statistiques par utilisateur (Top 10)
        $userStats = Audit::selectRaw('user_id, COUNT(*) as count')
            ->whereDate('created_at', '>=', $startDate)
            ->whereDate('created_at', '<=', $endDate)
            ->groupBy('user_id')
            ->with('user:id,name,prenom,email')
            ->orderBy('count', 'desc')
            ->limit(10)
            ->get();
            
        // Statistiques par jour
        $dailyStats = Audit::selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->whereDate('created_at', '>=', $startDate)
            ->whereDate('created_at', '<=', $endDate)
            ->groupBy('date')
            ->orderBy('date')
            ->get();
            
        return response()->json([
            'entity_stats' => $entityStats,
            'event_stats' => $eventStats,
            'user_stats' => $userStats,
            'daily_stats' => $dailyStats,
            'total_count' => Audit::whereDate('created_at', '>=', $startDate)
                ->whereDate('created_at', '<=', $endDate)
                ->count()
        ]);
    }
}
