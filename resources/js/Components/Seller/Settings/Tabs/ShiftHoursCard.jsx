import React from 'react';
import { Clock, SunMedium, Coffee } from 'lucide-react';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';

export default function ShiftHoursCard({
    data,
    setData,
    errors = {},
    clearErrors,
    canEdit = true,
}) {
    return (
        <div className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
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
        </div>
    );
}
