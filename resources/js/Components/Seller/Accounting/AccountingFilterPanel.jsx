import React, { useState, useEffect } from 'react';
import { Filter, RotateCcw, X, ChevronDown, Calendar, Search } from 'lucide-react';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';

export default function AccountingFilterPanel({
    tabs = [],
    activeTab,
    onTabChange,
    searchTerm,
    setSearchTerm,
    isSearchLoading,
    entryTypeFilter,
    setEntryTypeFilter,
    ledgerStatusFilter,
    setLedgerStatusFilter,
    startDateFilter,
    setStartDateFilter,
    endDateFilter,
    setEndDateFilter,
    applyFilters,
    resetFilters,
    visibleCount = 0,
}) {
    // Staged draft state
    const [draftType, setDraftType] = useState(entryTypeFilter || 'all');
    const [draftLedgerStatus, setDraftLedgerStatus] = useState(ledgerStatusFilter || 'all');
    const [draftStartDate, setDraftStartDate] = useState(startDateFilter || '');
    const [draftEndDate, setDraftEndDate] = useState(endDateFilter || '');

    // Active & draft filter count calculation
    const activeFiltersCount =
        (entryTypeFilter && entryTypeFilter !== 'all' ? 1 : 0) +
        (ledgerStatusFilter && ledgerStatusFilter !== 'all' ? 1 : 0) +
        (startDateFilter ? 1 : 0) +
        (endDateFilter ? 1 : 0);

    const applyDraftFilters = () => {
        applyFilters({
            type: draftType,
            ledger_status: draftLedgerStatus,
            start_date: draftStartDate,
            end_date: draftEndDate,
        });
    };

    const handleResetDraft = () => {
        setDraftType('all');
        setDraftLedgerStatus('all');
        setDraftStartDate('');
        setDraftEndDate('');
        resetFilters();
    };

    const filterFieldsGrid = (
        <div className="space-y-4 text-left">
            {/* 1. Date Range Section */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5 flex items-center gap-1.5">
                    <Calendar size={13} className="text-clay-600" />
                    <span>Statement Period (Date Range)</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                    <div className="relative flex items-center rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 overflow-hidden focus-within:border-clay-500 focus-within:ring-1 focus-within:ring-clay-500/20">
                        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400 mr-2 shrink-0">From</span>
                        <input
                            type="date"
                            value={draftStartDate}
                            onChange={(e) => setDraftStartDate(e.target.value)}
                            className="min-w-0 flex-1 bg-transparent text-xs font-bold text-stone-700 border-none outline-none focus:ring-0 p-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                        />
                    </div>
                    <div className="relative flex items-center rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 overflow-hidden focus-within:border-clay-500 focus-within:ring-1 focus-within:ring-clay-500/20">
                        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400 mr-2 shrink-0">To</span>
                        <input
                            type="date"
                            value={draftEndDate}
                            onChange={(e) => setDraftEndDate(e.target.value)}
                            className="min-w-0 flex-1 bg-transparent text-xs font-bold text-stone-700 border-none outline-none focus:ring-0 p-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                        />
                    </div>
                </div>
            </div>

            {/* 2. Transaction Type Filter */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                    Transaction / Entry Type
                </label>
                <div className="relative">
                    <select
                        value={draftType}
                        onChange={(e) => setDraftType(e.target.value)}
                        className="pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer appearance-none px-3"
                    >
                        <option value="all">All Transaction Types</option>
                        <option value="sale">Sales Revenue &amp; Settlements</option>
                        <option value="payout">GCash, Maya &amp; Bank Payouts</option>
                        <option value="payroll">Staff &amp; Payroll Runs</option>
                        <option value="stock_request">Material Supplies &amp; Restocks</option>
                        <option value="refund">Refund Deductions</option>
                        <option value="subscription">Subscription &amp; Platform Fees</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                </div>
            </div>

            {/* 3. Ledger Status Filter */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                    Ledger &amp; Approval Status
                </label>
                <div className="relative">
                    <select
                        value={draftLedgerStatus}
                        onChange={(e) => setDraftLedgerStatus(e.target.value)}
                        className="pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer appearance-none px-3"
                    >
                        <option value="all">All Statuses (Pending, Settled, Failed)</option>
                        <option value="completed">Completed / Settled / Paid</option>
                        <option value="pending">Pending Review / Orders in Progress</option>
                        <option value="failed">Failed / Rejected / Cancelled</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                </div>
            </div>
        </div>
    );

    const activeFilterTags = [
        entryTypeFilter && entryTypeFilter !== 'all' && {
            label: `Type: ${
                entryTypeFilter === 'sale'
                    ? 'Sales Settlements'
                    : entryTypeFilter === 'payout'
                    ? 'Payout Release'
                    : entryTypeFilter === 'payroll'
                    ? 'Payroll Expenses'
                    : entryTypeFilter === 'stock_request'
                    ? 'Inventory'
                    : entryTypeFilter === 'refund'
                    ? 'Refund Deductions'
                    : 'Subscription Fees'
            }`,
            onRemove: () => applyFilters({ type: 'all' }),
        },
        ledgerStatusFilter && ledgerStatusFilter !== 'all' && {
            label: `Status: ${
                ledgerStatusFilter === 'completed'
                    ? 'Settled / Paid'
                    : ledgerStatusFilter === 'pending'
                    ? 'Pending Escrow'
                    : 'Failed / Rejected'
            }`,
            onRemove: () => applyFilters({ ledger_status: 'all' }),
        },
        startDateFilter && {
            label: `From: ${startDateFilter}`,
            onRemove: () => applyFilters({ start_date: '' }),
        },
        endDateFilter && {
            label: `To: ${endDateFilter}`,
            onRemove: () => applyFilters({ end_date: '' }),
        },
    ].filter(Boolean);

    return (
        <FilterToolbarHeader
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={onTabChange}
            searchQuery={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search ledger entries, requester, or invoice..."
            isSearching={isSearchLoading}
            activeFiltersCount={activeFiltersCount}
            filterPopoverTitle="Filter Financial Ledger"
            filterPopoverFields={filterFieldsGrid}
            onApplyFilters={applyDraftFilters}
            onResetFilters={handleResetDraft}
            activeFilterTags={activeFilterTags}
            containerClassName="mb-6"
            extraActions={
                <span className="inline-flex items-center rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-600 shadow-2xs shrink-0 min-h-[38px] sm:min-h-0">
                    {visibleCount} visible
                </span>
            }
        />
    );
}
