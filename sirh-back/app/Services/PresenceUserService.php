<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PresenceUserService
{
    /**
     * Détermine si un utilisateur est permanent selon son type de contrat.
     */
    private function isPermanent($user): bool
    {
        $type = strtolower(trim((string)($user->typeContrat ?? '')));
        // Aligner exactement avec la logique du contrôleur historique (pas de CDD)
        return in_array($type, ['permanent','permanente','cdi','indéterminée','indeterminee'], true);
    }

    /**
     * Prépare les collections d'utilisateurs pour les exports de présence/salaires.
     * Retourne: all, permanent, temporary, inactive
     * 
     * @param int $societeId ID de la société
     * @param array $excludedUserIds IDs des utilisateurs à exclure
     * @param int|null $departementId Filtre optionnel par département
     * @param int|null $userId Filtre optionnel par utilisateur spécifique
     */
    public function getPresenceUserCollections(int $societeId, array $excludedUserIds = [], ?int $departementId = null, ?int $userId = null): array
    {
        $users = DB::table('users')
            ->leftJoin('departements', 'users.departement_id', '=', 'departements.id')
            ->where('users.societe_id', $societeId)
            ->when(!empty($excludedUserIds), function($q) use ($excludedUserIds){
                $q->whereNotIn('users.id', $excludedUserIds);
            })
            ->when($departementId, function($q) use ($departementId) {
                $q->where('users.departement_id', $departementId);
            })
            ->when($userId, function($q) use ($userId) {
                $q->where('users.id', $userId);
            })
            ->select('users.*', 'departements.nom as departement_nom')
            ->get();

        $inactiveUsers = $users->filter(function($u) {
            return strtolower(trim((string)($u->statut ?? ''))) === 'inactif';
        });

        if ($inactiveUsers->count() > 0) {
            Log::info('Utilisateurs inactifs trouvés', [
                'count_total_inactifs' => $inactiveUsers->count(),
                'inactifs' => $inactiveUsers->map(function($u) {
                    return [
                        'id' => $u->id,
                        'name' => $u->name ?? 'N/A',
                        'statut' => $u->statut ?? 'N/A',
                        'typeContrat' => $u->typeContrat ?? 'N/A',
                        'isPermanent' => $this->isPermanent($u)
                    ];
                })->toArray()
            ]);
        }

        $permanentUsers = $users->filter(fn($u) => $this->isPermanent($u));
        $temporaryUsers = $users->filter(fn($u) => !$this->isPermanent($u));

        Log::info('Répartition des utilisateurs', [
            'societe_id' => $societeId,
            'total_users' => $users->count(),
            'permanent_users' => $permanentUsers->count(),
            'temporary_users' => $temporaryUsers->count(),
            'inactive_users' => $inactiveUsers->count()
        ]);

        return [
            'all' => $users,
            'permanent' => $permanentUsers,
            'temporary' => $temporaryUsers,
            'inactive' => $inactiveUsers,
        ];
    }
}
