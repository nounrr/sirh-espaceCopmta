<?php

namespace App\Jobs;

use App\Models\TodoTask;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class CreateRepeatTodoTask implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The base payload used to create the duplicate task.
     */
    protected array $basePayload;

    /**
     * @var int[]
     */
    protected array $assigneeIds;

    /**
     * Meta for attachments to be cloned.
     */
    protected array $attachmentsMeta;

    /**
     * The range (start/end) for this duplicate occurrence.
     */
    protected array $range;

    public function __construct(array $basePayload, array $assigneeIds, array $attachmentsMeta, array $range)
    {
        $this->basePayload = $basePayload;
        $this->assigneeIds = $assigneeIds;
        $this->attachmentsMeta = $attachmentsMeta;
        $this->range = $range;
    }

    public function handle(): void
    {
        DB::transaction(function () {
            $payload = array_merge($this->basePayload, [
                'start_date' => $this->range['start_date'] ?? $this->basePayload['start_date'] ?? null,
                'end_date' => $this->range['end_date'] ?? $this->basePayload['end_date'] ?? null,
            ]);

            $task = TodoTask::create($payload);

            if (!empty($this->assigneeIds)) {
                $task->assignees()->sync($this->assigneeIds);
            }

            foreach ($this->attachmentsMeta as $meta) {
                $task->attachments()->create($meta);
            }
        });
    }
}
