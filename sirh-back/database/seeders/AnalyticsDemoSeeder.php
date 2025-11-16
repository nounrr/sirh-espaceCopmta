<?php

namespace Database\Seeders;

use App\Models\ClientInformationRequest;
use App\Models\TimeEntry;
use App\Models\TodoList;
use App\Models\TodoTask;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class AnalyticsDemoSeeder extends Seeder
{
    private array $userColumns = [];

    public function run(): void
    {
        DB::transaction(function () {
            $now = Carbon::now()->setMinute(0)->setSecond(0);

            $admin = $this->ensureAdmin();
            $collaborators = $this->ensureCollaborators();
            $clients = $this->ensureClients();
            $lists = $this->ensureLists($admin);

            $tasks = $this->seedTasks($lists, $collaborators, $clients, $now);
            $this->seedTimeEntries($tasks, $collaborators, $now);
            $this->seedClientInformationRequests($tasks, $clients, $collaborators, $now);
        });
    }

    private function ensureAdmin(): User
    {
        return User::updateOrCreate(
            ['email' => 'demo.admin@analytics.test'],
            $this->prepareUserData([
                'name' => 'Admin',
                'prenom' => 'Amina',
                'password' => Hash::make('password'),
            ], 'admin')
        );
    }

    /**
     * @return array<string, User>
     */
    private function ensureCollaborators(): array
    {
        $definitions = [
            'youssef' => [
                'name' => 'Benali',
                'prenom' => 'Youssef',
                'email' => 'youssef.collab@analytics.test',
                'hourly_rate' => 65,
            ],
            'salma' => [
                'name' => 'Cherkaoui',
                'prenom' => 'Salma',
                'email' => 'salma.collab@analytics.test',
                'hourly_rate' => 72,
            ],
            'mehdi' => [
                'name' => 'Saadi',
                'prenom' => 'Mehdi',
                'email' => 'mehdi.collab@analytics.test',
                'hourly_rate' => 58,
            ],
        ];

        $users = [];
        foreach ($definitions as $key => $data) {
            $users[$key] = User::updateOrCreate(
                ['email' => $data['email']],
                $this->prepareUserData([
                    'name' => $data['name'],
                    'prenom' => $data['prenom'],
                    'hourly_rate' => $data['hourly_rate'],
                    'password' => Hash::make('password'),
                ], 'employee')
            );
        }

        return $users;
    }

    /**
     * @return array<string, User>
     */
    private function ensureClients(): array
    {
        $definitions = [
            'atlas' => [
                'name' => 'Atlas Energy',
                'prenom' => 'Groupe',
                'email' => 'contact@atlas-energy.test',
            ],
            'zenith' => [
                'name' => 'Zenith Logistics',
                'prenom' => 'Equipe',
                'email' => 'operations@zenith-logistics.test',
            ],
        ];

        $clients = [];
        foreach ($definitions as $key => $data) {
            $clients[$key] = User::updateOrCreate(
                ['email' => $data['email']],
                $this->prepareUserData([
                    'name' => $data['name'],
                    'prenom' => $data['prenom'],
                    'typeContrat' => 'Client',
                    'password' => Hash::make('password'),
                ], 'client')
            );
        }

        return $clients;
    }

    private function prepareUserData(array $attributes, string $kind): array
    {
        $now = Carbon::now();
        $defaults = [
            'role' => $this->mapRole($kind),
            'statut' => 'Actif',
            'typeContrat' => $kind === 'client' ? 'Client' : 'Permanent',
            'cin' => $this->generateCin($attributes['email'] ?? $kind),
            'tel' => $this->generatePhone($attributes['email'] ?? $kind),
            'sex' => $kind === 'client' ? 'H' : 'F',
            'dateEmbauche' => $now->copy()->subMonths(6)->toDateString(),
            'date_naissance' => $now->copy()->subYears(30)->toDateString(),
            'adresse' => 'Casablanca',
            'nbEnfants' => 0,
            'fonction' => $kind === 'client' ? 'Client' : 'Consultant',
        ];

        $payload = array_merge($defaults, $attributes);

        return collect($payload)
            ->filter(fn ($value, $column) => in_array($column, $this->getUserColumns(), true))
            ->toArray();
    }

    private function mapRole(string $kind): string
    {
        return match ($kind) {
            'admin' => 'RH',
            'client' => 'Chef_Projet',
            default => 'Employe',
        };
    }

    private function generateCin(string $seed): ?string
    {
        if (!in_array('cin', $this->getUserColumns(), true)) {
            return null;
        }

        $base = 'ANA-DEMO-' . strtoupper(substr(md5(strtolower($seed)), 0, 6));
        $cin = $base;
        $suffix = 1;

        while (DB::table('users')->where('cin', $cin)->exists()) {
            $cin = $base . '-' . $suffix;
            $suffix++;

            if ($suffix > 50) {
                return null;
            }
        }

        return $cin;
    }

    private function generatePhone(string $seed): string
    {
        $digits = substr(sprintf('%010u', crc32($seed)), 0, 8);
        return '06' . str_pad($digits, 8, '0');
    }

    private function getUserColumns(): array
    {
        if (empty($this->userColumns)) {
            $this->userColumns = Schema::hasTable('users')
                ? Schema::getColumnListing('users')
                : [];
        }

        return $this->userColumns;
    }

    /**
     * @return array<string, TodoList>
     */
    private function ensureLists(User $admin): array
    {
        return [
            'reporting' => TodoList::updateOrCreate(
                ['title' => 'Analytics Demo - Reporting', 'created_by' => $admin->id],
                ['project_id' => null]
            ),
            'support' => TodoList::updateOrCreate(
                ['title' => 'Analytics Demo - Support', 'created_by' => $admin->id],
                ['project_id' => null]
            ),
        ];
    }

    /**
     * @param array<string, TodoList> $lists
     * @param array<string, User> $collaborators
     * @param array<string, User> $clients
     * @return array<string, TodoTask>
     */
    private function seedTasks(array $lists, array $collaborators, array $clients, Carbon $now): array
    {
        $definitions = [
            [
                'key' => 'reporting_closure',
                'list' => 'reporting',
                'description' => 'Clôturer le reporting Q4',
                'status' => 'Terminée',
                'start_offset_days' => 12,
                'end_offset_days' => 7,
                'completed_offset_days' => 7,
                'assigned_to' => 'youssef',
                'assignees' => ['youssef', 'salma'],
                'planned_minutes' => 360,
                'actual_minutes_cache' => 345,
                'completion_delay_minutes' => -15,
                'pourcentage' => 100,
                'priority' => 'haute',
                'client' => 'atlas',
                'type' => 'AC',
                'task_kind' => 'Reporting',
                'origine' => 'Client',
                'billing_rate' => 95,
                'is_billable' => true,
            ],
            [
                'key' => 'customer_followup',
                'list' => 'support',
                'description' => 'Suivi hebdomadaire des demandes clients',
                'status' => 'En cours',
                'start_offset_days' => 6,
                'end_offset_days' => 1,
                'completed_offset_days' => null,
                'assigned_to' => 'salma',
                'assignees' => ['salma'],
                'planned_minutes' => 180,
                'actual_minutes_cache' => 120,
                'completion_delay_minutes' => null,
                'pourcentage' => 60,
                'priority' => 'normale',
                'client' => 'atlas',
                'type' => 'AC',
                'task_kind' => 'Support',
                'origine' => 'Client',
                'billing_rate' => 80,
                'is_billable' => true,
            ],
            [
                'key' => 'client_onboarding',
                'list' => 'reporting',
                'description' => 'Accompagner le client Zenith sur l’outil RH',
                'status' => 'En validation',
                'start_offset_days' => 9,
                'end_offset_days' => -2,
                'completed_offset_days' => null,
                'assigned_to' => 'mehdi',
                'assignees' => ['mehdi', 'salma'],
                'planned_minutes' => 240,
                'actual_minutes_cache' => 0,
                'completion_delay_minutes' => null,
                'pourcentage' => 90,
                'priority' => 'haute',
                'client' => 'zenith',
                'type' => 'AP',
                'task_kind' => 'Formation',
                'origine' => 'Client',
                'billing_rate' => 90,
                'is_billable' => true,
            ],
            [
                'key' => 'data_cleanup',
                'list' => 'support',
                'description' => 'Nettoyage des données historiques',
                'status' => 'En attente',
                'start_offset_days' => 8,
                'end_offset_days' => 2,
                'completed_offset_days' => null,
                'assigned_to' => 'mehdi',
                'assignees' => ['mehdi'],
                'planned_minutes' => 200,
                'actual_minutes_cache' => 45,
                'completion_delay_minutes' => null,
                'pourcentage' => 10,
                'priority' => 'basse',
                'client' => 'zenith',
                'type' => 'AC',
                'task_kind' => 'Automatisation',
                'origine' => 'Interne',
                'billing_rate' => 0,
                'is_billable' => false,
            ],
            [
                'key' => 'support_sprint',
                'list' => 'support',
                'description' => 'Sprint de support intensif',
                'status' => 'En cours',
                'start_offset_days' => 4,
                'end_offset_days' => 0,
                'completed_offset_days' => null,
                'assigned_to' => 'salma',
                'assignees' => ['salma', 'youssef'],
                'planned_minutes' => 300,
                'actual_minutes_cache' => 0,
                'completion_delay_minutes' => null,
                'pourcentage' => 45,
                'priority' => 'critique',
                'client' => 'atlas',
                'type' => 'AC',
                'task_kind' => 'Support intensif',
                'origine' => 'Client',
                'billing_rate' => 85,
                'is_billable' => true,
            ],
            [
                'key' => 'legacy_migration',
                'list' => 'reporting',
                'description' => 'Migration de l’ancien outil RH',
                'status' => 'Annulé',
                'start_offset_days' => 14,
                'end_offset_days' => 11,
                'completed_offset_days' => null,
                'assigned_to' => 'salma',
                'assignees' => ['salma'],
                'planned_minutes' => 150,
                'actual_minutes_cache' => 30,
                'completion_delay_minutes' => null,
                'pourcentage' => 5,
                'priority' => 'normale',
                'client' => 'zenith',
                'type' => 'AP',
                'task_kind' => 'Migration',
                'origine' => 'Interne',
                'billing_rate' => 0,
                'is_billable' => false,
            ],
        ];

        $tasks = [];

        TodoTask::withoutEvents(function () use (&$tasks, $definitions, $lists, $collaborators, $clients, $now) {
            foreach ($definitions as $definition) {
                $list = $lists[$definition['list']];
                $assignedUser = $collaborators[$definition['assigned_to']];
                $client = $clients[$definition['client']] ?? null;

                $startDate = $definition['start_offset_days'] !== null
                    ? $now->copy()->subDays($definition['start_offset_days'])->toDateString()
                    : null;
                $endDate = $definition['end_offset_days'] !== null
                    ? $now->copy()->subDays($definition['end_offset_days'])->toDateString()
                    : null;
                $completedAt = $definition['completed_offset_days'] !== null
                    ? $now->copy()->subDays($definition['completed_offset_days'])->setHour(16)->setMinute(0)
                    : null;

                $task = TodoTask::updateOrCreate(
                    [
                        'todo_list_id' => $list->id,
                        'description' => $definition['description'],
                    ],
                    [
                        'status' => $definition['status'],
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                        'completed_at' => $completedAt,
                        'assigned_to' => $assignedUser->id,
                        'planned_minutes' => $definition['planned_minutes'],
                        'actual_minutes_cache' => $definition['actual_minutes_cache'],
                        'completion_delay_minutes' => $definition['completion_delay_minutes'],
                        'pourcentage' => $definition['pourcentage'],
                        'priority' => $definition['priority'],
                        'client_id' => $client?->id,
                        'type' => $definition['type'],
                        'origine' => $definition['origine'],
                        'billing_rate' => $definition['billing_rate'],
                        'is_billable' => $definition['is_billable'],
                    ]
                );

                $assignees = $definition['assignees'] ?? [];
                if (!empty($assignees)) {
                    $task->assignees()->sync(
                        collect($assignees)->map(fn ($key) => $collaborators[$key]->id)->toArray()
                    );
                } else {
                    $task->assignees()->detach();
                }

                $tasks[$definition['key']] = $task;
            }
        });

        return $tasks;
    }

    /**
     * @param array<string, TodoTask> $tasks
     * @param array<string, User> $collaborators
     */
    private function seedTimeEntries(array $tasks, array $collaborators, Carbon $now): void
    {
        $entries = [
            ['task' => 'reporting_closure', 'user' => 'youssef', 'days_ago' => 6, 'hour' => 9, 'duration' => 180, 'notes' => 'Analyse des indicateurs Q4'],
            ['task' => 'reporting_closure', 'user' => 'salma', 'days_ago' => 5, 'hour' => 10, 'duration' => 90, 'notes' => 'Contrôle qualité'],
            ['task' => 'customer_followup', 'user' => 'salma', 'days_ago' => 2, 'hour' => 11, 'duration' => 120, 'notes' => 'Sessions de support en visio'],
            ['task' => 'support_sprint', 'user' => 'youssef', 'days_ago' => 1, 'hour' => 9, 'duration' => 90, 'notes' => 'Traitement des tickets critiques'],
            ['task' => 'support_sprint', 'user' => 'salma', 'days_ago' => 1, 'hour' => 14, 'duration' => 60, 'notes' => 'SLA clients premium'],
            ['task' => 'client_onboarding', 'user' => 'mehdi', 'days_ago' => 3, 'hour' => 10, 'duration' => 150, 'notes' => 'Formation équipes Zenith'],
            ['task' => 'data_cleanup', 'user' => 'mehdi', 'days_ago' => 4, 'hour' => 15, 'duration' => 60, 'notes' => 'Scripts de normalisation'],
        ];

        foreach ($entries as $entry) {
            $task = $tasks[$entry['task']] ?? null;
            $user = $collaborators[$entry['user']] ?? null;
            if (!$task || !$user) {
                continue;
            }

            $start = $now->copy()->subDays($entry['days_ago'])->setHour($entry['hour'])->setMinute(0)->setSecond(0);
            $end = $start->copy()->addMinutes($entry['duration']);

            TimeEntry::updateOrCreate(
                [
                    'todo_task_id' => $task->id,
                    'user_id' => $user->id,
                    'started_at' => $start,
                ],
                [
                    'ended_at' => $end,
                    'duration_minutes' => $entry['duration'],
                    'source' => 'analytics-demo',
                    'notes' => $entry['notes'],
                ]
            );
        }
    }

    /**
     * @param array<string, TodoTask> $tasks
     * @param array<string, User> $clients
     * @param array<string, User> $collaborators
     */
    private function seedClientInformationRequests(array $tasks, array $clients, array $collaborators, Carbon $now): void
    {
        $requests = [
            [
                'task' => 'reporting_closure',
                'client' => 'atlas',
                'handler' => 'salma',
                'subject' => 'Pièces justificatives Q4',
                'status' => 'resolved',
                'channel' => 'email',
                'requested_days_ago' => 5,
                'response_minutes' => 110,
            ],
            [
                'task' => 'customer_followup',
                'client' => 'atlas',
                'handler' => 'salma',
                'subject' => 'Clarification des SLA',
                'status' => 'in_progress',
                'channel' => 'teams',
                'requested_days_ago' => 2,
                'response_minutes' => null,
            ],
            [
                'task' => 'client_onboarding',
                'client' => 'zenith',
                'handler' => 'mehdi',
                'subject' => 'Accès aux environnements de test',
                'status' => 'pending',
                'channel' => 'email',
                'requested_days_ago' => 1,
                'response_minutes' => null,
            ],
        ];

        foreach ($requests as $request) {
            $task = $tasks[$request['task']] ?? null;
            $client = $clients[$request['client']] ?? null;
            $handler = $collaborators[$request['handler']] ?? null;
            if (!$task || !$client || !$handler) {
                continue;
            }

            $requestedAt = $now->copy()->subDays($request['requested_days_ago'])->setHour(11)->setMinute(0);
            $respondedAt = $request['status'] === 'resolved'
                ? $requestedAt->copy()->addMinutes($request['response_minutes'] ?? 0)
                : null;

            ClientInformationRequest::updateOrCreate(
                [
                    'todo_task_id' => $task->id,
                    'client_id' => $client->id,
                    'subject' => $request['subject'],
                ],
                [
                    'handled_by' => $handler->id,
                    'status' => $request['status'],
                    'channel' => $request['channel'],
                    'requested_at' => $requestedAt,
                    'responded_at' => $respondedAt,
                    'response_minutes' => $request['response_minutes'],
                    'notes' => $request['subject'],
                ]
            );
        }
    }
}
