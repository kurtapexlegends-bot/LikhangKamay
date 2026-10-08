import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import InputLabel from '@/Components/InputLabel';

export default function ShiftAttendanceRulesCard({
    data,
    setData,
    canEdit = true,
}) {
    return (
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
    );
}
