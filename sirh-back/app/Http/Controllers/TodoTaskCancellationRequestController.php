<?php

namespace App\Http\Controllers;

use App\Models\TodoTask;
use App\Models\TodoTaskCancellationRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class TodoTaskCancellationRequestController extends Controller
{
    protected array $managerRoles = ['RH', 'Gest_RH', 'Gest_Projet', 'Chef_Projet'];

    public function index(Request $request)
    {
        $user = Auth::user();

        if (!$user || (!$user->hasAnyRole($this->managerRoles) && !in_array($user->role, $this->managerRoles, true))) {
            return response()->json(['error' => 'Non autorisé'], 403);
        }

        $status = $request->query('status');

        $query = TodoTaskCancellationRequest::query()
            ->with([
                'task.list',
                'task.assignees',
                'requester:id,name,prenom',
                'reviewer:id,name,prenom',
            ])
            ->latest();

        if ($status) {
            $query->where('status', $status);
        }

        return response()->json($query->paginate($request->query('per_page', 25)));
    }

    public function store(Request $request, $todoTaskId)
    {
        $task = TodoTask::with(['assignees', 'list'])->findOrFail($todoTaskId);
        $user = Auth::user();

        if (!$user) {
            return response()->json(['error' => 'Authentification requise'], 401);
        }

        $isAssignee = $task->assignees->contains(fn ($assignee) => $assignee->id === $user->id) || (int) $task->assigned_to === (int) $user->id;

        if (!$isAssignee && !$user->hasAnyRole($this->managerRoles) && !in_array($user->role, $this->managerRoles, true)) {
            return response()->json(['error' => 'Non autorisé'], 403);
        }

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $alreadyPending = TodoTaskCancellationRequest::where('todo_task_id', $task->id)
            ->where('status', 'pending')
            ->exists();

        if ($alreadyPending) {
            return response()->json([
                'error' => 'Une demande d\'annulation est déjà en attente pour cette tâche.',
            ], 422);
        }

        $cancellationRequest = TodoTaskCancellationRequest::create([
            'todo_task_id' => $task->id,
            'requested_by' => $user->id,
            'reason' => $validated['reason'] ?? null,
            'status' => 'pending',
        ]);

        $task->load('cancellationRequests.requester');

        return response()->json([
            'message' => 'Demande d\'annulation enregistrée.',
            'request' => $cancellationRequest->load('requester:id,name,prenom'),
            'task' => $task,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $user = Auth::user();


        $cancellationRequest = TodoTaskCancellationRequest::with('task')->findOrFail($id);

        if ($cancellationRequest->status !== 'pending') {
            return response()->json(['error' => 'Cette demande a déjà été traitée.'], 422);
        }

        $validated = $request->validate([
            'status' => ['required', Rule::in(['approved', 'rejected'])],
            'resolution_note' => ['nullable', 'string', 'max:2000'],
        ]);

        $cancellationRequest->update([
            'status' => $validated['status'],
            'resolution_note' => $validated['resolution_note'] ?? null,
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
        ]);

        return response()->json(
            $cancellationRequest->fresh(['task.list', 'task.assignees', 'requester:id,name,prenom', 'reviewer:id,name,prenom'])
        );
    }

    public function destroy($id)
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json(['error' => 'Authentification requise'], 401);
        }

        $cancellationRequest = TodoTaskCancellationRequest::with(['task.assignees'])->findOrFail($id);

        if ($cancellationRequest->status !== 'pending') {
            return response()->json(['error' => 'Impossible de retirer une demande déjà traitée.'], 422);
        }

        $task = $cancellationRequest->task;

        $isAssignee = $task && (
            $task->assignees->contains(fn ($assignee) => $assignee->id === $user->id)
            || (int) $task->assigned_to === (int) $user->id
        );
        $isRequester = (int) $cancellationRequest->requested_by === (int) $user->id;
        $isManager = $user->hasAnyRole($this->managerRoles) || in_array($user->role, $this->managerRoles, true);

        if (!$isRequester && !$isAssignee && !$isManager) {
            return response()->json(['error' => 'Non autorisé'], 403);
        }

        $cancellationRequest->delete();

        return response()->json([
            'message' => 'Demande d\'annulation retirée.',
            'request_id' => $id,
        ]);
    }
}
