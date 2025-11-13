<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use App\Models\TodoTaskProof;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\TaskProgressHour;

/**
 * @property-read \Illuminate\Database\Eloquent\Collection<int, User> $assignees
 */

class TodoTask extends Model
{
    protected $fillable = ['todo_list_id', 'description', 'status', 'start_date', 'end_date', 'assigned_to', 'pourcentage', 'type', 'origine', 'client_id', 'priority'];

    protected $with = ['comments', 'attachments', 'assignees', 'cancellationRequests', 'proofs'];

    protected $appends = ['source'];
    
    protected static function booted()
    {
        static::created(function ($todoTask) {
            static::auditLog($todoTask, 'created');
            $sync = (bool) config('twilio.sync_on_task_events', false);
            if ($sync) {
                $taskId = $todoTask->id;
                DB::afterCommit(function () use ($taskId) {
                    \App\Jobs\SendTaskAssignedNotifications::dispatchSync($taskId);
                });
            } else {
                \App\Jobs\SendTaskAssignedNotifications::dispatch($todoTask->id)->afterCommit();
            }
        });

        static::updated(function ($todoTask) {
            static::auditLog($todoTask, 'updated');
            
            // Check for status change to "Annulé"
            if ($todoTask->wasChanged('status')) {
                $newStatus = $todoTask->status;
                $oldStatus = $todoTask->getOriginal('status');
                
                $normalizedNewStatus = static::normalizeStatus($newStatus);
                $normalizedOldStatus = $oldStatus ? static::normalizeStatus($oldStatus) : '';
                
                if ($normalizedNewStatus === 'annule' && $normalizedOldStatus !== 'annule') {
                    Log::info("Task #{$todoTask->id} status changed to Annulé in model observer - sending cancellation notifications", [
                        'old_status' => $oldStatus,
                        'new_status' => $newStatus,
                    ]);
                    
                    $sync = (bool) config('twilio.sync_on_task_events', false);
                    $taskId = $todoTask->id;
                    
                    if ($sync) {
                        DB::afterCommit(function () use ($taskId) {
                            \App\Jobs\SendTaskCancelledNotifications::dispatchSync($taskId);
                        });
                    } else {
                        \App\Jobs\SendTaskCancelledNotifications::dispatch($taskId)->afterCommit();
                    }
                }
            }
            
            // Notifications on update are dispatched by the controller
            // where we can accurately detect new assignees and primary changes.
            if ($todoTask->wasChanged('pourcentage') || $todoTask->wasChanged('status')) {
                $status = strtolower((string)$todoTask->status);
                if ($status === 'terminée' || $status === 'terminee' || (is_numeric($todoTask->pourcentage) && (int)$todoTask->pourcentage >= 100)) {
                    $sync = (bool) config('twilio.sync_on_task_events', false);
                    if ($sync) {
                        $taskId = $todoTask->id;
                        DB::afterCommit(function () use ($taskId) {
                            \App\Jobs\SendTaskCompletedNotifications::dispatchSync($taskId);
                        });
                    } else {
                        \App\Jobs\SendTaskCompletedNotifications::dispatch($todoTask->id)->afterCommit();
                    }
                }
            }
        });

        static::deleted(function ($todoTask) {
            static::auditLog($todoTask, 'deleted');

            $todoTask->assignees()->detach();
            $todoTask->attachments()->each(function ($attachment) {
                $attachment->delete();
            });
            $todoTask->proofs()->each(function ($proof) {
                $proof->delete();
            });
        });
    }
    
    protected static function auditLog($model, $event)
    {
        if (Auth::check()) {
            $user = Auth::user();
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

    public function list()
    {
        return $this->belongsTo(TodoList::class, 'todo_list_id');
    }

    public function comments()
    {
        return $this->hasMany(TaskComment::class, 'todo_task_id')->orderBy('created_at', 'desc');
    }

    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function client()
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function assignees()
    {
        return $this->belongsToMany(User::class, 'todo_task_user')->withTimestamps();
    }

    public function attachments()
    {
        return $this->hasMany(TodoTaskAttachment::class, 'todo_task_id')->orderBy('created_at', 'desc');
    }

    public function proofs()
    {
        return $this->hasMany(TodoTaskProof::class, 'todo_task_id')
            ->orderBy('created_at', 'desc')
            ->with(['uploader:id,name,prenom']);
    }

    public function progressHours()
    {
        return $this->hasMany(TaskProgressHour::class, 'task_id')->orderBy('start_datetime', 'desc');
    }

    public function cancellationRequests()
    {
        return $this->hasMany(TodoTaskCancellationRequest::class, 'todo_task_id')
            ->orderBy('created_at', 'desc')
            ->with(['requester:id,name,prenom']);
    }

    public function getSourceAttribute()
    {
        return $this->origine;
    }

    private static function normalizeStatus(string $status): string
    {
        $normalized = trim($status);
        
        // Convertir en minuscules
        if (function_exists('mb_strtolower')) {
            $normalized = mb_strtolower($normalized, 'UTF-8');
        } else {
            $normalized = strtolower($normalized);
        }
        
        // Remplacer les caractères accentués
        $normalized = str_replace(['é', 'è', 'ê', 'ë'], 'e', $normalized);
        $normalized = str_replace(['à', 'á', 'â', 'ã', 'ä'], 'a', $normalized);
        $normalized = str_replace(['ù', 'ú', 'û', 'ü'], 'u', $normalized);
        $normalized = str_replace(['ç'], 'c', $normalized);
        
        return $normalized;
    }
}
