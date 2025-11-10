<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Societe; // Assurez-vous que le namespace est correct pour Societe
use OwenIt\Auditing\Contracts\Auditable as AuditableContract;
use OwenIt\Auditing\Auditable;

class Pointage extends Model implements AuditableContract
{
    use Auditable;
    protected $fillable = ['user_id', 'departement_id', 'fonction', 'date', 'heureEntree', 'heureSortie', 'statutJour', 'overtimeHours', 'societe_id', 'valider'];

    /**
     * Attributes to include in audit regardless of changes
     */
    protected $auditInclude = [
        'user_id',
    'departement_id',
    'fonction',
    'date',
        'heureEntree',
        'heureSortie',
        'statutJour',
        'societe_id',
        'valider'
    ];

    /**
     * Transform audit data to always include all important fields
     */
    public function transformAudit(array $data): array
    {
        // Fields to always include in audit
        $alwaysInclude = [
            'user_id',
            'date',
            'heureEntree',
            'heureSortie',
            'statutJour',
            'societe_id',
            'valider'
        ];

        // Add all fields to old_values if not present
        foreach ($alwaysInclude as $field) {
            if (!isset($data['old_values'][$field])) {
                $data['old_values'][$field] = $this->getOriginal($field);
            }
        }

        // Add all fields to new_values if not present
        foreach ($alwaysInclude as $field) {
            if (!isset($data['new_values'][$field])) {
                $data['new_values'][$field] = $this->getAttribute($field);
            }
        }

        return $data;
    }

    public function user() {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the societe that owns the pointage.
     */
    public function societe(): BelongsTo
    {
        return $this->belongsTo(Societe::class);
    }
}
