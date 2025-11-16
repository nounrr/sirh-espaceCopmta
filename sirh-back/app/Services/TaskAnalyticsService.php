<?php

namespace App\Services;

use App\Models\ClientInformationRequest;
use App\Models\TimeEntry;
use App\Models\TodoTask;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;

class TaskAnalyticsService
{
    public function buildOverview(array $filters = []): array
    {
        $tasks = $this->buildTaskQuery($filters)->get();
        $taskIds = $tasks->pluck('id');
        $range = $this->resolveDateRange($filters);

        $timeEntries = $this->buildTimeEntriesQuery($taskIds, $filters)->get();
        $timeEntriesByTask = $timeEntries->groupBy('todo_task_id');

        $statusDistribution = $this->computeStatusDistribution($tasks);
        $employeeEfficiency = $this->computeEmployeeEfficiency($tasks);
        $timeByCollaborator = $this->aggregateTimeByCollaborator($timeEntries);
        $timeByClient = $this->aggregateTimeByClient($tasks, $timeEntriesByTask);
        $timeByCategory = $this->aggregateTimeByCategory($tasks, $timeEntriesByTask);
        $costSummary = $this->computeCostSummary($tasks, $timeEntriesByTask, $timeByCollaborator);
        $billingVsWorkload = $this->computeBillingVsWorkload($tasks, $timeEntriesByTask);
        $taskHoursByUser = $this->computeTaskHoursByUser($tasks, $timeEntries);
        $dailyTimeTracking = $this->computeDailyTimeTracking($timeEntries, $filters, $range);
        $teamPerformance = $this->computeTeamPerformance($tasks);
        $overdueTasks = $this->listOverdueTasks($tasks);
        $periodicCollaborators = $this->computePeriodicBilan($tasks, 'assigned_to', $range);
        $periodicClients = $this->computePeriodicBilan($tasks, 'client_id', $range);
        $clientInfoRequests = $this->summarizeClientInformationRequests($filters, $range);

        return [
            'filters' => $filters,
            'status_distribution' => $statusDistribution,
            'employee_efficiency' => $employeeEfficiency->values(),
            'time_by_collaborator' => $timeByCollaborator->values(),
            'time_by_client' => $timeByClient->values(),
            'time_by_category' => $timeByCategory->values(),
            'cost_summary' => $costSummary,
            'billing_vs_workload' => $billingVsWorkload,
            'task_hours_by_user' => $taskHoursByUser->values(),
            'daily_time_tracking' => $dailyTimeTracking,
            'team_performance' => $teamPerformance->values(),
            'overdue_tasks' => $overdueTasks,
            'periodic_collaborators' => $periodicCollaborators,
            'periodic_clients' => $periodicClients,
            'client_information_requests' => $clientInfoRequests,
            'generated_at' => Carbon::now()->toIso8601String(),
        ];
    }

    protected function buildTaskQuery(array $filters)
    {
        $query = TodoTask::query()
            ->with(['assignedUser:id,name,prenom,hourly_rate', 'client:id,name,prenom', 'list:id,project_id']);

        if (!empty($filters['client_id'])) {
            $query->where('client_id', $filters['client_id']);
        }

        if (!empty($filters['collaborator_id'])) {
            $collabId = (int) $filters['collaborator_id'];
            $query->where(function ($inner) use ($collabId) {
                $inner->where('assigned_to', $collabId)
                    ->orWhereHas('assignees', fn ($assoc) => $assoc->where('users.id', $collabId));
            });
        }

        if (!empty($filters['project_id'])) {
            $query->whereHas('list', fn ($list) => $list->where('project_id', $filters['project_id']));
        }

        if (!empty($filters['category'])) {
            $query->where('type', $filters['category']);
        }

        if (!empty($filters['date_from']) || !empty($filters['date_to'])) {
            $from = !empty($filters['date_from']) ? Carbon::parse($filters['date_from'])->startOfDay() : null;
            $to = !empty($filters['date_to']) ? Carbon::parse($filters['date_to'])->endOfDay() : null;
            $query->where(function ($dateQuery) use ($from, $to) {
                if ($from) {
                    $dateQuery->whereDate('start_date', '>=', $from);
                }
                if ($to) {
                    $dateQuery->whereDate('end_date', '<=', $to);
                }
            });
        }

        return $query;
    }

    protected function buildTimeEntriesQuery(Collection $taskIds, array $filters)
    {
        $query = TimeEntry::query()
            ->with(['user:id,name,prenom'])
            ->whereIn('todo_task_id', $taskIds);

        if (!empty($filters['collaborator_id'])) {
            $query->where('user_id', $filters['collaborator_id']);
        }

        if (!empty($filters['date_from']) || !empty($filters['date_to'])) {
            $from = !empty($filters['date_from']) ? Carbon::parse($filters['date_from'])->startOfDay() : null;
            $to = !empty($filters['date_to']) ? Carbon::parse($filters['date_to'])->endOfDay() : null;
            $query->where(function ($dateQuery) use ($from, $to) {
                if ($from) {
                    $dateQuery->where('started_at', '>=', $from);
                }
                if ($to) {
                    $dateQuery->where('started_at', '<=', $to);
                }
            });
        }

        return $query;
    }

    protected function computeStatusDistribution(Collection $tasks): array
    {
        $distribution = [
            'en_attente' => 0,
            'en_cours' => 0,
            'en_validation' => 0,
            'terminees' => 0,
            'annulees' => 0,
            'en_retard' => 0,
        ];

        $today = Carbon::today();

        foreach ($tasks as $task) {
            $status = $this->normalizeStatus($task->status);
            switch ($status) {
                case 'en cours':
                    $distribution['en_cours']++;
                    break;
                case 'en validation':
                    $distribution['en_validation']++;
                    break;
                case 'terminee':
                case 'termine':
                case 'terminees':
                    $distribution['terminees']++;
                    break;
                case 'annule':
                    $distribution['annulees']++;
                    break;
                case 'en attente':
                default:
                    $distribution['en_attente']++;
                    break;
            }

            if (!in_array($status, ['terminee', 'termine', 'annule'], true)
                && $task->end_date && Carbon::parse($task->end_date)->lt($today)) {
                $distribution['en_retard']++;
            }
        }

        return $distribution;
    }

    protected function computeEmployeeEfficiency(Collection $tasks): Collection
    {
        $today = Carbon::today();

        $grouped = $tasks->groupBy(function ($task) {
            return $task->assigned_to ?: 'unassigned';
        });

        return $grouped->map(function (Collection $userTasks, $userId) use ($today) {
            $assignedUser = $userTasks->first()->assignedUser;
            $name = $assignedUser
                ? trim(($assignedUser->prenom ?? '') . ' ' . ($assignedUser->name ?? ''))
                : 'Non assigné';

            $completed = $userTasks->where(fn ($task) => $this->isCompleted($task->status))->count();
            $inProgress = $userTasks->where(fn ($task) => $this->normalizeStatus($task->status) === 'en cours')->count();
            $notStarted = $userTasks->where(fn ($task) => !$this->isCompleted($task->status) && !$task->start_date)->count();
            $cancelled = $userTasks->where(fn ($task) => $this->normalizeStatus($task->status) === 'annule')->count();
            $overdue = $userTasks->filter(function ($task) use ($today) {
                return !$this->isCompleted($task->status)
                    && $this->normalizeStatus($task->status) !== 'annule'
                    && $task->end_date
                    && Carbon::parse($task->end_date)->lt($today);
            })->count();

            $denom = max(1, $completed + $overdue);
            $rate = round(($completed / $denom) * 100);

            return collect([
                'user_id' => $userId,
                'name' => $name,
                'completed' => $completed,
                'inProgress' => $inProgress,
                'notStarted' => $notStarted,
                'cancelled' => $cancelled,
                'overdue' => $overdue,
                'totalDenom' => $denom,
                'rate' => $rate,
            ]);
        })->sortByDesc('rate');
    }

    protected function aggregateTimeByCollaborator(Collection $timeEntries): Collection
    {
        return $timeEntries
            ->groupBy('user_id')
            ->map(function (Collection $entries, $userId) {
                $minutes = $entries->sum('duration_minutes');
                return collect([
                    'user_id' => $userId,
                    'name' => $this->formatUserName($entries->first()?->user, $userId),
                    'hours' => round($minutes / 60, 2),
                    'minutes' => $minutes,
                ]);
            })
            ->sortByDesc('hours');
    }

    protected function computeTaskHoursByUser(Collection $tasks, Collection $timeEntries): Collection
    {
        if ($timeEntries->isEmpty()) {
            return collect();
        }

        $taskMap = $tasks->keyBy('id');

        return $timeEntries
            ->groupBy('user_id')
            ->map(function (Collection $entries, $userId) use ($taskMap) {
                $minutes = $entries->sum('duration_minutes');

                $taskBreakdown = $entries
                    ->groupBy('todo_task_id')
                    ->map(function (Collection $taskEntries, $taskId) use ($taskMap) {
                        $task = $taskMap->get($taskId);
                        $taskMinutes = $taskEntries->sum('duration_minutes');

                        return [
                            'task_id' => $taskId,
                            'task_label' => $task?->description ?? $task?->title ?? ('Tâche #' . $taskId),
                            'hours' => round($taskMinutes / 60, 2),
                            'minutes' => $taskMinutes,
                            'status' => $task->status ?? null,
                            'project_id' => optional($task->list)->project_id,
                        ];
                    })
                    ->sortByDesc('hours')
                    ->values();

                return collect([
                    'user_id' => $userId,
                    'name' => $this->formatUserName($entries->first()?->user, $userId),
                    'total_minutes' => $minutes,
                    'total_hours' => round($minutes / 60, 2),
                    'tasks_count' => $taskBreakdown->count(),
                    'tasks' => $taskBreakdown,
                ]);
            })
            ->sortByDesc('total_hours');
    }

    protected function computeDailyTimeTracking(Collection $timeEntries, array $filters, ?array $range = null): array
    {
        $range = $range ?? $this->resolveDateRange($filters);
        $period = CarbonPeriod::create(
            $range['from']->copy()->startOfDay(),
            $range['to']->copy()->startOfDay()
        );

        $days = [];

        foreach ($period as $date) {
            $key = $date->toDateString();
            $days[$key] = [
                'date' => $key,
                'total_minutes' => 0,
                'entries' => 0,
                'users' => [],
            ];
        }

        foreach ($timeEntries as $entry) {
            $reference = $entry->started_at ?? $entry->ended_at ?? $entry->created_at;
            if (!$reference) {
                continue;
            }

            $dateKey = Carbon::parse($reference)->toDateString();
            if (!isset($days[$dateKey])) {
                continue;
            }

            $minutes = (int) $entry->duration_minutes;
            $days[$dateKey]['total_minutes'] += $minutes;
            $days[$dateKey]['entries']++;

            $userKey = $entry->user_id ?? 'unassigned';
            if (!isset($days[$dateKey]['users'][$userKey])) {
                $days[$dateKey]['users'][$userKey] = [
                    'user_id' => $entry->user_id,
                    'name' => $this->formatUserName($entry->user ?? null, $entry->user_id),
                    'minutes' => 0,
                ];
            }
            $days[$dateKey]['users'][$userKey]['minutes'] += $minutes;
        }

        $dayCollection = collect($days)
            ->map(function (array $item) {
                $item['hours'] = round($item['total_minutes'] / 60, 2);
                $item['users'] = collect($item['users'])
                    ->map(function (array $user) {
                        $user['hours'] = round($user['minutes'] / 60, 2);
                        return $user;
                    })
                    ->sortByDesc('hours')
                    ->values();

                unset($item['total_minutes']);

                return $item;
            })
            ->values();

        $totalHours = round($dayCollection->sum('hours'), 2);
        $average = $dayCollection->isNotEmpty()
            ? round($totalHours / $dayCollection->count(), 2)
            : 0;

        return [
            'start_date' => $range['from']->toDateString(),
            'end_date' => $range['to']->toDateString(),
            'total_hours' => $totalHours,
            'average_hours_per_day' => $average,
            'days' => $dayCollection,
        ];
    }

    protected function resolveDateRange(array $filters): array
    {
        $end = !empty($filters['date_to'])
            ? Carbon::parse($filters['date_to'])->endOfDay()
            : Carbon::today()->endOfDay();

        $start = !empty($filters['date_from'])
            ? Carbon::parse($filters['date_from'])->startOfDay()
            : $end->copy()->subDays(13)->startOfDay();

        if ($start->greaterThan($end)) {
            [$start, $end] = [$end->copy()->startOfDay(), $start->copy()->endOfDay()];
        }

        return ['from' => $start, 'to' => $end];
    }

    protected function formatUserName($user, $fallbackId): string
    {
        if ($user) {
            $parts = array_filter([
                $user->prenom ?? null,
                $user->name ?? $user->nom ?? null,
            ]);

            if (!empty($parts)) {
                return trim(implode(' ', $parts));
            }
        }

        if ($fallbackId) {
            return 'Utilisateur ' . $fallbackId;
        }

        return 'Non attribué';
    }

    protected function computeTeamPerformance(Collection $tasks): Collection
    {
        $today = Carbon::today();

        return $tasks
            ->groupBy(fn ($task) => $task->assigned_to ?: 'unassigned')
            ->map(function (Collection $userTasks, $userId) use ($today) {
                $assignedUser = $userTasks->first()->assignedUser ?? null;
                $name = $this->formatUserName($assignedUser, $userId);

                $completed = $userTasks->filter(fn ($task) => $this->isCompleted($task->status));
                $completedCount = $completed->count();
                $inProgress = $userTasks->filter(fn ($task) => $this->normalizeStatus($task->status) === 'en cours')->count();
                $overdueActive = $userTasks->filter(function ($task) use ($today) {
                    return !$this->isCompleted($task->status)
                        && $task->end_date
                        && Carbon::parse($task->end_date)->lt($today);
                })->count();

                $avgCycleHours = $completedCount
                    ? round($completed->avg(function ($task) {
                        $end = $task->completed_at ? Carbon::parse($task->completed_at) : Carbon::parse($task->updated_at);
                        $start = $task->start_date ? Carbon::parse($task->start_date) : Carbon::parse($task->created_at);
                        return max(0, $start->diffInMinutes($end));
                    }) / 60, 2)
                    : 0;

                $avgDelay = $completedCount
                    ? round($completed->avg(fn ($task) => (float) ($task->completion_delay_minutes ?? 0)), 2)
                    : 0;

                $onTimeCount = $completed->filter(fn ($task) => ($task->completion_delay_minutes ?? 0) <= 0)->count();

                return collect([
                    'user_id' => $userId,
                    'name' => $name,
                    'completed' => $completedCount,
                    'in_progress' => $inProgress,
                    'overdue_active' => $overdueActive,
                    'avg_cycle_hours' => $avgCycleHours,
                    'avg_delay_minutes' => $avgDelay,
                    'on_time_rate' => $completedCount ? round(($onTimeCount / max(1, $completedCount)) * 100) : null,
                ]);
            })
            ->sortByDesc('completed');
    }

    protected function listOverdueTasks(Collection $tasks): array
    {
        $today = Carbon::today();

        return $tasks
            ->filter(function ($task) use ($today) {
                return !$this->isCompleted($task->status)
                    && $task->end_date
                    && Carbon::parse($task->end_date)->lt($today);
            })
            ->sortByDesc(function ($task) use ($today) {
                return Carbon::parse($task->end_date)->diffInMinutes($today);
            })
            ->take(25)
            ->map(function ($task) use ($today) {
                $dueDate = Carbon::parse($task->end_date)->endOfDay();
                $delayMinutes = $dueDate->diffInMinutes($today, false);
                $client = $task->client;
                $clientName = $client ? $this->formatUserName($client, $client->id) : null;

                return [
                    'task_id' => $task->id,
                    'description' => $task->description,
                    'assigned_to' => $this->formatUserName($task->assignedUser, $task->assigned_to),
                    'status' => $task->status,
                    'end_date' => $task->end_date,
                    'delay_minutes' => $delayMinutes,
                    'priority' => $task->priority,
                    'client' => $clientName,
                    'list_id' => $task->todo_list_id,
                ];
            })
            ->values()
            ->all();
    }

    protected function computePeriodicBilan(Collection $tasks, string $groupField, array $range): array
    {
        $from = $range['from'];
        $to = $range['to'];

        $filtered = $tasks->filter(function ($task) use ($from, $to) {
            $reference = $task->completed_at ?? $task->start_date ?? $task->created_at;
            if (!$reference) {
                return false;
            }
            $referenceDate = Carbon::parse($reference);
            return $referenceDate->between($from, $to);
        });

        return $filtered
            ->groupBy(function ($task) use ($groupField) {
                return $task->{$groupField} ?: 'unassigned';
            })
            ->map(function (Collection $groupTasks, $key) use ($groupField) {
                $completed = $groupTasks->filter(fn ($task) => $this->isCompleted($task->status));
                $completedCount = $completed->count();
                $avgDelay = $completedCount
                    ? round($completed->avg(fn ($task) => (float) ($task->completion_delay_minutes ?? 0)), 2)
                    : 0;
                $overdue = $groupTasks->filter(function ($task) {
                    if ($this->isCompleted($task->status) || !$task->end_date) {
                        return false;
                    }
                    return Carbon::parse($task->end_date)->lt(Carbon::today());
                })->count();

                $label = 'Non attribué';
                if ($groupField === 'assigned_to') {
                    $label = $this->formatUserName($groupTasks->first()->assignedUser ?? null, $key);
                } elseif ($groupField === 'client_id') {
                    $label = $this->formatUserName($groupTasks->first()->client ?? null, $key);
                }

                return [
                    'key' => $key,
                    'label' => $label,
                    'tasks_total' => $groupTasks->count(),
                    'tasks_completed' => $completedCount,
                    'tasks_overdue' => $overdue,
                    'avg_delay_minutes' => $avgDelay,
                ];
            })
            ->values()
            ->all();
    }

    protected function summarizeClientInformationRequests(array $filters, array $range): array
    {
        $query = ClientInformationRequest::query()->with([
            'client:id,name,prenom',
            'handler:id,name,prenom',
        ]);

        $query = $this->applyInfoRequestFilters($query, $filters, $range);

        $totalsByStatus = (clone $query)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->toArray();

        $averageResponse = (clone $query)
            ->whereNotNull('response_minutes')
            ->avg('response_minutes');

        $recent = (clone $query)
            ->orderByDesc('requested_at')
            ->limit(25)
            ->get()
            ->map(function (ClientInformationRequest $request) {
                return [
                    'id' => $request->id,
                    'subject' => $request->subject,
                    'status' => $request->status,
                    'channel' => $request->channel,
                    'requested_at' => optional($request->requested_at)->toIso8601String(),
                    'responded_at' => optional($request->responded_at)->toIso8601String(),
                    'response_minutes' => $request->response_minutes,
                    'client' => $this->formatUserName($request->client, $request->client_id),
                    'handled_by' => $this->formatUserName($request->handler, $request->handled_by),
                ];
            })
            ->values()
            ->all();

        $total = (clone $query)->count();

        return [
            'totals' => [
                'all' => $total,
                'pending' => $totalsByStatus['pending'] ?? 0,
                'in_progress' => $totalsByStatus['in_progress'] ?? 0,
                'resolved' => $totalsByStatus['resolved'] ?? 0,
                'avg_response_minutes' => $averageResponse ? round($averageResponse, 2) : null,
            ],
            'recent' => $recent,
        ];
    }

    protected function applyInfoRequestFilters($query, array $filters, array $range)
    {
        if (!empty($filters['client_id'])) {
            $query->where('client_id', $filters['client_id']);
        }

        if (!empty($filters['collaborator_id'])) {
            $query->where(function ($sub) use ($filters) {
                $sub->where('handled_by', $filters['collaborator_id'])
                    ->orWhereHas('task', fn ($taskQuery) => $taskQuery->where('assigned_to', $filters['collaborator_id']));
            });
        }

        if (!empty($filters['date_from']) || !empty($filters['date_to'])) {
            $query->whereBetween('requested_at', [
                $range['from']->copy()->startOfDay(),
                $range['to']->copy()->endOfDay(),
            ]);
        }

        return $query;
    }

    public function prepareDatasetForExport(array $overview, string $dataset): ?array
    {
        $dataset = strtolower(trim($dataset));

        return match ($dataset) {
            'collaborators', 'employee_efficiency' => $this->exportEmployeeEfficiency($overview),
            'time_by_collaborator', 'collaborator_time' => $this->exportTimeByCollaborator($overview),
            'clients', 'time_by_client' => $this->exportTimeByClient($overview),
            'time_by_category', 'categories' => $this->exportTimeByCategory($overview),
            'overdue_tasks', 'overdue' => $this->exportOverdueTasks($overview),
            'info_requests', 'client_information_requests' => $this->exportInfoRequests($overview),
            'info_requests_totals', 'client_information_totals' => $this->exportInfoRequestTotals($overview),
            'task_hours', 'task_hours_by_user' => $this->exportTaskHoursByUser($overview),
            'daily_time_tracking', 'daily_time' => $this->exportDailyTimeTracking($overview),
            'team_performance', 'performance' => $this->exportTeamPerformance($overview),
            'status_distribution', 'status' => $this->exportStatusDistribution($overview),
            'periodic_collaborators' => $this->exportPeriodicBreakdown($overview, 'periodic_collaborators', 'Collaborateur'),
            'periodic_clients' => $this->exportPeriodicBreakdown($overview, 'periodic_clients', 'Client'),
            'cost_summary' => $this->exportCostSummary($overview),
            'billing_vs_workload', 'workload' => $this->exportBillingVsWorkload($overview),
            default => null,
        };
    }

    protected function exportEmployeeEfficiency(array $overview): array
    {
        $rows = collect($overview['employee_efficiency'] ?? [])->map(function ($row) {
            if ($row instanceof Collection) {
                $row = $row->toArray();
            }

            return [
                $row['user_id'] ?? null,
                $row['name'] ?? '',
                $row['completed'] ?? 0,
                $row['inProgress'] ?? 0,
                $row['notStarted'] ?? 0,
                $row['cancelled'] ?? 0,
                $row['overdue'] ?? 0,
                $row['rate'] ?? 0,
            ];
        })->toArray();

        return [
            'headings' => ['ID', 'Collaborateur', 'Réalisées', 'En cours', 'Non commencées', 'Annulées', 'Retard', 'Taux %'],
            'rows' => $rows,
        ];
    }

    protected function exportTimeByCollaborator(array $overview): array
    {
        $rows = collect($overview['time_by_collaborator'] ?? [])->map(function ($row) {
            if ($row instanceof Collection) {
                $row = $row->toArray();
            }

            return [
                $row['user_id'] ?? null,
                $row['name'] ?? '',
                $row['hours'] ?? 0,
                $row['minutes'] ?? 0,
            ];
        })->toArray();

        return [
            'headings' => ['ID', 'Collaborateur', 'Heures', 'Minutes'],
            'rows' => $rows,
        ];
    }

    protected function exportTimeByClient(array $overview): array
    {
        $rows = collect($overview['time_by_client'] ?? [])->map(function ($row) {
            if ($row instanceof Collection) {
                $row = $row->toArray();
            }

            return [
                $row['client_id'] ?? null,
                $row['client_name'] ?? '',
                $row['hours'] ?? 0,
                $row['minutes'] ?? 0,
            ];
        })->toArray();

        return [
            'headings' => ['Client ID', 'Client', 'Heures suivies', 'Minutes'],
            'rows' => $rows,
        ];
    }

    protected function exportTimeByCategory(array $overview): array
    {
        $rows = collect($overview['time_by_category'] ?? [])->map(function ($row) {
            if ($row instanceof Collection) {
                $row = $row->toArray();
            }

            return [
                $row['category'] ?? 'Non classé',
                $row['hours'] ?? 0,
                $row['minutes'] ?? 0,
            ];
        })->toArray();

        return [
            'headings' => ['Catégorie', 'Heures', 'Minutes'],
            'rows' => $rows,
        ];
    }

    protected function exportOverdueTasks(array $overview): array
    {
        $rows = collect($overview['overdue_tasks'] ?? [])->map(function ($row) {
            if ($row instanceof Collection) {
                $row = $row->toArray();
            }

            return [
                $row['task_id'] ?? null,
                $row['description'] ?? '',
                $row['assigned_to'] ?? '',
                $row['client'] ?? '',
                $row['list_id'] ?? null,
                $row['end_date'] ?? '',
                $row['delay_minutes'] ?? 0,
                $row['priority'] ?? '',
                $row['status'] ?? '',
            ];
        })->toArray();

        return [
            'headings' => ['ID', 'Tâche', 'Assigné à', 'Client', 'Liste', 'Date fin', 'Retard (min)', 'Priorité', 'Statut'],
            'rows' => $rows,
        ];
    }

    protected function exportInfoRequests(array $overview): array
    {
        $rows = collect($overview['client_information_requests']['recent'] ?? [])->map(function ($row) {
            if ($row instanceof Collection) {
                $row = $row->toArray();
            }

            return [
                $row['id'] ?? null,
                $row['subject'] ?? '',
                $row['client'] ?? '',
                $row['handled_by'] ?? '',
                $row['channel'] ?? '',
                $row['status'] ?? '',
                $row['requested_at'] ?? '',
                $row['responded_at'] ?? '',
                $row['response_minutes'] ?? null,
            ];
        })->toArray();

        return [
            'headings' => ['ID', 'Sujet', 'Client', 'Gestionnaire', 'Canal', 'Statut', 'Demandé le', 'Répondu le', 'Délai (min)'],
            'rows' => $rows,
        ];
    }

    protected function exportInfoRequestTotals(array $overview): array
    {
        $totals = $overview['client_information_requests']['totals'] ?? null;

        if (!$totals) {
            return [
                'headings' => ['Libellé', 'Valeur'],
                'rows' => [],
            ];
        }

        $rows = [
            ['Total demandes', $totals['all'] ?? 0],
            ['En attente', $totals['pending'] ?? 0],
            ['En cours', $totals['in_progress'] ?? 0],
            ['Résolues', $totals['resolved'] ?? 0],
            ['Temps de réponse moyen (min)', $totals['avg_response_minutes'] ?? null],
        ];

        return [
            'headings' => ['Libellé', 'Valeur'],
            'rows' => $rows,
        ];
    }

    protected function exportTaskHoursByUser(array $overview): array
    {
        $rows = [];
        $users = collect($overview['task_hours_by_user'] ?? []);

        foreach ($users as $user) {
            if ($user instanceof Collection) {
                $user = $user->toArray();
            }

            $tasks = collect($user['tasks'] ?? []);
            $baseRow = [
                $user['user_id'] ?? null,
                $user['name'] ?? '',
                $user['total_hours'] ?? 0,
                $user['total_minutes'] ?? 0,
                $user['tasks_count'] ?? 0,
            ];

            if ($tasks->isEmpty()) {
                $rows[] = array_merge($baseRow, ['', 0, 0, '', '']);
                continue;
            }

            foreach ($tasks as $task) {
                if ($task instanceof Collection) {
                    $task = $task->toArray();
                }

                $rows[] = array_merge($baseRow, [
                    $task['task_label'] ?? '',
                    $task['hours'] ?? 0,
                    $task['minutes'] ?? 0,
                    $task['status'] ?? '',
                    $task['project_id'] ?? null,
                ]);
            }
        }

        return [
            'headings' => ['ID', 'Collaborateur', 'Total heures', 'Total minutes', 'Nombre de tâches', 'Tâche', 'Heures tâche', 'Minutes tâche', 'Statut', 'Projet'],
            'rows' => $rows,
        ];
    }

    protected function exportDailyTimeTracking(array $overview): array
    {
        $rows = [];
        $daily = $overview['daily_time_tracking'] ?? null;

        if ($daily) {
            $rows[] = [
                sprintf('Période %s → %s', $daily['start_date'] ?? '', $daily['end_date'] ?? ''),
                $daily['total_hours'] ?? 0,
                $daily['average_hours_per_day'] ?? 0,
                '',
                '',
            ];

            $days = collect($daily['days'] ?? []);
            foreach ($days as $day) {
                if ($day instanceof Collection) {
                    $day = $day->toArray();
                }

                $users = collect($day['users'] ?? []);
                if ($users->isEmpty()) {
                    $rows[] = [
                        $day['date'] ?? '',
                        $day['hours'] ?? 0,
                        $day['entries'] ?? 0,
                        '',
                        '',
                    ];
                    continue;
                }

                foreach ($users as $user) {
                    if ($user instanceof Collection) {
                        $user = $user->toArray();
                    }

                    $rows[] = [
                        $day['date'] ?? '',
                        $day['hours'] ?? 0,
                        $day['entries'] ?? 0,
                        $user['name'] ?? '',
                        $user['hours'] ?? 0,
                    ];
                }
            }
        }

        return [
            'headings' => ['Date ou période', 'Heures totales', 'Entrées / Moyenne', 'Utilisateur', 'Heures utilisateur'],
            'rows' => $rows,
        ];
    }

    protected function exportTeamPerformance(array $overview): array
    {
        $rows = collect($overview['team_performance'] ?? [])->map(function ($row) {
            if ($row instanceof Collection) {
                $row = $row->toArray();
            }

            return [
                $row['user_id'] ?? null,
                $row['name'] ?? '',
                $row['completed'] ?? 0,
                $row['in_progress'] ?? 0,
                $row['overdue_active'] ?? 0,
                $row['avg_cycle_hours'] ?? 0,
                $row['avg_delay_minutes'] ?? 0,
                $row['on_time_rate'] ?? null,
            ];
        })->toArray();

        return [
            'headings' => ['ID', 'Collaborateur', 'Terminées', 'En cours', 'Retard actif', 'Cycle moyen (h)', 'Retard moyen (min)', 'Taux ponctualité %'],
            'rows' => $rows,
        ];
    }

    protected function exportStatusDistribution(array $overview): array
    {
        $distribution = $overview['status_distribution'] ?? [];
        $labels = [
            'en_attente' => 'En attente',
            'en_cours' => 'En cours',
            'en_validation' => 'En validation',
            'terminees' => 'Terminées',
            'annulees' => 'Annulées',
            'en_retard' => 'En retard',
        ];

        $rows = [];
        foreach ($distribution as $key => $value) {
            $rows[] = [
                $labels[$key] ?? ucfirst(str_replace('_', ' ', $key)),
                $value,
            ];
        }

        return [
            'headings' => ['Statut', 'Total'],
            'rows' => $rows,
        ];
    }

    protected function exportPeriodicBreakdown(array $overview, string $key, string $labelHeading): array
    {
        $rows = collect($overview[$key] ?? [])->map(function ($row) {
            if ($row instanceof Collection) {
                $row = $row->toArray();
            }

            return [
                $row['key'] ?? null,
                $row['label'] ?? '',
                $row['tasks_total'] ?? 0,
                $row['tasks_completed'] ?? 0,
                $row['tasks_overdue'] ?? 0,
                $row['avg_delay_minutes'] ?? 0,
            ];
        })->toArray();

        return [
            'headings' => [$labelHeading . ' ID', $labelHeading, 'Tâches totales', 'Tâches terminées', 'Tâches en retard', 'Retard moyen (min)'],
            'rows' => $rows,
        ];
    }

    protected function exportCostSummary(array $overview): array
    {
        $summary = $overview['cost_summary'] ?? null;
        $rows = [];

        if ($summary) {
            $rows[] = [
                'Total',
                'Global',
                $summary['total_hours'] ?? 0,
                $summary['billable_hours'] ?? 0,
                $summary['total_cost'] ?? 0,
                $summary['billing_amount'] ?? 0,
                $summary['profitability_ratio'] ?? null,
            ];

            $byUser = collect($summary['by_user'] ?? []);
            foreach ($byUser as $row) {
                if ($row instanceof Collection) {
                    $row = $row->toArray();
                }

                $rows[] = [
                    'Utilisateur',
                    $row['name'] ?? ($row['user_id'] ? 'Utilisateur ' . $row['user_id'] : ''),
                    $row['hours'] ?? 0,
                    null,
                    $row['cost'] ?? 0,
                    $row['billing'] ?? 0,
                    null,
                ];
            }
        }

        return [
            'headings' => ['Type', 'Libellé', 'Heures', 'Heures facturables', 'Coût (€)', 'Montant facturé (€)', 'Taux rentabilité'],
            'rows' => $rows,
        ];
    }

    protected function exportBillingVsWorkload(array $overview): array
    {
        $summary = $overview['billing_vs_workload'] ?? [];
        $planned = (int) ($summary['planned_minutes'] ?? 0);
        $actual = (int) ($summary['actual_minutes'] ?? 0);
        $variance = $summary['variance_minutes'] ?? ($actual - $planned);

        return [
            'headings' => ['Minutes planifiées', 'Minutes suivies', 'Écart (min)', 'Écart (h)'],
            'rows' => [[
                $planned,
                $actual,
                $variance,
                round($variance / 60, 2),
            ]],
        ];
    }

    protected function aggregateTimeByClient(Collection $tasks, Collection $timeEntriesByTask): Collection
    {
        return $tasks
            ->groupBy('client_id')
            ->map(function (Collection $clientTasks, $clientId) use ($timeEntriesByTask) {
                $clientName = optional($clientTasks->first()->client)->name ?? 'Client non défini';
                $minutes = $clientTasks->sum(function ($task) use ($timeEntriesByTask) {
                    return $timeEntriesByTask->get($task->id, collect())->sum('duration_minutes');
                });

                return collect([
                    'client_id' => $clientId,
                    'client_name' => $clientName,
                    'hours' => round($minutes / 60, 2),
                    'minutes' => $minutes,
                ]);
            })
            ->sortByDesc('hours');
    }

    protected function aggregateTimeByCategory(Collection $tasks, Collection $timeEntriesByTask): Collection
    {
        return $tasks
            ->groupBy(fn ($task) => $task->type ?: 'Non classé')
            ->map(function (Collection $categoryTasks, $category) use ($timeEntriesByTask) {
                $minutes = $categoryTasks->sum(function ($task) use ($timeEntriesByTask) {
                    return $timeEntriesByTask->get($task->id, collect())->sum('duration_minutes');
                });

                return collect([
                    'category' => $category,
                    'hours' => round($minutes / 60, 2),
                    'minutes' => $minutes,
                ]);
            })
            ->sortByDesc('hours');
    }

    protected function computeCostSummary(Collection $tasks, Collection $timeEntriesByTask, Collection $timeByCollaborator): array
    {
        $totals = [
            'total_hours' => 0,
            'total_cost' => 0,
            'billable_hours' => 0,
            'billing_amount' => 0,
            'profitability_ratio' => null,
            'by_user' => [],
        ];

        $byUser = [];

        foreach ($tasks as $task) {
            $entries = $timeEntriesByTask->get($task->id, collect());
            if ($entries->isEmpty()) {
                continue;
            }

            $minutes = $entries->sum('duration_minutes');
            $hours = $minutes / 60;
            $costRate = optional($task->assignedUser)->hourly_rate ?? 0;
            $billingRate = $task->billing_rate ?? $costRate;
            $taskCost = $hours * $costRate;

            $totals['total_hours'] += $hours;
            $totals['total_cost'] += $taskCost;

            if ($task->is_billable) {
                $totals['billable_hours'] += $hours;
                $totals['billing_amount'] += $hours * $billingRate;
            }

            foreach ($entries->groupBy('user_id') as $userId => $userEntries) {
                $userMinutes = $userEntries->sum('duration_minutes');
                $userHours = $userMinutes / 60;
                if (!isset($byUser[$userId])) {
                    $byUser[$userId] = [
                        'user_id' => $userId,
                        'hours' => 0,
                        'cost' => 0,
                        'billing' => 0,
                    ];
                }

                $byUser[$userId]['hours'] += $userHours;
                $byUser[$userId]['cost'] += $userHours * $costRate;
                if ($task->is_billable) {
                    $byUser[$userId]['billing'] += $userHours * $billingRate;
                }
            }
        }

        $totals['total_hours'] = round($totals['total_hours'], 2);
        $totals['total_cost'] = round($totals['total_cost'], 2);
        $totals['billable_hours'] = round($totals['billable_hours'], 2);
        $totals['billing_amount'] = round($totals['billing_amount'], 2);
        $totals['profitability_ratio'] = $totals['total_cost'] > 0
            ? round($totals['billing_amount'] / max(0.01, $totals['total_cost']), 2)
            : null;

        $byUserCollection = collect($byUser)->map(function ($item) {
            $item['hours'] = round($item['hours'], 2);
            $item['cost'] = round($item['cost'], 2);
            $item['billing'] = round($item['billing'], 2);
            return $item;
        })->values();

        $existingIds = $byUserCollection->pluck('user_id');

        $additional = $timeByCollaborator
            ->reject(fn ($item) => $existingIds->contains($item['user_id']))
            ->map(function ($item) {
                return [
                    'user_id' => $item['user_id'],
                    'name' => $item['name'] ?? null,
                    'hours' => $item['hours'],
                    'cost' => 0,
                    'billing' => 0,
                ];
            })->values();

        $totals['by_user'] = $byUserCollection
            ->map(function ($item) use ($timeByCollaborator) {
                if (!isset($item['name'])) {
                    $match = $timeByCollaborator->firstWhere('user_id', $item['user_id']);
                    $item['name'] = $match['name'] ?? null;
                }
                return $item;
            })
            ->merge($additional)
            ->values();

        return $totals;
    }

    protected function computeBillingVsWorkload(Collection $tasks, Collection $timeEntriesByTask): array
    {
        $planned = $tasks->sum(fn ($task) => (int) $task->planned_minutes);
        $actual = $tasks->sum(function ($task) use ($timeEntriesByTask) {
            $tracked = $timeEntriesByTask->get($task->id, collect())->sum('duration_minutes');
            return $tracked ?: (int) $task->actual_minutes_cache;
        });

        return [
            'planned_minutes' => $planned,
            'actual_minutes' => $actual,
            'variance_minutes' => $actual - $planned,
        ];
    }

    protected function normalizeStatus(?string $status): string
    {
        $status = $status ? strtolower(trim($status)) : '';
        $map = [
            'en attente' => 'en attente',
            'en cours' => 'en cours',
            'en validation' => 'en validation',
            'terminée' => 'terminee',
            'terminé' => 'terminee',
            'terminées' => 'terminee',
            'annulé' => 'annule',
            'annulée' => 'annule',
        ];

        return $map[$status] ?? $status;
    }

    protected function isCompleted(?string $status): bool
    {
        return $this->normalizeStatus($status) === 'terminee';
    }
}
