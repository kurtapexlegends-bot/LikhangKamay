import React, { useState, useEffect, useRef } from 'react';
import { SlidersHorizontal, Filter, RotateCcw, X, ChevronDown, Calendar, Search } from 'lucide-react';
import SlideOverDrawer from '@/Components/SlideOverDrawer';

export default function AccountingFilterPanel({
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
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const popoverRef = useRef(null);

    // Staged draft state
    const [draftType, setDraftType] = useState(entryTypeFilter || 'all');
    const [draftLedgerStatus, setDraftLedgerStatus] = useState(ledgerStatusFilter || 'all');
    const [draftStartDate, setDraftStartDate] = useState(startDateFilter || '');
    const [draftEndDate, setDraftEndDate] = useState(endDateFilter || '');

    // Sync draft state with incoming props when popover or drawer opens
    const syncDraftState = () => {
        setDraftType(entryTypeFilter || 'all');
        setDraftLedgerStatus(ledgerStatusFilter || 'all');
        setDraftStartDate(startDateFilter || '');
        setDraftEndDate(endDateFilter || '');
    };

    const handleOpenFilters = () => {
        syncDraftState();
        if (window.innerWidth < 1024) {
            setIsDrawerOpen(true);
        } else {
            setIsPopoverOpen(!isPopoverOpen);
        }
    };

    // Close desktop popover on outside click
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

    // Active & draft filter count calculation
    const activeFiltersCount =
        (entryTypeFilter && entryTypeFilter !== 'all' ? 1 : 0) +
        (ledgerStatusFilter && ledgerStatusFilter !== 'all' ? 1 : 0) +
        (startDateFilter ? 1 : 0) +
        (endDateFilter ? 1 : 0);

    const draftActiveCount =
        (draftType !== 'all' ? 1 : 0) +
        (draftLedgerStatus !== 'all' ? 1 : 0) +
        (draftStartDate ? 1 : 0) +
        (draftEndDate ? 1 : 0);

    const applyDraftFilters = () => {
        setIsPopoverOpen(false);
        setIsDrawerOpen(false);
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
    };

    const filterFieldsGrid = (
        <div className="space-y-4 text-left">
            {/* 1. Date Range Section */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5 flex items-center gap-1.5">
                    <Calendar size={13} className="text-clay-600" />
                    <span>Statement Period (Date Range)</span>
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
                        <option value="sale">Sales Revenue & Settlements</option>
                        <option value="payout">Payout Release & Transfer</option>
                        <option value="payroll">People & Payroll Expenses</option>
                        <option value="stock_request">Inventory & Materials Procurement</option>
                        <option value="refund">Refund Deductions</option>
                        <option value="subscription">Subscription & Platform Fees</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                </div>
            </div>

            {/* 3. Ledger Status Filter */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                    Ledger & Approval Status
                </label>
                <div className="relative">
                    <select
                        value={draftLedgerStatus}
                        onChange={(e) => setDraftLedgerStatus(e.target.value)}
                        className="pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer appearance-none px-3"
                    >
                        <option value="all">All Statuses (Pending, Settled, Failed)</option>
                        <option value="completed">Completed / Settled / Paid</option>
                        <option value="pending">Pending Escrow / Approval</option>
                        <option value="failed">Failed / Rejected / Cancelled</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                </div>
            </div>
        </div>
    );

    return (
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm mb-6 relative">
            {/* Standardized Search & Filter Controls Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-[#FCFAF7]/40 rounded-t-2xl">
                {/* Search Input */}
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                    <input
                        id="accounting-search"
                        type="text"
                        placeholder="Search ledger entries, requester, or invoice..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-white border border-stone-200 rounded-xl text-xs hover:border-stone-300 focus:ring-4 focus:ring-clay-500/10 focus:border-clay-500 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] min-h-[38px]"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition active:scale-90"
                            title="Clear search"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>

                {/* Right Controls: Visible Badge + Filters Button */}
                <div className="flex items-center gap-2.5">
                    <span className="inline-flex items-center rounded-xl border border-stone-200 bg-white px-3 h-[38px] text-xs font-bold text-stone-600 shadow-sm shrink-0">
                        {visibleCount} visible
                    </span>

                    {/* Standardized Filter Button */}
                    <div className="relative inline-block text-left" ref={popoverRef}>
                        <button
                            type="button"
                            onClick={handleOpenFilters}
                            className={`inline-flex h-[38px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border px-3.5 text-xs font-bold transition-all shadow-sm active:scale-95 ${
                                activeFiltersCount > 0
                                    ? 'bg-clay-700 text-white border-clay-800 shadow-clay-200 hover:bg-clay-800'
                                    : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                            }`}
                        >
                            <SlidersHorizontal size={14} strokeWidth={2.2} />
                            <span>Filters</span>
                            {activeFiltersCount > 0 && (
                                <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-black text-white">
                                    {activeFiltersCount}
                                </span>
                            )}
                            <ChevronDown size={14} strokeWidth={2.5} className={`transition-transform duration-200 ${isPopoverOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Desktop Popover Card */}
                        {isPopoverOpen && (
                            <div className="hidden lg:block absolute right-0 z-[100] mt-2 w-[420px] rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
                                <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                                    <div className="flex items-center gap-2">
                                        <Filter size={15} className="text-clay-700" />
                                        <h3 className="text-sm font-bold text-stone-900">Filter Financial Ledger</h3>
                                    </div>
                                    {draftActiveCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleResetDraft}
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-500 hover:text-clay-700 transition"
                                        >
                                            <RotateCcw size={12} />
                                            <span>Reset Selection</span>
                                        </button>
                                    )}
                                </div>

                                {filterFieldsGrid}

                                <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setIsPopoverOpen(false)}
                                        className="rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={applyDraftFilters}
                                        className="rounded-xl bg-clay-700 px-5 py-2 text-xs font-bold text-white shadow-md shadow-clay-200 hover:bg-clay-800 transition active:scale-95"
                                    >
                                        Apply & Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Active Filter Tag Pills */}
            {activeFiltersCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 px-3.5 py-2.5 bg-stone-50/60 border-t border-stone-100 rounded-b-2xl">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mr-1">
                        Active Filters:
                    </span>
                    {entryTypeFilter && entryTypeFilter !== 'all' && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 shadow-sm">
                            <span>
                                Type:{' '}
                                {entryTypeFilter === 'sale'
                                    ? 'Sales Settlements'
                                    : entryTypeFilter === 'payout'
                                    ? 'Payout Release'
                                    : entryTypeFilter === 'payroll'
                                    ? 'Payroll Expenses'
                                    : entryTypeFilter === 'stock_request'
                                    ? 'Inventory'
                                    : entryTypeFilter === 'refund'
                                    ? 'Refund Deductions'
                                    : 'Subscription Fees'}
                            </span>
                            <button
                                type="button"
                                onClick={() => applyFilters({ type: 'all' })}
                                className="rounded-full p-0.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        </span>
                    )}
                    {ledgerStatusFilter && ledgerStatusFilter !== 'all' && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 shadow-sm">
                            <span>
                                Status:{' '}
                                {ledgerStatusFilter === 'completed'
                                    ? 'Settled / Paid'
                                    : ledgerStatusFilter === 'pending'
                                    ? 'Pending Escrow'
                                    : 'Failed / Rejected'}
                            </span>
                            <button
                                type="button"
                                onClick={() => applyFilters({ ledger_status: 'all' })}
                                className="rounded-full p-0.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        </span>
                    )}
                    {startDateFilter && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 shadow-sm">
                            <span>From: {startDateFilter}</span>
                            <button
                                type="button"
                                onClick={() => applyFilters({ start_date: '' })}
                                className="rounded-full p-0.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        </span>
                    )}
                    {endDateFilter && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 shadow-sm">
                            <span>To: {endDateFilter}</span>
                            <button
                                type="button"
                                onClick={() => applyFilters({ end_date: '' })}
                                className="rounded-full p-0.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={resetFilters}
                        className="text-[11px] font-bold text-clay-700 hover:underline ml-1"
                    >
                        Clear All
                    </button>
                </div>
            )}

            {/* Mobile Bottom-Sheet Filter Drawer */}
            <SlideOverDrawer
                show={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                title="Filter Ledger"
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
        </div>
    );
}
