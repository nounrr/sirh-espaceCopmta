<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserTypeDoc extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'type_doc_id',
        'is_provided',
        'file_path'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function typeDoc()
    {
        return $this->belongsTo(TypeDoc::class);
    }
}