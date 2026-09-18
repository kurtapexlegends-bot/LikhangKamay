@php
    try {
        $logo = \App\Facades\Settings::get('platform_logo', '/images/logo.png');
        $platformName = \App\Facades\Settings::get('platform_name', config('app.name', 'LikhangKamay'));
        $contactInfo = \App\Facades\Settings::get('contact_info', []);
        $contactEmail = is_array($contactInfo) ? ($contactInfo['email'] ?? 'likhangkamaybusiness@gmail.com') : 'likhangkamaybusiness@gmail.com';
    } catch (\Throwable $e) {
        $logo = '/images/logo.png';
        $platformName = config('app.name', 'LikhangKamay');
        $contactEmail = 'likhangkamaybusiness@gmail.com';
    }
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Error') - {{ $platformName }}</title>
    <link rel="icon" href="/favicon.ico">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        clay: {
                            50: '#FDF8F5',
                            100: '#F9EFEA',
                            200: '#F2DACE',
                            500: '#A0522D',
                            600: '#8B4513',
                            700: '#70370F',
                            800: '#5C2D0C',
                        },
                    },
                    fontFamily: {
                        sans: ['Figtree', 'sans-serif'],
                        serif: ['Playfair Display', 'serif'],
                    }
                }
            }
        }
    </script>
    <style>
        body { font-family: 'Figtree', sans-serif; background-color: #FDFBF9; }
        .font-serif-brand { font-family: 'Playfair Display', serif; }
    </style>
</head>
<body class="min-h-screen flex flex-col justify-between p-4 sm:p-6 text-stone-800 antialiased selection:bg-clay-100 selection:text-clay-800">
    <!-- Header -->
    <header class="w-full max-w-5xl mx-auto flex items-center justify-between py-4">
        <a href="/" class="flex items-center gap-3 transition-transform duration-200 hover:scale-[1.02] active:scale-95">
            <img src="{{ $logo }}" alt="{{ $platformName }}" class="h-9 w-auto object-contain">
            <span class="font-serif-brand text-lg font-bold tracking-tight text-stone-900">{{ $platformName }}</span>
        </a>
        <nav class="flex items-center gap-2">
            <a href="/shop" class="text-xs font-semibold text-stone-600 hover:text-clay-600 px-3 py-1.5 rounded-lg transition-colors">
                Marketplace
            </a>
            <a href="/" class="text-xs font-semibold text-stone-600 hover:text-clay-600 px-3 py-1.5 rounded-lg transition-colors">
                Home
            </a>
        </nav>
    </header>

    <!-- Main Content Container -->
    <main class="flex-1 flex items-center justify-center py-8">
        <div class="max-w-lg w-full bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-10 shadow-xs text-center relative overflow-hidden">
            <!-- Background Watermark Glow -->
            <div class="absolute -top-16 -right-16 w-36 h-36 bg-clay-50 rounded-full blur-2xl pointer-events-none"></div>
            <div class="absolute -bottom-16 -left-16 w-36 h-36 bg-amber-50 rounded-full blur-2xl pointer-events-none"></div>

            <div class="relative z-10 space-y-6">
                <!-- Icon & Code Badge -->
                <div class="flex flex-col items-center gap-3">
                    <div class="w-16 h-16 rounded-2xl flex items-center justify-center border shadow-2xs @yield('icon-bg', 'bg-stone-50 border-stone-200 text-stone-700')">
                        @yield('icon')
                    </div>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider @yield('badge-style', 'bg-stone-100 text-stone-600')">
                        @yield('code', 'Error')
                    </span>
                </div>

                <!-- Text Headings -->
                <div class="space-y-2">
                    <h1 class="font-serif-brand text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
                        @yield('heading', 'Something went wrong')
                    </h1>
                    <p class="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-md mx-auto font-normal">
                        @yield('message', 'An unexpected error occurred while processing your request.')
                    </p>
                </div>

                <!-- Search or Custom Insertion -->
                @yield('extra')

                <!-- Actions -->
                <div class="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                    @yield('actions')
                </div>
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="w-full max-w-5xl mx-auto py-4 text-center border-t border-stone-200/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-stone-500">
        <p>© {{ date('Y') }} {{ $platformName }}. Handcrafted with pride in the Philippines.</p>
        <p>Need assistance? Contact <a href="mailto:{{ $contactEmail }}" class="font-semibold text-stone-700 hover:text-clay-600 underline decoration-stone-300">{{ $contactEmail }}</a></p>
    </footer>
</body>
</html>
