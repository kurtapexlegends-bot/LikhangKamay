import React, { useState, useMemo } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { 
    Wallet, 
    History, 
    Calendar, 
    ArrowUpRight, 
    Search, 
    CheckCircle2, 
    Loader2, 
    Store, 
    Copy, 
    Check, 
    ExternalLink, 
    Download, 
    CreditCard,
    X,
    FileText,
    AlertCircle,
    Info
} from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import CompactPagination from '@/Components/CompactPagination';
import UserAvatar from '@/Components/UserAvatar';
import KPICard from '@/Components/KPICard';
import FloatingModuleActions from '@/Components/FloatingModuleActions';
import ExportButton from '@/Components/ExportButton';
import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';

export default function PayoutManager({ artisans = [], payoutHistory = { data: [] }, metrics = {} }) {
    const [activeTab, setActiveTab] = useState('balances');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'ready', 'settled', 'needs_setup'
    const [disbursingArtisan, setDisbursingArtisan] = useState(null);
    const [viewingStatementArtisan, setViewingStatementArtisan] = useState(null);
    const [copiedKey, setCopiedKey] = useState(null);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2,
        }).format(amount || 0);
    };

    const formatDisplayAccount = (method, number) => {
        if (!number) return '—';
        const clean = String(number).replace(/\D/g, '');
        const isEWallet = (method || '').toLowerCase().includes('gcash') || (method || '').toLowerCase().includes('maya');
        if (isEWallet && clean.length === 11 && clean.startsWith('09')) {
            return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7, 11)}`;
        }
        return number;
    };

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
        <AdminLayout title="Payouts">
            <Head title="Seller Payouts" />

            <div className="space-y-6 pb-28">
                
                {/* Floating Module Actions */}
                <FloatingModuleActions
                    actions={
                        <ExportButton href={route('admin.payouts.export')} icon={Download} variant="secondary">
                            Export CSV
                        </ExportButton>
                    }
                />

                {/* KPI STAT CARDS - Preserved to match system */}
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
                            title="Total Sent to Sellers"
                            value={Number(metrics.total_paid || 0)}
                            icon={CheckCircle2}
                            bg="bg-emerald-50"
                            color="text-emerald-600"
                            formatter={(v) => formatCurrency(v)}
                            subtitle="Completed platform transfers"
                        />
                    </div>

                    <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto">
                        <KPICard
                            title="Approved Sellers"
                            value={metrics.total_artisans_count || artisans.length}
                            icon={Store}
                            bg="bg-clay-50"
                            color="text-clay-600"
                            subtitle={`${(metrics.total_artisans_count || artisans.length) - (metrics.artisans_owed_count || 0)} fully settled`}
                        />
                    </div>
                </div>

                {/* Weekly Payout Schedule Banner - Clean LikhangKamay card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-clay-50 border border-clay-100 flex items-center justify-center text-clay-700 shrink-0">
                            <Info size={16} />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-stone-900">Weekly Payout Rhythm</h4>
                            <p className="text-[11px] text-stone-500 font-medium mt-0.5">Disbursements are processed weekly for completed customer orders. Direct transfers are sent to artisans via GCash, Maya, or bank transfer.</p>
                        </div>
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
                        filteredArtisans.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-16 text-center">
                                <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 mb-3 shadow-sm">
                                    <Store size={22} />
                                </div>
                                <h3 className="text-sm font-bold text-stone-900">No artisans found</h3>
                                <p className="text-xs font-medium text-stone-500 mt-1 max-w-sm">
                                    {searchQuery || statusFilter !== 'all'
                                        ? "No artisan shops match your current search or filter criteria."
                                        : "There are no approved artisan shops registered in the system."}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[960px]">
                                    <thead>
                                        <tr className="bg-[#FDFBF9] border-b border-stone-200/80 text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
                                            <th className="py-3 px-5">Shop &amp; Artisan</th>
                                            <th className="py-3 px-5">Payout Destination</th>
                                            <th className="py-3 px-5 text-right">Completed Sales</th>
                                            <th className="py-3 px-5 text-right">Platform Fee</th>
                                            <th className="py-3 px-5 text-right">Total Paid Out</th>
                                            <th className="py-3 px-5 text-right">Ready for Payout</th>
                                            <th className="py-3 px-5 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100 text-xs">
                                        {filteredArtisans.map((artisan) => {
                                            const isOwed = artisan.balance > 0;
                                            const copyKey = `artisan-${artisan.id}`;
                                            const isCopied = copiedKey === copyKey;
                                            const hasAccount = Boolean(artisan.payout_account_number);

                                            return (
                                                <tr key={artisan.id} className="hover:bg-stone-50/50 transition-colors">
                                                    
                                                    {/* Shop & Artisan */}
                                                    <td className="py-3.5 px-5">
                                                        <div className="flex items-center gap-3">
                                                            <UserAvatar user={artisan} className="h-8 w-8 shrink-0 border border-stone-200/70" />
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <p className="font-bold text-stone-900 text-xs truncate">
                                                                        {artisan.shop_name}
                                                                    </p>
                                                                    {artisan.shop_slug && (
                                                                        <a
                                                                            href={route('shop.seller', artisan.shop_slug)}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-stone-400 hover:text-stone-600 transition"
                                                                            title="View Storefront"
                                                                        >
                                                                            <ExternalLink size={11} />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                                <p className="text-[10px] text-stone-500 font-medium truncate mt-0.5">
                                                                    {artisan.name !== artisan.shop_name ? `${artisan.name} • ` : ''}{artisan.email}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Payout Account */}
                                                    <td className="py-3.5 px-5">
                                                        {hasAccount ? (
                                                            <div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase border ${
                                                                        (artisan.payout_method || '').toLowerCase().includes('gcash')
                                                                            ? 'bg-sky-50 text-sky-700 border-sky-200/70'
                                                                            : (artisan.payout_method || '').toLowerCase().includes('maya')
                                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                                                                            : 'bg-stone-100 text-stone-700 border-stone-200'
                                                                    }`}>
                                                                        {artisan.payout_method || 'GCash'}
                                                                    </span>
                                                                    <span className="font-bold text-stone-800 text-xs truncate max-w-[140px]">
                                                                        {artisan.payout_account_name || '—'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    <span className="font-mono text-[10px] font-semibold text-stone-500 tracking-wider">
                                                                        {formatDisplayAccount(artisan.payout_method, artisan.payout_account_number)}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleCopy(artisan.payout_account_number, copyKey)}
                                                                        className="p-0.5 rounded text-stone-400 hover:text-stone-700 transition cursor-pointer"
                                                                        title="Copy account number"
                                                                    >
                                                                        {isCopied ? (
                                                                            <Check size={11} className="text-emerald-600" />
                                                                        ) : (
                                                                            <Copy size={11} />
                                                                        )}
                                                                    </button>
                                                                    {isCopied && (
                                                                        <span className="text-[9px] font-bold text-emerald-600">Copied</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                                                                    <AlertCircle size={10} />
                                                                    Needs Setup
                                                                </span>
                                                                <span className="text-stone-400 text-[11px] italic">
                                                                    No account linked
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Completed Sales (Gross) */}
                                                    <td className="py-3.5 px-5 text-right font-semibold text-stone-900">
                                                        {formatCurrency(artisan.gross_sales ?? artisan.revenue)}
                                                    </td>

                                                    {/* Platform Fee */}
                                                    <td className="py-3.5 px-5 text-right font-medium text-stone-400">
                                                        {(artisan.platform_fees ?? 0) > 0 ? `- ${formatCurrency(artisan.platform_fees)}` : '₱0.00'}
                                                    </td>

                                                    {/* Paid Out */}
                                                    <td className="py-3.5 px-5 text-right font-medium text-stone-400">
                                                        {formatCurrency(artisan.payouts)}
                                                    </td>

                                                    {/* Net Ready for Payout */}
                                                    <td className="py-3.5 px-5 text-right">
                                                        <span className={`font-black text-xs ${isOwed ? 'text-amber-700' : 'text-stone-400'}`}>
                                                            {formatCurrency(artisan.balance)}
                                                        </span>
                                                    </td>

                                                    {/* Action */}
                                                    <td className="py-3.5 px-5 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {isOwed ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDisbursingArtisan(artisan)}
                                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-clay-700 hover:bg-clay-800 text-white px-3 py-1.5 text-xs font-bold transition shadow-xs active:scale-95 cursor-pointer"
                                                                >
                                                                    <ArrowUpRight size={12} />
                                                                    <span>Log Payout</span>
                                                                </button>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-lg mr-1">
                                                                    <Check size={12} />
                                                                    Settled
                                                                </span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => setViewingStatementArtisan(artisan)}
                                                                title="View completed orders statement"
                                                                className="p-1.5 rounded-xl border border-stone-200/80 bg-white text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition cursor-pointer shadow-2xs"
                                                            >
                                                                <FileText size={13} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )
                    ) : (
                        filteredHistory.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-16 text-center">
                                <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 mb-3 shadow-sm">
                                    <History size={22} />
                                </div>
                                <h3 className="text-sm font-bold text-stone-900">No payout history</h3>
                                <p className="text-xs font-medium text-stone-500 mt-1 max-w-sm">
                                    {searchQuery
                                        ? "No completed disbursements match your search query."
                                        : "There are no logged payout disbursements in the system ledger yet."}
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[960px]">
                                        <thead>
                                            <tr className="bg-stone-50 border-b border-stone-200 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                                                <th className="py-3.5 px-5">Disbursement Date</th>
                                                <th className="py-3.5 px-5">Artisan Shop</th>
                                                <th className="py-3.5 px-5">Payout Destination</th>
                                                <th className="py-3.5 px-5">Reference / Txn ID</th>
                                                <th className="py-3.5 px-5 text-right">Amount Paid</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-100 text-xs">
                                            {filteredHistory.map((payout) => {
                                                const refCopyKey = `ref-${payout.id}`;
                                                const isRefCopied = copiedKey === refCopyKey;

                                                return (
                                                    <tr key={payout.id} className="hover:bg-stone-50/40 transition-colors">
                                                        
                                                        {/* Date */}
                                                        <td className="py-4 px-5 font-medium text-stone-600">
                                                            <div className="flex items-center gap-1.5">
                                                                <Calendar size={14} className="text-stone-400 shrink-0" />
                                                                <span>{payout.created_at}</span>
                                                            </div>
                                                        </td>

                                                        {/* Artisan Shop */}
                                                        <td className="py-4 px-5">
                                                            <div className="flex items-center gap-3">
                                                                <UserAvatar user={payout.user} className="h-8 w-8 shrink-0" />
                                                                <div className="min-w-0">
                                                                    <p className="font-bold text-stone-900 text-xs truncate">
                                                                        {payout.shop_name}
                                                                    </p>
                                                                    <p className="text-[10px] text-stone-500 font-medium truncate mt-0.5">
                                                                        Owner: {payout.artisan_name}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Payout Destination */}
                                                        <td className="py-4 px-5">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="inline-flex px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-stone-100 text-stone-700 border border-stone-200">
                                                                    {payout.payout_method || 'GCash'}
                                                                </span>
                                                                <span className="font-bold text-stone-850 text-xs truncate max-w-[140px]">
                                                                    {payout.payout_account_name}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] font-mono font-semibold text-stone-500 tracking-wider mt-0.5">
                                                                {formatDisplayAccount(payout.payout_method, payout.payout_account_number)}
                                                            </p>
                                                        </td>

                                                        {/* Reference / Txn ID */}
                                                        <td className="py-4 px-5">
                                                            {payout.reference_number ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="font-mono text-xs font-bold text-stone-900">
                                                                        {payout.reference_number}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleCopy(payout.reference_number, refCopyKey)}
                                                                        className="p-0.5 rounded text-stone-400 hover:text-stone-700 transition cursor-pointer"
                                                                        title="Copy reference number"
                                                                    >
                                                                        {isRefCopied ? (
                                                                            <Check size={11} className="text-emerald-600" />
                                                                        ) : (
                                                                            <Copy size={11} />
                                                                        )}
                                                                    </button>
                                                                    {isRefCopied && (
                                                                        <span className="text-[9px] font-bold text-emerald-600">Copied</span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-stone-400 italic text-[11px]">None</span>
                                                            )}
                                                        </td>

                                                        {/* Amount Paid */}
                                                        <td className="py-4 px-5 text-right font-black text-sm text-emerald-700">
                                                            {formatCurrency(payout.amount)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {payoutHistory.last_page > 1 && (
                                    <div className="p-4 border-t border-stone-100 flex justify-end">
                                        <CompactPagination links={payoutHistory.links} />
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* DISBURSE PAYOUT MODAL */}
            <DisbursePayoutModal
                artisan={disbursingArtisan}
                onClose={() => setDisbursingArtisan(null)}
                formatCurrency={formatCurrency}
                handleCopy={handleCopy}
                copiedKey={copiedKey}
            />

            {/* ORDERS STATEMENT BREAKDOWN MODAL */}
            <ArtisanStatementModal
                artisan={viewingStatementArtisan}
                onClose={() => setViewingStatementArtisan(null)}
                formatCurrency={formatCurrency}
                onDisburse={(artisan) => {
                    setViewingStatementArtisan(null);
                    setDisbursingArtisan(artisan);
                }}
            />
        </AdminLayout>
    );
}

function DisbursePayoutModal({ artisan, onClose, formatCurrency, handleCopy, copiedKey }) {
    if (!artisan) return null;

    const { data, setData, post, processing, errors, reset } = useForm({
        user_id: artisan.id,
        amount: artisan.balance,
        payout_method: artisan.payout_method || 'GCash',
        payout_account_name: artisan.payout_account_name || '',
        payout_account_number: artisan.payout_account_number || '',
        reference_number: '',
    });

    const isCopied = copiedKey === `modal-acc-${artisan.id}`;

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('admin.payouts.store'), {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    return (
        <Modal show={true} onClose={onClose} maxWidth="md">
            <form onSubmit={handleSubmit} className="p-6 bg-[#FCFBF9]">
                <h3 className="text-base font-bold text-stone-900 mb-1">Transfer Earnings to Artisan</h3>
                <p className="text-xs font-semibold text-stone-500 mb-5">Record a payout disbursement to the artisan's account.</p>

                <div className="rounded-2xl bg-stone-50 border border-stone-200/80 p-4 mb-5 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-stone-500 font-semibold">Artisan Shop</span>
                        <span className="font-bold text-stone-900">{artisan.shop_name}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-stone-500 font-semibold">Ready for Payout</span>
                        <div className="flex items-center gap-2">
                            <span className="font-extrabold text-emerald-700 text-sm">{formatCurrency(artisan.balance)}</span>
                            <button
                                type="button"
                                onClick={() => handleCopy(artisan.balance?.toString(), `modal-amount-${artisan.id}`)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-stone-200 hover:border-stone-300 text-stone-600 hover:text-stone-900 text-[10px] font-bold transition shadow-2xs cursor-pointer"
                                title="Copy exact amount to clipboard"
                            >
                                {copiedKey === `modal-amount-${artisan.id}` ? (
                                    <>
                                        <Check size={11} className="text-emerald-600" />
                                        <span className="text-emerald-600 font-bold">Copied</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy size={11} />
                                        <span>Copy Amount</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-between items-start text-xs pt-2.5 border-t border-stone-200/70">
                        <span className="text-stone-500 font-semibold mt-0.5">Payout Destination</span>
                        <div className="text-right space-y-1">
                            <div className="flex items-center justify-end gap-1.5">
                                <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase border ${
                                    (artisan.payout_method || '').toLowerCase().includes('gcash')
                                        ? 'bg-sky-50 text-sky-700 border-sky-200/70'
                                        : (artisan.payout_method || '').toLowerCase().includes('maya')
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                                        : 'bg-stone-100 text-stone-700 border-stone-200'
                                }`}>
                                    {artisan.payout_method || 'GCash'}
                                </span>
                                <span className="font-bold text-stone-800 text-xs">{artisan.payout_account_name || '—'}</span>
                            </div>
                            {artisan.payout_account_number ? (
                                <div className="flex items-center justify-end gap-1.5">
                                    <span className="text-stone-600 font-mono font-semibold tracking-wider text-xs bg-white px-2 py-0.5 rounded-md border border-stone-200/60">
                                        {formatDisplayAccount(artisan.payout_method, artisan.payout_account_number)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(artisan.payout_account_number, `modal-acc-${artisan.id}`)}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-stone-200 hover:border-stone-300 text-stone-600 hover:text-stone-900 text-[10px] font-bold transition shadow-2xs cursor-pointer"
                                        title="Copy account number to clipboard"
                                    >
                                        {copiedKey === `modal-acc-${artisan.id}` ? (
                                            <>
                                                <Check size={11} className="text-emerald-600" />
                                                <span className="text-emerald-600 font-bold">Copied</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={11} />
                                                <span>Copy Number</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <p className="text-[11px] text-amber-700 font-bold mt-1">No account configured</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <InputLabel htmlFor="amount" value="Disbursement Amount (PHP) *" />
                            <button
                                type="button"
                                onClick={() => setData('amount', artisan.balance)}
                                className="text-[10px] font-bold text-clay-700 hover:text-clay-800 underline decoration-dotted cursor-pointer"
                            >
                                Full Amount ({formatCurrency(artisan.balance)})
                            </button>
                        </div>
                        <input
                            type="number"
                            step="0.01"
                            id="amount"
                            value={data.amount}
                            onChange={(e) => setData('amount', e.target.value)}
                            className="mt-1 block w-full rounded-xl border-stone-250 text-sm focus:border-clay-500 focus:ring-clay-500 bg-white"
                            required
                        />
                        <InputError message={errors.amount} className="mt-1" />
                    </div>

                    <div>
                        <InputLabel htmlFor="reference_number" value="GCash / Bank Reference Number *" />
                        <input
                            type="text"
                            id="reference_number"
                            placeholder="e.g. Ref No. 1009283741"
                            value={data.reference_number}
                            onChange={(e) => setData('reference_number', e.target.value)}
                            className="mt-1 block w-full rounded-xl border-stone-250 text-sm focus:border-clay-500 focus:ring-clay-500 bg-white font-mono"
                            required
                        />
                        <InputError message={errors.reference_number} className="mt-1" />
                        <p className="text-[10px] text-stone-400 mt-1">This will be attached to the artisan's email receipt and ledger statement.</p>
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={processing}
                        className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={processing}
                        className="flex items-center gap-1.5 rounded-xl bg-clay-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-clay-200 transition hover:bg-clay-700 active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                        {processing ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <ArrowUpRight size={14} />
                        )}
                        Confirm Transfer
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function ArtisanStatementModal({ artisan, onClose, formatCurrency, onDisburse }) {
    if (!artisan) return null;

    const recentOrders = artisan.recent_orders || [];

    return (
        <Modal show={true} onClose={onClose} maxWidth="2xl">
            <div className="p-6 bg-[#FCFBF9]">
                <div className="flex items-start justify-between pb-4 border-b border-stone-200">
                    <div>
                        <h3 className="text-base font-bold text-stone-900">{artisan.shop_name} — Settlement Statement</h3>
                        <p className="text-xs text-stone-500 font-medium mt-0.5">Owner: {artisan.name} • {artisan.email}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
                    <div className="p-3 rounded-xl bg-white border border-stone-200">
                        <p className="text-[10px] font-bold uppercase text-stone-400">Completed Sales</p>
                        <p className="text-sm font-bold text-stone-900 mt-0.5">{formatCurrency(artisan.gross_sales)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-stone-200">
                        <p className="text-[10px] font-bold uppercase text-stone-400">Platform Fees</p>
                        <p className="text-sm font-bold text-stone-500 mt-0.5">- {formatCurrency(artisan.platform_fees)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-stone-200">
                        <p className="text-[10px] font-bold uppercase text-stone-400">Total Paid Out</p>
                        <p className="text-sm font-bold text-stone-500 mt-0.5">{formatCurrency(artisan.payouts)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                        <p className="text-[10px] font-extrabold uppercase text-emerald-800">Ready for Payout</p>
                        <p className="text-sm font-black text-emerald-700 mt-0.5">{formatCurrency(artisan.balance)}</p>
                    </div>
                </div>

                {/* Active in progress / holds notice */}
                {(artisan.orders_in_progress > 0 || artisan.held_for_dispute > 0) && (
                    <div className="mb-4 flex flex-wrap gap-2 text-xs">
                        {artisan.orders_in_progress > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Orders in Progress: {formatCurrency(artisan.orders_in_progress)} (in delivery/crafting)
                            </span>
                        )}
                        {artisan.held_for_dispute > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Return/Dispute Hold: {formatCurrency(artisan.held_for_dispute)}
                            </span>
                        )}
                    </div>
                )}

                {/* Completed Orders List */}
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Recent Completed Orders</h4>
                <div className="rounded-xl border border-stone-200 overflow-hidden bg-white max-h-64 overflow-y-auto">
                    {recentOrders.length === 0 ? (
                        <div className="p-8 text-center text-xs text-stone-400 font-medium">
                            No completed orders recorded yet.
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-stone-50 border-b border-stone-200 text-[10px] font-bold uppercase text-stone-500">
                                    <th className="py-2.5 px-4">Order #</th>
                                    <th className="py-2.5 px-4">Customer</th>
                                    <th className="py-2.5 px-4 text-right">Gross</th>
                                    <th className="py-2.5 px-4 text-right">Fee</th>
                                    <th className="py-2.5 px-4 text-right">Seller Net</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {recentOrders.map((o) => (
                                    <tr key={o.id} className="hover:bg-stone-50/50">
                                        <td className="py-2.5 px-4 font-mono font-bold text-stone-900">#{o.order_number}</td>
                                        <td className="py-2.5 px-4 text-stone-600">{o.customer_name}</td>
                                        <td className="py-2.5 px-4 text-right font-medium text-stone-700">{formatCurrency(o.gross)}</td>
                                        <td className="py-2.5 px-4 text-right font-medium text-stone-400">- {formatCurrency(o.fee)}</td>
                                        <td className="py-2.5 px-4 text-right font-bold text-emerald-700">{formatCurrency(o.net)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="mt-6 flex items-center justify-between">
                    <div className="text-xs text-stone-500 font-medium">
                        Destination: <strong className="text-stone-800">{artisan.payout_method || 'GCash'}</strong> ({artisan.payout_account_number || 'No account configured'})
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
                        >
                            Close
                        </button>
                        {artisan.balance > 0 && (
                            <button
                                type="button"
                                onClick={() => onDisburse(artisan)}
                                className="flex items-center gap-1.5 rounded-xl bg-clay-600 px-4 py-2 text-xs font-bold text-white hover:bg-clay-700 transition shadow-sm cursor-pointer"
                            >
                                <ArrowUpRight size={13} />
                                Disburse {formatCurrency(artisan.balance)}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
