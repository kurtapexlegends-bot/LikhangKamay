<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        {{-- SEO Metadata --}}
        @php
            try {
                $seo = \App\Facades\Settings::get('seo_metadata', []);
                if (is_string($seo)) {
                    $seo = json_decode($seo, true) ?: [];
                }
                if (!is_array($seo)) {
                    $seo = [];
                }
                $platformName = \App\Facades\Settings::get('platform_name', config('app.name', 'LikhangKamay')) ?: 'LikhangKamay';
                $primaryColor = \App\Facades\Settings::get('primary_color', '#8B4513') ?: '#8B4513';
                $favicon = \App\Facades\Settings::get('favicon', '/favicon.ico') ?: '/favicon.ico';
            } catch (\Throwable $e) {
                $seo = [];
                $platformName = config('app.name', 'LikhangKamay');
                $primaryColor = '#8B4513';
                $favicon = '/favicon.ico';
            }
        @endphp
        
        <meta name="description" content="{{ is_array($seo) ? ($seo['description'] ?? 'LikhangKamay | Artisan Marketplace') : 'LikhangKamay | Artisan Marketplace' }}">
        <meta name="keywords" content="{{ is_array($seo) ? ($seo['keywords'] ?? 'artisan, philippines, crafts') : 'artisan, philippines, crafts' }}">

        <title inertia>{{ $platformName }}</title>

        <link rel="icon" href="{{ $favicon }}">

        <!-- Dynamic Primary Color -->
        @php
            $cleanHex = str_replace('#', '', $primaryColor ?? '8B4513');
            if (strlen($cleanHex) === 3) {
                $r = hexdec(substr($cleanHex, 0, 1) . substr($cleanHex, 0, 1));
                $g = hexdec(substr($cleanHex, 1, 1) . substr($cleanHex, 1, 1));
                $b = hexdec(substr($cleanHex, 2, 1) . substr($cleanHex, 2, 1));
            } elseif (strlen($cleanHex) === 6) {
                $r = hexdec(substr($cleanHex, 0, 2));
                $g = hexdec(substr($cleanHex, 2, 2));
                $b = hexdec(substr($cleanHex, 4, 2));
            } else {
                $r = 139; $g = 69; $b = 19;
            }
            $rgb = "$r, $g, $b";
        @endphp
        <style>
            :root {
                --primary-brand: {{ $primaryColor }};
                --primary-brand-rgb: {{ $rgb }};
            }
        </style>

        <!-- Fonts -->
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Figtree:wght@300;400;500;600;700&display=swap" rel="stylesheet">

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.jsx'])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>

