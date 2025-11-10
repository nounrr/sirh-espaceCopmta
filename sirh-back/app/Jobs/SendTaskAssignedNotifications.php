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

class SendTaskAssignedNotifications implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(private int $taskId, private ?array $onlyUserIds = null) {}

    public function handle(TwilioService $twilio): void
    {
        $task = TodoTask::with([
            'assignees:id,name,prenom,tel',
            'assignedUser:id,name,prenom,tel',
            'list:id,created_by',
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
        if (is_array($this->onlyUserIds) && !empty($this->onlyUserIds)) {
            $filter = collect($this->onlyUserIds)->map(fn($id) => (int)$id)->unique()->all();
            $users = $users->filter(fn($u) => in_array((int)$u->id, $filter, true));
        }

        $defaultCc = config('twilio.default_country_code', '+212');
        $success = 0; $failed = 0;

        foreach ($users as $u) {
            $raw = trim((string)($u->tel ?? ''));
            if ($raw === '') { $failed++; continue; }
            $to = $this->normalizeWhatsapp($raw, $defaultCc);

            $contentSid = config('twilio.task_assigned_content_sid');
            $sent = false;
            if (!empty($contentSid)) {
                $assigneeName = $this->formatUserName($u);
                $dueDate = $this->formatDate($task->end_date);
                $vars = [
                    '1' => $assigneeName,
                    '2' => (string)$task->id,
                    '3' => $this->taskTitle($task),
                    '4' => $dueDate,
                    '5' => $this->formatProgress($task),
                ];
                $sent = $twilio->sendWhatsAppTemplate($to, $contentSid, $vars);
            }

            if (!$sent) {
                $msg = $this->buildText($task, $u);
                $sent = $twilio->sendWhatsApp($to, $msg);
            }

            $sent ? $success++ : $failed++;
        }

        Log::info('Task assigned notifications sent', [
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

    private function buildText(TodoTask $task, $forUser): string
    {
        $title = $this->taskTitle($task);
        $assignee = $this->formatUserName($forUser);
        $startDate = $task->start_date ? $this->formatDate($task->start_date) : '';
        $dueDate = $task->end_date ? $this->formatDate($task->end_date) : '';
        $status = (string)($task->status ?? '');
        $pourc = $this->formatProgress($task);
        $type = (string)($task->type ?? '');
        $origine = (string)($task->origine ?? '');
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
        $parts[] = "Bonjour {$assignee},";
        $parts[] = "Vous avez été assigné(e) à une nouvelle tâche.";
        $parts[] = "- ID: ".$task->id;
        $parts[] = "- Liste: #".$listId;
        $parts[] = "- Description: ".$title;
        if ($status !== '') { $parts[] = "- Statut: ".$status; }
        if ($pourc !== '') { $parts[] = "- Avancement: ".$pourc."%"; }
        if ($startDate !== '') { $parts[] = "- Début: ".$startDate; }
        if ($dueDate !== '') { $parts[] = "- Échéance: ".$dueDate; }
        if ($type !== '') { $parts[] = "- Type: ".$type; }
        if ($origine !== '') { $parts[] = "- Origine: ".$origine; }
        if (!empty($assigneeNames)) {
            $parts[] = "- Assignés: ".implode(', ', $assigneeNames);
        }
        $parts[] = "Merci.";
        return implode("\n", $parts);
    }

    private function formatUserName($user): string
    {
        $full = trim(($user->prenom ?? '').' '.($user->name ?? $user->nom ?? ''));
        return $full !== '' ? $full : 'Collègue';
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
}
