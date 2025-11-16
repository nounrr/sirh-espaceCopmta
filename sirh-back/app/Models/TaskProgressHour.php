<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskProgressHour extends Model
{
    use HasFactory;

    protected $fillable = [
        'todo_task_id',
        'user_id',
        'work_date',
        'minutes_spent',
        'cost',
    ];

    protected $casts = [
        'work_date' => 'date',
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
