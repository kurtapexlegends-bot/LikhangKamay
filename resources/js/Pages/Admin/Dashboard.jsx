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

export default function AdminDashboard({ stats, recentUsers }) {
    const pendingCount = typeof stats.pendingArtisans === "object" ? stats.pendingArtisans.value : stats.pendingArtisans;

    return (
        <AdminLayout title="Overview">
            <div className="mb-8 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Artisans"
                    metric={stats.totalArtisans}
                    icon={Store}
                    bg="bg-blue-100"
                    text="text-blue-600"
                    subtitle="Registered sellers"
                />
                <StatCard
                    title="Total Buyers"
                    metric={stats.totalBuyers}
                    icon={Users}
                    bg="bg-purple-100"
                    text="text-purple-600"
                    subtitle="Shopping customers"
                />
                <StatCard
                    title="Pending Needs"
                    metric={stats.pendingArtisans}
                    icon={Clock}
                    bg="bg-amber-100"
                    text="text-amber-600"
                    subtitle="Need review"
                />
                <StatCard
                    title="Active Artisans"
                    metric={stats.approvedArtisans}
                    icon={CheckCircle}
                    bg="bg-green-100"
                    text="text-green-600"
                    subtitle="Approved & verified"
                />
            </div>

            {pendingCount > 0 && (
                <div className="group relative mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between overflow-hidden rounded-2xl border border-clay-100 bg-gradient-to-r from-clay-50 to-white p-5 sm:p-8 shadow-sm">
                    <div className="absolute right-0 top-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-clay-100 opacity-50 blur-xl transition-transform duration-700 group-hover:scale-150"></div>

                    <div className="relative z-10 flex items-center gap-4 sm:gap-6">
                        <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border border-clay-100 bg-white shadow-sm">
                            <AlertTriangle size={32} className="text-clay-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">
                                Action Required
                            </h3>
                            <p className="mt-1 text-gray-600">
                                <span className="font-bold text-clay-700">{pendingCount}</span> new artisan
                                application
                                {pendingCount > 1 ? "s" : ""}{" "}
                                require your verification.
                            </p>
                        </div>
                    </div>
                    <Link
                        href={route("admin.pending")}
                        className="relative z-10 flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-clay-600 px-6 py-3 font-medium text-white shadow-lg shadow-clay-200 transition hover:bg-clay-700"
                    >
                        Review Applications <ChevronRight size={18} />
                    </Link>
                </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-50 px-4 sm:px-6 py-4 sm:py-5">
                    <h3 className="text-lg font-bold text-gray-900">
                        Recent Registrations
                    </h3>
                    <Link
                        href={route("admin.users")}
                        className="flex items-center gap-1 text-xs font-bold text-clay-600 transition hover:text-clay-800"
                    >
                        View All Users <ChevronRight size={14} />
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px]">
                        <thead className="bg-stone-50">
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
                                <tr key={user.id} className="transition hover:bg-stone-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <UserAvatar user={user} className="h-10 w-10 border border-clay-200" />
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">
                                                    {user.name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {user.email}
                                                </p>
                                                {user.role === "staff" && user.seller_shop_name && (
                                                    <p className="text-[11px] font-medium text-clay-600">
                                                        Staff for {user.seller_shop_name}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span
                                            className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider shadow-sm ${
                                                user.role === "artisan"
                                                    ? "bg-orange-100 text-orange-800 border-orange-200"
                                                    : user.role === "staff"
                                                      ? "bg-[#F5EEE6] text-[#7A5037] border-[#E7D8C9]"
                                                      : user.role === "super_admin"
                                                        ? "bg-gray-900 text-white border-gray-900"
                                                        : "bg-blue-50 text-blue-700 border-blue-100"
                                            }`}
                                        >
                                            {user.role === "artisan" && <Store size={14} />}
                                            {user.role === "staff" && <Briefcase size={14} />}
                                            {user.role === "super_admin" && <Users size={14} />}
                                            {user.role === "buyer" && <Users size={14} />}

                                            {user.role_label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {user.role === "artisan" ? (
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold ${
                                                    user.artisan_status === "approved"
                                                        ? "bg-green-100 text-green-800 border-green-200"
                                                        : user.artisan_status === "rejected"
                                                          ? "bg-red-100 text-red-800 border-red-200"
                                                          : "bg-amber-100 text-amber-800 border-amber-200"
                                                }`}
                                            >
                                                {user.artisan_status === "approved" && <CheckCircle size={14} />}
                                                {user.artisan_status === "rejected" && <XCircle size={14} />}
                                                {user.artisan_status === "pending" && <Clock size={14} />}

                                                {user.artisan_status === "approved" && "Verified"}
                                                {user.artisan_status === "rejected" && "Rejected"}
                                                {user.artisan_status === "pending" && "Pending"}
                                            </span>
                                        ) : user.role === "staff" ? (
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold ${
                                                    statusToneClasses[user.account_state_tone] || statusToneClasses.neutral
                                                }`}
                                            >
                                                {user.account_state}
                                            </span>
                                        ) : (
                                            <span className="text-xs font-medium text-gray-300">
                                                —
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-xs font-medium text-gray-500">
                                        {new Date(user.created_at).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
