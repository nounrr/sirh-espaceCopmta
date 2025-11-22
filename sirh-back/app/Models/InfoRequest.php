<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class InfoRequest extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title',
        'description',
        'status', // 'open', 'pending_client', 'answered', 'closed'
        'priority', // 'low', 'medium', 'high'
        'client_id', // User (Client)
        'assigned_to', // User (Collaborator)
        'due_date'
    ];

    protected $casts = [
        'due_date' => 'date',
    ];

    protected $with = ['client', 'assignee', 'latestComment'];

    public function client()
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function comments()
    {
        return $this->hasMany(InfoRequestComment::class)->orderBy('created_at', 'asc');
    }

    public function attachments()
    {
        return $this->hasMany(InfoRequestAttachment::class);
    }

    public function latestComment()
    {
        return $this->hasOne(InfoRequestComment::class)->latestOfMany();
    }
}
