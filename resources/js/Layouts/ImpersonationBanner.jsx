import React, { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { ShieldAlert, LogOut, ChevronLeft, ChevronRight, Loader2, ShieldCheck } from 'lucide-react';

export default function ImpersonationBanner() {
    const { isImpersonating, auth } = usePage().props;
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isLeaving, setIsLeaving] = useState(false);

    if (!isImpersonating) return null;

    const leaveImpersonation = () => {
        setIsLeaving(true);
        router.post(route('impersonation.leave'), {}, {
            onError: () => setIsLeaving(false),
            // We don't set setIsLeaving(false) on finish because 
            // the server returns Inertia::location() which triggers a full reload.
        });
    };

    return (
        <div className="fixed bottom-28 sm:bottom-6 right-6 z-[300] flex items-end justify-end group">
            {/* Main Container */}
            <div 
                className={`
                    bg-stone-900 border border-stone-800 shadow-2xl shadow-stone-900/40 rounded-2xl 
                    transition-all duration-500 ease-in-out overflow-hidden flex items-center
                    ${isCollapsed ? 'w-12 h-12 rounded-full' : 'w-auto h-14 px-1.5'}
                    backdrop-blur-xl ring-1 ring-white/10
                `}
            >
                {/* Toggle Button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`
                        flex-shrink-0 flex items-center justify-center transition-all duration-300
                        ${isCollapsed ? 'w-12 h-12' : 'w-10 h-10 hover:bg-white/5 rounded-xl'}
                    `}
                >
                    <ShieldAlert 
                        size={20} 
                        className={`text-amber-400 ${isCollapsed ? 'animate-pulse' : ''}`} 
                    />
                </button>

                {/* Content - Only shown when expanded */}
                <div 
                    className={`
                        flex items-center gap-4 transition-all duration-500 delay-100
                        ${isCollapsed ? 'opacity-0 invisible w-0' : 'opacity-100 visible w-auto px-3'}
                    `}
                >
                    <div className="flex flex-col min-w-0">
                        <span className="uppercase text-stone-500 text-[9px] font-black tracking-[0.2em] leading-none mb-1">Support Mode</span>
                        <p className="text-[11px] font-bold text-white tracking-tight whitespace-nowrap">
                            Active: <span className="text-amber-400">{auth.user.name}</span>
                        </p>
                    </div>

                    <div className="h-8 w-px bg-white/10 mx-1" />

                    <button
                        onClick={leaveImpersonation}
                        className="flex items-center gap-1.5 bg-amber-500 text-stone-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-500/20 whitespace-nowrap"
                    >
                        <LogOut size={12} strokeWidth={3} /> End session
                    </button>
                    
                    <button
                        onClick={() => setIsCollapsed(true)}
                        className="p-2 text-stone-500 hover:text-stone-300 transition-colors"
                        title="Collapse"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Tooltip for collapsed state */}
            {isCollapsed && (
                <div className="absolute bottom-full right-0 mb-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    <div className="bg-stone-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg border border-stone-800 shadow-xl">
                        Support Mode: <span className="text-amber-400">{auth.user.name}</span>
                    </div>
                </div>
            )}

            {/* Exit Overlay */}
            {isLeaving && (
                <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-stone-900/60 backdrop-blur-xl animate-in fade-in duration-700">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <ShieldCheck size={24} className="text-amber-400 animate-pulse" />
                        </div>
                        <Loader2 className="h-24 w-24 animate-spin text-amber-400/20" strokeWidth={1.5} />
                    </div>
                    <div className="mt-8 text-center">
                        <h3 className="text-xl font-black tracking-[0.2em] text-white uppercase italic">Returning to Admin</h3>
                        <p className="mt-2 text-[10px] font-bold text-amber-400/60 uppercase tracking-[0.3em]">Restoring administrative privileges...</p>
                    </div>
                </div>
            )}
        </div>
    );
}