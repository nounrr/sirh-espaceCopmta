<?php

namespace Tests\Feature;

use App\Models\ClientInformationRequest;
use App\Models\TimeEntry;
use App\Models\TodoList;
use App\Models\TodoTask;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskAnalyticsControllerTest extends TestCase
{
    use RefreshDatabase {
        RefreshDatabase::migrateFreshUsing as baseMigrateFreshUsing;
    }

    public function test_overview_returns_expected_metrics(): void
    {
        $fixtures = $this->seedAnalyticsScenario();
        $this->actingAs($fixtures['admin'], 'sanctum');

        $response = $this->getJson('/api/analytics/tasks/overview');

        $response->assertOk();
        $response->assertJsonPath('status_distribution.terminees', 1);
        $response->assertJsonPath('status_distribution.en_cours', 1);
        $response->assertJsonPath('employee_efficiency.0.completed', 1);
        $response->assertJsonPath('time_by_collaborator.0.hours', 4);
        $response->assertJsonPath('billing_vs_workload.planned_minutes', 300);

        $data = $response->json();
        $this->assertEquals(4.0, $data['task_hours_by_user'][0]['total_hours']);
        $this->assertEquals(4.0, $data['daily_time_tracking']['total_hours']);
        $this->assertEquals(1, $data['team_performance'][0]['completed']);
        $this->assertEquals(1, $data['client_information_requests']['totals']['resolved']);
        $this->assertNotEmpty($data['overdue_tasks']);
        $this->assertEquals('Pièces justificatives', $data['client_information_requests']['recent'][0]['subject']);
        $this->assertNotEmpty($data['periodic_collaborators']);
        $this->assertNotEmpty($data['periodic_clients']);

        $recentDay = collect($data['daily_time_tracking']['days'])
            ->firstWhere('date', Carbon::now()->subDay()->toDateString());

        $this->assertNotNull($recentDay);
        $this->assertEquals(1.0, $recentDay['hours']);

        Carbon::setTestNow();
    }

    public function test_collaborator_export_streams_csv(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $collaborator = User::factory()->create();

        $this->actingAs($admin, 'sanctum');

        $todoList = TodoList::create([
            'title' => 'CSV',
            'created_by' => $admin->id,
        ]);

        TodoTask::create([
            'todo_list_id' => $todoList->id,
            'description' => 'Statistiques',
            'status' => 'Terminée',
            'assigned_to' => $collaborator->id,
            'pourcentage' => 100,
        ]);

        $response = $this->get('/api/analytics/reports/collaborators');

        $response->assertOk();
        $this->assertTrue(
            str_starts_with((string) $response->headers->get('content-type'), 'text/csv')
        );
        $content = $response->streamedContent();
        $this->assertStringContainsString('Collaborateur', $content);
        $this->assertStringContainsString('Réalisées', $content);
    }

    public function test_periodic_summary_returns_payload(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin, 'sanctum');

        $response = $this->getJson('/api/analytics/reports/periodic');

        $response->assertOk();
        $response->assertJsonStructure([
            'collaborators',
            'clients',
        ]);
    }

    public function test_export_endpoint_supports_custom_dataset(): void
    {
        $fixtures = $this->seedAnalyticsScenario();
        $this->actingAs($fixtures['admin'], 'sanctum');

        $response = $this->get('/api/analytics/reports/export?dataset=overdue_tasks&format=csv');

        $this->assertCsvExport($response, 'overdue_tasks');
        $this->assertStringContainsString('Tâche', $response->streamedContent());

        Carbon::setTestNow();
    }

    public function test_export_endpoint_supports_all_datasets(): void
    {
        $fixtures = $this->seedAnalyticsScenario();
        $this->actingAs($fixtures['admin'], 'sanctum');

        $datasets = [
            'collaborators',
            'time_by_collaborator',
            'clients',
            'time_by_category',
            'overdue_tasks',
            'info_requests',
            'info_requests_totals',
            'task_hours_by_user',
            'daily_time_tracking',
            'team_performance',
            'status_distribution',
            'periodic_collaborators',
            'periodic_clients',
            'cost_summary',
            'billing_vs_workload',
        ];

        foreach ($datasets as $dataset) {
            $response = $this->get(sprintf('/api/analytics/reports/export?dataset=%s&format=csv', $dataset));
            $this->assertCsvExport($response, $dataset);
        }

        Carbon::setTestNow();
    }

    protected function seedAnalyticsScenario(): array
    {
        Carbon::setTestNow(Carbon::parse('2025-01-15 10:00:00'));

        $admin = User::factory()->create(['role' => 'admin']);
        $collaborator = User::factory()->create(['hourly_rate' => 65]);
        $client = User::factory()->create();

        $todoList = TodoList::create([
            'title' => 'Analyse trimestrielle',
            'created_by' => $admin->id,
            'project_id' => null,
        ]);

        $completedTask = TodoTask::create([
            'todo_list_id' => $todoList->id,
            'description' => 'Préparer le rapport',
            'status' => 'Terminée',
            'start_date' => '2025-01-01',
            'end_date' => '2025-01-05',
            'assigned_to' => $collaborator->id,
            'pourcentage' => 100,
            'planned_minutes' => 180,
            'completion_delay_minutes' => -30,
            'completed_at' => '2025-01-05 10:00:00',
            'billing_rate' => 75,
            'client_id' => $client->id,
            'priority' => 'high',
        ]);

        $inProgressTask = TodoTask::create([
            'todo_list_id' => $todoList->id,
            'description' => 'Suivi client',
            'status' => 'En cours',
            'start_date' => '2025-01-02',
            'end_date' => now()->subDays(2)->toDateString(),
            'assigned_to' => $collaborator->id,
            'pourcentage' => 40,
            'planned_minutes' => 120,
            'client_id' => $client->id,
            'priority' => 'medium',
        ]);

        TimeEntry::create([
            'todo_task_id' => $completedTask->id,
            'user_id' => $collaborator->id,
            'started_at' => now()->subDays(5),
            'ended_at' => now()->subDays(5)->addHours(3),
            'duration_minutes' => 180,
        ]);

        TimeEntry::create([
            'todo_task_id' => $inProgressTask->id,
            'user_id' => $collaborator->id,
            'started_at' => now()->subDay(),
            'ended_at' => now()->subDay()->addHours(1),
            'duration_minutes' => 60,
        ]);

        ClientInformationRequest::create([
            'todo_task_id' => $completedTask->id,
            'client_id' => $client->id,
            'handled_by' => $collaborator->id,
            'subject' => 'Pièces justificatives',
            'status' => 'resolved',
            'requested_at' => now()->subDay(),
            'responded_at' => now(),
            'response_minutes' => 120,
            'channel' => 'email',
        ]);

        return compact('admin', 'collaborator', 'client', 'todoList', 'completedTask', 'inProgressTask');
    }

    protected function assertCsvExport($response, string $dataset): void
    {
        $response->assertOk();
        $this->assertTrue(
            str_starts_with((string) $response->headers->get('content-type'), 'text/csv'),
            sprintf('Dataset %s should stream CSV', $dataset)
        );

        $content = $response->streamedContent();
        $this->assertNotEmpty($content, sprintf('Dataset %s should contain data', $dataset));
    }

    protected function migrateFreshUsing()
    {
        return array_merge($this->baseMigrateFreshUsing(), [
            '--path' => 'database/test_migrations',
        ]);
    }
}
