import React from 'react';
import { TrendingUp, AlertTriangle, Moon } from 'lucide-react';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';

export default function OvertimeRulesCard({
    data,
    setData,
    errors = {},
    clearErrors,
    canEdit = true,
}) {
    const isNonCompliantOT = 
        (Number(data.overtime_multiplier) || 0) < 1.25 ||
        (Number(data.rest_day_ot_multiplier) || 0) < 1.69 ||
        (Number(data.holiday_ot_multiplier) || 0) < 2.60;

    return (
        <div className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center shrink-0">
                    <TrendingUp size={20} />
                </div>
                <div>
                    <h3 className="text-base font-bold text-stone-900 tracking-tight">
                        Overtime &amp; Holiday Pay Rates
                    </h3>
                    <p className="text-xs text-stone-500 font-medium">
                        Philippine labor standard rates (DOLE) for extra hours, rest days, and holidays.
                    </p>
                </div>
            </div>

            {/* Compliance Alert */}
            {isNonCompliantOT && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 flex items-start gap-3">
                    <AlertTriangle size={17} className="text-amber-700 shrink-0 mt-0.5" />
                    <div className="leading-relaxed font-medium">
                        <strong className="font-bold">Labor law reminder:</strong> Configured overtime rates are below DOLE legal minimums (1.25× regular, 1.69× rest days, 2.60× regular holidays).
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Regular Workday OT */}
                <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Regular Workday</span>
                        <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/60 rounded px-1.5 py-0.5">
                            DOLE Min: 1.25×
                        </span>
                    </div>
                    <InputLabel value="Extra Hours Pay" />
                    <div className="mt-1 relative rounded-xl shadow-2xs">
                        <input
                            type="number"
                            className={`w-full rounded-xl border pr-8 text-sm font-bold text-stone-850 focus:ring-clay-500 min-h-[42px] ${
                                errors.overtime_multiplier ? 'border-rose-300 bg-rose-50/50 focus:border-rose-500' : 'border-stone-300 focus:border-clay-500'
                            }`}
                            value={data.overtime_multiplier ?? ''}
                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                            onChange={(e) => {
                                setData('overtime_multiplier', e.target.value.replace(/-/g, ''));
                                if (errors.overtime_multiplier && clearErrors) clearErrors('overtime_multiplier');
                            }}
                            disabled={!canEdit}
                            required
                            min="0.01"
                            max="10"
                            step="0.01"
                        />
                        <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-stone-400 pointer-events-none">
                            ×
                        </span>
                    </div>
                    {errors.overtime_multiplier && <InputError message={errors.overtime_multiplier} className="mt-1" />}
                    <span className="text-[10px] text-stone-400 mt-1.5 block font-medium">Base rate + 25% for regular overtime</span>
                </div>

                {/* Rest Day OT */}
                <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Rest Day / Special Day</span>
                        <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/60 rounded px-1.5 py-0.5">
                            DOLE Min: 1.69×
                        </span>
                    </div>
                    <InputLabel value="Rest Day Overtime" />
                    <div className="mt-1 relative rounded-xl shadow-2xs">
                        <input
                            type="number"
                            className={`w-full rounded-xl border pr-8 text-sm font-bold text-stone-850 focus:ring-clay-500 min-h-[42px] ${
                                errors.rest_day_ot_multiplier ? 'border-rose-300 bg-rose-50/50 focus:border-rose-500' : 'border-stone-300 focus:border-clay-500'
                            }`}
                            value={data.rest_day_ot_multiplier ?? ''}
                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                            onChange={(e) => {
                                setData('rest_day_ot_multiplier', e.target.value.replace(/-/g, ''));
                                if (errors.rest_day_ot_multiplier && clearErrors) clearErrors('rest_day_ot_multiplier');
                            }}
                            disabled={!canEdit}
                            required
                            min="0.01"
                            max="10"
                            step="0.01"
                        />
                        <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-stone-400 pointer-events-none">
                            ×
                        </span>
                    </div>
                    {errors.rest_day_ot_multiplier && <InputError message={errors.rest_day_ot_multiplier} className="mt-1" />}
                    <span className="text-[10px] text-stone-400 mt-1.5 block font-medium">130% on rest day, 169% when working OT</span>
                </div>

                {/* Regular Holiday OT */}
                <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Regular Holiday</span>
                        <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/60 rounded px-1.5 py-0.5">
                            DOLE Min: 2.60×
                        </span>
                    </div>
                    <InputLabel value="Regular Holiday Overtime" />
                    <div className="mt-1 relative rounded-xl shadow-2xs">
                        <input
                            type="number"
                            className={`w-full rounded-xl border pr-8 text-sm font-bold text-stone-850 focus:ring-clay-500 min-h-[42px] ${
                                errors.holiday_ot_multiplier ? 'border-rose-300 bg-rose-50/50 focus:border-rose-500' : 'border-stone-300 focus:border-clay-500'
                            }`}
                            value={data.holiday_ot_multiplier ?? ''}
                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                            onChange={(e) => {
                                setData('holiday_ot_multiplier', e.target.value.replace(/-/g, ''));
                                if (errors.holiday_ot_multiplier && clearErrors) clearErrors('holiday_ot_multiplier');
                            }}
                            disabled={!canEdit}
                            required
                            min="0.01"
                            max="10"
                            step="0.01"
                        />
                        <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-stone-400 pointer-events-none">
                            ×
                        </span>
                    </div>
                    {errors.holiday_ot_multiplier && <InputError message={errors.holiday_ot_multiplier} className="mt-1" />}
                    <span className="text-[10px] text-stone-400 mt-1.5 block font-medium">200% regular holiday, 260% when working OT</span>
                </div>
            </div>

            {/* Night Shift Differential Notice */}
            <div className="rounded-2xl border border-stone-100 bg-stone-50/50 p-3.5 flex items-center gap-3 text-xs text-stone-600">
                <div className="w-8 h-8 rounded-xl bg-clay-50 text-clay-700 flex items-center justify-center shrink-0 border border-clay-200/60">
                    <Moon size={15} />
                </div>
                <div className="min-w-0">
                    <p className="font-bold text-stone-800">Night Shift Differential</p>
                    <p className="text-[11px] text-stone-500">
                        Hours worked between 10:00 PM and 6:00 AM automatically include DOLE 10% premium rate in payroll computations.
                    </p>
                </div>
            </div>
        </div>
    );
}
