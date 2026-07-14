import React from 'react';
import { Link } from '@inertiajs/react';
import { 
    CircleDollarSign, Users, Star, Award, Clock, ChevronRight, 
    TrendingUp, TrendingDown, CheckCircle, XCircle, ArrowRight,
    Minus, Printer, Download
} from 'lucide-react';
import ExportButton from '@/Components/ExportButton';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import KPICard from '@/Components/KPICard';
import { StatSkeleton, RowSkeleton } from './SystemConfigSkeletons';
import { planTierBadgeClasses, changeDirectionBadgeClasses } from '@/utils/systemConfigHelpers';

export default function MonetizationDashboard({ metrics, recentSubscribers, recentSponsorships }) {
    const isLoadingMetrics = !metrics;
    const isLoadingSubscribers = !recentSubscribers;
    const isLoadingSponsorships = !recentSponsorships;

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    /* Hide layout sidebar, header navigation, buttons, and system controls */
                    aside,
                    nav,
                    header,
                    .no-print,
                    .mobile-dock,
                    #nprogress,
                    .fixed,
                    button,
                    a {
                        display: none !important;
                    }

                    /* Reset layout containers margins, paddings, and heights to prevent page cutting */
                    html, body, #app, .h-screen, .overflow-hidden, [scroll-region="true"], main {
                        background: white !important;
                        color: black !important;
                        height: auto !important;
                        min-height: 0 !important;
                        overflow: visible !important;
                        position: static !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    /* Apply border styles to white boxes in print and avoid breaking */
                    .bg-white {
                        border: 1px solid #e5e7eb !important;
                        box-shadow: none !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        border-radius: 12px !important;
                    }

                    @page {
                        size: portrait;
                        margin: 12mm 15mm 12mm 15mm !important;
                    }

                    /* Grid layouts preservation under print */
                    .grid {
                        display: grid !important;
                    }
                    .lg\\:grid-cols-5 {
                        grid-template-columns: repeat(5, 1fr) !important;
                        gap: 12px !important;
                    }
                    .lg\\:grid-cols-2 {
                        grid-template-columns: repeat(2, 1fr) !important;
                        gap: 20px !important;
                    }

                    /* Spacing & layout overrides */
                    .space-y-6 > * {
                        margin-top: 16px !important;
                        margin-bottom: 0 !important;
                    }
                }
            `}} />

            {/* Print-Only Document Header */}
            <div className="hidden print:block border-b-2 border-stone-200 pb-4 mb-6">
                <h1 className="text-2xl font-bold text-stone-900">LikhangKamay Platform Monetization Report</h1>
                <p className="text-xs text-stone-500 mt-1">
                    Generated on: {new Date().toLocaleString()}
                </p>
            </div>

            {/* Print and Download Buttons (Screen-Only) */}
            <div className="flex items-center gap-2 pb-1 justify-end print:hidden">
                <ExportButton onClick={() => window.print()} icon={Printer} variant="secondary">
                    Print
                </ExportButton>
                <ExportButton href={route('admin.settings.monetization.export')} icon={Download} variant="primary">
                    Download
                </ExportButton>
            </div>
            {/* SECTION 1: STATS CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {isLoadingMetrics ? (
                    <>
                        <StatSkeleton />
                        <StatSkeleton />
                        <StatSkeleton />
                        <StatSkeleton />
                        <StatSkeleton />
                    </>
                ) : (
                    <>
                        <KPICard
                            title="Plan MRR"
                            value={metrics.mrr?.value || 0}
                            growth={metrics.mrr?.growth}
                            growthSuffix=" vs 30 days ago"
                            icon={CircleDollarSign}
                            bg="bg-emerald-50"
                            color="text-emerald-600"
                            formatter={(v) => `₱${Math.round(v).toLocaleString()}`}
                            subtitle={metrics.mrr?.basis || "Based on current active artisan plan tiers."}
                        />
                        <KPICard
                            title="Transaction Fees"
                            value={metrics.platform_fees?.value || 0}
                            growth={metrics.platform_fees?.growth}
                            growthSuffix=" vs 30 days ago"
                            icon={CircleDollarSign}
                            bg="bg-clay-50"
                            color="text-clay-600"
                            formatter={(v) => `₱${Math.round(v).toLocaleString()}`}
                            subtitle="Commission + Convenience fees"
                        />
                        <KPICard
                            title="Paid Subs"
                            value={metrics.subscribers?.total_paid || 0}
                            icon={Users}
                            bg="bg-stone-50"
                            color="text-stone-600"
                            subtitle={`${(metrics.subscribers?.premium || 0) + (metrics.subscribers?.elite || 0)} active tiers`}
                        />
                        <KPICard
                            title="Elite Only"
                            value={metrics.subscribers?.elite || 0}
                            icon={Star}
                            bg="bg-stone-50"
                            color="text-stone-600"
                            subtitle="Super Premium artisans"
                        />
                        <KPICard
                            title="Sponsored"
                            value={metrics.sponsorships?.value || 0}
                            growth={metrics.sponsorships?.growth}
                            growthSuffix=" vs 30 days ago"
                            icon={Award}
                            bg="bg-amber-50"
                            color="text-amber-600"
                            subtitle="Featured products"
                        />
                    </>
                )}
            </div>

            {/* SECTION 2: INTEGRATED ACTIONS PANEL */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 print:hidden">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <Link
                        href={route("admin.sponsorships")}
                        className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-stone-200 bg-white px-4 py-2 text-[10px] font-bold text-stone-600 transition hover:bg-stone-50 shadow-sm min-h-[38px] cursor-pointer"
                    >
                        <Award size={13} />
                        Sponsorship Queue
                    </Link>
                    <Link
                        href={route("admin.users", { role: "artisan" })}
                        className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-stone-200 bg-white px-4 py-2 text-[10px] font-bold text-stone-600 transition hover:bg-stone-50 shadow-sm min-h-[38px] cursor-pointer"
                    >
                        <Users size={13} />
                        Review Plans
                    </Link>
                </div>
                {!isLoadingMetrics && (
                    <div className="flex items-center justify-end">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-extrabold border ${
                            metrics.pendingSponsorships > 0 
                                ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' 
                                : 'bg-stone-50 text-stone-500 border-stone-250'
                        }`}>
                            <CircleDollarSign size={11} />
                            {metrics.pendingSponsorships > 0 ? `${metrics.pendingSponsorships} Requests Pending` : 'Sponsorship Backlog Clear'}
                        </span>
                    </div>
                )}
            </div>

            {/* SECTION 3: PENDING SPONSORSHIP WARNING BANNER */}
            {!isLoadingMetrics && metrics.pendingSponsorships > 0 && (
                <div className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50/40 p-5 sm:flex-row sm:items-center sm:justify-between shadow-sm animate-in slide-in-from-top-2 duration-300 print:hidden">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-100 bg-white shadow-sm shrink-0">
                            <Clock size={16} className="text-amber-500" />
                        </div>
                        <div>
                            <h3 className="font-bold text-stone-900 text-xs">Pending Sponsorship Requests</h3>
                            <p className="text-[10px] text-stone-600 mt-0.5">
                                There are <span className="font-bold text-amber-700">{metrics.pendingSponsorships}</span> request(s) awaiting review.
                            </p>
                        </div>
                    </div>
                    <Link
                        href={route("admin.sponsorships")}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-[10px] font-bold text-white transition shadow-sm min-h-[38px]"
                    >
                        <span>Review Requests</span>
                        <ChevronRight size={14} />
                    </Link>
                </div>
            )}

            {/* SECTION 4: TWO-COLUMN LOGS FEED GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Column A: Recent Plan Changes */}
                <div className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4 bg-stone-50/30">
                        <h3 className="font-bold text-stone-900 text-sm">Recent Plan Changes</h3>
                        <Link
                            href={route("admin.users")}
                            className="text-[10px] text-clay-655 font-black uppercase tracking-wider hover:underline transition flex items-center gap-1"
                        >
                            <span>All Users</span>
                            <ArrowRight size={10} />
                        </Link>
                    </div>
                    <div className="overflow-x-auto flex-grow">
                        <table className="hidden md:table w-full text-left min-w-[500px] border-collapse">
                            <thead className="bg-stone-50 border-b border-stone-100">
                                <tr>
                                    <th className="px-6 py-3 text-[9px] font-bold text-stone-400 uppercase tracking-widest">Artisan</th>
                                    <th className="px-6 py-3 text-center text-[9px] font-bold text-stone-400 uppercase tracking-widest">Plan Shift</th>
                                    <th className="px-6 py-3 text-right text-[9px] font-bold text-stone-400 uppercase tracking-widest">Date</th>
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
                                    <tr key={user.id} className="hover:bg-[#FCF7F2]/20 transition duration-150">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar user={user} className="w-8 h-8 border border-stone-200 shadow-sm" />
                                                <div className="min-w-0">
                                                    <p className="font-bold text-stone-900 text-xs tracking-tight">{user.name}</p>
                                                    <p className="text-[10px] font-medium text-stone-500 truncate max-w-[150px]">{user.shop_name || "No Shop"}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-stone-400">
                                                    <span className="bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">{user.previous_tier_label || 'Free'}</span>
                                                    <ChevronRight size={10} className="text-stone-300" />
                                                    <span className={`px-1.5 py-0.5 rounded border ${
                                                        user.tier === 'super_premium' ? 'bg-stone-900 text-white border-stone-850' :
                                                        user.tier === 'premium' ? 'bg-clay-50 text-clay-700 border-clay-200' :
                                                        'bg-stone-50 text-stone-600 border-stone-200'
                                                    }`}>
                                                        {user.tier === 'super_premium' ? 'Premium+' : user.tier}
                                                    </span>
                                                </div>
                                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black border uppercase tracking-wider ${
                                                    user.change_direction === 'upgrade' 
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                        : 'bg-stone-100 text-stone-600 border-stone-200'
                                                }`}>
                                                    {user.change_direction === 'upgrade' ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                                                    {user.change_direction}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[10px] text-stone-500 text-right font-medium">
                                            <div className="font-bold text-stone-900">{user.date}</div>
                                            <div className="text-[8px] text-stone-400 mt-0.5">{user.change_label}</div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-12 text-center">
                                            <WorkspaceEmptyState
                                                compact
                                                icon={TrendingUp}
                                                title="No plan shifts recorded"
                                                description="Artisan tier upgrades or downgrades will appear here."
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Mobile View */}
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
                                <div key={user.id} className="p-4 space-y-3 hover:bg-[#FCF7F2]/10 transition duration-150">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <UserAvatar user={user} className="w-8 h-8 border border-stone-200 shadow-sm" />
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
                                    <div className="flex items-center justify-between bg-stone-50/50 p-2 rounded-xl border border-stone-200/60">
                                        <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Tier Shift</span>
                                        <div className="flex items-center gap-1.5 text-[9px] font-bold">
                                            <span className="bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded border border-stone-200">{user.previous_tier_label || 'Free'}</span>
                                            <ChevronRight size={10} className="text-stone-300" />
                                            <span className={`px-1.5 py-0.5 rounded border ${
                                                user.tier === 'super_premium' ? 'bg-stone-900 text-white border-stone-850' :
                                                user.tier === 'premium' ? 'bg-clay-50 text-clay-700 border-clay-200' :
                                                'bg-stone-50 text-stone-600 border-stone-200'
                                            }`}>
                                                {user.tier === 'super_premium' ? 'Premium+' : user.tier}
                                            </span>
                                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black border uppercase tracking-wider ml-1 ${
                                                user.change_direction === 'upgrade' 
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                    : 'bg-stone-100 text-stone-600 border-stone-200'
                                            }`}>
                                                {user.change_direction === 'upgrade' ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-8 text-center">
                                    <WorkspaceEmptyState
                                        compact
                                        icon={TrendingUp}
                                        title="No plan shifts recorded"
                                        description="Artisan tier upgrades or downgrades will appear here."
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Column B: Recent Sponsorships */}
                <div className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4 bg-stone-50/30">
                        <h3 className="font-bold text-stone-900 text-sm">Recent Sponsorships</h3>
                        <Link
                            href={route("admin.sponsorships")}
                            className="text-[10px] text-clay-655 font-black uppercase tracking-wider hover:underline transition flex items-center gap-1"
                        >
                            <span>All Requests</span>
                            <ArrowRight size={10} />
                        </Link>
                    </div>
                    <div className="overflow-x-auto flex-grow">
                        <table className="hidden md:table w-full text-left min-w-[500px] border-collapse">
                            <thead className="bg-stone-50 border-b border-stone-100">
                                <tr>
                                    <th className="px-6 py-3 text-[9px] font-bold text-stone-400 uppercase tracking-widest">Product / Artisan</th>
                                    <th className="px-6 py-3 text-center text-[9px] font-bold text-stone-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-3 text-right text-[9px] font-bold text-stone-400 uppercase tracking-widest">Date</th>
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
                                    <tr key={req.id} className="hover:bg-[#FCF7F2]/20 transition duration-150">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar user={req.user} className="w-8 h-8 border border-stone-200 shadow-sm" />
                                                <div className="min-w-0">
                                                    <p className="font-bold text-stone-900 text-xs truncate max-w-[180px] tracking-tight" title={req.product_name}>{req.product_name}</p>
                                                    <p className="text-[10px] font-medium text-stone-500">by {req.user?.name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border uppercase tracking-wider ${
                                                req.status === "approved"
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    : req.status === "rejected" || req.status === "cancelled"
                                                    ? "bg-stone-50 text-stone-500 border-stone-250"
                                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                            }`}>
                                                {req.status === "approved" && <CheckCircle size={10} />}
                                                {(req.status === "rejected" || req.status === "cancelled") && <XCircle size={10} />}
                                                {req.status === "pending" && <Clock size={10} />}
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-[10px] text-stone-500 text-right font-medium">
                                            {req.date}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-12 text-center">
                                            <WorkspaceEmptyState
                                                compact
                                                icon={Clock}
                                                title="No sponsorships logged"
                                                description="Featured product sponsorship requests will appear here."
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Mobile View */}
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
                                <div key={req.id} className="p-4 space-y-2.5 hover:bg-[#FCF7F2]/10 transition duration-150">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <UserAvatar user={req.user} className="w-8 h-8 border border-stone-200 shadow-sm" />
                                            <div className="min-w-0">
                                                <p className="font-bold text-stone-900 text-xs truncate max-w-[150px]">{req.product_name}</p>
                                                <p className="text-[10px] text-stone-500">by {req.user?.name}</p>
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border uppercase tracking-wider shrink-0 ${
                                            req.status === "approved"
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : req.status === "rejected" || req.status === "cancelled"
                                                ? "bg-stone-50 text-stone-500 border-stone-250"
                                                : "bg-amber-50 text-amber-700 border-amber-200"
                                        }`}>
                                            {req.status === "approved" && <CheckCircle size={10} />}
                                            {(req.status === "rejected" || req.status === "cancelled") && <XCircle size={10} />}
                                            {req.status === "pending" && <Clock size={10} />}
                                            {req.status}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] text-stone-500 font-medium pt-2 border-t border-stone-100/50">
                                        <span>Submission Date</span>
                                        <span className="font-bold text-stone-900">{req.date}</span>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-8 text-center">
                                    <WorkspaceEmptyState
                                        compact
                                        icon={Clock}
                                        title="No sponsorships logged"
                                        description="Featured product sponsorship requests will appear here."
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
