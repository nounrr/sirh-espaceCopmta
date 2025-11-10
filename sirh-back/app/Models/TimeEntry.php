<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimeEntry extends Model
{
    protected $fillable = [
        'user_id','todo_task_id','client_id','started_at','stopped_at','note','source'
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'stopped_at' => 'datetime',
    ];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function task(): BelongsTo { return $this->belongsTo(TodoTask::class, 'todo_task_id'); }
    public function client(): BelongsTo { return $this->belongsTo(User::class, 'client_id'); }

    public function getDurationMinutesAttribute(): ?int
    {
        if (!$this->started_at || !$this->stopped_at) return null;
        return $this->stopped_at->diffInMinutes($this->started_at);
    }
}
