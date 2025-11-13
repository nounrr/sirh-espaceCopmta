<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskProgressHour extends Model
{
    protected $table = 'task_progress_hours';

    protected $fillable = [
        'user_id',
        'task_id',
        'start_datetime',
        'end_datetime',
    ];

    protected $casts = [
        'start_datetime' => 'datetime',
        'end_datetime' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function task()
    {
        return $this->belongsTo(TodoTask::class, 'task_id');
    }
}
