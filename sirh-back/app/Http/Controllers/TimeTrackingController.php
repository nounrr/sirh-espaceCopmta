<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Models\TodoTask;
use App\Models\TimeEntry;
use App\Models\TaskProgressHour;

class TimeTrackingController extends Controller
{
    public function active($taskId)
    {
        $user = Auth::user();
        $task = TodoTask::findOrFail($taskId);

        $entry = TimeEntry::where('todo_task_id', $task->id)
            ->where('user_id', $user->id)
            ->whereNull('ended_at')
            ->orderByDesc('started_at')
            ->first();

        return response()->json(['entry' => $entry], 200);
    }

    public function start(Request $request, $taskId)
    {
        $user = Auth::user();
        $task = TodoTask::findOrFail($taskId);

        $now = now();

        // Close any dangling active entry to avoid overlap
        $dangling = TimeEntry::where('todo_task_id', $task->id)
            ->where('user_id', $user->id)
            ->whereNull('ended_at')
            ->first();
        if ($dangling) {
            $dangling->ended_at = $now;
            $dangling->duration_minutes = max(0, (int) floor((Carbon::parse($dangling->ended_at)->diffInSeconds(Carbon::parse($dangling->started_at))) / 60));
            $dangling->save();
            
            // Mettre à jour l'entrée task_progress_hours correspondante
            $this->updateProgressHoursEnd($dangling);
        }

        // Créer nouvelle entrée time_entries
        $entry = TimeEntry::create([
            'todo_task_id' => $task->id,
            'user_id' => $user->id,
            'started_at' => $now,
            'source' => 'manual',
            'notes' => null,
        ]);

        // Créer immédiatement dans task_progress_hours avec start_datetime seulement
        $progressHour = TaskProgressHour::create([
            'task_id' => $task->id,
            'user_id' => $user->id,
            'start_datetime' => $now,
            'end_datetime' => null,
        ]);

        return response()->json([
            'entry' => $entry,
            'progress_hour' => $progressHour
        ], 201);
    }

    public function pause(Request $request, $taskId)
    {
        $user = Auth::user();
        $task = TodoTask::findOrFail($taskId);

        $entry = TimeEntry::where('todo_task_id', $task->id)
            ->where('user_id', $user->id)
            ->whereNull('ended_at')
            ->orderByDesc('started_at')
            ->first();

        if (!$entry) {
            return response()->json(['error' => 'Aucune session active à mettre en pause'], 404);
        }

        $now = now();
        $entry->ended_at = $now;
        $entry->duration_minutes = max(1, (int) floor((Carbon::parse($entry->ended_at)->diffInSeconds(Carbon::parse($entry->started_at))) / 60));
        $entry->save();

        // Mettre à jour task_progress_hours avec end_datetime
        $this->updateProgressHoursEnd($entry);

        return response()->json(['entry' => $entry], 200);
    }

    public function dailySummary(Request $request, $taskId)
    {
        $user = Auth::user();
        $task = TodoTask::findOrFail($taskId);
        $date = $request->query('date');
        if (!$date) {
            $date = now()->toDateString();
        }

        // Calculer le total des minutes pour la journée depuis task_progress_hours
        $totalMinutes = TaskProgressHour::where('task_id', $task->id)
            ->where('user_id', $user->id)
            ->whereDate('start_datetime', $date)
            ->get()
            ->sum(function($entry) {
                $start = Carbon::parse($entry->start_datetime);
                $end = Carbon::parse($entry->end_datetime);
                return max(0, (int) floor($end->diffInSeconds($start) / 60));
            });

        return response()->json([
            'taskId' => $task->id,
            'date' => $date,
            'total_minutes' => $totalMinutes,
        ]);
    }

    private function updateProgressHoursEnd(TimeEntry $entry): void
    {
        // Trouver l'entrée task_progress_hours correspondante et mettre à jour end_datetime
        if (!$entry->ended_at) {
            return;
        }

        // Chercher l'entrée la plus récente sans end_datetime pour cette tâche/utilisateur
        $progressHour = TaskProgressHour::where('task_id', $entry->todo_task_id)
            ->where('user_id', $entry->user_id)
            ->whereNull('end_datetime')
            ->whereDate('start_datetime', Carbon::parse($entry->started_at)->toDateString())
            ->orderByDesc('id')
            ->first();

        if ($progressHour) {
            $progressHour->end_datetime = $entry->ended_at;
            $progressHour->save();
        }
    }
}
