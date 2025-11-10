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

class SendTaskCancelledNotifications implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(private int $taskId) {}

    public function handle(TwilioService $twilio): void
    {
        Log::info("SendTaskCancelledNotifications job started", ['task_id' => $this->taskId]);
        
        $task = TodoTask::with([
            'assignees:id,name,prenom,tel',
            'assignedUser:id,name,prenom,tel',
            'list:id,title,created_by',
        ])->find($this->taskId);
        
        if (!$task) {
            Log::warning("Task not found for cancellation notification", ['task_id' => $this->taskId]);
            return;
        }
        
        Log::info("Task found for cancellation notification", [
            'task_id' => $this->taskId,
            'task_status' => $task->status,
            'assignees_count' => $task->assignees ? $task->assignees->count() : 0,
            'assigned_user_id' => $task->assigned_to,
        ]);

        $users = collect();
        if ($task->assignees) {
            $users = $users->merge($task->assignees);
        }
        if ($task->assignedUser) {
            $users = $users->push($task->assignedUser);
        }
        $users = $users->whereNotNull('id')->unique('id');

        $defaultCc = config('twilio.default_country_code', '+212');
        $success = 0; $failed = 0;

        foreach ($users as $u) {
            $raw = trim((string)($u->tel ?? ''));
            if ($raw === '') { $failed++; continue; }
            $to = $this->normalizeWhatsapp($raw, $defaultCc);

            $contentSid = config('twilio.task_cancelled_content_sid');
            $sent = false;
            if (!empty($contentSid)) {
                $vars = [
                    '1' => (string)$task->id,
                    '2' => $this->taskTitle($task),
                    '3' => $this->determineCancellationReason($task),
                ];
                $sent = $twilio->sendWhatsAppTemplate($to, $contentSid, $vars);
            }

            if (!$sent) {
                $msg = $this->buildText($task);
                $sent = $twilio->sendWhatsApp($to, $msg);
            }

            $sent ? $success++ : $failed++;
        }

        Log::info('Task cancelled notifications sent', [
            'task_id' => $this->taskId,
            'success' => $success,
            'failed' => $failed,
        ]);
    }

    private function normalizeWhatsapp(string $phone, string $defaultCc): string
    {
        // Remove whatsapp: prefix and all non-digit/non-plus characters
        $p = (string) $phone;
        $p = str_ireplace('whatsapp:', '', $p);
        $p = trim($p);
        // Keep leading +, strip other non-digits
        $p = preg_replace('/(?!^)[^0-9]/', '', $p ?? '');
        // Restore leading + if present originally
        if (isset($phone[0]) && $phone[0] === '+') {
            $p = '+'.$p;
        }

        // Convert 00xx to +xx
        if (str_starts_with($p, '00')) {
            $p = '+'.substr($p, 2);
        }

        // If already in +E.164, return
        if (str_starts_with($p, '+')) {
            return 'whatsapp:'.$p;
        }

        // If starts with local 0, remove ONLY one leading 0
        if (str_starts_with($p, '0')) {
            $p = substr($p, 1);
            return 'whatsapp:'.$defaultCc.$p;
        }

        // If starts with bare country code (e.g., 212...), prefix +
        $bareCc = ltrim($defaultCc, '+');
        if (str_starts_with($p, $bareCc)) {
            return 'whatsapp:+'.$p;
        }

        // Fallback: assume national significant number, prefix default CC
        return 'whatsapp:'.$defaultCc.$p;
    }

    private function buildText(TodoTask $task): string
    {
        $title = $this->taskTitle($task);
        $taskId = $task->id;
        $listId = (string)($task->todo_list_id ?? '');

        $assigneeNames = [];
        if ($task->assignedUser) {
            $assigneeNames[] = trim(($task->assignedUser->prenom ?? '').' '.($task->assignedUser->name ?? ''));
        }
        if ($task->assignees && $task->assignees->count()) {
            foreach ($task->assignees as $a) {
                $full = trim(($a->prenom ?? '').' '.($a->name ?? ''));
                if ($full !== '') { $assigneeNames[] = $full; }
            }
        }
        $assigneeNames = array_values(array_unique(array_filter($assigneeNames)));

        $parts = [];
        $parts[] = "⚠️ Tâche annulée";
        $parts[] = "- ID: ".$taskId;
        $parts[] = "- Liste: #".$listId;
        $parts[] = "- Description: ".$title;
        if (!empty($assigneeNames)) {
            $parts[] = "- Assignés: ".implode(', ', $assigneeNames);
        }
        $reason = $this->determineCancellationReason($task);
        if ($reason !== '') {
            $parts[] = "- Motif: ".$reason;
        }
        $parts[] = "Cette tâche a été annulée.";
        $parts[] = "Merci.";
        return implode("\n", $parts);
    }

    private function taskTitle(TodoTask $task): string
    {
        $title = trim((string)($task->description ?? ''));
        return $title !== '' ? $title : 'Tâche';
    }

    private function determineCancellationReason(TodoTask $task): string
    {
        $reason = '';

        if ($task->relationLoaded('cancellationRequests')) {
            $reason = optional($task->cancellationRequests->first())->reason;
        }

        if (!$reason && method_exists($task, 'getAttribute')) {
            $reason = (string)($task->motif ?? '');
        }

        return trim($reason ?? '') ?: 'Non précisé';
    }
}
