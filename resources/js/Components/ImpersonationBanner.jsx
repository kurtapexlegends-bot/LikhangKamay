import React from 'react';
import { usePage, router } from '@inertiajs/react';
import { ShieldAlert, LogOut } from 'lucide-react';

export default function ImpersonationBanner() {
    const { isImpersonating, auth } = usePage().props;

    if (!isImpersonating) return null;

    const leaveImpersonation = () => {
        router.post(route('impersonation.leave'));
    };

    return (
        <div className="fixed bottom-6 right-6 z-[200] animate-in fade-in slide-in-from-bottom-6 duration-300">
            <div className="bg-stone-900 border border-stone-800 shadow-2xl shadow-stone-900/20 rounded-full p-2.5 flex flex-col sm:flex-row items-center gap-3 backdrop-blur-md">
                <div className="flex items-center gap-2.5 px-3">
                    <ShieldAlert size={16} className="text-amber-400 animate-pulse" />
                    <p className="text-xs font-medium text-white tracking-wide whitespace-nowrap">
                        <span className="uppercase text-stone-400 text-[10px] font-bold mr-2">Support Mode</span>
                        Impersonating <span className="font-bold underline decoration-amber-400 underline-offset-2">{auth.user.name}</span>
                    </p>
                </div>
                <button
                    onClick={leaveImpersonation}
                    className="flex items-center gap-1.5 bg-amber-50 text-amber-900 px-4 py-1.5 rounded-full text-xs font-bold hover:bg-amber-100 active:scale-95 transition-all shadow-sm border border-amber-200 whitespace-nowrap"
                >
                    <LogOut size={14} /> End Impersonation
                </button>
            </div>
        </div>
    );
}