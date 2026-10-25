import React from 'react';
import {
    X,
    Edit3,
    UserX,
    UserCheck,
    Calendar,
    Clock,
    MapPin,
    Briefcase,
    Shield,
    ExternalLink
} from 'lucide-react';
import {
    formatPeso,
    formatAttendanceTime,
    formatWorkedHoursSummary,
    getAttendanceStatus
} from '@/utils/hrHelpers';

export default function StaffInspectorPane({
    employee,
    onClose,
    onEdit,
    onToggleSuspension,
    onOpenCalendar,
    onOpenTimeCard,
    canEditHrRecords,
    canManageStaffAccounts,
    presetLabelByKey = {}
}) {
    if (!employee) return null;

    const attendanceMeta = getAttendanceStatus(employee.attendance);
    const isSuspended = employee.status?.toLowerCase() === 'suspended' || employee.login_account?.workspace_access_enabled === false;
    const monthlySalary = Number(employee.salary || 0);
    const semiMonthlySalary = monthlySalary / 2;
    const estimatedDeductions = semiMonthlySalary * 0.04;
    const estimatedNet = semiMonthlySalary - estimatedDeductions;
    const initials = employee.name ? employee.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'LK';
    const rolePresetLabel = employee.login_account?.role_preset_key ? (presetLabelByKey[employee.login_account.role_preset_key] || employee.login_account.role_preset_key) : null;

    return (
        <aside
            aria-label="Artisan Details Inspector"
            className="bg-white border border-stone-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 sticky top-4 flex flex-col justify-between max-h-[calc(100vh-5rem)] overflow-y-auto no-scrollbar"
        >
            <div className="space-y-5">
                {/* Header with Avatar, Name, Status, and Controls */}
                <div className="flex items-start justify-between border-b border-stone-100 pb-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-[#FCF7F2] text-clay-700 font-black text-sm flex items-center justify-center border border-[#E7D8C9] shrink-0">
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-base text-stone-900 truncate">{employee.name}</h3>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${attendanceMeta.className}`}>
                                    {attendanceMeta.label}
                                </span>
                            </div>
                            <p className="text-xs text-stone-500 truncate mt-0.5">
                                {employee.role || 'Studio Artisan'} • ID: {employee.employee_id || 'LK-STAFF'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {canEditHrRecords && onEdit && (
                            <button
                                type="button"
                                onClick={() => onEdit(employee)}
                                className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition border border-stone-200/80 min-h-[38px] min-w-[38px] flex items-center justify-center"
                                title="Edit Artisan Profile"
                                aria-label="Edit Artisan Profile"
                            >
                                <Edit3 size={15} />
                            </button>
                        )}

                        {canManageStaffAccounts && onToggleSuspension && (
                            <button
                                type="button"
                                onClick={() => onToggleSuspension(employee)}
                                className={`p-2 rounded-xl transition border min-h-[38px] min-w-[38px] flex items-center justify-center ${
                                    isSuspended
                                        ? 'text-emerald-600 hover:bg-emerald-50 border-emerald-200'
                                        : 'text-amber-600 hover:bg-amber-50 border-amber-200'
                                }`}
                                title={isSuspended ? 'Reactivate Access' : 'Suspend Access'}
                                aria-label={isSuspended ? 'Reactivate Access' : 'Suspend Access'}
                            >
                                {isSuspended ? <UserCheck size={15} /> : <UserX size={15} />}
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition border border-stone-200/80 min-h-[38px] min-w-[38px] flex items-center justify-center"
                            title="Close Inspector"
                            aria-label="Close Inspector"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Current Pay Cycle Accrual Card */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-stone-400">
                        <span>Pay Period Accrual</span>
                        <span className="text-clay-600 font-semibold">Semi-Monthly</span>
                    </div>

                    <div className="bg-[#FAF8F5] border border-stone-200/80 rounded-2xl p-4 space-y-2.5">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-stone-600">Monthly Base Salary</span>
                            <span className="font-semibold text-stone-900">{formatPeso(monthlySalary)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-stone-600">Est. Semi-Monthly Base</span>
                            <span className="font-semibold text-stone-900">{formatPeso(semiMonthlySalary)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-stone-600">Logged Shift Hours</span>
                            <span className="font-medium text-stone-700">{formatWorkedHoursSummary(employee.attendance)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-rose-700">
                            <span>Est. Statutory Deductions</span>
                            <span className="font-semibold">-{formatPeso(estimatedDeductions)}</span>
                        </div>

                        <div className="border-t border-stone-200/80 pt-2 flex justify-between items-center text-sm font-bold text-stone-900">
                            <span>Est. Cycle Net</span>
                            <span className="text-emerald-700 font-black">{formatPeso(estimatedNet)}</span>
                        </div>
                    </div>
                </div>

                {/* Today's Shift Activity & Verification */}
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-stone-400">
                        <span>Shift Status & Location</span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                            <MapPin size={10} /> Cavite Workshop
                        </span>
                    </div>

                    <div className="bg-white border border-stone-200/80 rounded-2xl p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-stone-500">First Clock-in Today</span>
                            <span className="font-bold text-stone-800">
                                {formatAttendanceTime(employee.attendance?.today_first_clock_in) || 'No punch recorded'}
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                            <span className="text-stone-500">Current Status Note</span>
                            <span className="font-semibold text-stone-700">
                                {attendanceMeta.note || 'Scheduled shift'}
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                            <span className="text-stone-500">Portal Credentials</span>
                            <span className={`font-semibold ${employee.has_login_account ? 'text-stone-800' : 'text-stone-400'}`}>
                                {employee.has_login_account ? (employee.login_account?.email || 'Active Account') : 'No portal account'}
                            </span>
                        </div>

                        {rolePresetLabel && (
                            <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100">
                                <span className="text-stone-500">Assigned Role Preset</span>
                                <span className="text-clay-700 font-bold bg-[#FCF7F2] px-2 py-0.5 rounded-md border border-[#E7D8C9] text-[11px]">
                                    {rolePresetLabel}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Action Footer */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
                {employee.attendance?.has_attendance_source && (
                    <button
                        type="button"
                        onClick={() => onOpenCalendar && onOpenCalendar(employee)}
                        className="flex-1 py-2.5 px-3 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50 transition flex items-center justify-center gap-1.5 min-h-[44px]"
                    >
                        <Calendar size={14} />
                        <span>Attendance Dates</span>
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => onOpenTimeCard && onOpenTimeCard(employee)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition flex items-center justify-center gap-1.5 min-h-[44px]"
                >
                    <Clock size={14} />
                    <span>Time Card Audit</span>
                </button>
            </div>
        </aside>
    );
}
