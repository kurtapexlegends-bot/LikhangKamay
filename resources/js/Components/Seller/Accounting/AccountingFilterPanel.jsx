/* global route */
import React, { useState } from 'react';
import { ChevronDown, Calendar, Download, FileText } from 'lucide-react';
import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';
import ExportButton from '@/Components/ExportButton';
import DatePicker from '@/Components/DatePicker';

function resolveStatementPeriod(dateStr) {
    if (typeof dateStr === 'string') {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
        if (match) {
            const year = Number(match[1]);
            const month = Number(match[2]);
            const day = Number(match[3]);
            const utcDate = new Date(Date.UTC(year, month - 1, day));

            if (
                utcDate.getUTCFullYear() === year
                && (utcDate.getUTCMonth() + 1) === month
                && utcDate.getUTCDate() === day
            ) {
                return { year, month };
            }
        }
    }

    const now = new Date();
    return {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
    };
}

export default function AccountingFilterPanel({
    tabs = [],
    activeTab,
    onTabChange,
    searchTerm,
    setSearchTerm,
    isSearchLoading,
    entryTypeFilter,
    ledgerStatusFilter,
    startDateFilter,
    endDateFilter,
    paymentChannelFilter = 'all',
    applyFilters,
    resetFilters,
}) {
    // Staged draft state
    const [draftType, setDraftType] = useState(entryTypeFilter || 'all');
    const [draftLedgerStatus, setDraftLedgerStatus] = useState(ledgerStatusFilter || 'all');
    const [draftStartDate, setDraftStartDate] = useState(startDateFilter || '');
    const [draftEndDate, setDraftEndDate] = useState(endDateFilter || '');
    const [draftPaymentChannel, setDraftPaymentChannel] = useState(paymentChannelFilter || 'all');
    const [prevSyncedFilters, setPrevSyncedFilters] = useState({
        entryTypeFilter: entryTypeFilter || 'all',
        ledgerStatusFilter: ledgerStatusFilter || 'all',
        startDateFilter: startDateFilter || '',
        endDateFilter: endDateFilter || '',
        paymentChannelFilter: paymentChannelFilter || 'all',
    });

    const nextSyncedFilters = {
        entryTypeFilter: entryTypeFilter || 'all',
        ledgerStatusFilter: ledgerStatusFilter || 'all',
        startDateFilter: startDateFilter || '',
        endDateFilter: endDateFilter || '',
        paymentChannelFilter: paymentChannelFilter || 'all',
    };

    if (
        nextSyncedFilters.entryTypeFilter !== prevSyncedFilters.entryTypeFilter
        || nextSyncedFilters.ledgerStatusFilter !== prevSyncedFilters.ledgerStatusFilter
        || nextSyncedFilters.startDateFilter !== prevSyncedFilters.startDateFilter
        || nextSyncedFilters.endDateFilter !== prevSyncedFilters.endDateFilter
        || nextSyncedFilters.paymentChannelFilter !== prevSyncedFilters.paymentChannelFilter
    ) {
        setPrevSyncedFilters(nextSyncedFilters);
        setDraftType(nextSyncedFilters.entryTypeFilter);
        setDraftLedgerStatus(nextSyncedFilters.ledgerStatusFilter);
        setDraftStartDate(nextSyncedFilters.startDateFilter);
        setDraftEndDate(nextSyncedFilters.endDateFilter);
        setDraftPaymentChannel(nextSyncedFilters.paymentChannelFilter);
    }

    // Active & draft filter count calculation
    const activeFiltersCount =
        (entryTypeFilter && entryTypeFilter !== 'all' ? 1 : 0) +
        (ledgerStatusFilter && ledgerStatusFilter !== 'all' ? 1 : 0) +
        (paymentChannelFilter && paymentChannelFilter !== 'all' ? 1 : 0) +
        (startDateFilter ? 1 : 0) +
        (endDateFilter ? 1 : 0);

    const applyDraftFilters = () => {
        applyFilters({
            type: draftPaymentChannel !== 'all' ? 'sale' : draftType,
            ledger_status: draftLedgerStatus,
            payment_channel: draftPaymentChannel,
            start_date: draftStartDate,
            end_date: draftEndDate,
        });
    };

    const handleResetDraft = () => {
        setDraftType('all');
        setDraftLedgerStatus('all');
        setDraftPaymentChannel('all');
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
                    <DatePicker
                        prefix="From"
                        value={draftStartDate}
                        onChange={setDraftStartDate}
                        placeholder="Start Date"
                        maxDate={draftEndDate || undefined}
                    />
                    <DatePicker
                        prefix="To"
                        value={draftEndDate}
                        onChange={setDraftEndDate}
                        placeholder="End Date"
                        minDate={draftStartDate || undefined}
                        align="right"
                    />
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
                        onChange={(e) => {
                            const nextType = e.target.value;
                            setDraftType(nextType);
                            if (nextType !== 'all' && nextType !== 'sale') {
                                setDraftPaymentChannel('all');
                            }
                        }}
                        className="pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer appearance-none px-3"
                    >
                        <option value="all">All Transaction Types</option>
                        <option value="sale">Sales Revenue &amp; Settlements</option>
                        <option value="payout">GCash &amp; Maya Payouts</option>
                        <option value="payroll">Staff &amp; Payroll Runs</option>
                        <option value="stock_request">Material Supplies &amp; Restocks</option>
                        <option value="refund">Refund Deductions</option>
                        <option value="subscription">Subscription &amp; Commission Fees</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                </div>
            </div>

            {/* 3. Sales Payment Channel Filter */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                    Sales Channel
                </label>
                <div className="relative">
                    <select
                        value={draftPaymentChannel}
                        onChange={(e) => {
                            const next = e.target.value;
                            setDraftPaymentChannel(next);
                            if (next !== 'all') {
                                setDraftType('sale');
                            }
                        }}
                        className="pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer appearance-none px-3"
                    >
                        <option value="all">All Payment Channels</option>
                        <option value="online_all">Online Store (All)</option>
                        <option value="online_gcash">Online GCash</option>
                        <option value="online_maya">Online Maya</option>
                        <option value="online_cod">Cash on Delivery</option>
                        <option value="pos_all">Walk-In POS (All)</option>
                        <option value="pos_cash">POS Cash</option>
                        <option value="pos_gcash">POS GCash</option>
                        <option value="pos_maya">POS Maya</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                </div>
            </div>

            {/* 4. Ledger Status Filter */}
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
                        <option value="failed">Failed / Declined / Cancelled</option>
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
                    : 'Failed / Declined'
            }`,
            onRemove: () => applyFilters({ ledger_status: 'all' }),
        },
        paymentChannelFilter && paymentChannelFilter !== 'all' && {
            label: `Channel: ${
                {
                    online_all: 'Online Store',
                    online_gcash: 'Online GCash',
                    online_maya: 'Online Maya',
                    online_cod: 'Cash on Delivery',
                    pos_all: 'Walk-In POS',
                    pos_cash: 'POS Cash',
                    pos_gcash: 'POS GCash',
                    pos_maya: 'POS Maya',
                }[paymentChannelFilter] || paymentChannelFilter
            }`,
            onRemove: () => {
                setDraftPaymentChannel('all');
                applyFilters({ payment_channel: 'all' });
            },
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
            extraActions={(() => {
                const statementPeriod = resolveStatementPeriod(draftStartDate);
                return (
                <div className="flex items-center gap-2">
                    <a
                        href={route('accounting.settlement', {
                            year: statementPeriod.year,
                            month: statementPeriod.month,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 h-[38px] min-h-[38px] px-3.5 rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition font-bold text-xs shadow-2xs cursor-pointer"
                        title="View printable monthly settlement statement"
                    >
                        <FileText size={14} className="text-clay-600" />
                        <span className="hidden sm:inline">Monthly Statement</span>
                        <span className="sm:hidden">Statement</span>
                    </a>
                    <ExportButton
                        href={route('accounting.settlement.export', {
                            year: statementPeriod.year,
                            month: statementPeriod.month,
                        })}
                        icon={Download}
                        variant="secondary"
                        className="h-[38px] min-h-[38px] px-3.5 rounded-xl shadow-2xs font-bold text-xs"
                    >
                        <span className="hidden sm:inline">Export</span>
                        <span className="sm:hidden">CSV</span>
                    </ExportButton>
                </div>
                );
            })()}
        />
    );
}
