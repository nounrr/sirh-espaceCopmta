<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Salaire extends Model
{
    protected $fillable = [
        'user_id',
        'salaire_base',
        'panier',
        'represent',
        'transport',
        'deplacement',
        'salaire_net'
    ];

    protected $casts = [
        'salaire_base' => 'decimal:2',
        'panier' => 'decimal:2',
        'represent' => 'decimal:2',
        'transport' => 'decimal:2',
        'deplacement' => 'decimal:2',
        'salaire_net' => 'decimal:2'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Calculer le salaire total
     */
    public function getSalaireTotalAttribute()
    {
        return $this->salaire_base + $this->panier + $this->represent + $this->transport + $this->deplacement;
    }

    /**
     * Calculer les indemnités totales (hors salaire base)
     */
    public function getIndemnitesTotalesAttribute()
    {
        return $this->panier + $this->represent + $this->transport + $this->deplacement;
    }
}