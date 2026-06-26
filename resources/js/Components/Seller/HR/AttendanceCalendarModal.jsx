import React from 'react';
import { CalendarDays, X, Clock3, ChevronLeft, ChevronRight } from 'lucide-react';
import Modal from '@/Components/Modal';
import {
    buildAttendanceCalendarWeeks,
    formatAttendanceDateLabelSafe,
    formatWorkedHoursLabel,
    formatWorkedHoursSummary,
    formatAttendanceTime
} from '@/utils/hrHelpers';

export default function AttendanceCalendarModal({ 
    employee, 
    selectedDate, 
    onSelectDate, 
    onClose,
    sellerSettings = {},
    onMonthChange
}) {
    if (!employee) return null;

    const standardWorkdayHours = Number(sellerSettings.standard_workday_hours) || 8.0;
    const standardWorkdayMinutes = standardWorkdayHours * 60;

    const calendarDays = employee?.attendance?.calendar_days || [];
    const calendarWeeks = buildAttendanceCalendarWeeks(calendarDays);
    const selectedDay = calendarDays.find((day) => day.date === selectedDate) 
        || calendarDays.find((day) => day.is_today) 
        || calendarDays.find((day) => day.has_hours) 
        || calendarDays[0] 
        || null;
        
    const daysWorked = Number(employee?.attendance?.days_worked || 0);
    const totalWorkedMinutes = Number(employee?.attendance?.worked_minutes || 0);
    const selectedDayHoursLabel = selectedDay ? formatWorkedHoursLabel(selectedDay.worked_minutes) : '0h';
    const bestLoggedDay = calendarDays.filter((day) => day.has_hours).sort((a, b) => b.worked_minutes - a.worked_minutes)[0] || null;

    const selectedDayBlock = (
        <div className="rounded-xl border border-clay-100 bg-white shadow-sm overflow-hidden flex flex-col relative">
            <div className="p-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-stone-400">Selected</p>
                <h3 className="mt-1 text-sm font-bold tracking-tight text-gray-900">
                    {selectedDay ? formatAttendanceDateLabelSafe(selectedDay.date) : 'Choose a date'}
                </h3>

                <div className="mt-2.5 bg-stone-50 rounded-lg p-2 flex items-center gap-2.5 border border-stone-100">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white border border-[#E7D8C9] text-clay-600 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                        <Clock3 size={14} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-stone-400">Worked</p>
                        <p className="text-xs font-bold text-gray-900 truncate">{selectedDayHoursLabel}</p>
                    </div>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-stone-600">
                    {selectedDay?.has_hours
                        ? `${employee?.name} logged ${selectedDayHoursLabel} on this date.`
                        : 'No attendance hours logged on this date.'}
                </p>
            </div>
        </div>
    );

    const createdAt = sellerSettings.created_at;
    const currentMonthValue = sellerSettings.attendance_month_value || new Date().toISOString().slice(0, 7);

    const selectableMonths = React.useMemo(() => {
        const currentDate = new Date();
        if (!createdAt) {
            const val = currentDate.toISOString().slice(0, 7);
            const lbl = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
            return [{ value: val, label: lbl }];
        }
        
        const createdDate = new Date(createdAt);
        const months = [];
        let year = createdDate.getFullYear();
        let month = createdDate.getMonth();
        
        const endYear = currentDate.getFullYear();
        const endMonth = currentDate.getMonth();
        
        while (year < endYear || (year === endYear && month <= endMonth)) {
            const val = `${year}-${String(month + 1).padStart(2, '0')}`;
            const dateObj = new Date(year, month, 1);
            const lbl = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
            months.push({ value: val, label: lbl });
            
            month++;
            if (month > 11) {
                month = 0;
                year++;
            }
        }
        
        if (months.length === 0) {
            const val = currentDate.toISOString().slice(0, 7);
            const lbl = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
            months.push({ value: val, label: lbl });
        }
        
        return months.reverse();
    }, [createdAt]);

    const currentIndex = selectableMonths.findIndex(m => m.value === currentMonthValue);
    
    const isPrevDisabled = currentIndex === -1 || currentIndex === selectableMonths.length - 1;
    const isNextDisabled = currentIndex === -1 || currentIndex === 0;

    const goToPrevMonth = () => {
        if (!isPrevDisabled && onMonthChange) {
            onMonthChange(selectableMonths[currentIndex + 1].value);
        }
    };

    const goToNextMonth = () => {
        if (!isNextDisabled && onMonthChange) {
            onMonthChange(selectableMonths[currentIndex - 1].value);
        }
    };

    return (
        <Modal show={!!employee} onClose={onClose} maxWidth="3xl">
            <div className="flex flex-col bg-white">
                {/* Premium Header */}
                <div className="bg-[#FDFBF9] px-5 py-4 border-b border-stone-100 flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-clay-600 shadow-sm border border-[#E7D8C9]">
                            <CalendarDays size={18} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold tracking-tight text-gray-900 leading-none">Attendance Calendar</h2>
                            <p className="mt-1 truncate text-xs text-stone-500 font-medium">
                                <span className="font-bold text-stone-700">{employee?.name}</span> · {employee?.attendance?.month_label || 'Current Month'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Main Content Layout */}
                <div className="flex flex-col md:flex-row">
                    {/* Left: Calendar Grid */}
                    <div className="flex-1 p-5 border-b md:border-b-0 md:border-r border-stone-100">
                        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-100 pb-4">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Daily View</p>
                                <p className="mt-1 text-[11px] text-stone-500">Select any date to review logged hours.</p>
                            </div>
                            
                            {/* Month Selector Component */}
                            <div className="flex items-center gap-2 self-start sm:self-auto">
                                <button
                                    type="button"
                                    onClick={goToPrevMonth}
                                    disabled={isPrevDisabled}
                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 transition hover:bg-stone-50 hover:border-stone-300 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] min-w-[44px]"
                                    title="Previous month"
                                    aria-label="Previous month"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                
                                <select
                                    value={currentMonthValue}
                                    onChange={(e) => onMonthChange && onMonthChange(e.target.value)}
                                    className="rounded-xl border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 shadow-sm transition focus:border-clay-500 focus:ring-clay-500 min-h-[44px] min-w-[130px] cursor-pointer"
                                >
                                    {selectableMonths.map((m) => (
                                        <option key={m.value} value={m.value}>
                                            {m.label}
                                        </option>
                                    ))}
                                </select>
                                
                                <button
                                    type="button"
                                    onClick={goToNextMonth}
                                    disabled={isNextDisabled}
                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 transition hover:bg-stone-50 hover:border-stone-300 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] min-w-[44px]"
                                    title="Next month"
                                    aria-label="Next month"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Mobile Selected Day Block */}
                        <div className="md:hidden mb-4">
                            {selectedDayBlock}
                        </div>

                        {/* Legend */}
                        <div className="mb-4 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 border border-emerald-100">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Worked
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 border border-amber-100">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span> Overtime ({`> ${standardWorkdayHours}h`})
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FCF7F2] text-clay-700 px-2 py-0.5 border border-[#E7D8C9]">
                                <span className="h-1.5 w-1.5 rounded-full bg-clay-500"></span> Selected
                            </span>
                        </div>
 
                        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2 border-b border-stone-50 pb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                <span key={day}>{day}</span>
                            ))}
                        </div>
 
                        <div className="grid gap-1.5">
                            {calendarWeeks.map((week, weekIndex) => (
                                <div key={`week-${weekIndex}`} className="grid grid-cols-7 gap-1.5">
                                    {week.map((day) => day.empty ? (
                                        <div key={day.key} className="min-h-[50px] rounded-xl border border-dashed border-stone-200/60 bg-transparent"></div>
                                    ) : (
                                        <button
                                            key={day.key}
                                            type="button"
                                            onClick={() => onSelectDate(day.date)}
                                            className={`min-h-[50px] relative rounded-xl border px-1.5 py-1 text-left transition ${
                                                selectedDay?.date === day.date
                                                    ? 'border-clay-300 bg-[#FCF7F2] ring-2 ring-clay-200 ring-offset-1'
                                                    : day.has_hours
                                                        ? day.worked_minutes > standardWorkdayMinutes
                                                            ? 'border-amber-200 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-300'
                                                            : 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-300'
                                                        : 'border-stone-100 bg-stone-50/50 hover:bg-stone-100'
                                            } ${day.is_today && selectedDay?.date !== day.date ? 'ring-1 ring-stone-200' : ''}`}
                                        >
                                            <div className="flex flex-col h-full justify-between">
                                                <div className="flex items-start justify-between">
                                                    <span className={`text-xs font-bold ${
                                                        selectedDay?.date === day.date
                                                            ? 'text-clay-900'
                                                            : day.has_hours
                                                                ? day.worked_minutes > standardWorkdayMinutes
                                                                    ? 'text-amber-900'
                                                                    : 'text-emerald-900'
                                                                : 'text-stone-700'
                                                    }`}>{day.day_number}</span>
                                                    {day.is_today && (
                                                        <span className="hidden sm:inline-flex rounded-sm bg-clay-100 px-1 py-0.5 text-[8px] font-bold uppercase tracking-widest text-clay-700">
                                                            Today
                                                        </span>
                                                    )}
                                                </div>
                                                {day.has_hours ? (
                                                    <>
                                                        {/* Desktop detail */}
                                                        <div className="hidden sm:flex items-center justify-between gap-1 mt-1">
                                                            <span className={`text-[10px] font-bold leading-tight ${
                                                                day.worked_minutes > standardWorkdayMinutes ? 'text-amber-700' : 'text-emerald-700'
                                                            }`}>
                                                                {day.worked_hours_label}
                                                            </span>
                                                            {day.worked_minutes > standardWorkdayMinutes && (
                                                                <span className="inline-flex rounded bg-amber-100 px-1 py-0.2 text-[8px] font-bold uppercase tracking-wider text-amber-800 scale-90 origin-right">
                                                                    OT
                                                                </span>
                                                            )}
                                                        </div>
                                                        {/* Mobile dot badge */}
                                                        <div className="sm:hidden flex justify-center mt-1">
                                                            <span className={`h-1.5 w-1.5 rounded-full ${
                                                                day.worked_minutes > standardWorkdayMinutes ? 'bg-amber-500' : 'bg-emerald-500'
                                                            }`} />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        {/* Desktop default */}
                                                        <p className="hidden sm:block text-[10px] font-semibold leading-tight mt-1 text-stone-400">
                                                            -
                                                        </p>
                                                        {/* Mobile placeholder to preserve vertical layout spacing */}
                                                        <div className="sm:hidden h-1.5 mt-1" />
                                                    </>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Summary Sidebar */}
                    <div className="w-full md:w-64 bg-stone-50/50 p-5 flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 shadow-sm">
                                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400">Total Hours</p>
                                <p className="mt-0.5 text-sm font-bold text-gray-900">{formatWorkedHoursLabel(totalWorkedMinutes)}</p>
                            </div>
                            <div className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 shadow-sm">
                                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400">Days Logged</p>
                                <p className="mt-0.5 text-sm font-bold text-gray-900">{daysWorked}</p>
                            </div>
                        </div>

                        <div className="hidden md:block mt-2">
                            {selectedDayBlock}
                        </div>

                        <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm flex flex-col gap-2 mt-auto">
                            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-stone-400 border-b border-stone-100 pb-1.5">Month Highlights</p>
                            <div>
                                <p className="text-[10px] font-bold text-stone-500">Best Day</p>
                                <div className="flex items-center justify-between mt-0.5">
                                    <p className="text-xs font-bold text-gray-900">{bestLoggedDay?.worked_hours_label || '0h'}</p>
                                    <p className="text-[10px] text-stone-400">
                                        {bestLoggedDay ? formatAttendanceDateLabelSafe(bestLoggedDay.date) : 'No attendance yet'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
