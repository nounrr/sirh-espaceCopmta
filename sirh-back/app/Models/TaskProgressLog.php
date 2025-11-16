<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskProgressLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'todo_task_id',
        'user_id',
        'pourcentage',
        'status',
        'comment',
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
