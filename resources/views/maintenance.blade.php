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
        :root {
            --primary: {{ \App\Facades\Settings::get('primary_color', '#8B4513') }};
        }
    </style>
</head>
<body class="bg-[#FDFBF9] min-h-screen flex items-center justify-center p-6">
    <div class="max-w-xl w-full bg-white rounded-[40px] border border-stone-100 p-12 text-center shadow-xl space-y-8">
        <div class="space-y-4">
            <h1 class="serif text-3xl font-bold text-stone-900">{{ \App\Facades\Settings::get('platform_name', 'Likhang Kamay') }}</h1>
            <div class="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-500 mx-auto border border-amber-100">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m12 8 4 4"/><path d="m16 8-4 4"/><path d="M12 16h.01"/></svg>
            </div>
            <h2 class="text-2xl font-black text-gray-900">Maintenance in Progress</h2>
            <p class="text-stone-500 font-medium leading-relaxed">
                We're refining the platform to better serve our artisan community. 
                Please check back with us soon.
            </p>
        </div>
        
        <div class="pt-8 border-t border-stone-50 flex flex-col items-center gap-2">
            <p class="text-[10px] font-black text-stone-400 uppercase tracking-widest">Administrator?</p>
            <a href="/login" class="text-xs font-bold text-stone-900 underline underline-offset-4">Sign in to manage</a>
        </div>
    </div>
</body>
</html>
