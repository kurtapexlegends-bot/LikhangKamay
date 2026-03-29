import React from "react";
import { Head, Link } from "@inertiajs/react";
import {
    Users,
    TrendingUp,
    TrendingDown,
    CircleDollarSign,
    Award,
    ChevronRight,
    Star,
    CheckCircle,
    XCircle,
    Clock,
    Minus
} from "lucide-react";
import AdminLayout from "@/Layouts/AdminLayout";
import UserAvatar from "@/Components/UserAvatar";

const formatMoney = (value) => `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
                        <span>{derivedTrend === 'up' ? '+' : ''}{growth}% vs last 30 days</span>
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

export default function Monetization({ metrics, recentSubscribers, recentSponsorships, platformWallet }) {
    
    return (
        <AdminLayout title="Monetization">
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
                <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">Platform Wallet</p>
                                <h3 className="mt-2 text-2xl font-bold text-emerald-900">{formatMoney(platformWallet.balance)}</h3>
                                <p className="mt-1 text-xs text-emerald-700">Wallet credits come from completed-order commission and delivery convenience fees.</p>
                            </div>
                            <div className="rounded-2xl bg-white/80 p-3 text-emerald-700 shadow-sm">
                                <CircleDollarSign size={22} />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Recent Wallet Activity</p>
                            <p className="mt-1 text-sm text-gray-500">Traceable commission, convenience-fee, and reversal entries for the platform.</p>
                        </div>

                        <div className="mt-4 space-y-3">
                            {platformWallet.recent_transactions?.length ? platformWallet.recent_transactions.map((entry) => (
                                <div key={entry.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-900">{entry.description || entry.category}</p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            {entry.order_number ? `Order ${entry.order_number}` : 'Platform wallet update'}{entry.created_at ? ` - ${entry.created_at}` : ''}
                                        </p>
                                    </div>
                                    <div className={`shrink-0 text-sm font-bold ${entry.direction === 'credit' ? 'text-emerald-700' : 'text-red-600'}`}>
                                        {entry.direction === 'credit' ? '+' : '-'}{formatMoney(entry.amount)}
                                    </div>
                                </div>
                            )) : (
                                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                                    No platform wallet activity yet. New completed orders will appear here.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
                                        Tier
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
                                                <div className="text-left">
                                                    <p className="font-bold text-gray-900 text-sm">
                                                        {user.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {user.shop_name || "No Shop Name"}
                                                    </p>
                                                    {user.previous_tier && (
                                                        <p className="text-[10px] text-gray-400">
                                                            {user.previous_tier} to {user.tier}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide
                                                ${user.tier === 'Elite' 
                                                    ? 'bg-gradient-to-r from-fuchsia-100 to-purple-100 text-fuchsia-800 border-fuchsia-200' 
                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}
                                            >
                                                {user.tier}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500 font-medium text-center">
                                            {user.date}
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
