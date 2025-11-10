<?php

namespace App\Http\Controllers;

use App\Models\TodoTask;
use App\Models\TimeEntry;
use App\Models\TaskProgressLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class TimeTrackingController extends Controller
{
    public function start(TodoTask $task)
    {
        $user = Auth::user();
        // Close any previous open timer for this user (any task)
        TimeEntry::where('user_id',$user->id)->whereNull('stopped_at')->update(['stopped_at'=>now()]);

        $entry = TimeEntry::create([
            'user_id' => $user->id,
            'todo_task_id' => $task->id,
            'client_id' => $task->client_id,
            'started_at' => now(),
            'source' => 'auto'
        ]);

        if (!$task->real_start_at) {
            $task->real_start_at = now();
            $task->save();
        }

        if ($task->status === 'Non commencée' || $task->status === 'Non commencé') {
            $task->status = 'En cours';
            $task->save();
        }

        return response()->json($entry);
    }

    public function stop(TodoTask $task)
    {
        $user = Auth::user();
        $entry = TimeEntry::where('user_id',$user->id)
            ->where('todo_task_id',$task->id)
            ->whereNull('stopped_at')
            ->latest('started_at')
            ->first();
        if (!$entry) {
            return response()->json(['message'=>'No active timer'],404);
        }
        $entry->stopped_at = now();
        $entry->save();
        return response()->json($entry);
    }

    public function progress(Request $request, TodoTask $task)
    {
        $data = $request->validate([
            'pourcentage' => 'required|integer|min:0|max:100',
            'comment' => 'nullable|string'
        ]);
        $user = Auth::user();

        $log = null;
        DB::transaction(function() use ($task,$data,$user,&$log) {
            $task->pourcentage = $data['pourcentage'];
            if ($data['pourcentage'] >= 100) {
                $task->status = 'Terminée';
                if (!$task->real_end_at) {
                    $task->real_end_at = now();
                }
            } elseif ($task->status === 'Non commencée') {
                $task->status = 'En cours';
            }
            $task->save();
            $log = TaskProgressLog::create([
                'todo_task_id' => $task->id,
                'user_id' => $user->id,
                'pourcentage' => $data['pourcentage'],
                'comment' => $data['comment'] ?? null,
            ]);
        });
        return response()->json($log);
    }

    public function timesheet(Request $request)
    {
        $validated = $request->validate([
            'from' => 'required|date',
            'to' => 'required|date'
        ]);
        $user = Auth::user();
        $query = TimeEntry::with(['task:id,description','client:id,name,prenom'])
            ->whereBetween('started_at', [$validated['from'], $validated['to'].' 23:59:59']);
        if (!in_array($user->role, ['RH','Gest_RH','Chef_Dep'])) {
            $query->where('user_id',$user->id);
        } elseif ($request->filled('user_id')) {
            $query->where('user_id',$request->user_id);
        }
        $entries = $query->get();
        $daily = $entries->groupBy(fn($e)=>$e->started_at->toDateString())->map(function($items){
            return [
                'minutes' => $items->sum(fn($i)=>$i->duration_minutes ?? 0),
                'tasks' => $items->pluck('todo_task_id')->unique()->count()
            ];
        });
        return response()->json([
            'entries' => $entries,
            'daily' => $daily,
        ]);
    }

    public function analytics(Request $request)
    {
        $validated = $request->validate([
            'from' => 'required|date',
            'to' => 'required|date'
        ]);
        $user = Auth::user();
        if (!in_array($user->role,['RH','Gest_RH','Chef_Dep'])) {
            return response()->json(['message'=>'Non autorisé'],403);
        }
        $from = $validated['from'];
        $to = $validated['to'].' 23:59:59';

        $entries = TimeEntry::with('user:id,name,prenom,hourly_rate')
            ->whereNotNull('stopped_at')
            ->whereBetween('started_at', [$from,$to])
            ->get();

        $grouped = $entries->groupBy('client_id')->map(function($rows){
            $hours = $rows->sum(fn($r)=> ($r->duration_minutes ?? 0)/60);
            $cost = $rows->sum(fn($r)=> (($r->duration_minutes ?? 0)/60) * ($r->user->hourly_rate ?? 0));
            return [
                'hours' => $hours,
                'cost' => $cost,
            ];
        });
        return response()->json([
            'costPerClient' => $grouped,
            'totalHours' => $entries->sum(fn($r)=> ($r->duration_minutes ?? 0)/60)
        ]);
    }
}
