<?php

namespace Tests\Feature;

use App\Jobs\CreateRepeatTodoTask;
use App\Models\TodoList;
use App\Models\TodoTask;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class TodoTaskTest extends TestCase
{
	use RefreshDatabase {
		RefreshDatabase::migrateFreshUsing as baseMigrateFreshUsing;
	}

	public function test_store_schedules_future_repeats(): void
	{
		Queue::fake();

		$user = User::factory()->create();
		$this->actingAs($user, 'sanctum');

		$todoList = TodoList::create([
			'title' => 'Recurring work',
			'created_by' => $user->id,
			'project_id' => null,
		]);

		$payload = [
			'description' => 'Prepare monthly report',
			'repeat_count' => 3,
			'repeat_frequency' => '5_minutes',
			'repeat_ranges' => [
				['start_date' => '2025-01-01', 'end_date' => '2025-01-02'],
				['start_date' => '2025-01-01', 'end_date' => '2025-01-02'],
				['start_date' => '2025-01-01', 'end_date' => '2025-01-02'],
			],
		];

		$response = $this->postJson("/api/todo-lists/{$todoList->id}/tasks", $payload);

		$response
			->assertCreated()
			->assertJsonCount(2, 'scheduled_duplicates')
			->assertJsonPath('task.start_date', '2025-01-01')
			->assertJsonMissingPath('duplicates');

		$this->assertDatabaseCount('todo_tasks', 1);

		$scheduled = $response->json('scheduled_duplicates');
		$this->assertEquals([2, 3], array_column($scheduled, 'sequence'));

		$reference = Carbon::now();

		Queue::assertPushed(CreateRepeatTodoTask::class, 2);

		$delays = Queue::pushed(CreateRepeatTodoTask::class)
			->map(function (CreateRepeatTodoTask $job) use ($reference) {
				if ($job->delay instanceof \DateTimeInterface) {
					return $reference->diffInSeconds(Carbon::instance($job->delay), false);
				}

				return null;
			})
			->filter()
			->sort()
			->values()
			->all();

		$this->assertCount(2, $delays);
		$this->assertEqualsWithDelta(300, $delays[0], 3);
		$this->assertEqualsWithDelta(600, $delays[1], 3);
	}

	public function test_repeat_job_creates_task_with_assignees_and_attachments(): void
	{
		$user = User::factory()->create();

		$todoList = TodoList::create([
			'title' => 'Recurring work',
			'created_by' => $user->id,
			'project_id' => null,
		]);

		$basePayload = [
			'todo_list_id' => $todoList->id,
			'description' => 'Follow-up call',
			'status' => 'En attente',
			'assigned_to' => $user->id,
			'pourcentage' => 0,
			'start_date' => '2025-01-01',
			'end_date' => '2025-01-02',
			'type' => 'AC',
			'origine' => null,
			'client_id' => null,
			'priority' => 'normale',
		];

		$attachmentsMeta = [[
			'uploaded_by' => $user->id,
			'original_name' => 'duplicate.pdf',
			'stored_path' => 'todo_tasks/duplicate.pdf',
			'mime_type' => 'application/pdf',
			'size' => 512,
		]];

		$range = ['start_date' => '2025-01-03', 'end_date' => '2025-01-04'];

		$job = new CreateRepeatTodoTask($basePayload, [$user->id], $attachmentsMeta, $range);
		$job->handle();

		$this->assertDatabaseCount('todo_tasks', 1);

		$task = TodoTask::first();
		$this->assertSame('2025-01-03', $task->start_date);
		$this->assertSame('2025-01-04', $task->end_date);
		$this->assertSame($user->id, $task->assigned_to);
		$this->assertCount(1, $task->assignees);
		$this->assertCount(1, $task->attachments);
		$this->assertSame('duplicate.pdf', $task->attachments->first()->original_name);
	}

	protected function migrateFreshUsing()
	{
		return array_merge($this->baseMigrateFreshUsing(), [
			'--path' => 'database/test_migrations',
		]);
	}
}
