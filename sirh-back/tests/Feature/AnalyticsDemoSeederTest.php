<?php

namespace Tests\Feature;

use App\Models\ClientInformationRequest;
use App\Models\TimeEntry;
use App\Models\TodoTask;
use App\Services\TaskAnalyticsService;
use Carbon\Carbon;
use Database\Seeders\AnalyticsDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class AnalyticsDemoSeederTest extends TestCase
{
    use RefreshDatabase {
        RefreshDatabase::migrateFreshUsing as baseMigrateFreshUsing;
    }

    public function test_demo_seeder_populates_rich_analytics_dataset(): void
    {
        Carbon::setTestNow(Carbon::parse('2025-02-10 09:00:00'));

        Artisan::call('db:seed', ['--class' => AnalyticsDemoSeeder::class]);

        $this->assertGreaterThanOrEqual(6, TodoTask::count(), 'Expect at least six demo tasks');
        $this->assertGreaterThanOrEqual(6, TimeEntry::count(), 'Expect several tracked time entries');
        $this->assertGreaterThanOrEqual(3, ClientInformationRequest::count(), 'Expect multiple client info requests');

        /** @var TaskAnalyticsService $service */
        $service = app(TaskAnalyticsService::class);
        $overview = $service->buildOverview();

        $this->assertNotEmpty($overview['status_distribution']);
        $this->assertGreaterThan(0, $overview['status_distribution']['terminees']);
        $this->assertNotEmpty($overview['employee_efficiency']);
        $this->assertNotEmpty($overview['time_by_collaborator']);
        $this->assertNotEmpty($overview['time_by_client']);
        $this->assertNotEmpty($overview['time_by_category']);
        $this->assertNotEmpty($overview['overdue_tasks']);
        $this->assertNotEmpty($overview['periodic_collaborators']);
        $this->assertNotEmpty($overview['periodic_clients']);
        $this->assertGreaterThan(0, $overview['daily_time_tracking']['total_hours']);
        $this->assertGreaterThan(0, $overview['billing_vs_workload']['planned_minutes']);
        $this->assertGreaterThan(0, $overview['cost_summary']['total_hours']);
        $this->assertGreaterThan(0, $overview['client_information_requests']['totals']['all']);
        $this->assertGreaterThanOrEqual(1, $overview['client_information_requests']['totals']['resolved']);

        Carbon::setTestNow();
    }

    protected function migrateFreshUsing()
    {
        return array_merge($this->baseMigrateFreshUsing(), [
            '--path' => 'database/test_migrations',
        ]);
    }
}
