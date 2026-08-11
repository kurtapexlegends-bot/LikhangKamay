import React from 'react';
import { useForm } from '@inertiajs/react';
import { Briefcase, CalendarRange, Sliders, Check, Clock, Calculator, ShieldAlert, CheckCircle2 } from 'lucide-react';
import InputLabel from '@/Components/InputLabel';

function MethodCard({ active, onClick, icon: Icon, title, description, formula }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex flex-col text-left p-4 rounded-2xl border transition-all duration-300 w-full outline-none focus:ring-2 focus:ring-clay-500/25 ${
                active
                    ? 'border-clay-600 bg-[#FCF7F2]/60 shadow-[0_4px_12px_rgba(137,67,45,0.04)]'
                    : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50'
            }`}
        >
            <div className="flex items-center justify-between w-full">
                <div className={`p-2 rounded-xl border transition-colors ${
                    active ? 'bg-white text-clay-700 border-clay-200' : 'bg-stone-50 text-stone-500 border-stone-150'
                }`}>
                    <Icon size={18} />
                </div>
                {active && (
                    <span className="flex items-center gap-1 text-clay-600 text-[9px] font-bold tracking-wider uppercase bg-clay-50 px-2 py-0.5 rounded-full border border-clay-100">
                        <Check size={10} strokeWidth={3} />
                        Selected
                    </span>
                )}
            </div>
            <h4 className="mt-3 text-xs font-bold text-stone-850 tracking-tight">{title}</h4>
            <p className="mt-1 text-[10px] text-stone-500 leading-relaxed">{description}</p>
            <div className={`mt-3 pt-2.5 border-t w-full text-[9px] font-mono tracking-tight ${
                active ? 'border-clay-150 text-clay-800' : 'border-stone-100 text-stone-400'
            }`}>
                Formula: {formula}
            </div>
        </button>
    );
}

export default function PayrollRulesTab({ sellerOwner, permissions }) {
    const canEdit = permissions?.can_edit_hr_settings;

    const { data, setData, post, processing } = useForm({
        overtime_rate: sellerOwner.overtime_rate || 50.00,
        overtime_multiplier: sellerOwner.overtime_multiplier || 1.25,
        payroll_factor_method: sellerOwner.payroll_factor_method || 'custom',
        rest_day_ot_multiplier: sellerOwner.rest_day_ot_multiplier || 1.69,
        holiday_ot_multiplier: sellerOwner.holiday_ot_multiplier || 2.60,
        payroll_working_days: sellerOwner.payroll_working_days || 22,
        standard_workday_hours: sellerOwner.standard_workday_hours || 8.0,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!canEdit) return;
        post(route('hr.settings'), {
            preserveScroll: true,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-2xs space-y-6">
            <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
                    <Clock size={20} />
                </div>
                <div>
                    <h3 className="text-base font-bold text-stone-900">Payroll & EEMR Settings</h3>
                    <p className="text-xs text-stone-500">Configure standard daily rate factor methods (DOLE EEMR guidelines) and premium multipliers.</p>
                </div>
            </div>

            {/* Daily Rate Calculation Method */}
            <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Daily Rate Calculation Method
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <MethodCard
                        active={data.payroll_factor_method === '261'}
                        onClick={() => canEdit && setData('payroll_factor_method', '261')}
                        icon={Briefcase}
                        title="5-Day Week (261 Factor)"
                        description="Standard for staff working Monday to Friday. Excludes Saturdays and Sundays from rate divisors."
                        formula="(Salary * 12) / 261"
                    />
                    <MethodCard
                        active={data.payroll_factor_method === '313'}
                        onClick={() => canEdit && setData('payroll_factor_method', '313')}
                        icon={CalendarRange}
                        title="6-Day Week (313 Factor)"
                        description="Standard for staff working Monday to Saturday. Excludes only Sundays from rate divisors."
                        formula="(Salary * 12) / 313"
                    />
                    <MethodCard
                        active={data.payroll_factor_method === 'custom'}
                        onClick={() => canEdit && setData('payroll_factor_method', 'custom')}
                        icon={Sliders}
                        title="Custom Fixed Days"
                        description="Uses a fixed number of working days per calendar month to resolve daily rates."
                        formula="Salary / Custom Days"
                    />
                </div>
            </div>

            {/* Live EEMR rate preview panel */}
            <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200 text-xs text-stone-700 flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-stone-400 block uppercase tracking-wider">Live EEMR Rate Preview (Sample Salary: ₱20,000.00)</span>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2.5">
                    <span>
                        Divisor Method: <strong className="text-stone-850 font-bold">{data.payroll_factor_method === '261' ? '5-Day Week (261 factor)' : data.payroll_factor_method === '313' ? '6-Day Week (313 factor)' : `Custom Fixed Divisor (${data.payroll_working_days || 22} days)`}</strong>
                    </span>
                    <div className="text-stone-850 font-semibold">
                        Resolved Daily Rate: <strong className="text-clay-700 font-bold bg-[#FCF7F2] px-2.5 py-1 rounded-lg border border-[#E7D8C9] text-[13px] ml-1">
                            {data.payroll_factor_method === '261' 
                                ? '₱919.54' 
                                : data.payroll_factor_method === '313' 
                                ? '₱766.77' 
                                : `₱${(20000 / (data.payroll_working_days || 22)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            }
                        </strong>
                    </div>
                </div>
            </div>

            {/* Divisors settings grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.payroll_factor_method === 'custom' ? (
                    <div className="rounded-2xl border border-stone-250/60 bg-white p-4 transition-all duration-300">
                        <InputLabel value="Standard Fixed Working Days / Month" />
                        <input 
                            type="number" 
                            className="w-full rounded-xl border border-stone-300 shadow-none transition focus:border-clay-500 focus:ring-clay-500 min-h-[44px] mt-1.5 text-sm" 
                            value={data.payroll_working_days ?? ''} 
                            onKeyDown={(e) => { if (e.key === '-' || e.key === '.') e.preventDefault(); }}
                            onChange={e => setData('payroll_working_days', e.target.value.replace(/[-.]/g, ""))} 
                            disabled={!canEdit}
                            required 
                            min="1" 
                            max="31"
                        />
                        <p className="mt-1 text-[10px] text-stone-500">Typical values are 22 days (5-day week) or 26 days (6-day week).</p>
                    </div>
                ) : (
                    <div className="hidden md:block" />
                )}

                <div className="rounded-2xl border border-stone-250/60 bg-white p-4 transition-all duration-300">
                    <InputLabel value="Standard Workday Length (Hours)" />
                    <input 
                        type="number" 
                        className="w-full rounded-xl border border-stone-300 shadow-none transition focus:border-clay-500 focus:ring-clay-500 min-h-[44px] mt-1.5 text-sm" 
                        value={data.standard_workday_hours ?? ''} 
                        onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                        onChange={e => setData('standard_workday_hours', e.target.value.replace(/-/g, ""))} 
                        disabled={!canEdit}
                        required 
                        min="4" 
                        max="12"
                        step="0.5"
                    />
                    <p className="mt-1 text-[10px] text-stone-500">Defines daily overtime threshold. Standard DOLE workday is 8 hours.</p>
                </div>
            </div>

            {/* Overtime multipliers */}
            <div className="border-t border-stone-150 pt-5 space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                    Overtime Multipliers (DOLE Compliant)
                </label>

                {/* Compliance Warning Banner */}
                {((Number(data.overtime_multiplier) || 0) < 1.25 ||
                  (Number(data.rest_day_ot_multiplier) || 0) < 1.69 ||
                  (Number(data.holiday_ot_multiplier) || 0) < 2.60) && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-[11px] leading-relaxed text-amber-800 flex gap-2.5 animate-fade-in">
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5 uppercase tracking-wider shrink-0 h-max">
                            Compliance Alert
                        </span>
                        <div>
                            One or more configured overtime multipliers are below standard DOLE legal guidelines (1.25x for regular workdays, 1.69x for rest days, and 2.60x for regular holidays). Underpaying multipliers can result in labor audit penalties.
                        </div>
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                        <span className="text-[10px] font-bold text-stone-400 block uppercase tracking-wider mb-1">Regular Workday</span>
                        <InputLabel value="OT Multiplier" />
                        <input 
                            type="number" 
                            className="w-full rounded-xl border border-stone-300 shadow-none transition focus:border-clay-500 focus:ring-clay-500 min-h-[44px] mt-1.5 text-sm" 
                            value={data.overtime_multiplier ?? ''} 
                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                            onChange={e => setData('overtime_multiplier', e.target.value.replace(/-/g, ""))} 
                            disabled={!canEdit}
                            required 
                            min="0.01" 
                            max="10"
                            step="0.01"
                        />
                        <span className="mt-1.5 block text-[9px] font-bold text-stone-400 uppercase tracking-widest bg-stone-50 border border-stone-100 rounded px-1.5 py-0.5 w-max">
                            Legal Min: 1.25x
                        </span>
                    </div>

                    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                        <span className="text-[10px] font-bold text-stone-400 block uppercase tracking-wider mb-1">Rest Day / Special Holiday</span>
                        <InputLabel value="OT Multiplier" />
                        <input 
                            type="number" 
                            className="w-full rounded-xl border border-stone-300 shadow-none transition focus:border-clay-500 focus:ring-clay-500 min-h-[44px] mt-1.5 text-sm" 
                            value={data.rest_day_ot_multiplier ?? ''} 
                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                            onChange={e => setData('rest_day_ot_multiplier', e.target.value.replace(/-/g, ""))} 
                            disabled={!canEdit}
                            required 
                            min="0.01" 
                            max="10"
                            step="0.01"
                        />
                        <span className="mt-1.5 block text-[9px] font-bold text-stone-400 uppercase tracking-widest bg-stone-50 border border-stone-100 rounded px-1.5 py-0.5 w-max">
                            Legal Min: 1.69x
                        </span>
                    </div>

                    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                        <span className="text-[10px] font-bold text-stone-400 block uppercase tracking-wider mb-1">Regular Holiday</span>
                        <InputLabel value="OT Multiplier" />
                        <input 
                            type="number" 
                            className="w-full rounded-xl border border-stone-300 shadow-none transition focus:border-clay-500 focus:ring-clay-500 min-h-[44px] mt-1.5 text-sm" 
                            value={data.holiday_ot_multiplier ?? ''} 
                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                            onChange={e => setData('holiday_ot_multiplier', e.target.value.replace(/-/g, ""))} 
                            disabled={!canEdit}
                            required 
                            min="0.01" 
                            max="10"
                            step="0.01"
                        />
                        <span className="mt-1.5 block text-[9px] font-bold text-stone-400 uppercase tracking-widest bg-stone-50 border border-stone-100 rounded px-1.5 py-0.5 w-max">
                            Legal Min: 2.60x
                        </span>
                    </div>
                </div>
            </div>

            {canEdit && (
                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        disabled={processing}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-clay-600 text-white text-xs font-bold hover:bg-clay-700 transition disabled:opacity-50 min-h-[40px]"
                    >
                        <CheckCircle2 size={15} />
                        Save Payroll Rules
                    </button>
                </div>
            )}
        </form>
    );
}
