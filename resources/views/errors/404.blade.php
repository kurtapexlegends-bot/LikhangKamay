@extends('errors.layout')

@section('title', 'Page Not Found')
@section('code', '404 • Not Found')

@section('icon-bg', 'bg-clay-50 border-clay-200 text-clay-700')

@section('icon')
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
</svg>
@endsection

@section('badge-style', 'bg-amber-50 border border-amber-200/60 text-amber-800')

@section('heading', 'Piece Not Found')

@section('message', 'The artisan craft, studio profile, or page you were looking for doesn\'t exist, has been moved, or is no longer listed in our workshop catalog.')

@section('extra')
<form action="/shop" method="GET" class="relative max-w-sm mx-auto w-full">
    <input 
        type="text" 
        name="search" 
        placeholder="Search crafts, studios, or materials..." 
        class="w-full text-xs rounded-xl border border-stone-200 bg-stone-50/80 pl-9 pr-4 py-2.5 text-stone-800 placeholder-stone-400 focus:bg-white focus:border-clay-600 focus:outline-none focus:ring-1 focus:ring-clay-600 transition shadow-2xs"
    >
    <svg class="absolute left-3 top-3 text-stone-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
</form>
@endsection

@section('actions')
<a 
    href="/shop" 
    class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-sm transition active:scale-[0.98]"
>
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
        <path d="M3 6h18"/>
        <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
    <span>Explore Marketplace</span>
</a>

<a 
    href="/" 
    class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold shadow-2xs transition active:scale-[0.98]"
>
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
    <span>Return Home</span>
</a>
@endsection
