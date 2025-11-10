<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use Illuminate\Support\Facades\Storage;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use  HasApiTokens, HasRoles, HasFactory, Notifiable;


    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'cin', 'rib', 'situationFamiliale', 'nbEnfants', 'adresse','name',"password", 'prenom', 'date_naissance', 'tel', 'email', 'role', 'onesignal_player_id',   'statut', 'typeContrat', 'departement_id', 'picture', 'societe_id','sex','dateEmbauche','fonction', 'date_sortie','cnss','solde_conge','salaire',   'information_supplementaire',
        'information_supplementaire2',
        // Champs entreprise / légaux
        'raison_sociale','rc','ice','identifiant_fiscale','domaine_activite','revenu_mensuel_net',
        'chiffre_affaires_dernier_ex','exercice_annee','forme_juridique','date_creation','capital_social',
        'associes','statut_juridique','regime_fiscal','date_debut_collaboration','type_mission','representant',
        'montant_total'
    ];



    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];
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

    public function societe() {
        return $this->belongsTo(Societe::class);
    }

    public function todoListsAssigned()
{
    return $this->hasMany(TodoList::class, 'assigned_to');
}

public function todoListsCreated()
{
    return $this->hasMany(TodoList::class, 'created_by');
}
    public function todoTasks()
    {
        return $this->hasMany(TodoTask::class, 'assigned_to');
    }

    /**
     * Time tracking entries for this user.
     */
    public function timeEntries()
    {
        return $this->hasMany(\App\Models\TimeEntry::class, 'user_id');
    }

    /**
     * Progress logs authored by this user.
     */
    public function taskProgressLogs()
    {
        return $this->hasMany(\App\Models\TaskProgressLog::class, 'user_id');
    }


   
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'date_creation' => 'date',
            'date_debut_collaboration' => 'date',
            'revenu_mensuel_net' => 'decimal:2',
            'chiffre_affaires_dernier_ex' => 'decimal:2',
            'capital_social' => 'decimal:2',
            'montant_total' => 'decimal:2',
        ];
    }

    /**
     * Helper to check if user is client type mission/contract.
     */
    public function getIsClientAttribute(): bool
    {
        return $this->typeContrat === 'Client';
    }


    public function userTypeDocs()
    {
        return $this->hasMany(UserTypeDoc::class);
    }

    public function typeDocs()
    {
        return $this->belongsToMany(TypeDoc::class, 'user_type_docs')
                    ->withPivot('is_provided', 'file_path')
                    ->withTimestamps();
    }

    public function salaires()
    {
        return $this->hasMany(Salaire::class);
    }

    public function salaireActuel()
    {
        return $this->hasOne(Salaire::class)->latest();
    }
}




