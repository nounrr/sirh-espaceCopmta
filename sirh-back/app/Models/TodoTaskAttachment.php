<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class TodoTaskAttachment extends Model
{
    protected $fillable = [
        'todo_task_id',
        'uploaded_by',
        'original_name',
        'stored_path',
        'mime_type',
        'size',
    ];

    protected $appends = ['url'];

    protected static function booted()
    {
        static::deleted(function (self $attachment) {
            if ($attachment->stored_path && Storage::disk('public')->exists($attachment->stored_path)) {
                Storage::disk('public')->delete($attachment->stored_path);
            }
        });
    }

    public function task()
    {
        return $this->belongsTo(TodoTask::class, 'todo_task_id');
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function getUrlAttribute(): ?string
    {
        return $this->stored_path ? Storage::disk('public')->url($this->stored_path) : null;
    }
}
