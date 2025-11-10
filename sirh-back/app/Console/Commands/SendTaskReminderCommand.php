<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Jobs\SendTaskReminderNotifications;
use App\Services\TwilioService;

class SendTaskReminderCommand extends Command
{
    protected $signature = 'tasks:send-reminder {taskId} {--sync}';
    protected $description = 'Envoyer un rappel WhatsApp pour une tâche spécifique (test manuel)';

    public function handle(TwilioService $twilio): int
    {
        $taskId = (int) $this->argument('taskId');
        $sync = (bool) $this->option('sync');

        $this->info("📤 Envoi d'un rappel pour la tâche #{$taskId}...");

        if ($sync) {
            $job = new SendTaskReminderNotifications($taskId);
            $job->handle($twilio);
            $this->info("✅ Rappel envoyé en mode sync pour la tâche #{$taskId}.");
        } else {
            SendTaskReminderNotifications::dispatch($taskId)->onQueue('notifications');
            $this->info("✅ Rappel mis en file d'attente pour la tâche #{$taskId}.");
            $this->comment('💡 Démarrez le worker: php artisan queue:work --queue=notifications');
        }

        return self::SUCCESS;
    }
}
