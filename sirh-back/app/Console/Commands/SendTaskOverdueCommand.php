<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Jobs\SendTaskOverdueNotifications;
use App\Services\TwilioService;

class SendTaskOverdueCommand extends Command
{
    protected $signature = 'tasks:send-overdue {taskId} {--sync}';
    protected $description = 'Envoyer une alerte de retard WhatsApp pour une tâche spécifique (test manuel)';

    public function handle(TwilioService $twilio): int
    {
        $taskId = (int) $this->argument('taskId');
        $sync = (bool) $this->option('sync');

        $this->info("📤 Envoi d'une alerte de retard pour la tâche #{$taskId}...");

        if ($sync) {
            $job = new SendTaskOverdueNotifications($taskId);
            $job->handle($twilio);
            $this->info("✅ Alerte de retard envoyée en mode sync pour la tâche #{$taskId}.");
        } else {
            SendTaskOverdueNotifications::dispatch($taskId)->onQueue('notifications');
            $this->info("✅ Alerte de retard mise en file d'attente pour la tâche #{$taskId}.");
            $this->comment('💡 Démarrez le worker: php artisan queue:work --queue=notifications');
        }

        return self::SUCCESS;
    }
}
