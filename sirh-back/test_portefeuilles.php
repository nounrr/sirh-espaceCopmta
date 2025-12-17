<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== Testing Portefeuilles ===\n\n";

$clients = App\Models\User::where('typeContrat', 'Client')->get();
echo "Total clients: " . $clients->count() . "\n\n";

echo "All clients:\n";
foreach ($clients as $client) {
    echo "  ID: {$client->id}, Name: {$client->name}, Porfeuille: " . ($client->porfeuille ?? '(null)') . "\n";
}

echo "\n";

$portefeuilles = App\Models\User::query()
    ->where('typeContrat', 'Client')
    ->whereNotNull('porfeuille')
    ->where('porfeuille', '<>', '')
    ->distinct()
    ->orderBy('porfeuille')
    ->pluck('porfeuille')
    ->values();

echo "Distinct portefeuilles:\n";
echo json_encode($portefeuilles, JSON_PRETTY_PRINT) . "\n";
