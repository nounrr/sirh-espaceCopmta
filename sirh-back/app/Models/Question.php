<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Question extends Model
{
    use HasFactory;

    protected $fillable = [
        'publication_id',
        'question'
    ];

    public function publication()
    {
        return $this->belongsTo(Publication::class);
    }

    public function answers()
    {
        return $this->hasMany(Answer::class);
    }
}
