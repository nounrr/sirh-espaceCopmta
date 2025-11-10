<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Vérification des numéros de téléphone ===\n\n";

$totalUsers = \App\Models\User::count();
$usersWithPhone = \App\Models\User::whereNotNull('tel')->where('tel', '!=', '')->count();

echo "Total utilisateurs: {$totalUsers}\n";
echo "Utilisateurs avec téléphone: {$usersWithPhone}\n\n";

echo "Exemples d'utilisateurs:\n";
echo str_repeat('-', 80) . "\n";

$users = \App\Models\User::select('id', 'name', 'tel')->take(10)->get();
foreach ($users as $user) {
    $phone = $user->tel ?? 'AUCUN';
    echo sprintf("ID: %-5s | Nom: %-30s | Tél: %s\n", $user->id, $user->name, $phone);
}

echo "\n" . str_repeat('-', 80) . "\n";

// Vérifier les assignés des tâches récentes
echo "\nVérification des tâches et leurs assignés:\n";
echo str_repeat('-', 80) . "\n";

$tasks = \App\Models\TodoTask::with(['assignees', 'assignedUser'])
    ->select('id', 'description', 'assigned_to')
    ->take(5)
    ->get();

foreach ($tasks as $task) {
    echo "\nTâche #{$task->id}: " . substr($task->description, 0, 50) . "...\n";
    
    // Assigné principal
    if ($task->assignedUser) {
        $phone = $task->assignedUser->tel ?? 'AUCUN';
        echo "  - Assigné principal: {$task->assignedUser->name} (ID: {$task->assignedUser->id}) - Tél: {$phone}\n";
    }
    
    // Assignés multiples
    if ($task->assignees && $task->assignees->isNotEmpty()) {
        echo "  - Assignés multiples:\n";
        foreach ($task->assignees as $assignee) {
            $phone = $assignee->tel ?? 'AUCUN';
            echo "    * {$assignee->name} (ID: {$assignee->id}) - Tél: {$phone}\n";
        }
    }
    
    if (!$task->assignedUser && (!$task->assignees || $task->assignees->isEmpty())) {
        echo "  - ❌ AUCUN ASSIGNÉ\n";
    }
}

echo "\n" . str_repeat('=', 80) . "\n";
echo "\n✅ Vérification terminée!\n";

if ($usersWithPhone === 0) {
    echo "\n⚠️  ATTENTION: Aucun utilisateur n'a de numéro de téléphone!\n";
    echo "   → Vous devez ajouter des numéros de téléphone dans la table 'users'\n";
    echo "   → Colonne: 'phone'\n";
    echo "   → Format recommandé: +212XXXXXXXXX (avec indicatif pays)\n";
}
