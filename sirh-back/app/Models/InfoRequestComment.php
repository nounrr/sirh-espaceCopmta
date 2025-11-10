<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InfoRequestComment extends Model
{
    protected $fillable = ['info_request_id','user_id','content'];

    public function request() { return $this->belongsTo(InfoRequest::class, 'info_request_id'); }
    public function user() { return $this->belongsTo(User::class, 'user_id'); }
}
