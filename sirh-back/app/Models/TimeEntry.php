<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TimeEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'todo_task_id',
        'user_id',
        'started_at',
        'ended_at',
        'duration_minutes',
        'source',
        'notes',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    public function task()
    {
        return $this->belongsTo(TodoTask::class, 'todo_task_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
