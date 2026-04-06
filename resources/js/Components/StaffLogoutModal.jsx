import { router } from '@inertiajs/react';
import { Clock3, LogOut, PauseCircle, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

function ActionTile({ icon: Icon, title, description, isPrimary, disabled, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`w-full group relative flex flex-col justify-between overflow-hidden rounded-xl border p-4 text-left shadow-sm transition-all duration-300 ${
                isPrimary
                    ? 'border-[#2c3b35] bg-[#1a231f] text-stone-100 hover:bg-[#232f2a]'
                    : 'border-stone-200 bg-white text-stone-800 hover:border-clay-300 hover:bg-[#FCF7F2]'
            } ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-0.5 hover:shadow-md'}`}
        >
            <div className="flex items-center gap-3 mb-2">
                <div className={`inline-flex items-center justify-center rounded-lg p-2 ${
                    isPrimary ? 'bg-white/10 text-stone-200' : 'bg-stone-100 text-stone-600 group-hover:bg-white group-hover:text-clay-700 group-hover:shadow-sm'
                } transition-colors`}>
                    <Icon size={16} strokeWidth={2.5} />
                </div>
                <p className="text-[14px] font-bold tracking-tight">{title}</p>
            </div>
            <p className={`text-[12px] leading-relaxed ${isPrimary ? 'text-stone-400' : 'text-stone-500 group-hover:text-stone-700'}`}>
                {description}
            </p>
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

    const startedAt = attendance?.clock_in_at
        ? new Intl.DateTimeFormat('en-PH', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        }).format(new Date(attendance.clock_in_at))
        : null;

    return (
        <div className="w-full max-w-sm rounded-[1.25rem] border border-stone-200 bg-[#FDFBF9] shadow-xl overflow-hidden sm:max-w-md">
            <div className="border-b border-stone-100 bg-white px-5 py-4 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold tracking-tight text-stone-900">
                            End Context Session
                        </h2>
                        <p className="mt-0.5 text-[13px] text-stone-500 font-medium">
                            Determine the state of the current attendance.
                        </p>
                    </div>

                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                            aria-label="Close sign out prompt"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            <div className="px-5 py-5 sm:px-6">
                {attendance?.has_open_session ? (
                    <div className="mb-5 flex flex-col justify-center rounded-xl bg-stone-100/60 border border-stone-200 px-4 py-3">
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-stone-500">
                            Active Time Log
                        </span>
                        <div className="mt-1 flex items-center gap-1.5 text-stone-800">
                            <Clock3 size={14} className="text-clay-600" />
                            <span className="text-[13px] font-bold">
                                {startedAt ? `Checked in: ${startedAt}` : 'Checked in and recording'}
                            </span>
                        </div>
                    </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                    <ActionTile
                        icon={PauseCircle}
                        title={processingAction === 'pause' ? 'Starting Break' : 'Take Break'}
                        description="Sign out temporarily. Retain session for next return."
                        isPrimary={false}
                        disabled={!!processingAction}
                        onClick={() => submit('pause')}
                    />
                    <ActionTile
                        icon={LogOut}
                        title={processingAction === 'clock_out' ? 'Clocking Out' : 'Clock Out'}
                        description="End the scheduled session and conclude."
                        isPrimary={true}
                        disabled={!!processingAction}
                        onClick={() => submit('clock_out')}
                    />
                </div>

                {onClose && (
                    <div className="mt-5 border-t border-stone-200 pt-5 text-center">
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-[13px] font-bold text-stone-500 underline-offset-4 hover:text-stone-900 hover:underline transition-colors"
                        >
                            Nevermind, continue working
                        </button>
                    </div>
                )}
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
