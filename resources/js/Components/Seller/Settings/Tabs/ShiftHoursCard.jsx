import React, { useState } from 'react';
import { Clock, SunMedium, Coffee, Layers, Copy, Check, Calendar, SlidersHorizontal } from 'lucide-react';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';

const WORK_DAYS = [
    { key: 'mon', label: 'Mon', full: 'Monday' },
    { key: 'tue', label: 'Tue', full: 'Tuesday' },
    { key: 'wed', label: 'Wed', full: 'Wednesday' },
    { key: 'thu', label: 'Thu', full: 'Thursday' },
    { key: 'fri', label: 'Fri', full: 'Friday' },
    { key: 'sat', label: 'Sat', full: 'Saturday' },
    { key: 'sun', label: 'Sun', full: 'Sunday' },
];

export default function ShiftHoursCard({
    data,
    setData,
    errors = {},
    clearErrors,
    canEdit = true,
}) {
    const isPerDay = data.shift_schedule_mode === 'per_day';
    const [activeDayKey, setActiveDayKey] = useState('mon');

    const getEffectiveDailyShifts = () => {
        if (data.daily_shifts && typeof data.daily_shifts === 'object' && Object.keys(data.daily_shifts).length > 0) {
            return data.daily_shifts;
        }
        const defaultShifts = {};
        const start = data.shift_start_time || '08:00';
        const end = data.shift_end_time || '17:00';
        const breakStart = data.break_window_start || '11:30';
        const breakEnd = data.break_window_end || '13:30';
        const breakMins = data.break_allowance_minutes ?? 60;

        WORK_DAYS.forEach((d) => {
            const isSun = d.key === 'sun';
            defaultShifts[d.key] = {
                is_work: !isSun,
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

    const dailyShifts = getEffectiveDailyShifts();

    const updateDayShift = (dayKey, field, value) => {
        if (!canEdit) return;
        const current = getEffectiveDailyShifts();
        const updatedDay = { ...(current[dayKey] || {}), [field]: value };
        setData('daily_shifts', {
            ...current,
            [dayKey]: updatedDay,
        });
    };

    const copyDayToAllDays = (sourceDayKey) => {
        if (!canEdit) return;
        const current = getEffectiveDailyShifts();
        const sourceConfig = current[sourceDayKey];
        if (!sourceConfig) return;

        const next = {};
        WORK_DAYS.forEach((d) => {
            next[d.key] = { ...sourceConfig };
        });
        setData('daily_shifts', next);
    };

    return (
        <div className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-6 shadow-2xs space-y-5">
            {/* Header with Title and Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center shrink-0">
                        <Clock size={20} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-stone-900 tracking-tight">
                            Workshop Shift Hours &amp; Lunch Break
                        </h3>
                        <p className="text-xs text-stone-500 font-medium">
                            Set your daily workshop opening/closing hours and meal break schedule.
                        </p>
                    </div>
                </div>

                {/* Mode Switcher */}
                <div className="inline-flex rounded-xl border border-stone-200/90 bg-stone-100/70 p-1 text-xs font-bold shrink-0 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={() => canEdit && setData('shift_schedule_mode', 'uniform')}
                        disabled={!canEdit}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                            !isPerDay
                                ? 'bg-white text-stone-900 shadow-xs'
                                : 'text-stone-600 hover:text-stone-900'
                        } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                        <Layers size={13} />
                        Same hours every day
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (!canEdit) return;
                            setData((prev) => ({
                                ...prev,
                                shift_schedule_mode: 'per_day',
                                daily_shifts: prev.daily_shifts || getEffectiveDailyShifts(),
                            }));
                        }}
                        disabled={!canEdit}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                            isPerDay
                                ? 'bg-clay-600 text-white shadow-xs'
                                : 'text-stone-600 hover:text-stone-900'
                        } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                        <Clock size={13} />
                        Custom hours per day
                    </button>
                </div>
            </div>

            {/* UNIFORM SCHEDULE MODE */}
            {!isPerDay && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Shift Hours Card */}
                    <div className="rounded-2xl border border-stone-200 bg-stone-50/40 p-4 sm:p-5 space-y-3.5">
                        <div className="flex items-center gap-2">
                            <SunMedium size={16} className="text-amber-700" />
                            <h4 className="text-xs font-bold text-stone-900">Work Shift &amp; Grace Period</h4>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <InputLabel value="Work Starts At" />
                                <input
                                    type="time"
                                    className={`w-full rounded-xl border text-xs font-bold text-stone-850 focus:ring-clay-500 min-h-[42px] mt-1 bg-white shadow-2xs ${
                                        errors.shift_start_time ? 'border-rose-300 bg-rose-50/50 focus:border-rose-500' : 'border-stone-300 focus:border-clay-500'
                                    }`}
                                    value={data.shift_start_time || '08:00'}
                                    onChange={(e) => {
                                        setData('shift_start_time', e.target.value);
                                        if (errors.shift_start_time) clearErrors('shift_start_time');
                                    }}
                                    disabled={!canEdit}
                                    required
                                />
                                {errors.shift_start_time && <InputError message={errors.shift_start_time} className="mt-1" />}
                            </div>

                            <div>
                                <InputLabel value="Work Ends At" />
                                <input
                                    type="time"
                                    className={`w-full rounded-xl border text-xs font-bold text-stone-850 focus:ring-clay-500 min-h-[42px] mt-1 bg-white shadow-2xs ${
                                        errors.shift_end_time ? 'border-rose-300 bg-rose-50/50 focus:border-rose-500' : 'border-stone-300 focus:border-clay-500'
                                    }`}
                                    value={data.shift_end_time || '17:00'}
                                    onChange={(e) => {
                                        setData('shift_end_time', e.target.value);
                                        if (errors.shift_end_time) clearErrors('shift_end_time');
                                    }}
                                    disabled={!canEdit}
                                    required
                                />
                                {errors.shift_end_time && <InputError message={errors.shift_end_time} className="mt-1" />}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <InputLabel value="Earliest Clock-In" />
                                <div className="mt-1 relative rounded-xl shadow-2xs">
                                    <input
                                        type="number"
                                        className={`w-full rounded-xl border pr-16 text-xs font-bold text-stone-850 focus:ring-clay-500 min-h-[42px] bg-white ${
                                            errors.earliest_clock_in_minutes ? 'border-rose-300 bg-rose-50/50 focus:border-rose-500' : 'border-stone-300 focus:border-clay-500'
                                        }`}
                                        value={data.earliest_clock_in_minutes ?? 30}
                                        onChange={(e) => {
                                            setData('earliest_clock_in_minutes', e.target.value);
                                            if (errors.earliest_clock_in_minutes) clearErrors('earliest_clock_in_minutes');
                                        }}
                                        disabled={!canEdit}
                                        min="0"
                                        max="120"
                                        required
                                    />
                                    <span className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-stone-400 pointer-events-none">
                                        mins early
                                    </span>
                                </div>
                                {errors.earliest_clock_in_minutes && <InputError message={errors.earliest_clock_in_minutes} className="mt-1" />}
                                <span className="text-[10px] text-stone-500 mt-1 block">Staff can clock in up to {data.earliest_clock_in_minutes ?? 30}m before shift</span>
                            </div>

                            <div>
                                <InputLabel value="Late Grace Period" />
                                <div className="mt-1 relative rounded-xl shadow-2xs">
                                    <input
                                        type="number"
                                        className={`w-full rounded-xl border pr-16 text-xs font-bold text-stone-850 focus:ring-clay-500 min-h-[42px] bg-white ${
                                            errors.grace_period_minutes ? 'border-rose-300 bg-rose-50/50 focus:border-rose-500' : 'border-stone-300 focus:border-clay-500'
                                        }`}
                                        value={data.grace_period_minutes ?? 15}
                                        onChange={(e) => {
                                            setData('grace_period_minutes', e.target.value);
                                            if (errors.grace_period_minutes) clearErrors('grace_period_minutes');
                                        }}
                                        disabled={!canEdit}
                                        min="0"
                                        max="120"
                                        required
                                    />
                                    <span className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-stone-400 pointer-events-none">
                                        minutes
                                    </span>
                                </div>
                                {errors.grace_period_minutes && <InputError message={errors.grace_period_minutes} className="mt-1" />}
                                <span className="text-[10px] text-stone-500 mt-1 block">Staff arriving within {data.grace_period_minutes ?? 15}m are marked on-time</span>
                            </div>
                        </div>

                        {/* Strict Shift Window Enforcement Toggle */}
                        <div className="pt-3 border-t border-stone-200/80 flex items-start justify-between gap-3">
                            <div className="space-y-0.5">
                                <label className="text-xs font-bold text-stone-900 cursor-pointer" htmlFor="enforce_strict_shift_window">
                                    Strict Shift Window Enforcement
                                </label>
                                <p className="text-[11px] text-stone-500 leading-relaxed font-medium">
                                    Block clock-in when workshop is closed. When off, out-of-bounds clock-ins are flagged for manager approval.
                                </p>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                id="enforce_strict_shift_window"
                                aria-checked={data.enforce_strict_shift_window}
                                onClick={() => canEdit && setData('enforce_strict_shift_window', !data.enforce_strict_shift_window)}
                                disabled={!canEdit}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                    data.enforce_strict_shift_window ? 'bg-clay-600' : 'bg-stone-200'
                                } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                        data.enforce_strict_shift_window ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Lunch Break Card */}
                    <div className="rounded-2xl border border-stone-200 bg-stone-50/40 p-4 sm:p-5 space-y-3.5">
                        <div className="flex items-center gap-2">
                            <Coffee size={16} className="text-amber-800" />
                            <h4 className="text-xs font-bold text-stone-900">Lunch / Meal Break</h4>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <InputLabel value="Lunch Starts At" />
                                <input
                                    type="time"
                                    className={`w-full rounded-xl border text-xs font-bold text-stone-850 focus:ring-clay-500 min-h-[42px] mt-1 bg-white shadow-2xs ${
                                        errors.break_window_start ? 'border-rose-300 bg-rose-50/50 focus:border-rose-500' : 'border-stone-300 focus:border-clay-500'
                                    }`}
                                    value={data.break_window_start || '11:30'}
                                    onChange={(e) => {
                                        setData('break_window_start', e.target.value);
                                        if (errors.break_window_start) clearErrors('break_window_start');
                                    }}
                                    disabled={!canEdit}
                                />
                                {errors.break_window_start && <InputError message={errors.break_window_start} className="mt-1" />}
                            </div>

                            <div>
                                <InputLabel value="Lunch Ends At" />
                                <input
                                    type="time"
                                    className={`w-full rounded-xl border text-xs font-bold text-stone-850 focus:ring-clay-500 min-h-[42px] mt-1 bg-white shadow-2xs ${
                                        errors.break_window_end ? 'border-rose-300 bg-rose-50/50 focus:border-rose-500' : 'border-stone-300 focus:border-clay-500'
                                    }`}
                                    value={data.break_window_end || '13:30'}
                                    onChange={(e) => {
                                        setData('break_window_end', e.target.value);
                                        if (errors.break_window_end) clearErrors('break_window_end');
                                    }}
                                    disabled={!canEdit}
                                />
                                {errors.break_window_end && <InputError message={errors.break_window_end} className="mt-1" />}
                            </div>
                        </div>

                        <div>
                            <InputLabel value="Max Break Time" />
                            <div className="mt-1 relative rounded-xl shadow-2xs">
                                <input
                                    type="number"
                                    className={`w-full rounded-xl border pr-16 text-xs font-bold text-stone-850 focus:ring-clay-500 min-h-[42px] bg-white ${
                                        errors.break_allowance_minutes ? 'border-rose-300 bg-rose-50/50 focus:border-rose-500' : 'border-stone-300 focus:border-clay-500'
                                    }`}
                                    value={data.break_allowance_minutes ?? 60}
                                    onChange={(e) => {
                                        setData('break_allowance_minutes', e.target.value);
                                        if (errors.break_allowance_minutes) clearErrors('break_allowance_minutes');
                                    }}
                                    disabled={!canEdit}
                                    min="0"
                                    max="180"
                                    required
                                />
                                <span className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-stone-400 pointer-events-none">
                                    minutes
                                </span>
                            </div>
                            {errors.break_allowance_minutes && <InputError message={errors.break_allowance_minutes} className="mt-1" />}
                            <span className="text-[10px] text-stone-500 mt-1 block">Standard meal break is 60 minutes (1 hour)</span>
                        </div>
                    </div>
                </div>
            )}

            {/* PER-DAY CUSTOM SHIFTS MODE */}
            {isPerDay && (
                <div className="space-y-4">
                    {/* Day Selection Tabs */}
                    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                        {WORK_DAYS.map((day) => {
                            const isSelected = activeDayKey === day.key;
                            const dayConfig = dailyShifts[day.key] || { is_work: true, start: '08:00', end: '17:00' };
                            const isWork = Boolean(dayConfig.is_work);

                            return (
                                <button
                                    key={day.key}
                                    type="button"
                                    onClick={() => setActiveDayKey(day.key)}
                                    className={`relative flex flex-col items-center justify-center py-2.5 px-1 sm:px-2 rounded-xl text-xs font-bold transition-all border ${
                                        isSelected
                                            ? 'bg-clay-600 text-white border-clay-600 shadow-xs'
                                            : 'bg-stone-50 text-stone-700 border-stone-200/80 hover:bg-stone-100'
                                    }`}
                                >
                                    <span className="text-[11px] sm:hidden">{day.label}</span>
                                    <span className="hidden sm:inline">{day.full}</span>
                                    <span
                                        className={`mt-1 text-[9px] font-semibold px-1.5 py-0.2 rounded-full ${
                                            isSelected
                                                ? 'bg-clay-700/80 text-white'
                                                : isWork
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                                : 'bg-stone-200/70 text-stone-500'
                                        }`}
                                    >
                                        {isWork ? `${dayConfig.start || '08:00'}` : 'Rest'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Active Day Detail Card */}
                    {(() => {
                        const activeDay = WORK_DAYS.find((d) => d.key === activeDayKey);
                        const dayConfig = dailyShifts[activeDayKey] || {
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
                            <div className="rounded-2xl border border-stone-200/80 bg-stone-50/50 p-4 sm:p-5 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/70 pb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-700 font-bold text-xs">
                                            {activeDay?.label}
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-stone-900">
                                                {activeDay?.full} Shift Policy
                                            </h4>
                                            <p className="text-[11px] text-stone-500">
                                                {isWork
                                                    ? `${dayConfig.start || '08:00'} – ${dayConfig.end || '17:00'}${hasBreak ? ` • ${dayConfig.break_minutes ?? 60}m meal break` : ' • No meal break'}`
                                                    : 'Rest Day (Workshop Closed)'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => updateDayShift(activeDayKey, 'is_work', !isWork)}
                                            disabled={!canEdit}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                                                isWork
                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                                    : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                                            } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        >
                                            {isWork ? 'Working Day' : 'Mark as Rest Day'}
                                        </button>

                                        {canEdit && (
                                            <button
                                                type="button"
                                                onClick={() => copyDayToAllDays(activeDayKey)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:text-clay-700 hover:border-clay-300 text-xs font-bold transition shadow-2xs"
                                                title="Copy this day's shift and break hours to Monday through Sunday"
                                            >
                                                <Copy size={13} />
                                                <span>Copy to all days</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {!isWork ? (
                                    <div className="p-4 rounded-xl bg-white border border-dashed border-stone-300 text-center space-y-2">
                                        <p className="text-xs text-stone-500 font-medium">
                                            {activeDay?.full} is designated as a <strong className="text-stone-700">Rest Day</strong>. Workshop staff are not scheduled to clock in.
                                        </p>
                                        {canEdit && (
                                            <button
                                                type="button"
                                                onClick={() => updateDayShift(activeDayKey, 'is_work', true)}
                                                className="text-xs font-bold text-clay-700 hover:text-clay-800 transition underline underline-offset-2"
                                            >
                                                Enable shift for {activeDay?.full}
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {/* Shift Working Hours */}
                                        <div className="rounded-xl border border-stone-200/90 bg-white p-4 space-y-3 shadow-2xs">
                                            <div className="flex items-center gap-2">
                                                <SunMedium size={15} className="text-amber-700" />
                                                <h5 className="text-xs font-bold text-stone-900">{activeDay?.full} Shift Hours</h5>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <InputLabel value="Work Starts At" />
                                                    <input
                                                        type="time"
                                                        className="w-full rounded-xl border text-xs font-bold text-stone-850 focus:ring-clay-500 min-h-[40px] mt-1 bg-white shadow-2xs border-stone-300 focus:border-clay-500"
                                                        value={dayConfig.start || '08:00'}
                                                        onChange={(e) => updateDayShift(activeDayKey, 'start', e.target.value)}
                                                        disabled={!canEdit}
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <InputLabel value="Work Ends At" />
                                                    <input
                                                        type="time"
                                                        className="w-full rounded-xl border text-xs font-bold text-stone-850 focus:ring-clay-500 min-h-[40px] mt-1 bg-white shadow-2xs border-stone-300 focus:border-clay-500"
                                                        value={dayConfig.end || '17:00'}
                                                        onChange={(e) => updateDayShift(activeDayKey, 'end', e.target.value)}
                                                        disabled={!canEdit}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Meal Break for This Day */}
                                        <div className="rounded-xl border border-stone-200/90 bg-white p-4 space-y-3 shadow-2xs">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Coffee size={15} className="text-amber-800" />
                                                    <h5 className="text-xs font-bold text-stone-900">Meal Break on {activeDay?.label}</h5>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => updateDayShift(activeDayKey, 'has_break', !hasBreak)}
                                                    disabled={!canEdit}
                                                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition border ${
                                                        hasBreak
                                                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                                                            : 'bg-stone-100 text-stone-600 border-stone-200'
                                                    }`}
                                                >
                                                    {hasBreak ? 'Break Enabled' : 'No Break (Half Day)'}
                                                </button>
                                            </div>

                                            {hasBreak ? (
                                                <div className="space-y-3">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <InputLabel value="Lunch Starts" />
                                                            <input
                                                                type="time"
                                                                className="w-full rounded-xl border text-xs font-bold text-stone-850 focus:ring-clay-500 min-h-[40px] mt-1 bg-white shadow-2xs border-stone-300 focus:border-clay-500"
                                                                value={dayConfig.break_start || '11:30'}
                                                                onChange={(e) => updateDayShift(activeDayKey, 'break_start', e.target.value)}
                                                                disabled={!canEdit}
                                                            />
                                                        </div>
                                                        <div>
                                                            <InputLabel value="Lunch Ends" />
                                                            <input
                                                                type="time"
                                                                className="w-full rounded-xl border text-xs font-bold text-stone-850 focus:ring-clay-500 min-h-[40px] mt-1 bg-white shadow-2xs border-stone-300 focus:border-clay-500"
                                                                value={dayConfig.break_end || '13:30'}
                                                                onChange={(e) => updateDayShift(activeDayKey, 'break_end', e.target.value)}
                                                                disabled={!canEdit}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <InputLabel value="Max Allowance (Mins)" />
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="180"
                                                            className="w-full rounded-xl border text-xs font-bold text-stone-850 focus:ring-clay-500 min-h-[40px] mt-1 bg-white shadow-2xs border-stone-300 focus:border-clay-500"
                                                            value={dayConfig.break_minutes ?? 60}
                                                            onChange={(e) => updateDayShift(activeDayKey, 'break_minutes', Number(e.target.value))}
                                                            disabled={!canEdit}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-stone-500 p-2.5 rounded-lg bg-stone-50 border border-stone-200/60 font-medium">
                                                    Staff are not scheduled for an official lunch break on {activeDay?.full}s (ideal for half-day shifts).
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Shared Attendance Rules Card */}
                    <div className="rounded-2xl border border-stone-200 bg-stone-50/40 p-4 sm:p-5 space-y-3.5">
                        <div className="flex items-center gap-2">
                            <SlidersHorizontal size={15} className="text-stone-700" />
                            <h4 className="text-xs font-bold text-stone-900">Attendance Window &amp; Grace Period Rules</h4>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <InputLabel value="Earliest Clock-In" />
                                <div className="mt-1 relative rounded-xl shadow-2xs">
                                    <input
                                        type="number"
                                        className="w-full rounded-xl border pr-16 text-xs font-bold text-stone-850 focus:ring-clay-500 min-h-[42px] bg-white border-stone-300 focus:border-clay-500"
                                        value={data.earliest_clock_in_minutes ?? 30}
                                        onChange={(e) => setData('earliest_clock_in_minutes', e.target.value)}
                                        disabled={!canEdit}
                                        min="0"
                                        max="120"
                                        required
                                    />
                                    <span className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-stone-400 pointer-events-none">
                                        mins early
                                    </span>
                                </div>
                                <span className="text-[10px] text-stone-500 mt-1 block">Staff can clock in up to {data.earliest_clock_in_minutes ?? 30}m before shift</span>
                            </div>

                            <div>
                                <InputLabel value="Late Grace Period" />
                                <div className="mt-1 relative rounded-xl shadow-2xs">
                                    <input
                                        type="number"
                                        className="w-full rounded-xl border pr-16 text-xs font-bold text-stone-850 focus:ring-clay-500 min-h-[42px] bg-white border-stone-300 focus:border-clay-500"
                                        value={data.grace_period_minutes ?? 15}
                                        onChange={(e) => setData('grace_period_minutes', e.target.value)}
                                        disabled={!canEdit}
                                        min="0"
                                        max="120"
                                        required
                                    />
                                    <span className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-stone-400 pointer-events-none">
                                        minutes
                                    </span>
                                </div>
                                <span className="text-[10px] text-stone-500 mt-1 block">Staff arriving within {data.grace_period_minutes ?? 15}m are marked on-time</span>
                            </div>
                        </div>

                        {/* Strict Shift Window Enforcement Toggle */}
                        <div className="pt-3 border-t border-stone-200/80 flex items-start justify-between gap-3">
                            <div className="space-y-0.5">
                                <label className="text-xs font-bold text-stone-900 cursor-pointer" htmlFor="enforce_strict_shift_window">
                                    Strict Shift Window Enforcement
                                </label>
                                <p className="text-[11px] text-stone-500 leading-relaxed font-medium">
                                    Block clock-in when workshop is closed. When off, out-of-bounds clock-ins are flagged for manager approval.
                                </p>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                id="enforce_strict_shift_window"
                                aria-checked={data.enforce_strict_shift_window}
                                onClick={() => canEdit && setData('enforce_strict_shift_window', !data.enforce_strict_shift_window)}
                                disabled={!canEdit}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                    data.enforce_strict_shift_window ? 'bg-clay-600' : 'bg-stone-200'
                                } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                        data.enforce_strict_shift_window ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
