<?php

namespace App\Http\Controllers;

use App\Models\Pointage;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PointageController extends Controller
{
    /* -----------------------------------------------------------
     | Utils
     |------------------------------------------------------------
     */

    /**
     * Normalize "HH:MM" => "HH:MM:SS" (keeps nulls as is).
     */
    private function normalizeTime(?string $t): ?string
    {
        if ($t === null || $t === '') return null;
        // Accept "HH:MM" or "HH:MM:SS"
        if (preg_match('/^\d{2}:\d{2}$/', $t)) {
            return $t . ':00';
        }
        return $t; // already HH:MM:SS (validated before call)
    }

    /**
     * Split an overnight pointage (heureSortie <= heureEntree) into two rows:
     * - row 1: same date, heureEntree -> 23:59:59
     * - row 2: date + 1 day, 00:00:00 -> old heureSortie
     *
     * Applies only for statutJour in ['present','retard'] and when both times are present.
     */
    private function splitOvernightIfNeeded(Pointage $p): void
    {
        // Reload fresh state (avoid stale props after update)
        $p->refresh();

        if (empty($p->heureEntree) || empty($p->heureSortie)) return;
        if (!in_array($p->statutJour, ['present', 'retard'])) return;

        $entree = $this->normalizeTime($p->heureEntree);
        $sortie = $this->normalizeTime($p->heureSortie);

        // Build DateTime from date + time
        $start = Carbon::createFromFormat('Y-m-d H:i:s', $p->date . ' ' . $entree);
        $end   = Carbon::createFromFormat('Y-m-d H:i:s', $p->date . ' ' . $sortie);

        // Overnight if end <= start (ex: 22:00 -> 08:00 next day)
        if ($end->lessThanOrEqualTo($start)) {
            DB::transaction(function () use ($p, $sortie) {
                // 1) close the original to 23:59:59 (same date)
                $p->update([
                    'heureSortie' => '23:59:59',
                ]);

                // 2) insert next-day row
                Pointage::create([
                    'user_id'       => $p->user_id,
                    'date'          => Carbon::parse($p->date)->addDay()->toDateString(),
                    'heureEntree'   => '00:00:00',
                    'heureSortie'   => $sortie,          // original sortie
                    'statutJour'    => $p->statutJour,
                    'overtimeHours' => 0,                // recalc later if you have logic
                    'societe_id'    => $p->societe_id,
                    'valider'       => $p->valider,      // keep same validation state
                ]);
            });
        }
    }

    /* -----------------------------------------------------------
     | INDEX
     |------------------------------------------------------------
     */

    public function index()
    {
        $user = auth()->user();

        if ($user->hasAnyRole(['RH', 'Gest_RH'])) {
            $userIds = User::where('societe_id', $user->societe_id)
                ->pluck('id');

            return Pointage::with(['user', 'societe'])
                ->whereIn('user_id', $userIds)
                ->get();
        }

        if ($user->hasAnyRole(['Chef_Dep', 'Chef_Projet','Chef_Chant'])) {
            $userIds = User::where('departement_id', $user->departement_id)
                ->where('societe_id', $user->societe_id)
                ->where('statut', '!=', 'Inactif')
                ->pluck('id');

            return Pointage::with(['user', 'societe'])
                ->whereIn('user_id', $userIds)
                ->get();
        }

        if ($user->hasRole('Employe')) {
            if ($user->statut !== 'Inactif') {
                return Pointage::with(['user', 'societe'])
                    ->where('user_id', $user->id)
                    ->get();
            } else {
                return response()->json(['message' => 'Compte inactif.'], 403);
            }
        }

        return response()->json(['message' => 'Accès non autorisé.'], 403);
    }

    /* -----------------------------------------------------------
     | STORE
     |------------------------------------------------------------
     */

    public function store(Request $request)
    {
        $rules = [
            'user_id'       => 'required|exists:users,id',
            'date'          => 'required|date',
            'heureEntree'   => ['nullable','regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'heureSortie'   => ['nullable','regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'statutJour'    => 'nullable|in:present,absent,retard,non_pointe',
            'overtimeHours' => 'nullable|numeric',
            'societe_id'    => 'required|exists:societes,id',
            'valider'       => 'nullable|integer',
            // departement_id & fonction auto-remplis; validation presence côté user_id
        ];

        $payload   = $request->all();
        $authUser  = auth()->user();
        $societeId = $authUser->societe_id;
        $valider   = 0;

        // Batch insert
        if (isset($payload[0]) && is_array($payload[0])) {
            foreach ($payload as $p) {
                if (!is_array($p)) continue;
                $p['societe_id'] = $societeId;
                $p['valider']    = $valider;

                // Auto fetch user departement & fonction snapshot
                $targetUser = User::find($p['user_id'] ?? null);
                if ($targetUser) {
                    $p['departement_id'] = $targetUser->departement_id;
                    $p['fonction']       = $targetUser->fonction;
                }

                $validated = validator($p, $rules)->validate();

                // Normalize times to HH:MM:SS
                $validated['heureEntree'] = $this->normalizeTime($validated['heureEntree'] ?? null);
                $validated['heureSortie'] = $this->normalizeTime($validated['heureSortie'] ?? null);

                $created = Pointage::create($validated);
                $this->splitOvernightIfNeeded($created);
            }
            return response()->json(['message' => 'Pointages ajoutés', 'societe_id' => $societeId]);
        }

        // Single insert
        $payload['societe_id'] = $societeId;
        $payload['valider']    = $valider;

        $validated = validator($payload, $rules)->validate();

        // Snapshot user departement/fonction
        $targetUser = User::find($validated['user_id']);
        if ($targetUser) {
            $validated['departement_id'] = $targetUser->departement_id;
            $validated['fonction']       = $targetUser->fonction;
        }
        $validated['heureEntree'] = $this->normalizeTime($validated['heureEntree'] ?? null);
        $validated['heureSortie'] = $this->normalizeTime($validated['heureSortie'] ?? null);

        $pointage = Pointage::create($validated);
        $this->splitOvernightIfNeeded($pointage);

        return response()->json($pointage);
    }

    /* -----------------------------------------------------------
     | UPDATE
     |------------------------------------------------------------
     */

    public function update(Request $request)
    {
        $datas = $request->all();
        $rules = [
            'heureEntree'   => ['nullable','regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'heureSortie'   => ['nullable','regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'statutJour'    => 'sometimes|in:present,absent,retard,non_pointe',
            'overtimeHours' => 'nullable|numeric',
            'societe_id'    => 'sometimes|exists:societes,id',
        ];

        // Batch update
        if (isset($datas[0]) && is_array($datas[0])) {
            foreach ($datas as $updateData) {
                if (!is_array($updateData) || !isset($updateData['id'])) continue;

                $pointage = Pointage::findOrFail($updateData['id']);
                $validated = validator($updateData, $rules)->validate();

                if (array_key_exists('heureEntree', $validated)) {
                    $validated['heureEntree'] = $this->normalizeTime($validated['heureEntree']);
                }
                if (array_key_exists('heureSortie', $validated)) {
                    $validated['heureSortie'] = $this->normalizeTime($validated['heureSortie']);
                }

                $pointage->update($validated);
                $this->splitOvernightIfNeeded($pointage);
            }
            return response()->json(['message' => 'Pointages modifiés']);
        }

        // Single update
        if (!is_array($datas) || !isset($datas['id'])) {
            return response()->json(['message' => 'Format de données incorrect ou id manquant'], 422);
        }

        $pointage = Pointage::findOrFail($datas['id']);
        $validated = validator($datas, $rules)->validate();

        if (array_key_exists('heureEntree', $validated)) {
            $validated['heureEntree'] = $this->normalizeTime($validated['heureEntree']);
        }
        if (array_key_exists('heureSortie', $validated)) {
            $validated['heureSortie'] = $this->normalizeTime($validated['heureSortie']);
        }

        $pointage->update($validated);
        $this->splitOvernightIfNeeded($pointage);

        return response()->json(['message' => 'Pointage modifié']);
    }

    /* -----------------------------------------------------------
     | DESTROY
     |------------------------------------------------------------
     */

    public function destroy(Request $request)
    {
        $ids = $request->input('ids');
        Pointage::whereIn('id', $ids)->delete();
        return response()->json(['message' => 'Pointages supprimés']);
    }

    /* -----------------------------------------------------------
     | VALIDER / INVALIDER
     |------------------------------------------------------------
     */

    public function valider($id)
    {
        $pointage = Pointage::findOrFail($id);

        if (empty($pointage->statutJour)) {
            return response()->json([
                'message' => 'Impossible de valider : le statut est obligatoire.'
            ], 422);
        }

        $statut = $pointage->statutJour;

        if (in_array($statut, ['present', 'retard'])) {
            if (empty($pointage->heureEntree) || empty($pointage->heureSortie)) {
                return response()->json([
                    'message' => 'Impossible de valider : heure d’entrée et heure de sortie sont obligatoires pour le statut sélectionné.'
                ], 422);
            }

            // Normalize before split
            $pointage->update([
                'heureEntree' => $this->normalizeTime($pointage->heureEntree),
                'heureSortie' => $this->normalizeTime($pointage->heureSortie),
            ]);

            // Split if overnight then validate
            $this->splitOvernightIfNeeded($pointage);
            $pointage->update(['valider' => 1]);

        } else {
            // absent / non_pointe
            $pointage->update([
                'heureEntree'   => null,
                'heureSortie'   => null,
                'overtimeHours' => 0,
                'valider'       => 1,
            ]);
        }

        return response()->json([
            'message' => 'Pointage validé avec succès.',
            'pointage' => $pointage
        ]);
    }

    public function invalider($id)
    {
        $pointage = Pointage::findOrFail($id);

        if (Auth::user()->hasAnyRole(['RH', 'Gest_RH'])) {
            $pointage->update(['valider' => 0]);

            return response()->json([
                'message' => 'Pointage invalidé avec succès.',
                'pointage' => $pointage
            ]);
        }

        return response()->json(['message' => 'Accès non autorisé. Seul le RH peut invalider les pointages.'], 403);
    }
}
