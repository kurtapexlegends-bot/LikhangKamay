/* global route */
import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Compass, AlertTriangle, Lock, Search, ShoppingBag, Home, RefreshCw } from 'lucide-react';

export default function ErrorPage({ status = 404, message = null }) {
    const [searchTerm, setSearchTerm] = useState('');

    const safeRoute = (name, params) => {
        try {
            if (typeof route === 'function') return route(name, params);
        } catch {
            // fallback
        }
        return name === 'shop.index' ? '/shop' : '/';
    };

    const handleSearch = (e) => {
        e.preventDefault();
        const url = safeRoute('shop.index');
        if (searchTerm.trim()) {
            router.get(url, { search: searchTerm.trim() });
        } else {
            router.get(url);
        }
    };

    const config = {
        404: {
            code: '404 • Not Found',
            title: 'Piece Not Found',
            description: message || "The artisan craft, studio profile, or page you were looking for doesn't exist, has been moved, or is no longer listed.",
            badgeClass: 'bg-amber-50 border border-amber-200/60 text-amber-800',
            iconContainerClass: 'bg-clay-50 border border-clay-200 text-clay-700',
            icon: Compass,
            showSearch: true,
        },
        500: {
            code: '500 • Internal Error',
            title: 'Workshop Interruption',
            description: message || 'Our system encountered an unexpected snag while preparing this page. Rest assured your account data is safe, and our team is investigating.',
            badgeClass: 'bg-rose-50 border border-rose-200/60 text-rose-800',
            iconContainerClass: 'bg-rose-50 border border-rose-200 text-rose-700',
            icon: AlertTriangle,
            showSearch: false,
        },
        403: {
            code: '403 • Restricted',
            title: 'Access Restricted',
            description: message || 'You do not have permission to access this private artisan studio, staff capability, or administrative area.',
            badgeClass: 'bg-amber-50 border border-amber-200/60 text-amber-800',
            iconContainerClass: 'bg-amber-50 border border-amber-200 text-amber-800',
            icon: Lock,
            showSearch: false,
        },
    }[status] || {
        code: `${status} • Error`,
        title: 'Unexpected Snag',
        description: message || 'An unexpected error occurred. Please try navigating back or returning home.',
        badgeClass: 'bg-stone-100 border border-stone-200 text-stone-700',
        iconContainerClass: 'bg-stone-50 border border-stone-200 text-stone-700',
        icon: AlertTriangle,
        showSearch: false,
    };

    const Icon = config.icon;

    return (
        <>
            <Head title={`${config.title} - LikhangKamay`} />

            <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 bg-[#FDFBF9] text-stone-800 antialiased selection:bg-clay-100 selection:text-clay-800">
                {/* Header */}
                <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-4">
                    <Link href="/" className="flex items-center gap-3 transition-transform hover:scale-[1.02] active:scale-95">
                        <img src="/images/logo.png" alt="LikhangKamay" className="h-9 w-auto object-contain" />
                        <span className="font-serif text-lg font-bold tracking-tight text-stone-900">LikhangKamay</span>
                    </Link>
                    <nav className="flex items-center gap-2">
                        <Link href={safeRoute('shop.index')} className="text-xs font-semibold text-stone-600 hover:text-clay-600 px-3 py-1.5 rounded-lg transition-colors">
                            Marketplace
                        </Link>
                        <Link href="/" className="text-xs font-semibold text-stone-600 hover:text-clay-600 px-3 py-1.5 rounded-lg transition-colors">
                            Home
                        </Link>
                    </nav>
                </header>

                {/* Center Content Card */}
                <main className="flex-1 flex items-center justify-center py-8">
                    <div className="max-w-lg w-full bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-10 shadow-xs text-center relative overflow-hidden">
                        {/* Subtle ambient blur */}
                        <div className="absolute -top-16 -right-16 w-36 h-36 bg-clay-50 rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-amber-50 rounded-full blur-2xl pointer-events-none" />

                        <div className="relative z-10 space-y-6">
                            {/* Icon & Code Badge */}
                            <div className="flex flex-col items-center gap-3">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xs ${config.iconContainerClass}`}>
                                    <Icon size={28} strokeWidth={2} />
                                </div>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.badgeClass}`}>
                                    {config.code}
                                </span>
                            </div>

                            {/* Headings */}
                            <div className="space-y-2">
                                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
                                    {config.title}
                                </h1>
                                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-md mx-auto font-normal">
                                    {config.description}
                                </p>
                            </div>

                            {/* Quick Search */}
                            {config.showSearch && (
                                <form onSubmit={handleSearch} className="relative max-w-sm mx-auto w-full">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search crafts, studios, or materials..."
                                        className="w-full text-xs rounded-xl border border-stone-200 bg-stone-50/80 pl-9 pr-4 py-2.5 text-stone-800 placeholder-stone-400 focus:bg-white focus:border-clay-600 focus:outline-none focus:ring-1 focus:ring-clay-600 transition shadow-2xs"
                                    />
                                    <Search className="absolute left-3 top-3 text-stone-400" size={15} />
                                </form>
                            )}

                            {/* Actions */}
                            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                                {status === 500 ? (
                                    <button
                                        type="button"
                                        onClick={() => window.location.reload()}
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-sm transition active:scale-[0.98] cursor-pointer"
                                    >
                                        <RefreshCw size={14} />
                                        <span>Try Again</span>
                                    </button>
                                ) : (
                                    <Link
                                        href={safeRoute('shop.index')}
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-sm transition active:scale-[0.98]"
                                    >
                                        <ShoppingBag size={14} />
                                        <span>Explore Marketplace</span>
                                    </Link>
                                )}

                                <Link
                                    href="/"
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold shadow-2xs transition active:scale-[0.98]"
                                >
                                    <Home size={14} />
                                    <span>Return Home</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="w-full max-w-5xl mx-auto py-4 text-center border-t border-stone-200/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-stone-500">
                    <p>© {new Date().getFullYear()} LikhangKamay. Handcrafted with pride in the Philippines.</p>
                    <p>Need assistance? Contact <a href="mailto:likhangkamaybusiness@gmail.com" className="font-semibold text-stone-700 hover:text-clay-600 underline decoration-stone-300">likhangkamaybusiness@gmail.com</a></p>
                </footer>
            </div>
        </>
    );
}
