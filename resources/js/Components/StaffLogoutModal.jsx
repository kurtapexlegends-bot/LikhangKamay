import { router } from '@inertiajs/react';
import { Clock3, LogOut, PauseCircle, X } from 'lucide-react';
import { useState } from 'react';

function ActionTile({ icon: Icon, title, description, tone, disabled, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`w-full rounded-2xl border px-4 py-4 text-left transition ${tone} ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
        >
            <div className="flex items-start gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <Icon size={18} />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold">{title}</p>
                    <p className="mt-1 text-xs leading-5 opacity-90">{description}</p>
                </div>
            </div>
        </button>
    );
}

export function StaffLogoutDecisionPanel({ attendance = null, onClose = null }) {
    const [processingAction, setProcessingAction] = useState(null);

    const submit = (action) => {
        if (processingAction) {
            return;
        }

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
        <div className="w-full max-w-md rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-[0_24px_80px_-42px_rgba(120,79,46,0.45)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-clay-100 text-clay-700">
                        <Clock3 size={20} />
                    </div>
                    <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.24em] text-stone-400">
                        Staff Session
                    </p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
                        Sign out
                    </h2>
                    <p className="mt-1.5 text-sm leading-6 text-stone-500">
                        Choose how to end this session.
                    </p>
                </div>

                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
                        aria-label="Close sign out prompt"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>

            {attendance?.has_open_session && (
                <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-stone-400">
                        Current Session
                    </p>
                    <p className="mt-1 text-sm font-semibold text-stone-800">
                        {startedAt ? `Clocked in since ${startedAt}` : 'Clocked in'}
                    </p>
                </div>
            )}

            <div className="mt-5 grid gap-3">
                <ActionTile
                    icon={PauseCircle}
                    title={processingAction === 'pause' ? 'Pausing...' : 'Pause Time'}
                    description="Sign out now. Next login starts a new session."
                    tone="border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-300 hover:bg-amber-100"
                    disabled={!!processingAction}
                    onClick={() => submit('pause')}
                />
                <ActionTile
                    icon={LogOut}
                    title={processingAction === 'clock_out' ? 'Clocking Out...' : 'Clock Out'}
                    description="End this session and sign out."
                    tone="border-red-200 bg-red-50 text-red-900 hover:border-red-300 hover:bg-red-100"
                    disabled={!!processingAction}
                    onClick={() => submit('clock_out')}
                />
            </div>

            {onClose && (
                <button
                    type="button"
                    onClick={onClose}
                    className="mt-4 w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50"
                >
                    Keep Working
                </button>
            )}
        </div>
    );
}

export default function StaffLogoutModal({ open, attendance = null, onClose }) {
    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-stone-950/35 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
            <div onClick={(event) => event.stopPropagation()}>
                <StaffLogoutDecisionPanel attendance={attendance} onClose={onClose} />
            </div>
        </div>
    );
}
