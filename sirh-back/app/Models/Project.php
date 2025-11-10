<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'titre',
        'description',
        'date_debut',
        'date_fin_prevu',
        'date_fin_reel',
        'pourcentage_progression',
    ];
    
    protected static function booted()
    {
        static::created(function ($project) {
            static::auditLog($project, 'created');
        });

        static::updated(function ($project) {
            static::auditLog($project, 'updated');
        });

        static::deleted(function ($project) {
            static::auditLog($project, 'deleted');
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

    public function todoLists()
    {
        return $this->hasMany(TodoList::class);
    }
}
