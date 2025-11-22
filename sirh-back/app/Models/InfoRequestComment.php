<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InfoRequestComment extends Model
{
    use HasFactory;

    protected $fillable = ['info_request_id', 'user_id', 'content', 'is_internal'];

    public function request()
    {
        return $this->belongsTo(InfoRequest::class, 'info_request_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
    
    public function attachments()
    {
        return $this->hasMany(InfoRequestAttachment::class, 'comment_id');
    }
}
