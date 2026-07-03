@php
    $logo = \App\Facades\Settings::get('platform_logo', '/images/logo.png');
    $contact = \App\Facades\Settings::get('contact_info', [
        'email' => 'support@likhangkamay.app',
        'phone' => '',
        'address' => '',
    ]);
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Maintenance - {{ \App\Facades\Settings::get('platform_name', 'LikhangKamay') }}</title>
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
    <div class="max-w-xl w-full bg-white rounded-3xl border border-stone-200/60 p-8 md:p-12 shadow-sm text-center space-y-8 relative overflow-hidden">
        <div class="flex flex-col items-center gap-8">
            <!-- Branding -->
            <div class="flex flex-col items-center gap-3">
                <img src="{{ $logo }}" alt="{{ \App\Facades\Settings::get('platform_name', 'LikhangKamay') }}" class="h-14 w-auto object-contain">
                <h1 class="serif text-2xl font-bold text-stone-900">{{ \App\Facades\Settings::get('platform_name', 'LikhangKamay') }}</h1>
            </div>

            <!-- Content -->
            <div class="space-y-4 w-full">
                <div class="w-16 h-16 bg-clay-light text-clay rounded-full flex items-center justify-center border border-clay-light mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div class="space-y-2">
                    <h2 class="text-xl font-bold text-stone-900 tracking-tight">System Refinement in Progress</h2>
                    <p class="text-stone-500 text-xs font-medium leading-relaxed max-w-sm mx-auto">
                        We are currently performing scheduled maintenance to refine the artisan experience. 
                        We will be back shortly with a better, more robust platform.
                    </p>
                </div>
            </div>

            <!-- Meta Info Grid with Clean Separators -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-8 border-t border-stone-100 divide-y divide-stone-100 md:divide-y-0 md:divide-x divide-stone-100">
                <div class="flex flex-col items-center gap-1 md:px-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="text-stone-400 mb-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <p class="text-[9px] font-black text-stone-400 uppercase tracking-widest">Expected Back</p>
                    <p class="text-xs font-bold text-stone-900">1-2 Hours</p>
                </div>
                <div class="flex flex-col items-center gap-1 md:px-2 pt-4 md:pt-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="text-stone-400 mb-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    <p class="text-[9px] font-black text-stone-400 uppercase tracking-widest">Support</p>
                    <p class="text-xs font-bold text-stone-900 break-all select-all">{{ $contact['email'] ?? 'support@likhangkamay.app' }}</p>
                </div>
                <div class="flex flex-col items-center gap-1 md:px-2 pt-4 md:pt-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="text-stone-400 mb-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    <p class="text-[9px] font-black text-stone-400 uppercase tracking-widest">Inquiries</p>
                    <p class="text-xs font-bold text-stone-900">{{ $contact['phone'] ?? 'N/A' }}</p>
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
