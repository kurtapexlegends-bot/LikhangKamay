import React, { useState, useRef, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import { Search, X, Pencil, Trash2, CalendarDays, Users, SlidersHorizontal, Filter, RotateCcw, ChevronDown, Calendar, Clock3 } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import CompactPagination from '@/Components/CompactPagination';
import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';
import {
    formatPeso,
    formatWorkedHoursSummary,
    formatWorkedHoursCount,
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
    activeTab,
    setActiveTab,
    pendingPayrollCount,
    staff = [],
    searchTerm,
    setSearchTerm,
    canEditHrRecords,
    canDeleteStaffAccounts,
    openEditModal,
    deleteEmployee,
    openAttendanceModal,
    openAuditDrawer,
    presetLabelByKey,
    monthLabel,
    onAddClick
}) {
    const [statusFilter, setStatusFilter] = useState('all');
    const [entitlementFilter, setEntitlementFilter] = useState('all');
    const [startDateFilter, setStartDateFilter] = useState('');
    const [endDateFilter, setEndDateFilter] = useState('');

    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const popoverRef = useRef(null);

    // Staged draft state
    const [draftStatus, setDraftStatus] = useState(statusFilter);
    const [draftEntitlement, setDraftEntitlement] = useState(entitlementFilter);
    const [draftStartDate, setDraftStartDate] = useState(startDateFilter);
    const [draftEndDate, setDraftEndDate] = useState(endDateFilter);

    const syncDraftState = () => {
        setDraftStatus(statusFilter);
        setDraftEntitlement(entitlementFilter);
        setDraftStartDate(startDateFilter);
        setDraftEndDate(endDateFilter);
    };

    const handleOpenFilters = () => {
        syncDraftState();
        if (window.innerWidth < 1024) {
            setIsDrawerOpen(true);
        } else {
            setIsPopoverOpen(!isPopoverOpen);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setIsPopoverOpen(false);
            }
        };

        if (isPopoverOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isPopoverOpen]);

    const activeFiltersCount =
        (statusFilter !== 'all' ? 1 : 0) +
        (entitlementFilter !== 'all' ? 1 : 0) +
        (startDateFilter ? 1 : 0) +
        (endDateFilter ? 1 : 0);

    const draftActiveCount =
        (draftStatus !== 'all' ? 1 : 0) +
        (draftEntitlement !== 'all' ? 1 : 0) +
        (draftStartDate ? 1 : 0) +
        (draftEndDate ? 1 : 0);

    const applyDraftFilters = () => {
        setIsPopoverOpen(false);
        setIsDrawerOpen(false);
        setStatusFilter(draftStatus);
        setEntitlementFilter(draftEntitlement);
        setStartDateFilter(draftStartDate);
        setEndDateFilter(draftEndDate);
    };

    const handleResetDraft = () => {
        setDraftStatus('all');
        setDraftEntitlement('all');
        setDraftStartDate('');
        setDraftEndDate('');
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setEntitlementFilter('all');
        setStartDateFilter('');
        setEndDateFilter('');
    };

    const filteredStaff = staff.filter(emp => {
        const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              emp.role.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        if (statusFilter !== 'all') {
            if (statusFilter === 'active' && !(emp.status?.toLowerCase() === 'active' || !emp.status)) return false;
            if (statusFilter === 'clocked_in' && !(emp.attendance?.current_state === 'clocked_in' || emp.attendance?.open_session)) return false;
            if (statusFilter === 'suspended' && !(emp.login_account?.workspace_access_enabled === false || emp.status?.toLowerCase() === 'suspended')) return false;
            if (statusFilter === 'no_login' && emp.has_login_account) return false;
        }

        if (entitlementFilter !== 'all') {
            const perms = emp.login_account?.module_permissions || {};
            if (entitlementFilter === 'accounting' && !perms.accounting) return false;
            if (entitlementFilter === 'orders' && !perms.orders) return false;
            if (entitlementFilter === 'procurement' && !perms.procurement) return false;
        }

        if (startDateFilter && emp.created_at) {
            const empDate = emp.created_at.substring(0, 10);
            if (empDate < startDateFilter) return false;
        }
        if (endDateFilter && emp.created_at) {
            const empDate = emp.created_at.substring(0, 10);
            if (empDate > endDateFilter) return false;
        }

        return true;
    });

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, entitlementFilter, startDateFilter, endDateFilter]);

    const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
    const paginatedStaff = filteredStaff.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const filterFieldsGrid = (
        <div className="space-y-4 text-left">
            {/* 1. Date Range Section */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5 flex items-center gap-1.5">
                    <Calendar size={13} className="text-clay-600" />
                    <span>Hired / Active Date Range</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                    <div className="relative flex items-center rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 focus-within:border-clay-500 focus-within:ring-1 focus-within:ring-clay-500/20">
                        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400 mr-2 shrink-0">From</span>
                        <input
                            type="date"
                            value={draftStartDate}
                            onChange={(e) => setDraftStartDate(e.target.value)}
                            className="w-full bg-transparent text-xs font-bold text-stone-700 border-none outline-none focus:ring-0 p-0"
                        />
                    </div>
                    <div className="relative flex items-center rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 focus-within:border-clay-500 focus-within:ring-1 focus-within:ring-clay-500/20">
                        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400 mr-2 shrink-0">To</span>
                        <input
                            type="date"
                            value={draftEndDate}
                            onChange={(e) => setDraftEndDate(e.target.value)}
                            className="w-full bg-transparent text-xs font-bold text-stone-700 border-none outline-none focus:ring-0 p-0"
                        />
                    </div>
                </div>
            </div>

            {/* 2. Employment & Access Status */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                    Employment & Access Status
                </label>
                <div className="relative">
                    <select
                        value={draftStatus}
                        onChange={(e) => setDraftStatus(e.target.value)}
                        className="pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer appearance-none px-3"
                    >
                        <option value="all">All Staff (Active & Suspended)</option>
                        <option value="active">Active Employees</option>
                        <option value="clocked_in">Currently Clocked In</option>
                        <option value="suspended">Suspended Workspace Access</option>
                        <option value="no_login">No Portal Login Account</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                </div>
            </div>

            {/* 3. Entitlement Permissions */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                    Entitlement / Access Capabilities
                </label>
                <div className="relative">
                    <select
                        value={draftEntitlement}
                        onChange={(e) => setDraftEntitlement(e.target.value)}
                        className="pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer appearance-none px-3"
                    >
                        <option value="all">All Granted Entitlements</option>
                        <option value="accounting">Finance & Accounting Access</option>
                        <option value="orders">Orders & Fulfillment Access</option>
                        <option value="procurement">Procurement & Inventory Access</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                </div>
            </div>
        </div>
    );

    const activeFilterTags = [
        statusFilter !== 'all' && {
            label: `Status: ${statusFilter === 'active' ? 'Active' : statusFilter === 'clocked_in' ? 'Clocked In' : statusFilter === 'suspended' ? 'Suspended' : 'No Login'}`,
            onRemove: () => setStatusFilter('all'),
        },
        entitlementFilter !== 'all' && {
            label: `Entitlement: ${entitlementFilter === 'accounting' ? 'Accounting' : entitlementFilter === 'orders' ? 'Orders' : 'Procurement'}`,
            onRemove: () => setEntitlementFilter('all'),
        },
        startDateFilter && {
            label: `From: ${startDateFilter}`,
            onRemove: () => setStartDateFilter(''),
        },
        endDateFilter && {
            label: `To: ${endDateFilter}`,
            onRemove: () => setEndDateFilter(''),
        },
    ].filter(Boolean);

    return (
        <div className="rounded-3xl border border-stone-200/80 bg-white shadow-sm flex flex-col min-h-[400px] relative">
            <FilterToolbarHeader
                tabs={[
                    { key: 'directory', label: 'Directory', count: staff.length },
                    { key: 'payroll', label: 'Payroll History', count: pendingPayrollCount },
                    { key: 'access', label: 'Access History' },
                ]}
                activeTab={activeTab || 'directory'}
                onTabChange={setActiveTab}
                searchQuery={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Search name or role..."
                activeFiltersCount={activeFiltersCount}
                filterPopoverTitle="Filter Employees"
                filterPopoverFields={filterFieldsGrid}
                onApplyFilters={applyDraftFilters}
                onResetFilters={handleResetDraft}
                activeFilterTags={activeFilterTags}
                containerClassName="rounded-t-3xl border-x-0 border-t-0 border-b border-stone-200/80 shadow-none bg-stone-50/40"
                extraActions={
                    <span className="inline-flex items-center rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-600 shadow-2xs shrink-0 min-h-[38px] sm:min-h-0">
                        {filteredStaff.length} visible
                    </span>
                }
            />

            {/* Mobile Bottom-Sheet Filter Drawer */}
            <SlideOverDrawer
                show={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                title="Filter Staff"
                position="bottom"
                widthClass="max-w-md"
                footer={
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleResetDraft}
                            className="flex-1 rounded-xl border border-stone-200 bg-white py-2.5 text-xs font-bold text-stone-700 min-h-[44px]"
                        >
                            Reset All
                        </button>
                        <button
                            type="button"
                            onClick={applyDraftFilters}
                            className="flex-1 rounded-xl bg-clay-700 py-2.5 text-xs font-bold text-white shadow-lg shadow-clay-200 min-h-[44px]"
                        >
                            Apply Filters
                        </button>
                    </div>
                }
            >
                <div className="py-2">
                    {filterFieldsGrid}
                </div>
            </SlideOverDrawer>

            {/* Mobile View: Card List */}
            <div className="flex-1 md:hidden">
                {filteredStaff.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {paginatedStaff.map((emp) => {
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
                            paginatedStaff.map((emp) => {
                                const loginAccessStatus = getLoginAccessStatus(emp.login_account);
                                const attendanceStatus = getAttendanceStatus(emp.attendance);
                                const directoryStatus = getEmployeeDirectoryStatus(emp, attendanceStatus);
                                const hasAttendanceData = emp.attendance?.has_attendance_source && (emp.attendance?.calendar_days?.length || 0) > 0;

                                return (
                                    <tr key={emp.id} className="group hover:bg-[#FCF7F2]/50 transition duration-150">
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
                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200/80 bg-stone-50/70 px-3 py-1.5 text-xs font-bold text-stone-700 hover:border-clay-300 hover:bg-[#FCF7F2] transition shadow-2xs group/att whitespace-nowrap"
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
                                                        className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 border border-stone-200/60 rounded-xl transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center bg-white shadow-2xs"
                                                        title="Time-Card Audit Logs"
                                                    >
                                                        <Clock3 size={14} />
                                                    </Link>
                                                    <button
                                                        onClick={() => openEditModal(emp)}
                                                        aria-label={`Update ${emp.name}`}
                                                        className="p-2 text-clay-700 hover:text-clay-900 hover:bg-clay-50/60 border border-stone-200/60 rounded-xl transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center bg-white shadow-2xs"
                                                        title="Update Data"
                                                        type="button"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteEmployee(emp.id)}
                                                        disabled={emp.has_login_account && !canDeleteStaffAccounts}
                                                        aria-label={emp.has_login_account && !canDeleteStaffAccounts ? `Cannot remove ${emp.name}` : `Remove ${emp.name}`}
                                                        className={`p-2 rounded-xl border min-w-[36px] min-h-[36px] flex items-center justify-center transition-all duration-200 bg-white shadow-2xs ${
                                                            emp.has_login_account && !canDeleteStaffAccounts
                                                                ? 'cursor-not-allowed border-stone-200 text-stone-300 shadow-none'
                                                                : 'text-rose-600 hover:bg-rose-50 border-stone-200/60'
                                                        }`}
                                                        title={emp.has_login_account && !canDeleteStaffAccounts
                                                            ? 'Only shop owner or staff manager can remove accounts with portal login'
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
