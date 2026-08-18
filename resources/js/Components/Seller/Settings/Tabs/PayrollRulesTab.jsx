import React, { useMemo } from 'react';
import { useForm } from '@inertiajs/react';
import { 
    Calendar, CalendarDays, Sliders, Check, 
    Clock, Coffee, SunMedium, 
    TrendingUp, Coins, Info, CheckCircle2, AlertTriangle, Calculator
} from 'lucide-react';
import InputLabel from '@/Components/InputLabel';
import { useToast } from '@/Components/ToastContext';

function ScheduleOptionCard({ active, onClick, icon: Icon, title, daysBadge, simpleDesc, disabled }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`group relative flex flex-col justify-between p-4 rounded-2xl border text-left transition-all duration-200 w-full outline-none cursor-pointer ${
                active
                    ? 'border-clay-600 bg-white ring-2 ring-clay-600/15 shadow-sm'
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

export default function PayrollRulesTab({ sellerOwner, permissions }) {
    const canEdit = permissions?.can_edit_hr_settings;
    const { addToast } = useToast();

    const { data, setData, post, processing } = useForm({
        overtime_rate: sellerOwner.overtime_rate || 50.00,
        overtime_multiplier: sellerOwner.overtime_multiplier || 1.25,
        payroll_factor_method: sellerOwner.payroll_factor_method || 'custom',
        rest_day_ot_multiplier: sellerOwner.rest_day_ot_multiplier || 1.69,
        holiday_ot_multiplier: sellerOwner.holiday_ot_multiplier || 2.60,
        payroll_working_days: sellerOwner.payroll_working_days || 22,
        standard_workday_hours: sellerOwner.standard_workday_hours || 8.0,
        shift_start_time: sellerOwner.shift_start_time || '08:00',
        shift_end_time: sellerOwner.shift_end_time || '17:00',
        grace_period_minutes: sellerOwner.grace_period_minutes ?? 15,
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

    // Intuitive wage calculator simulation for non-tech artisans
    const wagePreview = useMemo(() => {
        const monthly = 20000;
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
        const otHourly = hourly * otMultiplier;

        return {
            daily: daily.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            hourly: hourly.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            otHourly: otHourly.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        };
    }, [data.payroll_factor_method, data.payroll_working_days, data.standard_workday_hours, data.overtime_multiplier]);

    const isNonCompliantOT = 
        (Number(data.overtime_multiplier) || 0) < 1.25 ||
        (Number(data.rest_day_ot_multiplier) || 0) < 1.69 ||
        (Number(data.holiday_ot_multiplier) || 0) < 2.60;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* ── SECTION 1: WORK SCHEDULE & DAILY RATES ── */}
            <div className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-6 shadow-2xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-clay-50 text-clay-700 border border-clay-200/60 flex items-center justify-center shrink-0">
                            <Coins size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-stone-900 tracking-tight">
                                Work Schedule &amp; Daily Pay Rates
                            </h3>
                            <p className="text-xs text-stone-500 font-medium">
                                Choose how many days your shop operates to calculate daily wages automatically.
                            </p>
                        </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/70 text-[11px] font-bold self-start sm:self-auto">
                        <CheckCircle2 size={13} /> DOLE Standard
                    </span>
                </div>

                {/* 3 Simple Everyday Work Schedule Cards */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                        Shop Work Schedule
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <ScheduleOptionCard
                            active={data.payroll_factor_method === '261'}
                            onClick={() => canEdit && setData('payroll_factor_method', '261')}
                            icon={Calendar}
                            title="Monday to Friday"
                            daysBadge="5 Days / Week"
                            simpleDesc="Rest days on Saturdays and Sundays"
                            disabled={!canEdit}
                        />
                        <ScheduleOptionCard
                            active={data.payroll_factor_method === '313'}
                            onClick={() => canEdit && setData('payroll_factor_method', '313')}
                            icon={CalendarDays}
                            title="Monday to Saturday"
                            daysBadge="6 Days / Week"
                            simpleDesc="Rest day on Sundays only"
                            disabled={!canEdit}
                        />
                        <ScheduleOptionCard
                            active={data.payroll_factor_method === 'custom'}
                            onClick={() => canEdit && setData('payroll_factor_method', 'custom')}
                            icon={Sliders}
                            title="Custom Working Days"
                            daysBadge="Custom Days"
                            simpleDesc="Specify exact work days per month"
                            disabled={!canEdit}
                        />
                    </div>
                </div>

                {/* Workday Hours & Optional Custom Days */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    {data.payroll_factor_method === 'custom' ? (
                        <div className="rounded-2xl border border-clay-200 bg-[#FCF7F2]/40 p-4">
                            <InputLabel value="Working Days Per Month" />
                            <div className="mt-1.5 relative rounded-xl shadow-2xs">
                                <input
                                    type="number"
                                    className="w-full rounded-xl border border-stone-300 pr-14 text-sm font-bold text-stone-850 focus:border-clay-500 focus:ring-clay-500 min-h-[44px] bg-white"
                                    value={data.payroll_working_days ?? ''}
                                    onKeyDown={(e) => { if (e.key === '-' || e.key === '.') e.preventDefault(); }}
                                    onChange={(e) => setData('payroll_working_days', e.target.value.replace(/[-.]/g, ''))}
                                    disabled={!canEdit}
                                    required
                                    min="1"
                                    max="31"
                                />
                                <span className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-stone-400 pointer-events-none">
                                    days
                                </span>
                            </div>
                            <span className="text-[10px] text-stone-500 mt-1 block">Usually 22 days (5-day week) or 26 days (6-day week)</span>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-stone-200/70 bg-stone-50/50 p-4 flex flex-col justify-center">
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Official DOLE Formula Active</span>
                            <p className="text-xs font-bold text-stone-850 mt-1">
                                {data.payroll_factor_method === '261' ? '261 Factor (5-Day Schedule)' : '313 Factor (6-Day Schedule)'}
                            </p>
                            <span className="text-[10px] text-stone-500 mt-0.5">Paid holidays are automatically computed based on Philippine labor standards.</span>
                        </div>
                    )}

                    <div className="rounded-2xl border border-stone-200 bg-white p-4">
                        <InputLabel value="Work Hours Per Day" />
                        <div className="mt-1.5 relative rounded-xl shadow-2xs">
                            <input
                                type="number"
                                className="w-full rounded-xl border border-stone-300 pr-14 text-sm font-bold text-stone-850 focus:border-clay-500 focus:ring-clay-500 min-h-[44px]"
                                value={data.standard_workday_hours ?? ''}
                                onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                onChange={(e) => setData('standard_workday_hours', e.target.value.replace(/-/g, ''))}
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
                        <span className="text-[10px] text-stone-500 mt-1 block">Standard full-time workday is 8 hours</span>
                    </div>
                </div>

                {/* Practical Wage Example (Sample Salary: ₱20,000) */}
                <div className="rounded-2xl border border-clay-200/80 bg-[#FCF7F2]/60 p-4 sm:p-4.5">
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                            <Calculator size={16} className="text-clay-700" />
                            <span className="text-xs font-bold text-stone-900">
                                How it calculates your staff pay
                            </span>
                        </div>
                        <span className="text-[10px] font-semibold text-stone-500">
                            Example for a ₱20,000 monthly salary
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-white rounded-xl p-3 border border-stone-200/70 shadow-2xs text-center sm:text-left">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Daily Pay</span>
                            <div className="text-base font-black text-stone-900 mt-0.5">
                                ₱{wagePreview.daily}
                                <span className="text-[10px] font-normal text-stone-500 ml-1">/ day</span>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-3 border border-stone-200/70 shadow-2xs text-center sm:text-left">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Hourly Pay</span>
                            <div className="text-base font-black text-stone-900 mt-0.5">
                                ₱{wagePreview.hourly}
                                <span className="text-[10px] font-normal text-stone-500 ml-1">/ hour</span>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-3 border border-clay-200 shadow-2xs text-center sm:text-left">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-clay-700 block">Overtime Pay</span>
                            <div className="text-base font-black text-clay-800 mt-0.5">
                                ₱{wagePreview.otHourly}
                                <span className="text-[10px] font-normal text-clay-600 ml-1">/ hour</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── SECTION 2: WORKSHOP SHIFT HOURS & LUNCH BREAK ── */}
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
                                    className="w-full rounded-xl border border-stone-300 text-xs font-bold text-stone-850 focus:border-clay-500 focus:ring-clay-500 min-h-[42px] mt-1 bg-white shadow-2xs"
                                    value={data.shift_start_time || '08:00'}
                                    onChange={(e) => setData('shift_start_time', e.target.value)}
                                    disabled={!canEdit}
                                    required
                                />
                            </div>

                            <div>
                                <InputLabel value="Work Ends At" />
                                <input
                                    type="time"
                                    className="w-full rounded-xl border border-stone-300 text-xs font-bold text-stone-850 focus:border-clay-500 focus:ring-clay-500 min-h-[42px] mt-1 bg-white shadow-2xs"
                                    value={data.shift_end_time || '17:00'}
                                    onChange={(e) => setData('shift_end_time', e.target.value)}
                                    disabled={!canEdit}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <InputLabel value="Late Grace Period" />
                            <div className="mt-1 relative rounded-xl shadow-2xs">
                                <input
                                    type="number"
                                    className="w-full rounded-xl border border-stone-300 pr-16 text-xs font-bold text-stone-850 focus:border-clay-500 focus:ring-clay-500 min-h-[42px] bg-white"
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
                            <span className="text-[10px] text-stone-500 mt-1 block">Staff arriving within 15 mins are marked on-time</span>
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
                                    className="w-full rounded-xl border border-stone-300 text-xs font-bold text-stone-850 focus:border-clay-500 focus:ring-clay-500 min-h-[42px] mt-1 bg-white shadow-2xs"
                                    value={data.break_window_start || '11:30'}
                                    onChange={(e) => setData('break_window_start', e.target.value)}
                                    disabled={!canEdit}
                                />
                            </div>

                            <div>
                                <InputLabel value="Lunch Ends At" />
                                <input
                                    type="time"
                                    className="w-full rounded-xl border border-stone-300 text-xs font-bold text-stone-850 focus:border-clay-500 focus:ring-clay-500 min-h-[42px] mt-1 bg-white shadow-2xs"
                                    value={data.break_window_end || '13:30'}
                                    onChange={(e) => setData('break_window_end', e.target.value)}
                                    disabled={!canEdit}
                                />
                            </div>
                        </div>

                        <div>
                            <InputLabel value="Max Break Time" />
                            <div className="mt-1 relative rounded-xl shadow-2xs">
                                <input
                                    type="number"
                                    className="w-full rounded-xl border border-stone-300 pr-16 text-xs font-bold text-stone-850 focus:border-clay-500 focus:ring-clay-500 min-h-[42px] bg-white"
                                    value={data.break_allowance_minutes ?? 60}
                                    onChange={(e) => setData('break_allowance_minutes', e.target.value)}
                                    disabled={!canEdit}
                                    min="0"
                                    max="180"
                                    required
                                />
                                <span className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-stone-400 pointer-events-none">
                                    minutes
                                </span>
                            </div>
                            <span className="text-[10px] text-stone-500 mt-1 block">Standard meal break is 60 minutes (1 hour)</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── SECTION 3: OVERTIME PAY MULTIPLIERS ── */}
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
                            Philippine labor standard rates (DOLE) for extra hours and holidays.
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
                                className="w-full rounded-xl border border-stone-300 pr-8 text-sm font-bold text-stone-850 focus:border-clay-500 focus:ring-clay-500 min-h-[42px]"
                                value={data.overtime_multiplier ?? ''}
                                onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                onChange={(e) => setData('overtime_multiplier', e.target.value.replace(/-/g, ''))}
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
                        <span className="text-[10px] text-stone-400 mt-1.5 block font-medium">Pay + 25% for overtime</span>
                    </div>

                    {/* Rest Day OT */}
                    <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Rest Day / Special Holiday</span>
                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/60 rounded px-1.5 py-0.5">
                                DOLE Min: 1.69×
                            </span>
                        </div>
                        <InputLabel value="Rest Day Overtime" />
                        <div className="mt-1 relative rounded-xl shadow-2xs">
                            <input
                                type="number"
                                className="w-full rounded-xl border border-stone-300 pr-8 text-sm font-bold text-stone-850 focus:border-clay-500 focus:ring-clay-500 min-h-[42px]"
                                value={data.rest_day_ot_multiplier ?? ''}
                                onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                onChange={(e) => setData('rest_day_ot_multiplier', e.target.value.replace(/-/g, ''))}
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
                        <span className="text-[10px] text-stone-400 mt-1.5 block font-medium">Pay 169% on Sunday/Special Day OT</span>
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
                                className="w-full rounded-xl border border-stone-300 pr-8 text-sm font-bold text-stone-850 focus:border-clay-500 focus:ring-clay-500 min-h-[42px]"
                                value={data.holiday_ot_multiplier ?? ''}
                                onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                onChange={(e) => setData('holiday_ot_multiplier', e.target.value.replace(/-/g, ''))}
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
                        <span className="text-[10px] text-stone-400 mt-1.5 block font-medium">Pay 260% on Christmas/New Year OT</span>
                    </div>
                </div>
            </div>

            {/* ── SAVE ACTION BAR ── */}
            {canEdit && (
                <div className="flex items-center justify-between bg-white rounded-2xl border border-stone-200/80 px-5 py-3.5 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
                        <Info size={14} className="text-stone-400 shrink-0" />
                        <span>Settings will apply to upcoming timecards and payroll computations.</span>
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-clay-700 hover:bg-clay-800 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 min-h-[42px] cursor-pointer"
                    >
                        <CheckCircle2 size={15} />
                        {processing ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            )}
        </form>
    );
}
