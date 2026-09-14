/* global route */
import React from 'react';
import { Link } from '@inertiajs/react';
import { Pencil, UserX, UserCheck, CalendarDays, Clock3 } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import {
    formatPeso,
    formatWorkedHoursCount,
    getAttendanceStatus,
    getEmployeeDirectoryStatus,
} from '@/utils/hrHelpers';

export default function StaffRowItem({
    emp,
    auth,
    presetLabelByKey = {},
    canEditHrRecords = false,
    canManageStaffAccounts = false,
    openEditModal,
    onToggleSuspension,
    openAttendanceModal,
    isMobile = false,
}) {
    const attendanceStatus = getAttendanceStatus(emp.attendance);
    const directoryStatus = getEmployeeDirectoryStatus(emp, attendanceStatus);
    const hasAttendanceData = emp.attendance?.has_attendance_source && (emp.attendance?.calendar_days?.length || 0) > 0;

    const isSuspended = emp.status?.toLowerCase() === 'suspended' || emp.login_account?.workspace_access_enabled === false;
    const isSelf = Boolean(auth?.user?.id && emp.login_account?.id === auth.user.id);
    const isOwnerAccount = Boolean(emp.login_account?.role === 'artisan' || emp.login_account?.is_owner);
    const isDisabled = !canManageStaffAccounts || isSelf || isOwnerAccount;

    const suspendTooltip = isSelf
        ? 'You cannot suspend your own account'
        : isOwnerAccount
            ? 'Cannot suspend shop owner'
            : !canManageStaffAccounts
                ? 'Only shop owner or staff manager can suspend staff accounts'
                : isSuspended
                    ? `Reactivate ${emp.name}`
                    : `Suspend ${emp.name}`;

    if (isMobile) {
        return (
            <div className="p-4 space-y-3 border-b border-stone-100 last:border-0 hover:bg-[#FCF7F2]/30 transition">
                {/* Row 1: Employee Avatar + Info & Status Badge */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        {emp.has_login_account ? (
                            <UserAvatar
                                user={{
                                    ...emp.login_account,
                                    name: emp.name,
                                    role: 'staff',
                                }}
                                className="w-10 h-10 text-xs shadow-sm ring-1 ring-stone-900/5 cursor-pointer shrink-0"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-bold border border-stone-200 text-xs shadow-sm shrink-0">
                                {emp.name.charAt(0)}
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 truncate">{emp.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-stone-500 font-medium truncate">{emp.role}</span>
                                {emp.has_login_account && (
                                    <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[8px] font-extrabold tracking-wider text-stone-600 uppercase border border-stone-200/80 whitespace-nowrap">
                                        {presetLabelByKey[emp.login_account?.role_preset_key] || 'Staff'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${directoryStatus.className}`}>
                        {directoryStatus.label === 'Clocked In' ? (
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-clay-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-clay-500"></span>
                            </span>
                        ) : (
                            <span className={`w-1.5 h-1.5 rounded-full ${directoryStatus.dotClassName}`}></span>
                        )}
                        {directoryStatus.label}
                    </span>
                </div>

                {/* Row 2: Metrics & Compact Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-100/80">
                    <div className="flex items-center gap-3">
                        <span className="font-extrabold text-stone-900 text-xs sm:text-sm">{formatPeso(emp.salary)}</span>
                        {hasAttendanceData ? (
                            <button
                                type="button"
                                onClick={() => openAttendanceModal(emp)}
                                className="inline-flex items-center gap-1 rounded-lg border border-stone-200/80 bg-stone-50/70 px-2 py-1 text-[11px] font-bold text-stone-700 hover:border-clay-300 hover:bg-[#FCF7F2] transition shadow-2xs whitespace-nowrap cursor-pointer"
                                title="View attendance dates calendar"
                            >
                                <CalendarDays size={12} className="text-clay-600 shrink-0" />
                                <span>{formatWorkedHoursCount(emp.attendance?.worked_minutes)} hrs ({emp.attendance?.days_worked || 0}d)</span>
                            </button>
                        ) : (
                            <span className="text-[11px] text-stone-400 font-medium">0 hrs logged</span>
                        )}
                    </div>

                    {/* Action Icon Group */}
                    {canEditHrRecords && (
                        <div className="flex items-center gap-1 shrink-0">
                            <Link
                                href={route('hr.employees.time-card', emp.id)}
                                className="p-2 text-sky-600 hover:text-sky-800 hover:bg-sky-50/60 border border-stone-200/60 rounded-xl transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center bg-white shadow-2xs active:scale-95"
                                title="Time-Card Audit Logs"
                            >
                                <Clock3 size={14} />
                            </Link>
                            <button
                                onClick={() => openEditModal(emp)}
                                aria-label={`Update ${emp.name}`}
                                className="p-2 text-clay-700 hover:text-clay-900 hover:bg-clay-50/60 border border-stone-200/60 rounded-xl transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center bg-white shadow-2xs active:scale-95 cursor-pointer"
                                title="Update Data"
                                type="button"
                            >
                                <Pencil size={14} />
                            </button>
                            <button
                                onClick={() => onToggleSuspension?.(emp)}
                                disabled={isDisabled}
                                aria-label={suspendTooltip}
                                className={`p-2 rounded-xl border min-w-[36px] min-h-[36px] flex items-center justify-center transition-all duration-200 bg-white shadow-2xs active:scale-95 cursor-pointer ${
                                    isDisabled
                                        ? 'cursor-not-allowed border-stone-200 text-stone-300 shadow-none'
                                        : isSuspended
                                            ? 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 border-stone-200/60'
                                            : 'text-amber-600 hover:bg-amber-50 hover:text-amber-700 border-stone-200/60'
                                }`}
                                title={suspendTooltip}
                                type="button"
                            >
                                {isSuspended ? <UserCheck size={14} /> : <UserX size={14} />}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <tr className="group hover:bg-[#FCF7F2]/50 transition duration-150">
            <td className="px-6 py-4 text-left">
                <div className="flex items-center gap-3 min-w-0">
                    {emp.has_login_account ? (
                        <UserAvatar
                            user={{
                                ...emp.login_account,
                                name: emp.name,
                                role: 'staff',
                            }}
                            className="w-9 h-9 text-xs shadow-sm ring-1 ring-stone-900/5 cursor-pointer shrink-0"
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-bold border border-stone-200 text-xs shadow-sm shrink-0">
                            {emp.name.charAt(0)}
                        </div>
                    )}
                    <div className="flex flex-col items-start min-w-0">
                        <span className="font-bold text-gray-900 text-xs sm:text-sm truncate">{emp.name}</span>
                        <span className="text-[11px] text-stone-500 font-medium truncate">{emp.role}</span>
                    </div>
                </div>
            </td>
            <td className="px-5 py-4 text-right font-extrabold text-stone-900 text-sm">
                {formatPeso(emp.salary)}
            </td>
            <td className="px-5 py-4 text-center">
                <span className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${directoryStatus.className}`}>
                    {directoryStatus.label === 'Clocked In' ? (
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-clay-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-clay-500"></span>
                        </span>
                    ) : (
                        <span className={`w-1.5 h-1.5 rounded-full ${directoryStatus.dotClassName}`}></span>
                    )}
                    {directoryStatus.label}
                </span>
            </td>
            <td className="px-5 py-4 text-left">
                {emp.has_login_account ? (
                    <div className="flex flex-col items-start min-w-0">
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-extrabold tracking-wider text-stone-600 uppercase border border-stone-200/80 whitespace-nowrap">
                            {presetLabelByKey[emp.login_account?.role_preset_key] || 'Staff'}
                        </span>
                        <span className="text-[11px] text-stone-500 truncate max-w-[200px] mt-0.5 font-medium" title={emp.login_account?.email}>
                            {emp.login_account?.email}
                        </span>
                    </div>
                ) : (
                    <span className="text-[11px] font-medium text-stone-400 italic">No linked login</span>
                )}
            </td>
            <td className="px-5 py-4 text-center">
                {hasAttendanceData ? (
                    <button
                        type="button"
                        onClick={() => openAttendanceModal(emp)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200/80 bg-stone-50/70 px-3 py-1.5 text-xs font-bold text-stone-700 hover:border-clay-300 hover:bg-[#FCF7F2] transition shadow-2xs group/att whitespace-nowrap cursor-pointer"
                        title="View attendance dates calendar"
                    >
                        <CalendarDays size={13} className="text-clay-600 shrink-0 group-hover/att:scale-110 transition-transform" />
                        <span>{formatWorkedHoursCount(emp.attendance?.worked_minutes)} hrs ({emp.attendance?.days_worked || 0}d)</span>
                    </button>
                ) : (
                    <span className="text-xs text-stone-400 font-medium">0 hrs logged</span>
                )}
            </td>
            <td className="px-6 py-4 text-right align-middle">
                {canEditHrRecords ? (
                    <div className="flex items-center justify-end gap-1">
                        <Link
                            href={route('hr.employees.time-card', emp.id)}
                            className="p-2 text-sky-600 hover:text-sky-800 hover:bg-sky-50/60 border border-stone-200/60 rounded-xl transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center bg-white shadow-2xs"
                            title="Time-Card Audit Logs"
                        >
                            <Clock3 size={14} />
                        </Link>
                        <button
                            onClick={() => openEditModal(emp)}
                            aria-label={`Update ${emp.name}`}
                            className="p-2 text-clay-700 hover:text-clay-900 hover:bg-clay-50/60 border border-stone-200/60 rounded-xl transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center bg-white shadow-2xs cursor-pointer"
                            title="Update Data"
                            type="button"
                        >
                            <Pencil size={14} />
                        </button>
                        <button
                            onClick={() => onToggleSuspension?.(emp)}
                            disabled={isDisabled}
                            aria-label={suspendTooltip}
                            className={`p-2 rounded-xl border min-w-[36px] min-h-[36px] flex items-center justify-center transition-all duration-200 bg-white shadow-2xs cursor-pointer ${
                                isDisabled
                                    ? 'cursor-not-allowed border-stone-200 text-stone-300 shadow-none'
                                    : isSuspended
                                        ? 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 border-stone-200/60'
                                        : 'text-amber-600 hover:bg-amber-50 hover:text-amber-700 border-stone-200/60'
                            }`}
                            title={suspendTooltip}
                            type="button"
                        >
                            {isSuspended ? <UserCheck size={14} /> : <UserX size={14} />}
                        </button>
                    </div>
                ) : (
                    <span className="text-[11px] font-medium text-stone-400">View only</span>
                )}
            </td>
        </tr>
    );
}
