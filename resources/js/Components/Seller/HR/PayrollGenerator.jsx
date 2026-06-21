import React from 'react';
import { Banknote, X, Clock3, Users } from 'lucide-react';
import { useForm } from '@inertiajs/react';
import axios from 'axios';
import Modal from '@/Components/Modal';
import { useToast } from '@/Components/ToastContext';
import {
    formatPeso,
    formatPrecisePeso,
    calculateNetPay
} from '@/utils/hrHelpers';

export default function PayrollGenerator({
    isOpen,
    onClose,
    staff = [],
    sellerSettings = {},
    canEditHrRecords
}) {
    const { addToast } = useToast();
    const [dryRunResults, setDryRunResults] = React.useState(null);
    const [isDryRunning, setIsDryRunning] = React.useState(false);
    const [expandedRows, setExpandedRows] = React.useState({});

    const toggleExpandedRow = (id) => {
        setExpandedRows(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const { data, setData, post, processing, errors, transform } = useForm({
        month: sellerSettings.attendance_month_label || new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        items: []
    });

    React.useEffect(() => {
        if (isOpen) {
            const initialItems = staff.map(emp => ({
                employee_id: emp.id,
                name: emp.name,
                salary: Number(emp.salary),
                absences_days: Number(emp.payroll_prefill?.absences_days ?? 0),
                paid_leave_days: 0,
                undertime_hours: Number(emp.payroll_prefill?.undertime_hours ?? 0),
                overtime_hours: Number(emp.payroll_prefill?.overtime_hours ?? 0),
                rest_day_ot_hours: 0,
                holiday_ot_hours: 0,
                attendance_days_worked: Number(emp.payroll_prefill?.days_worked ?? 0),
                has_attendance_source: !!emp.attendance?.has_attendance_source,
                isSelected: true
            }));
            setData({
                month: sellerSettings.attendance_month_label || new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
                items: initialItems
            });
            setDryRunResults(null);
            setExpandedRows({});
        }
    }, [isOpen, staff, sellerSettings]);

    const updatePayrollItem = (index, field, value) => {
        const newItems = [...data.items];
        newItems[index][field] = value;
        setData('items', newItems);
    };

    const getEstimatedTotal = () => {
        return data.items
            .filter(i => i.isSelected)
            .reduce((acc, item) => acc + calculateNetPay(item, sellerSettings), 0);
    };

    const getBreakdown = (item) => {
        const workingDays = sellerSettings.payroll_working_days || 22;
        const factorMethod = sellerSettings.payroll_factor_method || 'custom';
        const otMultiplier = sellerSettings.overtime_multiplier || 1.25;
        const restDayOtMultiplier = sellerSettings.rest_day_ot_multiplier || 1.69;
        const holidayOtMultiplier = sellerSettings.holiday_ot_multiplier || 2.60;

        let dailyRate = 0;
        let formulaText = '';
        if (factorMethod === '261') {
            dailyRate = (item.salary * 12) / 261;
            formulaText = `(₱${item.salary.toLocaleString()} * 12) / 261`;
        } else if (factorMethod === '313') {
            dailyRate = (item.salary * 12) / 313;
            formulaText = `(₱${item.salary.toLocaleString()} * 12) / 313`;
        } else {
            dailyRate = item.salary / workingDays;
            formulaText = `₱${item.salary.toLocaleString()} / ${workingDays}`;
        }

        const hourlyRate = dailyRate / 8;
        
        const regularOtRate = hourlyRate * otMultiplier;
        const restDayOtRate = hourlyRate * restDayOtMultiplier;
        const holidayOtRate = hourlyRate * holidayOtMultiplier;

        const regularOtPay = (Number(item.overtime_hours) || 0) * regularOtRate;
        const restDayOtPay = (Number(item.rest_day_ot_hours) || 0) * restDayOtRate;
        const holidayOtPay = (Number(item.holiday_ot_hours) || 0) * holidayOtRate;
        const totalOtPay = regularOtPay + restDayOtPay + holidayOtPay;

        const absenceDeduction = (Number(item.absences_days) || 0) * dailyRate;
        const undertimeDeduction = (Number(item.undertime_hours) || 0) * hourlyRate;
        
        const net = item.salary + totalOtPay - absenceDeduction - undertimeDeduction;

        return {
            dailyRate,
            hourlyRate,
            formulaText,
            regularOtRate,
            restDayOtRate,
            holidayOtRate,
            regularOtPay,
            restDayOtPay,
            holidayOtPay,
            totalOtPay,
            absenceDeduction,
            undertimeDeduction,
            net: net > 0 ? net : 0
        };
    };

    const handleDryRun = () => {
        if (!canEditHrRecords) return;
        const selectedItems = data.items.filter(i => i.isSelected);
        if (selectedItems.length === 0) {
            addToast("Please select at least one employee.", "error");
            return;
        }
        setIsDryRunning(true);
        setDryRunResults(null);

        axios.post(route('hr.generate'), {
            action: 'dry_run',
            month: data.month,
            items: selectedItems.map(i => ({
                employee_id: i.employee_id,
                absences_days: i.absences_days || 0,
                paid_leave_days: i.paid_leave_days || 0,
                undertime_hours: i.undertime_hours || 0,
                overtime_hours: i.overtime_hours || 0,
                rest_day_ot_hours: i.rest_day_ot_hours || 0,
                holiday_ot_hours: i.holiday_ot_hours || 0,
            }))
        })
        .then(response => {
            if (response.data?.success && response.data?.data) {
                setDryRunResults(response.data.data);
                addToast('Dry run calculation complete.', 'success');
            } else {
                addToast('Failed to retrieve preview details.', 'error');
            }
        })
        .catch(() => {
            addToast('Dry run failed. Please check inputs.', 'error');
        })
        .finally(() => {
            setIsDryRunning(false);
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!canEditHrRecords) return;
        const selectedItems = data.items.filter(i => i.isSelected);
        if (selectedItems.length === 0) {
            addToast("Please select at least one employee.", "error");
            return;
        }

        transform((data) => ({
            month: data.month,
            items: data.items.filter(i => i.isSelected).map(i => ({
                employee_id: i.employee_id,
                absences_days: i.absences_days || 0,
                paid_leave_days: i.paid_leave_days || 0,
                undertime_hours: i.undertime_hours || 0,
                overtime_hours: i.overtime_hours || 0,
                rest_day_ot_hours: i.rest_day_ot_hours || 0,
                holiday_ot_hours: i.holiday_ot_hours || 0,
            }))
        }));

        post(route('hr.generate'), {
            onSuccess: (page) => {
                if (page?.props?.flash?.error) {
                    addToast(page.props.flash.error, 'error');
                    return;
                }
                onClose();
                addToast(page?.props?.flash?.success || 'Payroll request sent to Accounting.', "success");
            },
            onError: (errors) => {
                const firstError = errors.items || errors.month || Object.values(errors)[0];
                addToast(firstError || 'Unable to generate payroll right now.', 'error');
            },
        });
    };

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="5xl">
            <form onSubmit={handleSubmit} className="flex max-h-[85vh] flex-col">
                {/* Header */}
                <div className="shrink-0 flex items-start justify-between px-6 py-5 border-b border-stone-100 bg-[#FDFBF9]">
                    <div className="flex items-start gap-4">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-500">
                            <Banknote size={18} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-stone-900 tracking-tight">Generate Payroll</h2>
                            <p className="mt-1 text-[11px] font-medium text-stone-500">
                                Period: <span className="font-bold text-stone-700">{data.month}</span> (Method: <span className="font-bold text-stone-700">{sellerSettings.payroll_factor_method === '261' ? '5-Day Week (261 Factor)' : sellerSettings.payroll_factor_method === '313' ? '6-Day Week (313 Factor)' : `Custom ${sellerSettings.payroll_working_days || 22} Days`}</span>) - OT Multipliers: {sellerSettings.overtime_multiplier || 1.25}x (Reg) / {sellerSettings.rest_day_ot_multiplier || 1.69}x (Rest) / {sellerSettings.holiday_ot_multiplier || 2.60}x (Hol)
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-stone-400 hover:text-stone-600 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-6 bg-[#FDFBF9]">
                    <div className="mb-4 rounded-2xl border border-[#E7D8C9] bg-[#FCF7F2] px-4 py-3 text-xs leading-6 text-clay-700">
                        Attendance for {data.month} now prefills absences, undertime, and overtime for linked staff logins. HR can still adjust the values before submitting payroll.
                    </div>
                    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-[11px] font-bold text-stone-600 shadow-sm">
                        <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1">
                            <Clock3 size={13} />
                            1. Review attendance-based payroll
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">
                            <Banknote size={13} />
                            2. Submit to Accounting
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                            <Users size={13} />
                            3. Accounting approves or rejects
                        </span>
                    </div>

                    {errors.items && (
                        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium leading-6 text-red-700">
                            {errors.items}
                        </div>
                    )}

                    {/* Mobile View: Card Stack */}
                    <div className="mb-4 space-y-3 md:hidden">
                        {data.items.map((item, index) => (
                            <div key={`mobile-payroll-${item.employee_id}`} className={`rounded-2xl border border-stone-200 bg-white p-4 shadow-sm ${!item.isSelected ? 'opacity-60' : ''}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-900">{item.name}</p>
                                        <p className="mt-0.5 text-[11px] text-stone-500">{formatPeso(item.salary)}</p>
                                        <p className="mt-1 text-[10px] text-stone-400">
                                            {item.has_attendance_source
                                                ? `${item.attendance_days_worked || 0} attended day(s) used for prefill`
                                                : 'Manual payroll entry'}
                                        </p>
                                    </div>
                                    <label className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[10px] font-bold text-stone-600 min-h-[44px]">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-clay-600 focus:ring-clay-500 cursor-pointer"
                                            checked={item.isSelected}
                                            onChange={(e) => updatePayrollItem(index, 'isSelected', e.target.checked)}
                                        />
                                        Include
                                    </label>
                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    <div>
                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-red-500">Unpaid Absences</label>
                                        <input
                                            type="number"
                                            className="w-full rounded-xl border border-red-200 bg-white p-2.5 text-xs text-red-900 shadow-none focus:border-red-500 focus:ring-red-500 min-h-[44px]"
                                            value={item.absences_days ?? ''}
                                            disabled={!item.isSelected}
                                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                            onChange={(e) => updatePayrollItem(index, 'absences_days', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                                            min="0"
                                            max="31"
                                            step="0.5"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-600">Paid Leaves</label>
                                        <input
                                            type="number"
                                            className="w-full rounded-xl border border-emerald-200 bg-white p-2.5 text-xs text-emerald-900 shadow-none focus:border-emerald-500 focus:ring-emerald-500 min-h-[44px]"
                                            value={item.paid_leave_days ?? ''}
                                            disabled={!item.isSelected}
                                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                            onChange={(e) => updatePayrollItem(index, 'paid_leave_days', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                                            min="0"
                                            max="31"
                                            step="0.5"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-orange-500">Undertime (Hrs)</label>
                                        <input
                                            type="number"
                                            className="w-full rounded-xl border border-orange-200 bg-white p-2.5 text-xs text-orange-900 shadow-none focus:border-orange-500 focus:ring-orange-500 min-h-[44px]"
                                            value={item.undertime_hours ?? ''}
                                            disabled={!item.isSelected}
                                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                            onChange={(e) => updatePayrollItem(index, 'undertime_hours', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                                            min="0"
                                            step="0.5"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-clay-600">Reg OT (Hrs)</label>
                                        <input
                                            type="number"
                                            className="w-full rounded-xl border border-[#E7D8C9] bg-white p-2.5 text-xs text-clay-900 shadow-none focus:border-clay-500 focus:ring-clay-500 min-h-[44px]"
                                            value={item.overtime_hours ?? ''}
                                            disabled={!item.isSelected}
                                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                            onChange={(e) => updatePayrollItem(index, 'overtime_hours', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                                            min="0"
                                            step="0.5"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-clay-600">Rest OT (Hrs)</label>
                                        <input
                                            type="number"
                                            className="w-full rounded-xl border border-[#E7D8C9] bg-white p-2.5 text-xs text-clay-900 shadow-none focus:border-clay-500 focus:ring-clay-500 min-h-[44px]"
                                            value={item.rest_day_ot_hours ?? ''}
                                            disabled={!item.isSelected}
                                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                            onChange={(e) => updatePayrollItem(index, 'rest_day_ot_hours', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                                            min="0"
                                            step="0.5"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-clay-600">Holiday OT (Hrs)</label>
                                        <input
                                            type="number"
                                            className="w-full rounded-xl border border-[#E7D8C9] bg-white p-2.5 text-xs text-clay-900 shadow-none focus:border-clay-500 focus:ring-clay-500 min-h-[44px]"
                                            value={item.holiday_ot_hours ?? ''}
                                            disabled={!item.isSelected}
                                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                            onChange={(e) => updatePayrollItem(index, 'holiday_ot_hours', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                                            min="0"
                                            step="0.5"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => toggleExpandedRow(item.employee_id)}
                                    className="mt-3 text-[10px] font-bold text-clay-600 hover:text-clay-700 transition flex items-center justify-center gap-1 underline w-full"
                                >
                                    {expandedRows[item.employee_id] ? 'Hide Calculation Details' : 'Show Calculation Details'}
                                </button>
                                {expandedRows[item.employee_id] && (
                                    <div className="mt-3 bg-stone-50 p-3 rounded-xl border border-stone-200 text-[11px] space-y-2">
                                        <div className="flex justify-between border-b border-stone-200/50 pb-1">
                                            <span className="font-bold text-stone-700">Daily Rate:</span>
                                            <span className="text-stone-800">{formatPrecisePeso(getBreakdown(item).dailyRate)} ({sellerSettings.payroll_factor_method === '261' ? '261 Factor' : sellerSettings.payroll_factor_method === '313' ? '313 Factor' : 'Custom'})</span>
                                        </div>
                                        <div className="flex justify-between border-b border-stone-200/50 pb-1">
                                            <span className="font-bold text-stone-700">Hourly Rate:</span>
                                            <span className="text-stone-800">{formatPrecisePeso(getBreakdown(item).hourlyRate)}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-stone-200/50 pb-1">
                                            <span className="font-bold text-stone-700">Regular OT:</span>
                                            <span className="text-stone-800">{item.overtime_hours}h @ {formatPrecisePeso(getBreakdown(item).regularOtRate)}/h</span>
                                        </div>
                                        <div className="flex justify-between border-b border-stone-200/50 pb-1">
                                            <span className="font-bold text-stone-700">Rest Day OT:</span>
                                            <span className="text-stone-800">{item.rest_day_ot_hours}h @ {formatPrecisePeso(getBreakdown(item).restDayOtRate)}/h</span>
                                        </div>
                                        <div className="flex justify-between border-b border-stone-200/50 pb-1">
                                            <span className="font-bold text-stone-700">Holiday OT:</span>
                                            <span className="text-stone-800">{item.holiday_ot_hours}h @ {formatPrecisePeso(getBreakdown(item).holidayOtRate)}/h</span>
                                        </div>
                                        <div className="flex justify-between border-b border-stone-200/50 pb-1 text-red-600 font-semibold">
                                            <span>Deductions:</span>
                                            <span>-{formatPrecisePeso(getBreakdown(item).absenceDeduction + getBreakdown(item).undertimeDeduction)}</span>
                                        </div>
                                        <div className="flex justify-between text-stone-900 font-bold bg-white p-2 rounded-lg border border-stone-200">
                                            <span>Estimated Net:</span>
                                            <span className="text-clay-700">{formatPrecisePeso(getBreakdown(item).net)}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-3 flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2">
                                    <span className="text-[11px] font-medium text-stone-500">Estimated Net</span>
                                    <span className="text-sm font-bold text-clay-700">
                                        {item.isSelected ? formatPrecisePeso(calculateNetPay(item, sellerSettings)) : formatPrecisePeso(0)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop View: Table */}
                    <div className="mb-6 hidden overflow-hidden rounded-[1.25rem] border border-stone-200 bg-white shadow-sm md:block">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#FDFBF9] text-[9px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-100">
                                <tr>
                                    <th className="px-5 py-3.5 w-10 text-center border-r border-stone-100">Pay</th>
                                    <th className="px-5 py-3.5">Employee</th>
                                    <th className="px-5 py-3.5">Base Salary</th>
                                    <th className="px-4 py-3.5 w-48 bg-[#FCF3F3] text-red-700 border-l border-[#FCE8E8]" title="Unpaid absences deduct from monthly salary. Paid leaves do not.">Absences & Leaves</th>
                                    <th className="px-4 py-3.5 w-28 bg-orange-50/50 text-orange-700 border-l border-orange-100" title="Deductions per hour. Reduces gross salary based on hourly rate.">Undertime (Hrs)</th>
                                    <th className="px-4 py-3.5 w-48 bg-[#FCF7F2] text-clay-700 border-l border-[#E7D8C9]" title="Overtime hours for regular workdays, rest days, and holidays.">Overtime (Hrs)</th>
                                    <th className="px-5 py-3.5 text-right w-[140px] border-l border-stone-100">Net Pay (Est)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {data.items.map((item, index) => (
                                    <React.Fragment key={item.employee_id}>
                                        <tr className={`hover:bg-stone-50 transition ${!item.isSelected && 'opacity-50 grayscale'}`}>
                                            <td className="px-5 py-3.5 text-center border-r border-stone-100">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 text-clay-600 rounded border-stone-300 focus:ring-clay-500 cursor-pointer"
                                                    checked={item.isSelected}
                                                    onChange={(e) => updatePayrollItem(index, 'isSelected', e.target.checked)}
                                                />
                                            </td>
                                            <td className="px-5 py-3.5 font-bold text-stone-900">
                                                <div>{item.name}</div>
                                                <div className="mt-1 text-[10px] font-medium text-stone-500">
                                                    {item.has_attendance_source
                                                        ? `${item.attendance_days_worked || 0} attended day(s) used for prefill`
                                                        : 'Manual payroll entry - no linked attendance source'}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleExpandedRow(item.employee_id)}
                                                    className="mt-2 text-[10px] font-bold text-clay-600 hover:text-clay-700 transition flex items-center gap-1 underline"
                                                >
                                                    {expandedRows[item.employee_id] ? 'Hide Calculation Details' : 'Show Calculation Details'}
                                                </button>
                                            </td>
                                            <td className="px-5 py-3.5 text-stone-600 font-bold">{formatPeso(item.salary)}</td>
                                            
                                            <td className="px-4 py-3.5 bg-[#FCF3F3] border-l border-[#FCE8E8]">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[9px] font-bold text-red-400 w-8">Unpaid:</span>
                                                        <input 
                                                            type="number" 
                                                            className="w-16 border-red-200 bg-white shadow-none rounded-lg text-xs p-1 focus:border-red-500 focus:ring-red-500 text-red-900 font-bold text-center"
                                                            value={item.absences_days ?? ''}
                                                            disabled={!item.isSelected}
                                                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                                            onChange={(e) => updatePayrollItem(index, 'absences_days', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                                                            min="0" max="31" step="0.5"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[9px] font-bold text-emerald-500 w-8">Paid:</span>
                                                        <input 
                                                            type="number" 
                                                            className="w-16 border-emerald-200 bg-white shadow-none rounded-lg text-xs p-1 focus:border-emerald-500 focus:ring-emerald-500 text-emerald-900 font-bold text-center"
                                                            value={item.paid_leave_days ?? ''}
                                                            disabled={!item.isSelected}
                                                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                                            onChange={(e) => updatePayrollItem(index, 'paid_leave_days', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                                                            min="0" max="31" step="0.5"
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 bg-orange-50/20 border-l border-orange-100">
                                                <input 
                                                    type="number" 
                                                    className="w-full border-orange-200 bg-white shadow-none rounded-lg text-sm p-1.5 focus:border-orange-500 focus:ring-orange-500 text-orange-900 font-bold text-center"
                                                    value={item.undertime_hours ?? ''}
                                                    disabled={!item.isSelected}
                                                    onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                                    onChange={(e) => updatePayrollItem(index, 'undertime_hours', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                                                    min="0" step="0.5"
                                                />
                                            </td>
                                            <td className="px-4 py-3.5 bg-[#FCF7F2] border-l border-[#E7D8C9]">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[9px] font-bold text-stone-400 w-8">Reg OT:</span>
                                                        <input 
                                                            type="number" 
                                                            className="w-16 border-[#E7D8C9] bg-white shadow-none rounded-lg text-xs p-1 focus:border-clay-500 focus:ring-clay-500 text-clay-900 font-bold text-center"
                                                            value={item.overtime_hours ?? ''}
                                                            disabled={!item.isSelected}
                                                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                                            onChange={(e) => updatePayrollItem(index, 'overtime_hours', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                                                            min="0" step="0.5"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[9px] font-bold text-stone-400 w-8">Rest OT:</span>
                                                        <input 
                                                            type="number" 
                                                            className="w-16 border-[#E7D8C9] bg-white shadow-none rounded-lg text-xs p-1 focus:border-clay-500 focus:ring-clay-500 text-clay-900 font-bold text-center"
                                                            value={item.rest_day_ot_hours ?? ''}
                                                            disabled={!item.isSelected}
                                                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                                            onChange={(e) => updatePayrollItem(index, 'rest_day_ot_hours', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                                                            min="0" step="0.5"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[9px] font-bold text-stone-400 w-8">Hol OT:</span>
                                                        <input 
                                                            type="number" 
                                                            className="w-16 border-[#E7D8C9] bg-white shadow-none rounded-lg text-xs p-1 focus:border-clay-500 focus:ring-clay-500 text-clay-900 font-bold text-center"
                                                            value={item.holiday_ot_hours ?? ''}
                                                            disabled={!item.isSelected}
                                                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                                            onChange={(e) => updatePayrollItem(index, 'holiday_ot_hours', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                                                            min="0" step="0.5"
                                                        />
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-3.5 text-right font-bold text-stone-900 border-l border-stone-100">
                                                {item.isSelected ? formatPrecisePeso(calculateNetPay(item, sellerSettings)) : formatPrecisePeso(0)}
                                            </td>
                                        </tr>

                                        {expandedRows[item.employee_id] && (
                                            <tr key={`breakdown-row-${item.employee_id}`} className="bg-stone-50/50">
                                                <td colSpan={7} className="px-5 py-4 border-l border-r border-b border-stone-100">
                                                    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm text-xs space-y-3 max-w-3xl">
                                                        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                                                            <h4 className="font-bold text-stone-900">Payroll Calculation Transparency Details</h4>
                                                            <span className="text-[10px] font-bold text-clay-600 bg-clay-50 px-2 py-0.5 rounded-md">Live Formula Breakdown</span>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <h5 className="font-bold text-stone-700 text-[10px] uppercase tracking-wider">Rate Calculations</h5>
                                                                <div className="space-y-1 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                                                                    <div className="flex justify-between">
                                                                        <span className="text-stone-500">Daily Rate Formula:</span>
                                                                        <span className="font-semibold text-stone-800">{getBreakdown(item).formulaText}</span>
                                                                    </div>
                                                                    <div className="flex justify-between border-b border-stone-200/50 pb-1.5 mb-1.5">
                                                                        <span className="text-stone-500">Daily Rate:</span>
                                                                        <span className="font-bold text-stone-900">{formatPrecisePeso(getBreakdown(item).dailyRate)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-stone-500">Hourly Rate Formula:</span>
                                                                        <span className="font-semibold text-stone-800">Daily Rate / 8 Hours</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-stone-500">Hourly Rate:</span>
                                                                        <span className="font-bold text-stone-900">{formatPrecisePeso(getBreakdown(item).hourlyRate)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <h5 className="font-bold text-stone-700 text-[10px] uppercase tracking-wider">Overtime Premiums</h5>
                                                                <div className="space-y-1 bg-[#FCF7F2] p-2.5 rounded-xl border border-[#E7D8C9]/60">
                                                                    <div className="flex justify-between">
                                                                        <span className="text-stone-500">Regular OT Rate ({sellerSettings.overtime_multiplier || 1.25}x):</span>
                                                                        <span className="font-semibold text-stone-800">{formatPrecisePeso(getBreakdown(item).regularOtRate)}/hr</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-stone-500">Rest Day OT Rate ({sellerSettings.rest_day_ot_multiplier || 1.69}x):</span>
                                                                        <span className="font-semibold text-stone-800">{formatPrecisePeso(getBreakdown(item).restDayOtRate)}/hr</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-stone-500">Holiday OT Rate ({sellerSettings.holiday_ot_multiplier || 2.60}x):</span>
                                                                        <span className="font-semibold text-stone-800">{formatPrecisePeso(getBreakdown(item).holidayOtRate)}/hr</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="border-t border-stone-100 pt-3 flex flex-col gap-2">
                                                            <h5 className="font-bold text-stone-700 text-[10px] uppercase tracking-wider">Earnings & Deductions Summary</h5>
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                                <div className="bg-stone-50 p-2 rounded-xl border border-stone-100">
                                                                    <span className="text-[10px] text-stone-400 block font-semibold uppercase">Regular Salary</span>
                                                                    <span className="font-bold text-stone-700">{formatPrecisePeso(item.salary)}</span>
                                                                </div>
                                                                <div className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-100">
                                                                    <span className="text-[10px] text-emerald-600 block font-semibold uppercase">Total Overtime Pay</span>
                                                                    <span className="font-bold text-emerald-700">+{formatPrecisePeso(getBreakdown(item).totalOtPay)}</span>
                                                                    <div className="text-[9px] text-stone-400 mt-0.5 space-y-0.5">
                                                                        {item.overtime_hours > 0 && <div>Reg: {item.overtime_hours}h x {formatPrecisePeso(getBreakdown(item).regularOtRate)}</div>}
                                                                        {item.rest_day_ot_hours > 0 && <div>Rest: {item.rest_day_ot_hours}h x {formatPrecisePeso(getBreakdown(item).restDayOtRate)}</div>}
                                                                        {item.holiday_ot_hours > 0 && <div>Hol: {item.holiday_ot_hours}h x {formatPrecisePeso(getBreakdown(item).holidayOtRate)}</div>}
                                                                    </div>
                                                                </div>
                                                                <div className="bg-red-50/50 p-2 rounded-xl border border-red-100">
                                                                    <span className="text-[10px] text-red-600 block font-semibold uppercase">Total Deductions</span>
                                                                    <span className="font-bold text-red-700">-{formatPrecisePeso(getBreakdown(item).absenceDeduction + getBreakdown(item).undertimeDeduction)}</span>
                                                                    <div className="text-[9px] text-stone-400 mt-0.5 space-y-0.5">
                                                                        {item.absences_days > 0 && <div>Absences: {item.absences_days}d x {formatPrecisePeso(getBreakdown(item).dailyRate)}</div>}
                                                                        {item.undertime_hours > 0 && <div>Undertime: {item.undertime_hours}h x {formatPrecisePeso(getBreakdown(item).hourlyRate)}</div>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between items-center bg-stone-900 text-white p-3 rounded-xl mt-1">
                                                                <span className="font-bold text-xs tracking-wide uppercase">Formula: Salary + OT Pay - Deductions</span>
                                                                <div className="text-right">
                                                                    <span className="text-[9px] block text-stone-400 font-semibold">NET WAGE ESTIMATE</span>
                                                                    <span className="font-bold text-base text-clay-400">{formatPrecisePeso(getBreakdown(item).net)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Dry Run / Preview Results */}
                    {dryRunResults && dryRunResults.items && (
                        <div className="mt-6 animate-fade-in border-t border-stone-100 pt-6">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-bold text-stone-900">Server-Verified Estimates</h4>
                                    <p className="text-[11px] text-stone-500 font-medium">Calculated based on platform business rules and factor days.</p>
                                </div>
                                <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700 border border-emerald-100">
                                    Ready to Submit
                                </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {dryRunResults.items.map(res => {
                                    const totalOt = Number(res.overtime_pay || 0) + Number(res.rest_day_ot_pay || 0) + Number(res.holiday_ot_pay || 0);
                                    return (
                                        <div key={`dry-run-${res.employee_name}`} className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-sm">
                                            <div className="flex items-center justify-between gap-2 border-b border-stone-50 pb-2 mb-2">
                                                <span className="text-[12px] font-bold text-stone-800 truncate">{res.employee_name}</span>
                                                <span className="text-[12px] font-bold text-clay-700">{formatPrecisePeso(res.net_pay)}</span>
                                            </div>
                                            <div className="space-y-1.5 text-[10px] font-medium text-stone-500">
                                                <div className="flex justify-between">
                                                    <span>Base Salary</span>
                                                    <span className="text-stone-700">{formatPeso(res.base_salary)}</span>
                                                </div>
                                                <div className="flex justify-between text-red-600">
                                                    <span>Deductions</span>
                                                    <span>- {formatPrecisePeso(res.deductions)}</span>
                                                </div>
                                                <div className="flex justify-between text-emerald-600">
                                                    <span>Total OT Pay</span>
                                                    <span>+ {formatPrecisePeso(totalOt)}</span>
                                                </div>
                                                {totalOt > 0 && (
                                                    <div className="pl-2 border-l border-stone-100 text-[9px] text-stone-400 space-y-0.5 mt-0.5">
                                                        {Number(res.overtime_hours || 0) > 0 && <div>Reg: {res.overtime_hours}h (+{formatPrecisePeso(res.overtime_pay)})</div>}
                                                        {Number(res.rest_day_ot_hours || 0) > 0 && <div>Rest: {res.rest_day_ot_hours}h (+{formatPrecisePeso(res.rest_day_ot_pay)})</div>}
                                                        {Number(res.holiday_ot_hours || 0) > 0 && <div>Holiday: {res.holiday_ot_hours}h (+{formatPrecisePeso(res.holiday_ot_pay)})</div>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Summary Footer Panel */}
                    <div className="mt-6 flex flex-col sm:flex-row justify-between items-center bg-[#FCF7F2] border border-[#E7D8C9] px-6 py-5 rounded-[1.25rem] gap-4">
                        <span className="text-clay-700 font-bold text-sm tracking-tight uppercase">
                            Selected For Payment: {data.items.filter(i => i.isSelected).length}
                        </span>
                        <div className="text-center sm:text-right">
                            <span className="text-stone-500 font-bold text-[10px] uppercase tracking-widest mr-3">Total Payroll Estimate</span>
                            <span className="text-2xl font-bold tracking-tight text-clay-900 block sm:inline">
                                {formatPrecisePeso(getEstimatedTotal())}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Form Footer Actions */}
                <div className="flex flex-col-reverse gap-3 border-t border-stone-100 px-6 py-4 sm:flex-row sm:justify-end bg-[#FCF7F2]/50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-5 py-2.5 text-[13px] font-bold text-stone-600 transition hover:text-stone-900 min-h-[44px] flex items-center justify-center"
                    >
                        Cancel
                    </button>
                    
                    <button 
                        type="button" 
                        onClick={handleDryRun}
                        disabled={isDryRunning || processing || data.items.filter(i => i.isSelected).length === 0 || !canEditHrRecords}
                        className="rounded-xl border border-clay-300 bg-white px-6 py-2.5 text-[13px] font-bold text-clay-700 transition hover:bg-[#FCF7F2] disabled:opacity-70 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center"
                    >
                        {isDryRunning ? 'Calculating...' : 'Preview Calculations'}
                    </button>

                    <button
                        type="submit"
                        disabled={processing || isDryRunning || data.items.filter(i => i.isSelected).length === 0 || !canEditHrRecords}
                        className="rounded-xl bg-clay-700 px-6 py-2.5 text-[13px] font-bold text-white transition hover:bg-clay-800 disabled:opacity-70 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center"
                    >
                        Submit to Accounting
                    </button>
                </div>
            </form>
        </Modal>
    );
}
