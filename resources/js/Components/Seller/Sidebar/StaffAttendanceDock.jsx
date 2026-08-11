import React, { useState, useEffect, memo } from 'react';
import { Clock3, ChevronRight, PauseCircle, PlayCircle, ShieldCheck } from 'lucide-react';
import StaffClockInModal from '@/Components/Staff/Dashboard/StaffClockInModal';
import StaffLogoutModal from '@/Components/StaffLogoutModal';

const formatElapsedTimer = (startedAt, currentTimestamp) => {
    if (!startedAt) return null;
    const startedAtMs = new Date(startedAt).getTime();
    if (Number.isNaN(startedAtMs)) return null;

    const totalSeconds = Math.max(0, Math.floor((currentTimestamp - startedAtMs) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num) => String(num).padStart(2, '0');
    if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    return `${minutes}:${pad(seconds)}`;
};

const formatWorkedDayTimer = (baseSeconds, activeSessionStartedAt, hasOpenSession, currentTimestamp) => {
    const safeBaseSeconds = Math.max(0, Number(baseSeconds || 0));
    if (!hasOpenSession || !activeSessionStartedAt) return formatElapsedTimer(null, currentTimestamp);

    const activeSessionStartedAtMs = new Date(activeSessionStartedAt).getTime();
    if (Number.isNaN(activeSessionStartedAtMs)) return null;

    return formatElapsedTimer(activeSessionStartedAt, currentTimestamp);
};

function StaffAttendanceDock({ attendance, isCollapsed = false, onMouseEnter, onMouseLeave }) {
    const [isClockInModalOpen, setIsClockInModalOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [timerNow, setTimerNow] = useState(() => Date.now());

    const hasOpenSession = !!attendance?.has_open_session;
    const isPaused = attendance?.current_state === 'paused';

    useEffect(() => {
        const interval = window.setInterval(() => setTimerNow(Date.now()), 1000);
        return () => window.clearInterval(interval);
    }, []);

    const activeDurationLabel = formatWorkedDayTimer(
        attendance?.today_worked_seconds_base,
        attendance?.active_session_started_at,
        hasOpenSession,
        timerNow,
    );

    const breakDurationLabel = isPaused && attendance?.break_started_at
        ? formatElapsedTimer(attendance.break_started_at, timerNow)
        : null;

    const handleClick = () => {
        if (!hasOpenSession && !isPaused) {
            setIsClockInModalOpen(true);
        } else {
            setIsLogoutModalOpen(true);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={handleClick}
                onMouseEnter={(e) => {
                    if (isCollapsed) {
                        const text = hasOpenSession
                            ? `Shift Active (${activeDurationLabel || ''})`
                            : isPaused
                                ? `On Break (${breakDurationLabel || ''})`
                                : 'Clock In Shift';
                        onMouseEnter?.(e, text);
                    }
                }}
                onMouseLeave={isCollapsed ? onMouseLeave : undefined}
                className={`group relative flex items-center transition-all duration-300 w-full ${
                    isCollapsed 
                        ? 'max-w-[36px] h-9 justify-center rounded-xl px-0 py-0' 
                        : 'max-w-[200px] justify-between gap-2 rounded-xl px-2.5 py-1.5'
                } border shadow-2xs ${
                    isPaused
                        ? 'border-amber-200 bg-amber-50/90 text-amber-800 hover:bg-amber-100/90'
                        : hasOpenSession
                            ? 'border-emerald-200/90 bg-emerald-50/90 text-emerald-900 hover:bg-emerald-100/90'
                            : 'border-clay-200 bg-[#FCF7F2] text-clay-800 hover:bg-clay-100/70'
                } active:scale-95`}
            >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    {/* Live Indicator Icon */}
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        isPaused
                            ? 'bg-amber-100 text-amber-700'
                            : hasOpenSession
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-clay-100 text-clay-700'
                    }`}>
                        {(hasOpenSession || isPaused) ? (
                            <span className="relative flex h-2 w-2">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPaused ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${isPaused ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                            </span>
                        ) : (
                            <Clock3 size={14} strokeWidth={2.4} />
                        )}
                    </div>

                    {/* Text & Timer Label */}
                    <div className={`min-w-0 text-left transition-all duration-300 overflow-hidden ${
                        isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[120px] opacity-100'
                    }`}>
                        <p className="text-[11px] font-extrabold leading-none truncate">
                            {isPaused ? 'On Break' : hasOpenSession ? 'Shift Active' : 'Clock In'}
                        </p>
                        {(hasOpenSession || isPaused) && (
                            <p className="text-[10px] font-mono font-bold text-stone-500 mt-0.5 leading-none">
                                {isPaused ? (breakDurationLabel || '0:00') : (activeDurationLabel || '0:00')}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right Arrow Icon */}
                {!isCollapsed && (
                    <ChevronRight size={14} className="text-stone-400 group-hover:text-stone-700 shrink-0 transition-transform group-hover:translate-x-0.5" />
                )}
            </button>

            {/* Clock In Biometric Modal */}
            <StaffClockInModal
                isOpen={isClockInModalOpen}
                onClose={() => setIsClockInModalOpen(false)}
            />

            {/* Shift Session Manager Control Modal */}
            <StaffLogoutModal
                open={isLogoutModalOpen}
                attendance={attendance}
                onClose={() => setIsLogoutModalOpen(false)}
            />
        </>
    );
}

export default memo(StaffAttendanceDock);
