<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\TodoList;
use App\Models\TodoTask;
use App\Models\TodoTaskAttachment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

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

            $task = DB::transaction(function () use ($request, $payload, $assigneeIds) {
                $task = TodoTask::create($payload);

                if (!empty($assigneeIds)) {
                    $task->assignees()->sync($assigneeIds);
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

                return $task;
            });

            $task->load([
                'attachments',
                'comments',
                'assignees',
                'cancellationRequests.requester',
                'assignedUser:id,name,prenom,tel',
                'list:id,created_by',
            ]);

            return response()->json(['task' => $task], 201);
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
        ]);

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
}
