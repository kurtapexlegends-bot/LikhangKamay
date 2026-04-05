import React, { useMemo, useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import BuyerNavbar from '@/Components/BuyerNavbar';
import Modal from '@/Components/Modal';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import { ArrowDownLeft, ArrowUpRight, Plus, RefreshCcw, ShieldCheck, ShoppingBag, Wallet } from 'lucide-react';

const formatMoney = (value) => {
    return Number(value || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

export default function MyWallet({ wallet }) {
    const { flash = {} } = usePage().props;
    const { addToast } = useToast();
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
    useFlashToast(flash, addToast);

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

            <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                <section className="relative overflow-hidden rounded-[1.5rem] border border-[#2c3b35] bg-[#1a231f] px-6 py-8 shadow-xl shadow-stone-900/10 sm:p-10">
                    <div className="pointer-events-none absolute -right-32 -top-32 h-[400px] w-[400px] rounded-full bg-clay-500/10 blur-[80px]" />
                    <div className="pointer-events-none absolute -bottom-32 -left-32 h-[350px] w-[350px] rounded-full bg-stone-500/10 blur-[70px]" />

                    <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
                        <div className="flex flex-col justify-center">
                            <div className="flex items-center gap-3">
                                <div className="inline-flex items-center justify-center rounded-xl bg-white/10 p-2 text-stone-200 shadow-sm backdrop-blur-md ring-1 ring-white/20">
                                    <Wallet size={20} strokeWidth={2.5} />
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Artisan Wallet</h1>
                            </div>

                            <div className="mt-8">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Available Balance</p>
                                <div className="mt-3 flex items-end gap-3">
                                    <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                                        <span className="text-stone-400 mr-1.5 font-bold text-3xl sm:text-4xl">PHP</span>
                                        {formatMoney(wallet?.balance)}
                                    </h2>
                                </div>
                                <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-stone-400">
                                    Your central fund for artisan refunds and seamless delivery checkouts. Balance updates occur immediately upon verification.
                                </p>
                            </div>

                            <div className="mt-8 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowTopUpModal(true)}
                                    className="inline-flex items-center gap-2 rounded-lg bg-clay-600 px-5 py-2.5 text-[13px] font-bold text-white shadow-sm ring-1 ring-inset ring-white/10 transition hover:bg-clay-700"
                                >
                                    <Plus size={16} strokeWidth={2.5} />
                                    Top Up Funds
                                </button>
                                <Link
                                    href={route('my-orders.index')}
                                    className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-5 py-2.5 text-[13px] font-bold text-stone-300 shadow-sm ring-1 ring-inset ring-white/10 transition hover:bg-white/10 hover:text-white"
                                >
                                    <ShoppingBag size={16} strokeWidth={2.5} />
                                    View Past Orders
                                </Link>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm transition hover:bg-white/10">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Recent Credits</p>
                                        <p className="mt-1 text-xl font-bold tracking-tight text-white"><span className="text-stone-500 mr-1 text-sm">PHP</span>{formatMoney(recentCredits)}</p>
                                    </div>
                                    <div className="rounded-lg bg-[#F2FAF6]/10 p-2 text-emerald-400">
                                        <ArrowDownLeft size={18} strokeWidth={2.5} />
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm transition hover:bg-white/10">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Recent Debits</p>
                                        <p className="mt-1 text-xl font-bold tracking-tight text-white"><span className="text-stone-500 mr-1 text-sm">PHP</span>{formatMoney(recentDebits)}</p>
                                    </div>
                                    <div className="rounded-lg bg-[#FCF3F3]/10 p-2 text-[#e37f7a]">
                                        <ArrowUpRight size={18} strokeWidth={2.5} />
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm transition hover:bg-white/10">
                                <div className="flex items-start gap-4">
                                    <div className="rounded-lg bg-white/10 p-2 text-stone-400">
                                        <ShieldCheck size={18} strokeWidth={2.5} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">Status Synced</p>
                                        <p className="mt-1 truncate text-[13px] font-bold text-stone-200">{latestActivity}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <Modal show={showTopUpModal} onClose={closeTopUpModal} maxWidth="md">
                    <form onSubmit={submitTopUp} className="flex flex-col bg-[#FDFBF9]">
                        <div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-stone-100 bg-white">
                            <div>
                                <h2 className="text-[19px] font-bold tracking-tight text-stone-900">Add Wallet Funds</h2>
                                <p className="mt-1 text-[13px] font-medium text-stone-500">
                                    Recharge your balance via standard online checkout.
                                </p>
                            </div>
                            <button type="button" onClick={closeTopUpModal} className="text-stone-400 transition hover:text-stone-700">
                                <Plus size={20} className="rotate-45" />
                            </button>
                        </div>

                        <div className="p-6">
                            <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-stone-800">
                                Deposit Amount
                            </label>
                            <div className="mt-2.5 flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3.5 shadow-sm transition-colors focus-within:border-clay-500 focus-within:ring-1 focus-within:ring-clay-500">
                                <span className="text-[15px] font-black text-stone-400">PHP</span>
                                <input
                                    type="number"
                                    min="100"
                                    step="0.01"
                                    value={data.amount}
                                    onChange={(e) => setData('amount', e.target.value)}
                                    className="w-full border-0 bg-transparent p-0 text-xl font-black text-stone-900 focus:outline-none focus:ring-0 placeholder:text-stone-200"
                                    placeholder="500.00"
                                    required
                                />
                            </div>
                            <p className="mt-2 text-[12px] font-medium text-stone-500">
                                Minimum top up required is PHP 100.00.
                            </p>
                            {errors.amount && (
                                <p className="mt-2 text-[12px] font-bold text-red-600">{errors.amount}</p>
                            )}

                            <div className="mt-6">
                                <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.15em] text-stone-500">Or Select a Preset</p>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {quickAmounts.map((amount) => (
                                        <button
                                            key={amount}
                                            type="button"
                                            onClick={() => setData('amount', amount)}
                                            className={`rounded-lg border px-2 py-2 text-[13px] font-bold transition-all duration-200 ${
                                                data.amount === amount
                                                    ? 'border-clay-700 bg-clay-700 text-white shadow-[0_2px_10px_-4px_rgba(120,79,46,0.5)]'
                                                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50'
                                            }`}
                                        >
                                            {Number(amount).toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-100 bg-[#FCF7F2]/50">
                            <button
                                type="button"
                                onClick={closeTopUpModal}
                                className="px-5 py-2.5 text-[13px] font-bold text-stone-600 transition hover:text-stone-900"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={processing}
                                className="rounded-xl bg-clay-700 px-6 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-clay-800 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {processing ? 'Initializing...' : 'Proceed to Gateway'}
                            </button>
                        </div>
                    </form>
                </Modal>

                <section className="mt-8 overflow-hidden rounded-[1.25rem] border border-stone-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-stone-100 px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Statement</p>
                            <h2 className="mt-1 text-[19px] font-bold tracking-tight text-stone-900">Transaction History</h2>
                            <p className="mt-1 text-[13px] font-medium text-stone-500">
                                Complete ledger of account credits and debits.
                            </p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-1.5 text-[11px] font-bold tracking-wide text-stone-500 ring-1 ring-inset ring-stone-200">
                            <RefreshCcw size={14} className="opacity-70" />
                            Live Sync Active
                        </div>
                    </div>

                    <div className="">
                        {recentTransactions.length ? (
                            <div className="divide-y divide-stone-100">
                                {recentTransactions.map((entry) => {
                                    const isCredit = entry.direction === 'credit';

                                    return (
                                        <div key={entry.id} className="flex flex-col gap-4 p-5 transition hover:bg-[#FDFBF9] sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex min-w-0 items-start gap-4">
                                                <div className={`mt-0.5 rounded-xl p-2.5 shadow-sm ring-1 ring-inset ${
                                                    isCredit 
                                                        ? 'bg-[#F2FAF6] text-[#2c3b35] ring-emerald-200/50' 
                                                        : 'bg-[#FCF3F3] text-red-800 ring-red-200/50'
                                                }`}>
                                                    {isCredit ? <ArrowDownLeft size={18} strokeWidth={2.5} /> : <ArrowUpRight size={18} strokeWidth={2.5} />}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="text-[14px] font-bold tracking-tight text-stone-900">
                                                            {entry.description || entry.category || 'Wallet ledger update'}
                                                        </p>
                                                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                                                            isCredit
                                                                ? 'bg-[#F2FAF6] text-[#2c3b35]'
                                                                : 'bg-[#FCF3F3] text-red-800'
                                                        }`}>
                                                            {isCredit ? 'Credit' : 'Debit'}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-medium text-stone-500">
                                                        <span>{entry.order_number ? `Order / Ref: ${entry.order_number}` : 'System generated'}</span>
                                                        {entry.created_at && (
                                                            <>
                                                                <span className="hidden h-1 w-1 rounded-full bg-stone-300 sm:inline-block"></span>
                                                                <span>{entry.created_at}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    {entry.counterparty_name && (
                                                        <p className="mt-1 text-[12px] font-medium text-stone-500">
                                                            Account: {entry.counterparty_name}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex shrink-0 items-center justify-between sm:block sm:text-right border-t border-stone-100 pt-3 sm:BORDER-0 sm:pt-0">
                                                <p className={`text-[15px] font-black tracking-tight ${isCredit ? 'text-[#2c3b35]' : 'text-red-700'}`}>
                                                    {isCredit ? '+' : '-'}{formatMoney(entry.amount)}
                                                </p>
                                                <p className="text-[11px] font-bold tracking-wide text-stone-400 mt-1 uppercase">
                                                    Bal: {formatMoney(entry.balance_after)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-12 text-center">
                                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-stone-50 text-stone-400 ring-1 ring-inset ring-stone-200">
                                    <Wallet size={20} strokeWidth={2.5} />
                                </div>
                                <h3 className="mt-4 text-[15px] font-bold tracking-tight text-stone-900">No transactions found</h3>
                                <p className="mt-1 max-w-sm text-[13px] font-medium text-stone-500">
                                    As you top-up or receive refunds, your ledger updates will appear here chronologically.
                                </p>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
