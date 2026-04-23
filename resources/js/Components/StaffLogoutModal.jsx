import { router } from '@inertiajs/react';
import { ArrowRight, Clock3, LogOut, PauseCircle, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

function ActionTile({ icon: Icon, title, description, isPrimary, disabled, onClick }) {
    const baseStyles = isPrimary
        ? 'border-stone-800 bg-[#1a201d] text-white hover:bg-[#202925] shadow-sm'
        : 'border-stone-200 bg-white text-stone-800 hover:border-clay-300 hover:bg-stone-50/50';

    const iconStyles = isPrimary
        ? 'bg-white/10 text-emerald-400'
        : 'bg-stone-50 text-stone-500 group-hover:bg-amber-50 group-hover:text-amber-600';

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`w-full group relative flex items-center gap-3 overflow-hidden rounded-xl border p-3 text-left transition-all duration-200 ${baseStyles} ${
                disabled ? 'cursor-not-allowed opacity-50' : 'hover:scale-[1.02]'
            }`}
        >
            <div className={`shrink-0 inline-flex items-center justify-center rounded-lg p-1.5 transition-all duration-300 ${iconStyles}`}>
                <Icon size={16} strokeWidth={2.5} />
            </div>
            
            <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold tracking-tight leading-none mb-0.5">{title}</p>
                <p className={`text-[10px] font-medium leading-tight truncate ${isPrimary ? 'text-stone-400' : 'text-stone-500'}`}>
                    {description}
                </p>
            </div>

            {!isPrimary && (
                <div className="absolute top-1.5 right-1.5">
                    <div className="w-1 h-1 rounded-full bg-amber-400/80" />
                </div>
            )}
        </button>
    );
}

export function StaffLogoutDecisionPanel({ attendance = null, onClose = null }) {
    const [processingAction, setProcessingAction] = useState(null);

    const submit = (action) => {
        if (processingAction) return;
        setProcessingAction(action);
        router.post(route('staff.logout'), { action }, {
            onFinish: () => setProcessingAction(null),
        });
    };

    const handleNevermind = () => {
        if (onClose) {
            onClose();
        } else {
            router.get(route('staff.dashboard'));
        }
    };

    const startedAt = attendance?.clock_in_at
        ? new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(attendance.clock_in_at))
        : null;

    return (
        <div className="w-full max-w-[380px] overflow-hidden rounded-[1.25rem] border border-stone-200 bg-white shadow-xl">
            {/* compact Header */}
            <div className="border-b border-stone-100 bg-[#FCF7F2]/30 px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-stone-500">
                           <LogOut size={8} /> Session
                        </div>
                        <h2 className="text-lg font-black tracking-tight text-stone-900">
                            End Context Session
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={handleNevermind}
                        className="rounded-full bg-white p-1.5 text-stone-400 shadow-sm transition hover:bg-stone-50 hover:text-stone-700"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            <div className="p-5">
                {attendance?.has_open_session && (
                    <div className="mb-4 flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50/40 p-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm border border-stone-100">
                                <Clock3 size={14} className="text-clay-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[12px] font-bold text-stone-800 leading-none">
                                    {startedAt ? `Timer: ${startedAt}` : 'Active Timer'}
                                </p>
                                <p className="mt-1 text-[9px] font-medium text-stone-400">
                                    Workspace recording is active.
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 border border-emerald-100">
                            <span className="relative flex h-1 w-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1 w-1 bg-emerald-500"></span>
                            </span>
                            <span className="text-[7px] font-extrabold text-emerald-700 uppercase">Live</span>
                        </div>
                    </div>
                )}

                <div className="space-y-2.5">
                    <ActionTile
                        icon={PauseCircle}
                        title={processingAction === 'pause' ? 'Pausing' : 'Take Break'}
                        description="Pause timer & keep login"
                        isPrimary={false}
                        disabled={!!processingAction}
                        onClick={() => submit('pause')}
                    />
                    <ActionTile
                        icon={LogOut}
                        title={processingAction === 'clock_out' ? 'Closing' : 'Clock Out'}
                        description="End shift & sign out"
                        isPrimary={true}
                        disabled={!!processingAction}
                        onClick={() => submit('clock_out')}
                    />
                </div>

                <div className="mt-5 flex flex-col items-center">
                    <button
                        type="button"
                        onClick={handleNevermind}
                        className="group inline-flex items-center gap-1 text-[11px] font-bold text-stone-400 transition-all hover:text-stone-700 underline decoration-stone-200 underline-offset-4"
                    >
                        Nevermind, continue <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function StaffLogoutModal({ open, attendance = null, onClose }) {
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!open || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/40 px-4 py-6 backdrop-blur-[2px]" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()}>
                <StaffLogoutDecisionPanel attendance={attendance} onClose={onClose} />
            </div>
        </div>,
        document.body
    );
}
