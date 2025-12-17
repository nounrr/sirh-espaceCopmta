<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Simulate the controller method
$portefeuilles = App\Models\User::query()
    ->where('typeContrat', 'Client')
    ->whereNotNull('porfeuille')
    ->where('porfeuille', '<>', '')
    ->distinct()
    ->orderBy('porfeuille')
    ->pluck('porfeuille')
    ->values();

echo "Query result:\n";
var_dump($portefeuilles->toArray());
echo "\n";

echo "JSON encoded:\n";
echo json_encode($portefeuilles);
echo "\n";
