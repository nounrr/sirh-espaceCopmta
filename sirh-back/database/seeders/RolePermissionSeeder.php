<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolePermissionSeeder extends Seeder
{
    public function run()
    {
        $rolesPermissions = [
            'Employe' => [
                'demande absence',
                'view profile',
            ],
            'Chef_Dep' => [
                'view team absences',
                'validate absence',
                'create absence',
                'reject absence',
            ],
            'Chef_Chant' => [
                'view team absences',
                'validate absence',
                'create absence',
                'reject absence',
            ],
            'Chef_Projet' => [
                'view project absences',
                'validate project absence',
                'create project absence',
                'reject project absence',
                'manage project reports',
            ],
            'Gest_RH' => [
                'view all absences',
                'export excel',
                'assign roles',
                'edit absence',
                'generate reports',
            ],
            'Gest_Projet' => [
                'view project absences',
                'manage project reports',
                'create project absence',
            ],
            'RH' => [
                'view all absences',
                'export excel',
                'manage users',
                'assign roles',
                'edit absence',
                'delete absence',
                'generate reports',
                'view project absences',
            ],
        ];

        // Créer toutes les permissions
        $allPermissions = collect($rolesPermissions)->flatten()->unique();

        foreach ($allPermissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // Créer les rôles et associer les permissions
        foreach ($rolesPermissions as $role => $permissions) {
            $roleModel = Role::firstOrCreate(['name' => $role]);
            $roleModel->syncPermissions($permissions);
        }
    }
}
