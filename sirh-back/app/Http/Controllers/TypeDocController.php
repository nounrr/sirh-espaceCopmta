<?php

namespace App\Http\Controllers;

use App\Models\TypeDoc;
use Illuminate\Http\Request;

class TypeDocController extends Controller
{
    public function index(Request $request)
    {
        $perPage = (int)($request->query('per_page', 15));
        $perPage = $perPage > 0 ? $perPage : 15;
        $page = (int)($request->query('page', 1));
        $query = TypeDoc::query();
        if ($search = $request->query('search')) {
            $query->where('nom','LIKE',"%$search%");
        }
        if ($typeContrat = $request->query('type_contrat')) {
            $query->where('type_contrat',$typeContrat);
        }
        $paginator = $query->paginate($perPage,['*'],'page',$page);
        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ]
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nom' => 'required|string|max:255',
            'type_contrat' => 'required|in:Client,Employe',
        ]);

        return TypeDoc::create($request->only(['nom','type_contrat']));
    }

    public function show(TypeDoc $typeDoc)
    {
        return $typeDoc;
    }

    public function update(Request $request, TypeDoc $typeDoc)
    {
        $request->validate([
            'nom' => 'required|string|max:255',
            'type_contrat' => 'sometimes|in:Client,Employe',
        ]);

        $typeDoc->update($request->only(['nom','type_contrat']));
        return $typeDoc;
    }

    public function destroy(TypeDoc $typeDoc)
    {
        $typeDoc->delete();
        return response()->json(null, 204);
    }
}