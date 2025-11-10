<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InfoRequestAttachment extends Model
{
    protected $fillable = ['info_request_id','uploaded_by','original_name','stored_path','mime_type','size'];

    public function request() { return $this->belongsTo(InfoRequest::class, 'info_request_id'); }
    public function uploader() { return $this->belongsTo(User::class, 'uploaded_by'); }
}
