<?php

declare(strict_types=1);

namespace App\Http\Controllers\Core;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReverseGeocodeRequest;
use App\Services\AddressGeocodingService;
use Illuminate\Http\JsonResponse;

class GeocodingController extends Controller
{
    /**
     * Reverse-geocode coordinates into normalized Cavite/Philippine address fields.
     */
    public function reverse(ReverseGeocodeRequest $request, AddressGeocodingService $geocodingService): JsonResponse
    {
        $validated = $request->validated();

        $result = $geocodingService->reverseGeocode(
            (float) $validated['latitude'],
            (float) $validated['longitude']
        );

        return response()->json($result);
    }
}
