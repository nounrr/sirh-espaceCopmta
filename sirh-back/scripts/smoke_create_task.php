<?php
// Simple smoke test to create a TodoTask with task_kind and optional recurrence

use Illuminate\Contracts\Console\Kernel;

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';

$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

try {
    // Find any existing todo list to attach the task to
    $todoList = \App\Models\TodoList::query()->first();
    if (!$todoList) {
        fwrite(STDERR, "No todo list found. Please create one first.\n");
        exit(2);
    }

    // Create ponctuelle task
    $task = \App\Models\TodoTask::create([
        'todo_list_id' => $todoList->id,
        'description' => 'Smoke task ponctuelle '.date('Y-m-d H:i:s'),
        'status' => 'En attente',
        'type' => 'AC',
        'task_kind' => 'ponctuelle',
    ]);

    // Create continues + recurring task
    $task2 = \App\Models\TodoTask::create([
        'todo_list_id' => $todoList->id,
        'description' => 'Smoke task continues '.date('Y-m-d H:i:s'),
        'status' => 'En attente',
        'type' => 'AC',
        'task_kind' => 'continues',
        'is_recurring' => true,
        'recurrence' => 'monthly',
        'period_start' => now()->toDateString(),
        'period_end' => now()->copy()->addMonth()->toDateString(),
    ]);

    $task->refresh();
    $task2->refresh();

    $out = [
        'ponctuelle' => $task->only(['id','todo_list_id','task_kind','is_recurring','recurrence','period_start','period_end']),
        'continues' => $task2->only(['id','todo_list_id','task_kind','is_recurring','recurrence','period_start','period_end']),
    ];

    echo json_encode($out, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE)."\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, "Smoke test failed: ".$e->getMessage()."\n");
    exit(1);
}
