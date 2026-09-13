<?php

declare(strict_types=1);

namespace App\Http\Controllers\Consumer;

use App\Http\Controllers\Controller;
use App\Services\Search\GlobalSearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GlobalSearchController extends Controller
{
    public function __construct(
        private readonly GlobalSearchService $searchService
    ) {}

    public function search(Request $request): JsonResponse
    {
        $query = trim((string) $request->input('query'));
        if (empty($query) || strlen($query) < 2) {
            return response()->json(['results' => []]);
        }

        /** @var \App\Models\User|null $user */
        $user = Auth::user();
        if (!$user) {
            abort(401, 'Unauthorized');
        }

        $scope = $request->query('scope');
        $results = $this->searchService->search($user, $query, is_string($scope) ? $scope : null);

        return response()->json(['results' => $results]);
    }
}
