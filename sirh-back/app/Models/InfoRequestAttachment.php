<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InfoRequestAttachment extends Model
{
    use HasFactory;

    protected $fillable = ['info_request_id', 'comment_id', 'file_path', 'file_name', 'file_type', 'file_size'];

    public function request()
    {
        return $this->belongsTo(InfoRequest::class, 'info_request_id');
    }

    public function comment()
    {
        return $this->belongsTo(InfoRequestComment::class, 'comment_id');
    }
}
