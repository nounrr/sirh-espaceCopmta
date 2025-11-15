<?php

namespace App\Http\Controllers;

use App\Models\TaskProgressHour;
use App\Models\TodoTask;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Symfony\Component\HttpFoundation\Response;

class TimeTrackingController extends Controller
{
    private const PRIVILEGED_ROLES = [
        'rh',
        'gest_rh',
        'gest-rh',
        'gest_projet',
        'gest-projet',
        'gestionnaire_projet',
        'chef_dep',
        'chef-dep',
        'chef_dept',
        'chef_departement',
        'chef_department',
        'chef_projet',
        'chef-projet',
        'chef_chant',
        'admin',
    ];

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

    private function normalizeRole(?string $role): ?string
    {
        if (!$role) {
            return null;
        }

        $normalized = Str::of($role)
            ->lower()
            ->replace(['é', 'è', 'ê', 'ë'], 'e')
            ->replace(['à', 'á', 'â', 'ä'], 'a')
            ->replace(['ï', 'î', 'ì'], 'i')
            ->replace(['ö', 'ô', 'ò'], 'o')
            ->replace(['ü', 'û', 'ù'], 'u')
            ->replace(' ', '_')
            ->__toString();

        return $normalized;
    }

    private function canWorkOn(TodoTask $task, $user): bool
    {
        if (!$user) return false;
        $role = $user->role ?? null;
        $normalizedRole = $this->normalizeRole($role) ?? '';
        if ($normalizedRole && in_array($normalizedRole, self::PRIVILEGED_ROLES, true)) {
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
        $driver = DB::getDriverName();
        $isSqlite = $driver === 'sqlite';
        if ($date) {
            // Daily summary including running slices overlapping that day
            $startOfDay = date('Y-m-d 00:00:00', strtotime($date));
            $endOfDay = date('Y-m-d 23:59:59', strtotime($date));

            if ($isSqlite) {
                $startBoundary = Carbon::parse($startOfDay);
                $endBoundary = Carbon::parse($endOfDay);
                $entries = TaskProgressHour::where('task_id', $task->id)
                    ->where('start_datetime', '<', $endOfDay)
                    ->where(function ($q) use ($startOfDay) {
                        $q->whereNull('end_datetime')->orWhere('end_datetime', '>', $startOfDay);
                    })
                    ->get();

                $totalStats = $this->summarizeEntries($entries, $startBoundary, $endBoundary);
                $myStats = $this->summarizeEntries($entries->where('user_id', $user->id)->values(), $startBoundary, $endBoundary);

                return response()->json([
                    'period' => 'day',
                    'date' => date('Y-m-d', strtotime($date)),
                    'total_minutes' => $totalStats['minutes'],
                    'my_minutes' => $myStats['minutes'],
                    'total_segments' => $totalStats['segments'],
                    'my_segments' => $myStats['segments'],
                ]);
            }

            $baseQuery = DB::table('task_progress_hours')
                ->selectRaw('COALESCE(SUM(TIMESTAMPDIFF(MINUTE, GREATEST(start_datetime, ?), LEAST(COALESCE(end_datetime, NOW()), ?))), 0) as minutes', [$startOfDay, $endOfDay])
                ->where('task_id', $task->id)
                ->where('start_datetime', '<', $endOfDay)
                ->where(function ($q) use ($startOfDay) {
                    $q->whereNull('end_datetime')->orWhere('end_datetime', '>', $startOfDay);
                });

            $total = (clone $baseQuery)->value('minutes');

            $mine = (clone $baseQuery)
                ->where('user_id', $user->id)
                ->value('minutes');

            $segmentsBase = DB::table('task_progress_hours')
                ->where('task_id', $task->id)
                ->where('start_datetime', '<', $endOfDay)
                ->where(function ($q) use ($startOfDay) {
                    $q->whereNull('end_datetime')->orWhere('end_datetime', '>', $startOfDay);
                });

            $totalSegments = (clone $segmentsBase)->count();
            $mySegments = (clone $segmentsBase)->where('user_id', $user->id)->count();

            return response()->json([
                'period' => 'day',
                'date' => date('Y-m-d', strtotime($date)),
                'total_minutes' => (int)($total ?? 0),
                'my_minutes' => (int)($mine ?? 0),
                'total_segments' => (int) $totalSegments,
                'my_segments' => (int) $mySegments,
            ]);
        } else {
            // Overall summary (closed slices only)
            if ($isSqlite) {
                $entries = TaskProgressHour::where('task_id', $task->id)
                    ->whereNotNull('end_datetime')
                    ->get();

                $totalStats = $this->summarizeEntries($entries);
                $myStats = $this->summarizeEntries($entries->where('user_id', $user->id)->values());

                return response()->json([
                    'period' => 'all',
                    'total_minutes' => $totalStats['minutes'],
                    'my_minutes' => $myStats['minutes'],
                    'total_segments' => $totalStats['segments'],
                    'my_segments' => $myStats['segments'],
                ]);
            }

            $baseClosed = DB::table('task_progress_hours')
                ->selectRaw('COALESCE(SUM(TIMESTAMPDIFF(MINUTE, start_datetime, end_datetime)), 0) as minutes')
                ->where('task_id', $task->id)
                ->whereNotNull('end_datetime');

            $total = (clone $baseClosed)->value('minutes');

            $mine = (clone $baseClosed)
                ->where('user_id', $user->id)
                ->value('minutes');

            $totalSegments = DB::table('task_progress_hours')
                ->where('task_id', $task->id)
                ->whereNotNull('end_datetime')
                ->count();

            $mySegments = DB::table('task_progress_hours')
                ->where('task_id', $task->id)
                ->where('user_id', $user->id)
                ->whereNotNull('end_datetime')
                ->count();

            return response()->json([
                'period' => 'all',
                'total_minutes' => (int)($total ?? 0),
                'my_minutes' => (int)($mine ?? 0),
                'total_segments' => (int) $totalSegments,
                'my_segments' => (int) $mySegments,
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

    private function summarizeEntries($entries, ?Carbon $startBoundary = null, ?Carbon $endBoundary = null): array
    {
        $minutes = 0;
        $segments = 0;
        $startBoundary = $startBoundary?->copy();
        $endBoundary = $endBoundary?->copy();

        foreach ($entries as $entry) {
            $start = Carbon::parse($entry->start_datetime);
            $end = $entry->end_datetime ? Carbon::parse($entry->end_datetime) : Carbon::now();

            if ($startBoundary && $start->lt($startBoundary)) {
                $start = $startBoundary->copy();
            }

            if ($endBoundary && $end->gt($endBoundary)) {
                $end = $endBoundary->copy();
            }

            if ($end->lte($start)) {
                continue;
            }

            $minutes += $start->diffInMinutes($end);
            $segments++;
        }

        return [
            'minutes' => $minutes,
            'segments' => $segments,
        ];
    }
}
