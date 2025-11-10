<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AbsenceRequestDocument extends Model
{
    use HasFactory;

    protected $table = 'absence_request_documents';

    protected $fillable = [
        'absence_request_id',
        'path',
        'original_name',
        'mime_type',
        'size',
    ];

    public function absenceRequest()
    {
        return $this->belongsTo(AbsenceRequest::class, 'absence_request_id');
    }
}
