<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use Illuminate\Support\Facades\Storage;

class Employe extends Model
{
    protected $fillable = [
        'cin', 'rib', 'situationFamiliale', 'nbEnfants', 'adresse', 'salaire',
        'nom', 'prenom', 'date_naissance', 'tel', 'email', 'role',

        'statut', 'typeContrat', 'departement_id', 'picture'
    ];
    
    /**
     * Get the profile picture URL.
     *
     * @return string|null
     */
    public function getProfilePictureUrlAttribute()
    {
        if ($this->profile_picture) {
            return Storage::url('profile_picture/' . $this->profile_picture);
        }
        return null;
    }
    
    public function departement() {
        return $this->belongsTo(Departement::class);
    }
    public function pointages() {
        return $this->hasMany(Pointage::class);
    }

    public function absenceRequests() {
        return $this->hasMany(AbsenceRequest::class);
    }

    public function salaires()
    {
        return $this->hasMany(Salaire::class, 'user_id');
    }

    public function salaireActuel()
    {
        return $this->hasOne(Salaire::class, 'user_id')->latest();
    }
}
