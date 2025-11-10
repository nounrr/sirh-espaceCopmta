<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Jobs\SendTaskCancelledNotifications;
use App\Services\TwilioService;

class SendTaskCancelledNotificationsCommand extends Command
{
    protected $signature = 'tasks:notify-cancelled {taskId} {--sync}';
    protected $description = 'Envoyer des notifications WhatsApp d\'annulation pour une tâche (par ID). --sync pour exécuter immédiatement sans worker.';

    public function handle(TwilioService $twilio): int
    {
        $taskId = (int) $this->argument('taskId');
        $sync = (bool) $this->option('sync');

        if ($sync) {
            // Exécuter sans passer par le worker de queue
            $job = new SendTaskCancelledNotifications($taskId);
            $job->handle($twilio);
            $this->info("Notifications d'annulation envoyées en mode sync pour la tâche #{$taskId}.");
            return self::SUCCESS;
        }

        SendTaskCancelledNotifications::dispatch($taskId);
        $this->info("Job dispatché pour la tâche #{$taskId} (queue).");
        $this->line('Démarre un worker: php artisan queue:work');
        return self::SUCCESS;
    }
}
