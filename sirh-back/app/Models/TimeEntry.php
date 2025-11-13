<?php
/**
 * @deprecated This legacy model is no longer used. Time slices are now stored in TaskProgressHour.
 *             Kept temporarily for backward compatibility; do not reference in new code.
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TimeEntry extends Model
{
    protected $fillable = [
        'user_id',
        'todo_task_id',
        'started_at',
        'stopped_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'stopped_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function task()
    {
        return $this->belongsTo(TodoTask::class, 'todo_task_id');
    }
}
