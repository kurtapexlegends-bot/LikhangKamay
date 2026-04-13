import React, { useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import Dropdown from '@/Components/Dropdown';
import Modal from '@/Components/Modal';
import NotificationDropdown from '@/Components/NotificationDropdown';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceAccountSummary from '@/Components/WorkspaceAccountSummary';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import { ArrowDownLeft, ArrowUpRight, Banknote, ChevronDown, Landmark, LogOut, Menu, Plus, RefreshCcw, User } from 'lucide-react';

const formatMoney = (value) => Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const withdrawalTone = {
    pending: 'bg-amber-50 text-amber-700',
    approved: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-red-50 text-red-700',
};

const withdrawalStatusCopy = {
    pending: 'Waiting for platform review',
    approved: 'Approved for release',
    rejected: 'Rejected by platform reviewer',
};

export default function Wallet({ auth, wallet, walletOwner, canRequestWithdrawal = false }) {
    const { flash = {} } = usePage().props;
    const { addToast } = useToast();
    const { openSidebar } = useSellerWorkspaceShell();
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        amount: '1000',
        note: '',
    });

    const closeWithdrawModal = () => {
        setShowWithdrawModal(false);
        reset();
        clearErrors();
    };

    const submitWithdrawal = (event) => {
        event.preventDefault();
        post(route('seller.wallet.withdrawals.store'), {
            preserveScroll: true,
            onSuccess: () => closeWithdrawModal(),
        });
    };

    const transactions = wallet?.recent_transactions || [];
    const withdrawals = wallet?.recent_withdrawal_requests || [];
    const latestActivity = transactions[0]?.created_at || 'No activity yet';
    useFlashToast(flash, addToast);

    return (
        <>
            <Head title="Seller Wallet" />
                <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8 sticky top-0 z-40">
                    <div className="flex min-w-0 items-center gap-3">
                        <button onClick={openSidebar} className="lg:hidden text-gray-500 hover:text-clay-600">
                            <Menu size={24} />
                        </button>
                        <div className="min-w-0">
                            <h1 className="truncate text-lg sm:text-xl font-bold text-gray-900">Seller Wallet</h1>
                            <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Online Delivery earnings and withdrawal requests</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-6">
                        <NotificationDropdown />
                        <div className="hidden sm:block h-8 w-px bg-gray-200"></div>
                        <Dropdown>
                            <Dropdown.Trigger>
                                <span className="inline-flex rounded-md">
                                    <button type="button" className="inline-flex items-center gap-2 px-1 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-transparent hover:text-gray-700 focus:outline-none transition ease-in-out duration-150">
                                        <div className="hidden lg:block">
                                            <WorkspaceAccountSummary user={auth.user} />
                                        </div>
                                        <UserAvatar user={auth.user} />
                                        <ChevronDown size={16} className="text-gray-400" />
                                    </button>
                                </span>
                            </Dropdown.Trigger>
                            <Dropdown.Content>
                                <Dropdown.Link href={route('profile.edit')} className="flex items-center gap-2">
                                    <User size={16} /> Profile
                                </Dropdown.Link>
                                <Dropdown.Link href={route('logout')} method="post" as="button" className="flex items-center gap-2 text-red-600 hover:text-red-700">
                                    <LogOut size={16} /> Log Out
                                </Dropdown.Link>
                            </Dropdown.Content>
                        </Dropdown>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                    <section className="relative overflow-hidden rounded-[1.5rem] border border-[#2c3b35] bg-[#1a231f] px-6 py-8 shadow-xl shadow-stone-900/10 sm:p-10">
                        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-clay-500/10 blur-[80px]" />
                        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
                            <div>
                                <div className="flex items-center gap-3">
                                    <div className="inline-flex items-center justify-center rounded-xl bg-white/10 p-2 text-stone-200 ring-1 ring-white/20">
                                        <Banknote size={20} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Seller Wallet</h2>
                                        <p className="mt-1 text-[12px] font-medium text-stone-400">{walletOwner?.shop_name || walletOwner?.name}</p>
                                    </div>
                                </div>

                                <div className="mt-8">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Available Balance</p>
                                    <h3 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
                                        <span className="text-stone-400 mr-1.5 text-3xl sm:text-4xl">PHP</span>{formatMoney(wallet?.balance)}
                                    </h3>
                                    <p className="mt-4 max-w-md text-[13px] leading-relaxed text-stone-400">
                                        Only paid online Delivery orders settle into this wallet. COD and Pick Up stay out of both seller and platform wallets.
                                    </p>
                                </div>

                                <div className="mt-8 flex flex-wrap gap-3">
                                    {canRequestWithdrawal && (
                                        <button type="button" onClick={() => setShowWithdrawModal(true)} className="inline-flex items-center gap-2 rounded-lg bg-clay-600 px-5 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-clay-700">
                                            <Plus size={16} strokeWidth={2.5} />
                                            Request Withdrawal
                                        </button>
                                    )}
                                    <Link href={route('orders.index')} className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-5 py-2.5 text-[13px] font-bold text-stone-300 ring-1 ring-inset ring-white/10 transition hover:bg-white/10 hover:text-white">
                                        <Landmark size={16} strokeWidth={2.5} />
                                        View Orders
                                    </Link>
                                </div>
                            </div>

                            <div className="grid gap-3">
                                <WalletStatCard label="Pending Online Settlements" value={wallet?.pending_settlement_balance} icon={ArrowDownLeft} tone="text-emerald-400" />
                                <WalletStatCard label="Pending Withdrawals" value={wallet?.pending_withdrawals} icon={ArrowUpRight} tone="text-[#e37f7a]" />
                                <div className="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Status Synced</p>
                                    <p className="mt-2 text-[13px] font-bold text-stone-200">{latestActivity}</p>
                                    <p className="mt-1 text-[12px] font-medium text-stone-500">Approved withdrawals: PHP {formatMoney(wallet?.approved_withdrawals_total)}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                        <section className="overflow-hidden rounded-[1.25rem] border border-stone-200 bg-white shadow-sm">
                            <div className="flex flex-col gap-3 border-b border-stone-100 px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Statement</p>
                                    <h2 className="mt-1 text-[19px] font-bold tracking-tight text-stone-900">Transaction History</h2>
                                    <p className="mt-1 text-[13px] font-medium text-stone-500">Settled online Delivery earnings and wallet holds appear here.</p>
                                </div>
                                <div className="inline-flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-1.5 text-[11px] font-bold tracking-wide text-stone-500 ring-1 ring-inset ring-stone-200">
                                    <RefreshCcw size={14} className="opacity-70" />
                                    Live Sync Active
                                </div>
                            </div>

                            {transactions.length ? (
                                <div className="divide-y divide-stone-100">
                                    {transactions.map((entry) => {
                                        const isCredit = entry.direction === 'credit';
                                        return (
                                            <div key={entry.id} className="flex flex-col gap-4 p-5 transition hover:bg-[#FDFBF9] sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex min-w-0 items-start gap-4">
                                                    <div className={`mt-0.5 rounded-xl p-2.5 shadow-sm ring-1 ring-inset ${isCredit ? 'bg-[#F2FAF6] text-[#2c3b35] ring-emerald-200/50' : 'bg-[#FCF3F3] text-red-800 ring-red-200/50'}`}>
                                                        {isCredit ? <ArrowDownLeft size={18} strokeWidth={2.5} /> : <ArrowUpRight size={18} strokeWidth={2.5} />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[14px] font-bold tracking-tight text-stone-900">{entry.description || entry.category || 'Wallet ledger update'}</p>
                                                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-medium text-stone-500">
                                                            <span>{entry.order_number ? `Order / Ref: ${entry.order_number}` : 'System generated'}</span>
                                                            {entry.created_at && <span>{entry.created_at}</span>}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex shrink-0 items-center justify-between sm:block sm:text-right border-t border-stone-100 pt-3 sm:border-0 sm:pt-0">
                                                    <p className={`text-[15px] font-black tracking-tight ${isCredit ? 'text-[#2c3b35]' : 'text-red-700'}`}>{isCredit ? '+' : '-'}{formatMoney(entry.amount)}</p>
                                                    <p className="text-[11px] font-bold tracking-wide text-stone-400 mt-1 uppercase">Bal: {formatMoney(entry.balance_after)}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <EmptyState icon={Banknote} title="No transactions found" description="Settled online Delivery earnings and wallet request adjustments will appear here." />
                            )}
                        </section>

                        <section className="overflow-hidden rounded-[1.25rem] border border-stone-200 bg-white shadow-sm">
                            <div className="border-b border-stone-100 px-6 py-5">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Payouts</p>
                                <h2 className="mt-1 text-[19px] font-bold tracking-tight text-stone-900">Payout History</h2>
                                <p className="mt-1 text-[13px] font-medium text-stone-500">Track pending, approved, and rejected withdrawal requests with review timing and notes.</p>
                            </div>

                            {withdrawals.length ? (
                                <div className="divide-y divide-stone-100">
                                    {withdrawals.map((request) => (
                                        <div key={request.id} className="p-5">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="text-[14px] font-bold tracking-tight text-stone-900">PHP {formatMoney(request.amount)}</p>
                                                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${withdrawalTone[request.status] || withdrawalTone.pending}`}>
                                                            {request.status}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-[12px] font-medium text-stone-500">{withdrawalStatusCopy[request.status] || withdrawalStatusCopy.pending}</p>
                                                </div>
                                                <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-right">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400">Requested</p>
                                                    <p className="mt-1 text-[12px] font-bold text-stone-700">{request.created_at}</p>
                                                </div>
                                            </div>

                                            <div className="mt-3 grid gap-2 text-[12px] md:grid-cols-2">
                                                <div className="rounded-xl border border-stone-100 bg-stone-50/70 px-3 py-2">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400">Platform Review</p>
                                                    <p className="mt-1 font-medium text-stone-600">
                                                        {request.reviewed_at ? `Reviewed ${request.reviewed_at}` : 'Not reviewed yet'}
                                                    </p>
                                                </div>
                                                <div className="rounded-xl border border-stone-100 bg-stone-50/70 px-3 py-2">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400">Seller Note</p>
                                                    <p className="mt-1 leading-relaxed text-stone-600">{request.note || 'No payout note provided.'}</p>
                                                </div>
                                            </div>

                                            {request.rejection_reason ? (
                                                <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-red-500">Rejection Reason</p>
                                                    <p className="mt-1 text-[12px] leading-relaxed text-red-700">{request.rejection_reason}</p>
                                                </div>
                                            ) : request.reviewed_at ? (
                                                <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600">Release Status</p>
                                                    <p className="mt-1 text-[12px] font-medium text-emerald-700">Approved and reviewed on {request.reviewed_at}.</p>
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState icon={Landmark} title="No payout requests yet" description="Submit a withdrawal request when you want to pull from your settled online earnings balance." />
                            )}
                        </section>
                    </div>
                </main>

            <Modal show={canRequestWithdrawal && showWithdrawModal} onClose={closeWithdrawModal} maxWidth="md">
                <form onSubmit={submitWithdrawal} className="flex flex-col bg-[#FDFBF9]">
                    <div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-stone-100 bg-white">
                        <div>
                            <h2 className="text-[19px] font-bold tracking-tight text-stone-900">Request Withdrawal</h2>
                            <p className="mt-1 text-[13px] font-medium text-stone-500">Funds are reserved immediately and reviewed by the platform admin.</p>
                        </div>
                        <button type="button" onClick={closeWithdrawModal} className="text-stone-400 transition hover:text-stone-700">
                            <Plus size={20} className="rotate-45" />
                        </button>
                    </div>

                    <div className="p-6 space-y-5">
                        <div>
                            <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-stone-800">Withdrawal Amount</label>
                            <div className="mt-2.5 flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3.5 shadow-sm focus-within:border-clay-500 focus-within:ring-1 focus-within:ring-clay-500">
                                <span className="text-[15px] font-black text-stone-400">PHP</span>
                                <input type="number" min="0.01" step="0.01" value={data.amount} onChange={(event) => setData('amount', event.target.value)} className="w-full border-0 bg-transparent p-0 text-xl font-black text-stone-900 focus:outline-none focus:ring-0 placeholder:text-stone-200" placeholder="1000.00" required />
                            </div>
                            {errors.amount && <p className="mt-2 text-[12px] font-bold text-red-600">{errors.amount}</p>}
                        </div>

                        <div>
                            <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-stone-800">Note</label>
                            <textarea value={data.note} onChange={(event) => setData('note', event.target.value)} rows={3} className="mt-2.5 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-900 placeholder:text-stone-300 focus:border-clay-500 focus:ring-clay-500" placeholder="Optional payout note for the admin reviewer" />
                            {errors.note && <p className="mt-2 text-[12px] font-bold text-red-600">{errors.note}</p>}
                        </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-100 bg-[#FCF7F2]/50">
                        <button type="button" onClick={closeWithdrawModal} className="px-5 py-2.5 text-[13px] font-bold text-stone-600 transition hover:text-stone-900">Cancel</button>
                        <button type="submit" disabled={processing} className="rounded-xl bg-clay-700 px-6 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-clay-800 disabled:cursor-not-allowed disabled:opacity-70">
                            {processing ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
}

Wallet.layout = (page) => <SellerWorkspaceLayout active="wallet">{page}</SellerWorkspaceLayout>;

function WalletStatCard({ label, value, icon: Icon, tone }) {
    return (
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">{label}</p>
                    <p className="mt-1 text-xl font-bold tracking-tight text-white">
                        <span className="text-stone-500 mr-1 text-sm">PHP</span>{formatMoney(value)}
                    </p>
                </div>
                <div className={`rounded-lg bg-white/10 p-2 ${tone}`}>
                    <Icon size={18} strokeWidth={2.5} />
                </div>
            </div>
        </div>
    );
}

function EmptyState({ icon: Icon, title, description }) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-stone-50 text-stone-400 ring-1 ring-inset ring-stone-200">
                <Icon size={20} strokeWidth={2.5} />
            </div>
            <h3 className="mt-4 text-[15px] font-bold tracking-tight text-stone-900">{title}</h3>
            <p className="mt-1 max-w-sm text-[13px] font-medium text-stone-500">{description}</p>
        </div>
    );
}
