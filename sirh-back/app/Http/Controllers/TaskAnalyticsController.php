<?php

namespace App\Http\Controllers;

use App\Services\ReportExportService;
use App\Services\TaskAnalyticsService;
use Illuminate\Http\Request;

class TaskAnalyticsController extends Controller
{
    public function __construct(
        private readonly TaskAnalyticsService $analyticsService,
        private readonly ReportExportService $exportService
    )
    {
    }

    public function overview(Request $request)
    {
        $filters = $request->only([
            'client_id',
            'collaborator_id',
            'project_id',
            'category',
            'date_from',
            'date_to',
        ]);

        $data = $this->analyticsService->buildOverview($filters);
        $data = $this->filterResponseByRole($request, $data);

        return response()->json($data);
    }

    public function exportCollaborators(Request $request)
    {
        $filters = $request->only(['client_id', 'project_id', 'date_from', 'date_to']);
        $data = $this->analyticsService->buildOverview($filters);
        $payload = $this->analyticsService->prepareDatasetForExport($data, 'collaborators');

        if (!$payload) {
            return response()->json(['error' => 'Impossible de générer le rapport'], 422);
        }

        return $this->exportService->stream($payload, 'csv', 'rapport_collaborateurs');
    }

    public function export(Request $request)
    {
        $filters = $request->only([
            'client_id',
            'collaborator_id',
            'project_id',
            'category',
            'date_from',
            'date_to',
        ]);

        $dataset = $request->get('dataset', 'collaborators');
        $format = $request->get('format', 'csv');

        $overview = $this->analyticsService->buildOverview($filters);
        $payload = $this->analyticsService->prepareDatasetForExport($overview, $dataset);

        if (!$payload) {
            return response()->json([
                'error' => 'Dataset inconnu'
            ], 422);
        }

        $filename = sprintf('analytics_%s_%s', $dataset, now()->format('Ymd_His'));

        try {
            return $this->exportService->stream($payload, $format, $filename);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function periodicSummary(Request $request)
    {
        $filters = $request->only([
            'client_id',
            'collaborator_id',
            'project_id',
            'category',
            'date_from',
            'date_to',
        ]);

        $overview = $this->analyticsService->buildOverview($filters);

        return response()->json([
            'collaborators' => $overview['periodic_collaborators'],
            'clients' => $overview['periodic_clients'],
        ]);
    }

    protected function filterResponseByRole(Request $request, array $payload): array
    {
        $user = $request->user();
        if (!$user) {
            $payload['cost_summary'] = null;
            return $payload;
        }

        $roles = ['admin', 'finance', 'rh', 'gest_rh'];
        $canViewCost = false;

        if (method_exists($user, 'hasAnyRole')) {
            try {
                $canViewCost = $user->hasAnyRole($roles);
            } catch (\Throwable $e) {
                // Certaines bases de test ne chargent pas les tables des rôles
            }
        }

        if (!$canViewCost) {
            $canViewCost = in_array(strtolower((string) $user->role), $roles, true);
        }

        if (!$canViewCost) {
            $payload['cost_summary'] = null;
        }

        return $payload;
    }
}
