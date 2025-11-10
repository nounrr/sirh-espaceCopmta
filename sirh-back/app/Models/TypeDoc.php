<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TypeDoc extends Model
{
    use HasFactory;

    protected $fillable = ['nom', 'type_contrat'];
}