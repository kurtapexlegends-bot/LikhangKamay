/* global route */
import React, { useState, useMemo } from 'react';
import { Head } from '@inertiajs/react';
import { 
    Wallet, 
    CheckCircle2, 
    Download, 
    TrendingUp
} from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import KPICard from '@/Components/KPICard';
import ExportButton from '@/Components/ExportButton';
import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';

import PayoutBalancesTable, { formatCurrency } from '@/Components/Admin/Payouts/PayoutBalancesTable';
import DisburseFundsModal from '@/Components/Admin/Payouts/DisburseFundsModal';
import PayoutHistoryTable from '@/Components/Admin/Payouts/PayoutHistoryTable';
import ArtisanStatementModal from '@/Components/Admin/Payouts/ArtisanStatementModal';

export default function PayoutManager({ artisans = [], payoutHistory = { data: [] }, metrics = {} }) {
    const [activeTab, setActiveTab] = useState('balances');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'ready', 'settled', 'needs_setup'
    const [disbursingArtisan, setDisbursingArtisan] = useState(null);
    const [viewingStatementArtisan, setViewingStatementArtisan] = useState(null);
    const [copiedKey, setCopiedKey] = useState(null);

    const handleCopy = (text, key) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    // Filter artisans for balances tab
    const filteredArtisans = useMemo(() => {
        return artisans.filter(artisan => {
            const matchesSearch = 
                artisan.shop_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                artisan.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                artisan.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                artisan.payout_account_number?.toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesStatus = 
                statusFilter === 'all' ||
                (statusFilter === 'ready' && artisan.balance > 0) ||
                (statusFilter === 'settled' && artisan.balance <= 0) ||
                (statusFilter === 'needs_setup' && !artisan.has_payout_account);

            return matchesSearch && matchesStatus;
        });
    }, [artisans, searchQuery, statusFilter]);

    // Filter history for history tab
    const filteredHistory = useMemo(() => {
        if (!searchQuery) return payoutHistory.data || [];
        return (payoutHistory.data || []).filter(payout => {
            return (
                payout.shop_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                payout.artisan_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                payout.payout_account_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                payout.reference_number?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        });
    }, [payoutHistory.data, searchQuery]);

    const readyCount = useMemo(() => artisans.filter(a => a.balance > 0).length, [artisans]);
    const totalHistoryCount = payoutHistory.total || payoutHistory.data?.length || 0;

    return (
        <>
            <Head title="Seller Payouts" />

            <div className="space-y-6 pb-28">
                {/* KPI STAT CARDS */}
                <div className="flex overflow-x-auto gap-4 sm:gap-5 pb-2.5 flex-nowrap snap-x snap-mandatory sm:grid sm:grid-cols-3 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto">
                        <KPICard
                            title="Ready for Payout"
                            value={Number(metrics.total_owed || 0)}
                            icon={Wallet}
                            bg="bg-amber-50"
                            color="text-amber-600"
                            formatter={(v) => formatCurrency(v)}
                            subtitle={`${metrics.artisans_owed_count || 0} shop(s) awaiting transfer`}
                        />
                    </div>

                    <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto">
                        <KPICard
                            title="Total Transferred"
                            value={Number(metrics.total_settled || 0)}
                            icon={CheckCircle2}
                            bg="bg-emerald-50"
                            color="text-emerald-600"
                            formatter={(v) => formatCurrency(v)}
                            subtitle="All-time processed payouts"
                        />
                    </div>

                    <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto">
                        <KPICard
                            title="Platform Commission"
                            value={Number(metrics.total_platform_fees_collected || 0)}
                            icon={TrendingUp}
                            bg="bg-clay-50"
                            color="text-clay-600"
                            formatter={(v) => formatCurrency(v)}
                            subtitle="All-time retained earnings"
                        />
                    </div>
                </div>

                {/* Standardized FilterToolbarHeader */}
                <FilterToolbarHeader
                    tabs={[
                        { key: 'balances', label: 'Ready for Payout', count: readyCount },
                        { key: 'history', label: 'Payout History', count: totalHistoryCount },
                    ]}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder={activeTab === 'balances' ? 'Search shop, artisan, or account...' : 'Search reference, artisan, or account...'}
                    activeFiltersCount={activeTab === 'balances' && statusFilter !== 'all' ? 1 : 0}
                    filterPopoverTitle="Filter Settlements"
                    filterPopoverFields={
                        activeTab === 'balances' ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                                        Settlement Status
                                    </label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="w-full text-xs py-2.5 px-3 bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer"
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="ready">Ready for Payout (&gt; ₱0.00)</option>
                                        <option value="settled">Settled (₱0.00)</option>
                                        <option value="needs_setup">Needs Setup (No Account Linked)</option>
                                    </select>
                                </div>
                            </div>
                        ) : null
                    }
                    extraActions={
                        <ExportButton
                            href={route('admin.payouts.export')}
                            icon={Download}
                            variant="secondary"
                            className="h-[38px] min-h-[38px] px-3.5 rounded-xl shadow-2xs font-bold text-xs"
                        >
                            <span className="hidden sm:inline">Export CSV</span>
                            <span className="sm:hidden">Export</span>
                        </ExportButton>
                    }
                    onResetFilters={() => setStatusFilter('all')}
                    activeFilterTags={
                        activeTab === 'balances' && statusFilter !== 'all' ? [
                            {
                                label: `Status: ${statusFilter === 'ready' ? 'Ready for Payout' : statusFilter === 'settled' ? 'Settled' : 'Needs Setup'}`,
                                onRemove: () => setStatusFilter('all'),
                            }
                        ] : []
                    }
                />

                {/* MAIN TABLE CONTAINER */}
                <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-2xs">
                    {activeTab === 'balances' ? (
                        <PayoutBalancesTable
                            artisans={filteredArtisans}
                            searchQuery={searchQuery}
                            statusFilter={statusFilter}
                            onDisburse={setDisbursingArtisan}
                            onViewStatement={setViewingStatementArtisan}
                            copiedKey={copiedKey}
                            handleCopy={handleCopy}
                        />
                    ) : (
                        <PayoutHistoryTable
                            history={filteredHistory}
                            pagination={payoutHistory}
                            searchQuery={searchQuery}
                            copiedKey={copiedKey}
                            handleCopy={handleCopy}
                        />
                    )}
                </div>
            </div>

            {/* DISBURSE PAYOUT MODAL */}
            <DisburseFundsModal
                artisan={disbursingArtisan}
                onClose={() => setDisbursingArtisan(null)}
                handleCopy={handleCopy}
                copiedKey={copiedKey}
            />

            {/* ORDERS STATEMENT BREAKDOWN MODAL */}
            <ArtisanStatementModal
                artisan={viewingStatementArtisan}
                onClose={() => setViewingStatementArtisan(null)}
                onDisburse={(artisan) => {
                    setViewingStatementArtisan(null);
                    setDisbursingArtisan(artisan);
                }}
            />
        </>
    );
}

PayoutManager.layout = (page) => <AdminLayout title="Payouts">{page}</AdminLayout>;
