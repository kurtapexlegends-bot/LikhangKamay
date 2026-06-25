<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Maintenance - {{ \App\Facades\Settings::get('platform_name', 'Likhang Kamay') }}</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Figtree:wght@400;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Figtree', sans-serif; }
        .serif { font-family: 'Playfair Display', serif; }
        .text-clay { color: #8B4513; }
        .bg-clay-light { background-color: rgba(139, 69, 19, 0.04); }
        .border-clay-light { border-color: rgba(139, 69, 19, 0.15); }
    </style>
</head>
<body class="bg-[#FAF9F5] min-h-screen flex flex-col items-center justify-center p-6 text-stone-800">
    <div class="max-w-md w-full bg-white rounded-3xl border border-stone-200/60 p-8 md:p-12 shadow-sm text-center space-y-8 relative">
        <div class="flex flex-col items-center gap-8">
            <!-- Branding -->
            <div class="flex flex-col items-center gap-2">
                <h1 class="serif text-2xl font-bold text-stone-900">{{ \App\Facades\Settings::get('platform_name', 'Likhang Kamay') }}</h1>
            </div>

            <!-- Content -->
            <div class="space-y-4">
                <div class="w-16 h-16 bg-clay-light text-clay rounded-full flex items-center justify-center border border-clay-light mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div class="space-y-2">
                    <h2 class="text-xl font-bold text-stone-900 tracking-tight">System Refinement in Progress</h2>
                    <p class="text-stone-500 text-xs font-medium leading-relaxed max-w-xs mx-auto">
                        We are currently performing scheduled maintenance to refine the artisan experience. 
                        We will be back shortly with a better, more robust platform.
                    </p>
                </div>
            </div>
        </div>
        
        <!-- Administrator Link -->
        <div class="pt-4 border-t border-stone-100">
            <a href="/login" class="text-[9px] font-bold text-stone-400 uppercase tracking-widest hover:text-clay transition-colors duration-250">Administrator Access</a>
        </div>
    </div>

    <!-- SEO Footnote -->
    <p class="mt-8 text-[10px] text-stone-400 font-medium tracking-wide">
        Thank you for your patience and for supporting local Filipino artisans.
    </p>
</body>
</html>
