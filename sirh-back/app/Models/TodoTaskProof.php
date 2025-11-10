<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use App\Models\User;

class TodoTaskProof extends Model
{
    protected $fillable = [
        'todo_task_id',
        'uploaded_by',
        'original_name',
        'stored_path',
        'mime_type',
        'size',
    ];

    protected $appends = ['url', 'file_path'];

    protected static function booted(): void
    {
        static::deleted(function (self $proof) {
            if ($proof->stored_path && Storage::disk('public')->exists($proof->stored_path)) {
                Storage::disk('public')->delete($proof->stored_path);
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

    public function getFilePathAttribute(): ?string
    {
        return $this->stored_path;
    }
}
