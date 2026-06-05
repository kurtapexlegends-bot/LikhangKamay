import React from 'react';
import { Link } from '@inertiajs/react';
import { 
    CircleDollarSign, Users, Star, Award, Clock, ChevronRight, 
    TrendingUp, TrendingDown, CheckCircle, XCircle, Settings 
} from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { StatSkeleton, RowSkeleton, StatCard } from './SystemConfigSkeletons';
import { planTierBadgeClasses, changeDirectionBadgeClasses } from '@/utils/systemConfigHelpers';

export default function MonetizationDashboard({ metrics, recentSubscribers, recentSponsorships }) {
    const isLoadingMetrics = !metrics;
    const isLoadingSubscribers = !recentSubscribers;
    const isLoadingSponsorships = !recentSponsorships;

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {isLoadingMetrics ? (
                    <>
                        <StatSkeleton />
                        <StatSkeleton />
                        <StatSkeleton />
                        <StatSkeleton />
                    </>
                ) : (
                    <>
                        <StatCard
                            title="Plan MRR"
                            metric={metrics.mrr}
                            prefix="₱"
                            icon={CircleDollarSign}
                            bg="bg-emerald-50"
                            text="text-emerald-600"
                            subtitle={metrics.mrr?.basis}
                        />
                        <StatCard
                            title="Paid Subs"
                            metric={metrics.subscribers?.total_paid || 0}
                            icon={Users}
                            bg="bg-blue-50"
                            text="text-blue-600"
                            subtitle={`${(metrics.subscribers?.premium || 0) + (metrics.subscribers?.elite || 0)} active`}
                        />
                        <StatCard
                            title="Elite Only"
                            metric={metrics.subscribers?.elite || 0}
                            icon={Star}
                            bg="bg-fuchsia-50"
                            text="text-fuchsia-600"
                        />
                        <StatCard
                            title="Sponsored"
                            metric={metrics.sponsorships}
                            icon={Award}
                            bg="bg-amber-50"
                            text="text-amber-600"
                        />
                    </>
                )}
            </div>

            {/* Monetization Actions */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar flex-nowrap">
                <Link
                    href={route("admin.sponsorships")}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-stone-200 bg-white px-3 py-2 text-[10px] font-bold text-stone-600 transition-colors hover:bg-stone-50 min-h-[40px] shadow-sm shrink-0"
                >
                    <Award size={12} />
                    Sponsorship Queue
                </Link>
                <Link
                    href={route("admin.users", { role: "artisan" })}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-stone-200 bg-white px-3 py-2 text-[10px] font-bold text-stone-600 transition-colors hover:bg-stone-50 min-h-[40px] shadow-sm shrink-0"
                >
                    <Users size={12} />
                    Review Plans
                </Link>
                {!isLoadingMetrics && (
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-[10px] font-bold text-stone-500 min-h-[40px] shrink-0">
                        <CircleDollarSign size={12} />
                        {metrics.pendingSponsorships > 0 ? `${metrics.pendingSponsorships} pending` : 'No backlog'}
                    </span>
                )}
            </div>

            {/* Pending Sponsorship Notice */}
            {!isLoadingMetrics && metrics.pendingSponsorships > 0 && (
                <div className="flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-100 bg-white shrink-0">
                            <Clock size={16} className="text-amber-500" />
                        </div>
                        <div>
                            <h3 className="font-bold text-stone-900 text-sm">Pending Sponsorships</h3>
                            <p className="text-[11px] text-stone-600 mt-0.5">
                                There are <span className="font-bold text-amber-700">{metrics.pendingSponsorships}</span> request(s) awaiting review.
                            </p>
                        </div>
                    </div>
                    <Link
                        href={route("admin.sponsorships")}
                        className="flex items-center justify-center gap-1 rounded-lg bg-amber-500 px-4 py-2.5 text-[11px] font-bold text-white transition hover:bg-amber-600 min-h-[44px]"
                    >
                        Review Requests <ChevronRight size={14} />
                    </Link>
                </div>
            )}

            {/* Logs Tables Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Recent Plan Changes */}
                <div className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-2 border-b border-stone-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="font-bold text-stone-900 text-sm">Recent Plan Changes</h3>
                        <Link
                            href={route("admin.users")}
                            className="text-[10px] text-clay-600 font-bold hover:text-clay-800 transition flex items-center gap-0.5"
                        >
                            All Users <ChevronRight size={12} />
                        </Link>
                    </div>
                    <div className="overflow-x-auto flex-1 no-scrollbar">
                        <table className="hidden md:table w-full text-left min-w-[500px]">
                            <thead className="bg-stone-50 border-b border-stone-100">
                                <tr>
                                    <th className="px-5 py-2.5 text-[9px] font-bold text-stone-400 uppercase tracking-wider">Artisan</th>
                                    <th className="px-5 py-2.5 text-center text-[9px] font-bold text-stone-400 uppercase tracking-wider">Plan Change</th>
                                    <th className="px-5 py-2.5 text-right text-[9px] font-bold text-stone-400 uppercase tracking-wider">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {isLoadingSubscribers ? (
                                    <>
                                        <RowSkeleton />
                                        <RowSkeleton />
                                        <RowSkeleton />
                                    </>
                                ) : recentSubscribers.length > 0 ? recentSubscribers.map((user) => (
                                    <tr key={user.id} className="hover:bg-stone-50/50 transition">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                <UserAvatar user={user} className="w-8 h-8 border border-clay-100" />
                                                <div className="min-w-0">
                                                    <p className="font-bold text-stone-900 text-xs">{user.name}</p>
                                                    <p className="text-[10px] text-stone-500 truncate max-w-[120px]">{user.shop_name || "No Shop"}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="flex items-center gap-1 text-[9px] font-bold text-stone-400">
                                                    <span className="bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">{user.previous_tier_label || 'Free'}</span>
                                                    <ChevronRight size={8} />
                                                    <span className={`px-1.5 py-0.5 rounded border ${planTierBadgeClasses[user.tier] || planTierBadgeClasses.Free}`}>
                                                        {user.tier}
                                                    </span>
                                                </div>
                                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black border uppercase tracking-wider ${
                                                    changeDirectionBadgeClasses[user.change_direction] || changeDirectionBadgeClasses.change
                                                }`}>
                                                    {user.change_direction === 'upgrade' && <TrendingUp size={8} />}
                                                    {user.change_direction === 'downgrade' && <TrendingDown size={8} />}
                                                    {user.change_direction}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-[10px] text-stone-500 text-right font-medium">
                                            <div className="font-bold text-stone-900">{user.date}</div>
                                            <div className="text-[8px] text-stone-400 mt-0.5">{user.change_label}</div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="3" className="px-5 py-8 text-center">
                                            <WorkspaceEmptyState
                                                compact
                                                icon={TrendingUp}
                                                title="No recent plan changes"
                                                description="Subscription plan changes will appear here."
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        <div className="md:hidden divide-y divide-stone-100">
                            {isLoadingSubscribers ? (
                                <>
                                    <div className="p-4 space-y-2 animate-pulse">
                                        <div className="h-4 bg-stone-100 rounded w-1/3"></div>
                                        <div className="h-3 bg-stone-100 rounded w-1/2"></div>
                                    </div>
                                    <div className="p-4 space-y-2 animate-pulse">
                                        <div className="h-4 bg-stone-100 rounded w-1/3"></div>
                                        <div className="h-3 bg-stone-100 rounded w-1/2"></div>
                                    </div>
                                </>
                            ) : recentSubscribers.length > 0 ? recentSubscribers.map((user) => (
                                <div key={user.id} className="p-4 space-y-3 hover:bg-stone-50/50 transition">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <UserAvatar user={user} className="w-8 h-8 border border-clay-100" />
                                            <div>
                                                <p className="font-bold text-stone-900 text-xs">{user.name}</p>
                                                <p className="text-[10px] text-stone-500">{user.shop_name || "No Shop"}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-stone-900 text-[10px]">{user.date}</div>
                                            <div className="text-[8px] text-stone-400 mt-0.5">{user.change_label}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between bg-stone-50 p-2 rounded-lg border border-stone-100/50">
                                        <span className="text-[8px] font-bold text-stone-400 uppercase tracking-wider">Tier Shift</span>
                                        <div className="flex items-center gap-1.5 text-[9px] font-bold">
                                            <span className="bg-stone-200/60 text-stone-600 px-1.5 py-0.5 rounded border border-stone-200">{user.previous_tier_label || 'Free'}</span>
                                            <ChevronRight size={8} />
                                            <span className={`px-1.5 py-0.5 rounded border ${planTierBadgeClasses[user.tier] || planTierBadgeClasses.Free}`}>
                                                {user.tier}
                                            </span>
                                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black border uppercase tracking-wider ml-1 ${
                                                changeDirectionBadgeClasses[user.change_direction] || changeDirectionBadgeClasses.change
                                            }`}>
                                                {user.change_direction === 'upgrade' && <TrendingUp size={8} />}
                                                {user.change_direction === 'downgrade' && <TrendingDown size={8} />}
                                                {user.change_direction}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-6 text-center">
                                    <WorkspaceEmptyState
                                        compact
                                        icon={TrendingUp}
                                        title="No recent plan changes"
                                        description="Subscription plan changes will appear here."
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Sponsorships */}
                <div className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-2 border-b border-stone-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="font-bold text-stone-900 text-sm">Recent Sponsorships</h3>
                        <Link
                            href={route("admin.sponsorships")}
                            className="text-[10px] text-clay-600 font-bold hover:text-clay-800 transition flex items-center gap-0.5"
                        >
                            All Sponsorships <ChevronRight size={12} />
                        </Link>
                    </div>
                    <div className="overflow-x-auto flex-1 no-scrollbar">
                        <table className="hidden md:table w-full text-left min-w-[500px]">
                            <thead className="bg-stone-50 border-b border-stone-100">
                                <tr>
                                    <th className="px-5 py-2.5 text-[9px] font-bold text-stone-400 uppercase tracking-wider">Product / Artisan</th>
                                    <th className="px-5 py-2.5 text-center text-[9px] font-bold text-stone-400 uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-2.5 text-right text-[9px] font-bold text-stone-400 uppercase tracking-wider">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {isLoadingSponsorships ? (
                                    <>
                                        <RowSkeleton />
                                        <RowSkeleton />
                                        <RowSkeleton />
                                    </>
                                ) : recentSponsorships.length > 0 ? recentSponsorships.map((req) => (
                                    <tr key={req.id} className="hover:bg-stone-50/50 transition">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                <UserAvatar user={req.user} className="w-8 h-8 border border-clay-100" />
                                                <div className="min-w-0">
                                                    <p className="font-bold text-stone-900 text-xs truncate max-w-[180px]" title={req.product_name}>{req.product_name}</p>
                                                    <p className="text-[10px] text-stone-500 font-medium">by {req.user?.name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[8px] font-black border uppercase tracking-wider ${
                                                req.status === "approved"
                                                    ? "bg-green-50 text-green-700 border-green-200"
                                                    : req.status === "rejected" || req.status === "cancelled"
                                                    ? "bg-stone-100 text-stone-600 border-stone-200"
                                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                            }`}>
                                                {req.status === "approved" && <CheckCircle size={10} />}
                                                {(req.status === "rejected" || req.status === "cancelled") && <XCircle size={10} />}
                                                {req.status === "pending" && <Clock size={10} />}
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-[10px] text-stone-500 text-right font-medium">
                                            {req.date}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="3" className="px-5 py-8 text-center">
                                            <WorkspaceEmptyState
                                                compact
                                                icon={Clock}
                                                title="No recent sponsorships"
                                                description="New sponsorship request history will appear here."
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        <div className="md:hidden divide-y divide-stone-100">
                            {isLoadingSponsorships ? (
                                <>
                                    <div className="p-4 space-y-2 animate-pulse">
                                        <div className="h-4 bg-stone-100 rounded w-1/3"></div>
                                        <div className="h-3 bg-stone-100 rounded w-1/2"></div>
                                    </div>
                                    <div className="p-4 space-y-2 animate-pulse">
                                        <div className="h-4 bg-stone-100 rounded w-1/3"></div>
                                        <div className="h-3 bg-stone-100 rounded w-1/2"></div>
                                    </div>
                                </>
                            ) : recentSponsorships.length > 0 ? recentSponsorships.map((req) => (
                                <div key={req.id} className="p-4 space-y-2.5 hover:bg-stone-50/50 transition">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <UserAvatar user={req.user} className="w-8 h-8 border border-clay-100" />
                                            <div className="min-w-0">
                                                <p className="font-bold text-stone-900 text-xs truncate max-w-[150px]" title={req.product_name}>{req.product_name}</p>
                                                <p className="text-[10px] text-stone-500 font-medium">by {req.user?.name}</p>
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[8px] font-black border uppercase tracking-wider shrink-0 ${
                                            req.status === "approved"
                                                ? "bg-green-50 text-green-700 border-green-200"
                                                : req.status === "rejected" || req.status === "cancelled"
                                                ? "bg-stone-100 text-stone-600 border-stone-200"
                                                : "bg-amber-50 text-amber-700 border-amber-200"
                                        }`}>
                                            {req.status === "approved" && <CheckCircle size={10} />}
                                            {(req.status === "rejected" || req.status === "cancelled") && <XCircle size={10} />}
                                            {req.status === "pending" && <Clock size={10} />}
                                            {req.status}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] text-stone-500 font-medium pt-1 border-t border-stone-50">
                                        <span>Submission Date</span>
                                        <span className="font-bold text-stone-900">{req.date}</span>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-6 text-center">
                                    <WorkspaceEmptyState
                                        compact
                                        icon={Clock}
                                        title="No recent sponsorships"
                                        description="New sponsorship request history will appear here."
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
