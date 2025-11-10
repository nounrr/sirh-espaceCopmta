<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TodoTaskCancellationRequest extends Model
{
    use HasFactory;

    protected $table = 'todo_task_cancellation_requests';

    protected $fillable = [
        'todo_task_id',
        'requested_by',
        'reason',
        'status',
        'reviewed_by',
        'resolution_note',
        'reviewed_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    // Relationships
    public function task()
    {
        return $this->belongsTo(TodoTask::class, 'todo_task_id');
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
