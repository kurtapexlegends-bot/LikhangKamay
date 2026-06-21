import React from 'react';
import { Banknote, X, Users, ChevronRight, ChevronLeft, HelpCircle, FileCheck2 } from 'lucide-react';
import { useForm } from '@inertiajs/react';
import axios from 'axios';
import Modal from '@/Components/Modal';
import { useToast } from '@/Components/ToastContext';
import {
    formatPeso,
    formatPrecisePeso,
    calculateNetPay,
    calculatePayrollBreakdown
} from '@/utils/hrHelpers';

import RosterSelector from './RosterSelector';
import AdjustmentsSubForm from './AdjustmentsSubForm';
import LiveCalculationInspector from './LiveCalculationInspector';
import Stepper from './Stepper';
import AttendanceCalendarModal from './AttendanceCalendarModal';
import DryRunPreviewPanel from './DryRunPreviewPanel';



export default function PayrollGenerator({
    isOpen,
    onClose,
    staff = [],
    sellerSettings = {},
    canEditHrRecords,
    onMonthChange
}) {
    const { addToast } = useToast();
    const [activeStep, setActiveStep] = React.useState(1);
    const [activeInspectorId, setActiveInspectorId] = React.useState(null);
    const [mobileTab, setMobileTab] = React.useState('adjust'); // 'adjust' or 'inspector'
    
    const [dryRunResults, setDryRunResults] = React.useState(null);
    const [isDryRunning, setIsDryRunning] = React.useState(false);
    
    const [localAttendanceEmployee, setLocalAttendanceEmployee] = React.useState(null);
    const [localSelectedDate, setLocalSelectedDate] = React.useState(null);

    const activeAttendanceEmployee = React.useMemo(() => 
        localAttendanceEmployee 
            ? (staff.find(emp => emp.id === localAttendanceEmployee.id) || localAttendanceEmployee) 
            : null, 
        [localAttendanceEmployee, staff]
    );

    const handleViewAttendanceLogs = (employeeId) => {
        const emp = staff.find(e => e.id === employeeId);
        if (emp) {
            setLocalAttendanceEmployee(emp);
        }
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
    const activeBreakdown = calculatePayrollBreakdown(activeInspectorItem, sellerSettings);

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="5xl" closeable={!activeAttendanceEmployee}>
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
                        <RosterSelector
                            items={data.items}
                            updatePayrollItem={updatePayrollItem}
                            onSelectAll={() => setData('items', data.items.map(i => ({ ...i, isSelected: true })))}
                            onDeselectAll={() => setData('items', data.items.map(i => ({ ...i, isSelected: false })))}
                            onViewAttendanceLogs={handleViewAttendanceLogs}
                        />
                    )}

                    {/* Step 2: Adjust & Preview Split-Pane */}
                    {activeStep === 2 && selectedStaffItems.length > 0 && (
                        <div className="flex-1 flex overflow-hidden">
                            
                            {/* Mobile tabs for Viewport < md */}
                            <div className="md:hidden w-full flex flex-col h-full">
                                <div className="px-4 py-3 bg-[#FDFBF9] border-b border-stone-150">
                                    <div className="bg-stone-200/60 rounded-xl p-1 flex gap-1 text-xs font-bold">
                                        <button
                                            type="button"
                                            onClick={() => setMobileTab('adjust')}
                                            className={`flex-1 py-2 text-center rounded-lg transition-all ${
                                                mobileTab === 'adjust'
                                                    ? 'bg-white text-stone-900 shadow-sm'
                                                    : 'text-stone-500 hover:text-stone-850'
                                            }`}
                                        >
                                            1. Enter Adjustments
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMobileTab('inspector')}
                                            className={`flex-1 py-2 text-center rounded-lg transition-all ${
                                                mobileTab === 'inspector'
                                                    ? 'bg-white text-stone-900 shadow-sm'
                                                    : 'text-stone-500 hover:text-stone-850'
                                            }`}
                                        >
                                            2. Live Breakdown
                                        </button>
                                    </div>
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
                                                    className={`p-4 rounded-2xl border transition-all duration-200 active:scale-[0.98] cursor-pointer ${
                                                        isActive ? 'border-clay-650 bg-white ring-2 ring-clay-200 shadow-sm' : 'border-stone-200 bg-white'
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
                                                            <HelpCircle size={12} />
                                                            View Pay
                                                        </button>
                                                    </div>
                                                    
                                                    <AdjustmentsSubForm item={item} index={index} updateItem={updatePayrollItem} />
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="space-y-4">
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
                                                className={`p-4 rounded-2xl border transition-all duration-200 active:scale-[0.98] cursor-pointer ${
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
                <DryRunPreviewPanel dryRunResults={dryRunResults} activeStep={activeStep} />

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

            <AttendanceCalendarModal
                employee={activeAttendanceEmployee}
                selectedDate={localSelectedDate}
                onSelectDate={setLocalSelectedDate}
                onClose={() => setLocalAttendanceEmployee(null)}
                sellerSettings={sellerSettings}
                onMonthChange={onMonthChange}
            />
        </Modal>
    );
}
