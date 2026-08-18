import { router } from '@inertiajs/react';
import { ArrowRight, Clock3, LogOut, PauseCircle, PlayCircle, ShieldCheck, MapPin, X, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';
import EarlyClockOutModal from '@/Components/Staff/Dashboard/EarlyClockOutModal';

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

function ActionTile({ icon: Icon, title, description, variant = 'default', disabled, onClick, badge }) {
    const variantStyles = {
        default: 'border-stone-200 bg-white text-stone-900 hover:border-amber-300 hover:bg-amber-50/30 shadow-2xs',
        danger: 'border-rose-200/90 bg-rose-50/70 text-rose-950 hover:bg-rose-100/80 hover:border-rose-300 shadow-2xs',
        emerald: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20',
    }[variant];

    const iconStyles = {
        default: 'bg-amber-100 text-amber-800 border border-amber-200/80',
        danger: 'bg-rose-600 text-white shadow-2xs',
        emerald: 'bg-white/20 text-white border border-white/20',
    }[variant];

    const titleStyles = {
        default: 'text-stone-900',
        danger: 'text-rose-950 font-black',
        emerald: 'text-white font-black',
    }[variant];

    const descStyles = {
        default: 'text-stone-500',
        danger: 'text-rose-700/90 font-medium',
        emerald: 'text-emerald-100 font-medium',
    }[variant];

    const arrowStyles = {
        default: 'text-stone-400 group-hover:text-stone-700',
        danger: 'text-rose-600 group-hover:text-rose-800',
        emerald: 'text-emerald-200 group-hover:text-white',
    }[variant];

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`w-full group relative flex items-center gap-3.5 overflow-hidden rounded-2xl border p-3.5 text-left transition-all duration-200 active:scale-[0.98] ${variantStyles} ${
                disabled ? 'cursor-not-allowed opacity-50 active:scale-100' : ''
            }`}
        >
            <div className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 ${iconStyles}`}>
                <Icon size={18} strokeWidth={2.4} />
            </div>
            
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className={`text-xs font-extrabold tracking-tight leading-none ${titleStyles}`}>{title}</p>
                    {badge && (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200/60 uppercase">
                            {badge}
                        </span>
                    )}
                </div>
                <p className={`text-[11px] leading-tight mt-1 truncate ${descStyles}`}>
                    {description}
                </p>
            </div>

            <ArrowRight size={14} className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${arrowStyles}`} />
        </button>
    );
}

export function StaffLogoutDecisionPanel({ attendance = null, onClose = null }) {
    const [processingAction, setProcessingAction] = useState(null);
    const serverOffsetMs = useMemo(() => {
        if (!attendance?.server_timestamp) return 0;
        return (attendance.server_timestamp * 1000) - Date.now();
    }, [attendance?.server_timestamp]);

    const [timerNow, setTimerNow] = useState(() => Date.now() + serverOffsetMs);
    const [showEarlyModal, setShowEarlyModal] = useState(false);

    const hasOpenSession = !!attendance?.has_open_session;
    const isPaused = attendance?.current_state === 'paused';

    const shiftStartTime = attendance?.shift_policy?.shift_start_time || '08:00';
    const shiftEndTime = attendance?.shift_policy?.shift_end_time || '17:00';
    
    // Evaluate synchronized server date and time
    const now = new Date(timerNow);
    const [startH, startM] = shiftStartTime.split(':').map(Number);
    const [endH, endM] = shiftEndTime.split(':').map(Number);

    const sessionStartDate = attendance?.clock_in_at ? new Date(attendance.clock_in_at) : now;
    const shiftStartDate = new Date(sessionStartDate);
    shiftStartDate.setHours(startH || 8, startM || 0, 0, 0);

    const shiftEndDate = new Date(sessionStartDate);
    shiftEndDate.setHours(endH || 17, endM || 0, 0, 0);

    // Only count as early if leaving during active workday shift before shift end
    const isEarly = now >= new Date(shiftStartDate.getTime() - 2 * 3600000) && now < shiftEndDate;
    const undertimeMinutes = isEarly ? Math.max(0, Math.floor((shiftEndDate.getTime() - now.getTime()) / 60000)) : 0;

    useEffect(() => {
        const interval = window.setInterval(() => setTimerNow(Date.now() + serverOffsetMs), 1000);
        return () => window.clearInterval(interval);
    }, [serverOffsetMs]);

    const submit = (action, earlyReason = null) => {
        if (processingAction) return;

        if (action === 'clock_out' && isEarly && !earlyReason) {
            setShowEarlyModal(true);
            return;
        }

        setProcessingAction(action);

        if (action === 'direct_logout') {
            router.post(route('staff.logout.direct'), {}, {
                onFinish: () => setProcessingAction(null),
            });
            return;
        }

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

        router.post(route('staff.logout'), { 
            action,
            early_departure_reason: earlyReason,
        }, {
            onFinish: () => {
                setProcessingAction(null);
                setShowEarlyModal(false);
            },
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
                                <h2 className="text-sm font-extrabold text-stone-900 tracking-tight">
                                    {hasOpenSession || isPaused ? 'Shift Session Control' : 'Sign Out Account'}
                                </h2>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                    isPaused 
                                        ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                        : hasOpenSession 
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                            : 'bg-stone-100 text-stone-600 border border-stone-200'
                                }`}>
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPaused ? 'bg-amber-400' : hasOpenSession ? 'bg-emerald-400' : 'bg-stone-400'}`}></span>
                                        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isPaused ? 'bg-amber-500' : hasOpenSession ? 'bg-emerald-500' : 'bg-stone-500'}`}></span>
                                    </span>
                                    {isPaused ? 'On Break' : hasOpenSession ? 'Shift Active' : 'Off Duty'}
                                </span>
                            </div>
                            <p className="text-[11px] text-stone-500 font-medium">
                                {hasOpenSession || isPaused ? 'Manage break status or sign out securely' : 'Sign out of your staff workspace session'}
                            </p>
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
                    {hasOpenSession || isPaused ? (
                        <>
                            {isPaused ? (
                                <ActionTile
                                    icon={PlayCircle}
                                    title={processingAction === 'resume' ? 'Resuming...' : 'Resume Shift Work'}
                                    description="End break period and resume active shift timer"
                                    variant="emerald"
                                    disabled={!!processingAction}
                                    onClick={() => submit('resume')}
                                />
                            ) : (
                                <ActionTile
                                    icon={PauseCircle}
                                    title={processingAction === 'pause' ? 'Pausing...' : 'Take Shift Break'}
                                    description="Pause active timer & stay signed in to workspace"
                                    variant="default"
                                    disabled={!!processingAction}
                                    onClick={() => submit('pause')}
                                />
                            )}

                            <ActionTile
                                icon={LogOut}
                                title={processingAction === 'clock_out' ? 'Closing Shift...' : 'Clock Out & Sign Out'}
                                description="Record physical clock-out & end workspace session"
                                variant="danger"
                                disabled={!!processingAction}
                                onClick={() => submit('clock_out')}
                            />
                        </>
                    ) : (
                        <ActionTile
                            icon={LogOut}
                            title={processingAction === 'direct_logout' ? 'Signing Out...' : 'Sign Out of Account'}
                            description="End workspace session (You are currently Off Duty)"
                            variant="danger"
                            disabled={!!processingAction}
                            onClick={() => submit('direct_logout')}
                        />
                    )}
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

            <EarlyClockOutModal
                isOpen={showEarlyModal}
                onClose={() => setShowEarlyModal(false)}
                onConfirm={(reason) => submit('clock_out', reason)}
                shiftEndTime={shiftEndTime}
                undertimeMinutes={undertimeMinutes}
                processing={processingAction === 'clock_out'}
            />
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
