import React, { useState } from 'react';
import { Clock, Copy } from 'lucide-react';
import { modalFieldClass } from '@/utils/hrHelpers';

const DAYS = [
    { key: 'mon', label: 'Mon', full: 'Monday' },
    { key: 'tue', label: 'Tue', full: 'Tuesday' },
    { key: 'wed', label: 'Wed', full: 'Wednesday' },
    { key: 'thu', label: 'Thu', full: 'Thursday' },
    { key: 'fri', label: 'Fri', full: 'Friday' },
    { key: 'sat', label: 'Sat', full: 'Saturday' },
    { key: 'sun', label: 'Sun', full: 'Sunday' },
];

export default function EmployeeSchedulePolicyCard({
    data,
    setData,
    sellerSettings = {},
}) {
    const isCustomSchedule = data.schedule_type === 'custom';
    const activeWorkingDays = Array.isArray(data.working_days) ? data.working_days : [];

    const defaultShiftStart = sellerSettings.shift_start_time || '08:00';
    const defaultShiftEnd = sellerSettings.shift_end_time || '17:00';
    const defaultHours = sellerSettings.standard_workday_hours || 8.0;
    const factorMethod = sellerSettings.payroll_factor_method || 'custom';
    const workingDaysCount = sellerSettings.payroll_working_days ?? 22;

    const defaultScheduleLabel = factorMethod === '261'
        ? 'Mon–Fri (5 days/wk)'
        : factorMethod === '313'
        ? 'Mon–Sat (6 days/wk)'
        : `${workingDaysCount} days/mo (Custom Schedule)`;

    const toggleDay = (dayKey) => {
        if (activeWorkingDays.includes(dayKey)) {
            setData('working_days', activeWorkingDays.filter(d => d !== dayKey));
        } else {
            setData('working_days', [...activeWorkingDays, dayKey]);
        }
    };

    const isPerDayCustomShift = data.shift_schedule_mode === 'per_day';
    const [activeStaffDayKey, setActiveStaffDayKey] = useState('mon');

    const getStaffEffectiveDailyShifts = () => {
        if (data.daily_shifts && typeof data.daily_shifts === 'object' && Object.keys(data.daily_shifts).length > 0) {
            return data.daily_shifts;
        }
        const defaultShifts = {};
        const start = data.shift_start_time || defaultShiftStart;
        const end = data.shift_end_time || defaultShiftEnd;
        const breakStart = data.break_window_start || sellerSettings.break_window_start || '11:30';
        const breakEnd = data.break_window_end || sellerSettings.break_window_end || '13:30';
        const breakMins = data.break_allowance_minutes ?? (sellerSettings.break_allowance_minutes ?? 60);

        DAYS.forEach((d) => {
            const isWork = activeWorkingDays.length > 0 ? activeWorkingDays.includes(d.key) : d.key !== 'sun';
            defaultShifts[d.key] = {
                is_work: isWork,
                start,
                end,
                has_break: true,
                break_start: breakStart,
                break_end: breakEnd,
                break_minutes: breakMins,
            };
        });
        return defaultShifts;
    };

    const staffDailyShifts = getStaffEffectiveDailyShifts();

    const updateStaffDayShift = (dayKey, field, value) => {
        const current = getStaffEffectiveDailyShifts();
        const updatedDay = { ...(current[dayKey] || {}), [field]: value };
        const updatedShifts = {
            ...current,
            [dayKey]: updatedDay,
        };
        const newWorkingDays = DAYS.filter((d) => Boolean(updatedShifts[d.key]?.is_work)).map((d) => d.key);
        setData('daily_shifts', updatedShifts);
        setData('working_days', newWorkingDays);
    };

    const copyStaffDayToAllDays = (sourceDayKey) => {
        const current = getStaffEffectiveDailyShifts();
        const sourceConfig = current[sourceDayKey];
        if (!sourceConfig) return;

        const next = {};
        DAYS.forEach((d) => {
            next[d.key] = { ...sourceConfig };
        });
        const newWorkingDays = sourceConfig.is_work ? DAYS.map((d) => d.key) : [];
        setData('daily_shifts', next);
        setData('working_days', newWorkingDays);
    };

    return (
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-stone-800 font-bold text-xs uppercase tracking-wider">
                    <Clock size={14} className="text-clay-600" />
                    <span>Work Schedule &amp; Shift Policy</span>
                </div>

                {/* Schedule Type Segmented Toggle */}
                <div className="inline-flex rounded-xl border border-stone-200 bg-stone-50 p-0.5 text-[11px] font-bold">
                    <button
                        type="button"
                        onClick={() => setData('schedule_type', 'default')}
                        className={`rounded-lg px-2.5 py-1 transition ${
                            !isCustomSchedule
                                ? 'bg-white text-stone-900 shadow-xs'
                                : 'text-stone-500 hover:text-stone-800'
                        }`}
                    >
                        Shop Default
                    </button>
                    <button
                        type="button"
                        onClick={() => setData('schedule_type', 'custom')}
                        className={`rounded-lg px-2.5 py-1 transition ${
                            isCustomSchedule
                                ? 'bg-clay-600 text-white shadow-xs'
                                : 'text-stone-500 hover:text-stone-800'
                        }`}
                    >
                        Custom Shift
                    </button>
                </div>
            </div>

            {!isCustomSchedule ? (
                <div className="rounded-xl border border-stone-100 bg-[#FDFBF9] p-3.5 flex items-center justify-between text-xs text-stone-600">
                    <div className="space-y-0.5">
                        <span className="font-semibold text-stone-800 block">Inheriting Workshop Default Policy</span>
                        <span className="text-[11px] text-stone-500 block">
                            Shift: {defaultShiftStart} – {defaultShiftEnd} • {Number(defaultHours).toFixed(2)} hrs/day • {defaultScheduleLabel}
                        </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                        Automatic
                    </span>
                </div>
            ) : (
                <div className="space-y-4 pt-1">
                    {/* Custom Schedule Format Switcher */}
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                        <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                            Custom Shift Format
                        </span>
                        <div className="inline-flex rounded-lg border border-stone-200 bg-stone-100/70 p-0.5 text-[11px] font-bold">
                            <button
                                type="button"
                                onClick={() => setData('shift_schedule_mode', 'uniform')}
                                className={`rounded-md px-2 py-1 transition ${
                                    !isPerDayCustomShift
                                        ? 'bg-white text-stone-900 shadow-2xs'
                                        : 'text-stone-500 hover:text-stone-800'
                                }`}
                            >
                                Same Hours Every Day
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setData('shift_schedule_mode', 'per_day');
                                    if (!data.daily_shifts) {
                                        setData('daily_shifts', getStaffEffectiveDailyShifts());
                                    }
                                }}
                                className={`rounded-md px-2 py-1 transition ${
                                    isPerDayCustomShift
                                        ? 'bg-clay-600 text-white shadow-2xs'
                                        : 'text-stone-500 hover:text-stone-800'
                                }`}
                            >
                                Custom Per Day
                            </button>
                        </div>
                    </div>

                    {!isPerDayCustomShift ? (
                        <div className="space-y-3.5">
                            {/* Working Days Selector */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[11px] font-bold text-stone-700 block">
                                        Assigned Working Days <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setData('working_days', ['mon', 'tue', 'wed', 'thu', 'fri']);
                                            }}
                                            className="text-[10px] font-bold text-clay-700 hover:text-clay-800 bg-clay-50 hover:bg-clay-100 px-1.5 py-0.5 rounded border border-clay-200/60 transition"
                                        >
                                            Mon–Fri
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setData('working_days', ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
                                            }}
                                            className="text-[10px] font-bold text-clay-700 hover:text-clay-800 bg-clay-50 hover:bg-clay-100 px-1.5 py-0.5 rounded border border-clay-200/60 transition"
                                        >
                                            Mon–Sat
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setData('working_days', ['sat', 'sun']);
                                            }}
                                            className="text-[10px] font-bold text-clay-700 hover:text-clay-800 bg-clay-50 hover:bg-clay-100 px-1.5 py-0.5 rounded border border-clay-200/60 transition"
                                        >
                                            Weekends
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-7 gap-1.5">
                                    {DAYS.map(day => {
                                        const isSelected = activeWorkingDays.includes(day.key);
                                        return (
                                            <button
                                                key={day.key}
                                                type="button"
                                                onClick={() => toggleDay(day.key)}
                                                className={`rounded-xl py-2 text-xs font-bold transition flex flex-col items-center justify-center border ${
                                                    isSelected
                                                        ? 'border-clay-600 bg-clay-600 text-white shadow-xs'
                                                        : 'border-stone-200 bg-stone-50/60 text-stone-600 hover:bg-stone-100'
                                                }`}
                                            >
                                                <span>{day.label}</span>
                                                <span className={`text-[9px] font-medium ${isSelected ? 'text-clay-100' : 'text-stone-400'}`}>
                                                    {isSelected ? 'Work' : 'Rest'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {activeWorkingDays.length === 0 && (
                                    <p className="mt-1.5 text-[11px] text-amber-700 font-medium">
                                        Please select at least 1 working day for this custom schedule.
                                    </p>
                                )}
                            </div>

                            {/* Shift Times & Standard Daily Hours */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="mb-1 block text-[11px] font-bold text-stone-700">
                                        Shift Start Time
                                    </label>
                                    <input
                                        type="time"
                                        className={`${modalFieldClass} h-9.5 text-xs font-medium`}
                                        value={data.shift_start_time || defaultShiftStart}
                                        onChange={e => setData('shift_start_time', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-[11px] font-bold text-stone-700">
                                        Shift End Time
                                    </label>
                                    <input
                                        type="time"
                                        className={`${modalFieldClass} h-9.5 text-xs font-medium`}
                                        value={data.shift_end_time || defaultShiftEnd}
                                        onChange={e => setData('shift_end_time', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-[11px] font-bold text-stone-700">
                                        Daily Standard Hours
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="24"
                                        step="0.5"
                                        className={`${modalFieldClass} h-9.5 text-xs font-medium`}
                                        placeholder={`${defaultHours}`}
                                        value={data.standard_workday_hours || ''}
                                        onChange={e => setData('standard_workday_hours', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Per-Day Staff Custom Shift Mode */
                        <div className="space-y-3.5">
                            {/* Day Tabs */}
                            <div className="grid grid-cols-7 gap-1">
                                {DAYS.map(day => {
                                    const isSelected = activeStaffDayKey === day.key;
                                    const dayConfig = staffDailyShifts[day.key] || { is_work: true, start: '08:00', end: '17:00' };
                                    const isWork = Boolean(dayConfig.is_work);

                                    return (
                                        <button
                                            key={day.key}
                                            type="button"
                                            onClick={() => setActiveStaffDayKey(day.key)}
                                            className={`rounded-xl py-2 text-xs font-bold transition flex flex-col items-center justify-center border ${
                                                isSelected
                                                    ? 'border-clay-600 bg-clay-600 text-white shadow-xs'
                                                    : 'border-stone-200 bg-stone-50/60 text-stone-700 hover:bg-stone-100'
                                            }`}
                                        >
                                            <span>{day.label}</span>
                                            <span className={`text-[9px] font-medium ${isSelected ? 'text-clay-100' : isWork ? 'text-emerald-700' : 'text-stone-400'}`}>
                                                {isWork ? `${dayConfig.start || '08:00'}` : 'Rest'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Active Day Detail Card */}
                            {(() => {
                                const activeDay = DAYS.find(d => d.key === activeStaffDayKey);
                                const dayConfig = staffDailyShifts[activeStaffDayKey] || {
                                    is_work: true,
                                    start: '08:00',
                                    end: '17:00',
                                    has_break: true,
                                    break_start: '11:30',
                                    break_end: '13:30',
                                    break_minutes: 60,
                                };
                                const isWork = Boolean(dayConfig.is_work);
                                const hasBreak = Boolean(dayConfig.has_break);

                                return (
                                    <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-3.5 space-y-3">
                                        <div className="flex items-center justify-between border-b border-stone-200/70 pb-2.5">
                                            <span className="text-xs font-bold text-stone-900">
                                                {activeDay?.full} Shift
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => updateStaffDayShift(activeStaffDayKey, 'is_work', !isWork)}
                                                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${
                                                        isWork
                                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                            : 'bg-white text-stone-600 border-stone-200'
                                                    }`}
                                                >
                                                    {isWork ? 'Working Day' : 'Rest Day'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => copyStaffDayToAllDays(activeStaffDayKey)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-stone-200 text-stone-700 hover:text-clay-700 text-[11px] font-bold shadow-2xs"
                                                    title="Copy this day's settings to Monday through Sunday"
                                                >
                                                    <Copy size={12} />
                                                    <span>Copy all</span>
                                                </button>
                                            </div>
                                        </div>

                                        {!isWork ? (
                                            <p className="text-xs text-stone-500 text-center py-2">
                                                {activeDay?.full} is set as a Rest Day for this staff member.
                                            </p>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="mb-1 block text-[11px] font-bold text-stone-700">
                                                            Shift Start
                                                        </label>
                                                        <input
                                                            type="time"
                                                            className={`${modalFieldClass} h-9.5 text-xs font-medium`}
                                                            value={dayConfig.start || '08:00'}
                                                            onChange={e => updateStaffDayShift(activeStaffDayKey, 'start', e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="mb-1 block text-[11px] font-bold text-stone-700">
                                                            Shift End
                                                        </label>
                                                        <input
                                                            type="time"
                                                            className={`${modalFieldClass} h-9.5 text-xs font-medium`}
                                                            value={dayConfig.end || '17:00'}
                                                            onChange={e => updateStaffDayShift(activeStaffDayKey, 'end', e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="pt-2 border-t border-stone-200/60">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-[11px] font-bold text-stone-700">Meal Break</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => updateStaffDayShift(activeStaffDayKey, 'has_break', !hasBreak)}
                                                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                                hasBreak ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-stone-100 text-stone-600 border-stone-200'
                                                            }`}
                                                        >
                                                            {hasBreak ? 'Break Enabled' : 'No Break'}
                                                        </button>
                                                    </div>

                                                    {hasBreak && (
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div>
                                                                <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">Starts</label>
                                                                <input
                                                                    type="time"
                                                                    className={`${modalFieldClass} h-8 text-[11px] font-medium`}
                                                                    value={dayConfig.break_start || '11:30'}
                                                                    onChange={e => updateStaffDayShift(activeStaffDayKey, 'break_start', e.target.value)}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">Ends</label>
                                                                <input
                                                                    type="time"
                                                                    className={`${modalFieldClass} h-8 text-[11px] font-medium`}
                                                                    value={dayConfig.break_end || '13:30'}
                                                                    onChange={e => updateStaffDayShift(activeStaffDayKey, 'break_end', e.target.value)}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">Mins</label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="180"
                                                                    className={`${modalFieldClass} h-8 text-[11px] font-medium`}
                                                                    value={dayConfig.break_minutes ?? 60}
                                                                    onChange={e => updateStaffDayShift(activeStaffDayKey, 'break_minutes', Number(e.target.value))}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
