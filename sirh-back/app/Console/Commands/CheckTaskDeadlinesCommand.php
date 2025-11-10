<?php

namespace App\Console\Commands;

use App\Models\TodoTask;
use App\Jobs\SendTaskReminderNotifications;
use App\Jobs\SendTaskOverdueNotifications;
use Illuminate\Console\Command;
use Carbon\Carbon;

class CheckTaskDeadlinesCommand extends Command
{
    protected $signature = 'tasks:check-deadlines {--sync}';
    protected $description = 'Vérifie les tâches et envoie des rappels (2 jours avant échéance) et alertes (tâches en retard)';

    public function handle(): int
    {
        $sync = (bool) $this->option('sync');
        $syncOnTaskEvents = config('twilio.sync_on_task_events', false);

        $this->info('🔍 Vérification des échéances de tâches...');
        $this->newLine();

        $now = Carbon::now();
        $reminderDate = $now->copy()->addDays(2)->startOfDay();

        // 1. Tâches à rappeler (il reste 2 jours ET pas terminées)
        $this->info('📅 Recherche des tâches à rappeler (2 jours avant échéance)...');
        
        $tasksToRemind = TodoTask::whereNotNull('end_date')
            ->whereDate('end_date', '=', $reminderDate->format('Y-m-d'))
            ->where(function ($query) {
                $query->where('pourcentage', '<', 100)
                      ->orWhere(function ($q) {
                          $q->where('status', '!=', 'Terminée')
                            ->where('status', '!=', 'terminée')
                            ->where('status', '!=', 'Annulé')
                            ->where('status', '!=', 'annulé');
                      });
            })
            ->get();

        $reminderCount = 0;
        foreach ($tasksToRemind as $task) {
            $this->line("  ⏰ Tâche #{$task->id}: {$task->description} (échéance: " . Carbon::parse($task->end_date)->format('d/m/Y') . ")");
            
            if ($sync || $syncOnTaskEvents) {
                $job = new SendTaskReminderNotifications($task->id);
                $job->handle(app(\App\Services\TwilioService::class));
            } else {
                SendTaskReminderNotifications::dispatch($task->id)->onQueue('notifications');
            }
            
            $reminderCount++;
        }

        $this->newLine();
        $this->info("✅ {$reminderCount} rappel(s) de tâche envoyé(s)");
        $this->newLine();

        // 2. Tâches en retard (date dépassée ET progression < 100%)
        $this->info('🚨 Recherche des tâches en retard...');
        
        $tasksOverdue = TodoTask::whereNotNull('end_date')
            ->whereDate('end_date', '<', $now->format('Y-m-d'))
            ->where('pourcentage', '<', 100)
            ->where(function ($query) {
                $query->where('status', '!=', 'Terminée')
                      ->where('status', '!=', 'terminée')
                      ->where('status', '!=', 'Annulé')
                      ->where('status', '!=', 'annulé');
            })
            ->get();

        $overdueCount = 0;
        foreach ($tasksOverdue as $task) {
            $daysOverdue = $now->diffInDays(Carbon::parse($task->end_date));
            $this->line("  🚨 Tâche #{$task->id}: {$task->description} (retard: {$daysOverdue} jour(s))");
            
            if ($sync || $syncOnTaskEvents) {
                $job = new SendTaskOverdueNotifications($task->id);
                $job->handle(app(\App\Services\TwilioService::class));
            } else {
                SendTaskOverdueNotifications::dispatch($task->id)->onQueue('notifications');
            }
            
            $overdueCount++;
        }

        $this->newLine();
        $this->info("✅ {$overdueCount} alerte(s) de retard envoyée(s)");
        $this->newLine();

        // Résumé
        $totalNotifications = $reminderCount + $overdueCount;
        $this->info("📊 Résumé:");
        $this->line("  • Rappels envoyés: {$reminderCount}");
        $this->line("  • Alertes de retard envoyées: {$overdueCount}");
        $this->line("  • Total: {$totalNotifications} notification(s)");
        
        if (!$sync && !$syncOnTaskEvents) {
            $this->newLine();
            $this->comment('💡 Les notifications sont en file d\'attente. Démarrez le worker:');
            $this->line('   php artisan queue:work --queue=notifications');
        }

        return self::SUCCESS;
    }
}
