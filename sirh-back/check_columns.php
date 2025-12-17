<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Schema;

echo "Colonnes de task_progress_hours:\n";
$columns = Schema::getColumnListing('task_progress_hours');
foreach ($columns as $column) {
    echo "  - {$column}\n";
}
