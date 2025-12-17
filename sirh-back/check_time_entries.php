<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== Time Entries pour tâche 65 ===\n\n";
$entries = DB::table('time_entries')
    ->where('todo_task_id', 65)
    ->orderByDesc('id')
    ->limit(5)
    ->get(['id', 'todo_task_id', 'user_id', 'started_at', 'ended_at', 'duration_minutes', 'created_at']);

foreach ($entries as $entry) {
    echo "ID: {$entry->id}\n";
    echo "  User: {$entry->user_id}\n";
    echo "  Started: {$entry->started_at}\n";
    echo "  Ended: " . ($entry->ended_at ?? 'NULL (en cours)') . "\n";
    echo "  Duration: " . ($entry->duration_minutes ?? 'NULL') . " min\n";
    echo "  Created: {$entry->created_at}\n";
    echo "\n";
}

echo "\n=== Task Progress Hours pour tâche 65 ===\n\n";
$hours = DB::table('task_progress_hours')
    ->where('task_id', 65)
    ->orderByDesc('id')
    ->limit(5)
    ->get(['id', 'task_id', 'user_id', 'start_datetime', 'end_datetime', 'created_at', 'updated_at']);

if ($hours->isEmpty()) {
    echo "Aucune entrée trouvée.\n";
} else {
    foreach ($hours as $hour) {
        echo "ID: {$hour->id}\n";
        echo "  User: {$hour->user_id}\n";
        echo "  Start: {$hour->start_datetime}\n";
        echo "  End: {$hour->end_datetime}\n";
        echo "  Created: {$hour->created_at}\n";
        echo "  Updated: {$hour->updated_at}\n";
        echo "\n";
    }
}
