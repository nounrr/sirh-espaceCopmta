<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Jobs\SendTaskReminderNotifications;
use App\Services\TwilioService;

class SendBulkTaskRemindersCommand extends Command
{
    protected $signature = 'tasks:send-bulk-reminders {taskIds*} {--sync}';
    protected $description = 'Envoyer des rappels WhatsApp pour plusieurs tâches';

    public function handle(TwilioService $twilio): int
    {
        $taskIds = $this->argument('taskIds');
        $sync = (bool) $this->option('sync');

        $this->info("📤 Envoi de rappels pour " . count($taskIds) . " tâche(s)...");

        $success = 0;
        $failed = 0;

        foreach ($taskIds as $taskId) {
            try {
                if ($sync) {
                    $job = new SendTaskReminderNotifications((int) $taskId);
                    $job->handle($twilio);
                } else {
                    SendTaskReminderNotifications::dispatch((int) $taskId)->onQueue('notifications');
                }
                $this->line("  ✅ Tâche #{$taskId}");
                $success++;
            } catch (\Exception $e) {
                $this->error("  ❌ Tâche #{$taskId}: " . $e->getMessage());
                $failed++;
            }
        }

        $this->newLine();
        $this->info("📊 Résumé:");
        $this->line("  • Succès: {$success}");
        $this->line("  • Échecs: {$failed}");

        if (!$sync) {
            $this->newLine();
            $this->comment('💡 Démarrez le worker: php artisan queue:work --queue=notifications');
        }

        return self::SUCCESS;
    }
}
