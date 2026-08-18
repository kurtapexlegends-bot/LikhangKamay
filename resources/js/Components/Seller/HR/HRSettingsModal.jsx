import React, { useMemo } from 'react';
import { 
    X, Calendar, CalendarDays, Sliders, Check, 
    Coins, Calculator, CheckCircle2, Clock, SunMedium, 
    Coffee, TrendingUp, AlertTriangle, Info 
} from 'lucide-react';
import { useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import { useToast } from '@/Components/ToastContext';
import { modalCloseButtonClass } from '@/utils/hrHelpers';

function ScheduleOptionCard({ active, onClick, icon: Icon, title, daysBadge, simpleDesc }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border text-left transition-all duration-200 w-full outline-none cursor-pointer ${
                active
                    ? 'border-clay-600 bg-white ring-2 ring-clay-600/15 shadow-sm'
                    : 'border-stone-200/90 bg-stone-50/60 hover:bg-white hover:border-stone-300'
            }`}
        >
            <div>
                <div className="flex items-center justify-between gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                        active 
                            ? 'bg-clay-50 text-clay-700 border border-clay-200' 
                            : 'bg-white text-stone-500 border border-stone-200/80 group-hover:text-stone-700'
                    }`}>
                        <Icon size={16} />
                    </div>
                    {active ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-clay-700 bg-clay-50 border border-clay-200/80 px-2 py-0.5 rounded-full">
                            <Check size={10} strokeWidth={3} /> Selected
                        </span>
                    ) : (
                        <span className="text-[9px] font-semibold text-stone-500 bg-white border border-stone-200/70 px-2 py-0.5 rounded-full">
                            {daysBadge}
                        </span>
                    )}
                </div>

                <div className="mt-2.5">
                    <h4 className="text-xs font-bold text-stone-900">{title}</h4>
                    <p className="mt-0.5 text-[10px] text-stone-500 font-medium">{simpleDesc}</p>
                </div>
            </div>
        </button>
    );
}

export default function HRSettingsModal({
    isOpen,
    onClose,
    sellerSettings = {},
    canEditHrRecords
}) {
    const { addToast } = useToast();

    const { data, setData, post, processing } = useForm({
        overtime_rate: sellerSettings.overtime_rate || 50.00,
        overtime_multiplier: sellerSettings.overtime_multiplier || 1.25,
        payroll_factor_method: sellerSettings.payroll_factor_method || 'custom',
        rest_day_ot_multiplier: sellerSettings.rest_day_ot_multiplier || 1.69,
        holiday_ot_multiplier: sellerSettings.holiday_ot_multiplier || 2.60,
        payroll_working_days: sellerSettings.payroll_working_days || 22,
        standard_workday_hours: sellerSettings.standard_workday_hours || 8.0,
        shift_start_time: sellerSettings.shift_start_time || '08:00',
        shift_end_time: sellerSettings.shift_end_time || '17:00',
        grace_period_minutes: sellerSettings.grace_period_minutes ?? 15,
        break_window_start: sellerSettings.break_window_start || '11:30',
        break_window_end: sellerSettings.break_window_end || '13:30',
        break_allowance_minutes: sellerSettings.break_allowance_minutes ?? 60,
    });

    React.useEffect(() => {
        if (isOpen) {
            setData({
                overtime_rate: sellerSettings.overtime_rate || 50.00,
                overtime_multiplier: sellerSettings.overtime_multiplier || 1.25,
                payroll_factor_method: sellerSettings.payroll_factor_method || 'custom',
                rest_day_ot_multiplier: sellerSettings.rest_day_ot_multiplier || 1.69,
                holiday_ot_multiplier: sellerSettings.holiday_ot_multiplier || 2.60,
                payroll_working_days: sellerSettings.payroll_working_days || 22,
                standard_workday_hours: sellerSettings.standard_workday_hours || 8.0,
                shift_start_time: sellerSettings.shift_start_time || '08:00',
                shift_end_time: sellerSettings.shift_end_time || '17:00',
                grace_period_minutes: sellerSettings.grace_period_minutes ?? 15,
                break_window_start: sellerSettings.break_window_start || '11:30',
                break_window_end: sellerSettings.break_window_end || '13:30',
                break_allowance_minutes: sellerSettings.break_allowance_minutes ?? 60,
            });
        }
    }, [isOpen, sellerSettings]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!canEditHrRecords) return;
        post(route('hr.settings'), {
            onSuccess: () => {
                onClose();
                addToast('Workshop & Payroll settings saved.', 'success');
            },
            onError: () => {
                addToast('Please check the highlighted fields.', 'error');
            }
        });
    };

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
        <Modal show={isOpen} onClose={onClose} maxWidth="2xl">
            <form onSubmit={handleSubmit} className="flex max-h-[90vh] flex-col bg-white">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-stone-100 px-6 py-5 bg-[#FDFBF9]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-clay-50 text-clay-700 border border-clay-200/60 flex items-center justify-center shrink-0">
                            <Coins size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-stone-900 tracking-tight">Workplace &amp; Shift Settings</h2>
                            <p className="text-xs text-stone-500 font-medium">
                                Configure daily work schedule, shift times, and overtime rates.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`${modalCloseButtonClass} min-h-[44px] min-w-[44px] flex items-center justify-center`}
                        aria-label="Close settings"
                    >
                        <X size={18} />
                    </button>
                </div>
                
                {/* Body */}
                <div className="space-y-6 overflow-y-auto px-6 py-6 bg-[#FDFBF9]">
                    {/* Section 1: Schedule Selection */}
                    <div className="space-y-2.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                            Shop Work Schedule
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <ScheduleOptionCard
                                active={data.payroll_factor_method === '261'}
                                onClick={() => setData('payroll_factor_method', '261')}
                                icon={Calendar}
                                title="Monday to Friday"
                                daysBadge="5 Days"
                                simpleDesc="Sat & Sun rest days"
                            />
                            <ScheduleOptionCard
                                active={data.payroll_factor_method === '313'}
                                onClick={() => setData('payroll_factor_method', '313')}
                                icon={CalendarDays}
                                title="Monday to Saturday"
                                daysBadge="6 Days"
                                simpleDesc="Sunday rest day only"
                            />
                            <ScheduleOptionCard
                                active={data.payroll_factor_method === 'custom'}
                                onClick={() => setData('payroll_factor_method', 'custom')}
                                icon={Sliders}
                                title="Custom Days"
                                daysBadge="Custom"
                                simpleDesc="Fixed days per month"
                            />
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {data.payroll_factor_method === 'custom' ? (
                            <div className="rounded-2xl border border-clay-200 bg-[#FCF7F2]/40 p-4">
                                <InputLabel value="Working Days Per Month" />
                                <div className="mt-1.5 relative rounded-xl shadow-2xs">
                                    <input 
                                        type="number" 
                                        className="w-full rounded-xl border border-stone-300 pr-14 text-sm font-bold text-stone-850 focus:border-clay-500 focus:ring-clay-500 min-h-[44px] bg-white" 
                                        value={data.payroll_working_days ?? ''} 
                                        onKeyDown={(e) => { if (e.key === '-' || e.key === '.') e.preventDefault(); }}
                                        onChange={e => setData('payroll_working_days', e.target.value.replace(/[-.]/g, ""))} 
                                        required 
                                        min="1" 
                                        max="31"
                                    />
                                    <span className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-stone-400 pointer-events-none">
                                        days
                                    </span>
                                </div>
                                <span className="text-[10px] text-stone-500 mt-1 block">Usually 22 or 26 days</span>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-stone-200/70 bg-stone-50/50 p-4 flex flex-col justify-center">
                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">DOLE Formula Active</span>
                                <p className="text-xs font-bold text-stone-850 mt-1">
                                    {data.payroll_factor_method === '261' ? '5-Day Week (261 Factor)' : '6-Day Week (313 Factor)'}
                                </p>
                                <span className="text-[10px] text-stone-500 mt-0.5">Includes automatic legal holiday pay.</span>
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
                                    onChange={e => setData('standard_workday_hours', e.target.value.replace(/-/g, ""))} 
                                    required 
                                    min="4" 
                                    max="12"
                                    step="0.5"
                                />
                                <span className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-stone-400 pointer-events-none">
                                    hours
                                </span>
                            </div>
                            <span className="text-[10px] text-stone-500 mt-1 block">Standard full-time day is 8 hours</span>
                        </div>
                    </div>

                    {/* Wage preview */}
                    <div className="rounded-2xl border border-clay-200/80 bg-[#FCF7F2]/60 p-4">
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-1.5">
                                <Calculator size={15} className="text-clay-700" />
                                <span className="text-xs font-bold text-stone-900">
                                    Sample Wage Computation
                                </span>
                            </div>
                            <span className="text-[10px] font-semibold text-stone-500">
                                Example for ₱20,000 monthly pay
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div className="bg-white rounded-xl p-3 border border-stone-200/70 shadow-2xs">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Daily Pay</span>
                                <div className="text-sm font-black text-stone-900 mt-0.5">₱{wagePreview.daily}</div>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-stone-200/70 shadow-2xs">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Hourly Pay</span>
                                <div className="text-sm font-black text-stone-900 mt-0.5">₱{wagePreview.hourly}</div>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-clay-200 shadow-2xs">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-clay-700 block">Overtime Pay</span>
                                <div className="text-sm font-black text-clay-800 mt-0.5">₱{wagePreview.otHourly}</div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Shift Schedule */}
                    <div className="border-t border-stone-150 pt-5 space-y-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                                Workshop Shift Hours &amp; Lunch Break
                            </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
                                <div className="flex items-center gap-1.5">
                                    <SunMedium size={15} className="text-amber-700" />
                                    <span className="text-xs font-bold text-stone-900">Shift Working Hours</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                        <InputLabel value="Work Starts At" />
                                        <input 
                                            type="time" 
                                            className="w-full rounded-xl border border-stone-300 text-xs font-bold text-stone-850 focus:border-clay-500 focus:ring-clay-500 min-h-[42px] mt-1" 
                                            value={data.shift_start_time || '08:00'} 
                                            onChange={e => setData('shift_start_time', e.target.value)} 
                                            required 
                                        />
                                    </div>
                                    <div>
                                        <InputLabel value="Work Ends At" />
                                        <input 
                                            type="time" 
                                            className="w-full rounded-xl border border-stone-300 text-xs font-bold text-stone-850 focus:border-clay-500 focus:ring-clay-500 min-h-[42px] mt-1" 
                                            value={data.shift_end_time || '17:00'} 
                                            onChange={e => setData('shift_end_time', e.target.value)} 
                                            required 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <InputLabel value="Late Grace Period" />
                                    <div className="mt-1 relative rounded-xl shadow-2xs">
                                        <input 
                                            type="number" 
                                            className="w-full rounded-xl border border-stone-300 pr-16 text-xs font-bold text-stone-850 focus:border-clay-500 focus:ring-clay-500 min-h-[42px]" 
                                            value={data.grace_period_minutes ?? 15} 
                                            onChange={e => setData('grace_period_minutes', e.target.value)} 
                                            min="0" 
                                            max="120"
                                            required 
                                        />
                                        <span className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-stone-400 pointer-events-none">
                                            minutes
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-stone-500 mt-1 block">Arrivals within 15 mins are on-time</span>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
                                <div className="flex items-center gap-1.5">
                                    <Coffee size={15} className="text-amber-800" />
                                    <span className="text-xs font-bold text-stone-900">Lunch / Meal Break</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                        <InputLabel value="Lunch Starts At" />
                                        <input 
                                            type="time" 
                                            className="w-full rounded-xl border border-stone-300 text-xs font-bold text-stone-850 focus:border-clay-500 focus:ring-clay-500 min-h-[42px] mt-1" 
                                            value={data.break_window_start || '11:30'} 
                                            onChange={e => setData('break_window_start', e.target.value)} 
                                        />
                                    </div>
                                    <div>
                                        <InputLabel value="Lunch Ends At" />
                                        <input 
                                            type="time" 
                                            className="w-full rounded-xl border border-stone-300 text-xs font-bold text-stone-850 focus:border-clay-500 focus:ring-clay-500 min-h-[42px] mt-1" 
                                            value={data.break_window_end || '13:30'} 
                                            onChange={e => setData('break_window_end', e.target.value)} 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <InputLabel value="Max Break Time" />
                                    <div className="mt-1 relative rounded-xl shadow-2xs">
                                        <input 
                                            type="number" 
                                            className="w-full rounded-xl border border-stone-300 pr-16 text-xs font-bold text-stone-850 focus:border-clay-500 focus:ring-clay-500 min-h-[42px]" 
                                            value={data.break_allowance_minutes ?? 60} 
                                            onChange={e => setData('break_allowance_minutes', e.target.value)} 
                                            min="0" 
                                            max="180"
                                            required 
                                        />
                                        <span className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-stone-400 pointer-events-none">
                                            minutes
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-stone-500 mt-1 block">Standard meal break is 60 mins (1 hr)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Overtime Multipliers */}
                    <div className="border-t border-stone-150 pt-5 space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                            Overtime &amp; Holiday Pay Rates
                        </label>

                        {isNonCompliantOT && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 text-[11px] leading-relaxed text-amber-800 flex gap-2">
                                <AlertTriangle size={15} className="text-amber-700 shrink-0 mt-0.5" />
                                <div>One or more overtime rates are below DOLE legal minimums.</div>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-2xs">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Regular Workday</span>
                                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 rounded px-1.5 py-0.5">DOLE: 1.25×</span>
                                </div>
                                <InputLabel value="Extra Hours Pay" />
                                <div className="mt-1 relative rounded-xl shadow-2xs">
                                    <input 
                                        type="number" 
                                        className="w-full rounded-xl border border-stone-300 pr-8 text-xs font-bold text-stone-850 focus:border-clay-500 focus:ring-clay-500 min-h-[40px]" 
                                        value={data.overtime_multiplier ?? ''} 
                                        onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                        onChange={e => setData('overtime_multiplier', e.target.value.replace(/-/g, ""))} 
                                        required 
                                        min="0.01" 
                                        max="10"
                                        step="0.01"
                                    />
                                    <span className="absolute inset-y-0 right-2.5 flex items-center text-xs font-bold text-stone-400 pointer-events-none">×</span>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-2xs">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Rest Day</span>
                                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 rounded px-1.5 py-0.5">DOLE: 1.69×</span>
                                </div>
                                <InputLabel value="Sunday/Special OT" />
                                <div className="mt-1 relative rounded-xl shadow-2xs">
                                    <input 
                                        type="number" 
                                        className="w-full rounded-xl border border-stone-300 pr-8 text-xs font-bold text-stone-850 focus:border-clay-500 focus:ring-clay-500 min-h-[40px]" 
                                        value={data.rest_day_ot_multiplier ?? ''} 
                                        onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                        onChange={e => setData('rest_day_ot_multiplier', e.target.value.replace(/-/g, ""))} 
                                        required 
                                        min="0.01" 
                                        max="10"
                                        step="0.01"
                                    />
                                    <span className="absolute inset-y-0 right-2.5 flex items-center text-xs font-bold text-stone-400 pointer-events-none">×</span>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-2xs">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Regular Holiday</span>
                                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 rounded px-1.5 py-0.5">DOLE: 2.60×</span>
                                </div>
                                <InputLabel value="Holiday Overtime" />
                                <div className="mt-1 relative rounded-xl shadow-2xs">
                                    <input 
                                        type="number" 
                                        className="w-full rounded-xl border border-stone-300 pr-8 text-xs font-bold text-stone-850 focus:border-clay-500 focus:ring-clay-500 min-h-[40px]" 
                                        value={data.holiday_ot_multiplier ?? ''} 
                                        onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                        onChange={e => setData('holiday_ot_multiplier', e.target.value.replace(/-/g, ""))} 
                                        required 
                                        min="0.01" 
                                        max="10"
                                        step="0.01"
                                    />
                                    <span className="absolute inset-y-0 right-2.5 flex items-center text-xs font-bold text-stone-400 pointer-events-none">×</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex flex-col-reverse gap-2.5 border-t border-stone-150 px-6 py-4 sm:flex-row sm:justify-end bg-stone-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-5 py-2.5 text-[13px] font-bold text-stone-600 transition hover:bg-stone-100 min-h-[44px] flex items-center justify-center"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={processing || !canEditHrRecords}
                        className="rounded-xl bg-clay-700 px-6 py-2.5 text-[13px] font-bold text-white transition hover:bg-clay-800 min-h-[44px] flex items-center justify-center shadow-xs cursor-pointer disabled:opacity-50"
                    >
                        <CheckCircle2 size={15} className="mr-1.5" />
                        Save Settings
                    </button>
                </div>
            </form>
        </Modal>
    );
}
