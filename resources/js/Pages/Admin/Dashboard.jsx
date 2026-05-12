import React from "react";
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
} from "lucide-react";
import AdminLayout from "@/Layouts/AdminLayout";
import UserAvatar from "@/Components/UserAvatar";
import ActivityTicker from "@/Components/ActivityTicker";

const statusToneClasses = {
    danger: "bg-red-100 text-red-800 border-red-200",
    neutral: "bg-stone-100 text-stone-700 border-stone-200",
    success: "bg-green-100 text-green-800 border-green-200",
    warning: "bg-amber-100 text-amber-800 border-amber-200",
};

// Stat Card Component
const StatCard = ({ title, metric, icon: Icon, bg, text, subtitle }) => {
    const value = typeof metric === "object" ? metric.value : metric;
    const growth = typeof metric === "object" ? metric.growth : undefined;
    const trend = typeof metric === "object" ? metric.trend : undefined;

    const derivedTrend = trend || (growth > 0 ? "up" : growth < 0 ? "down" : "neutral");

    return (
        <div className="flex items-start justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
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
                        <span>{derivedTrend === "up" ? "+" : ""}{growth}% vs 30 days ago</span>
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
    const pendingCount = typeof stats.pendingArtisans === "object" ? stats.pendingArtisans.value : stats.pendingArtisans;

    return (
        <>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
                <StatCard
                    title="Artisans"
                    metric={stats.totalArtisans}
                    icon={Store}
                    bg="bg-blue-50"
                    text="text-blue-600"
                    subtitle="Registered"
                />
                <StatCard
                    title="Buyers"
                    metric={stats.totalBuyers}
                    icon={Users}
                    bg="bg-purple-50"
                    text="text-purple-600"
                    subtitle="Customers"
                />
                <StatCard
                    title="Pending"
                    metric={stats.pendingArtisans}
                    icon={Clock}
                    bg="bg-amber-50"
                    text="text-amber-600"
                    subtitle="Reviews"
                />
                <StatCard
                    title="Active"
                    metric={stats.approvedArtisans}
                    icon={CheckCircle}
                    bg="bg-green-50"
                    text="text-green-600"
                    subtitle="Verified"
                />
            </div>

            {pendingCount > 0 && (
                <div className="mb-8 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/50 shadow-sm transition hover:shadow-md">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 border border-amber-200">
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-amber-900">
                                    Action Required
                                </h3>
                                <p className="mt-0.5 text-xs font-medium text-amber-700">
                                    <span className="font-bold">{pendingCount}</span> new artisan application{pendingCount > 1 ? "s" : ""} require your verification.
                                </p>
                            </div>
                        </div>
                        <Link
                            href={route("admin.pending")}
                            className="flex shrink-0 w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-amber-700"
                        >
                            Review Applications <ChevronRight size={14} />
                        </Link>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Recent Registrations Table */}
                <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col">
                    <div className="flex items-center justify-between border-b border-gray-50 px-4 sm:px-6 py-3.5 sm:py-5 shrink-0">
                        <h3 className="text-sm sm:text-lg font-bold text-gray-900">
                            Recent Registrations
                        </h3>
                        <Link
                            href={route("admin.users")}
                            className="flex items-center gap-1 text-[11px] font-bold text-clay-600 transition hover:text-clay-800"
                        >
                            View All <ChevronRight size={14} />
                        </Link>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left sm:min-w-[760px]">
                        <thead className="hidden sm:table-header-group bg-stone-50">
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
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {recentUsers.map((user) => (
                                <tr key={user.id} className="flex flex-col sm:table-row p-4 sm:p-0 transition hover:bg-stone-50">
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
                                    <td className="sm:px-6 sm:py-4 text-[11px] sm:text-xs font-medium text-gray-400">
                                        <div className="flex items-center justify-between sm:justify-start">
                                            <span className="sm:hidden text-[10px] font-bold text-stone-400 uppercase tracking-widest">Joined</span>
                                            {new Date(user.created_at).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Live Activity Ticker */}
            <div className="lg:col-span-1 h-[500px]">
                <ActivityTicker activities={activities} />
            </div>
        </div>
    </>
    );
}

AdminDashboard.layout = page => <AdminLayout title="Overview">{page}</AdminLayout>;
