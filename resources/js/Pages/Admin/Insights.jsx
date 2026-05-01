import React from 'react';
import { Head } from '@inertiajs/react';
import {
    TrendingUp, TrendingDown, Minus,
    Activity, AlertTriangle,
    ShoppingBag, Star, ClipboardCheck,
    BarChart2
} from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart, Area,
    XAxis, YAxis, Tooltip, CartesianGrid,
    PieChart, Pie, Cell
} from 'recharts';
import AdminLayout from '@/Layouts/AdminLayout';
import UserAvatar from '@/Components/UserAvatar';

// Earthy & Premium Palette
const PIE_COLORS = ['#c07251', '#d97706', '#10b981', '#78716c', '#a8a29e', '#d6d3d1'];

// ---- Premium Frosted Glass Tooltip Styling ----
const CustomTooltip = ({ active, payload, label, prefix = 'P' }) => {
    if (active && payload?.length) {
        return (
            <div className="bg-white/90 backdrop-blur-xl border border-stone-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-xl px-4 py-3">
                <p className="font-bold text-stone-900 text-[11px] uppercase tracking-wider mb-2">{label}</p>
                {payload.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></div>
                        <p className="text-sm font-bold text-stone-800">
                            {p.name}: <span className="font-semibold text-stone-500">{prefix}{Number(p.value).toLocaleString()}</span>
                        </p>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const CategoryTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
        const item = payload[0]?.payload;

        return (
            <div className="bg-white/90 backdrop-blur-xl border border-stone-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-xl px-4 py-3">
                <p className="font-bold text-stone-900 text-[11px] uppercase tracking-wider mb-2">{item?.category || 'Category'}</p>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].color }}></div>
                    <p className="text-sm font-bold text-stone-800">
                        GMV: <span className="font-semibold text-stone-500">P{Number(item?.gmv || 0).toLocaleString()}</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

// ---- Standardized Premium Stat Card ----
const StatCard = ({ title, metric, icon: Icon, bg, text, growth, trend, subtitle }) => {
    const derivedTrend = trend || (growth > 0 ? 'up' : growth < 0 ? 'down' : 'neutral');

    return (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-sm flex items-start justify-between hover:shadow-md hover:border-stone-300 transition-all group">
            <div>
                <p className="text-stone-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                    {title}
                </p>
                <h3 className="text-2xl font-bold text-stone-900 tracking-tight group-hover:text-clay-600 transition-colors">
                    {metric !== undefined && typeof metric === 'number' ? metric.toLocaleString(undefined, { maximumFractionDigits: 2 }) : metric}
                </h3>
                
                {growth !== undefined && (
                    <div className={`flex items-center gap-1 text-[10px] font-bold mt-1.5 ${
                        derivedTrend === 'up' ? 'text-emerald-600' : 
                        derivedTrend === 'down' ? 'text-red-600' : 'text-stone-400'
                    }`}>
                        {derivedTrend === 'up' && <TrendingUp size={12}/>}
                        {derivedTrend === 'down' && <TrendingDown size={12}/>}
                        {derivedTrend === 'neutral' && <Minus size={12}/>}
                        <span>{derivedTrend === 'up' ? '+' : ''}{growth}% trend</span>
                    </div>
                )}
                {growth === undefined && subtitle && (
                    <p className="text-[10px] font-medium text-stone-400 mt-1.5">{subtitle}</p>
                )}
                {growth === undefined && !subtitle && (
                    <p className="text-[10px] font-medium text-stone-400 mt-1.5">Real-time status</p>
                )}
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${bg} ${text}`}>
                <Icon size={20} />
            </div>
        </div>
    );
};

export default function Insights({ revenue, churn, categories, health }) {
    const totalCategoryGmv = categories.reduce((sum, category) => sum + Number(category.gmv || 0), 0);

    return (
        <AdminLayout title="Platform Insights">
            <Head title="Insights - Admin" />

                {/* ====================== SECTION 1 & 2: REVENUE FORECASTING & CATEGORY HEATMAP ====================== */}
                <section className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                        <StatCard
                            title="Current Est. MRR"
                            metric={`₱${revenue.currentMRR}`}
                            icon={TrendingUp}
                            bg="bg-clay-50/50 border-clay-100"
                            text="text-clay-600"
                            subtitle="Based on active premium subscriptions"
                        />
                        <StatCard
                            title="Forecasted Next Month"
                            metric={`₱${revenue.forecastedMRR}`}
                            growth={revenue.growthRate}
                            icon={Activity}
                            bg="bg-emerald-50/50 border-emerald-100"
                            text="text-emerald-600"
                        />
                        <StatCard
                            title="Avg Monthly MRR Growth"
                            metric={`${revenue.growthRate > 0 ? '+' : ''}${revenue.growthRate}%`}
                            icon={BarChart2}
                            bg={revenue.growthRate > 0 ? 'bg-emerald-50/50 border-emerald-100' : revenue.growthRate < 0 ? 'bg-amber-50/50 border-amber-100' : 'bg-stone-50/50 border-stone-100'}
                            text={revenue.growthRate > 0 ? 'text-emerald-600' : revenue.growthRate < 0 ? 'text-amber-500' : 'text-stone-500'}
                            subtitle="Trailing average over last 3 months"
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {/* 6-Month MRR History */}
                        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col">
                            <div className="px-5 sm:px-6 py-5 border-b border-stone-100 flex items-center justify-between min-h-[84px] bg-stone-50/30">
                                <div>
                                    <h3 className="font-bold text-stone-900 text-lg flex items-center gap-2">
                                        MRR Velocity
                                    </h3>
                                    <p className="text-xs font-medium text-stone-500 mt-0.5">6-Month historical recurring revenue</p>
                                </div>
                            </div>
                            <div className="p-4 sm:p-6 flex-grow flex items-center">
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={revenue.history} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                                        <defs>
                                            <linearGradient id="adminMrrFill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#c07251" stopOpacity={0.16} />
                                                <stop offset="95%" stopColor="#c07251" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#78716c', fontWeight: 600 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#78716c', fontWeight: 600 }} tickFormatter={v => `P${v}`} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f5f5f4', strokeWidth: 2 }} />
                                        <Area type="monotone" dataKey="mrr" name="MRR" stroke="#c07251" strokeWidth={3} fillOpacity={1} fill="url(#adminMrrFill)" dot={{ r: 4, fill: '#c07251', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#c07251' }} animationDuration={1000} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Category Performance */}
                        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col">
                            <div className="px-5 sm:px-6 py-5 border-b border-stone-100 flex items-center justify-between min-h-[84px] bg-stone-50/30">
                                <div>
                                    <h3 className="font-bold text-stone-900 text-lg flex items-center gap-2">
                                        <ShoppingBag className="text-clay-600" size={20} />
                                        Category Performance
                                    </h3>
                                    <p className="text-xs font-medium text-stone-500 mt-0.5">Top product categories driving Gross Merchandise Value</p>
                                </div>
                            </div>
                            <div className="p-5 sm:p-6 flex-grow flex items-center">
                                {categories.length > 0 ? (
                                    <div className="w-full">
                                        <div className="h-[220px] w-full flex items-center justify-center relative">
                                            <PieChart width={220} height={220}>
                                                <Pie
                                                    data={categories}
                                                    nameKey="category"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={58}
                                                    outerRadius={86}
                                                    paddingAngle={4}
                                                    dataKey="gmv"
                                                    stroke="none"
                                                >
                                                    {categories.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CategoryTooltip />} />
                                            </PieChart>
                                        </div>

                                        <div className="mt-3 space-y-2 pt-5 border-t border-stone-100">
                                            {categories.map((item, index) => (
                                                <div key={item.category || index} className="flex items-center justify-between text-xs group hover:bg-stone-50 p-1.5 -mx-1.5 rounded-lg transition-colors">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                                                        <span className="font-bold text-stone-700 group-hover:text-stone-900 transition-colors truncate">{item.category}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4 shrink-0">
                                                        <span className="font-bold text-stone-900">P{Number(item.gmv).toLocaleString()}</span>
                                                        <span className="text-stone-400 font-medium w-10 text-right">
                                                            {totalCategoryGmv > 0 ? Math.round((Number(item.gmv) / totalCategoryGmv) * 100) : 0}%
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full text-center py-10">
                                        <p className="text-sm font-bold text-stone-400">No category data available yet.</p>
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <StatCard
                                title="Order Completion Rate"
                                metric={`${health.completionRate}%`}
                                subtitle={`${health.completedOrders} of ${health.totalOrders} total`}
                                icon={ClipboardCheck}
                                bg="bg-stone-50/50 border-stone-200"
                                text="text-stone-600"
                            />
                            <StatCard
                                title="Average Order Value"
                                metric={`₱${Number(health.aov)}`}
                                subtitle="From completed orders"
                                icon={TrendingUp}
                                bg="bg-stone-50/50 border-stone-200"
                                text="text-stone-600"
                            />
                            <StatCard
                                title="Review Rate"
                                metric={`${health.reviewRate}%`}
                                subtitle="Reviews per completed order"
                                icon={Star}
                                bg="bg-stone-50/50 border-stone-200"
                                text="text-stone-600"
                            />
                            <StatCard
                                title="Refund Rate"
                                metric={`${health.refundRate}%`}
                                subtitle="Orders refunded"
                                icon={AlertTriangle}
                                bg={health.refundRate > 5 ? 'bg-red-50 border-red-100' : 'bg-stone-50/50 border-stone-200'}
                                text={health.refundRate > 5 ? 'text-red-600' : 'text-stone-400'}
                            />
                        </div>

                        {/* Artisan Churn Overview */}
                        <div className="bg-stone-900 rounded-2xl shadow-sm overflow-hidden p-5 sm:p-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full pointer-events-none"></div>
                            <div className="relative z-10">
                                <h3 className="font-bold text-white text-lg mb-1">Artisan Activity</h3>
                                <p className="text-[11px] font-medium text-stone-400">Tracking activity based on last active request</p>
                            </div>
                            <div className="flex items-center justify-between gap-6 sm:gap-8 w-full sm:w-auto relative z-10">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-emerald-400 leading-none mb-1.5">{churn.active}</p>
                                    <p className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">Active</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-amber-400 leading-none mb-1.5">{churn.atRisk}</p>
                                    <p className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">At Risk</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-red-400 leading-none mb-1.5">{churn.churned}</p>
                                    <p className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">Churned</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* At Risk List Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col">
                        <div className="px-5 sm:px-6 py-5 border-b border-stone-100 bg-stone-50/30">
                            <h3 className="font-bold text-stone-900 text-lg flex items-center gap-2">
                                <AlertTriangle className="text-amber-500" size={20} />
                                At-Risk Artisans
                            </h3>
                            <p className="text-xs font-medium text-stone-500 mt-0.5">No recent activity for 30-60 days. Immediate follow-up recommended.</p>
                        </div>
                        <div className="overflow-x-auto flex-1">
                            {churn.atRiskList?.length > 0 ? (
                                <table className="w-full min-w-[720px]">
                                    <thead className="bg-white border-b border-stone-100">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Artisan</th>
                                            <th className="px-6 py-4 text-center text-[10px] font-bold text-stone-400 uppercase tracking-widest">Tier</th>
                                            <th className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Last Seen</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100">
                                        {churn.atRiskList.map(artisan => (
                                            <tr key={artisan.id} className="hover:bg-stone-50/50 transition">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <UserAvatar user={artisan} className="w-9 h-9 rounded-full shadow-sm" />
                                                        <div>
                                                            <p className="font-bold text-stone-900 text-sm tracking-tight">{artisan.name}</p>
                                                            <p className="text-[11px] font-medium text-stone-500">{artisan.shop_name}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {artisan.premium_tier === 'super_premium' && <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold bg-stone-900 text-white shadow-sm border border-stone-800">Premium+</span>}
                                                    {artisan.premium_tier === 'premium' && <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold bg-clay-50 text-clay-700 border border-clay-200">Premium</span>}
                                                    {artisan.premium_tier !== 'premium' && artisan.premium_tier !== 'super_premium' && <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200">Free</span>}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                                                        {artisan.last_seen}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center p-10 text-center">
                                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full flex items-center justify-center mb-4 shadow-sm">
                                        <ClipboardCheck size={24} />
                                    </div>
                                    <p className="text-sm font-bold text-stone-900">No At-Risk Artisans</p>
                                    <p className="text-[11px] font-medium text-stone-500 mt-1 max-w-[200px]">Excellent! All approved artisans have been actively engaging with their storefronts.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
                
        </AdminLayout>
    );
}