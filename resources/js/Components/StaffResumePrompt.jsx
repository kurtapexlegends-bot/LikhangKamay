import { router } from '@inertiajs/react';
import { Clock3, LogOut, PlayCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import Modal from '@/Components/Modal';

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
            className={`w-full rounded-2xl border px-4 py-3 text-left transition ${tone} ${busy ? 'cursor-wait opacity-80' : ''}`}
        >
            <div className="flex items-center gap-3">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-xs shrink-0">
                    <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{label}</p>
                    {description && <p className="mt-0.5 text-xs leading-tight opacity-90">{description}</p>}
                </div>
            </div>
        </button>
    );
}

export function StaffResumePromptCard({ prompt = null, compact = false, onResumeSuccess = null }) {
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
            onSuccess: () => {
                if (onResumeSuccess) {
                    onResumeSuccess();
                }
            },
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

            <h2 className="mt-4 text-2xl font-bold tracking-tight text-stone-900">
                Session paused for inactivity
            </h2>
            <p className="mt-1.5 text-xs text-stone-500 font-medium">
                No workspace heartbeat was received for {timeoutLabel}. Resume work to reopen your attendance session.
            </p>

            <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <p className="text-xs font-semibold text-stone-800">
                    {prompt?.worked_hours_label
                        ? `${prompt.worked_hours_label} logged before timeout`
                        : 'Attendance paused automatically.'}
                </p>
                {timedOutAt && (
                    <p className="mt-0.5 text-[11px] text-stone-500 font-medium">
                        Timed out at {timedOutAt}
                    </p>
                )}
            </div>

            <div className="mt-5 grid gap-2.5">
                <ActionButton
                    icon={PlayCircle}
                    label={processingAction === 'resume' ? 'Resuming...' : 'Resume Work'}
                    description=""
                    tone="border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-100 min-h-[52px]"
                    busy={!!processingAction}
                    onClick={resume}
                />
                <ActionButton
                    icon={LogOut}
                    label={processingAction === 'logout' ? 'Logging Out...' : 'Log Out'}
                    description=""
                    tone="border-stone-200 bg-stone-50 text-stone-900 hover:border-stone-300 hover:bg-stone-100 min-h-[52px]"
                    busy={!!processingAction}
                    onClick={logout}
                />
            </div>
        </div>
    );
}

export function StaffResumePromptOverlay({ prompt = null, open = false, onResumeSuccess = null }) {
    return (
        <Modal show={open} onClose={() => {}} maxWidth="md" closeable={false}>
            <StaffResumePromptCard prompt={prompt} compact onResumeSuccess={onResumeSuccess} />
        </Modal>
    );
}
