import React, { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    TrendingUp, TrendingDown, Minus,
    AlertTriangle, Users, ShoppingBag, 
    ClipboardCheck, ArrowRight
} from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart, Area,
    XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { PieChart, Pie, Cell } from 'recharts';
import AdminLayout from '@/Layouts/AdminLayout';
import UserAvatar from '@/Components/UserAvatar';

// Earthy & Premium Palette
const PIE_COLORS = ['#c07251', '#d97706', '#10b981', '#78716c', '#a8a29e', '#d6d3d1'];

// ---- Premium Frosted Glass Tooltip Styling ----
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
        const data = payload[0]?.payload;
        return (
            <div className="bg-white/90 backdrop-blur-xl border border-stone-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-xl px-4 py-3">
                <p className="font-bold text-stone-900 text-[10px] uppercase tracking-wider mb-2">{label || data?.name}</p>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-clay-550" style={{ backgroundColor: '#c07251' }}></div>
                    <p className="text-xs font-bold text-stone-800">
                        GMV: <span className="font-semibold text-stone-550">₱{Number(data?.gmv || 0).toLocaleString()}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" style={{ backgroundColor: '#0284c7' }}></div>
                    <p className="text-xs font-bold text-stone-800">
                        Orders: <span className="font-semibold text-stone-550">{Number(data?.orders || 0).toLocaleString()}</span>
                    </p>
                </div>
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
                        GMV: <span className="font-semibold text-stone-500">₱{Number(item?.gmv || 0).toLocaleString()}</span>
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
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/80 shadow-sm flex items-start justify-between hover:shadow-md hover:border-stone-300 hover:-translate-y-0.5 transition-all duration-300 group">
            <div>
                <p className="text-stone-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                    {title}
                </p>
                <h3 className="text-2xl font-black text-stone-900 tracking-tight group-hover:text-clay-600 transition-colors">
                    {metric !== undefined && typeof metric === 'number' ? metric.toLocaleString(undefined, { maximumFractionDigits: 2 }) : metric}
                </h3>
                
                {growth !== undefined && (
                    <div className={`flex items-center gap-1 text-[10px] font-bold mt-1.5 ${
                        derivedTrend === 'up' ? 'text-emerald-600' : 
                        derivedTrend === 'down' ? 'text-red-650' : 'text-stone-400'
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
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${bg} ${text}`}>
                <Icon size={20} />
            </div>
        </div>
    );
};

export default function Insights({ 
    transactions = { currentGmv: 0, growthRate: 0, seven_days: [], monthly: [], yearly: [] }, 
    churn = { active: 0, atRisk: 0, churned: 0, atRiskList: [] }, 
    categories = [], 
    health = { completionRate: 0, aov: 0, reviewRate: 0, refundRate: 0 } 
}) {
    const [hoveredCategoryIndex, setHoveredCategoryIndex] = useState(null);
    const [chartFilter, setChartFilter] = useState('Monthly');

    const totalCategoryGmv = categories.reduce((sum, category) => sum + Number(category.gmv || 0), 0);

    const currentChartData = useMemo(() => {
        if (chartFilter === '7D') return transactions.seven_days || [];
        if (chartFilter === 'Monthly') return transactions.monthly || [];
        return transactions.yearly || [];
    }, [transactions, chartFilter]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Head title="Platform Insights" />

            {/* Navigation Bridge Link at Top Right */}
            <div className="flex justify-end pb-1">
                <Link 
                    href={route('admin.settings.index', { tab: 'monetization' })} 
                    className="inline-flex items-center gap-1.5 bg-white hover:bg-stone-50 text-clay-600 border border-stone-200 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition shadow-sm min-h-[38px]"
                >
                    <span>View Monetization Dashboard</span>
                    <ArrowRight size={12} />
                </Link>
            </div>

            {/* SECTION 1: TOP STAT CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Active Sellers"
                    metric={churn.active}
                    icon={Users}
                    bg="bg-clay-50/50 border-clay-100"
                    text="text-clay-600"
                    subtitle={`${churn.atRisk} at risk of churn`}
                />
                <StatCard
                    title="Avg Order Value"
                    metric={`₱${Number(health.aov).toLocaleString()}`}
                    icon={ShoppingBag}
                    bg="bg-emerald-50/50 border-emerald-100"
                    text="text-emerald-600"
                    subtitle="Platform average GMV"
                />
                <StatCard
                    title="Completion Rate"
                    metric={`${health.completionRate}%`}
                    icon={ClipboardCheck}
                    bg="bg-blue-50/50 border-blue-100"
                    text="text-blue-600"
                    subtitle="Delivered order volume"
                />
                <StatCard
                    title="Refund Rate"
                    metric={`${health.refundRate}%`}
                    icon={AlertTriangle}
                    bg={health.refundRate > 5 ? 'bg-red-50 border-red-100 animate-pulse' : 'bg-stone-50/50 border-stone-200'}
                    text={health.refundRate > 5 ? 'text-red-600' : 'text-stone-400'}
                    subtitle={health.refundRate > 5 ? 'Above safety threshold!' : 'Returns within safety limit'}
                />
            </div>

            {/* MASTER THREE-COLUMN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left 2 Columns - Marketplace Velocity */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col relative">
                    <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/30 flex-wrap gap-2">
                        <div>
                            <h3 className="font-bold text-stone-900 text-sm sm:text-base">
                                Marketplace Velocity
                            </h3>
                            <p className="text-xs font-medium text-stone-500 mt-0.5">Historical order volume and marketplace GMV</p>
                        </div>
                        <div className="flex bg-stone-150 p-1 rounded-lg border border-stone-200/50">
                            {['7D', 'Monthly', 'Yearly'].map((filter) => (
                                <button
                                    key={filter}
                                    type="button"
                                    onClick={() => setChartFilter(filter)}
                                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all min-h-[30px] ${
                                        chartFilter === filter 
                                            ? 'bg-white text-clay-700 shadow-sm' 
                                            : 'text-stone-500 hover:text-stone-800'
                                    }`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="p-4 sm:p-6 flex-grow flex items-center">
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={currentChartData} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
                                <defs>
                                    <linearGradient id="adminGmvFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#c07251" stopOpacity={0.16} />
                                        <stop offset="95%" stopColor="#c07251" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#78716c', fontWeight: 600 }} dy={10} />
                                <YAxis width={45} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#78716c', fontWeight: 600 }} tickFormatter={v => `₱${v}`} />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#c07251', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                <Area type="monotone" dataKey="gmv" name="GMV" stroke="#c07251" strokeWidth={3} fillOpacity={1} fill="url(#adminGmvFill)" dot={{ r: 4, fill: '#c07251', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#c07251' }} animationDuration={1000} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right 1 Column - Category Performance */}
                <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/30">
                        <div>
                            <h3 className="font-bold text-stone-900 text-sm sm:text-base flex items-center gap-2">
                                <ShoppingBag className="text-clay-600" size={16} />
                                Categories by GMV
                            </h3>
                            <p className="text-xs font-medium text-stone-500 mt-0.5">Top categories driving sales</p>
                        </div>
                    </div>
                    <div className="p-4 sm:p-6 flex-grow flex items-center">
                        {categories.length > 0 ? (
                            <div className="w-full">
                                <div className="h-[180px] w-full flex items-center justify-center relative">
                                    <PieChart width={180} height={180}>
                                        <Pie
                                            data={categories}
                                            nameKey="category"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={45}
                                            outerRadius={75}
                                            paddingAngle={4}
                                            dataKey="gmv"
                                            stroke="none"
                                        >
                                            {categories.map((entry, index) => {
                                                const isHovered = hoveredCategoryIndex === index;
                                                return (
                                                    <Cell 
                                                        key={`cell-${index}`} 
                                                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                                                        style={{
                                                            transition: 'all 0.3s ease',
                                                            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                                                            transformOrigin: '50% 50%',
                                                            filter: isHovered ? 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))' : 'none'
                                                        }}
                                                    />
                                                );
                                            })}
                                        </Pie>
                                        <Tooltip content={<CategoryTooltip />} />
                                    </PieChart>
                                </div>

                                <div className="mt-2 space-y-1.5 pt-4 border-t border-stone-100">
                                    {categories.slice(0, 4).map((item, index) => (
                                        <div 
                                            key={item.category || index} 
                                            onMouseEnter={() => setHoveredCategoryIndex(index)}
                                            onMouseLeave={() => setHoveredCategoryIndex(null)}
                                            className={`flex items-center justify-between text-[11px] group hover:bg-stone-50 p-1 -mx-1 rounded-md transition-colors ${hoveredCategoryIndex === index ? 'bg-stone-50/80 font-bold' : ''}`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                                                <span className="font-bold text-stone-700 truncate">{item.category}</span>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="font-bold text-stone-900">₱{Number(item.gmv).toLocaleString()}</span>
                                                <span className="text-stone-400 font-medium w-8 text-right">
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

            {/* Inactive Artisan Monitor */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/30">
                    <h3 className="font-bold text-stone-900 text-sm sm:text-base flex items-center gap-2">
                        <AlertTriangle className="text-amber-500" size={16} />
                        Inactive Artisan Monitor
                    </h3>
                    <p className="text-xs font-medium text-stone-500 mt-0.5">Artisans flagged as at-risk or churned due to inactivity.</p>
                </div>
                <div className="px-5 py-3 bg-stone-50/50 border-b border-stone-100 flex items-center justify-around text-center text-xs">
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#10b981' }}></span>
                        <span className="text-stone-500 text-[10px] uppercase font-bold tracking-wider">Active:</span>
                        <span className="text-emerald-700 font-extrabold text-xs">{churn.active}</span>
                    </div>
                    <div className="border-l border-stone-200 h-3"></div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#d97706' }}></span>
                        <span className="text-stone-500 text-[10px] uppercase font-bold tracking-wider">At Risk:</span>
                        <span className="text-amber-700 font-extrabold text-xs">{churn.atRisk}</span>
                    </div>
                    <div className="border-l border-stone-200 h-3"></div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#ef4444' }}></span>
                        <span className="text-stone-500 text-[10px] uppercase font-bold tracking-wider">Churned:</span>
                        <span className="text-red-700 font-extrabold text-xs">{churn.churned}</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    {churn.atRiskList?.length > 0 ? (
                        <table className="w-full text-left min-w-[600px] border-collapse">
                            <thead className="bg-stone-50 border-b border-stone-100">
                                <tr>
                                    <th className="px-6 py-3 text-[9px] font-bold text-stone-400 uppercase tracking-widest">Artisan</th>
                                    <th className="px-6 py-3 text-center text-[9px] font-bold text-stone-400 uppercase tracking-widest">Tier</th>
                                    <th className="px-6 py-3 text-left text-[9px] font-bold text-stone-400 uppercase tracking-widest">Status / Activity</th>
                                    <th className="px-6 py-3 text-right text-[9px] font-bold text-stone-400 uppercase tracking-widest">Contact</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {churn.atRiskList.map(artisan => (
                                    <tr key={artisan.id} className="hover:bg-[#FCF7F2]/20 transition duration-150">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar user={artisan} className="w-8 h-8 border border-stone-200 shadow-sm" />
                                                <div>
                                                    <p className="font-bold text-stone-900 text-xs tracking-tight">{artisan.name}</p>
                                                    <p className="text-[10px] font-medium text-stone-500">{artisan.shop_name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {artisan.premium_tier === 'super_premium' && <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-stone-900 text-white shadow-sm border border-stone-850">Premium+</span>}
                                            {artisan.premium_tier === 'premium' && <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-clay-50 text-clay-700 border border-clay-200">Premium</span>}
                                            {artisan.premium_tier !== 'premium' && artisan.premium_tier !== 'super_premium' && <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-stone-100 text-stone-600 border border-stone-200">Free</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                                                    artisan.status === 'At Risk' 
                                                        ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                }`}>
                                                    {artisan.status}
                                                </span>
                                                <span className="text-[10px] text-stone-400 font-medium">
                                                    last active {artisan.last_seen === 'Never' ? 'Never' : artisan.last_seen}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <a
                                                href={`mailto:${artisan.email || 'support@likhangkamay.app'}`}
                                                className="inline-flex items-center gap-1 rounded-xl bg-stone-150 hover:bg-stone-200 px-3 py-1.5 text-[9px] font-bold text-stone-600 transition border border-stone-200 shadow-sm min-h-[30px]"
                                            >
                                                Contact
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full flex items-center justify-center mb-4 shadow-sm">
                                <ClipboardCheck size={24} />
                            </div>
                            <p className="text-sm font-bold text-stone-900">No Inactive Artisans</p>
                            <p className="text-[11px] font-medium text-stone-500 mt-1 max-w-[260px]">All approved artisans have been active on their storefronts recently.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

Insights.layout = page => <AdminLayout title="Platform Insights">{page}</AdminLayout>;