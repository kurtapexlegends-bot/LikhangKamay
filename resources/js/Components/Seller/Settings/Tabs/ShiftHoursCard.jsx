import React from 'react';
import { Clock, Layers } from 'lucide-react';
import UniformShiftSection from '@/Components/Seller/Settings/Tabs/Shifts/UniformShiftSection';
import PerDayShiftSection from '@/Components/Seller/Settings/Tabs/Shifts/PerDayShiftSection';
import ShiftAttendanceRulesCard from '@/Components/Seller/Settings/Tabs/Shifts/ShiftAttendanceRulesCard';

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
                <UniformShiftSection
                    data={data}
                    setData={setData}
                    errors={errors}
                    clearErrors={clearErrors}
                    canEdit={canEdit}
                />
            )}

            {/* PER-DAY CUSTOM SHIFTS MODE */}
            {isPerDay && (
                <div className="space-y-4">
                    <PerDayShiftSection
                        dailyShifts={dailyShifts}
                        updateDayShift={updateDayShift}
                        copyDayToAllDays={copyDayToAllDays}
                        canEdit={canEdit}
                    />

                    <ShiftAttendanceRulesCard
                        data={data}
                        setData={setData}
                        canEdit={canEdit}
                    />
                </div>
            )}
        </div>
    );
}
