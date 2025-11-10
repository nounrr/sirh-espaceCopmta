<?php

namespace App\Exports;

use App\Models\AbsenceRequest;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class AbsenceRequestsExport implements FromCollection,WithHeadings
{
    /**
    * @return \Illuminate\Support\Collection
    */
    public function collection()
    {
        return AbsenceRequest::with('user')
            ->get()
            ->map(function ($item) {
                $nom = $item->user->name ?? '';
                $prenom = $item->user->prenom ?? '';
                $nomComplet = trim("$prenom $nom");
                return [
                    'Nom Complet Employé' => $nomComplet ,
                    'Type' => $item->type,
                    'Date Début' => $item->dateDebut,
                    'Date Fin' => $item->dateFin,
                    'Motif' => $item->motif,
                    'Statut' => $item->statut,
                    'Justification' => $item->justification,
                ];
            });
    }

    public function headings(): array
    {
        return ['Nom Complet Employé', 'Type absence', 'Date Début', 'Date Fin', 'Motif', 'Statut', 'Justification URL'];
    }
}
