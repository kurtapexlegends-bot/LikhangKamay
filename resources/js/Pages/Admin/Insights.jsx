import React from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    TrendingUp, TrendingDown, Minus,
    Activity, AlertTriangle, UserX,
    ShoppingBag, Star, ClipboardCheck, Users,
    ChevronRight, BarChart2
} from 'lucide-react';
import {
    ResponsiveContainer,
    LineChart, Line,
    BarChart, Bar,
    XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import AdminLayout from '@/Layouts/AdminLayout';
import UserAvatar from '@/Components/UserAvatar';

// ---- Custom Recharts Tooltip Styling ----
const CustomTooltip = ({ active, payload, label, prefix = '' }) => {
    if (active && payload?.length) {
        return (
            <div className="bg-white border border-gray-100 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] px-4 py-3">
                <p className="font-bold text-gray-900 text-[11px] uppercase tracking-wider mb-2">{label}</p>
                {payload.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></div>
                        <p className="text-sm font-bold text-gray-800">
                            {p.name}: <span className="font-semibold text-gray-600">{prefix}₱{p.value.toLocaleString()}</span>
                        </p>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const BarTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
        return (
            <div className="bg-white border border-gray-100 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] px-4 py-3">
                <p className="font-bold text-gray-900 text-[11px] uppercase tracking-wider mb-2">{label}</p>
                {payload.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></div>
                        <p className="text-sm font-bold text-gray-800">
                            {p.name}: <span className="font-semibold text-gray-600">{p.name === 'GMV' ? '₱' : ''}{Number(p.value).toLocaleString()}</span>
                        </p>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

// ---- Standardized Stat Card ----
const StatCard = ({ title, metric, icon: Icon, bg, text, growth, trend, subtitle }) => {
    const derivedTrend = trend || (growth > 0 ? 'up' : growth < 0 ? 'down' : 'neutral');

    return (
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                    {title}
                </p>
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                    {metric !== undefined && typeof metric === 'number' ? metric.toLocaleString(undefined, { maximumFractionDigits: 2 }) : metric}
                </h3>
                
                {growth !== undefined && (
                    <div className={`flex items-center gap-1 text-[10px] font-bold mt-1 ${
                        derivedTrend === 'up' ? 'text-green-600' : 
                        derivedTrend === 'down' ? 'text-red-600' : 'text-gray-400'
                    }`}>
                        {derivedTrend === 'up' && <TrendingUp size={12}/>}
                        {derivedTrend === 'down' && <TrendingDown size={12}/>}
                        {derivedTrend === 'neutral' && <Minus size={12}/>}
                        <span>{derivedTrend === 'up' ? '+' : ''}{growth}% trend</span>
                    </div>
                )}
                {growth === undefined && subtitle && (
                    <p className="text-[10px] font-medium text-gray-400 mt-1">{subtitle}</p>
                )}
                {growth === undefined && !subtitle && (
                    <p className="text-[10px] font-medium text-gray-400 mt-1">Real-time status</p>
                )}
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} ${text}`}>
                <Icon size={20} />
            </div>
        </div>
    );
};

export default function Insights({ revenue, churn, categories, health }) {
    const maxGmv = categories.length > 0 ? Math.max(...categories.map(c => c.gmv)) : 1;

    return (
        <AdminLayout title="Platform Insights">
            <Head title="Insights - Admin" />

                {/* ====================== SECTION 1 & 2: REVENUE FORECASTING & CATEGORY HEATMAP ====================== */}
                <section className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard
                            title="Current Est. MRR"
                            metric={`₱${revenue.currentMRR}`}
                            icon={TrendingUp}
                            bg="bg-indigo-50"
                            text="text-indigo-600"
                            subtitle="Based on active premium subscriptions"
                        />
                        <StatCard
                            title="Forecasted Next Month"
                            metric={`₱${revenue.forecastedMRR}`}
                            growth={revenue.growthRate}
                            icon={Activity}
                            bg="bg-green-50"
                            text="text-green-600"
                        />
                        <StatCard
                            title="Avg Monthly MRR Growth"
                            metric={`${revenue.growthRate > 0 ? '+' : ''}${revenue.growthRate}%`}
                            icon={BarChart2}
                            bg={revenue.growthRate > 0 ? 'bg-emerald-50' : revenue.growthRate < 0 ? 'bg-red-50' : 'bg-gray-50'}
                            text={revenue.growthRate > 0 ? 'text-emerald-600' : revenue.growthRate < 0 ? 'text-red-500' : 'text-gray-500'}
                            subtitle="Trailing average over last 3 months"
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 6-Month MRR History */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between h-[84px]">
                                <h3 className="font-bold text-gray-900 text-lg">6-Month MRR History</h3>
                            </div>
                            <div className="p-6 flex-grow flex items-center">
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={revenue.history} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }} tickFormatter={v => `₱${v}`} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f3f4f6', strokeWidth: 2 }} />
                                        <Line type="monotone" dataKey="mrr" name="MRR" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#8b5cf6' }} activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }} animationDuration={1000} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Category Performance */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between h-[84px]">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                        <ShoppingBag className="text-orange-500" size={20} />
                                        Category Performance
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1">Top product categories driving Gross Merchandise Value (GMV)</p>
                                </div>
                            </div>
                            <div className="p-6 flex-grow flex items-center">
                                {categories.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart
                                            data={categories}
                                            layout="vertical"
                                            margin={{ top: 0, right: 0, bottom: 0, left: 40 }}
                                        >
                                            <XAxis type="number" hide />
                                            <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4b5563', fontWeight: 600 }} width={120} />
                                            <Tooltip content={<BarTooltip />} cursor={{ fill: '#f9fafb' }} />
                                            <Bar dataKey="gmv" name="GMV" fill="#ea580c" radius={[0, 4, 4, 0]} barSize={16}>
                                                {/* Subdued text label rendering the value directly inside or outside the bar could go here, tooltips handle it well enough for now */}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full text-center">
                                        <p className="text-sm font-semibold text-gray-500">No category data available yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ====================== SECTION 3: PLATFORM HEALTH & CHURN ====================== */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Platform Health Stats */}
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <StatCard
                                title="Order Completion Rate"
                                metric={`${health.completionRate}%`}
                                subtitle={`${health.completedOrders} of ${health.totalOrders} total`}
                                icon={ClipboardCheck}
                                bg="bg-blue-50"
                                text="text-blue-600"
                            />
                            <StatCard
                                title="Average Order Value"
                                metric={`₱${Number(health.aov)}`}
                                subtitle="From completed orders"
                                icon={TrendingUp}
                                bg="bg-blue-50"
                                text="text-blue-600"
                            />
                            <StatCard
                                title="Review Rate"
                                metric={`${health.reviewRate}%`}
                                subtitle="Reviews per completed order"
                                icon={Star}
                                bg="bg-amber-50"
                                text="text-amber-500"
                            />
                            <StatCard
                                title="Refund Rate"
                                metric={`${health.refundRate}%`}
                                subtitle="Orders refunded"
                                icon={AlertTriangle}
                                bg={health.refundRate > 5 ? 'bg-red-50' : 'bg-gray-50'}
                                text={health.refundRate > 5 ? 'text-red-600' : 'text-gray-400'}
                            />
                        </div>

                        {/* Artisan Churn Overview */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg mb-1">Artisan Engagement</h3>
                                <p className="text-sm text-gray-500">Tracking activity based on last login (30 / 60 / 60+ days)</p>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-green-600 leading-none mb-1">{churn.active}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-amber-500 leading-none mb-1">{churn.atRisk}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">At Risk</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-red-500 leading-none mb-1">{churn.churned}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Churned</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* At Risk List Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-50">
                            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                <AlertTriangle className="text-amber-500" size={20} />
                                At-Risk Artisans
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">Inactive for 30-60 days. Immediate follow-up recommended.</p>
                        </div>
                        <div className="overflow-x-auto">
                            {churn.atRiskList?.length > 0 ? (
                                <table className="w-full">
                                    <thead className="bg-stone-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Artisan</th>
                                            <th className="px-6 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tier</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Last Seen</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {churn.atRiskList.map(artisan => (
                                            <tr key={artisan.id} className="hover:bg-stone-50 transition">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <UserAvatar user={artisan} className="w-8 h-8 rounded-full border border-gray-200" />
                                                        <div>
                                                            <p className="font-bold text-gray-900 text-sm">{artisan.name}</p>
                                                            <p className="text-[10px] text-gray-500">{artisan.shop_name}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {artisan.premium_tier === 'super_premium' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700">Premium+</span>}
                                                    {artisan.premium_tier === 'premium' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">Premium</span>}
                                                    {artisan.premium_tier !== 'premium' && artisan.premium_tier !== 'super_premium' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500">Free</span>}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">
                                                        {artisan.last_seen}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="px-6 py-12 text-center bg-green-50/50">
                                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <ClipboardCheck size={24} />
                                    </div>
                                    <p className="text-sm font-bold text-green-800">No At-Risk Artisans</p>
                                    <p className="text-xs text-green-600 mt-1">Excellent! All approved artisans have been active recently.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
                
        </AdminLayout>
    );
}
