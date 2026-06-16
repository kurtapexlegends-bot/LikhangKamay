import React from 'react';
import { Search, X, Pencil, Trash2, CalendarDays, Users } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import {
    formatPeso,
    formatWorkedHoursSummary,
    formatAttendanceTime,
    getLoginAccessStatus,
    getAttendanceStatus,
    getEmployeeDirectoryStatus,
    summarizeModulePermissions,
    humanizePreset,
    formatAttendanceDateLabelSafe,
    formatWorkedHoursLabel
} from '@/utils/hrHelpers';

export function AttendanceSummaryCard({ attendance, attendanceStatus, monthLabel, onOpenCalendar }) {
    const canOpen = attendance?.has_attendance_source && (attendance?.calendar_days?.length || 0) > 0;

    return (
        <button
            type="button"
            onClick={canOpen ? onOpenCalendar : undefined}
            disabled={!canOpen}
            className={`w-full min-w-0 rounded-2xl border px-3 py-2.5 text-left transition sm:min-w-[190px] min-h-[44px] relative group/attendance ${
                canOpen
                    ? 'border-stone-200 bg-white hover:border-clay-200 hover:bg-[#FCF7F2]'
                    : 'border-stone-200 bg-white'
            } ${!canOpen ? 'cursor-default' : 'cursor-pointer'}`}
        >
            <div className="flex items-start justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${attendanceStatus.className}`}>
                    {attendanceStatus.label === 'Clocked In' ? (
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-clay-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-clay-500"></span>
                        </span>
                    ) : (
                        <span className={`h-1.5 w-1.5 rounded-full ${
                            attendanceStatus.label === 'Paused'
                                ? 'bg-amber-500'
                                : 'bg-stone-400'
                        }`}></span>
                    )}
                    {attendanceStatus.label}
                </span>

                {canOpen && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#E7D8C9] bg-[#FCF7F2] px-2 py-0.5 text-[10px] font-bold text-clay-700">
                        <CalendarDays size={11} />
                        View Dates
                    </span>
                )}
            </div>

            <div className="mt-2 space-y-1 text-[11px] leading-tight text-stone-600">
                <div>{attendanceStatus.note}</div>
                <div className="font-medium text-gray-700">
                    First today: {formatAttendanceTime(attendance?.today_first_clock_in)}
                </div>
                <div className="text-[10px] text-stone-500">
                    {(attendance?.month_label || monthLabel)}: {formatWorkedHoursSummary(attendance)}
                </div>
            </div>

            {/* Hover Peek Tooltip */}
            {canOpen && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-56 invisible group-hover/attendance:visible opacity-0 group-hover/attendance:opacity-100 transition-all duration-150 pointer-events-none bg-white border border-stone-200 rounded-xl p-3 shadow-lg text-stone-700 z-50">
                    <div className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-stone-400 border-b border-stone-100 pb-1.5 mb-2">
                        Recent Attendance
                    </div>
                    {(() => {
                        const recentDays = (attendance?.calendar_days || [])
                            .filter(d => d.has_hours)
                            .slice(-3)
                            .reverse();

                        if (recentDays.length === 0) {
                            return <p className="text-[10px] text-stone-400 italic">No recent logged hours</p>;
                        }

                        return (
                            <div className="space-y-2">
                                {recentDays.map((day, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-[11px]">
                                        <span className="font-semibold text-stone-600">
                                            {formatAttendanceDateLabelSafe(day.date)}
                                        </span>
                                        <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 text-[9px]">
                                            {day.worked_hours_label || formatWorkedHoursLabel(day.worked_minutes)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                    {/* Tiny tooltip arrow pointing down */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1.5 border-4 border-transparent border-t-white"></div>
                </div>
            )}
        </button>
    );
}

export default function StaffTable({
    staff = [],
    searchTerm,
    setSearchTerm,
    canEditHrRecords,
    canDeleteStaffAccounts,
    openEditModal,
    deleteEmployee,
    openAttendanceModal,
    presetLabelByKey,
    monthLabel,
    onAddClick
}) {
    const [statusFilter, setStatusFilter] = React.useState('all');

    const filteredStaff = staff.filter(emp => {
        const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              emp.role.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;
        
        if (statusFilter === 'all') return true;
        if (statusFilter === 'active') {
            return emp.status?.toLowerCase() === 'active' || !emp.status;
        }
        if (statusFilter === 'clocked_in') {
            return emp.attendance?.current_state === 'clocked_in' || emp.attendance?.open_session;
        }
        if (statusFilter === 'suspended') {
            return emp.login_account?.workspace_access_enabled === false || emp.status?.toLowerCase() === 'suspended';
        }
        if (statusFilter === 'no_login') {
            return !emp.has_login_account;
        }
        return true;
    });

    const handleClearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
    };

    const isSearching = searchTerm.trim().length > 0 || statusFilter !== 'all';

    const emptyStateProps = isSearching
        ? {
              title: "No matching staff found",
              description: "We couldn't find any employees matching your search or filters. Try adjusting them or clear the active query.",
              actionLabel: "Clear Filters",
              onAction: handleClearFilters,
          }
        : {
              title: "No employees found",
              description: canEditHrRecords
                  ? "Start by adding your first employee to start managing staff records and portal access."
                  : "Read-only people access can view records only. No employee entries are available yet.",
              actionLabel: canEditHrRecords ? "Add Employee" : null,
              onAction: canEditHrRecords ? onAddClick : undefined,
          };

    return (
        <div className="overflow-hidden rounded-[1.25rem] border border-stone-200 bg-white shadow-sm flex flex-col min-h-[400px]">
            {/* Table Header / Toolbar */}
            <div className="px-6 py-4 border-b border-stone-100 flex flex-col gap-4 bg-[#FDFBF9]">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
                    <h3 className="text-sm font-bold tracking-tight text-stone-900">Employee Directory</h3>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input 
                            type="text" 
                            placeholder="Search name or role..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-clay-500 focus:border-clay-500 transition-shadow shadow-sm min-h-[44px]"
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => { setSearchTerm(''); }} 
                                aria-label="Clear employee search" 
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                                title="Clear search"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>
                {/* Status Quick Filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-2 px-2">
                    {[
                        { key: 'all', label: 'All Staff' },
                        { key: 'active', label: 'Active' },
                        { key: 'clocked_in', label: 'Clocked In' },
                        { key: 'suspended', label: 'Suspended' },
                        { key: 'no_login', label: 'No Login' }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setStatusFilter(tab.key)}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition min-h-[32px] whitespace-nowrap ${
                                statusFilter === tab.key
                                    ? 'bg-clay-700 border-clay-700 text-white shadow-sm'
                                    : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Mobile View: Card List */}
            <div className="flex-1 md:hidden">
                {filteredStaff.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {filteredStaff.map((emp) => {
                            const loginAccessStatus = getLoginAccessStatus(emp.login_account);
                            const attendanceStatus = getAttendanceStatus(emp.attendance);
                            const directoryStatus = getEmployeeDirectoryStatus(emp, attendanceStatus);
                            const modulePermissionSummary = summarizeModulePermissions(emp.login_account?.module_permissions || {});

                            return (
                                <div key={emp.id} className="p-4 space-y-3">
                                    <div className="flex items-start gap-3">
                                        {emp.has_login_account ? (
                                            <UserAvatar
                                                user={{
                                                    ...emp.login_account,
                                                    name: emp.name,
                                                    role: 'staff',
                                                }}
                                                className="w-10 h-10 text-xs shadow-sm ring-1 ring-stone-900/5 cursor-pointer"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-bold border border-stone-200 text-xs shadow-sm">
                                                {emp.name.charAt(0)}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-gray-900">{emp.name}</p>
                                            <p className="text-xs text-stone-500 font-medium">{emp.role}</p>
                                            <p className="mt-1 text-xs font-semibold text-gray-800">{formatPeso(emp.salary)}</p>
                                        </div>
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${directoryStatus.className}`}>
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

                                    <div className="grid grid-cols-1 gap-2">
                                        <div className="rounded-xl border border-gray-100 bg-stone-50/70 px-3 py-2">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400">Login Access</p>
                                            {emp.has_login_account ? (
                                                <div className="mt-1 space-y-1">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase whitespace-nowrap ${loginAccessStatus.className}`}>
                                                            <span className={`h-1.5 w-1.5 rounded-full ${loginAccessStatus.dotClassName}`}></span>
                                                            {loginAccessStatus.label}
                                                        </span>
                                                        {emp.login_account?.role_preset_key && (
                                                            <span className="inline-flex items-center rounded-full border border-stone-200 bg-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-stone-600 whitespace-nowrap">
                                                                {presetLabelByKey[emp.login_account.role_preset_key] || 'Custom'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-stone-500 break-all">{emp.login_account?.email}</p>
                                                    {modulePermissionSummary.enabledCount > 0 && (
                                                        <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider pt-0.5">
                                                            {modulePermissionSummary.canEditCount} edit / {modulePermissionSummary.readOnlyCount} view
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="mt-1 text-[11px] text-stone-500">No seller portal login linked.</p>
                                            )}
                                        </div>

                                        <div className="rounded-xl border border-gray-100 bg-stone-50/70 px-3 py-2">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400">Attendance</p>
                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${attendanceStatus.className}`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${attendanceStatus.dotClassName}`}></span>
                                                    {attendanceStatus.label}
                                                </span>
                                                {emp.attendance?.summary && (
                                                    <span className="text-[11px] text-stone-500">{emp.attendance.summary}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
                                        <button
                                            disabled={!canEditHrRecords}
                                            onClick={() => openEditModal(emp)}
                                            aria-label={`Edit ${emp.name}`}
                                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[11px] font-bold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto min-h-[44px]"
                                        >
                                            <Pencil size={13} />
                                            Edit
                                        </button>
                                        <button
                                            disabled={!canEditHrRecords}
                                            onClick={() => deleteEmployee(emp.id)}
                                            aria-label={`Delete ${emp.name}`}
                                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-[11px] font-bold text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto min-h-[44px]"
                                        >
                                            <Trash2 size={13} />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-4">
                        <WorkspaceEmptyState
                            icon={Users}
                            title={emptyStateProps.title}
                            description={emptyStateProps.description}
                            actionLabel={emptyStateProps.actionLabel}
                            onAction={emptyStateProps.onAction}
                            compact
                        />
                    </div>
                )}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden flex-1 md:block">
                <table className="w-full table-fixed">
                    <thead className="bg-[#FDFBF9] text-[9px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-100">
                        <tr>
                            <th className="px-6 py-3.5 w-[20%] text-center">Employee</th>
                            <th className="px-5 py-3.5 w-[12%] text-center">Monthly Salary</th>
                            <th className="px-5 py-3.5 w-[12%] text-center">Status</th>
                            <th className="px-5 py-3.5 w-[20%] text-center">Login Access</th>
                            <th className="px-5 py-3.5 w-[22%] text-center">Attendance</th>
                            <th className="px-6 py-3.5 w-[14%] text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 bg-white">
                        {filteredStaff.length > 0 ? (
                            filteredStaff.map((emp) => {
                                const loginAccessStatus = getLoginAccessStatus(emp.login_account);
                                const attendanceStatus = getAttendanceStatus(emp.attendance);
                                const directoryStatus = getEmployeeDirectoryStatus(emp, attendanceStatus);
                                const modulePermissionSummary = summarizeModulePermissions(emp.login_account?.module_permissions || {});

                                return (
                                    <tr key={emp.id} className="group hover:bg-[#FCF7F2]/50 transition duration-150">
                                        <td className="px-5 py-3.5 text-center">
                                            <div className="flex items-center justify-center gap-3 min-w-0">
                                                {emp.has_login_account ? (
                                                    <UserAvatar
                                                        user={{
                                                            ...emp.login_account,
                                                            name: emp.name,
                                                            role: 'staff',
                                                        }}
                                                        className="w-9 h-9 text-xs shadow-sm ring-1 ring-stone-900/5 cursor-pointer"
                                                    />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-bold border border-stone-200 text-xs shadow-sm">
                                                        {emp.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div className="flex flex-col items-start min-w-0">
                                                    <span className="font-bold text-gray-900 text-sm truncate">{emp.name}</span>
                                                    <span className="text-xs text-stone-500 font-medium truncate">{emp.role}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-center font-bold text-gray-900 text-sm">{formatPeso(emp.salary)}</td>
                                        <td className="px-5 py-3.5 text-center">
                                            <span className={`inline-flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${directoryStatus.className}`}>
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
                                        <td className="px-5 py-3.5 text-center">
                                            {emp.has_login_account ? (
                                                <div className="flex flex-col items-center justify-center gap-1 w-full">
                                                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                                                        <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase whitespace-nowrap ${loginAccessStatus.className}`}>
                                                            <span className={`h-1.5 w-1.5 rounded-full ${loginAccessStatus.dotClassName}`}></span>
                                                            {loginAccessStatus.label}
                                                        </span>
                                                        <span className="rounded-full bg-stone-50 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-stone-500 uppercase border border-stone-200 whitespace-nowrap">
                                                            {presetLabelByKey[emp.login_account?.role_preset_key] || 'Custom'}
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] text-stone-500 truncate max-w-[180px]" title={emp.login_account?.email}>
                                                        {emp.login_account?.email}
                                                    </span>
                                                    {modulePermissionSummary.enabledCount > 0 && (
                                                        <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mt-0.5">
                                                            {modulePermissionSummary.canEditCount} edit / {modulePermissionSummary.readOnlyCount} view
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[11px] font-medium text-stone-400 italic">No linked login</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            <div className="flex justify-center">
                                                <AttendanceSummaryCard
                                                    attendance={emp.attendance}
                                                    attendanceStatus={attendanceStatus}
                                                    monthLabel={monthLabel}
                                                    onOpenCalendar={() => openAttendanceModal(emp)}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-center align-middle">
                                            {canEditHrRecords ? (
                                                <div className="flex justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    <button
                                                        onClick={() => openEditModal(emp)}
                                                        aria-label={`Update ${emp.name}`}
                                                        className="p-2 text-clay-600 hover:bg-clay-50/50 border border-transparent hover:border-clay-100/30 shadow-sm transition-all duration-200 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center"
                                                        title="Update Data"
                                                        type="button"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteEmployee(emp.id)}
                                                        disabled={emp.has_login_account && !canDeleteStaffAccounts}
                                                        aria-label={emp.has_login_account && !canDeleteStaffAccounts ? `Cannot remove ${emp.name}` : `Remove ${emp.name}`}
                                                        className={`p-2 rounded-xl border shadow-sm transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center ${
                                                            emp.has_login_account && !canDeleteStaffAccounts
                                                                ? 'cursor-not-allowed bg-stone-50 border-stone-200 text-stone-300 shadow-none'
                                                                : 'text-rose-600 hover:bg-rose-50 border-transparent hover:border-rose-100/30'
                                                        }`}
                                                        title={emp.has_login_account && !canDeleteStaffAccounts
                                                            ? 'Only the shop owner or a user with the proper staff account access level can remove employees with login access'
                                                            : 'Remove Employee'}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-[11px] font-medium text-stone-400">View only</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="6" className="px-6 py-20 text-center">
                                    <WorkspaceEmptyState
                                        icon={Users}
                                        title={emptyStateProps.title}
                                        description={emptyStateProps.description}
                                        actionLabel={emptyStateProps.actionLabel}
                                        onAction={emptyStateProps.onAction}
                                    />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
