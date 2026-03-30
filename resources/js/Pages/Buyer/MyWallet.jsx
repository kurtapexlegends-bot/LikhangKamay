import React, { useMemo, useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import BuyerNavbar from '@/Components/BuyerNavbar';
import Modal from '@/Components/Modal';
import { ArrowDownLeft, ArrowUpRight, Plus, RefreshCcw, ShieldCheck, ShoppingBag, Wallet } from 'lucide-react';

const formatMoney = (value) => {
    return Number(value || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

export default function MyWallet({ wallet }) {
    const { flash = {} } = usePage().props;
    const [showTopUpModal, setShowTopUpModal] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        amount: '500',
    });

    const recentTransactions = wallet?.recent_transactions || [];
    const recentCredits = recentTransactions
        .filter((entry) => entry.direction === 'credit')
        .reduce((total, entry) => total + Number(entry.amount || 0), 0);
    const recentDebits = recentTransactions
        .filter((entry) => entry.direction === 'debit')
        .reduce((total, entry) => total + Number(entry.amount || 0), 0);
    const latestActivity = recentTransactions[0]?.created_at || 'No activity yet';
    const quickAmounts = useMemo(() => ['100', '250', '500', '1000'], []);

    const submitTopUp = (e) => {
        e.preventDefault();
        post(route('my-wallet.top-up'), {
            preserveScroll: true,
            onSuccess: () => {
                setShowTopUpModal(false);
                reset('amount');
            },
        });
    };

    const closeTopUpModal = () => {
        setShowTopUpModal(false);
        reset('amount');
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9]">
            <Head title="My Wallet" />
            <BuyerNavbar />

            <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                {(flash.success || flash.error) && (
                    <div className="mb-4 space-y-3">
                        {flash.success && (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                                {flash.success}
                            </div>
                        )}
                        {flash.error && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                {flash.error}
                            </div>
                        )}
                    </div>
                )}

                <section className="relative overflow-hidden rounded-[1.75rem] border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/70 to-[#F4EEE7] px-5 py-5 shadow-sm sm:px-6 sm:py-6">
                    <div className="pointer-events-none absolute -right-12 top-0 h-32 w-32 rounded-full bg-emerald-200/30 blur-3xl" />
                    <div className="pointer-events-none absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-clay-200/25 blur-2xl" />

                    <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
                        <div>
                            <div className="flex items-start gap-3">
                                <div className="rounded-2xl bg-white/90 p-2.5 text-emerald-700 shadow-sm ring-1 ring-emerald-100">
                                    <Wallet size={20} />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">My Wallet</h1>
                                    <p className="mt-1.5 max-w-xl text-sm leading-6 text-gray-600">
                                        Refunds go here. Use this balance for eligible delivery checkouts.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6">
                                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-700">Available balance</p>
                                <div className="mt-2.5 flex items-end gap-2.5">
                                    <h2 className="text-3xl font-black tracking-tight text-emerald-950 sm:text-4xl">
                                        PHP {formatMoney(wallet?.balance)}
                                    </h2>
                                    <span className="pb-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-800/80">
                                        {wallet?.currency || 'PHP'}
                                    </span>
                                </div>
                                <p className="mt-2 text-sm text-gray-600">
                                    Auto-updates after refunds and wallet payments.
                                </p>
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setShowTopUpModal(true)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
                                >
                                    <Plus size={15} />
                                    Top Up
                                </button>
                                <Link
                                    href={route('my-orders.index')}
                                    className="inline-flex items-center gap-2 rounded-xl bg-clay-600 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-clay-700"
                                >
                                    <ShoppingBag size={15} />
                                    My Orders
                                </Link>
                            </div>
                        </div>

                        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
                            <div className="rounded-2xl border border-white/80 bg-white/85 p-3.5 shadow-sm backdrop-blur">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Recent credits</p>
                                        <p className="mt-1.5 text-xl font-black text-emerald-700">PHP {formatMoney(recentCredits)}</p>
                                        <p className="mt-1.5 text-xs leading-5 text-gray-500">Recent wallet credits.</p>
                                    </div>
                                    <div className="rounded-2xl bg-emerald-100 p-2 text-emerald-700">
                                        <ArrowDownLeft size={16} />
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-white/80 bg-white/85 p-3.5 shadow-sm backdrop-blur">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Recent debits</p>
                                        <p className="mt-1.5 text-xl font-black text-red-600">PHP {formatMoney(recentDebits)}</p>
                                        <p className="mt-1.5 text-xs leading-5 text-gray-500">Recent wallet deductions.</p>
                                    </div>
                                    <div className="rounded-2xl bg-red-100 p-2 text-red-600">
                                        <ArrowUpRight size={16} />
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-white/80 bg-white/85 p-3.5 shadow-sm backdrop-blur sm:col-span-2 lg:col-span-1">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-2xl bg-gray-100 p-2 text-gray-600">
                                        <ShieldCheck size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Latest activity</p>
                                        <p className="mt-1.5 text-sm font-bold text-gray-900">{latestActivity}</p>
                                        <p className="mt-1.5 text-xs leading-5 text-gray-500">
                                            Each entry shows the updated balance.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <Modal show={showTopUpModal} onClose={closeTopUpModal} maxWidth="md">
                    <form onSubmit={submitTopUp} className="p-5 sm:p-6">
                        <div className="flex items-start gap-3">
                            <div className="rounded-2xl bg-emerald-100 p-2.5 text-emerald-700">
                                <Wallet size={18} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-gray-900">Top Up Wallet</h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Add funds to your buyer wallet using online payment.
                                </p>
                            </div>
                        </div>

                        <div className="mt-5">
                            <label className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                                Amount
                            </label>
                            <div className="mt-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-gray-500">PHP</span>
                                    <input
                                        type="number"
                                        min="100"
                                        step="0.01"
                                        value={data.amount}
                                        onChange={(e) => setData('amount', e.target.value)}
                                        className="w-full border-0 bg-transparent p-0 text-2xl font-black text-gray-900 focus:outline-none focus:ring-0"
                                        placeholder="500.00"
                                        required
                                    />
                                </div>
                            </div>
                            <p className="mt-2 text-xs text-gray-500">
                                Minimum online top up is PHP 100.00.
                            </p>
                            {errors.amount && (
                                <p className="mt-2 text-xs font-semibold text-red-600">{errors.amount}</p>
                            )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            {quickAmounts.map((amount) => (
                                <button
                                    key={amount}
                                    type="button"
                                    onClick={() => setData('amount', amount)}
                                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                                        data.amount === amount
                                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50/60'
                                    }`}
                                >
                                    PHP {Number(amount).toLocaleString()}
                                </button>
                            ))}
                        </div>

                        <div className="mt-6 flex justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={closeTopUpModal}
                                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={processing}
                                className="rounded-xl bg-clay-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {processing ? 'Starting...' : 'Proceed to Payment'}
                            </button>
                        </div>
                    </form>
                </Modal>

                <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-gray-100 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">Transaction History</p>
                            <h2 className="mt-1.5 text-xl font-bold text-gray-900">Recent Wallet Activity</h2>
                            <p className="mt-1 text-sm text-gray-500">
                                Recent wallet credits and debits.
                            </p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500">
                            <RefreshCcw size={14} />
                            Latest entries
                        </div>
                    </div>

                    <div className="p-4 sm:p-5">
                        {recentTransactions.length ? (
                            <div className="space-y-2.5">
                                {recentTransactions.map((entry) => {
                                    const isCredit = entry.direction === 'credit';

                                    return (
                                        <div key={entry.id} className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-[#FCFAF7] p-3.5 transition hover:border-gray-200 hover:bg-white sm:flex-row sm:items-start sm:justify-between">
                                            <div className="flex min-w-0 gap-3">
                                                <div className={`mt-0.5 rounded-2xl p-2 ${isCredit ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                                    {isCredit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="text-sm font-bold text-gray-900">
                                                            {entry.description || entry.category || 'Wallet update'}
                                                        </p>
                                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                                            isCredit
                                                                ? 'bg-emerald-100 text-emerald-700'
                                                                : 'bg-red-100 text-red-600'
                                                        }`}>
                                                            {isCredit ? 'Credit' : 'Debit'}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {entry.order_number ? `Order ${entry.order_number}` : 'Wallet update'}
                                                        {entry.created_at ? ` - ${entry.created_at}` : ''}
                                                    </p>
                                                    {entry.counterparty_name && (
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            Counterparty: {entry.counterparty_name}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid shrink-0 gap-1 text-left sm:min-w-[170px] sm:text-right">
                                                <p className={`text-sm font-black ${isCredit ? 'text-emerald-700' : 'text-red-600'}`}>
                                                    {isCredit ? '+' : '-'}PHP {formatMoney(entry.amount)}
                                                </p>
                                                <p className="text-xs font-medium text-gray-500">
                                                    Balance after: PHP {formatMoney(entry.balance_after)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="rounded-[1.5rem] border border-dashed border-gray-200 bg-[#FCFAF7] px-5 py-8 text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm">
                                    <Wallet size={20} />
                                </div>
                                <p className="mt-3 text-base font-bold text-gray-800">No wallet activity yet</p>
                                <p className="mt-1.5 text-sm leading-6 text-gray-500">
                                    Refunds and wallet purchases will appear here.
                                </p>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
