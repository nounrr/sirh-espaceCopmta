<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PublicationTarget extends Model
{
    use HasFactory;

    protected $fillable = [
        'publication_id',
        'user_id',
        'departement_id',
        'role',
        'typeContrat',
        'societe_id',
    ];

    public function publication()
    {
        return $this->belongsTo(Publication::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function departement()
    {
        return $this->belongsTo(Departement::class);
    }
}
