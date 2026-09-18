@extends('errors.layout')

@section('title', 'Workshop Error')
@section('code', '500 • Internal Error')

@section('icon-bg', 'bg-rose-50 border-rose-200 text-rose-700')

@section('icon')
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
</svg>
@endsection

@section('badge-style', 'bg-rose-50 border border-rose-200/60 text-rose-800')

@section('heading', 'Workshop Interruption')

@section('message', 'Our system encountered an unexpected snag while preparing this page. Rest assured your account data is safe, and our engineers are actively investigating.')

@section('actions')
<button 
    type="button" 
    onclick="window.location.reload()" 
    class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-sm transition active:scale-[0.98] cursor-pointer"
>
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
        <path d="M8 16H3v5"/>
    </svg>
    <span>Try Again</span>
</button>

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
