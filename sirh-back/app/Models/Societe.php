<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Pointage; // Assurez-vous que le namespace est correct pour Pointage

class Societe extends Model
{
    use HasFactory;

    protected $fillable = ['nom'];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get the pointages for the societe.
     */
    public function pointages(): HasMany
    {
        return $this->hasMany(Pointage::class);
    }
}