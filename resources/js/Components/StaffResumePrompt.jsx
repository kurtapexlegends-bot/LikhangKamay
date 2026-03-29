import { router } from '@inertiajs/react';
import { Clock3, LogOut, PlayCircle } from 'lucide-react';
import { useMemo, useState } from 'react';

function formatDateTime(value) {
    if (!value) {
        return null;
    }

    return new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(value));
}

function ActionButton({ icon: Icon, label, description, tone, busy, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={busy}
            className={`w-full rounded-2xl border px-4 py-3.5 text-left transition ${tone} ${busy ? 'cursor-wait opacity-80' : ''}`}
        >
            <div className="flex items-start gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <Icon size={18} />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold">{label}</p>
                    <p className="mt-1 text-xs leading-5 opacity-90">{description}</p>
                </div>
            </div>
        </button>
    );
}

export function StaffResumePromptCard({ prompt = null, compact = false }) {
    const [processingAction, setProcessingAction] = useState(null);

    const timeoutLabel = useMemo(() => {
        const minutes = prompt?.timeout_minutes ?? 10;

        return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    }, [prompt?.timeout_minutes]);

    const timedOutAt = formatDateTime(prompt?.timed_out_at);

    const resume = () => {
        if (processingAction) {
            return;
        }

        setProcessingAction('resume');

        router.post(route('staff.attendance.resume'), {}, {
            onFinish: () => setProcessingAction(null),
        });
    };

    const logout = () => {
        if (processingAction) {
            return;
        }

        setProcessingAction('logout');

        router.post(route('staff.logout.direct'), {}, {
            onFinish: () => setProcessingAction(null),
        });
    };

    return (
        <div className={`w-full rounded-[1.75rem] border border-stone-200 bg-white shadow-[0_24px_80px_-42px_rgba(120,79,46,0.35)] ${compact ? 'max-w-md p-5' : 'max-w-lg p-6 sm:p-7'}`}>
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-clay-100 text-clay-700">
                <Clock3 size={20} />
            </div>

            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.24em] text-stone-400">
                Staff Attendance
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
                Time paused for inactivity
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-500">
                No workspace heartbeat reached the server for {timeoutLabel}. Resume time to reopen your attendance session, or log out.
            </p>

            <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-stone-400">
                    Latest Session
                </p>
                <p className="mt-1 text-sm font-semibold text-stone-800">
                    {prompt?.worked_hours_label
                        ? `${prompt.worked_hours_label} logged before the timeout`
                        : 'Attendance was paused automatically.'}
                </p>
                {timedOutAt && (
                    <p className="mt-1 text-xs text-stone-500">
                        Timed out at {timedOutAt}
                    </p>
                )}
            </div>

            <div className="mt-5 grid gap-3">
                <ActionButton
                    icon={PlayCircle}
                    label={processingAction === 'resume' ? 'Resuming...' : 'Resume Time'}
                    description="Start a fresh attendance session and go back into the workspace."
                    tone="border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-100"
                    busy={!!processingAction}
                    onClick={resume}
                />
                <ActionButton
                    icon={LogOut}
                    label={processingAction === 'logout' ? 'Logging Out...' : 'Log Out'}
                    description="Leave the workspace without reopening attendance."
                    tone="border-stone-200 bg-stone-50 text-stone-900 hover:border-stone-300 hover:bg-stone-100"
                    busy={!!processingAction}
                    onClick={logout}
                />
            </div>
        </div>
    );
}

export function StaffResumePromptOverlay({ prompt = null, open = false }) {
    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-950/40 px-4 py-6 backdrop-blur-sm">
            <StaffResumePromptCard prompt={prompt} compact />
        </div>
    );
}
