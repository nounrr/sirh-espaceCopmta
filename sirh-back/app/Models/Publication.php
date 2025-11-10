<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Publication extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',         // 'sondage' ou 'news'
        'titre',
        'texte',
        'created_by',
        'statut'
    ];

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function targets()
    {
        return $this->hasMany(PublicationTarget::class);
    }

    public function questions()
    {
        return $this->hasMany(Question::class);
    }
}
