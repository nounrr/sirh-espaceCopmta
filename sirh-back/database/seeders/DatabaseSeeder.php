<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
        TypeDocSeeder::class

            // RolePermissionSeeder::class,
            // SocieteSeeder::class,
            // DepartementSeeder::class,
            // EmployeSeeder::class,
            // AbsenceRequestSeeder::class,
            // PointageSeeder::class,
        ]);

}
}