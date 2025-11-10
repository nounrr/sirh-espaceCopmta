<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InfoRequest extends Model
{
    protected $fillable = [
        'client_id','todo_task_id','requested_by','subject','details','period_start','period_end','status','requested_at','responded_at'
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'requested_at' => 'datetime',
        'responded_at' => 'datetime',
    ];

    public function client() { return $this->belongsTo(User::class, 'client_id'); }
    public function task() { return $this->belongsTo(TodoTask::class, 'todo_task_id'); }
    public function requester() { return $this->belongsTo(User::class, 'requested_by'); }
    public function reminders() { return $this->hasMany(InfoRequestReminder::class); }
    public function attachments() { return $this->hasMany(InfoRequestAttachment::class); }
    public function comments() { return $this->hasMany(InfoRequestComment::class); }
}
