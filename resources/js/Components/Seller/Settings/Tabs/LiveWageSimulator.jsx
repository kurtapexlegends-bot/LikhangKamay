import React, { useState, useMemo } from 'react';
import { Calculator, CheckCircle2, AlertTriangle, ShieldCheck, Clock, Calendar } from 'lucide-react';

export default function LiveWageSimulator({ data = {} }) {
    const [sampleSalary, setSampleSalary] = useState(20000);

    const simulation = useMemo(() => {
        const monthly = Math.max(1, Number(sampleSalary) || 20000);
        let daily = 0;

        if (data.payroll_factor_method === '261') {
            daily = (monthly * 12) / 261;
        } else if (data.payroll_factor_method === '313') {
            daily = (monthly * 12) / 313;
        } else {
            const days = Number(data.payroll_working_days) || 22;
            daily = monthly / Math.max(1, days);
        }

        const workdayHours = Number(data.standard_workday_hours) || 8.0;
        const hourly = daily / Math.max(1, workdayHours);
        const otMultiplier = Number(data.overtime_multiplier) || 1.25;
        const restMultiplier = Number(data.rest_day_ot_multiplier) || 1.69;
        const holidayMultiplier = Number(data.holiday_ot_multiplier) || 2.60;

        const otHourly = hourly * otMultiplier;
        const restHourly = hourly * restMultiplier;
        const holidayHourly = hourly * holidayMultiplier;

        const isCompliant = otMultiplier >= 1.25 && restMultiplier >= 1.69 && holidayMultiplier >= 2.60;

        return {
            daily,
            hourly,
            otHourly,
            restHourly,
            holidayHourly,
            isCompliant,
        };
    }, [
        sampleSalary,
        data.payroll_factor_method,
        data.payroll_working_days,
        data.standard_workday_hours,
        data.overtime_multiplier,
        data.rest_day_ot_multiplier,
        data.holiday_ot_multiplier,
    ]);

    const formatMoney = (val) =>
        val.toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    return (
        <div className="bg-white rounded-3xl border border-stone-200/80 p-5 shadow-2xs space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-clay-50 text-clay-700 flex items-center justify-center border border-clay-100">
                        <Calculator size={16} />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Wage Simulator</h4>
                        <p className="text-[10px] text-stone-400 font-medium">Live breakdown based on active rules</p>
                    </div>
                </div>

                {simulation.isCompliant ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
                        <CheckCircle2 size={11} /> DOLE Compliant
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200">
                        <AlertTriangle size={11} /> Below DOLE
                    </span>
                )}
            </div>

            {/* Interactive Sample Salary Input */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500" htmlFor="sample-salary-input">
                        Sample Monthly Salary
                    </label>
                    <span className="text-[10px] font-bold text-clay-700">₱{sampleSalary.toLocaleString()}</span>
                </div>
                <div className="relative rounded-xl shadow-2xs">
                    <span className="absolute inset-y-0 left-3 flex items-center text-xs font-bold text-stone-400 pointer-events-none">
                        ₱
                    </span>
                    <input
                        id="sample-salary-input"
                        type="number"
                        min="5000"
                        max="200000"
                        step="1000"
                        value={sampleSalary}
                        onChange={(e) => setSampleSalary(Number(e.target.value) || 0)}
                        className="w-full rounded-xl border border-stone-200 pl-7 pr-3 py-2 text-xs font-bold text-stone-900 focus:border-clay-500 focus:ring-clay-500 bg-stone-50/50"
                    />
                </div>

                {/* Quick Preset Chips */}
                <div className="flex items-center gap-1.5 mt-2">
                    {[15000, 20000, 25000, 35000].map((preset) => (
                        <button
                            key={preset}
                            type="button"
                            onClick={() => setSampleSalary(preset)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                sampleSalary === preset
                                    ? 'bg-clay-600 text-white shadow-2xs'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                            }`}
                        >
                            ₱{(preset / 1000).toFixed(0)}k
                        </button>
                    ))}
                </div>
            </div>

            {/* Calculated Breakdown Tiles */}
            <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50/70 border border-stone-200/60">
                    <span className="text-xs font-semibold text-stone-600">Daily Wage</span>
                    <div className="text-right">
                        <span className="text-sm font-extrabold text-stone-900">₱{formatMoney(simulation.daily)}</span>
                        <span className="text-[10px] text-stone-400 font-normal ml-1">/ day</span>
                    </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50/70 border border-stone-200/60">
                    <span className="text-xs font-semibold text-stone-600">Hourly Wage</span>
                    <div className="text-right">
                        <span className="text-sm font-extrabold text-stone-900">₱{formatMoney(simulation.hourly)}</span>
                        <span className="text-[10px] text-stone-400 font-normal ml-1">/ hr</span>
                    </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-clay-50/50 border border-clay-200/60">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-clay-900">Regular OT</span>
                        <span className="text-[9px] font-semibold text-clay-700 bg-clay-100/80 px-1 rounded">
                            {data.overtime_multiplier || 1.25}×
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="text-sm font-extrabold text-clay-900">₱{formatMoney(simulation.otHourly)}</span>
                        <span className="text-[10px] text-clay-600 font-normal ml-1">/ hr</span>
                    </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50/70 border border-stone-200/60">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-stone-600">Rest Day OT</span>
                        <span className="text-[9px] font-semibold text-stone-500 bg-stone-200/60 px-1 rounded">
                            {data.rest_day_ot_multiplier || 1.69}×
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-bold text-stone-800">₱{formatMoney(simulation.restHourly)}</span>
                        <span className="text-[10px] text-stone-400 font-normal ml-1">/ hr</span>
                    </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50/70 border border-stone-200/60">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-stone-600">Holiday OT</span>
                        <span className="text-[9px] font-semibold text-stone-500 bg-stone-200/60 px-1 rounded">
                            {data.holiday_ot_multiplier || 2.60}×
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-bold text-stone-800">₱{formatMoney(simulation.holidayHourly)}</span>
                        <span className="text-[10px] text-stone-400 font-normal ml-1">/ hr</span>
                    </div>
                </div>
            </div>

            {/* Active Policy Summary Pills */}
            <div className="pt-3 border-t border-stone-100 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                    Active Policy Rules
                </span>
                <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-semibold bg-stone-100 text-stone-700">
                        <Calendar size={11} className="text-stone-500" />
                        {data.payroll_factor_method === '261'
                            ? '5-Day (261 Factor)'
                            : data.payroll_factor_method === '313'
                            ? '6-Day (313 Factor)'
                            : `${data.payroll_working_days || 22} Days/Mo`}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-semibold bg-stone-100 text-stone-700">
                        <Clock size={11} className="text-stone-500" />
                        {data.standard_workday_hours || 8.0} hrs/day
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-semibold bg-stone-100 text-stone-700">
                        <ShieldCheck size={11} className="text-stone-500" />
                        {data.grace_period_minutes ?? 15}m grace period
                    </span>
                </div>
            </div>
        </div>
    );
}
