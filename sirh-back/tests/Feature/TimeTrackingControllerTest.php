<?php

namespace Tests\Feature;

use App\Models\TaskProgressHour;
use App\Models\TodoList;
use App\Models\TodoTask;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TimeTrackingControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_assigned_employee_can_start_and_pause_task(): void
    {
        $user = User::factory()->create(['role' => 'Employe']);
        $task = $this->makeTask($user);

        Sanctum::actingAs($user);

        $this->postJson("/api/tasks/{$task->id}/start")
            ->assertOk()
            ->assertJsonPath('user_id', $user->id);

        $this->postJson("/api/tasks/{$task->id}/pause")
            ->assertOk()
            ->assertJsonPath('closed', true);

        $this->assertDatabaseHas('task_progress_hours', [
            'user_id' => $user->id,
            'task_id' => $task->id,
        ]);

        $entry = TaskProgressHour::where('user_id', $user->id)
            ->where('task_id', $task->id)
            ->first();

        $this->assertNotNull($entry);
        $this->assertNotNull($entry->end_datetime);
    }

    public function test_privileged_manager_can_control_timer_without_assignment(): void
    {
        $manager = User::factory()->create(['role' => 'Gest_Projet']);
        $assignee = User::factory()->create(['role' => 'Employe']);
        $task = $this->makeTask($assignee);

        Sanctum::actingAs($manager);

        $this->postJson("/api/tasks/{$task->id}/start")
            ->assertOk()
            ->assertJsonPath('user_id', $manager->id);

        $this->postJson("/api/tasks/{$task->id}/pause")
            ->assertOk()
            ->assertJsonPath('closed', true);
    }

    public function test_unassigned_employee_cannot_control_timer(): void
    {
        $user = User::factory()->create(['role' => 'Employe']);
        $task = $this->makeTask();

        Sanctum::actingAs($user);

        $this->postJson("/api/tasks/{$task->id}/start")->assertForbidden();
        $this->postJson("/api/tasks/{$task->id}/pause")->assertForbidden();
    }

    public function test_daily_summary_returns_minutes_and_segments(): void
    {
        $user = User::factory()->create(['role' => 'Employe']);
        $task = $this->makeTask($user);

        Sanctum::actingAs($user);

        $base = Carbon::now()->startOfDay()->addHours(9);

        TaskProgressHour::create([
            'user_id' => $user->id,
            'task_id' => $task->id,
            'start_datetime' => $base->copy(),
            'end_datetime' => $base->copy()->addMinutes(45),
        ]);

        TaskProgressHour::create([
            'user_id' => $user->id,
            'task_id' => $task->id,
            'start_datetime' => $base->copy()->addHours(2),
            'end_datetime' => $base->copy()->addHours(3),
        ]);

        $date = $base->format('Y-m-d');

        $this->getJson("/api/tasks/{$task->id}/time-summary?date={$date}")
            ->assertOk()
            ->assertJson([
                'period' => 'day',
                'date' => $date,
                'my_minutes' => 105,
                'total_minutes' => 105,
                'my_segments' => 2,
                'total_segments' => 2,
            ]);
    }

    private function makeTask(?User $assignee = null): TodoTask
    {
        $owner = User::factory()->create();

        $list = TodoList::withoutEvents(function () use ($owner) {
            return TodoList::create([
                'title' => 'Backlog',
                'project_id' => 1,
                'created_by' => $owner->id,
            ]);
        });

        return TodoTask::withoutEvents(function () use ($list, $assignee) {
            return TodoTask::create([
                'todo_list_id' => $list->id,
                'description' => 'Sample task',
                'status' => 'En attente',
                'assigned_to' => $assignee?->id,
                'pourcentage' => 0,
                'type' => 'AC',
                'priority' => 'normale',
            ]);
        });
    }
}
