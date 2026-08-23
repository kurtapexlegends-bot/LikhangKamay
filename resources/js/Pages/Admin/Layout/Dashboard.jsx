import React, { useState, useMemo } from "react";
import { Link } from "@inertiajs/react";
import {
    Users,
    Store,
    Briefcase,
    Clock,
    CheckCircle,
    XCircle,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    ChevronRight,
    Minus,
    Sparkles,
} from "lucide-react";
import AdminLayout from "@/Layouts/AdminLayout";
import UserAvatar from "@/Components/UserAvatar";
import ActivityTicker from "@/Components/Admin/Layout/ActivityTicker";

const statusToneClasses = {
    danger: "bg-red-100 text-red-800 border-red-200",
    neutral: "bg-stone-100 text-stone-700 border-stone-200",
    success: "bg-green-100 text-green-800 border-green-200",
    warning: "bg-amber-100 text-amber-800 border-amber-200",
};

// Skeleton Loaders
const StatSkeleton = () => (
    <div className="flex items-start justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm animate-pulse">
        <div className="space-y-3 w-full">
            <div className="h-2 w-16 bg-stone-100 rounded" />
            <div className="h-6 w-24 bg-stone-100 rounded" />
            <div className="h-2 w-32 bg-stone-100 rounded mt-2" />
        </div>
        <div className="h-10 w-10 bg-stone-100 rounded-xl" />
    </div>
);

const UserRowSkeleton = () => (
    <tr className="flex flex-col sm:table-row p-4 sm:p-0 animate-pulse">
        <td className="sm:px-6 sm:py-4 mb-3 sm:mb-0">
            <div className="flex items-center gap-3">
                <div className="h-9 w-9 sm:h-10 sm:w-10 bg-stone-100 rounded-full" />
                <div className="space-y-2">
                    <div className="h-3 w-24 bg-stone-100 rounded" />
                    <div className="h-2 w-32 bg-stone-100 rounded" />
                </div>
            </div>
        </td>
        <td className="sm:px-6 sm:py-4 mb-3 sm:mb-0 text-center">
            <div className="h-5 w-16 bg-stone-100 rounded-full mx-auto" />
        </td>
        <td className="sm:px-6 sm:py-4 mb-3 sm:mb-0 text-center">
            <div className="h-5 w-20 bg-stone-100 rounded-full mx-auto" />
        </td>
        <td className="sm:px-6 sm:py-4">
            <div className="h-3 w-20 bg-stone-100 rounded mx-auto sm:mx-0" />
        </td>
        <td className="sm:px-6 sm:py-4 text-right">
            <div className="h-6 w-16 bg-stone-100 rounded-lg ml-auto" />
        </td>
    </tr>
);

// Stat Card Component
const StatCard = ({ title, metric, icon: Icon, bg, text, subtitle }) => {
    const value = typeof metric === "object" ? metric.value : metric;
    const growth = typeof metric === "object" ? metric.growth : undefined;
    const trend = typeof metric === "object" ? metric.trend : undefined;

    const derivedTrend = trend || (growth > 0 ? "up" : growth < 0 ? "down" : "neutral");

    return (
        <div className="flex items-start justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    {title}
                </p>
                <h3 className="text-2xl font-bold tracking-tight text-gray-900">
                    {value !== undefined ? value.toLocaleString() : "0"}
                </h3>

                {growth !== undefined && (
                    <div className={`mt-1 flex items-center gap-1 text-[10px] font-bold ${
                        derivedTrend === "up" ? "text-green-600" :
                        derivedTrend === "down" ? "text-red-600" : "text-gray-400"
                    }`}>
                        {derivedTrend === "up" && <TrendingUp size={12} />}
                        {derivedTrend === "down" && <TrendingDown size={12} />}
                        {derivedTrend === "neutral" && <Minus size={12} />}
                        <span>{derivedTrend === "up" ? "+" : ""}{growth}% vs last 30 days</span>
                    </div>
                )}
                {growth === undefined && subtitle && (
                    <p className="mt-1 text-[10px] font-medium text-gray-400">{subtitle}</p>
                )}
                {growth === undefined && !subtitle && (
                    <p className="mt-1 text-[10px] font-medium text-gray-400">Real-time status</p>
                )}
            </div>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${text}`}>
                <Icon size={20} />
            </div>
        </div>
    );
};

export default function AdminDashboard({ stats, recentUsers, activities }) {
    const isLoadingStats = !stats;
    const isLoadingUsers = !recentUsers;
    const isLoadingActivities = !activities;

    const [roleFilter, setRoleFilter] = useState("all");

    const filteredUsers = useMemo(() => {
        if (!recentUsers) return [];
        if (roleFilter === "all") return recentUsers;
        if (roleFilter === "pending") {
            return recentUsers.filter((u) => u.role === "artisan" && u.artisan_status === "pending");
        }
        return recentUsers.filter((u) => u.role === roleFilter);
    }, [recentUsers, roleFilter]);

    const viewAllHref = useMemo(() => {
        if (roleFilter === "pending") {
            return route("admin.users.manager", { tab: "approvals" });
        }
        if (roleFilter === "artisan" || roleFilter === "buyer" || roleFilter === "staff") {
            return route("admin.users", { role: roleFilter });
        }
        return route("admin.users");
    }, [roleFilter]);

    const pendingCount = !isLoadingStats ? (typeof stats.pendingArtisans === "object" ? stats.pendingArtisans.value : stats.pendingArtisans) : 0;

    return (
        <>
            <div className="mb-4 flex overflow-x-auto gap-4 sm:gap-6 pb-2.5 flex-nowrap snap-x snap-mandatory lg:grid lg:grid-cols-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                {isLoadingStats ? (
                    <>
                        <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                            <StatSkeleton />
                        </div>
                        <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                            <StatSkeleton />
                        </div>
                        <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                            <StatSkeleton />
                        </div>
                        <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                            <StatSkeleton />
                        </div>
                    </>
                ) : (
                    <>
                        <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                            <StatCard
                                title="Artisans"
                                metric={stats.totalArtisans}
                                icon={Store}
                                bg="bg-[#FCF7F2]"
                                text="text-clay-600"
                                subtitle="Registered"
                            />
                        </div>
                        <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                            <StatCard
                                title="Buyers"
                                metric={stats.totalBuyers}
                                icon={Users}
                                bg="bg-stone-50"
                                text="text-stone-600"
                                subtitle="Customers"
                            />
                        </div>
                        <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                            <StatCard
                                title="Pending"
                                metric={stats.pendingArtisans}
                                icon={Clock}
                                bg="bg-amber-50/70"
                                text="text-amber-800"
                                subtitle="Reviews"
                            />
                        </div>
                        <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                            <StatCard
                                title="Active"
                                metric={stats.approvedArtisans}
                                icon={CheckCircle}
                                bg="bg-emerald-50"
                                text="text-emerald-700"
                                subtitle="Verified"
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Quick action banner for pending artisan applications */}
            {pendingCount > 0 && (
                <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-amber-950">
                                    {pendingCount} Artisan Application{pendingCount > 1 ? "s" : ""} Awaiting Review
                                </h4>
                                <p className="text-xs text-amber-800/80">
                                    Newly registered artisan shops require document verification before publishing products.
                                </p>
                            </div>
                        </div>
                        <Link
                            href={route("admin.users.manager", { tab: 'approvals' })}
                            className="flex shrink-0 w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-amber-700"
                        >
                            Review Applications <ChevronRight size={14} />
                        </Link>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Recent Registrations Table */}
                <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col h-[500px]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-50 px-4 sm:px-6 py-4 shrink-0 gap-4">
                        <div className="flex items-center justify-between w-full sm:w-auto">
                            <h3 className="text-sm sm:text-base font-bold text-gray-900">
                                Recent Registrations
                            </h3>
                            <Link
                                href={viewAllHref}
                                className="sm:hidden flex items-center gap-1 text-[11px] font-bold text-clay-600 transition hover:text-clay-800"
                            >
                                View All <ChevronRight size={14} />
                            </Link>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                                {[
                                    { id: 'all', label: 'All' },
                                    { id: 'artisan', label: 'Artisans' },
                                    { id: 'buyer', label: 'Buyers' },
                                    { id: 'staff', label: 'Staff' },
                                    { id: 'pending', label: 'Pending' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setRoleFilter(tab.id)}
                                        className={`px-3 py-1 rounded-full text-[10px] font-bold border transition whitespace-nowrap min-h-[30px] ${
                                            roleFilter === tab.id
                                                ? 'bg-clay-700 border-clay-700 text-white shadow-sm'
                                                : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            <Link
                                href={viewAllHref}
                                className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-clay-600 transition hover:text-clay-800 whitespace-nowrap"
                            >
                                View All <ChevronRight size={14} />
                            </Link>
                        </div>
                    </div>
                    <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 scrollbar-thin">
                        <table className="w-full text-left sm:min-w-[760px] relative">
                        <thead className="hidden sm:table-header-group bg-stone-50 sticky top-0 z-10 border-b border-gray-100 shadow-2xs">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                    User
                                </th>
                                <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                    Role
                                </th>
                                <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                    Registered
                                </th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoadingUsers ? (
                                <>
                                    <UserRowSkeleton />
                                    <UserRowSkeleton />
                                    <UserRowSkeleton />
                                    <UserRowSkeleton />
                                </>
                            ) : filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="flex flex-col sm:table-row p-4 sm:p-0 transition hover:bg-[#FCF7F2]/40 group">
                                    <td className="sm:px-6 sm:py-4 mb-3 sm:mb-0">
                                        <div className="flex items-center gap-3">
                                            <UserAvatar user={user} className="h-9 w-9 sm:h-10 sm:w-10 border border-clay-200" />
                                            <div>
                                                <p className="text-[13px] sm:text-sm font-bold text-gray-900">
                                                    {user.name}
                                                </p>
                                                <p className="text-[11px] sm:text-xs text-gray-500 truncate max-w-[200px]">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="sm:px-6 sm:py-4 mb-3 sm:mb-0">
                                        <div className="flex items-center justify-between sm:justify-center">
                                            <span className="sm:hidden text-[10px] font-bold text-stone-400 uppercase tracking-widest">Role</span>
                                            <span
                                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider shadow-sm ${
                                                    user.role === "artisan"
                                                        ? "bg-orange-100 text-orange-800 border-orange-200"
                                                        : user.role === "staff"
                                                          ? "bg-[#F5EEE6] text-[#7A5037] border-[#E7D8C9]"
                                                          : user.role === "super_admin"
                                                            ? "bg-gray-900 text-white border-gray-900"
                                                            : "bg-blue-50 text-blue-700 border-blue-100"
                                                }`}
                                            >
                                                {user.role_label}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="sm:px-6 sm:py-4 mb-3 sm:mb-0">
                                        <div className="flex items-center justify-between sm:justify-center">
                                            <span className="sm:hidden text-[10px] font-bold text-stone-400 uppercase tracking-widest">Status</span>
                                            {user.role === "artisan" ? (
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                                                        user.artisan_status === "approved"
                                                            ? "bg-green-100 text-green-800 border-green-200"
                                                            : user.artisan_status === "rejected"
                                                            ? "bg-red-100 text-red-800 border-red-200"
                                                            : "bg-amber-100 text-amber-800 border-amber-200"
                                                    }`}
                                                >
                                                    {user.artisan_status === "approved" && "Verified"}
                                                    {user.artisan_status === "rejected" && "Rejected"}
                                                    {user.artisan_status === "pending" && "Pending"}
                                                </span>
                                            ) : user.role === "staff" ? (
                                                <span className={`text-[10px] font-bold ${statusToneClasses[user.account_state_tone] || ''}`}>
                                                    {user.account_state}
                                                </span>
                                            ) : (
                                                <span className="text-xs font-medium text-gray-300 sm:block hidden">—</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="sm:px-6 sm:py-4 text-[11px] sm:text-xs font-medium text-gray-400 whitespace-nowrap">
                                        <div className="flex items-center justify-between sm:justify-start gap-4">
                                            <span className="sm:hidden text-[10px] font-bold text-stone-400 uppercase tracking-widest">Joined</span>
                                            <span>
                                                {new Date(user.created_at).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="sm:px-6 sm:py-4 text-right whitespace-nowrap">
                                        <Link
                                            href={user.role === "artisan" && user.artisan_status === "pending" ? route("admin.users.manager", { tab: 'approvals' }) : route("admin.users.manager", { tab: 'directory' })}
                                            className="inline-flex items-center gap-1 rounded-lg bg-clay-50 hover:bg-clay-100 border border-[#E7D8C9] px-2.5 py-1 text-[10px] font-bold text-clay-700 transition active:scale-95 shadow-sm"
                                        >
                                            {user.role === "artisan" && user.artisan_status === "pending" ? "Verify" : "Manage"} <ChevronRight size={10} />
                                        </Link>
                                    </td>
                                </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center w-full block sm:table-cell">
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <Users className="h-8 w-8 text-stone-300 animate-pulse" />
                                            <p className="text-sm font-bold text-stone-600">No registrations found</p>
                                            <p className="text-xs text-stone-400">There are no recently registered users matching this role filter.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        </table>
                    </div>
                </div>

                {/* Live Activity Ticker */}
                <div className="lg:col-span-1 h-[500px]">
                    {isLoadingActivities ? (
                        <div className="h-full bg-white border border-gray-100 rounded-2xl p-6 animate-pulse">
                            <div className="h-4 w-32 bg-stone-100 rounded mb-6" />
                            <div className="space-y-6">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="flex gap-4">
                                        <div className="h-10 w-10 bg-stone-100 rounded-full shrink-0" />
                                        <div className="space-y-2 flex-1">
                                            <div className="h-3 w-full bg-stone-100 rounded" />
                                            <div className="h-2 w-24 bg-stone-100 rounded" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <ActivityTicker activities={activities} />
                    )}
                </div>
        </div>
    </>
    );
}

AdminDashboard.layout = page => <AdminLayout title="Overview">{page}</AdminLayout>;
