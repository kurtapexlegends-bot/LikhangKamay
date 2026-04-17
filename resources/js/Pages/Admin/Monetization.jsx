import React from "react";
import { Link, usePage } from "@inertiajs/react";
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
import WorkspaceEmptyState from "@/Components/WorkspaceEmptyState";

const formatMoney = (value) => `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const planTierBadgeClasses = {
    Elite: 'bg-violet-50 text-violet-700 border-violet-200',
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
        <div className="flex items-start justify-between rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-stone-300">
            <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    {title}
                </p>
                <h3 className="text-2xl font-bold tracking-tight text-gray-900">
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
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${text}`}>
                <Icon size={20} />
            </div>
        </div>
    );
};

export default function Monetization({ metrics, recentSubscribers, recentSponsorships }) {
    const { flash } = usePage().props;

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

            <div className="mb-8 flex flex-wrap items-center gap-2">
                <Link
                    href={route("admin.sponsorships")}
                    className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-bold text-stone-600 transition-colors hover:bg-stone-50"
                >
                    <Award size={13} />
                    Open sponsorship queue
                </Link>
                <Link
                    href={route("admin.users", { role: "artisan" })}
                    className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-bold text-stone-600 transition-colors hover:bg-stone-50"
                >
                    <Users size={13} />
                    Review artisan plans
                </Link>
                <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-[11px] font-bold text-stone-500">
                    <CircleDollarSign size={13} />
                    {metrics.pendingSponsorships > 0 ? `${metrics.pendingSponsorships} request${metrics.pendingSponsorships === 1 ? '' : 's'} waiting` : 'No sponsorship backlog'}
                </span>
            </div>

            {/* Quick Actions (Pending Sponsorships) */}
            {metrics.pendingSponsorships > 0 && (
                <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="flex items-center gap-4 sm:gap-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-100 bg-white sm:h-14 sm:w-14">
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
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600 sm:w-auto"
                    >
                        Review Requests <ChevronRight size={16} />
                    </Link>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                {/* Recent Plan Changes */}
                <div className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white">
                    <div className="flex flex-col gap-3 border-b border-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
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
                                        <td colSpan="3" className="px-6 py-8 text-center">
                                            <WorkspaceEmptyState
                                                compact
                                                icon={TrendingUp}
                                                title="No recent plan changes"
                                                description="Subscription plan updates will appear here once sellers change tiers."
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Sponsorships */}
                <div className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white">
                    <div className="flex flex-col gap-3 border-b border-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
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
                                        <td colSpan="3" className="px-6 py-8 text-center">
                                            <WorkspaceEmptyState
                                                compact
                                                icon={Clock}
                                                title="No recent sponsorships"
                                                description="New sponsorship activity will appear here once requests are submitted."
                                            />
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
