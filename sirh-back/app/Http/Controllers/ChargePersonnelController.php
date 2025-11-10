<?php
namespace App\Http\Controllers;

use App\Models\ChargePersonnel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ChargePersonnelController extends Controller
{
    // GET /charge-personnels?societe_id=..&year=2025
    public function index(Request $request)
    {
        $q = ChargePersonnel::query();
        if ($request->filled('societe_id')) {
            $q->where('societe_id', (int)$request->input('societe_id'));
        }
        if ($request->filled('year')) {
            $year = (int)$request->input('year');
            $q->whereYear('mois', $year);
        }
        return response()->json($q->orderBy('mois', 'asc')->get());
    }

    // POST /charge-personnels (upsert par societe_id+mois)
    public function store(Request $request)
    {
        $data = $this->validateData($request);
        [$societeId, $mois] = [$data['societe_id'], $data['mois']];

        // Interdire les mois futurs
        $moisDate = new \DateTime($mois);
        $now = new \DateTime();
        $now->modify('first day of this month')->setTime(0, 0, 0);
        if ($moisDate > $now) {
            return response()->json([
                'message' => 'Vous ne pouvez pas ajouter un mois futur.'
            ], 422);
        }

        // Interdire la recréation: si déjà existant pour (societe, mois), renvoyer 409
        $exists = ChargePersonnel::where('societe_id', $societeId)
            ->where('mois', $mois)
            ->exists();
        if ($exists) {
            return response()->json([
                'message' => 'Un enregistrement existe déjà pour ce mois.'
            ], 409);
        }

        $payload = $this->payloadFrom($data);
        $record = ChargePersonnel::create($payload);
        return response()->json($record, 201);
    }

    public function show($id)
    {
        $rec = ChargePersonnel::findOrFail($id);
        return response()->json($rec);
    }

    public function update(Request $request, $id)
    {
        $rec = ChargePersonnel::findOrFail($id);
        $data = $this->validateData($request, partial: true);
        if (isset($data['mois'])) {
            $data['mois'] = $this->normalizeMonth($data['mois']);
        }
        
        // Empêcher collision (societe_id, mois) avec un autre enregistrement
        $newSocieteId = $data['societe_id'] ?? $rec->societe_id;
        $newMois = $data['mois'] ?? $rec->mois;
        
        // Interdire les mois futurs
        $moisDate = new \DateTime($newMois);
        $now = new \DateTime();
        $now->modify('first day of this month')->setTime(0, 0, 0);
        if ($moisDate > $now) {
            return response()->json([
                'message' => 'Vous ne pouvez pas modifier vers un mois futur.'
            ], 422);
        }
        
        $collision = ChargePersonnel::where('societe_id', $newSocieteId)
            ->where('mois', $newMois)
            ->where('id', '!=', $rec->id)
            ->exists();
        if ($collision) {
            return response()->json([
                'message' => 'Un enregistrement existe déjà pour ce mois.'
            ], 409);
        }
        $rec->fill($this->payloadFrom($data));
        $rec->save();
        return response()->json($rec);
    }

    public function destroy($id)
    {
        // Suppression interdite par règle métier
        return response()->json([
            'message' => 'Suppression interdite pour les charges du personnel.'
        ], 403);
    }

    private function validateData(Request $request, bool $partial = false): array
    {
        $rules = [
            'societe_id' => [$partial ? 'sometimes' : 'required', 'integer'],
            // accepte "YYYY-MM" ou date complète
            'mois' => [$partial ? 'sometimes' : 'required', 'string'],
            'salaire_permanent' => ['sometimes', 'numeric'],
            'charge_salaire_permanent' => ['sometimes', 'numeric'],
            'salaire_temporaire' => ['sometimes', 'numeric'],
            'charge_salaire_temp' => ['sometimes', 'numeric'],
            'autres_charge' => ['sometimes', 'numeric'],
        ];
        $data = $request->validate($rules);
        if (isset($data['mois'])) {
            $data['mois'] = $this->normalizeMonth($data['mois']);
        }
        return $data;
    }

    private function normalizeMonth(string $value): string
    {
        $value = trim($value);
        // Formats acceptés: YYYY-MM ou YYYY-MM-DD
        if (preg_match('/^\d{4}-\d{2}$/', $value)) {
            return $value . '-01';
        }
        // Tenter un strtotime pour d'autres formats
        $ts = strtotime($value);
        if ($ts !== false) {
            return date('Y-m-01', $ts);
        }
        // défaut: aujourd'hui -> 1er du mois
        return date('Y-m-01');
    }

    private function payloadFrom(array $data): array
    {
        return [
            'societe_id' => $data['societe_id'] ?? null,
            'mois' => $data['mois'] ?? null,
            'salaire_permanent' => $data['salaire_permanent'] ?? 0,
            'charge_salaire_permanent' => $data['charge_salaire_permanent'] ?? 0,
            'salaire_temporaire' => $data['salaire_temporaire'] ?? 0,
            'charge_salaire_temp' => $data['charge_salaire_temp'] ?? 0,
            'autres_charge' => $data['autres_charge'] ?? 0,
        ];
    }
}
