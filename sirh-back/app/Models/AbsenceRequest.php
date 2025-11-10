<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AbsenceRequest extends Model
{
    use HasFactory;

    protected $table = 'absence_requests';

    protected $fillable = [
        'user_id',
        'client_id',
        'type',
        'dateDebut',
        'dateFin',
        'motif',
        'statut',
        'justification',
    ];

    protected $casts = [
        'dateDebut' => 'date',
        'dateFin'   => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function client()
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function documents()
    {
        return $this->hasMany(AbsenceRequestDocument::class, 'absence_request_id');
    }
}
