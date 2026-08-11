import { router } from '@inertiajs/react';
import { ArrowRight, Clock3, LogOut, PauseCircle, PlayCircle, ShieldCheck, MapPin, X, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';

const formatDuration = (startedAt, currentTimestamp) => {
    if (!startedAt) return null;
    const startedAtMs = new Date(startedAt).getTime();
    if (Number.isNaN(startedAtMs)) return null;

    const totalSeconds = Math.max(0, Math.floor((currentTimestamp - startedAtMs) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num) => String(num).padStart(2, '0');
    if (hours > 0) return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
    return `${minutes}m ${pad(seconds)}s`;
};

function ActionTile({ icon: Icon, title, description, isPrimary, disabled, onClick, badge }) {
    const baseStyles = isPrimary
        ? 'border-clay-700 bg-clay-950 text-white hover:bg-clay-900 shadow-md shadow-clay-950/20 active:scale-[0.98]'
        : 'border-stone-200 bg-white text-stone-900 hover:border-clay-300 hover:bg-stone-50/80 shadow-2xs active:scale-[0.98]';

    const iconStyles = isPrimary
        ? 'bg-clay-800 text-clay-200 border border-clay-700'
        : 'bg-stone-100 text-stone-700 border border-stone-200/80 group-hover:border-clay-200 group-hover:text-clay-600';

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`w-full group relative flex items-center gap-3.5 overflow-hidden rounded-2xl border p-3.5 text-left transition-all duration-200 ${baseStyles} ${
                disabled ? 'cursor-not-allowed opacity-50 active:scale-100' : ''
            }`}
        >
            <div className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 ${iconStyles}`}>
                <Icon size={18} strokeWidth={2.4} />
            </div>
            
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="text-xs font-bold tracking-tight leading-none">{title}</p>
                    {badge && (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200/60 uppercase">
                            {badge}
                        </span>
                    )}
                </div>
                <p className={`text-[11px] font-medium leading-tight mt-1 truncate ${isPrimary ? 'text-clay-300' : 'text-stone-500'}`}>
                    {description}
                </p>
            </div>

            <ArrowRight size={14} className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${isPrimary ? 'text-clay-400' : 'text-stone-400'}`} />
        </button>
    );
}

export function StaffLogoutDecisionPanel({ attendance = null, onClose = null }) {
    const [processingAction, setProcessingAction] = useState(null);
    const [timerNow, setTimerNow] = useState(() => Date.now());

    const hasOpenSession = !!attendance?.has_open_session;
    const isPaused = attendance?.current_state === 'paused';

    useEffect(() => {
        const interval = window.setInterval(() => setTimerNow(Date.now()), 1000);
        return () => window.clearInterval(interval);
    }, []);

    const submit = (action) => {
        if (processingAction) return;
        setProcessingAction(action);

        if (action === 'pause') {
            router.post(route('staff.attendance.break'), {}, {
                preserveScroll: true,
                onFinish: () => {
                    setProcessingAction(null);
                    if (onClose) onClose();
                },
            });
            return;
        }

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

    const clockInLabel = attendance?.today_first_clock_in || attendance?.clock_in_at
        ? new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(attendance.today_first_clock_in || attendance.clock_in_at))
        : null;

    const activeDuration = formatDuration(
        attendance?.active_session_started_at || attendance?.clock_in_at,
        timerNow
    );

    const breakDuration = isPaused && attendance?.break_started_at
        ? formatDuration(attendance.break_started_at, timerNow)
        : null;

    return (
        <div className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-2xl">
            {/* Header */}
            <div className="border-b border-stone-100 bg-stone-50/60 px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-clay-100/70 text-clay-800 border border-clay-200/60 shadow-2xs">
                            <ShieldCheck size={18} />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <h2 className="text-sm font-extrabold text-stone-900 tracking-tight">Shift Session Control</h2>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                    isPaused 
                                        ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                        : hasOpenSession 
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                            : 'bg-stone-100 text-stone-600 border border-stone-200'
                                }`}>
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPaused ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                                        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isPaused ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                                    </span>
                                    {isPaused ? 'On Break' : hasOpenSession ? 'Shift Active' : 'Off Duty'}
                                </span>
                            </div>
                            <p className="text-[11px] text-stone-500 font-medium">Manage break status or sign out securely</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleNevermind}
                        className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 transition"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div className="p-5 space-y-4">
                {/* Active Session Timer Card */}
                {(hasOpenSession || isPaused) && (
                    <div className={`rounded-2xl border p-4 transition-all ${
                        isPaused 
                            ? 'border-amber-200 bg-amber-50/40 shadow-2xs' 
                            : 'border-emerald-200 bg-emerald-50/40 shadow-2xs'
                    }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-xl border bg-white shadow-2xs ${
                                    isPaused ? 'text-amber-700 border-amber-200' : 'text-emerald-700 border-emerald-200'
                                }`}>
                                    <Clock3 size={15} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                                        {isPaused ? 'Break Duration' : 'Shift Duration'}
                                    </p>
                                    <p className="text-sm font-black text-stone-900 font-mono tracking-tight">
                                        {isPaused ? (breakDuration || '0m 00s') : (activeDuration || '0m 00s')}
                                    </p>
                                </div>
                            </div>
                            
                            {clockInLabel && (
                                <div className="text-right">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Clocked In</p>
                                    <p className="text-xs font-bold text-stone-800">{clockInLabel}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="space-y-2.5">
                    {isPaused ? (
                        <ActionTile
                            icon={PlayCircle}
                            title={processingAction === 'resume' ? 'Resuming...' : 'Resume Shift Work'}
                            description="End break period and resume active shift timer"
                            isPrimary={true}
                            disabled={!!processingAction}
                            onClick={() => submit('resume')}
                        />
                    ) : (
                        <ActionTile
                            icon={PauseCircle}
                            title={processingAction === 'pause' ? 'Pausing...' : 'Take Shift Break'}
                            description="Pause active timer & stay signed in to workspace"
                            isPrimary={false}
                            disabled={!!processingAction || !hasOpenSession}
                            onClick={() => submit('pause')}
                        />
                    )}

                    <ActionTile
                        icon={LogOut}
                        title={processingAction === 'clock_out' ? 'Closing Shift...' : 'Clock Out & Sign Out'}
                        description="Record physical clock-out & end workspace session"
                        isPrimary={!isPaused}
                        disabled={!!processingAction}
                        onClick={() => submit('clock_out')}
                    />
                </div>

                {/* Cancel / Resume Link */}
                <div className="pt-2 flex flex-col items-center">
                    <button
                        type="button"
                        onClick={handleNevermind}
                        className="group inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors"
                    >
                        <span>Back to Workspace</span>
                        <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5 text-stone-400 group-hover:text-stone-700" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function StaffLogoutModal({ open, attendance = null, onClose }) {
    return (
        <Modal show={open} onClose={onClose} maxWidth="sm">
            <StaffLogoutDecisionPanel attendance={attendance} onClose={onClose} />
        </Modal>
    );
}
