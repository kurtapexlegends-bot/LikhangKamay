<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        {{-- SEO Metadata --}}
        @php
            $seo = \App\Facades\Settings::get('seo_metadata', []);
            $platformName = \App\Facades\Settings::get('platform_name', config('app.name', 'Likhang Kamay'));
            $primaryColor = \App\Facades\Settings::get('primary_color', '#8B4513');
        @endphp
        
        <meta name="description" content="{{ $seo['description'] ?? 'Likhang Kamay | Artisan Marketplace' }}">
        <meta name="keywords" content="{{ $seo['keywords'] ?? 'artisan, philippines, crafts' }}">

        <title inertia>{{ $platformName }}</title>

        <link rel="icon" href="{{ \App\Facades\Settings::get('favicon', '/favicon.ico') }}">

        <!-- Dynamic Primary Color -->
        @php
            $hex = str_replace('#', '', $primaryColor ?? '#8B4513');
            if(strlen($hex) == 3) {
                $r = hexdec(substr($hex,0,1).substr($hex,0,1));
                $g = hexdec(substr($hex,1,1).substr($hex,1,1));
                $b = hexdec(substr($hex,2,1).substr($hex,2,1));
            } else {
                $r = hexdec(substr($hex,0,2));
                $g = hexdec(substr($hex,2,2));
                $b = hexdec(substr($hex,4,2));
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
        @vite(['resources/css/app.css', 'resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>

