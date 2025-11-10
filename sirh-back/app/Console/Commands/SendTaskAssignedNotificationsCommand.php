<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Jobs\SendTaskAssignedNotifications;
use App\Services\TwilioService;

class SendTaskAssignedNotificationsCommand extends Command
{
    protected $signature = 'tasks:notify-assignees {taskId} {--sync}';
    protected $description = 'Envoyer des notifications WhatsApp aux assignés d\'une tâche (par ID). --sync pour exécuter immédiatement sans worker.';

    public function handle(TwilioService $twilio): int
    {
        $taskId = (int) $this->argument('taskId');
        $sync = (bool) $this->option('sync');

        if ($sync) {
            // Exécuter sans passer par le worker de queue
            $job = new SendTaskAssignedNotifications($taskId);
            $job->handle($twilio);
            $this->info("Notifications envoyées en mode sync pour la tâche #{$taskId}.");
            return self::SUCCESS;
        }

        SendTaskAssignedNotifications::dispatch($taskId)->onQueue('notifications');
        $this->info("Job dispatché pour la tâche #{$taskId} (queue: notifications).");
        $this->line('Démarre un worker: php artisan queue:work --queue=notifications');
        return self::SUCCESS;
    }
}
