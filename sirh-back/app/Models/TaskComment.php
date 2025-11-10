<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TaskComment extends Model
{
    use HasFactory;

    protected $fillable = [
        'todo_task_id',
        'user_id',
        'comment',
    ];

    protected $with = ['user'];

    public function task()
    {
        return $this->belongsTo(TodoTask::class, 'todo_task_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
