<?php

namespace App\Exports;

use App\Models\User;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class UsersExport implements FromCollection,WithHeadings
{
    /**
    * @return \Illuminate\Support\Collection
    */
    public function collection()
    {
        return User::with('departement')
            ->get()
            ->map(function ($e) {
                return [
                    'cin'=> $e->cin,
                    'nom' => $e->name,
                    'prenom' => $e->prenom,
                    'sex' => $e->sex,
                    'rib'=> $e->rib,
                    'email' => $e->email,
                    'password' => $e->password,
                    'picture' => $e->picture,
                    'telephone' => $e->tel,
                    'adresse' => $e->adresse,
                    'dateNaissance' => $e->date_naissance,
                    'situationFamiliale' => $e->situationFamiliale,
                    'nbreEnfants' => $e->nbEnfants,
                    'departement' => optional($e->departement)->nom,
                    'role' => $e->role,
                    'statut' => $e->statut,
                    'typeContrat' => $e->typeContrat,
                    'fonction' => $e->fonction,
                    'dateEmbauche' => $e->dateEmbauche,
                ];
            });
    }

    public function headings(): array
    {
        return ["Carte Nationale d'identité",'Nom', 'Prénom','Sexe','RIB bancaire', 'Email','Mot de Passe','Photo de Profil','Télephone','Adresse','Date de Naissance','Situation Familiale','Nombre des Enfants', 'Département', 'Rôle', 'Statut', 'Type Contrat', 'Fonction', 'Date d\'Embauche'];
    }

}
