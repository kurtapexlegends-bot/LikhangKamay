import React, { useState, useMemo } from 'react';
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
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-sm flex items-start justify-between hover:shadow-md hover:border-stone-300 hover:-translate-y-0.5 transition-all duration-300 group">
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

export default function Insights({ 
    revenue = { currentMRR: 0, forecastedMRR: 0, growthRate: 0, history: [] }, 
    churn = { active: 0, atRisk: 0, churned: 0, atRiskList: [] }, 
    categories = [], 
    health = { completionRate: 0, aov: 0, reviewRate: 0, refundRate: 0 } 
}) {
    const [hoveredCategoryIndex, setHoveredCategoryIndex] = useState(null);
    const [mrrPeriod, setMrrPeriod] = useState("6M");

    const totalCategoryGmv = categories.reduce((sum, category) => sum + Number(category.gmv || 0), 0);

    const filteredHistory = useMemo(() => {
        if (!revenue?.history) return [];
        if (mrrPeriod === "30D") {
            return revenue.history.slice(-2);
        }
        if (mrrPeriod === "6M") {
            return revenue.history.slice(-6);
        }
        return revenue.history;
    }, [revenue.history, mrrPeriod]);

    return (
        <>
            <Head title="Insights - Admin" />

            {/* SECTION 1: TOP STAT CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                <StatCard
                    title="Est. MRR"
                    metric={`₱${revenue.currentMRR}`}
                    icon={TrendingUp}
                    bg="bg-clay-50/50 border-clay-100"
                    text="text-clay-600"
                    subtitle="Current"
                />
                <StatCard
                    title="Forecast"
                    metric={`₱${revenue.forecastedMRR}`}
                    growth={revenue.growthRate}
                    icon={Activity}
                    bg="bg-emerald-50/50 border-emerald-100"
                    text="text-emerald-600"
                    subtitle="Next Month"
                />
                <StatCard
                    title="Growth"
                    metric={`${revenue.growthRate > 0 ? '+' : ''}${revenue.growthRate}%`}
                    icon={BarChart2}
                    bg={revenue.growthRate > 0 ? 'bg-emerald-50/50 border-emerald-100' : revenue.growthRate < 0 ? 'bg-amber-50/50 border-amber-100' : 'bg-stone-50/50 border-stone-100'}
                    text={revenue.growthRate > 0 ? 'text-emerald-600' : revenue.growthRate < 0 ? 'text-amber-500' : 'text-stone-500'}
                    subtitle="3M Avg"
                />
            </div>

            {/* MASTER TWO-COLUMN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Left Column */}
                <div className="space-y-6">
                    {/* MRR History */}
                    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col">
                        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/30 flex-wrap gap-2">
                            <div>
                                <h3 className="font-bold text-stone-900 text-sm sm:text-lg">
                                    MRR Velocity
                                </h3>
                                <p className="hidden sm:block text-xs font-medium text-stone-500 mt-0.5">Historical recurring revenue velocity</p>
                            </div>
                            <div className="flex items-center gap-1 bg-stone-100/80 p-0.5 rounded-lg border border-stone-200/50">
                                {['30D', '6M', '1Y'].map(period => (
                                    <button
                                        key={period}
                                        type="button"
                                        onClick={() => setMrrPeriod(period)}
                                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition ${
                                            mrrPeriod === period 
                                                ? 'bg-white text-stone-900 shadow-sm' 
                                                : 'text-stone-500 hover:text-stone-800'
                                        }`}
                                    >
                                        {period}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-2 sm:p-6 flex-grow flex items-center">
                            <ResponsiveContainer width="100%" height={240}>
                                <AreaChart data={filteredHistory} margin={{ top: 10, right: 10, bottom: 0, left: -25 }}>
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

                    {/* Platform Health Stats */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-6">
                        <StatCard
                            title="Completion"
                            metric={`${health.completionRate}%`}
                            subtitle="Orders"
                            icon={ClipboardCheck}
                            bg="bg-stone-50/50 border-stone-200"
                            text="text-stone-600"
                        />
                        <StatCard
                            title="AOV"
                            metric={`₱${Number(health.aov)}`}
                            subtitle="Avg Order"
                            icon={TrendingUp}
                            bg="bg-stone-50/50 border-stone-200"
                            text="text-stone-600"
                        />
                        <StatCard
                            title="Reviews"
                            metric={`${health.reviewRate}%`}
                            subtitle="Rate"
                            icon={Star}
                            bg="bg-stone-50/50 border-stone-200"
                            text="text-stone-600"
                        />
                        <StatCard
                            title="Refunds"
                            metric={`${health.refundRate}%`}
                            subtitle="Rate"
                            icon={AlertTriangle}
                            bg={health.refundRate > 5 ? 'bg-red-50 border-red-100 animate-pulse' : 'bg-stone-50/50 border-stone-200'}
                            text={health.refundRate > 5 ? 'text-red-600' : 'text-stone-400'}
                        />
                    </div>

                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Category Performance */}
                    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col">
                        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/30">
                            <div>
                                <h3 className="font-bold text-stone-900 text-sm sm:text-lg flex items-center gap-2">
                                    <ShoppingBag className="text-clay-600" size={16} />
                                    Categories
                                </h3>
                                <p className="hidden sm:block text-xs font-medium text-stone-500 mt-0.5">Top product categories driving GMV</p>
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
                                        {categories.map((item, index) => (
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
                                                    <span className="font-bold text-stone-900">P{Number(item.gmv).toLocaleString()}</span>
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

                    {/* At Risk List Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col">
                        <div className="px-4 sm:px-5 py-3 border-b border-stone-100 bg-stone-50/30">
                            <h3 className="font-bold text-stone-900 text-sm sm:text-base flex items-center gap-2">
                                <AlertTriangle className="text-amber-500" size={16} />
                                Inactive Artisans
                            </h3>
                            <p className="text-[10px] sm:text-[11px] font-medium text-stone-500 mt-0.5">Artisans flagged as at-risk or churned due to inactivity.</p>
                        </div>
                        <div className="px-4 sm:px-5 py-2.5 bg-stone-50/50 border-b border-stone-100 flex items-center justify-around text-center text-xs">
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-650" style={{ backgroundColor: '#10b981' }}></span>
                                <span className="text-stone-500 text-[10px] uppercase font-bold tracking-wider">Active:</span>
                                <span className="text-emerald-700 font-extrabold text-xs">{churn.active}</span>
                            </div>
                            <div className="border-l border-stone-200 h-3"></div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" style={{ backgroundColor: '#d97706' }}></span>
                                <span className="text-stone-500 text-[10px] uppercase font-bold tracking-wider">At Risk:</span>
                                <span className="text-amber-700 font-extrabold text-xs">{churn.atRisk}</span>
                            </div>
                            <div className="border-l border-stone-200 h-3"></div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" style={{ backgroundColor: '#ef4444' }}></span>
                                <span className="text-stone-500 text-[10px] uppercase font-bold tracking-wider">Churned:</span>
                                <span className="text-red-700 font-extrabold text-xs">{churn.churned}</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto flex-1">
                            {churn.atRiskList?.length > 0 ? (
                                <table className="w-full text-left table-card-mobile sm:min-w-[500px]">
                                    <thead className="bg-white border-b border-stone-100">
                                        <tr>
                                            <th className="px-4 py-1.5 text-left text-[9px] font-bold text-stone-400 uppercase tracking-widest">Artisan</th>
                                            <th className="px-4 py-1.5 text-center text-[9px] font-bold text-stone-400 uppercase tracking-widest">Tier</th>
                                            <th className="px-4 py-1.5 text-left text-[9px] font-bold text-stone-400 uppercase tracking-widest">Status / Activity</th>
                                            <th className="px-4 py-1.5 text-right text-[9px] font-bold text-stone-400 uppercase tracking-widest">Contact</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100">
                                        {churn.atRiskList.map(artisan => (
                                            <tr key={artisan.id} className="flex flex-col sm:table-row p-2.5 sm:p-0 hover:bg-[#FCF7F2]/40 transition border-b border-stone-100 sm:border-none last:border-none group">
                                                <td className="sm:px-4 sm:py-2 mb-1.5 sm:mb-0">
                                                    <div className="flex items-center gap-2">
                                                        <UserAvatar user={artisan} className="w-7 h-7 rounded-full shadow-sm" />
                                                        <div>
                                                            <p className="font-bold text-stone-900 text-xs tracking-tight">{artisan.name}</p>
                                                            <p className="text-[10px] font-medium text-stone-500">{artisan.shop_name}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="sm:px-4 sm:py-2 mb-1 sm:mb-0">
                                                    <div className="flex items-center justify-between sm:justify-center">
                                                        <span className="sm:hidden text-[9px] font-bold text-stone-400 uppercase tracking-widest">Tier</span>
                                                        {artisan.premium_tier === 'super_premium' && <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-stone-900 text-white shadow-sm border border-stone-800">Premium+</span>}
                                                        {artisan.premium_tier === 'premium' && <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-clay-50 text-clay-700 border border-clay-200">Premium</span>}
                                                        {artisan.premium_tier !== 'premium' && artisan.premium_tier !== 'super_premium' && <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-stone-100 text-stone-600 border border-stone-200">Free</span>}
                                                    </div>
                                                </td>
                                                <td className="sm:px-4 sm:py-2 mb-1 sm:mb-0">
                                                    <div className="flex items-center justify-between sm:justify-start gap-2">
                                                        <span className="sm:hidden text-[9px] font-bold text-stone-400 uppercase tracking-widest">Activity</span>
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                                                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-extrabold ${
                                                                artisan.status === 'At Risk' 
                                                                    ? 'bg-amber-50 text-amber-700 border border-amber-250' 
                                                                    : 'bg-red-50 text-red-700 border border-red-200'
                                                            }`}>
                                                                {artisan.status}
                                                            </span>
                                                            <span className="text-[10px] text-stone-500 font-bold whitespace-nowrap">
                                                                {artisan.last_seen === 'Never' ? 'Never active' : artisan.last_seen}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="sm:px-4 sm:py-2 text-right">
                                                    <div className="flex items-center justify-between sm:justify-end gap-2">
                                                        <span className="sm:hidden text-[9px] font-bold text-stone-400 uppercase tracking-widest">Contact</span>
                                                        <a
                                                            href={`https://mail.google.com/mail/?view=cm&fs=1&to=${artisan.email || 'support@likhangkamay.app'}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 rounded bg-clay-50 hover:bg-clay-100 border border-[#E7D8C9] px-2 py-0.5 text-[9px] font-extrabold text-clay-700 transition"
                                                        >
                                                            Contact
                                                        </a>
                                                    </div>
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
                                    <p className="text-sm font-bold text-stone-900">No Inactive Artisans</p>
                                    <p className="text-[11px] font-medium text-stone-500 mt-1 max-w-[200px]">Excellent! All approved artisans have been actively engaging with their storefronts.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

Insights.layout = page => <AdminLayout title="Platform Insights">{page}</AdminLayout>;