<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskProgressHour extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id',
        'user_id',
        'start_datetime',
        'end_datetime',
    ];

    protected $casts = [
        'start_datetime' => 'datetime',
        'end_datetime' => 'datetime',
    ];

    public function task()
    {
        return $this->belongsTo(TodoTask::class, 'task_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
