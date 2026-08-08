import { router } from '@inertiajs/react';
import { Clock, LogOut, Play, Loader2 } from 'lucide-react';
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
        <div className={`w-full rounded-[28px] border border-stone-200/80 bg-white p-6 sm:p-7 shadow-2xl ${compact ? 'max-w-md' : 'max-w-lg'}`}>
            {/* Top Status Pill */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center shrink-0">
                        <Clock size={20} />
                    </div>
                    <div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/70 text-[10px] font-bold uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Session Paused
                        </span>
                    </div>
                </div>
            </div>

            {/* Heading & Subtitle */}
            <h2 className="text-xl font-bold tracking-tight text-stone-900">
                Inactivity Timeout
            </h2>
            <p className="mt-1 text-xs text-stone-500 font-medium leading-relaxed">
                No workspace activity was detected for {timeoutLabel}. Resume work to reopen your attendance session.
            </p>

            {/* Session Stats Drawer */}
            <div className="mt-5 rounded-2xl border border-stone-200/70 bg-stone-50/70 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500 font-medium">Logged Time</span>
                    <span className="font-bold text-stone-900">
                        {prompt?.worked_hours_label ? `${prompt.worked_hours_label} before pause` : 'Session paused'}
                    </span>
                </div>
                {timedOutAt && (
                    <div className="flex items-center justify-between text-xs border-t border-stone-200/50 pt-2">
                        <span className="text-stone-500 font-medium">Paused At</span>
                        <span className="font-semibold text-stone-700">{timedOutAt}</span>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-2.5">
                <button
                    type="button"
                    onClick={resume}
                    disabled={!!processingAction}
                    className="w-full min-h-[46px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                    {processingAction === 'resume' ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Resuming Session...</span>
                        </>
                    ) : (
                        <>
                            <Play size={16} className="fill-white" />
                            <span>Resume Work</span>
                        </>
                    )}
                </button>

                <button
                    type="button"
                    onClick={logout}
                    disabled={!!processingAction}
                    className="w-full min-h-[42px] rounded-2xl bg-stone-100 hover:bg-stone-200/70 text-stone-700 font-semibold text-xs transition-colors active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                    {processingAction === 'logout' ? (
                        <>
                            <Loader2 size={14} className="animate-spin text-stone-500" />
                            <span>Logging Out...</span>
                        </>
                    ) : (
                        <>
                            <LogOut size={14} className="text-stone-500" />
                            <span>Log Out</span>
                        </>
                    )}
                </button>
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
