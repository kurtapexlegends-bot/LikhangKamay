import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { CreditCard, History, DollarSign, Users, Calendar, ArrowUpRight, Search, FileText, CheckCircle, ExternalLink, LoaderCircle, Sparkles } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import CompactPagination from '@/Components/CompactPagination';

export default function PayoutManager({ artisans = [], payoutHistory = { data: [] }, metrics = {} }) {
    const [activeTab, setActiveTab] = useState('balances');
    const [searchQuery, setSearchQuery] = useState('');
    const [disbursingArtisan, setDisbursingArtisan] = useState(null);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    // Filter artisans by search
    const filteredArtisans = artisans.filter(artisan => 
        artisan.shop_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artisan.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artisan.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AdminLayout>
            <Head title="Payouts Management" />

            <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Payouts Management</h1>
                        <p className="text-sm text-stone-500 mt-1">Review outstanding artisan balances and log manual GCash or bank transfers.</p>
                    </div>
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                    <div className="bg-white overflow-hidden rounded-2xl border border-stone-200 p-5 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Total Outstanding Owed</p>
                            <h3 className="text-2xl font-black text-stone-900 mt-1">{formatCurrency(metrics.total_owed || 0)}</h3>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden rounded-2xl border border-stone-200 p-5 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Total Payouts Disbursed</p>
                            <h3 className="text-2xl font-black text-stone-900 mt-1">{formatCurrency(metrics.total_paid || 0)}</h3>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden rounded-2xl border border-stone-200 p-5 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Artisans Owed</p>
                            <h3 className="text-2xl font-black text-stone-900 mt-1">{metrics.artisans_owed_count || 0} Shop(s)</h3>
                        </div>
                    </div>
                </div>

                {/* Tabs & Search */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-2">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('balances')}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                                activeTab === 'balances'
                                    ? 'bg-clay-600 text-white shadow-sm'
                                    : 'text-stone-600 hover:bg-stone-50'
                            }`}
                        >
                            <CreditCard size={16} /> Unpaid Balances
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                                activeTab === 'history'
                                    ? 'bg-clay-600 text-white shadow-sm'
                                    : 'text-stone-600 hover:bg-stone-50'
                            }`}
                        >
                            <History size={16} /> Payout History
                        </button>
                    </div>

                    {activeTab === 'balances' && (
                        <div className="relative max-w-xs w-full">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                                <Search size={16} />
                            </span>
                            <input
                                type="text"
                                placeholder="Search shops..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-stone-200 text-sm focus:border-clay-500 focus:ring-clay-500 bg-white"
                            />
                        </div>
                    )}
                </div>

                {/* Main Content Area */}
                <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                    {activeTab === 'balances' ? (
                        filteredArtisans.length === 0 ? (
                            <div className="text-center py-12">
                                <Users size={40} className="mx-auto text-stone-300 mb-3" />
                                <h3 className="text-sm font-bold text-stone-850">No artisans found</h3>
                                <p className="text-xs text-stone-500 mt-1">There are no approved artisans matches for unpaid payouts.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-stone-50/70 border-b border-stone-200 text-[11px] font-black uppercase tracking-wider text-stone-500">
                                            <th className="py-3 px-5">Shop details</th>
                                            <th className="py-3 px-5">Payout Account Details</th>
                                            <th className="py-3 px-5 text-right">Revenue</th>
                                            <th className="py-3 px-5 text-right">Expenses</th>
                                            <th className="py-3 px-5 text-right">Paid Out</th>
                                            <th className="py-3 px-5 text-right">Unpaid Balance</th>
                                            <th className="py-3 px-5 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-150 text-xs font-semibold text-stone-700">
                                        {filteredArtisans.map((artisan) => {
                                            const isOwed = artisan.balance > 0;
                                            return (
                                                <tr key={artisan.id} className="hover:bg-stone-50/50 transition">
                                                    <td className="py-4 px-5">
                                                        <p className="font-bold text-stone-900 text-sm">{artisan.shop_name}</p>
                                                        <p className="text-stone-400 font-medium mt-0.5">{artisan.name} • {artisan.email}</p>
                                                    </td>
                                                    <td className="py-4 px-5">
                                                        <span className="inline-flex items-center gap-1 rounded bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-700 uppercase">
                                                            {artisan.payout_method}
                                                        </span>
                                                        <p className="mt-1 font-bold text-stone-800">{artisan.payout_account_name}</p>
                                                        <p className="font-medium text-stone-500 tracking-wider mt-0.5">{artisan.payout_account_number}</p>
                                                    </td>
                                                    <td className="py-4 px-5 text-right font-medium text-stone-500">
                                                        {formatCurrency(artisan.revenue)}
                                                    </td>
                                                    <td className="py-4 px-5 text-right font-medium text-rose-500">
                                                        - {formatCurrency(artisan.expenses)}
                                                    </td>
                                                    <td className="py-4 px-5 text-right font-medium text-blue-600">
                                                        {formatCurrency(artisan.payouts)}
                                                    </td>
                                                    <td className="py-4 px-5 text-right">
                                                        <span className={`font-black text-sm ${isOwed ? 'text-amber-600' : 'text-stone-400'}`}>
                                                            {formatCurrency(artisan.balance)}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-5 text-center">
                                                        <button
                                                            onClick={() => setDisbursingArtisan(artisan)}
                                                            disabled={!isOwed}
                                                            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[11px] font-bold transition shadow-sm active:scale-95 ${
                                                                isOwed
                                                                    ? 'bg-clay-600 text-white hover:bg-clay-700'
                                                                    : 'bg-stone-100 text-stone-400 cursor-not-allowed shadow-none'
                                                            }`}
                                                        >
                                                            <ArrowUpRight size={14} /> Log Payout
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )
                    ) : (
                        payoutHistory.data.length === 0 ? (
                            <div className="text-center py-12">
                                <History size={40} className="mx-auto text-stone-300 mb-3" />
                                <h3 className="text-sm font-bold text-stone-850">No payout history</h3>
                                <p className="text-xs text-stone-500 mt-1">There are no logged payout disbursements in the system ledger yet.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-stone-50/70 border-b border-stone-200 text-[11px] font-black uppercase tracking-wider text-stone-500">
                                                <th className="py-3 px-5">Disbursement Date</th>
                                                <th className="py-3 px-5">Artisan Shop</th>
                                                <th className="py-3 px-5">Payout Destination</th>
                                                <th className="py-3 px-5">Reference/Txn ID</th>
                                                <th className="py-3 px-5 text-right">Amount Paid</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-150 text-xs font-semibold text-stone-700">
                                            {payoutHistory.data.map((payout) => (
                                                <tr key={payout.id} className="hover:bg-stone-50/50 transition">
                                                    <td className="py-4 px-5 font-medium text-stone-500">
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar size={14} className="text-stone-400" />
                                                            {payout.created_at}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-5">
                                                        <p className="font-bold text-stone-900">{payout.shop_name}</p>
                                                        <p className="text-[10px] text-stone-400 font-medium mt-0.5">Owner: {payout.artisan_name}</p>
                                                    </td>
                                                    <td className="py-4 px-5">
                                                        <span className="inline-flex items-center gap-1 rounded bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-700 uppercase">
                                                            {payout.payout_method}
                                                        </span>
                                                        <p className="mt-1 font-bold text-stone-850">{payout.payout_account_name}</p>
                                                        <p className="text-[10px] text-stone-400 font-medium tracking-wider mt-0.5">{payout.payout_account_number}</p>
                                                    </td>
                                                    <td className="py-4 px-5 font-medium text-stone-900 font-mono">
                                                        {payout.reference_number || (
                                                            <span className="text-stone-400 font-sans italic">None</span>
                                                        )}
                                                    </td>
                                                    <td className="py-4 px-5 text-right font-black text-sm text-emerald-600">
                                                        {formatCurrency(payout.amount)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {payoutHistory.last_page > 1 && (
                                    <div className="p-4 border-t border-stone-200">
                                        <CompactPagination links={payoutHistory.links} />
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Disburse Payout Modal */}
            <DisbursePayoutModal
                artisan={disbursingArtisan}
                onClose={() => setDisbursingArtisan(null)}
                formatCurrency={formatCurrency}
            />
        </AdminLayout>
    );
}

function DisbursePayoutModal({ artisan, onClose, formatCurrency }) {
    if (!artisan) return null;

    const { data, setData, post, processing, errors, reset } = useForm({
        user_id: artisan.id,
        amount: artisan.balance,
        payout_method: artisan.payout_method || 'GCash',
        payout_account_name: artisan.payout_account_name || '',
        payout_account_number: artisan.payout_account_number || '',
        reference_number: '',
    });

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
            <form onSubmit={handleSubmit} className="p-6 bg-[#FDFBF9]">
                <h3 className="text-lg font-bold text-stone-900 mb-1">Disburse Payout</h3>
                <p className="text-xs text-stone-500 mb-5">Log a manual fund transfer. This reduces the shop outstanding balance.</p>

                <div className="rounded-xl bg-stone-50 border border-stone-200 p-4 mb-5 space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                        <span className="text-stone-500">Artisan Shop</span>
                        <span className="font-bold text-stone-900">{artisan.shop_name}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold">
                        <span className="text-stone-500">Unpaid Balance</span>
                        <span className="font-bold text-stone-900">{formatCurrency(artisan.balance)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold pt-2 border-t border-stone-150">
                        <span className="text-stone-500">Payout Target</span>
                        <span className="text-right font-medium text-stone-900">
                            <span className="font-bold uppercase text-[9px] bg-stone-200 rounded px-1">{artisan.payout_method}</span>
                            <span className="block mt-0.5">{artisan.payout_account_name}</span>
                            <span className="block text-stone-400 mt-0.5 tracking-wider">{artisan.payout_account_number}</span>
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <InputLabel htmlFor="amount" value="Disbursement Amount (PHP) *" />
                        <input
                            type="number"
                            step="0.01"
                            id="amount"
                            value={data.amount}
                            onChange={(e) => setData('amount', e.target.value)}
                            className="mt-1 block w-full rounded-lg border-stone-250 text-sm focus:border-clay-500 focus:ring-clay-500 bg-white"
                            required
                        />
                        <InputError message={errors.amount} className="mt-1" />
                    </div>

                    <div>
                        <InputLabel htmlFor="reference_number" value="GCash Transaction ID / Reference (Optional)" />
                        <input
                            type="text"
                            id="reference_number"
                            placeholder="e.g. Ref No. 902183201"
                            value={data.reference_number}
                            onChange={(e) => setData('reference_number', e.target.value)}
                            className="mt-1 block w-full rounded-lg border-stone-250 text-sm focus:border-clay-500 focus:ring-clay-500 bg-white"
                        />
                        <InputError message={errors.reference_number} className="mt-1" />
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={processing}
                        className="rounded-xl border border-stone-250 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={processing}
                        className="flex items-center gap-1.5 rounded-xl bg-clay-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-clay-200 transition hover:bg-clay-700 active:scale-95 disabled:opacity-50"
                    >
                        {processing ? (
                            <LoaderCircle size={14} className="animate-spin" />
                        ) : (
                            <ArrowUpRight size={14} />
                        )}
                        Confirm Payment
                    </button>
                </div>
            </form>
        </Modal>
    );
}
