<?php

namespace App\Http\Controllers;

    use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\AbsenceRequest;
class CongeController extends Controller
{

public function generateCongePdf($congeId)
{
    $conge = AbsenceRequest::with('user')->findOrFail($congeId);

    // Condition : type "congé" et statut "approuvé"
    if (strtolower($conge->type) !== 'congé' || strtolower($conge->statut) !== 'approuvé') {
        abort(403, 'PDF disponible uniquement pour les congés approuvés');
    }

    $user = $conge->user;

    $pdf = Pdf::loadView('conge_demande_pdf', [
        'user' => $user,
        'conge' => $conge,
    ])->setPaper('A4');

    return $pdf->download('demande_conge_'.$user->name.'.pdf');
}

}
