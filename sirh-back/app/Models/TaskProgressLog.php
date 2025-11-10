<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskProgressLog extends Model
{
    protected $fillable = ['todo_task_id','user_id','pourcentage','comment'];

    public function task(): BelongsTo { return $this->belongsTo(TodoTask::class, 'todo_task_id'); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
