<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InfoRequestReminder extends Model
{
    protected $fillable = ['info_request_id','sent_by','sent_at','note'];

    protected $casts = [
        'sent_at' => 'datetime',
    ];

    public function request() { return $this->belongsTo(InfoRequest::class, 'info_request_id'); }
    public function sender() { return $this->belongsTo(User::class, 'sent_by'); }
}
