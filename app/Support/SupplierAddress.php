<?php

declare(strict_types=1);

namespace App\Support;

class SupplierAddress
{
    /**
     * Supported provinces for supplier warehouses and raw material dispatch (Cavite + GMA).
     */
    public const SUPPORTED_PROVINCES = [
        'Cavite',
        'Metro Manila',
        'Laguna',
        'Rizal',
        'Bulacan',
        'Batangas',
    ];

    /**
     * Key industrial and commercial cities in Cavite + Greater Manila Area (GMA) served by Lalamove.
     *
     * @var array<string, list<string>>
     */
    public const REGIONAL_CITIES = [
        'Cavite' => [
            'Bacoor City', 'Carmona', 'Cavite City', 'Dasmariñas City', 'General Trias City',
            'Imus City', 'Tagaytay City', 'Trece Martires City', 'Alfonso', 'Amadeo',
            'General Emilio Aguinaldo', 'General Mariano Alvarez', 'Indang', 'Kawit',
            'Magallanes', 'Maragondon', 'Mendez', 'Naic', 'Noveleta', 'Rosario',
            'Silang', 'Tanza', 'Ternate',
        ],
        'Metro Manila' => [
            'Caloocan', 'Las Piñas', 'Makati', 'Malabon', 'Mandaluyong', 'Manila',
            'Marikina', 'Muntinlupa', 'Navotas', 'Parañaque', 'Pasay', 'Pasig',
            'Quezon City', 'San Juan', 'Taguig', 'Valenzuela', 'Pateros',
        ],
        'Laguna' => [
            'San Pedro City', 'Biñan City', 'Santa Rosa City', 'Cabuyao City', 'Calamba City',
            'Los Baños', 'San Pablo City', 'Santa Cruz',
        ],
        'Rizal' => [
            'Antipolo City', 'Cainta', 'Taytay', 'San Mateo', 'Rodriguez', 'Angono', 'Binangonan',
        ],
        'Bulacan' => [
            'San Jose del Monte City', 'Meycauayan City', 'Marilao', 'Bocaue', 'Santa Maria', 'Malolos City',
        ],
        'Batangas' => [
            'Santo Tomas City', 'Tanauan City', 'Lipá City', 'Batangas City', 'Malvar',
        ],
    ];

    /**
     * Approximate coordinates for major supplier logistics hubs.
     *
     * @var array<string, array{lat: float, lng: float}>
     */
    public const HUB_COORDINATES = [
        'bacoor' => ['lat' => 14.4624, 'lng' => 120.9645],
        'dasmarinas' => ['lat' => 14.3294, 'lng' => 120.9367],
        'general trias' => ['lat' => 14.3867, 'lng' => 120.8812],
        'carmona' => ['lat' => 14.3142, 'lng' => 121.0583],
        'manila' => ['lat' => 14.5995, 'lng' => 120.9842],
        'quezon city' => ['lat' => 14.6760, 'lng' => 121.0437],
        'pasig' => ['lat' => 14.5764, 'lng' => 121.0851],
        'taguig' => ['lat' => 14.5176, 'lng' => 121.0509],
        'muntinlupa' => ['lat' => 14.4081, 'lng' => 121.0415],
        'calamba' => ['lat' => 14.2117, 'lng' => 121.1656],
        'santa rosa' => ['lat' => 14.3122, 'lng' => 121.1114],
        'antipolo' => ['lat' => 14.5842, 'lng' => 121.1763],
    ];

    /**
     * Check if a province is supported for supplier operations.
     */
    public static function isSupportedProvince(string $province): bool
    {
        return in_array(trim($province), self::SUPPORTED_PROVINCES, true);
    }
}
