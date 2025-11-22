<?php

namespace App\Http\Controllers;

use App\Models\InfoRequest;
use App\Models\InfoRequestComment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class InfoRequestController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = InfoRequest::query();

        // If user is a client, only show their requests
        if ($user->role === 'client' || $user->typeContrat === 'Client') {
            $query->where('client_id', $user->id);
        } 
        // If user is collaborator, show assigned or all depending on permission (simplified here)
        else {
            if ($request->has('assigned_to')) {
                $query->where('assigned_to', $request->assigned_to);
            }
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->orderBy('created_at', 'desc')->paginate(20));
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'client_id' => 'required|exists:users,id',
            'priority' => 'in:low,medium,high',
        ]);

        $infoRequest = InfoRequest::create([
            'title' => $request->title,
            'description' => $request->description,
            'client_id' => $request->client_id,
            'assigned_to' => $request->assigned_to ?? Auth::id(),
            'status' => 'open',
            'priority' => $request->priority ?? 'medium',
            'due_date' => $request->due_date,
        ]);

        return response()->json($infoRequest, 201);
    }

    public function show($id)
    {
        $infoRequest = InfoRequest::with(['comments.user', 'comments.attachments', 'attachments'])->findOrFail($id);
        // Add authorization check here
        return response()->json($infoRequest);
    }

    public function addComment(Request $request, $id)
    {
        $request->validate(['content' => 'required|string']);
        
        $infoRequest = InfoRequest::findOrFail($id);
        
        DB::transaction(function () use ($request, $infoRequest) {
            $comment = InfoRequestComment::create([
                'info_request_id' => $infoRequest->id,
                'user_id' => Auth::id(),
                'content' => $request->content,
                'is_internal' => $request->boolean('is_internal', false),
            ]);

            // Auto-update status based on who is replying
            $user = Auth::user();
            if ($user->id === $infoRequest->client_id) {
                $infoRequest->update(['status' => 'answered']);
            } elseif (!$request->is_internal) {
                $infoRequest->update(['status' => 'pending_client']);
            }
        });

        return response()->json($infoRequest->load('comments.user'), 200);
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate(['status' => 'required|in:open,pending_client,answered,closed']);
        $infoRequest = InfoRequest::findOrFail($id);
        $infoRequest->update(['status' => $request->status]);
        return response()->json($infoRequest);
    }
}
