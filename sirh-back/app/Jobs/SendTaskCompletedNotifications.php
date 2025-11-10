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

class SendTaskCompletedNotifications implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(private int $taskId) {}

    public function handle(TwilioService $twilio): void
    {
        $task = TodoTask::with([
            'assignees:id,name,prenom,tel',
            'assignedUser:id,name,prenom,tel',
            'list:id,title,created_by',
        ])->find($this->taskId);

        if (!$task) {
            return;
        }

        $users = collect();
        if ($task->assignees) {
            $users = $users->merge($task->assignees);
        }
        if ($task->assignedUser) {
            $users = $users->push($task->assignedUser);
        }
        $users = $users->whereNotNull('id')->unique('id');

        if ($users->isEmpty()) {
            Log::info('SendTaskCompletedNotifications: Aucun assigné pour la tâche', ['task_id' => $this->taskId]);
            return;
        }

        $defaultCc = config('twilio.default_country_code', '+212');
        $success = 0; $failed = 0;

        foreach ($users as $user) {
            $raw = trim((string)($user->tel ?? ''));
            if ($raw === '') { $failed++; continue; }
            $to = $this->normalizeWhatsapp($raw, $defaultCc);

            $contentSid = config('twilio.task_completed_content_sid');
            $sent = false;
            if (!empty($contentSid)) {
                $vars = [
                    '1' => (string)$task->id,
                    '2' => $this->taskTitle($task),
                    '3' => $this->formatProgress($task),
                ];
                $sent = $twilio->sendWhatsAppTemplate($to, $contentSid, $vars);
            }

            if (!$sent) {
                $message = $this->buildText($task);
                $sent = $twilio->sendWhatsApp($to, $message);
            }

            $sent ? $success++ : $failed++;
        }

        Log::info('Task completed notifications sent', [
            'task_id' => $this->taskId,
            'success' => $success,
            'failed' => $failed,
        ]);
    }

    private function normalizeWhatsapp(string $phone, string $defaultCc): string
    {
        $p = (string) $phone;
        $p = str_ireplace('whatsapp:', '', $p);
        $p = trim($p);
        $p = preg_replace('/(?!^)[^0-9]/', '', $p ?? '');
        if (isset($phone[0]) && $phone[0] === '+') {
            $p = '+'.$p;
        }

        if (str_starts_with($p, '00')) {
            $p = '+'.substr($p, 2);
        }

        if (str_starts_with($p, '+')) {
            return 'whatsapp:'.$p;
        }

        if (str_starts_with($p, '0')) {
            $p = substr($p, 1);
            return 'whatsapp:'.$defaultCc.$p;
        }

        $bareCc = ltrim($defaultCc, '+');
        if (str_starts_with($p, $bareCc)) {
            return 'whatsapp:+'.$p;
        }

        return 'whatsapp:'.$defaultCc.$p;
    }

    private function buildText(TodoTask $task): string
    {
        $title = $this->taskTitle($task);
        $progress = $this->formatProgress($task);
        $list = $task->list ? ($task->list->title ?? $task->list->name ?? '') : '';

        $lines = [];
        $lines[] = '✅ Tâche terminée';
        $lines[] = "- ID: {$task->id}";
        if ($list !== '') {
            $lines[] = "- Liste: {$list}";
        }
        $lines[] = "- Titre: {$title}";
        $lines[] = "- Avancement final: {$progress}%";
        $lines[] = 'Merci pour votre contribution !';

        return implode("\n", $lines);
    }

    private function taskTitle(TodoTask $task): string
    {
        $title = trim((string)($task->description ?? ''));
        return $title !== '' ? $title : 'Tâche';
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
}
