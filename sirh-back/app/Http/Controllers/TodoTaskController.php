<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Jobs\CreateRepeatTodoTask;
use Illuminate\Http\Request;
use App\Models\TodoList;
use App\Models\TaskProgressLog;
use App\Models\TodoTask;
use App\Models\TodoTaskAttachment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class TodoTaskController extends Controller
{
    public function store(Request $request, $todoListId)
    {
        try {
            // Vérifie que la todoList existe avant de continuer
            \App\Models\TodoList::findOrFail($todoListId);
            
            $request->merge([
                'start_date' => $request->input('start_date') ?: null,
                'end_date' => $request->input('end_date') ?: null,
                'assigned_to' => $request->input('assigned_to') === '' ? null : $request->input('assigned_to'),
                'source' => $request->input('source') === '' ? null : $request->input('source'),
                'origine' => $request->input('origine') === '' ? null : $request->input('origine'),
            ]);

            if ($request->has('assignees') && is_string($request->input('assignees'))) {
                $decodedAssignees = json_decode($request->input('assignees'), true);
                if (is_array($decodedAssignees)) {
                    $request->merge(['assignees' => $decodedAssignees]);
                }
            }

            $dateRule = 'nullable|date';
            $request->validate([
                'description' => 'required|string',
                'assigned_to' => 'nullable|exists:users,id',
                'pourcentage' => 'nullable|integer|min:0|max:100',
                'start_date' => $dateRule,
                'end_date' => $dateRule,
                'status' => 'nullable|in:En attente,En cours,En validation,Terminée,Annulé',
                'priority' => 'nullable|in:basse,normale,haute,critique',
                'client_id' => 'nullable|exists:users,id',
                'type' => 'nullable|string|in:AC,AP',
                'origine' => 'nullable|string',
                'source' => 'nullable|string',
                'attachments' => 'nullable|array',
                'attachments.*' => 'file|mimes:jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,xlsm,txt|max:20480',
                'assignees' => 'nullable|array',
                'assignees.*' => 'integer|distinct|exists:users,id',
                'repeat_count' => 'nullable|integer|min:1|max:10',
                'repeat_frequency' => 'nullable|string|in:manual,week,month,3_months,6_months,year',
                'repeat_ranges' => 'nullable|array',
                'repeat_ranges.*.start_date' => 'nullable|date',
                'repeat_ranges.*.end_date' => 'nullable|date',
                'repeat_ranges_json' => 'nullable|string',
            ]);

            $assigneeIds = $this->resolveAssigneeIds($request);

            if ($request->filled('assigned_to')) {
                $assigneeIds = collect($assigneeIds)
                    ->prepend((int) $request->input('assigned_to'))
                    ->unique()
                    ->values()
                    ->all();
            }

            $payload = [
                'todo_list_id' => $todoListId,
                'description' => $request->description,
                'status' => $request->status ?? 'En attente',
                'assigned_to' => $assigneeIds[0] ?? null,
                'pourcentage' => (int) ($request->pourcentage ?? 0),
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'type' => $request->type ?? 'AC',
                'origine' => $request->input('source', $request->input('origine')),
                'client_id' => $request->input('client_id'),
                'priority' => $request->input('priority', 'normale'),
            ];

            $repeatCount = $this->sanitizeRepeatCount($request->input('repeat_count'));
            $repeatRanges = $this->extractRepeatRanges($request, $repeatCount);

            if (empty($repeatRanges)) {
                $repeatRanges[] = [
                    'start_date' => $payload['start_date'],
                    'end_date' => $payload['end_date'],
                ];
            }

            if (!empty($repeatRanges)) {
                if (!$payload['start_date'] && !empty($repeatRanges[0]['start_date'])) {
                    $payload['start_date'] = $repeatRanges[0]['start_date'];
                }
                if (!$payload['end_date'] && !empty($repeatRanges[0]['end_date'])) {
                    $payload['end_date'] = $repeatRanges[0]['end_date'];
                }
            }

            if ($repeatCount > count($repeatRanges) && !empty($repeatRanges)) {
                $lastRange = end($repeatRanges);
                while (count($repeatRanges) < $repeatCount) {
                }
            }

            $duplicateRanges = $repeatCount > 1 ? array_slice($repeatRanges, 1) : [];

            $storedAttachmentsMeta = [];

            $task = DB::transaction(function () use ($request, $payload, $assigneeIds, &$storedAttachmentsMeta) {
                $primaryTask = TodoTask::create($payload);

                if (!empty($assigneeIds)) {
                    $primaryTask->assignees()->sync($assigneeIds);
                }

                if ($request->hasFile('attachments')) {
                    foreach ($request->file('attachments') as $file) {
                        $path = $file->store('todo_tasks', 'public');
                        $meta = [
                            'uploaded_by' => optional(Auth::user())->id,
                            'original_name' => $file->getClientOriginalName(),
                            'stored_path' => $path,
                            'mime_type' => $file->getMimeType(),
                            'size' => $file->getSize(),
                        ];
                        $primaryTask->attachments()->create($meta);
                        $storedAttachmentsMeta[] = $meta;
                    }
                }

                return $primaryTask;
            });

            $scheduledDuplicates = [];

            if (!empty($duplicateRanges)) {
                $scheduledDuplicates = $this->scheduleRepeatTasks(
                    $payload,
                    $duplicateRanges,
                    $assigneeIds,
                    $storedAttachmentsMeta,
                    $request->input('repeat_frequency')
                );
            }

            $relations = [
                'attachments',
                'comments',
                'assignees',
                'cancellationRequests.requester',
                'assignedUser:id,name,prenom,tel',
                'list:id,created_by',
            ];

            $task->load($relations);

            $this->syncCompletionMetadata($task);

            return response()->json([
                'task' => $task,
                'scheduled_duplicates' => $scheduledDuplicates,
            ], 201);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'error' => 'La liste de tâches avec ID ' . $todoListId . ' n\'existe pas.'
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erreur lors de la création de la tâche: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {

        $task = TodoTask::findOrFail($id);
        $task->loadMissing('assignees');
    $user = Auth::user();
        // Fix: $task->todoList may be null if not loaded, so fetch explicitly if needed
        $todoList = $task->relationLoaded('todoList') && $task->todoList ? $task->todoList : \App\Models\TodoList::find($task->todo_list_id);

        if (!$todoList) {
            return response()->json(['error' => 'Liste parente introuvable'], 404);
        }

        $isListOwner = ($user->id === $todoList->created_by) || ($user->id === $todoList->assigned_to);
        $upperRole = strtoupper($user->role ?? '');
        $managerRoles = ['RH', 'GEST_RH', 'GEST_PROJET', 'CHEF_PROJET', 'CHEF_DEP', 'CHEF_CHANT', 'ADMIN'];
        $isManagerRole = in_array($upperRole, $managerRoles, true);
        $isTaskPrimaryAssignee = (int) ($task->assigned_to ?? 0) === (int) $user->id;
        $isTaskSecondaryAssignee = $task->assignees->contains(function ($assignee) use ($user) {
            return (int) $assignee->id === (int) $user->id;
        });
        $isTaskAssignee = $isTaskPrimaryAssignee || $isTaskSecondaryAssignee;


        $normalizedRole = $user->role ?? '';
        if (function_exists('mb_strtolower')) {
            $normalizedRole = mb_strtolower($normalizedRole, 'UTF-8');
        } else {
            $normalizedRole = strtolower($normalizedRole);
        }
        $normalizedRole = str_replace(['é', 'è', 'ê'], 'e', $normalizedRole);
        $employeeRoles = ['employe', 'employee'];
        $hasLimitedEmployeePermissions = $isTaskAssignee && !$isListOwner && !$isManagerRole && in_array($normalizedRole, $employeeRoles, true);

        $request->merge([
            'start_date' => $request->input('start_date') ?: null,
            'end_date' => $request->input('end_date') ?: null,
            'assigned_to' => $request->input('assigned_to') === '' ? null : $request->input('assigned_to'),
            'source' => $request->input('source') === '' ? null : $request->input('source'),
            'origine' => $request->input('origine') === '' ? null : $request->input('origine'),
        ]);

        if ($request->has('assignees') && is_string($request->input('assignees'))) {
            $decodedAssignees = json_decode($request->input('assignees'), true);
            if (is_array($decodedAssignees)) {
                $request->merge(['assignees' => $decodedAssignees]);
            }
        }

        $dateRule = 'nullable|date';
        $validated = $request->validate([
            'description' => 'sometimes|string',
            'status' => 'sometimes|in:En attente,En cours,En validation,Terminée,Annulé',
            'priority' => 'nullable|in:basse,normale,haute,critique',
            'client_id' => 'nullable|exists:users,id',
            'pourcentage' => 'nullable|integer|min:0|max:100',
            'start_date' => $dateRule,
            'end_date' => $dateRule,
            'type' => 'nullable|string|in:AC,AP',
            'origine' => 'nullable|string',
            'source' => 'nullable|string',
            'assigned_to' => 'nullable|exists:users,id',
            'todo_list_id' => 'sometimes|exists:todo_lists,id',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|mimes:jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,xlsm,txt|max:20480',
            'remove_attachments' => 'nullable|array',
            'remove_attachments.*' => 'integer|exists:todo_task_attachments,id',
            'assignees' => 'nullable|array',
            'assignees.*' => 'integer|distinct|exists:users,id',
            'progress_comment' => 'nullable|string|max:2000',
        ]);

        $progressComment = $validated['progress_comment'] ?? null;

        // Allow updating progress without forcing a comment
        if (array_key_exists('pourcentage', $validated)) {
            $newPourcentage = (int) $validated['pourcentage'];
            // No blocking validation on missing progressComment; logging remains optional below
        }

        if ($hasLimitedEmployeePermissions) {
            $allowedKeys = ['status', 'pourcentage'];
            $requestedKeys = array_keys($validated);
            $disallowedKeys = array_diff($requestedKeys, $allowedKeys);
          

         
        }

        $allowedFields = [
            'description',
            'status',
            'pourcentage',
            'start_date',
            'end_date',
            'type',
            'assigned_to',
            'todo_list_id',
            'client_id',
            'priority',
        ];

        if ($hasLimitedEmployeePermissions) {
            $allowedFields = ['status', 'pourcentage'];
        }

        $data = collect($validated)->only($allowedFields)->toArray();

        if (array_key_exists('pourcentage', $data) && $data['pourcentage'] === null) {
            $data['pourcentage'] = 0;
        }

        if (array_key_exists('pourcentage', $data)) {
            $data['pourcentage'] = (int) $data['pourcentage'];
            if ($data['pourcentage'] >= 100) {
                $data['pourcentage'] = 100;
                $data['status'] = $data['status'] ?? 'Terminée';
            }
        }

        if (array_key_exists('todo_list_id', $data)) {
            $data['todo_list_id'] = (int) $data['todo_list_id'];
        }

        $shouldSyncAssignees = !$hasLimitedEmployeePermissions && ($request->boolean('assignees_present') || $request->has('assignees'));
        $assigneeIds = null;

        if ($shouldSyncAssignees) {
            $assigneeIds = $this->resolveAssigneeIds($request);

            if ($request->filled('assigned_to')) {
                $assigneeIds = collect($assigneeIds)
                    ->prepend((int) $request->input('assigned_to'))
                    ->unique()
                    ->values()
                    ->all();
            }
        } elseif (array_key_exists('assigned_to', $data)) {
            $assigneeIds = $data['assigned_to'] ? [(int) $data['assigned_to']] : [];
            $shouldSyncAssignees = true;
        }

        if ($assigneeIds !== null) {
            $data['assigned_to'] = $assigneeIds[0] ?? null;
        } elseif (array_key_exists('assigned_to', $data)) {
            $data['assigned_to'] = $data['assigned_to'] ? (int) $data['assigned_to'] : null;
        }

        if (!$hasLimitedEmployeePermissions) {
            $data['origine'] = $request->input('source', $request->input('origine'));
        }

        // Capture old status BEFORE transaction for cancellation detection
        $oldStatus = $task->status;
        $newStatus = $data['status'] ?? null;

        DB::transaction(function () use ($request, $task, $data, $validated, $assigneeIds, $shouldSyncAssignees, $hasLimitedEmployeePermissions) {
            $task->update($data);

            if (!$hasLimitedEmployeePermissions) {
                if (!empty($validated['remove_attachments'])) {
                    $task->attachments()->whereIn('id', $validated['remove_attachments'])->get()->each(function (TodoTaskAttachment $attachment) {
                        $attachment->delete();
                    });
                }

                if ($request->hasFile('attachments')) {
                    foreach ($request->file('attachments') as $file) {
                        $path = $file->store('todo_tasks', 'public');
                        $task->attachments()->create([
                            'uploaded_by' => optional(Auth::user())->id,
                            'original_name' => $file->getClientOriginalName(),
                            'stored_path' => $path,
                            'mime_type' => $file->getMimeType(),
                            'size' => $file->getSize(),
                        ]);
                    }
                }
            }

            if ($shouldSyncAssignees) {
                    // Compute newly added assignees compared to previous state
                    $beforeIds = $task->assignees()->pluck('users.id')->map(fn($id) => (int)$id)->toArray();
                    $task->assignees()->sync($assigneeIds);
                    $afterIds = $task->assignees()->pluck('users.id')->map(fn($id) => (int)$id)->toArray();
                    $added = array_values(array_diff($afterIds, $beforeIds));

                    // Detect new primary assignee if it changed
                    $onlyUserIds = $added;
                    if (array_key_exists('assigned_to', $data)) {
                        $oldPrimary = (int)($task->getOriginal('assigned_to') ?? 0);
                        $newPrimary = (int)($task->assigned_to ?? 0);
                        if ($newPrimary && $newPrimary !== $oldPrimary) {
                            $onlyUserIds[] = $newPrimary;
                        }
                    }
                    $onlyUserIds = array_values(array_unique(array_filter($onlyUserIds)));
                    if (!empty($onlyUserIds)) {
                        $sync = (bool) config('twilio.sync_on_task_events', false);
                        if ($sync) {
                            $taskId = $task->id;
                            $targetIds = $onlyUserIds;
                            DB::afterCommit(function () use ($taskId, $targetIds) {
                                \App\Jobs\SendTaskAssignedNotifications::dispatchSync($taskId, $targetIds);
                            });
                        } else {
                            \App\Jobs\SendTaskAssignedNotifications::dispatch($task->id, $onlyUserIds)->afterCommit();
                        }
                    }
            }
        });

        $task->refresh();
        $this->syncCompletionMetadata($task, $oldStatus);

        if ($progressComment || array_key_exists('pourcentage', $data) || array_key_exists('status', $data)) {
            TaskProgressLog::create([
                'todo_task_id' => $task->id,
                'user_id' => optional(Auth::user())->id,
                'pourcentage' => (int) $task->pourcentage,
                'comment' => $progressComment,
            ]);
        }

        // Note: Cancellation notifications are now handled by the TodoTask model observer
        // when the status changes to "Annulé" to avoid duplication

        $task->load('attachments', 'comments', 'assignees', 'cancellationRequests.requester', 'proofs');

        return response()->json($task);
    }

    public function storeProofs(Request $request, $id)
    {
        $task = TodoTask::findOrFail($id);
        $task->loadMissing('assignees');
    $user = Auth::user();

        $todoList = $task->relationLoaded('todoList') && $task->todoList ? $task->todoList : \App\Models\TodoList::find($task->todo_list_id);
        if (!$todoList) {
            return response()->json(['error' => 'Liste parente introuvable'], 404);
        }

        $isListOwner = ($user->id === $todoList->created_by) || ($user->id === $todoList->assigned_to);
        $upperRole = strtoupper($user->role ?? '');
        $managerRoles = ['RH', 'GEST_RH', 'GEST_PROJET', 'CHEF_PROJET', 'CHEF_DEP', 'CHEF_CHANT', 'ADMIN'];
        $isManagerRole = in_array($upperRole, $managerRoles, true);
        $isTaskPrimaryAssignee = (int) ($task->assigned_to ?? 0) === (int) $user->id;
        $isTaskSecondaryAssignee = $task->assignees->contains(function ($assignee) use ($user) {
            return (int) $assignee->id === (int) $user->id;
        });

       

        $request->validate([
            'proofs' => 'required|array|min:1',
            'proofs.*' => 'file|mimes:jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,xlsm,txt|max:20480',
        ]);

        $storedProofs = [];

        foreach ($request->file('proofs', []) as $file) {
            $path = $file->store('todo_task_proofs', 'public');
            $storedProofs[] = $task->proofs()->create([
                'uploaded_by' => $user->id,
                'original_name' => $file->getClientOriginalName(),
                'stored_path' => $path,
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
            ]);
        }

        $task->load('proofs');

        return response()->json([
            'message' => 'Preuves ajoutées avec succès',
            'proofs' => $task->proofs,
        ], 201);
    }

    public function destroy($id)
    {
        $task = TodoTask::findOrFail($id);
    $user = Auth::user();
        $todoList = $task->relationLoaded('todoList') && $task->todoList ? $task->todoList : \App\Models\TodoList::find($task->todo_list_id);

        if (!$todoList) {
            return response()->json(['error' => 'Liste parente introuvable'], 404);
        }

        // Only creator, assigned user, RH or Gest_RH can delete
        if (!($user->id === $todoList->created_by || $user->id === $todoList->assigned_to || in_array($user->role, ['RH', 'Gest_RH']))) {
            return response()->json(['error' => 'Non autorisé'], 403);
        }

        $task->delete();

        return response()->json(['message' => 'Tâche supprimée']);
    }

    public function sendBulkReminders(Request $request)
    {
        $validated = $request->validate([
            'task_ids' => 'required|array|min:1',
            'task_ids.*' => 'integer|exists:todo_tasks,id',
        ]);

        $taskIds = $validated['task_ids'];
        $sync = (bool) config('twilio.sync_on_task_events', false);

    Log::info("Bulk reminders requested for tasks", ['task_ids' => $taskIds]);

        $success = 0;
        $failed = 0;

        foreach ($taskIds as $taskId) {
            try {
                if ($sync) {
                    \App\Jobs\SendTaskReminderNotifications::dispatchSync($taskId);
                } else {
                    \App\Jobs\SendTaskReminderNotifications::dispatch($taskId)->onQueue('notifications');
                }
                $success++;
            } catch (\Exception $e) {
                Log::error("Failed to send reminder for task #{$taskId}", ['error' => $e->getMessage()]);
                $failed++;
            }
        }

        return response()->json([
            'message' => "Rappels envoyés pour {$success} tâche(s)",
            'success' => $success,
            'failed' => $failed,
        ]);
    }

    private function resolveAssigneeIds(Request $request): array
    {
        $raw = $request->input('assignees');

        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $raw = $decoded;
            }
        }

        if ($raw === null) {
            $raw = [];
        }
        if (!is_array($raw)) {
            $raw = [$raw];
        }

        return collect($raw)
            ->filter(fn ($id) => $id !== null && $id !== '' && is_numeric($id))
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    protected function scheduleRepeatTasks(array $basePayload, array $duplicateRanges, array $assigneeIds, array $attachmentsMeta, ?string $frequency): array
    {
        $scheduled = [];
        $baseStart = $this->normalizeDateInput($basePayload['start_date'] ?? null);
        $baseStartCarbon = $baseStart ? Carbon::parse($baseStart) : null;

        foreach ($duplicateRanges as $index => $range) {
            $runAt = $this->determineRunAtForDuplicate($index + 1, $frequency, $baseStartCarbon, $range);

            $pendingDispatch = CreateRepeatTodoTask::dispatch(
                $basePayload,
                $assigneeIds,
                $attachmentsMeta,
                $range
            );

            if ($runAt) {
                $pendingDispatch->delay($runAt);
            }

            $scheduled[] = [
                'sequence' => $index + 2,
                'start_date' => $range['start_date'] ?? null,
                'end_date' => $range['end_date'] ?? null,
                'scheduled_for' => $runAt?->toIso8601String(),
            ];
        }

        return $scheduled;
    }

    protected function determineRunAtForDuplicate(int $iteration, ?string $frequency, ?Carbon $baseStart, array $range): ?Carbon
    {
        if (!$frequency || $frequency === 'manual') {
            if ($baseStart && !empty($range['start_date'])) {
                try {
                    $target = Carbon::parse($range['start_date']);
                    $diffInSeconds = $baseStart->diffInSeconds($target, false);

                    if ($diffInSeconds > 0) {
                        return now()->copy()->addSeconds($diffInSeconds);
                    }
                } catch (\Throwable $e) {
                    // Ignore parse errors and fallback to default interval
                }
            }

            return now()->copy()->addMinutes($iteration);
        }

        $now = now();

        return match ($frequency) {
            'week' => $now->copy()->addWeeks($iteration),
            'month' => $now->copy()->addMonths($iteration),
            '3_months' => $now->copy()->addMonths(3 * $iteration),
            '6_months' => $now->copy()->addMonths(6 * $iteration),
            'year' => $now->copy()->addYears($iteration),
            default => $now->copy()->addDays($iteration),
        };
    }

    protected function sanitizeRepeatCount($value): int
    {
        $count = (int) ($value ?? 1);

        if ($count < 1) {
            return 1;
        }

        return (int) min($count, 10);
    }

    protected function extractRepeatRanges(Request $request, int $repeatCount): array
    {
        $ranges = [];
        $rawRanges = $request->input('repeat_ranges');

        if (is_array($rawRanges)) {
            $ranges = $rawRanges;
        } elseif ($request->filled('repeat_ranges_json')) {
            $decoded = json_decode($request->input('repeat_ranges_json'), true);
            if (is_array($decoded)) {
                $ranges = $decoded;
            }
        }

        $normalized = [];

        foreach ($ranges as $entry) {
            if (!is_array($entry)) {
                continue;
            }

            $start = $entry['start'] ?? $entry['start_date'] ?? null;
            $end = $entry['end'] ?? $entry['end_date'] ?? null;

            $startNormalized = $this->normalizeDateInput($start);
            $endNormalized = $this->normalizeDateInput($end);

            if ($startNormalized && $endNormalized) {
                $normalized[] = [
                    'start_date' => $startNormalized,
                    'end_date' => $endNormalized,
                ];
            }

            if (count($normalized) >= $repeatCount) {
                break;
            }
        }

        return $normalized;
    }

    protected function normalizeDateInput($value): ?string
    {
        if (!$value) {
            return null;
        }

        try {
            return Carbon::parse($value)->toDateString();
        } catch (\Throwable $e) {
            return null;
        }
    }

    protected function syncCompletionMetadata(TodoTask $task, ?string $previousStatus = null): void
    {
        $wasCompleted = $this->isCompletedStatus($previousStatus);
        $isCompleted = $this->isCompletedStatus($task->status);

        if ($isCompleted) {
            $completedAt = $task->completed_at ? Carbon::parse($task->completed_at) : now();
            $task->forceFill([
                'completed_at' => $completedAt,
                'completion_delay_minutes' => $this->calculateCompletionDelay($task, $completedAt),
            ])->saveQuietly();
        } elseif ($wasCompleted && !$isCompleted) {
            $task->forceFill([
                'completed_at' => null,
                'completion_delay_minutes' => null,
            ])->saveQuietly();
        }
    }

    protected function calculateCompletionDelay(TodoTask $task, Carbon $completedAt): ?int
    {
        if (!$task->end_date) {
            return null;
        }

        $expectedEnd = Carbon::parse($task->end_date)->endOfDay();

        return $expectedEnd->diffInMinutes($completedAt, false);
    }

    protected function isCompletedStatus(?string $status): bool
    {
        if (!$status) {
            return false;
        }

        $normalized = function_exists('mb_strtolower')
            ? mb_strtolower(trim($status), 'UTF-8')
            : strtolower(trim($status));

        return in_array($normalized, ['terminée', 'terminee', 'terminé', 'termine'], true);
    }
}
