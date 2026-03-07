import React from "react";
import { Head, Link } from "@inertiajs/react";
import {
    Users,
    Store,
    Clock,
    CheckCircle,
    XCircle,
    TrendingUp,
    AlertTriangle,
    LogOut,
    ChevronRight,
    Search,
} from "lucide-react";
import AdminLayout from "@/Layouts/AdminLayout";
import UserAvatar from "@/Components/UserAvatar";

// Stat Card Component
const StatCard = ({ title, metric, icon: Icon, color, subtitle }) => {
    // Metric might be a simple number (fallback) or an object { value, growth, trend }
    const value = typeof metric === 'object' ? metric.value : metric;
    const growth = typeof metric === 'object' ? metric.growth : 0;
    const trend = typeof metric === 'object' ? metric.trend : 'neutral';

    const isPositive = trend === 'up';
    const isNegative = trend === 'down';

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 hover:shadow-md transition group h-full flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-sm font-bold text-gray-400 mb-1 uppercase tracking-wider">
                        {title}
                    </p>
                    <h3 className="text-3xl font-extrabold text-gray-800 tracking-tight">
                        {value !== undefined ? value.toLocaleString() : '0'}
                    </h3>
                </div>
                <div
                    className={`p-3 rounded-xl ${color} text-white shadow-lg shadow-gray-200 group-hover:scale-110 transition-transform duration-300`}
                >
                    <Icon size={22} />
                </div>
            </div>
            
            <div className="flex items-center justify-between">
                <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                    isPositive ? 'bg-green-50 text-green-600' : 
                    isNegative ? 'bg-red-50 text-red-600' : 
                    'bg-gray-50 text-gray-500'
                }`}>
                    {isPositive ? <TrendingUp size={14} /> : 
                     isNegative ? <TrendingUp size={14} className="rotate-180" /> : 
                     <span className="w-3 h-[2px] bg-gray-400 rounded-full"></span>}
                    
                    <span>{growth > 0 ? '+' : ''}{growth}%</span>
                </div>
                <span className="text-xs font-medium text-gray-400">vs last 30 days</span>
            </div>
        </div>
    );
};

export default function AdminDashboard({ stats, recentUsers }) {
    // Helper to safely get value for Quick Actions check
    const pendingCount = typeof stats.pendingArtisans === 'object' ? stats.pendingArtisans.value : stats.pendingArtisans;

    return (
        <AdminLayout title="Dashboard">
            {/* Dashboard Controls */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 {/* Empty for now */}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard
                    title="Total Artisans"
                    metric={stats.totalArtisans}
                    icon={Store}
                    color="bg-clay-500"
                    subtitle="Registered sellers"
                />
                <StatCard
                    title="Total Buyers"
                    metric={stats.totalBuyers}
                    icon={Users}
                    color="bg-sage-600"
                    subtitle="Shopping customers"
                />
                <StatCard
                    title="Pending Needs"
                    metric={stats.pendingArtisans}
                    icon={Clock}
                    color="bg-amber-500"
                    subtitle="Need review"
                />
                <StatCard
                    title="Active Artisans"
                    metric={stats.approvedArtisans}
                    icon={CheckCircle}
                    color="bg-green-600"
                    subtitle="Approved & verified"
                />
            </div>

            {/* Quick Actions */}
            {pendingCount > 0 && (
                <div className="bg-gradient-to-r from-clay-50 to-white border border-clay-100 rounded-2xl p-8 mb-10 flex items-center justify-between shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-clay-100 rounded-full opacity-50 blur-xl group-hover:scale-150 transition-transform duration-700"></div>

                    <div className="flex items-center gap-6 relative z-10">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-clay-100">
                            <AlertTriangle
                                size={32}
                                className="text-clay-600"
                            />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-xl">
                                Action Required
                            </h3>
                            <p className="text-gray-600 mt-1">
                                <span className="font-bold text-clay-700">{pendingCount}</span> new artisan
                                application
                                {pendingCount > 1 ? "s" : ""}{" "}
                                require your verification.
                            </p>
                        </div>
                    </div>
                    <Link
                        href={route("admin.pending")}
                        className="relative z-10 flex items-center gap-2 px-6 py-3 bg-clay-600 text-white font-medium rounded-xl hover:bg-clay-700 transition shadow-lg shadow-clay-200"
                    >
                        Review Applications <ChevronRight size={18} />
                    </Link>
                </div>
            )}

            {/* Recent Users */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="font-bold text-lg text-gray-900">
                        Recent Registrations
                    </h3>
                    <Link
                        href={route("admin.users")}
                        className="text-sm text-clay-600 font-medium hover:text-clay-800 transition flex items-center gap-1"
                    >
                        View All Users <ChevronRight size={14} />
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-stone-50">
                            <tr>
                                <th className="px-8 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-8 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-8 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-8 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    Registered
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {recentUsers.map((user) => (
                                <tr
                                    key={user.id}
                                    className="hover:bg-stone-50 transition"
                                >
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <UserAvatar user={user} className="w-12 h-12 ring-4 ring-white shadow-sm" />
                                            <div>
                                                <p className="font-bold text-gray-900">
                                                    {user.name}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span
                                            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-extrabold border shadow-sm uppercase tracking-wider ${
                                                user.role === "artisan"
                                                    ? "bg-orange-100 text-orange-800 border-orange-200"
                                                    : user.role ===
                                                        "super_admin"
                                                      ? "bg-gray-900 text-white border-gray-900"
                                                      : "bg-blue-50 text-blue-700 border-blue-100"
                                            }`}
                                        >
                                            {user.role === "artisan" && <Store size={14} />}
                                            {user.role === "super_admin" && <Users size={14} />} 
                                            {user.role === "buyer" && <Users size={14} />}

                                            {user.role === "artisan"
                                                ? "Artisan"
                                                : user.role ===
                                                    "super_admin"
                                                  ? "Admin"
                                                  : "Buyer"}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        {user.role === "artisan" ? (
                                            <span
                                                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border shadow-sm ${
                                                    user.artisan_status ===
                                                    "approved"
                                                        ? "bg-green-100 text-green-800 border-green-200"
                                                        : user.artisan_status ===
                                                            "rejected"
                                                          ? "bg-red-100 text-red-800 border-red-200"
                                                          : "bg-amber-100 text-amber-800 border-amber-200"
                                                }`}
                                            >
                                                {user.artisan_status === "approved" && <CheckCircle size={14} />}
                                                {user.artisan_status === "rejected" && <XCircle size={14} />}
                                                {user.artisan_status === "pending" && <Clock size={14} />}
                                                
                                                {user.artisan_status ===
                                                    "approved" &&
                                                    "Verified"}
                                                {user.artisan_status ===
                                                    "rejected" &&
                                                    "Rejected"}
                                                {user.artisan_status ===
                                                    "pending" &&
                                                    "Pending"}
                                            </span>
                                        ) : (
                                            <span className="text-gray-300 text-sm font-medium">
                                                —
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-8 py-5 text-sm text-gray-500 font-medium">
                                        {new Date(
                                            user.created_at,
                                        ).toLocaleDateString("en-US", {
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
