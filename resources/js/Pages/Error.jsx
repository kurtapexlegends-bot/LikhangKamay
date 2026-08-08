import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export default function Error({ status, message }) {
    const title = {
        503: '503: Service Unavailable',
        500: '500: Server Error',
        404: '404: Page Not Found',
        403: '403: Access Restricted',
    }[status] || `${status}: Unexpected Error`;

    const description = {
        503: 'Sorry, we are doing some maintenance. Please check back soon.',
        500: 'Whoops, something went wrong on our servers. Please try again later.',
        404: 'Sorry, the page you are looking for could not be found or has been moved.',
        403: message || 'You do not have permission to access this page or perform this action.',
    }[status] || message || 'An unexpected error occurred.';

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(196,143,103,0.12),_transparent_40%),linear-gradient(180deg,#fcfaf7_0%,#f4efe7_100%)] flex items-center justify-center px-4 py-12 font-sans text-stone-800">
            <Head title={title} />

            <div className="w-full max-w-md bg-white rounded-[28px] border border-stone-200/80 shadow-2xl p-8 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100/60 shadow-inner">
                    <ShieldAlert size={32} strokeWidth={2} />
                </div>

                <div className="mt-5">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-stone-100 text-stone-600 border border-stone-200/60">
                        {status || 403} Forbidden
                    </span>
                    <h1 className="mt-3 text-xl font-black text-stone-900 tracking-tight">
                        {title}
                    </h1>
                    <p className="mt-2.5 text-xs text-stone-600 leading-relaxed max-w-sm mx-auto">
                        {description}
                    </p>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-700 text-xs font-bold hover:bg-stone-50 active:scale-[0.98] transition-all shadow-sm"
                    >
                        <ArrowLeft size={14} />
                        Go Back
                    </button>
                    <Link
                        href="/"
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-clay-600 text-white text-xs font-bold hover:bg-clay-700 active:scale-[0.98] transition-all shadow-sm"
                    >
                        <Home size={14} />
                        Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
