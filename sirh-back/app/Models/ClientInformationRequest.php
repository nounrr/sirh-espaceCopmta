<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClientInformationRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'todo_task_id',
        'client_id',
        'handled_by',
        'subject',
        'channel',
        'status',
        'requested_at',
        'responded_at',
        'response_minutes',
        'notes',
    ];

    protected $casts = [
        'requested_at' => 'datetime',
        'responded_at' => 'datetime',
    ];

    public function task()
    {
        return $this->belongsTo(TodoTask::class, 'todo_task_id');
    }

    public function client()
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function handler()
    {
        return $this->belongsTo(User::class, 'handled_by');
    }
}
