<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\TodoTask;
use App\Models\TimeEntry;
use App\Models\User;
use App\Models\InfoRequest;

class DashboardAnalyticsController extends Controller
{
    /**
     * Global status overview: counts per status + overdue count.
     */
    public function statusOverview(Request $request)
    {
        $today = now()->toDateString();
        $base = TodoTask::query();
        if ($request->filled('client_id')) {
            $base->where('client_id', $request->client_id);
        }
        $counts = $base->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')->pluck('total','status');
        $overdue = TodoTask::where('status','!=','Terminée')
            ->whereNotNull('end_date')
            ->whereDate('end_date','<',$today)
            ->count();
        return response()->json([
            'counts' => $counts,
            'overdue' => $overdue,
        ]);
    }

    /**
     * Time by client, by user, by task_kind.
     */
    public function timeBreakdown(Request $request)
    {
        $validated = $request->validate([
            'from' => 'required|date',
            'to' => 'required|date'
        ]);
        $from = $validated['from'];
        $to = $validated['to'].' 23:59:59';
        $entries = TimeEntry::with(['user:id,prenom,nom,name','task:id,task_kind'])
            ->whereBetween('started_at',[$from,$to])
            ->whereNotNull('stopped_at')
            ->get();

        $byClient = $entries->groupBy('client_id')->map(fn($rows)=>[
            'minutes' => $rows->sum(fn($r)=>$r->duration_minutes ?? 0)
        ]);
        $byUser = $entries->groupBy('user_id')->map(fn($rows)=>[
            'minutes' => $rows->sum(fn($r)=>$r->duration_minutes ?? 0)
        ]);
        $byKind = $entries->groupBy(fn($r)=> optional($r->task)->task_kind ?: 'unknown')->map(fn($rows)=>[
            'minutes' => $rows->sum(fn($r)=>$r->duration_minutes ?? 0)
        ]);
        return response()->json(compact('byClient','byUser','byKind'));
    }

    /**
     * Profitability indicators: cost vs potential billing (requires hourly_rate & optional billing_rate param per user).
     */
    public function profitability(Request $request)
    {
        $validated = $request->validate([
            'from' => 'required|date',
            'to' => 'required|date'
        ]);
        $from = $validated['from'];
        $to = $validated['to'].' 23:59:59';
        $entries = TimeEntry::with('user:id,hourly_rate')->whereBetween('started_at',[$from,$to])->whereNotNull('stopped_at')->get();
        $cost = $entries->sum(fn($e)=> (($e->duration_minutes ?? 0)/60) * ($e->user->hourly_rate ?? 0));
        // Assume billing rate = hourly_rate * markup (param) else hourly_rate
        $markup = (float) $request->input('markup', 1.0);
        $billing = $entries->sum(fn($e)=> (($e->duration_minutes ?? 0)/60) * ($e->user->hourly_rate ?? 0) * $markup);
        $ratio = $cost > 0 ? $billing / $cost : null;
        return response()->json([
            'cost' => $cost,
            'billing' => $billing,
            'ratio' => $ratio,
        ]);
    }

    /**
     * Team performance: tasks completed, average lead time, average completion % over period.
     */
    public function teamPerformance(Request $request)
    {
        $validated = $request->validate([
            'from' => 'required|date',
            'to' => 'required|date'
        ]);
        $from = $validated['from'];
        $toDate = $validated['to'];
        $tasks = TodoTask::whereBetween(DB::raw('DATE(created_at)'), [$from,$toDate])->get();
        $completed = $tasks->where('status','Terminée');
        $avgLead = $completed->avg(function($t){
            if (!$t->start_date || !$t->end_date) return null;
            return now()->parse($t->start_date)->diffInDays(now()->parse($t->end_date));
        });
        $avgPourcentage = $tasks->avg(fn($t)=> (int) $t->pourcentage);
        return response()->json([
            'tasksCreated' => $tasks->count(),
            'tasksCompleted' => $completed->count(),
            'avgLeadDays' => $avgLead,
            'avgPourcentage' => $avgPourcentage,
        ]);
    }

    /**
     * Overdue tasks detail list.
     */
    public function overdueTasks(Request $request)
    {
        $today = now()->toDateString();
        $query = TodoTask::with('assignedUser:id,name,prenom')
            ->where('status','!=','Terminée')
            ->whereNotNull('end_date')
            ->whereDate('end_date','<',$today);
        if ($request->filled('client_id')) $query->where('client_id',$request->client_id);
        $tasks = $query->limit(200)->get(['id','description','assigned_to','end_date','status','pourcentage']);
        return response()->json(['overdue'=>$tasks]);
    }

    /**
     * Info request summary (reactivity metrics).
     */
    public function infoRequestSummary(Request $request)
    {
        if (!class_exists(InfoRequest::class)) {
            return response()->json(['message'=>'InfoRequest model missing'],404);
        }
        $base = InfoRequest::query();
        if ($request->filled('client_id')) $base->where('client_id',$request->client_id);
        $all = $base->get();
        $avgResponseDelay = $all->avg(function($r){
            if (!$r->responded_at || !$r->requested_at) return null;
            return now()->parse($r->requested_at)->diffInHours(now()->parse($r->responded_at));
        });
        $completionRate = $all->count() ? ($all->where('status','validé')->count() / $all->count()) : null;
        $statusCounts = $all->groupBy('status')->map->count();
        return response()->json([
            'statusCounts' => $statusCounts,
            'avgResponseDelayHours' => $avgResponseDelay,
            'completionRate' => $completionRate,
        ]);
    }
}
