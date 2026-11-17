/**
 * Supported delivery provinces and cities across Cavite and Greater Luzon.
 * Aligns with App\Support\RegionalDeliveryAddress on the backend.
 */

export const SUPPORTED_DELIVERY_PROVINCES = [
    'Cavite',
    'Metro Manila',
    'Laguna',
    'Batangas',
    'Rizal',
    'Bulacan',
    'Pampanga',
    'Bataan',
    'Tarlac',
    'Nueva Ecija',
    'Pangasinan',
    'Zambales',
    'Quezon',
];

export const REGIONAL_CITIES_BY_PROVINCE = {
    'Metro Manila': [
        'City of Manila',
        'Quezon City',
        'Makati City',
        'Taguig City',
        'Pasig City',
        'Mandaluyong City',
        'San Juan City',
        'Pasay City',
        'Parañaque City',
        'Las Piñas City',
        'Muntinlupa City',
        'Marikina City',
        'Caloocan City',
        'Malabon City',
        'Navotas City',
        'Valenzuela City',
        'Pateros',
    ],
    'Laguna': [
        'San Pedro City',
        'Biñan City',
        'Santa Rosa City',
        'Cabuyao City',
        'Calamba City',
        'Los Baños',
        'San Pablo City',
        'Santa Cruz',
        'Pagsanjan',
        'Bay',
    ],
    'Batangas': [
        'Santo Tomas City',
        'Tanauan City',
        'Lipa City',
        'Batangas City',
        'Malvar',
        'Nasugbu',
        'Lian',
        'Calatagan',
        'Balayan',
        'Lemery',
        'Taal',
        'Bauan',
        'San Jose',
    ],
    'Rizal': [
        'Antipolo City',
        'Cainta',
        'Taytay',
        'San Mateo',
        'Rodriguez (Montalban)',
        'Angono',
        'Binangonan',
        'Tanay',
    ],
    'Bulacan': [
        'San Jose del Monte City',
        'Meycauayan City',
        'Marilao',
        'Bocaue',
        'Santa Maria',
        'Malolos City',
        'Baliwag City',
        'Plaridel',
    ],
    'Pampanga': [
        'City of San Fernando',
        'Angeles City',
        'Mabalacat City',
        'Guagua',
        'Lubao',
    ],
    'Bataan': [
        'Balanga City',
        'Mariveles',
    ],
    'Tarlac': [
        'Tarlac City',
    ],
    'Nueva Ecija': [
        'Cabanatuan City',
        'Gapan City',
    ],
    'Pangasinan': [
        'Dagupan City',
    ],
    'Quezon': [
        'Lucena City',
        'Tayabas City',
        'Sariaya',
        'Candelaria',
        'Tiaong',
    ],
};

export const isSupportedDeliveryProvince = (province) => {
    if (!province || typeof province !== 'string') return false;
    const clean = province.trim().toLowerCase();
    return SUPPORTED_DELIVERY_PROVINCES.some(
        (p) => p.toLowerCase() === clean || (clean === 'ncr' && p === 'Metro Manila')
    );
};

export const getRegionalCitiesForProvince = (province) => {
    if (!province) return [];
    const matchedKey = Object.keys(REGIONAL_CITIES_BY_PROVINCE).find(
        (p) => p.toLowerCase() === province.trim().toLowerCase()
    );
    return matchedKey ? REGIONAL_CITIES_BY_PROVINCE[matchedKey] : [];
};
