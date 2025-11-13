<?php

namespace App\Http\Controllers;

use App\Models\TaskProgressHour;
use App\Models\TodoTask;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class TimeTrackingController extends Controller
{
    private function closeEntries($entries, $endTime = null)
    {
        $timestamp = $endTime ?: now();

        return collect($entries)->map(function ($entry) use ($timestamp) {
            $entry->end_datetime = $timestamp;
            $entry->save();
            $entry->refresh();

            return $entry;
        });
    }

    private function canWorkOn(TodoTask $task, $user): bool
    {
        if (!$user) return false;
        $role = $user->role ?? null;
        if (in_array($role, ['RH', 'Gest_RH', 'Chef_Dep'])) {
            return true;
        }

        if ((int)($task->assigned_to ?? 0) === (int)$user->id) {
            return true;
        }

        // Check many-to-many assignees
        return $task->assignees()->where('users.id', $user->id)->exists();
    }

    // POST /api/tasks/{task}/start
    public function start(TodoTask $task)
    {
        $user = Auth::user();
        if (!$this->canWorkOn($task, $user)) {
            return response()->json(['message' => 'Non autorisé'], Response::HTTP_FORBIDDEN);
        }

        // Allow simultaneous work across tasks: do NOT auto-close other open entries
        // Ensure only one open entry per user+task (close legacy duplicates if any)
        $openEntries = TaskProgressHour::where('user_id', $user->id)
            ->where('task_id', $task->id)
            ->whereNull('end_datetime')
            ->latest('start_datetime')
            ->get();

        if ($openEntries->isNotEmpty()) {
            $latest = $openEntries->shift();
            if ($openEntries->isNotEmpty()) {
                $this->closeEntries($openEntries);
            }

            return response()->json($latest);
        }

        $entry = TaskProgressHour::create([
            'user_id' => $user->id,
            'task_id' => $task->id,
            'start_datetime' => now(),
        ]);

        return response()->json($entry);
    }

    // POST /api/tasks/{task}/stop
    public function stop(TodoTask $task)
    {
        $user = Auth::user();
        if (!$this->canWorkOn($task, $user)) {
            return response()->json(['message' => 'Non autorisé'], Response::HTTP_FORBIDDEN);
        }

        $openEntries = TaskProgressHour::where('user_id', $user->id)
            ->where('task_id', $task->id)
            ->whereNull('end_datetime')
            ->latest('start_datetime')
            ->get();

        if ($openEntries->isEmpty()) {
            // Make pause/stop idempotent: return 200 with a no-op payload
            return response()->json([
                'closed' => false,
                'message' => 'Aucune progression en cours',
            ]);
        }

        $closedEntries = $this->closeEntries($openEntries);

        return response()->json([
            'closed' => true,
            'closed_count' => $closedEntries->count(),
            'entries' => $closedEntries->values(),
        ]);
    }

    // POST /api/tasks/{task}/pause (alias of stop for semantics)
    public function pause(TodoTask $task)
    {
        return $this->stop($task);
    }

    // GET /api/tasks/{task}/active-entry
    public function activeEntry(TodoTask $task)
    {
        $user = Auth::user();
        if (!$this->canWorkOn($task, $user)) {
            return response()->json(['message' => 'Non autorisé'], Response::HTTP_FORBIDDEN);
        }

        $entry = TaskProgressHour::where('user_id', $user->id)
            ->where('task_id', $task->id)
            ->whereNull('end_datetime')
            ->latest('start_datetime')
            ->first();

        return response()->json($entry);
    }

    // GET /api/tasks/{task}/time-summary
    public function timeSummary(TodoTask $task, Request $request)
    {
        $user = Auth::user();
        if (!$this->canWorkOn($task, $user)) {
            return response()->json(['message' => 'Non autorisé'], Response::HTTP_FORBIDDEN);
        }

        $date = $request->query('date');
        if ($date) {
            // Daily summary including running slices overlapping that day
            $startOfDay = date('Y-m-d 00:00:00', strtotime($date));
            $endOfDay = date('Y-m-d 23:59:59', strtotime($date));

            $total = DB::table('task_progress_hours')
                ->selectRaw('COALESCE(SUM(TIMESTAMPDIFF(MINUTE, GREATEST(start_datetime, ?), LEAST(COALESCE(end_datetime, NOW()), ?))), 0) as minutes', [$startOfDay, $endOfDay])
                ->where('task_id', $task->id)
                ->where('start_datetime', '<', $endOfDay)
                ->where(function ($q) use ($startOfDay) {
                    $q->whereNull('end_datetime')->orWhere('end_datetime', '>', $startOfDay);
                })
                ->value('minutes');

            $mine = DB::table('task_progress_hours')
                ->selectRaw('COALESCE(SUM(TIMESTAMPDIFF(MINUTE, GREATEST(start_datetime, ?), LEAST(COALESCE(end_datetime, NOW()), ?))), 0) as minutes', [$startOfDay, $endOfDay])
                ->where('task_id', $task->id)
                ->where('user_id', $user->id)
                ->where('start_datetime', '<', $endOfDay)
                ->where(function ($q) use ($startOfDay) {
                    $q->whereNull('end_datetime')->orWhere('end_datetime', '>', $startOfDay);
                })
                ->value('minutes');

            return response()->json([
                'period' => 'day',
                'date' => date('Y-m-d', strtotime($date)),
                'total_minutes' => (int)($total ?? 0),
                'my_minutes' => (int)($mine ?? 0),
            ]);
        } else {
            // Overall summary (closed slices only)
            $total = DB::table('task_progress_hours')
                ->selectRaw('COALESCE(SUM(TIMESTAMPDIFF(MINUTE, start_datetime, end_datetime)), 0) as minutes')
                ->where('task_id', $task->id)
                ->whereNotNull('end_datetime')
                ->value('minutes');

            $mine = DB::table('task_progress_hours')
                ->selectRaw('COALESCE(SUM(TIMESTAMPDIFF(MINUTE, start_datetime, end_datetime)), 0) as minutes')
                ->where('task_id', $task->id)
                ->where('user_id', $user->id)
                ->whereNotNull('end_datetime')
                ->value('minutes');

            return response()->json([
                'period' => 'all',
                'total_minutes' => (int)($total ?? 0),
                'my_minutes' => (int)($mine ?? 0),
            ]);
        }
    }

    // GET /api/my/active-entry
    public function myActiveEntry()
    {
        $user = Auth::user();
        $entry = TaskProgressHour::with('task')
            ->where('user_id', $user->id)
            ->whereNull('end_datetime')
            ->latest('start_datetime')
            ->first();

        return response()->json($entry);
    }

    // GET /api/my/active-entries (optional: list all concurrent active entries)
    public function myActiveEntries()
    {
        $user = Auth::user();
        $entries = TaskProgressHour::with('task')
            ->where('user_id', $user->id)
            ->whereNull('end_datetime')
            ->orderByDesc('start_datetime')
            ->get();

        return response()->json($entries);
    }

    // POST /api/tasks/{task}/finish
    public function finish(TodoTask $task)
    {
        $user = Auth::user();
        if (!$this->canWorkOn($task, $user)) {
            return response()->json(['message' => 'Non autorisé'], Response::HTTP_FORBIDDEN);
        }

        // Close any open slice for this task
        $openEntries = TaskProgressHour::where('user_id', $user->id)
            ->where('task_id', $task->id)
            ->whereNull('end_datetime')
            ->latest('start_datetime')
            ->get();

        $closedEntries = collect();
        if ($openEntries->isNotEmpty()) {
            $closedEntries = $this->closeEntries($openEntries);
        }

        $task->refresh();

        return response()->json([
            'closed_entries' => $closedEntries->values(),
            'task' => $task,
        ]);
    }
}
