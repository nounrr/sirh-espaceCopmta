<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChargePersonnel extends Model
{
    use HasFactory;

    protected $table = 'charge_personnels';

    protected $fillable = [
        'societe_id',
        'mois',
        'salaire_permanent',
        'charge_salaire_permanent',
        'salaire_temporaire',
        'charge_salaire_temp',
        'autres_charge',
    ];

    protected $casts = [
        'mois' => 'date:Y-m-d',
        'salaire_permanent' => 'decimal:2',
        'charge_salaire_permanent' => 'decimal:2',
        'salaire_temporaire' => 'decimal:2',
        'charge_salaire_temp' => 'decimal:2',
        'autres_charge' => 'decimal:2',
    ];
}
