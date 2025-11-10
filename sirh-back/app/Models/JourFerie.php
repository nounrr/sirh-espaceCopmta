<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JourFerie extends Model
{
    protected $table = 'jours_feries';
    
    protected $fillable = [
        'date',
        'nom',
        'description',
        'actif'
    ];
    
    protected $casts = [
        'date' => 'date',
        'actif' => 'boolean'
    ];
}
