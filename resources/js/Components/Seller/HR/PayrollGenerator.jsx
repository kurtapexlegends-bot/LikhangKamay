import React from 'react';
import { Banknote, X, Users, Sparkles, ChevronRight, ChevronLeft, Eye, HelpCircle, FileCheck2 } from 'lucide-react';
import { useForm } from '@inertiajs/react';
import axios from 'axios';
import Modal from '@/Components/Modal';
import { useToast } from '@/Components/ToastContext';
import {
    formatPeso,
    formatPrecisePeso,
    calculateNetPay
} from '@/utils/hrHelpers';

function Stepper({ activeStep, steps }) {
    return (
        <div className="flex items-center justify-between w-full max-w-md mx-auto py-2">
            {steps.map((step, idx) => {
                const stepNum = idx + 1;
                const isCompleted = activeStep > stepNum;
                const isActive = activeStep === stepNum;
                return (
                    <React.Fragment key={step}>
                        <div className="flex items-center gap-2.5">
                            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold border transition-all duration-300 ${
                                isCompleted
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                    : isActive
                                    ? 'bg-clay-700 border-clay-700 text-white shadow-sm ring-4 ring-clay-100'
                                    : 'bg-white border-stone-200 text-stone-400'
                            }`}>
                                {isCompleted ? '✓' : stepNum}
                            </div>
                            <span className={`text-[11px] font-bold transition-colors uppercase tracking-wider ${
                                isActive ? 'text-clay-800' : isCompleted ? 'text-emerald-700' : 'text-stone-400'
                            }`}>
                                {step}
                            </span>
                        </div>
                        {idx < steps.length - 1 && (
                            <div className={`h-0.5 flex-1 mx-4 border-t border-dashed transition-colors duration-500 ${
                                activeStep > stepNum ? 'border-emerald-500' : 'border-stone-200'
                            }`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

export default function PayrollGenerator({
    isOpen,
    onClose,
    staff = [],
    sellerSettings = {},
    canEditHrRecords,
    onViewAttendanceLogs,
    isCalendarOpen
}) {
    const { addToast } = useToast();
    const [activeStep, setActiveStep] = React.useState(1);
    const [activeInspectorId, setActiveInspectorId] = React.useState(null);
    const [mobileTab, setMobileTab] = React.useState('adjust'); // 'adjust' or 'inspector'
    
    const [dryRunResults, setDryRunResults] = React.useState(null);
    const [isDryRunning, setIsDryRunning] = React.useState(false);

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
            setActiveStep(1);
            setActiveInspectorId(null);
            setMobileTab('adjust');
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
        if (!item) return null;
        
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

    const selectedStaffItems = data.items.filter(i => i.isSelected);
    
    // Auto-select first active inspector employee if none is selected
    React.useEffect(() => {
        if (activeStep === 2 && !activeInspectorId && selectedStaffItems.length > 0) {
            setActiveInspectorId(selectedStaffItems[0].employee_id);
        }
    }, [activeStep, activeInspectorId, selectedStaffItems]);

    const activeInspectorItem = data.items.find(i => i.employee_id === activeInspectorId);
    const activeBreakdown = getBreakdown(activeInspectorItem);

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="5xl" closeable={!isCalendarOpen}>
            <form onSubmit={handleSubmit} className="flex h-[88vh] flex-col bg-[#FDFBF9]">
                {/* Header */}
                <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-stone-150 bg-[#FDFBF9] gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-500">
                            <Banknote size={16} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-stone-900 tracking-tight">Generate Payroll</h2>
                            <p className="text-[10px] font-semibold text-stone-500 mt-0.5">
                                Period: <span className="text-stone-700 font-bold">{data.month}</span>
                            </p>
                        </div>
                    </div>
                    
                    <div className="hidden sm:block flex-1 max-w-sm">
                        <Stepper activeStep={activeStep} steps={['Roster Selection', 'Adjust & Preview']} />
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute right-4 top-4 text-stone-400 hover:text-stone-600 transition min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg"
                    >
                        <X size={18} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Mobile Stepper Panel */}
                <div className="sm:hidden border-b border-stone-100 bg-stone-50/50 px-6 py-2.5">
                    <Stepper activeStep={activeStep} steps={['Roster', 'Adjust']} />
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-hidden bg-[#FDFBF9] flex flex-col">
                    
                    {/* Step 1: Select Roster */}
                    {activeStep === 1 && (
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            <div className="rounded-2xl border border-[#E7D8C9] bg-[#FCF7F2] p-4 text-[11px] leading-relaxed text-clay-700 flex gap-3">
                                <Sparkles className="shrink-0 mt-0.5 text-clay-600" size={16} />
                                <div>
                                    <span className="font-bold">Prefill Sync Active</span>: Absent days, undertime, and overtime are loaded automatically from linked staff work logs for the selected month. Verify the roster selection below to proceed.
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-b border-stone-150 pb-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Available Employees ({data.items.length})</h3>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setData('items', data.items.map(i => ({ ...i, isSelected: true })))}
                                        className="text-[10px] font-bold text-clay-650 hover:underline"
                                    >
                                        Select All
                                    </button>
                                    <span className="text-stone-300">|</span>
                                    <button
                                        type="button"
                                        onClick={() => setData('items', data.items.map(i => ({ ...i, isSelected: false })))}
                                        className="text-[10px] font-bold text-stone-500 hover:underline"
                                    >
                                        Deselect All
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                {data.items.map((item, index) => {
                                    const isSelected = item.isSelected;
                                    return (
                                        <div
                                            key={item.employee_id}
                                            onClick={() => updatePayrollItem(index, 'isSelected', !isSelected)}
                                            className={`flex items-start gap-4 p-4 rounded-2xl border transition-all duration-300 cursor-pointer select-none ${
                                                isSelected
                                                    ? 'border-clay-600 bg-[#FCF7F2]/50 shadow-[0_4px_12px_rgba(137,67,45,0.04)]'
                                                    : 'border-stone-200 bg-white hover:border-stone-250 hover:bg-stone-50/50'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                className="mt-0.5 w-4 h-4 text-clay-600 rounded border-stone-300 focus:ring-clay-500 cursor-pointer pointer-events-none"
                                                checked={isSelected}
                                                readOnly
                                            />
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-xs font-bold text-stone-900 truncate">{item.name}</h4>
                                                <p className="text-[10px] font-bold text-stone-500 mt-0.5">{formatPeso(item.salary)}</p>
                                                
                                                <div className="mt-2.5 flex items-center justify-between w-full">
                                                    {item.has_attendance_source ? (
                                                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-1.5 py-0.5">
                                                            Prefilled: {item.attendance_days_worked || 0}d worked
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] font-bold text-stone-500 bg-stone-50 border border-stone-150 rounded-md px-1.5 py-0.5">
                                                            Manual Entry
                                                        </span>
                                                    )}
                                                    
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (onViewAttendanceLogs) {
                                                                onViewAttendanceLogs(item.employee_id);
                                                            }
                                                        }}
                                                        className="inline-flex items-center gap-1 text-[9px] font-bold text-clay-700 hover:text-clay-800 transition bg-clay-50 hover:bg-[#FCF7F2] border border-[#E7D8C9] rounded-md px-1.5 py-0.5"
                                                        title="View attendance logs"
                                                    >
                                                        <Eye size={10} />
                                                        Logs
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Adjust & Preview Split-Pane */}
                    {activeStep === 2 && selectedStaffItems.length > 0 && (
                        <div className="flex-1 flex overflow-hidden">
                            
                            {/* Mobile tabs for Viewport < md */}
                            <div className="md:hidden w-full flex flex-col h-full">
                                <div className="grid grid-cols-2 border-b border-stone-150 bg-stone-50 text-xs font-bold text-stone-500">
                                    <button
                                        type="button"
                                        onClick={() => setMobileTab('adjust')}
                                        className={`py-3 text-center transition-colors ${mobileTab === 'adjust' ? 'bg-[#FCF7F2] text-clay-800 border-b-2 border-clay-700' : 'hover:bg-stone-100'}`}
                                    >
                                        1. Enter Adjustments
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMobileTab('inspector')}
                                        className={`py-3 text-center transition-colors ${mobileTab === 'inspector' ? 'bg-[#FCF7F2] text-clay-800 border-b-2 border-clay-700' : 'hover:bg-stone-100'}`}
                                    >
                                        2. Live Breakdown
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {mobileTab === 'adjust' ? (
                                        data.items.map((item, index) => {
                                            if (!item.isSelected) return null;
                                            const isActive = item.employee_id === activeInspectorId;
                                            return (
                                                <div 
                                                    key={`mobile-adjust-${item.employee_id}`}
                                                    onClick={() => setActiveInspectorId(item.employee_id)}
                                                    className={`p-4 rounded-2xl border transition-all duration-300 ${
                                                        isActive ? 'border-clay-650 bg-white ring-2 ring-clay-200' : 'border-stone-200 bg-white'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between border-b border-stone-100 pb-2 mb-3">
                                                        <div>
                                                            <h4 className="text-xs font-bold text-stone-900">{item.name}</h4>
                                                            <p className="text-[10px] text-stone-500 mt-0.5">{formatPeso(item.salary)}</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setActiveInspectorId(item.employee_id);
                                                                setMobileTab('inspector');
                                                            }}
                                                            className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-clay-650 bg-clay-50 px-2.5 py-1 rounded-lg border border-clay-100"
                                                        >
                                                            <Eye size={12} />
                                                            View Pay
                                                        </button>
                                                    </div>
                                                    
                                                    {/* Adjustments Sub-Form */}
                                                    <AdjustmentsSubForm item={item} index={index} updateItem={updatePayrollItem} />
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Employee picker for inspector */}
                                            <div className="bg-white p-3 rounded-2xl border border-stone-200 flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">Select Staff:</span>
                                                <select
                                                    className="rounded-lg border-stone-200 text-xs font-bold text-stone-850 min-h-[36px]"
                                                    value={activeInspectorId || ''}
                                                    onChange={e => setActiveInspectorId(Number(e.target.value))}
                                                >
                                                    {selectedStaffItems.map(s => (
                                                        <option key={s.employee_id} value={s.employee_id}>{s.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            
                                            {activeInspectorItem && (
                                                <LiveCalculationInspector 
                                                    item={activeInspectorItem} 
                                                    breakdown={activeBreakdown} 
                                                    settings={sellerSettings} 
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Desktop Split Pane Viewports >= md */}
                            <div className="hidden md:flex flex-1 overflow-hidden divide-x divide-stone-200">
                                
                                {/* Left Adjustment Card List */}
                                <div className="w-3/5 overflow-y-auto p-6 space-y-4">
                                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">Adjustments Form List</h3>
                                    {data.items.map((item, index) => {
                                        if (!item.isSelected) return null;
                                        const isActive = item.employee_id === activeInspectorId;
                                        return (
                                            <div
                                                key={`desktop-adjust-${item.employee_id}`}
                                                onClick={() => setActiveInspectorId(item.employee_id)}
                                                className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                                                    isActive 
                                                        ? 'border-clay-600 bg-white shadow-[0_6px_16px_-4px_rgba(137,67,45,0.08)] ring-1 ring-clay-500/10'
                                                        : 'border-stone-200 bg-stone-50/20 hover:border-stone-300 hover:bg-white'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start border-b border-stone-100 pb-2.5 mb-3">
                                                    <div>
                                                        <h4 className="text-xs font-bold text-stone-900">{item.name}</h4>
                                                        <p className="text-[10px] text-stone-500 mt-0.5">{formatPeso(item.salary)}</p>
                                                    </div>
                                                    
                                                    {isActive && (
                                                        <span className="text-[9px] font-bold text-clay-700 bg-clay-50 border border-clay-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                                            Active Preview
                                                        </span>
                                                    )}
                                                </div>

                                                <div onClick={e => e.stopPropagation()}>
                                                    <AdjustmentsSubForm item={item} index={index} updateItem={updatePayrollItem} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Right Sticky Live Inspector Pane */}
                                <div className="w-2/5 overflow-y-auto bg-stone-50/50 p-6 flex flex-col">
                                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-4">Calculation Inspector</h3>
                                    {activeInspectorItem ? (
                                        <div className="sticky top-0 space-y-4">
                                            <LiveCalculationInspector 
                                                item={activeInspectorItem} 
                                                breakdown={activeBreakdown} 
                                                settings={sellerSettings} 
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-stone-200 rounded-3xl">
                                            <HelpCircle size={32} className="text-stone-300" />
                                            <p className="text-xs font-medium text-stone-500 mt-2">Select an employee from the left panel to inspect calculations.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Fallback if Step 2 is active but no items selected */}
                    {activeStep === 2 && selectedStaffItems.length === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#FDFBF9]">
                            <Users size={36} className="text-stone-300" />
                            <p className="text-xs font-bold text-stone-800 mt-3">No Staff Members Selected</p>
                            <p className="text-[11px] text-stone-500 mt-1 max-w-sm">Please go back to Step 1 and select at least one employee to adjust.</p>
                            <button
                                type="button"
                                onClick={() => setActiveStep(1)}
                                className="mt-4 inline-flex items-center gap-1 bg-clay-700 hover:bg-clay-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm"
                            >
                                Back to Roster
                            </button>
                        </div>
                    )}
                </div>

                {/* Dry Run Estimates Panel */}
                {dryRunResults && dryRunResults.items && activeStep === 2 && (
                    <div className="shrink-0 border-t border-stone-150 bg-white p-5 animate-fade-in max-h-[220px] overflow-y-auto">
                        <div className="flex items-center justify-between mb-3 border-b border-stone-100 pb-1.5">
                            <div className="flex items-center gap-1.5">
                                <FileCheck2 size={15} className="text-emerald-600" />
                                <h4 className="text-xs font-bold text-stone-900">Server-Verified Estimates</h4>
                            </div>
                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 uppercase tracking-wider">
                                Calculations Success
                            </span>
                        </div>
                        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {dryRunResults.items.map(res => {
                                const totalOt = Number(res.overtime_pay || 0) + Number(res.rest_day_ot_pay || 0) + Number(res.holiday_ot_pay || 0);
                                return (
                                    <div key={`dry-run-${res.employee_name}`} className="rounded-xl border border-stone-200 bg-stone-50/50 p-3 flex justify-between items-center text-xs">
                                        <div className="min-w-0">
                                            <span className="font-bold text-stone-850 truncate block">{res.employee_name}</span>
                                            <span className="text-[9px] text-stone-500 mt-0.5 block">
                                                OT: +{formatPeso(totalOt)} | Ded: -{formatPeso(res.deductions)}
                                            </span>
                                        </div>
                                        <span className="font-bold text-clay-700 shrink-0 text-right">{formatPrecisePeso(res.net_pay)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Summary / Estimate Footer Row */}
                {selectedStaffItems.length > 0 && (
                    <div className="shrink-0 flex flex-col sm:flex-row justify-between items-center bg-[#FCF7F2] border-t border-stone-200 px-6 py-4.5 gap-3">
                        <span className="text-clay-700 font-bold text-xs tracking-wider uppercase">
                            Staff Selected: {selectedStaffItems.length} of {data.items.length}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-stone-500 font-bold text-[10px] uppercase tracking-wider">Estimated Total Payroll:</span>
                            <span className="text-base font-bold text-clay-950">
                                {formatPrecisePeso(getEstimatedTotal())}
                            </span>
                        </div>
                    </div>
                )}

                {/* Wizard Footer Controls */}
                <div className="shrink-0 flex flex-col-reverse gap-3 border-t border-stone-150 px-6 py-4 sm:flex-row sm:justify-end bg-stone-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-5 py-2.5 text-[13px] font-bold text-stone-600 transition hover:bg-stone-100 min-h-[44px] flex items-center justify-center"
                    >
                        Cancel
                    </button>

                    {activeStep === 1 ? (
                        <button
                            type="button"
                            onClick={() => setActiveStep(2)}
                            disabled={selectedStaffItems.length === 0}
                            className="rounded-xl bg-clay-700 px-6 py-2.5 text-[13px] font-bold text-white transition hover:bg-clay-800 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center gap-1"
                        >
                            Configure Adjustments
                            <ChevronRight size={14} />
                        </button>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => setActiveStep(1)}
                                className="rounded-xl border border-stone-250 bg-white px-5 py-2.5 text-[13px] font-bold text-stone-600 transition hover:bg-stone-50 min-h-[44px] flex items-center justify-center gap-1"
                            >
                                <ChevronLeft size={14} />
                                Adjust Roster
                            </button>
                            
                            <button 
                                type="button" 
                                onClick={handleDryRun}
                                disabled={isDryRunning || processing || selectedStaffItems.length === 0 || !canEditHrRecords}
                                className="rounded-xl border border-clay-300 bg-white px-6 py-2.5 text-[13px] font-bold text-clay-700 transition hover:bg-[#FCF7F2] disabled:opacity-75 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center"
                            >
                                {isDryRunning ? 'Calculating...' : 'Preview Calculations'}
                            </button>

                            <button
                                type="submit"
                                disabled={processing || isDryRunning || selectedStaffItems.length === 0 || !canEditHrRecords}
                                className="rounded-xl bg-clay-700 px-6 py-2.5 text-[13px] font-bold text-white transition hover:bg-clay-800 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center"
                            >
                                Submit to Accounting
                            </button>
                        </>
                    )}
                </div>
            </form>
        </Modal>
    );
}

/* Subcomponent for entering numeric hours and days adjustments */
function AdjustmentsSubForm({ item, index, updateItem }) {
    return (
        <div className="grid grid-cols-2 gap-4">
            {/* Time-Off Adjustments */}
            <div className="space-y-3 bg-stone-50/50 p-3.5 rounded-2xl border border-stone-150">
                <span className="text-[9px] font-bold text-stone-400 block uppercase tracking-wider">Leave & Absence Days</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                        <label className="text-[10px] font-bold text-red-650 block mb-1 uppercase tracking-wider">Unpaid Absences</label>
                        <input
                            type="number"
                            className="w-full rounded-xl border border-red-200 bg-white p-2 text-xs font-bold text-red-900 text-center shadow-none focus:border-red-500 focus:ring-red-500 min-h-[40px]"
                            value={item.absences_days ?? ''}
                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                            onChange={(e) => updateItem(index, 'absences_days', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                            min="0" max="31" step="0.5"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-emerald-650 block mb-1 uppercase tracking-wider">Paid Leaves</label>
                        <input
                            type="number"
                            className="w-full rounded-xl border border-emerald-200 bg-white p-2 text-xs font-bold text-emerald-900 text-center shadow-none focus:border-emerald-500 focus:ring-emerald-500 min-h-[40px]"
                            value={item.paid_leave_days ?? ''}
                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                            onChange={(e) => updateItem(index, 'paid_leave_days', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                            min="0" max="31" step="0.5"
                        />
                    </div>
                </div>
            </div>

            {/* Overtime & Undertime Adjustments */}
            <div className="space-y-3 bg-[#FCF7F2]/40 p-3.5 rounded-2xl border border-[#E7D8C9]/60">
                <span className="text-[9px] font-bold text-clay-600 block uppercase tracking-wider">Hourly Adjustments</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="col-span-1">
                        <label className="text-[10px] font-bold text-orange-650 block mb-1 uppercase tracking-wider truncate" title="Undertime Hours">Undertime</label>
                        <input
                            type="number"
                            className="w-full rounded-xl border border-orange-200 bg-white p-2 text-xs font-bold text-orange-900 text-center shadow-none focus:border-orange-500 focus:ring-orange-500 min-h-[40px]"
                            value={item.undertime_hours ?? ''}
                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                            onChange={(e) => updateItem(index, 'undertime_hours', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                            min="0" step="0.5"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-clay-700 block mb-1 uppercase tracking-wider truncate" title="Regular OT Hours">Reg OT</label>
                        <input
                            type="number"
                            className="w-full rounded-xl border border-[#E7D8C9] bg-white p-2 text-xs font-bold text-clay-950 text-center shadow-none focus:border-clay-500 focus:ring-clay-500 min-h-[40px]"
                            value={item.overtime_hours ?? ''}
                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                            onChange={(e) => updateItem(index, 'overtime_hours', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                            min="0" step="0.5"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-clay-700 block mb-1 uppercase tracking-wider truncate" title="Rest Day OT Hours">Rest OT</label>
                        <input
                            type="number"
                            className="w-full rounded-xl border border-[#E7D8C9] bg-white p-2 text-xs font-bold text-clay-950 text-center shadow-none focus:border-clay-500 focus:ring-clay-500 min-h-[40px]"
                            value={item.rest_day_ot_hours ?? ''}
                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                            onChange={(e) => updateItem(index, 'rest_day_ot_hours', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                            min="0" step="0.5"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-clay-700 block mb-1 uppercase tracking-wider truncate" title="Holiday OT Hours">Hol OT</label>
                        <input
                            type="number"
                            className="w-full rounded-xl border border-[#E7D8C9] bg-white p-2 text-xs font-bold text-clay-950 text-center shadow-none focus:border-clay-500 focus:ring-clay-500 min-h-[40px]"
                            value={item.holiday_ot_hours ?? ''}
                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                            onChange={(e) => updateItem(index, 'holiday_ot_hours', e.target.value === '' ? '' : parseFloat(e.target.value.replace(/-/g, "")))}
                            min="0" step="0.5"
                        />
                    </div>
                </div>
                <p className="text-[8px] text-stone-500 mt-1">Hint: Enter hours as decimals (e.g. 1.5 = 1 hour 30 mins, 2.25 = 2 hours 15 mins)</p>
            </div>
        </div>
    );
}

/* Subcomponent for live calculations inspector */
function LiveCalculationInspector({ item, breakdown, settings }) {
    if (!item || !breakdown) return null;

    const methodLabel = settings.payroll_factor_method === '261' 
        ? '5-Day Factor' 
        : settings.payroll_factor_method === '313' 
        ? '6-Day Factor' 
        : `Custom divisor (${settings.payroll_working_days || 22}d)`;

    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
            <div className="border-b border-stone-100 pb-3 flex justify-between items-center">
                <div>
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block">Reviewing Wages</span>
                    <span className="font-bold text-xs text-stone-900 block mt-0.5">{item.name}</span>
                </div>
                <span className="text-[9px] font-bold text-clay-700 bg-clay-50 border border-clay-100 px-2 py-0.5 rounded uppercase">
                    Live Audit
                </span>
            </div>

            {/* Calculations Info */}
            <div className="space-y-3">
                <div className="space-y-2">
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Base Rates ({methodLabel})</span>
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 text-[11px] space-y-1.5">
                        <div className="flex justify-between">
                            <span className="text-stone-500">Divisor Formula:</span>
                            <span className="font-mono text-stone-800">{breakdown.formulaText}</span>
                        </div>
                        <div className="flex justify-between border-b border-stone-200/40 pb-1.5 mb-1.5">
                            <span className="text-stone-500">Resolved Daily Rate:</span>
                            <span className="font-bold text-stone-900">{formatPrecisePeso(breakdown.dailyRate)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-stone-500">Hourly Rate Divisor:</span>
                            <span className="text-stone-850">Daily Rate / 8 hrs</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-stone-500">Resolved Hourly Rate:</span>
                            <span className="font-bold text-stone-900">{formatPrecisePeso(breakdown.hourlyRate)}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Overtime Premiums (Multipliers)</span>
                    <div className="bg-[#FCF7F2]/70 p-3 rounded-xl border border-[#E7D8C9]/50 text-[11px] space-y-1.5">
                        <div className="flex justify-between">
                            <span className="text-stone-500">Regular OT Rate ({settings.overtime_multiplier || 1.25}x):</span>
                            <span className="font-semibold text-stone-800">{formatPrecisePeso(breakdown.regularOtRate)}/hr</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-stone-500">Rest Day OT Rate ({settings.rest_day_ot_multiplier || 1.69}x):</span>
                            <span className="font-semibold text-stone-800">{formatPrecisePeso(breakdown.restDayOtRate)}/hr</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-stone-500">Holiday OT Rate ({settings.holiday_ot_multiplier || 2.60}x):</span>
                            <span className="font-semibold text-stone-800">{formatPrecisePeso(breakdown.holidayOtRate)}/hr</span>
                        </div>
                    </div>
                </div>

                <div className="border-t border-stone-100 pt-3 space-y-2">
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Calculation Summary</span>
                    <div className="space-y-2">
                        <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-150 flex justify-between items-center">
                            <span className="text-[10px] text-stone-550 font-bold uppercase tracking-wider">Monthly Salary</span>
                            <span className="text-xs font-bold text-stone-700">{formatPeso(item.salary)}</span>
                        </div>
                        
                        <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 flex justify-between items-start">
                            <div>
                                <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Overtime Pay</span>
                                <div className="text-[9px] text-stone-400 mt-0.5 space-y-0.5">
                                    {(Number(item.overtime_hours) || 0) > 0 && <div>Reg: {item.overtime_hours}h x {formatPrecisePeso(breakdown.regularOtRate)}</div>}
                                    {(Number(item.rest_day_ot_hours) || 0) > 0 && <div>Rest: {item.rest_day_ot_hours}h x {formatPrecisePeso(breakdown.restDayOtRate)}</div>}
                                    {(Number(item.holiday_ot_hours) || 0) > 0 && <div>Hol: {item.holiday_ot_hours}h x {formatPrecisePeso(breakdown.holidayOtRate)}</div>}
                                </div>
                            </div>
                            <span className="text-xs font-bold text-emerald-700 shrink-0">+{formatPrecisePeso(breakdown.totalOtPay)}</span>
                        </div>

                        <div className="bg-red-50/50 p-2.5 rounded-xl border border-red-100 flex justify-between items-start">
                            <div>
                                <span className="text-[10px] text-red-700 font-bold uppercase tracking-wider">Deductions</span>
                                <div className="text-[9px] text-stone-400 mt-0.5 space-y-0.5">
                                    {(Number(item.absences_days) || 0) > 0 && <div>Absence: {item.absences_days}d x {formatPrecisePeso(breakdown.dailyRate)}</div>}
                                    {(Number(item.undertime_hours) || 0) > 0 && <div>Undertime: {item.undertime_hours}h x {formatPrecisePeso(breakdown.hourlyRate)}</div>}
                                </div>
                            </div>
                            <span className="text-xs font-bold text-red-700 shrink-0">-{formatPrecisePeso(breakdown.absenceDeduction + breakdown.undertimeDeduction)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-stone-900 text-white p-3 rounded-xl flex items-center justify-between shadow-sm">
                    <div>
                        <span className="text-[8px] font-bold text-stone-400 uppercase tracking-widest block">Estimated Net Salary</span>
                        <span className="text-[9px] text-stone-300 font-semibold block mt-0.5">Salary + OT - Deductions</span>
                    </div>
                    <span className="font-bold text-base text-clay-400 shrink-0">{formatPrecisePeso(breakdown.net)}</span>
                </div>
            </div>
        </div>
    );
}
