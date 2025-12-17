<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Create the role if it doesn't exist
        if (!Role::where('name', 'Resp_Com')->exists()) {
            Role::create(['name' => 'Resp_Com', 'guard_name' => 'web']);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Optional: delete the role
        // Role::where('name', 'Resp_Com')->delete();
    }
};
