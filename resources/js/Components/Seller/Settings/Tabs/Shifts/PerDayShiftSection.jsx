import React, { useState } from 'react';
import { SunMedium, Coffee, Copy } from 'lucide-react';
import InputLabel from '@/Components/InputLabel';

const WORK_DAYS = [
    { key: 'mon', label: 'Mon', full: 'Monday' },
    { key: 'tue', label: 'Tue', full: 'Tuesday' },
    { key: 'wed', label: 'Wed', full: 'Wednesday' },
    { key: 'thu', label: 'Thu', full: 'Thursday' },
    { key: 'fri', label: 'Fri', full: 'Friday' },
    { key: 'sat', label: 'Sat', full: 'Saturday' },
    { key: 'sun', label: 'Sun', full: 'Sunday' },
];

export default function PerDayShiftSection({
    dailyShifts = {},
    updateDayShift,
    copyDayToAllDays,
    canEdit = true,
}) {
    const [activeDayKey, setActiveDayKey] = useState('mon');

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
        <div className="space-y-4">
            {/* Day Selection Tabs */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {WORK_DAYS.map((day) => {
                    const isSelected = activeDayKey === day.key;
                    const config = dailyShifts[day.key] || { is_work: true, start: '08:00', end: '17:00' };
                    const dayIsWork = Boolean(config.is_work);

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
                                        : dayIsWork
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                        : 'bg-stone-200/70 text-stone-500'
                                }`}
                            >
                                {dayIsWork ? `${config.start || '08:00'}` : 'Rest'}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Active Day Detail Card */}
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
        </div>
    );
}
