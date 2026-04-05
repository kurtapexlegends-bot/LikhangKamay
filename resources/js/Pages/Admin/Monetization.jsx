import React, { useEffect, useState } from "react";
import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import {
    Users,
    TrendingUp,
    TrendingDown,
    CircleDollarSign,
    Banknote,
    Award,
    ChevronRight,
    Star,
    CheckCircle,
    XCircle,
    Clock,
    Minus,
    ArrowUpRight
} from "lucide-react";
import AdminLayout from "@/Layouts/AdminLayout";
import UserAvatar from "@/Components/UserAvatar";

const formatMoney = (value) => `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const planTierBadgeClasses = {
    Elite: 'bg-gradient-to-r from-fuchsia-100 to-purple-100 text-fuchsia-800 border-fuchsia-200',
    Premium: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    Free: 'bg-stone-100 text-stone-600 border-stone-200',
};

const changeDirectionBadgeClasses = {
    upgrade: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    downgrade: 'bg-amber-50 text-amber-700 border-amber-100',
    change: 'bg-stone-100 text-stone-600 border-stone-200',
};

// Stat Card Component
const StatCard = ({ title, metric, prefix = "", icon: Icon, bg, text, subtitle }) => {
    // Metric might be a simple number (fallback) or an object { value, growth }
    const value = typeof metric === 'object' ? metric.value : metric;
    const growth = typeof metric === 'object' ? metric.growth : undefined;
    const trend = typeof metric === 'object' ? metric.trend : undefined;

    const derivedTrend = trend || (growth > 0 ? 'up' : growth < 0 ? 'down' : 'neutral');

    return (
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                    {title}
                </p>
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                    {prefix}{value !== undefined ? value.toLocaleString() : '0'}
                </h3>
                
                {growth !== undefined && (
                    <div className={`flex items-center gap-1 text-[10px] font-bold mt-1 ${
                        derivedTrend === 'up' ? 'text-green-600' : 
                        derivedTrend === 'down' ? 'text-red-600' : 'text-gray-400'
                    }`}>
                        {derivedTrend === 'up' && <TrendingUp size={12}/>}
                        {derivedTrend === 'down' && <TrendingDown size={12}/>}
                        {derivedTrend === 'neutral' && <Minus size={12}/>}
                        <span>{derivedTrend === 'up' ? '+' : ''}{growth}% vs 30 days ago</span>
                    </div>
                )}
                {subtitle && (
                    <p className="text-[10px] font-medium text-gray-400 mt-1">{subtitle}</p>
                )}
                {!subtitle && growth === undefined && (
                    <p className="text-[10px] font-medium text-gray-400 mt-1">Real-time status</p>
                )}
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} ${text}`}>
                <Icon size={20} />
            </div>
        </div>
    );
};

export default function Monetization({ metrics, recentSubscribers, recentSponsorships, pendingWalletWithdrawals, platformWallet }) {
    const { flash } = usePage().props;
    const [showWithdrawForm, setShowWithdrawForm] = useState(false);
    const [rejectingWithdrawalId, setRejectingWithdrawalId] = useState(null);
    const [rejectionReasons, setRejectionReasons] = useState({});
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        amount: '',
        note: '',
    });

    useEffect(() => {
        if (flash?.success) {
            reset();
            clearErrors();
            setShowWithdrawForm(false);
        }
    }, [flash?.success, reset, clearErrors]);

    const submitWithdrawal = (event) => {
        event.preventDefault();

        post(route('admin.monetization.withdraw'), {
            preserveScroll: true,
        });
    };

    const approveSellerWithdrawal = (id) => {
        post(route('admin.wallet-withdrawals.approve', id), {
            preserveScroll: true,
        });
    };

    const rejectSellerWithdrawal = (id) => {
        const reason = (rejectionReasons[id] || '').trim();

        if (!reason) {
            setRejectingWithdrawalId(id);
            return;
        }

        router.post(route('admin.wallet-withdrawals.reject', id), {
            rejection_reason: reason,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setRejectingWithdrawalId(null);
                setRejectionReasons((current) => ({ ...current, [id]: '' }));
            },
        });
    };

    return (
        <AdminLayout title="Monetization">
            {(flash?.success || flash?.error) && (
                <div className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-medium ${
                    flash?.success
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-red-200 bg-red-50 text-red-700'
                }`}>
                    {flash?.success || flash?.error}
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                <StatCard
                    title="Projected Plan MRR"
                    metric={metrics.mrr}
                    prefix="PHP "
                    icon={CircleDollarSign}
                    bg="bg-emerald-100"
                    text="text-emerald-600"
                    subtitle={metrics.mrr?.basis}
                />
                <StatCard
                    title="Paid Subscribers"
                    metric={metrics.subscribers.total_paid}
                    icon={Users}
                    bg="bg-blue-100"
                    text="text-blue-600"
                    subtitle={`${metrics.subscribers.premium} Premium, ${metrics.subscribers.elite} Elite`}
                />
                <StatCard
                    title="Elite Subscribers"
                    metric={metrics.subscribers.elite}
                    icon={Star}
                    bg="bg-fuchsia-100"
                    text="text-fuchsia-600"
                    subtitle="Generating sponsorship credits"
                />
                <StatCard
                    title="Active Sponsorships"
                    metric={metrics.sponsorships}
                    icon={Award}
                    bg="bg-amber-100"
                    text="text-amber-600"
                />
            </div>

            {platformWallet && (
                <div className="mb-8 overflow-hidden rounded-[1.5rem] border border-[#2c3b35] bg-[#1a231f] shadow-xl shadow-stone-900/10 grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                    <div className="relative p-6 sm:p-10">
                        <div className="pointer-events-none absolute -right-32 -top-32 h-[400px] w-[400px] rounded-full bg-clay-500/10 blur-[80px]" />
                        <div className="relative">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="inline-flex items-center justify-center rounded-xl bg-white/10 p-2 text-stone-200 shadow-sm backdrop-blur-md ring-1 ring-white/20">
                                        <CircleDollarSign size={20} strokeWidth={2.5} />
                                    </div>
                                    <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Platform Wallet</h2>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowWithdrawForm((current) => !current);
                                        clearErrors();
                                    }}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/15"
                                >
                                    <ArrowUpRight size={16} />
                                    Withdraw
                                </button>
                            </div>

                            <div className="mt-8">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Total Treasury Balance</p>
                                <div className="mt-2 flex items-end gap-3">
                                    <h3 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                                        <span className="text-stone-400 mr-2 font-bold text-3xl">PHP</span>
                                        {formatMoney(platformWallet.balance).replace('PHP ', '')}
                                    </h3>
                                </div>
                                <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-stone-400">
                                    Central ledger for settled online Delivery commissions and convenience fees. COD and Pick Up stay out of this wallet.
                                </p>
                            </div>

                            {showWithdrawForm && (
                                <form onSubmit={submitWithdrawal} className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                                    <div className="grid gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                                        <div>
                                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
                                                Amount
                                            </label>
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                value={data.amount}
                                                onChange={(event) => setData('amount', event.target.value)}
                                                className="w-full rounded-xl border border-white/10 bg-[#111814] px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-stone-500 focus:border-clay-400"
                                                placeholder="0.00"
                                            />
                                            {errors.amount && <p className="mt-1 text-xs text-[#e37f7a]">{errors.amount}</p>}
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
                                                Note
                                            </label>
                                            <input
                                                type="text"
                                                value={data.note}
                                                onChange={(event) => setData('note', event.target.value)}
                                                className="w-full rounded-xl border border-white/10 bg-[#111814] px-4 py-3 text-sm font-medium text-white outline-none transition placeholder:text-stone-500 focus:border-clay-400"
                                                placeholder="Optional withdrawal note"
                                            />
                                            {errors.note && <p className="mt-1 text-xs text-[#e37f7a]">{errors.note}</p>}
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-xs text-stone-500">
                                            This deducts from the platform wallet and records a ledger debit.
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    reset();
                                                    clearErrors();
                                                    setShowWithdrawForm(false);
                                                }}
                                                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-stone-300 transition hover:bg-white/5"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={processing}
                                                className="rounded-xl bg-clay-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {processing ? 'Withdrawing...' : 'Confirm Withdraw'}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col border-t border-white/10 bg-[#161d19] xl:border-l xl:border-t-0 p-6 sm:p-8">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Recent Ledger Activity</p>
                            <p className="mt-1 text-[13px] text-stone-500">Traceable commission and convenience-fee entries.</p>
                        </div>

                        <div className="mt-5 flex-1 flex flex-col gap-3">
                            {platformWallet.recent_transactions?.length ? platformWallet.recent_transactions.map((entry) => (
                                <div key={entry.id} className="rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm transition hover:bg-white/10">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-bold text-stone-100">{entry.description || entry.category}</p>
                                            <p className="mt-1.5 text-[11px] font-medium text-stone-400">
                                                {entry.order_number ? `Ref: ${entry.order_number}` : 'Platform update'}{entry.created_at ? ` • ${entry.created_at}` : ''}
                                            </p>
                                        </div>
                                        <div className={`shrink-0 text-[14px] font-black ${entry.direction === 'credit' ? 'text-emerald-400' : 'text-[#e37f7a]'}`}>
                                            {entry.direction === 'credit' ? '+' : '-'}{formatMoney(entry.amount)}
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="flex flex-1 flex-col justify-center rounded-2xl border border-dashed border-white/10 p-6 text-center">
                                    <p className="text-[13px] font-bold text-stone-300">No recent activity.</p>
                                    <p className="mt-1 text-[12px] text-stone-500">Completed order credits appear here.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-8 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-gray-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Seller Wallet Withdrawals</h3>
                        <p className="mt-1 text-[13px] font-medium text-gray-500">
                            Review withdrawal requests coming from settled online Delivery earnings.
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-1.5 text-[11px] font-bold tracking-wide text-stone-500 ring-1 ring-inset ring-stone-200">
                        <Banknote size={14} className="opacity-70" />
                        {pendingWalletWithdrawals?.length || 0} tracked request{(pendingWalletWithdrawals?.length || 0) === 1 ? '' : 's'}
                    </div>
                </div>

                {pendingWalletWithdrawals?.length ? (
                    <div className="divide-y divide-gray-100">
                        {pendingWalletWithdrawals.map((request) => (
                            <div key={request.id} className="px-6 py-5">
                                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start gap-3">
                                            <UserAvatar user={request.user} className="w-11 h-11 border border-clay-200" />
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-[15px] font-bold text-gray-900">{request.user?.shop_name || request.user?.name}</p>
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                                        request.status === 'approved'
                                                            ? 'bg-emerald-50 text-emerald-700'
                                                            : request.status === 'rejected'
                                                                ? 'bg-red-50 text-red-700'
                                                                : 'bg-amber-50 text-amber-700'
                                                    }`}>
                                                        {request.status}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-[13px] font-medium text-gray-500">
                                                    Requested by {request.user?.name} • {request.created_at}
                                                </p>
                                                <p className="mt-2 text-[12px] font-medium text-gray-600">
                                                    Amount: <span className="font-bold text-gray-900">{formatMoney(request.amount)}</span>
                                                </p>
                                                {request.note && (
                                                    <p className="mt-2 text-[12px] leading-relaxed text-gray-600">
                                                        {request.note}
                                                    </p>
                                                )}
                                                {request.rejection_reason && (
                                                    <p className="mt-2 text-[12px] leading-relaxed text-red-700">
                                                        Rejection reason: {request.rejection_reason}
                                                    </p>
                                                )}
                                                {request.reviewed_by_name && (
                                                    <p className="mt-2 text-[12px] font-medium text-gray-500">
                                                        Reviewed by {request.reviewed_by_name}{request.reviewed_at ? ` • ${request.reviewed_at}` : ''}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {request.status === 'pending' && (
                                        <div className="w-full xl:w-[320px] rounded-2xl border border-gray-100 bg-stone-50 p-4">
                                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">Review Actions</p>
                                            <textarea
                                                value={rejectionReasons[request.id] || ''}
                                                onChange={(event) => setRejectionReasons((current) => ({ ...current, [request.id]: event.target.value }))}
                                                rows={3}
                                                placeholder="Reason if rejecting"
                                                className="mt-3 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-medium text-stone-700 placeholder:text-stone-300 focus:border-clay-400 focus:ring-clay-400"
                                            />
                                            {rejectingWithdrawalId === request.id && !(rejectionReasons[request.id] || '').trim() && (
                                                <p className="mt-2 text-[12px] font-bold text-red-600">A rejection reason is required.</p>
                                            )}
                                            <div className="mt-3 flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => approveSellerWithdrawal(request.id)}
                                                    className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => rejectSellerWithdrawal(request.id)}
                                                    className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="px-6 py-10 text-center">
                        <p className="text-sm font-bold text-gray-900">No seller wallet withdrawals yet.</p>
                        <p className="mt-1 text-[13px] font-medium text-gray-500">
                            Pending payout reviews will appear here once sellers submit withdrawal requests.
                        </p>
                    </div>
                )}
            </div>

            {/* Quick Actions (Pending Sponsorships) */}
            {metrics.pendingSponsorships > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-white border border-amber-100 rounded-2xl p-5 sm:p-6 mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-amber-100 rounded-full opacity-50 blur-xl group-hover:scale-150 transition-transform duration-700"></div>

                    <div className="flex items-center gap-4 sm:gap-6 relative z-10">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-amber-100">
                            <Clock
                                size={28}
                                className="text-amber-500"
                            />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg">
                                Pending Sponsorships
                            </h3>
                            <p className="text-sm text-gray-600 mt-0.5">
                                <span className="font-bold text-amber-700">{metrics.pendingSponsorships}</span> sponsorship request{metrics.pendingSponsorships > 1 ? "s" : ""} awaiting your approval.
                            </p>
                        </div>
                    </div>
                    <Link
                        href={route("admin.sponsorships")}
                        className="relative z-10 flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition shadow-lg shadow-amber-200"
                    >
                        Review Requests <ChevronRight size={16} />
                    </Link>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                {/* Recent Plan Changes */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="font-bold text-gray-900 text-lg">
                            Recent Plan Changes
                        </h3>
                        <Link
                            href={route("admin.users")}
                            className="text-xs text-clay-600 font-bold hover:text-clay-800 transition flex items-center gap-1"
                        >
                            All Users <ChevronRight size={14} />
                        </Link>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full min-w-[720px]">
                            <thead className="bg-stone-50">
                                <tr>
                                    <th className="px-6 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        Artisan
                                    </th>
                                    <th className="px-6 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        Plan Change
                                    </th>
                                    <th className="px-6 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        Date
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {recentSubscribers.length > 0 ? recentSubscribers.map((user) => (
                                    <tr key={user.id} className="hover:bg-stone-50 transition">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-3">
                                                <UserAvatar user={user} className="w-9 h-9 border border-clay-200" />
                                                <div className="min-w-0 text-left">
                                                    <p className="font-bold text-gray-900 text-sm">
                                                        {user.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {user.shop_name || "No Shop Name"}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide ${
                                                    changeDirectionBadgeClasses[user.change_direction] || changeDirectionBadgeClasses.change
                                                }`}>
                                                    {user.change_direction === 'upgrade' && <TrendingUp size={12} />}
                                                    {user.change_direction === 'downgrade' && <TrendingDown size={12} />}
                                                    {user.change_direction === 'change' && <Minus size={12} />}
                                                    {user.change_direction}
                                                </span>

                                                <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-stone-500">
                                                    <span className="text-stone-500">{user.previous_tier_label || 'Free'}</span>
                                                    <ChevronRight size={12} className="text-stone-300" />
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide ${
                                                        planTierBadgeClasses[user.tier] || planTierBadgeClasses.Free
                                                    }`}>
                                                        {user.tier}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500 font-medium text-center">
                                            <div className="space-y-1">
                                                <div>{user.date}</div>
                                                <div className="text-[10px] text-stone-400">{user.change_label}</div>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-8 text-center text-sm text-gray-500">
                                            No recent plan changes found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Sponsorships */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="font-bold text-gray-900 text-lg">
                            Recent Sponsorships
                        </h3>
                        <Link
                            href={route("admin.sponsorships")}
                            className="text-xs text-clay-600 font-bold hover:text-clay-800 transition flex items-center gap-1"
                        >
                            All Sponsorships <ChevronRight size={14} />
                        </Link>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full min-w-[720px]">
                            <thead className="bg-stone-50">
                                <tr>
                                    <th className="px-6 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        Artisan
                                    </th>
                                    <th className="px-6 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        Date
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {recentSponsorships.length > 0 ? recentSponsorships.map((req) => (
                                    <tr key={req.id} className="hover:bg-stone-50 transition">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-3">
                                                <UserAvatar user={req.user} className="w-9 h-9 border border-clay-200" />
                                                <div className="w-48 text-left">
                                                    <p className="font-bold text-gray-900 text-sm truncate" title={req.product_name}>
                                                        {req.product_name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        by {req.user.name}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide ${
                                                    req.status === "approved"
                                                        ? "bg-green-100 text-green-800 border-green-200"
                                                        : req.status === "rejected"
                                                        ? "bg-red-100 text-red-800 border-red-200"
                                                        : req.status === "cancelled"
                                                        ? "bg-gray-100 text-gray-800 border-gray-200"
                                                        : "bg-amber-100 text-amber-800 border-amber-200"
                                                }`}
                                            >
                                                {req.status === "approved" && <CheckCircle size={12} />}
                                                {req.status === "rejected" && <XCircle size={12} />}
                                                {req.status === "cancelled" && <XCircle size={12} />}
                                                {req.status === "pending" && <Clock size={12} />}
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500 font-medium text-center">
                                            {req.date}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-8 text-center text-sm text-gray-500">
                                            No recent sponsorships found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </AdminLayout>
    );
}
