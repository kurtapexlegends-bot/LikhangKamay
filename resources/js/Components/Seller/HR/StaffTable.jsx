import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePage } from '@inertiajs/react';
import { Users, CalendarDays } from 'lucide-react';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import CompactPagination from '@/Components/CompactPagination';
import StaffFilterToolbar from '@/Components/Seller/HR/StaffFilterToolbar';
import StaffRowItem from '@/Components/Seller/HR/StaffRowItem';
import {
    formatWorkedHoursSummary,
    formatAttendanceTime,
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
    activeTab,
    setActiveTab,
    pendingPayrollCount,
    staff = [],
    searchTerm,
    setSearchTerm,
    canEditHrRecords,
    canManageStaffAccounts,
    canDeleteStaffAccounts,
    openEditModal,
    deleteEmployee,
    onToggleSuspension,
    openAttendanceModal,
    openAuditDrawer,
    presetLabelByKey,
    monthLabel,
    onAddClick
}) {
    const { auth } = usePage().props;
    const [statusFilter, setStatusFilter] = useState('all');
    const [entitlementFilter, setEntitlementFilter] = useState('all');
    const [startDateFilter, setStartDateFilter] = useState('');
    const [endDateFilter, setEndDateFilter] = useState('');

    const handleClearFilters = useCallback(() => {
        setSearchTerm('');
        setStatusFilter('all');
        setEntitlementFilter('all');
        setStartDateFilter('');
        setEndDateFilter('');
    }, [setSearchTerm]);

    const filteredStaff = useMemo(() => {
        if (!Array.isArray(staff) || staff.length === 0) return [];

        const searchLower = searchTerm ? searchTerm.trim().toLowerCase() : '';

        return staff.filter((emp) => {
            if (searchLower) {
                const matchesSearch =
                    (emp.name && emp.name.toLowerCase().includes(searchLower)) ||
                    (emp.role && emp.role.toLowerCase().includes(searchLower)) ||
                    (emp.employee_id && emp.employee_id.toLowerCase().includes(searchLower)) ||
                    (emp.login_account?.email && emp.login_account.email.toLowerCase().includes(searchLower)) ||
                    (emp.login_account?.role_preset_key && (presetLabelByKey[emp.login_account.role_preset_key] || '').toLowerCase().includes(searchLower));

                if (!matchesSearch) return false;
            }

            if (statusFilter !== 'all') {
                if (statusFilter === 'active' && !(emp.status?.toLowerCase() === 'active' || !emp.status)) return false;
                if (statusFilter === 'clocked_in' && !(emp.attendance?.current_state === 'clocked_in' || emp.attendance?.open_session)) return false;
                if (statusFilter === 'paused' && emp.attendance?.current_state !== 'paused') return false;
                if (statusFilter === 'clocked_out' && (emp.attendance?.current_state === 'clocked_in' || emp.attendance?.current_state === 'paused')) return false;
                if (statusFilter === 'suspended' && !(emp.login_account?.workspace_access_enabled === false || emp.status?.toLowerCase() === 'suspended')) return false;
                if (statusFilter === 'no_login' && emp.has_login_account) return false;
            }

            if (entitlementFilter !== 'all') {
                const perms = emp.login_account?.module_permissions || {};
                if (entitlementFilter === 'accounting' && !perms.accounting) return false;
                if (entitlementFilter === 'orders' && !perms.orders) return false;
                if (entitlementFilter === 'procurement' && !perms.procurement) return false;
                if (entitlementFilter === 'hr' && !perms.hr) return false;
                if (entitlementFilter === 'catalog' && !perms.catalog) return false;
            }

            const hireDateRaw = emp.join_date || emp.created_at;
            if (startDateFilter && hireDateRaw) {
                const empDate = hireDateRaw.substring(0, 10);
                if (empDate < startDateFilter) return false;
            }
            if (endDateFilter && hireDateRaw) {
                const empDate = hireDateRaw.substring(0, 10);
                if (empDate > endDateFilter) return false;
            }

            return true;
        });
    }, [staff, searchTerm, statusFilter, entitlementFilter, startDateFilter, endDateFilter, presetLabelByKey]);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, entitlementFilter, startDateFilter, endDateFilter]);

    const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
    const paginatedStaff = useMemo(() => {
        return filteredStaff.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    }, [filteredStaff, currentPage, itemsPerPage]);

    const hasActiveFilters = Boolean(
        searchTerm || 
        statusFilter !== 'all' || 
        entitlementFilter !== 'all' || 
        startDateFilter || 
        endDateFilter
    );

    const emptyStateProps = useMemo(() => {
        if (hasActiveFilters) {
            return {
                title: 'No staff match your filter',
                description: 'Try adjusting your search criteria or resetting filters to find what you are looking for.',
                actionLabel: 'Reset Filters',
                onAction: handleClearFilters,
            };
        }

        return {
            title: 'No employees added yet',
            description: canEditHrRecords 
                ? 'Get started by adding your first studio employee to manage attendance, shift hours, and payroll.' 
                : 'No employees are registered in the studio directory yet.',
            actionLabel: canEditHrRecords && onAddClick ? 'Add Employee' : undefined,
            onAction: canEditHrRecords && onAddClick ? onAddClick : undefined,
        };
    }, [hasActiveFilters, canEditHrRecords, onAddClick, handleClearFilters]);

    return (
        <div className="rounded-3xl border border-stone-200/80 bg-white shadow-sm flex flex-col min-h-[320px] relative">
            <StaffFilterToolbar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                staffCount={staff.length}
                pendingPayrollCount={pendingPayrollCount}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                entitlementFilter={entitlementFilter}
                setEntitlementFilter={setEntitlementFilter}
                startDateFilter={startDateFilter}
                setStartDateFilter={setStartDateFilter}
                endDateFilter={endDateFilter}
                setEndDateFilter={setEndDateFilter}
                canEditHrRecords={canEditHrRecords}
                onAddClick={onAddClick}
            />

            {/* Mobile View: Card List */}
            <div className="flex-1 md:hidden">
                {filteredStaff.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {paginatedStaff.map((emp) => (
                            <StaffRowItem
                                key={emp.id}
                                emp={emp}
                                auth={auth}
                                presetLabelByKey={presetLabelByKey}
                                canEditHrRecords={canEditHrRecords}
                                canManageStaffAccounts={canManageStaffAccounts}
                                openEditModal={openEditModal}
                                onToggleSuspension={onToggleSuspension}
                                openAttendanceModal={openAttendanceModal}
                                isMobile={true}
                            />
                        ))}
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
                            <th className="px-6 py-3.5 w-[22%] text-left">Employee</th>
                            <th className="px-5 py-3.5 w-[14%] text-right">Monthly Salary</th>
                            <th className="px-5 py-3.5 w-[14%] text-center">Status</th>
                            <th className="px-5 py-3.5 w-[22%] text-left">Login Access</th>
                            <th className="px-5 py-3.5 w-[16%] text-center">Attendance</th>
                            <th className="px-6 py-3.5 w-[12%] text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 bg-white">
                        {filteredStaff.length > 0 ? (
                            paginatedStaff.map((emp) => (
                                <StaffRowItem
                                    key={emp.id}
                                    emp={emp}
                                    auth={auth}
                                    presetLabelByKey={presetLabelByKey}
                                    canEditHrRecords={canEditHrRecords}
                                    canManageStaffAccounts={canManageStaffAccounts}
                                    openEditModal={openEditModal}
                                    onToggleSuspension={onToggleSuspension}
                                    openAttendanceModal={openAttendanceModal}
                                    isMobile={false}
                                />
                            ))
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

            {/* Pagination Component */}
            <CompactPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredStaff.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                itemLabel="employees"
            />
        </div>
    );
}
