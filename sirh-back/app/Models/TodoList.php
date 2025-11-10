<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TodoList extends Model
{
    protected $fillable = ['title', 'created_by', 'project_id'];
    
    protected static function booted()
    {
        static::created(function ($todoList) {
            static::auditLog($todoList, 'created');
        });

        static::updated(function ($todoList) {
            static::auditLog($todoList, 'updated');
        });

        static::deleted(function ($todoList) {
            static::auditLog($todoList, 'deleted');
        });
    }
    
    protected static function auditLog($model, $event)
    {
        if (auth()->check()) {
            $user = auth()->user();
            $oldValues = $event !== 'created' ? $model->getOriginal() : null;
            $newValues = $event !== 'deleted' ? $model->getAttributes() : null;
            
            Audit::create([
                'user_id' => $user->id,
                'auditable_type' => get_class($model),
                'auditable_id' => $model->id,
                'event' => $event,
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'url' => request()->fullUrl(),
                'ip_address' => request()->ip(),
            ]);
        }
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function tasks()
    {
        return $this->hasMany(TodoTask::class);
    }
}
