<?php

namespace App\Jobs;

use App\Models\TodoTask;
use App\Services\TwilioService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class SendTaskReminderNotifications implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected int $taskId;

    public function __construct(int $taskId)
    {
        $this->taskId = $taskId;
    }

    public function handle(TwilioService $twilio): void
    {
        $task = TodoTask::with(['assignees', 'assignedUser', 'list'])->find($this->taskId);

        if (!$task) {
            Log::warning("SendTaskReminderNotifications: Tâche #{$this->taskId} introuvable.");
            return;
        }

        // Récupérer tous les assignés
        $assignees = $task->assignees ?? collect();
        $primaryAssignee = $task->assignedUser;

        // Fusionner assignés multiples + assigné principal
        $allAssignees = $assignees->when($primaryAssignee, function ($collection) use ($primaryAssignee) {
            return $collection->push($primaryAssignee);
        })->unique('id');

        if ($allAssignees->isEmpty()) {
            Log::info("SendTaskReminderNotifications: Aucun assigné pour la tâche #{$this->taskId}.");
            return;
        }

        $daysRemaining = $this->computeDaysRemaining($task->end_date);
        $message = $this->buildReminderText($task, $daysRemaining);
        $dueDateFormatted = $this->formatDate($task->end_date);

        // Envoyer à chaque assigné
        foreach ($allAssignees as $user) {
            // La colonne dans la DB est 'tel', pas 'phone' ou 'telephone'
            $phone = $user->tel ?? null;
            if (!$phone) {
                Log::info("SendTaskReminderNotifications: Pas de téléphone pour user #{$user->id}");
                continue;
            }

            $normalized = $this->normalizeWhatsapp($phone);
            if (!$normalized) {
                Log::warning("SendTaskReminderNotifications: Téléphone invalide pour user #{$user->id}: {$phone}");
                continue;
            }

            $contentSid = config('twilio.task_reminder_content_sid');
            $sent = false;
            if (!empty($contentSid)) {
                $vars = [
                    '1' => (string)$task->id,
                    '2' => $this->taskTitle($task),
                    '3' => $this->formatDaysValue($daysRemaining),
                    '4' => $dueDateFormatted,
                    '5' => $this->formatProgress($task),
                ];
                $sent = $twilio->sendWhatsAppTemplate($normalized, $contentSid, $vars);
            }

            if (!$sent) {
                try {
                    $twilio->sendWhatsApp($normalized, $message);
                    Log::info("Rappel WhatsApp envoyé à {$normalized} pour tâche #{$this->taskId}");
                } catch (\Exception $e) {
                    Log::error("Erreur envoi rappel WhatsApp à {$normalized}: " . $e->getMessage());
                }
            }
        }
    }

    /**
     * Normalise le numéro WhatsApp selon les règles marocaines
     */
    protected function normalizeWhatsapp(?string $phone): ?string
    {
        if (!$phone) {
            return null;
        }

        $phone = trim($phone);
        $phone = preg_replace('/[\s\-\.\(\)]/', '', $phone);

        // Si 9 chiffres commençant par 6 ou 7 (sans le 0 initial), ajouter +212
        if (preg_match('/^([67]\d{8})$/', $phone, $matches)) {
            $defaultCountry = config('twilio.default_country_code', '+212');
            return 'whatsapp:'.$defaultCountry.$matches[1];
        }

        // Si commence par 06 ou 07, enlever le 0 et ajouter le code pays
        if (preg_match('/^0([67]\d{8})$/', $phone, $matches)) {
            $defaultCountry = config('twilio.default_country_code', '+212');
            return 'whatsapp:'.$defaultCountry.$matches[1];
        }

        // Si commence par 00212, remplacer par +212
        if (str_starts_with($phone, '00212')) {
            return 'whatsapp:+'.substr($phone, 2);
        }

        // Si commence par 212 sans +, ajouter le +
        if (preg_match('/^212[67]\d{8}$/', $phone)) {
            return 'whatsapp:+'.$phone;
        }

        // Si déjà au format +212...
        if (preg_match('/^\+212[67]\d{8}$/', $phone)) {
            return 'whatsapp:'.$phone;
        }

        // Format international générique
        if (preg_match('/^\+\d{10,15}$/', $phone)) {
            return 'whatsapp:'.$phone;
        }

        return null;
    }

    /**
     * Construit le texte du message de rappel
     */
    protected function buildReminderText(TodoTask $task, ?int $daysRemaining): string
    {
        $lines = [];
        $lines[] = "⏰ *RAPPEL: Tâche à terminer bientôt*";
        $lines[] = "";
        $lines[] = "📋 *Tâche #{$task->id}*";

        if ($task->list) {
            $lines[] = "📂 Liste: " . ($task->list->title ?? $task->list->name ?? 'Sans nom');
        }

        $lines[] = "📝 Description: " . ($task->description ?: 'Aucune description');
        $lines[] = "📊 Progression: " . $this->formatProgress($task) . "%";
        $lines[] = "🚦 Statut: " . ($task->status ?: 'Non défini');

        if ($task->end_date) {
            $endDate = Carbon::parse($task->end_date)->format('d/m/Y');
            $lines[] = "📅 Date limite: {$endDate}";
            if ($daysRemaining !== null) {
                $lines[] = "⚠️ *Il reste " . max($daysRemaining, 0) . " jour(s) pour terminer cette tâche !*";
            }
        }

        // Liste des assignés
        $assignees = $task->assignees ?? collect();
        $primaryAssignee = $task->assignedUser;
        $allAssignees = $assignees->when($primaryAssignee, function ($collection) use ($primaryAssignee) {
            return $collection->push($primaryAssignee);
        })->unique('id');

        if ($allAssignees->isNotEmpty()) {
            $names = $allAssignees->map(function ($user) {
                return trim(($user->prenom ?? '') . ' ' . ($user->nom ?? $user->name ?? ''));
            })->filter()->implode(', ');
            
            if ($names) {
                $lines[] = "👥 Assignés: {$names}";
            }
        }

        $lines[] = "";
        $lines[] = "💡 N'oubliez pas de mettre à jour la progression de la tâche.";

        return implode("\n", $lines);
    }

    private function computeDaysRemaining(?string $endDate): ?int
    {
        if (!$endDate) {
            return null;
        }

        $due = Carbon::parse($endDate)->startOfDay();
        $today = Carbon::now()->startOfDay();

        if ($due->lessThan($today)) {
            return 0;
        }

        return $today->diffInDays($due);
    }

    private function taskTitle(TodoTask $task): string
    {
        $title = trim((string)($task->description ?? ''));
        return $title !== '' ? $title : 'Tâche';
    }

    private function formatDate(?string $date): string
    {
        if (!$date) {
            return 'Non définie';
        }

        try {
            return Carbon::parse($date)->format('d/m/Y');
        } catch (\Throwable $e) {
            return (string)$date;
        }
    }

    private function formatProgress(TodoTask $task): string
    {
        $progress = $task->pourcentage;
        if ($progress === null || $progress === '') {
            return '0';
        }

        if (!is_numeric($progress)) {
            return (string)$progress;
        }

        return (string)(int)$progress;
    }

    private function formatDaysValue(?int $days): string
    {
        if ($days === null) {
            return '0';
        }

        return (string)max($days, 0);
    }
}
