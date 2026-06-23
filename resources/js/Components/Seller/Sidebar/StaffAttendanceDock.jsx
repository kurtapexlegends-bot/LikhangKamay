import React, { useState, useEffect, useRef, memo } from 'react';
import { router } from '@inertiajs/react';
import ConfirmationModal from '@/Components/ConfirmationModal';
import { Clock3, PauseCircle, LogOut, ChevronUp, PlayCircle } from 'lucide-react';

const formatElapsedTimer = (startedAt, currentTimestamp) => {
    if (!startedAt) {
        return null;
    }

    const startedAtMs = new Date(startedAt).getTime();

    if (Number.isNaN(startedAtMs)) {
        return null;
    }

    const totalSeconds = Math.max(0, Math.floor((currentTimestamp - startedAtMs) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');

    if (hours > 0) {
        return `${hours}:${paddedMinutes}:${paddedSeconds}`;
    }

    return `${minutes}:${paddedSeconds}`;
};

const formatDurationFromSeconds = (totalSecondsValue) => {
    const totalSeconds = Math.max(0, Math.floor(Number(totalSecondsValue || 0)));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
    }

    if (minutes > 0) {
        return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
    }

    return `${seconds}s`;
};

const formatWorkedDayTimer = (baseSeconds, activeSessionStartedAt, hasOpenSession, currentTimestamp) => {
    const safeBaseSeconds = Math.max(0, Number(baseSeconds || 0));

    if (!hasOpenSession) {
        return formatDurationFromSeconds(safeBaseSeconds);
    }

    if (!activeSessionStartedAt) {
        return formatDurationFromSeconds(safeBaseSeconds);
    }

    const activeSessionStartedAtMs = new Date(activeSessionStartedAt).getTime();

    if (Number.isNaN(activeSessionStartedAtMs)) {
        return formatDurationFromSeconds(safeBaseSeconds);
    }

    const liveSessionSeconds = Math.max(0, Math.floor((currentTimestamp - activeSessionStartedAtMs) / 1000));

    return formatDurationFromSeconds(safeBaseSeconds + liveSessionSeconds);
};

const AttendanceActionButton = ({ icon: Icon, label, onClick, disabled, tone = 'default' }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all active:scale-95 ${
            tone === 'danger'
                ? 'border-red-100 bg-red-50/70 text-red-700 hover:bg-red-50'
                : 'border-stone-200 bg-stone-50/80 text-stone-700 hover:bg-stone-100'
        } ${disabled ? 'cursor-not-allowed opacity-60 active:scale-100' : ''}`}
    >
        <span className="flex items-center gap-2 text-xs font-bold">
            <Icon size={14} strokeWidth={2.4} />
            {label}
        </span>
    </button>
);

function StaffAttendanceDock({ attendance, isCollapsed = false, onMouseEnter, onMouseLeave }) {
    const [open, setOpen] = useState(false);
    const [processingAction, setProcessingAction] = useState(null);
    const [showBreakConfirm, setShowBreakConfirm] = useState(false);
    const [timerNow, setTimerNow] = useState(() => Date.now());
    const containerRef = useRef(null);
    const hasOpenSession = !!attendance?.has_open_session;
    const isPaused = attendance?.current_state === 'paused';

    useEffect(() => {
        if (!open) return undefined;

        const handlePointerDown = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
        };
    }, [open]);

    useEffect(() => {
        if (!open || (!attendance?.active_session_started_at && !attendance?.break_started_at)) {
            return undefined;
        }

        const interval = window.setInterval(() => {
            setTimerNow(Date.now());
        }, 1000);

        return () => {
            window.clearInterval(interval);
        };
    }, [attendance?.active_session_started_at, attendance?.break_started_at, open]);

    const firstClockInLabel = attendance?.today_first_clock_in
        ? new Intl.DateTimeFormat('en-PH', {
            hour: 'numeric',
            minute: '2-digit',
        }).format(new Date(attendance.today_first_clock_in))
        : null;
    const breakStartedLabel = attendance?.break_started_at
        ? new Intl.DateTimeFormat('en-PH', {
            hour: 'numeric',
            minute: '2-digit',
        }).format(new Date(attendance.break_started_at))
        : null;
    const activeDurationLabel = formatWorkedDayTimer(
        attendance?.today_worked_seconds_base,
        attendance?.active_session_started_at,
        hasOpenSession,
        timerNow,
    );
    const breakDurationLabel = isPaused && attendance?.break_started_at
        ? formatElapsedTimer(attendance.break_started_at, timerNow)
        : null;

    const startBreak = () => {
        if (processingAction) return;

        setProcessingAction('pause');
        router.post(route('staff.attendance.break'), {}, {
            preserveScroll: true,
            onFinish: () => {
                setProcessingAction(null);
                setOpen(false);
                setShowBreakConfirm(false);
            },
        });
    };

    const clockOut = () => {
        if (processingAction) return;

        setProcessingAction('clock_out');
        router.post(route('staff.logout'), { action: 'clock_out' }, {
            preserveScroll: true,
            onFinish: () => {
                setProcessingAction(null);
                setOpen(false);
            },
        });
    };

    const resumeWork = () => {
        if (processingAction) return;

        setProcessingAction('clock_in');
        router.post(route('staff.attendance.resume'), {}, {
            preserveScroll: true,
            onFinish: () => {
                setProcessingAction(null);
                setOpen(false);
            },
        });
    };

    const handlePrimaryClick = () => {
        if (processingAction) return;

        if (isPaused) {
            setOpen((current) => !current);
            return;
        }

        if (!hasOpenSession) {
            resumeWork();
            return;
        }

        setOpen((current) => !current);
    };

    return (
        <div ref={containerRef} className="relative">
            {open && (hasOpenSession || isPaused) && (
                <div className={`absolute rounded-2xl border border-clay-100 bg-white p-2 shadow-lg z-[130] ${
                    isCollapsed ? 'left-full bottom-0 ml-2 w-64' : 'inset-x-0 bottom-[calc(100%+0.6rem)]'
                }`}>
                    <div className={`rounded-xl border px-3 py-2.5 ${hasOpenSession ? 'border-emerald-100 bg-emerald-50/70' : 'border-amber-100 bg-amber-50/70'}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${hasOpenSession ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {hasOpenSession ? 'Clocked In' : 'On Break'}
                        </p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-stone-900">
                                {hasOpenSession ? 'Active session' : 'Break in progress'}
                            </span>
                        </div>
                        <div className="mt-2 grid gap-1.5 rounded-xl border border-white/70 bg-white px-2.5 py-2">
                            {firstClockInLabel && (
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-medium text-stone-500">
                                        Clocked in at
                                    </span>
                                    <span className="text-xs font-bold text-stone-900">
                                        {firstClockInLabel}
                                    </span>
                                </div>
                            )}
                            {activeDurationLabel && (
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-medium text-stone-500">
                                        Active for
                                    </span>
                                    <span className={`rounded-full border bg-white px-2 py-0.5 font-mono text-[11px] font-bold ${hasOpenSession ? 'border-emerald-200 text-emerald-700' : 'border-amber-200 text-amber-700'}`}>
                                        {activeDurationLabel}
                                    </span>
                                </div>
                            )}
                            {isPaused && breakStartedLabel && (
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-medium text-stone-500">
                                        Break started at
                                    </span>
                                    <span className="text-xs font-bold text-stone-900">
                                        {breakStartedLabel}
                                    </span>
                                </div>
                            )}
                            {isPaused && breakDurationLabel && (
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-medium text-stone-500">
                                        On break for
                                    </span>
                                    <span className="rounded-full border border-amber-200 bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-amber-700">
                                        {breakDurationLabel}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-2 grid gap-1.5">
                        <AttendanceActionButton
                            icon={hasOpenSession ? PauseCircle : PlayCircle}
                            label={
                                hasOpenSession
                                    ? (processingAction === 'pause' ? 'Starting Break' : 'Take Break')
                                    : (processingAction === 'clock_in' ? 'Resuming Work' : 'Resume Work')
                            }
                            disabled={!!processingAction}
                            onClick={() => {
                                if (hasOpenSession) {
                                    setShowBreakConfirm(true);
                                    return;
                                }

                                resumeWork();
                            }}
                        />
                        <AttendanceActionButton
                            icon={LogOut}
                            label={processingAction === 'clock_out' ? 'Clocking Out' : 'Clock Out'}
                            disabled={!!processingAction}
                            onClick={clockOut}
                            tone="danger"
                        />
                    </div>
                </div>
            )}

            <button
                type="button"
                onClick={handlePrimaryClick}
                disabled={!!processingAction}
                onMouseEnter={(e) => {
                    if (isCollapsed) {
                        const text = processingAction === 'clock_in'
                            ? (isPaused ? 'Resuming Work' : 'Clocking In')
                            : hasOpenSession
                                ? 'Clocked In (Click to toggle controls)'
                                : isPaused
                                    ? 'On Break (Click to toggle controls)'
                                    : 'Clock In';
                        onMouseEnter?.(e, text);
                    }
                }}
                onMouseLeave={isCollapsed ? onMouseLeave : undefined}
                className={`group relative flex items-center transition-[max-width,padding,background-color,border-color] duration-300 w-full ${
                    isCollapsed 
                        ? 'max-w-[36px] h-9 justify-center rounded-xl px-0 py-0' 
                        : 'max-w-[200px] justify-between gap-2 rounded-xl px-2.5 py-2'
                } border ${
                    hasOpenSession
                        ? 'border-emerald-200 bg-emerald-50/80 hover:bg-emerald-50 text-emerald-700'
                        : 'border-clay-200 bg-[#FCF7F2] hover:bg-clay-50 text-clay-700'
                } ${processingAction ? 'cursor-wait opacity-70' : ''}`}
            >
                <div className="flex min-w-0 flex-1 items-center">
                    {/* Icon container */}
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-[background-color,color] duration-300 ${
                        isCollapsed 
                            ? 'bg-transparent text-current' 
                            : hasOpenSession 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-clay-100 text-clay-700'
                    }`}>
                        <Clock3 size={16} strokeWidth={2.5} />
                    </div>

                    {/* Text wrapper (collapses to 0 width) */}
                    <span className={`truncate text-sm font-bold text-stone-900 overflow-hidden transition-[max-width,opacity,margin-left] duration-300 whitespace-nowrap text-left ${
                        isCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[120px] opacity-100 ml-2.5'
                    }`}>
                        {processingAction === 'clock_in'
                            ? (isPaused ? 'Resuming Work' : 'Clocking In')
                            : hasOpenSession
                                ? 'Clocked In'
                                : isPaused
                                    ? 'On Break'
                                    : 'Clock In'}
                    </span>
                </div>

                {/* Right side status indicator icon (fades out completely when collapsed) */}
                <div className={`shrink-0 flex items-center justify-center rounded-full border border-stone-200 bg-white text-stone-400 transition-[max-width,opacity,margin-left] duration-300 ${
                    isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[32px] h-8 w-8 ml-1'
                }`}>
                    {(hasOpenSession || isPaused) ? (
                        <ChevronUp
                            size={14}
                            className={`transition-transform ${open ? '' : 'rotate-180'}`}
                        />
                    ) : (
                        <Clock3 size={14} strokeWidth={2.4} />
                    )}
                </div>
            </button>

            <ConfirmationModal
                isOpen={showBreakConfirm}
                onClose={() => setShowBreakConfirm(false)}
                onConfirm={startBreak}
                title="Take Break?"
                message="This will pause your active session and return you to Workspace only. You can resume work anytime from the same attendance control."
                icon={PauseCircle}
                iconBg="bg-amber-100 text-amber-700"
                confirmText="Take Break"
                confirmColor="bg-amber-600 hover:bg-amber-700"
                processing={processingAction === 'pause'}
            />
        </div>
    );
}

export default memo(StaffAttendanceDock);
