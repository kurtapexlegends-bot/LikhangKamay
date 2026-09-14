import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, UserPlus } from 'lucide-react';
import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';

const statusLabels = {
    active: 'Active',
    clocked_in: 'Clocked In',
    paused: 'On Break',
    clocked_out: 'Clocked Out',
    suspended: 'Suspended',
    no_login: 'No Login',
};

const entitlementLabels = {
    accounting: 'Accounting',
    orders: 'Orders',
    procurement: 'Procurement',
    hr: 'People & Payroll',
    catalog: 'Catalog',
};

export default function StaffFilterToolbar({
    activeTab,
    setActiveTab,
    staffCount = 0,
    pendingPayrollCount = 0,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    entitlementFilter,
    setEntitlementFilter,
    startDateFilter,
    setStartDateFilter,
    endDateFilter,
    setEndDateFilter,
    canEditHrRecords,
    onAddClick,
}) {
    // Draft states for popover/drawer staging
    const [draftStatus, setDraftStatus] = useState(statusFilter);
    const [draftEntitlement, setDraftEntitlement] = useState(entitlementFilter);
    const [draftStartDate, setDraftStartDate] = useState(startDateFilter);
    const [draftEndDate, setDraftEndDate] = useState(endDateFilter);

    // Keep draft in sync with applied filters
    useEffect(() => {
        setDraftStatus(statusFilter);
    }, [statusFilter]);

    useEffect(() => {
        setDraftEntitlement(entitlementFilter);
    }, [entitlementFilter]);

    useEffect(() => {
        setDraftStartDate(startDateFilter);
    }, [startDateFilter]);

    useEffect(() => {
        setDraftEndDate(endDateFilter);
    }, [endDateFilter]);

    const activeFiltersCount =
        (statusFilter !== 'all' ? 1 : 0) +
        (entitlementFilter !== 'all' ? 1 : 0) +
        (startDateFilter ? 1 : 0) +
        (endDateFilter ? 1 : 0);

    const applyDraftFilters = () => {
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
        setStatusFilter('all');
        setEntitlementFilter('all');
        setStartDateFilter('');
        setEndDateFilter('');
    };

    const filterFieldsGrid = (
        <div className="space-y-3 text-left">
            {/* 1. Date Range Section */}
            <div>
                <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1 flex items-center gap-1.5">
                    <Calendar size={13} className="text-clay-600" />
                    <span>Hired / Active Date Range</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                    <div className="relative flex items-center rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 overflow-hidden focus-within:border-clay-500 focus-within:ring-1 focus-within:ring-clay-500/20">
                        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400 mr-1.5 shrink-0">From</span>
                        <input
                            type="date"
                            value={draftStartDate}
                            onChange={(e) => setDraftStartDate(e.target.value)}
                            className="min-w-0 flex-1 bg-transparent text-xs font-bold text-stone-700 border-none outline-none focus:ring-0 p-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                        />
                    </div>
                    <div className="relative flex items-center rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 overflow-hidden focus-within:border-clay-500 focus-within:ring-1 focus-within:ring-clay-500/20">
                        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400 mr-1.5 shrink-0">To</span>
                        <input
                            type="date"
                            value={draftEndDate}
                            onChange={(e) => setDraftEndDate(e.target.value)}
                            className="min-w-0 flex-1 bg-transparent text-xs font-bold text-stone-700 border-none outline-none focus:ring-0 p-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                        />
                    </div>
                </div>
            </div>

            {/* 2. Employment & Access Status */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1">
                    Employment & Access Status
                </label>
                <div className="relative">
                    <select
                        value={draftStatus}
                        onChange={(e) => setDraftStatus(e.target.value)}
                        className="pr-8 text-xs py-1.5 w-full min-h-[36px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer appearance-none px-3"
                    >
                        <option value="all">All Staff (Active & Suspended)</option>
                        <option value="active">Active Employees</option>
                        <option value="clocked_in">Currently Clocked In</option>
                        <option value="paused">Currently On Break / Paused</option>
                        <option value="clocked_out">Clocked Out / Off-Duty</option>
                        <option value="suspended">Suspended Workspace Access</option>
                        <option value="no_login">No Portal Login Account</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                </div>
            </div>

            {/* 3. Entitlement Permissions */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1">
                    Entitlement / Access Capabilities
                </label>
                <div className="relative">
                    <select
                        value={draftEntitlement}
                        onChange={(e) => setDraftEntitlement(e.target.value)}
                        className="pr-8 text-xs py-1.5 w-full min-h-[36px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer appearance-none px-3"
                    >
                        <option value="all">All Granted Entitlements</option>
                        <option value="accounting">Finance & Accounting Access</option>
                        <option value="orders">Orders & Fulfillment Access</option>
                        <option value="procurement">Procurement & Inventory Access</option>
                        <option value="hr">People & Payroll Access</option>
                        <option value="catalog">Catalog & Products Access</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                </div>
            </div>
        </div>
    );

    const activeFilterTags = [
        statusFilter !== 'all' && {
            label: `Status: ${statusLabels[statusFilter] || statusFilter}`,
            onRemove: () => setStatusFilter('all'),
        },
        entitlementFilter !== 'all' && {
            label: `Entitlement: ${entitlementLabels[entitlementFilter] || entitlementFilter}`,
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
        <FilterToolbarHeader
            tabs={[
                { key: 'directory', label: 'Directory', count: staffCount },
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
                <div className="flex items-center gap-2">
                    {canEditHrRecords && onAddClick && (
                        <button
                            type="button"
                            onClick={onAddClick}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-clay-600 px-3.5 h-[38px] min-h-[38px] text-xs font-bold text-white shadow-2xs transition hover:bg-clay-700 active:scale-95 shrink-0 cursor-pointer"
                        >
                            <UserPlus size={14} />
                            <span className="hidden sm:inline">Add Employee</span>
                            <span className="sm:hidden">Add</span>
                        </button>
                    )}
                </div>
            }
        />
    );
}
