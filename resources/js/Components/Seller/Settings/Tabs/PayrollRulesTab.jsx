import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { 
    Calendar, CalendarDays, Sliders, Check, 
    Coins, Info, CheckCircle2, TrendingUp, Landmark, Clock
} from 'lucide-react';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import { useToast } from '@/Components/ToastContext';
import ShiftHoursCard from './ShiftHoursCard';
import OvertimeRulesCard from './OvertimeRulesCard';
import TaxContributionForm from './TaxContributionForm';
import LiveWageSimulator from './LiveWageSimulator';

function ScheduleOptionCard({ active, onClick, icon: Icon, title, daysBadge, simpleDesc, disabled }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`group relative flex flex-col justify-between p-4 rounded-2xl border text-left transition-all duration-200 w-full outline-none cursor-pointer ${
                active
                    ? 'border-clay-600 bg-white ring-2 ring-clay-600/15 shadow-2xs'
                    : 'border-stone-200/90 bg-stone-50/60 hover:bg-white hover:border-stone-300'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        >
            <div>
                <div className="flex items-center justify-between gap-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                        active 
                            ? 'bg-clay-50 text-clay-700 border border-clay-200' 
                            : 'bg-white text-stone-500 border border-stone-200/80 group-hover:text-stone-700'
                    }`}>
                        <Icon size={18} />
                    </div>
                    {active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-clay-700 bg-clay-50 border border-clay-200/80 px-2 py-0.5 rounded-full">
                            <Check size={11} strokeWidth={3} /> Selected
                        </span>
                    ) : (
                        <span className="text-[10px] font-semibold text-stone-500 bg-white border border-stone-200/70 px-2 py-0.5 rounded-full">
                            {daysBadge}
                        </span>
                    )}
                </div>

                <div className="mt-3">
                    <h4 className="text-xs font-bold text-stone-900">{title}</h4>
                    <p className="mt-0.5 text-[11px] text-stone-500 font-medium">{simpleDesc}</p>
                </div>
            </div>
        </button>
    );
}

const SETTINGS_SECTIONS = [
    { id: 'schedules', label: 'Schedule & Shifts', icon: Calendar },
    { id: 'overtime', label: 'Overtime & Rates', icon: TrendingUp },
    { id: 'statutory', label: 'Statutory & Tax', icon: Landmark },
];

export default function PayrollRulesTab({ sellerOwner, permissions }) {
    const canEdit = permissions?.can_edit_hr_settings;
    const { addToast } = useToast();
    const [activeSection, setActiveSection] = useState('schedules');

    const { data, setData, post, processing, errors, clearErrors } = useForm({
        overtime_rate: sellerOwner.overtime_rate || 50.00,
        overtime_multiplier: sellerOwner.overtime_multiplier || 1.25,
        payroll_factor_method: sellerOwner.payroll_factor_method || 'custom',
        rest_day_ot_multiplier: sellerOwner.rest_day_ot_multiplier || 1.69,
        holiday_ot_multiplier: sellerOwner.holiday_ot_multiplier || 2.60,
        payroll_working_days: sellerOwner.payroll_working_days || 22,
        standard_workday_hours: sellerOwner.standard_workday_hours || 8.0,
        shift_start_time: sellerOwner.shift_start_time || '08:00',
        shift_end_time: sellerOwner.shift_end_time || '17:00',
        shift_schedule_mode: sellerOwner.shift_schedule_mode || 'uniform',
        daily_shifts: sellerOwner.daily_shifts || null,
        grace_period_minutes: sellerOwner.grace_period_minutes ?? 15,
        earliest_clock_in_minutes: sellerOwner.earliest_clock_in_minutes ?? 30,
        enforce_strict_shift_window: sellerOwner.enforce_strict_shift_window !== undefined ? Boolean(sellerOwner.enforce_strict_shift_window) : true,
        break_window_start: sellerOwner.break_window_start || '11:30',
        break_window_end: sellerOwner.break_window_end || '13:30',
        break_allowance_minutes: sellerOwner.break_allowance_minutes ?? 60,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!canEdit) return;
        post(route('hr.settings'), {
            preserveScroll: true,
            onSuccess: () => {
                addToast('Workshop & Payroll settings saved.', 'success');
            },
            onError: () => {
                addToast('Please check the highlighted fields.', 'error');
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {/* Top Sub-Navigation Segmented Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-stone-200/80 shadow-2xs">
                <div className="inline-flex p-1 rounded-xl bg-stone-100/80 gap-1 w-full sm:w-auto">
                    {SETTINGS_SECTIONS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeSection === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveSection(tab.id)}
                                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    isActive
                                        ? 'bg-white text-stone-900 shadow-2xs'
                                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
                                }`}
                            >
                                <Icon size={14} className={isActive ? 'text-clay-600' : 'text-stone-400'} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="hidden sm:flex items-center gap-2 pr-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/70 text-[11px] font-bold">
                        <CheckCircle2 size={13} /> DOLE Handbook Standard
                    </span>
                </div>
            </div>

            {/* 2-Column Responsive Workspace Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left 8 Cols: Active Configuration Domain */}
                <div className="lg:col-span-8 space-y-6">
                    {activeSection === 'schedules' && (
                        <>
                            {/* SECTION: WORK SCHEDULE & WORKING DAYS */}
                            <div className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-6 shadow-2xs space-y-5">
                                <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                                    <div className="w-10 h-10 rounded-2xl bg-clay-50 text-clay-700 border border-clay-200/60 flex items-center justify-center shrink-0">
                                        <Calendar size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-stone-900 tracking-tight">
                                            Work Schedule &amp; Daily Hours
                                        </h3>
                                    </div>
                                </div>

                                {/* 3 Schedule Options */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                                        Shop Work Schedule
                                    </label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <ScheduleOptionCard
                                            active={data.payroll_factor_method === '261'}
                                            onClick={() => {
                                                if (canEdit) {
                                                    setData('payroll_factor_method', '261');
                                                    if (errors.payroll_factor_method) clearErrors('payroll_factor_method');
                                                }
                                            }}
                                            icon={Calendar}
                                            title="Monday to Friday"
                                            daysBadge="5 Days / Week"
                                            simpleDesc="Rest days on Saturdays & Sundays"
                                            disabled={!canEdit}
                                        />
                                        <ScheduleOptionCard
                                            active={data.payroll_factor_method === '313'}
                                            onClick={() => {
                                                if (canEdit) {
                                                    setData('payroll_factor_method', '313');
                                                    if (errors.payroll_factor_method) clearErrors('payroll_factor_method');
                                                }
                                            }}
                                            icon={CalendarDays}
                                            title="Monday to Saturday"
                                            daysBadge="6 Days / Week"
                                            simpleDesc="Rest day on Sundays only"
                                            disabled={!canEdit}
                                        />
                                        <ScheduleOptionCard
                                            active={data.payroll_factor_method === 'custom'}
                                            onClick={() => {
                                                if (canEdit) {
                                                    setData('payroll_factor_method', 'custom');
                                                    if (errors.payroll_factor_method) clearErrors('payroll_factor_method');
                                                }
                                            }}
                                            icon={Sliders}
                                            title="Custom Working Days"
                                            daysBadge="Custom Days"
                                            simpleDesc="Specify exact work days per month"
                                            disabled={!canEdit}
                                        />
                                    </div>
                                    {errors.payroll_factor_method && <InputError message={errors.payroll_factor_method} className="mt-1" />}
                                </div>

                                {/* Working Days & Work Hours Inputs */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                    {data.payroll_factor_method === 'custom' ? (
                                        <div className="rounded-2xl border border-clay-200 bg-[#FCF7F2]/40 p-4">
                                            <InputLabel value="Working Days Per Month" />
                                            <div className="mt-1.5 relative rounded-xl shadow-2xs">
                                                <input
                                                    type="number"
                                                    className={`w-full rounded-xl border pr-14 text-sm font-bold text-stone-850 focus:ring-clay-500 min-h-[44px] bg-white ${
                                                        errors.payroll_working_days ? 'border-rose-300 bg-rose-50/50 focus:border-rose-500' : 'border-stone-300 focus:border-clay-500'
                                                    }`}
                                                    value={data.payroll_working_days ?? ''}
                                                    onKeyDown={(e) => { if (e.key === '-' || e.key === '.') e.preventDefault(); }}
                                                    onChange={(e) => {
                                                        setData('payroll_working_days', e.target.value.replace(/[-.]/g, ''));
                                                        if (errors.payroll_working_days) clearErrors('payroll_working_days');
                                                    }}
                                                    disabled={!canEdit}
                                                    required
                                                    min="1"
                                                    max="31"
                                                />
                                                <span className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-stone-400 pointer-events-none">
                                                    days
                                                </span>
                                            </div>
                                            {errors.payroll_working_days && <InputError message={errors.payroll_working_days} className="mt-1.5" />}
                                            <span className="text-[10px] text-stone-500 mt-1 block">Usually 22 days (5-day) or 26 days (6-day)</span>
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl border border-stone-200/70 bg-stone-50/50 p-4 flex flex-col justify-center">
                                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">DOLE Formula Active</span>
                                            <p className="text-xs font-bold text-stone-850 mt-1">
                                                {data.payroll_factor_method === '261' ? '261 Factor (5-Day Schedule)' : '313 Factor (6-Day Schedule)'}
                                            </p>
                                            <span className="text-[10px] text-stone-500 mt-0.5">Calculated using Philippine labor standards</span>
                                        </div>
                                    )}

                                    <div className="rounded-2xl border border-stone-200 bg-white p-4">
                                        <InputLabel value="Work Hours Per Day" />
                                        <div className="mt-1.5 relative rounded-xl shadow-2xs">
                                            <input
                                                type="number"
                                                className={`w-full rounded-xl border pr-14 text-sm font-bold text-stone-850 focus:ring-clay-500 min-h-[44px] ${
                                                    errors.standard_workday_hours ? 'border-rose-300 bg-rose-50/50 focus:border-rose-500' : 'border-stone-300 focus:border-clay-500'
                                                }`}
                                                value={data.standard_workday_hours ?? ''}
                                                onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                                onChange={(e) => {
                                                    setData('standard_workday_hours', e.target.value.replace(/-/g, ''));
                                                    if (errors.standard_workday_hours) clearErrors('standard_workday_hours');
                                                }}
                                                disabled={!canEdit}
                                                required
                                                min="4"
                                                max="12"
                                                step="0.5"
                                            />
                                            <span className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-stone-400 pointer-events-none">
                                                hours
                                            </span>
                                        </div>
                                        {errors.standard_workday_hours && <InputError message={errors.standard_workday_hours} className="mt-1.5" />}
                                        <span className="text-[10px] text-stone-500 mt-1 block">Standard full-time workday is 8 hours</span>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION: SHIFT HOURS & BREAKS */}
                            <ShiftHoursCard
                                data={data}
                                setData={setData}
                                errors={errors}
                                clearErrors={clearErrors}
                                canEdit={canEdit}
                            />
                        </>
                    )}

                    {activeSection === 'overtime' && (
                        <OvertimeRulesCard
                            data={data}
                            setData={setData}
                            errors={errors}
                            clearErrors={clearErrors}
                            canEdit={canEdit}
                        />
                    )}

                    {activeSection === 'statutory' && (
                        <TaxContributionForm />
                    )}
                </div>

                {/* Right 4 Cols: Sticky Live Simulator & Quick Policy Inspector */}
                <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
                    <LiveWageSimulator data={data} />
                </div>
            </div>

            {/* Bottom Sticky Action Bar */}
            {canEdit && (
                <div className="sticky bottom-4 z-20 flex items-center justify-between bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200/90 px-5 py-3.5 shadow-lg">
                    <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
                        <Info size={14} className="text-stone-400 shrink-0" />
                        <span>Changes apply to future timecards and payroll computations.</span>
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-clay-700 hover:bg-clay-800 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 min-h-[42px] cursor-pointer active:scale-95 shrink-0"
                    >
                        <CheckCircle2 size={15} />
                        {processing ? 'Saving Changes...' : 'Save Settings'}
                    </button>
                </div>
            )}
        </form>
    );
}
