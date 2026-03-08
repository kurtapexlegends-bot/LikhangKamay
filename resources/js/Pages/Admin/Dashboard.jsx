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
    CreditCard,
    BadgeCheck,
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
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
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow h-full">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                        {title}
                    </p>
                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                        {value !== undefined ? value.toLocaleString() : '0'}
                    </h3>
                </div>
                <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} text-white group-hover:scale-110 transition-transform duration-300`}
                >
                    <Icon size={20} />
                </div>
            </div>
            
            <div className="flex items-center justify-between mt-auto">
                <div className={`flex items-center gap-1 text-[10px] font-bold ${
                    isPositive ? 'text-green-600' : 
                    isNegative ? 'text-red-600' : 
                    'text-gray-500'
                }`}>
                    {isPositive ? <TrendingUp size={12} /> : 
                     isNegative ? <TrendingUp size={12} className="rotate-180" /> : 
                     <span className="w-2.5 h-[2px] bg-gray-400 rounded-full"></span>}
                    
                    <span>{growth > 0 ? '+' : ''}{growth}%</span>
                </div>
                <span className="text-[10px] font-medium text-gray-400">vs last 30 days</span>
            </div>
        </div>
    );
};

export default function AdminDashboard({ stats, recentUsers, financeStats, mrrData, recentTransactions }) {
    // Helper to safely get value for Quick Actions check
    const pendingCount = typeof stats.pendingArtisans === 'object' ? stats.pendingArtisans.value : stats.pendingArtisans;

    return (
        <AdminLayout title="Dashboard">
            {/* Dashboard Controls */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 {/* Empty for now */}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
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
                <StatCard
                    title="Total Revenue"
                    metric={`₱${Number(financeStats?.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    icon={CreditCard}
                    color="bg-emerald-600"
                    subtitle="All-time revenue"
                />
                <StatCard
                    title="Active Subscribers"
                    metric={(financeStats?.premiumSubscribers || 0) + (financeStats?.eliteSubscribers || 0)}
                    icon={BadgeCheck}
                    color="bg-indigo-600"
                    subtitle="Premium & Elite"
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

            {/* Financial Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-bold text-gray-900 text-lg mb-6">Revenue Trend (Last 6 Months)</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={mrrData || []} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(val) => `₱${val}`} width={80} />
                                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value) => [`₱${Number(value).toLocaleString()}`, 'Revenue']} />
                                <Bar dataKey="total" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
                    <h3 className="font-bold text-gray-900 text-lg mb-6">Recent Transactions</h3>
                    <div className="flex-1 overflow-y-auto pr-2">
                        {recentTransactions && recentTransactions.length > 0 ? (
                            <div className="space-y-4">
                                {recentTransactions.map((tx) => (
                                    <div key={tx.id} className="flex justify-between items-center pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                                        <div>
                                            <p className="font-bold text-sm text-gray-900">{tx.artisan?.shop_name || tx.artisan?.name || 'Unknown User'}</p>
                                            <p className="text-xs text-gray-500 capitalize">{tx.tier_purchased.replace('_', ' ')} Plan</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-emerald-600 text-sm">₱{Number(tx.amount_paid).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                            <p className="text-[10px] text-gray-400 font-medium">
                                                {new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10">
                                <CreditCard size={32} className="mb-2 opacity-30" />
                                <p className="text-sm font-medium">No transactions yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Users */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 text-lg">
                        Recent Registrations
                    </h3>
                    <Link
                        href={route("admin.users")}
                        className="text-xs text-clay-600 font-bold hover:text-clay-800 transition flex items-center gap-1"
                    >
                        View All Users <ChevronRight size={14} />
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-stone-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-6 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
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
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <UserAvatar user={user} className="w-10 h-10 border border-clay-200" />
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">
                                                    {user.name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
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
                                    <td className="px-6 py-4 text-center">
                                        {user.role === "artisan" ? (
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${
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
                                            <span className="text-gray-300 text-xs font-medium">
                                                —
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-500 font-medium">
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
