import React, { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    TrendingUp, TrendingDown, Minus,
    AlertTriangle, Users, ShoppingBag, 
    ClipboardCheck, ArrowRight, Printer, Download,
    Mail, Check, Loader2, Award, ExternalLink
} from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart, Area,
    XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { PieChart, Pie, Cell } from 'recharts';
import AdminLayout from '@/Layouts/AdminLayout';
import UserAvatar from '@/Components/UserAvatar';
import KPICard from '@/Components/KPICard';
import ExportButton from '@/Components/ExportButton';
import FloatingModuleActions from '@/Components/FloatingModuleActions';
import { useToast } from '@/Components/ToastContext';

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

// ---- Premium Frosted Glass Category Tooltip Styling ----
const CategoryTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
        const item = payload[0]?.payload;
        const gmvValue = item?.isEmpty ? 0 : Number(item?.gmv || 0);

        return (
            <div className="bg-white/90 backdrop-blur-xl border border-stone-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-xl px-4 py-3">
                <p className="font-bold text-stone-900 text-[11px] uppercase tracking-wider mb-2">{item?.category || 'Category'}</p>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item?.isEmpty ? '#e7e5e4' : payload[0].color }}></div>
                    <p className="text-sm font-bold text-stone-800">
                        GMV: <span className="font-semibold text-stone-550">₱{gmvValue.toLocaleString()}</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

export default function Insights({ 
    transactions = { currentGmv: 0, growthRate: 0, seven_days: [], monthly: [], yearly: [] }, 
    churn = { active: 0, atRisk: 0, churned: 0, atRiskList: [] }, 
    categories = [], 
    health = { completionRate: 0, aov: 0, reviewRate: 0, refundRate: 0 },
    topArtisans = []
}) {
    const { addToast } = useToast();
    const [hoveredCategoryIndex, setHoveredCategoryIndex] = useState(null);
    const [chartFilter, setChartFilter] = useState('Monthly');
    const [reengagingId, setReengagingId] = useState(null);
    const [contactedIds, setContactedIds] = useState(new Set());

    const handleReengageArtisan = async (artisan) => {
        if (reengagingId) return;
        setReengagingId(artisan.id);
        try {
            const res = await window.axios.post(route('admin.insights.reengage-artisan', artisan.id));
            if (res.data?.success) {
                addToast(res.data.message || `Re-engagement sent to ${artisan.name}`, 'success');
                setContactedIds(prev => new Set(prev).add(artisan.id));
            } else {
                addToast(res.data?.message || 'Failed to send outreach.', 'error');
            }
        } catch (err) {
            addToast(err.response?.data?.message || 'Failed to send re-engagement outreach.', 'error');
        } finally {
            setReengagingId(null);
        }
    };

    const totalCategoryGmv = categories.reduce((sum, category) => sum + Number(category.gmv || 0), 0);

    const currentChartData = useMemo(() => {
        if (chartFilter === '7D') return transactions.seven_days || [];
        if (chartFilter === 'Monthly') return transactions.monthly || [];
        return transactions.yearly || [];
    }, [transactions, chartFilter]);

    const pieData = useMemo(() => {
        if (!categories) return [];
        const active = categories.filter(c => Number(c.gmv || 0) > 0);
        if (active.length > 0) return active;
        return [{ category: 'No Sales', gmv: 1, isEmpty: true }];
    }, [categories]);

    return (
        <>
            <Head title="Platform Insights" />

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
                    .lg\\:grid-cols-4 {
                        grid-template-columns: repeat(4, 1fr) !important;
                        gap: 16px !important;
                    }
                    .lg\\:grid-cols-3 {
                        grid-template-columns: 2fr 1fr !important;
                        gap: 20px !important;
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

            {/* Floating Module Actions */}
            <FloatingModuleActions
                actions={
                    <div className="flex items-center gap-2">
                        <ExportButton onClick={() => setTimeout(() => window.print(), 150)} icon={Printer} variant="secondary">
                            Print
                        </ExportButton>
                        <ExportButton href={route('admin.insights.export')} icon={Download} variant="secondary">
                            Download
                        </ExportButton>
                        <Link 
                            href={route('admin.settings.index', { tab: 'monetization' })} 
                            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl border border-transparent bg-clay-600 text-white hover:bg-clay-700 shadow-md shadow-clay-200/50 px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-all duration-300 ease-out active:scale-[0.98]"
                        >
                            <span>Monetization</span>
                            <ArrowRight size={14} strokeWidth={2.5} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                        </Link>
                    </div>
                }
            />

            {/* Print-Only Document Header */}
            <div className="hidden print:block border-b-2 border-stone-200 pb-4 mb-6">
                <h1 className="text-2xl font-bold text-stone-900">LikhangKamay Platform Insights Report</h1>
                <p className="text-xs text-stone-500 mt-1">
                    Generated on: {new Date().toLocaleString()}
                </p>
            </div>

            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* SECTION 1: TOP STAT CARDS */}
                <div className="flex overflow-x-auto gap-4 pb-2.5 flex-nowrap snap-x snap-mandatory lg:grid lg:grid-cols-4 no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
                    <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                    <KPICard
                        title="Active Sellers"
                        value={churn.active}
                        icon={Users}
                        bg="bg-clay-50"
                        color="text-clay-600"
                        subtitle={`${churn.atRisk} needing check-in`}
                    />
                </div>
                <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                    <KPICard
                        title="Avg Order Value"
                        value={Number(health.aov)}
                        icon={ShoppingBag}
                        bg="bg-emerald-50"
                        color="text-emerald-600"
                        formatter={(v) => `₱${Math.round(v).toLocaleString()}`}
                        subtitle="Average spent per order"
                    />
                </div>
                <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                    <KPICard
                        title="Completion Rate"
                        value={`${health.completionRate}%`}
                        icon={ClipboardCheck}
                        bg="bg-blue-50"
                        color="text-blue-600"
                        subtitle="Delivered order volume"
                    />
                </div>
                <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                    <KPICard
                        title="Refund Rate"
                        value={`${health.refundRate}%`}
                        icon={AlertTriangle}
                        bg={health.refundRate > 5 ? 'bg-red-50' : 'bg-stone-50'}
                        color={health.refundRate > 5 ? 'text-red-650 animate-pulse' : 'text-stone-400'}
                        subtitle={health.refundRate > 5 ? 'Above safety threshold!' : 'Returns within safety limit'}
                    />
                </div>
            </div>

            {/* MASTER THREE-COLUMN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left 2 Columns - Marketplace Growth & Sales */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col relative">
                    <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/30 flex-wrap gap-2">
                        <div>
                            <h3 className="font-bold text-stone-900 text-sm sm:text-base">
                                Marketplace Growth &amp; Sales
                            </h3>
                            <p className="text-xs font-medium text-stone-500 mt-0.5">Order volume and platform sales over time</p>
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
                        <div className="h-[260px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={currentChartData} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
                                    <defs>
                                        <linearGradient id="adminGmvFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#c07251" stopOpacity={0.16} />
                                            <stop offset="95%" stopColor="#c07251" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                                    <XAxis dataKey="name" stroke="#a8a29e" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis 
                                        stroke="#a8a29e" 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickFormatter={(v) => `₱${Number(v) >= 1000 ? (Number(v)/1000).toFixed(0) + 'k' : v}`} 
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="gmv" stroke="#c07251" strokeWidth={2.5} fillOpacity={1} fill="url(#adminGmvFill)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Print Fallback Table */}
                        <div className="hidden print:block w-full">
                            <table className="w-full text-xs text-left border border-stone-200">
                                <thead>
                                    <tr className="bg-stone-100 border-b border-stone-200">
                                        <th className="p-2 font-bold text-stone-700">Period</th>
                                        <th className="p-2 font-bold text-stone-700 text-right">Orders</th>
                                        <th className="p-2 font-bold text-stone-700 text-right">GMV</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentChartData.map((d, i) => (
                                        <tr key={i} className="border-b border-stone-100">
                                            <td className="p-2 text-stone-800">{d.name}</td>
                                            <td className="p-2 text-stone-800 text-right">{d.orders}</td>
                                            <td className="p-2 text-stone-800 text-right">₱{Number(d.gmv || 0).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right 1 Column - Categories by GMV */}
                <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/30">
                        <h3 className="font-bold text-stone-900 text-sm sm:text-base">
                            Categories by GMV
                        </h3>
                        <p className="text-xs font-medium text-stone-500 mt-0.5">Top product categories driving sales</p>
                    </div>
                    <div className="p-4 sm:p-5 flex flex-col justify-center flex-grow">
                        {pieData.length > 0 ? (
                            <div className="space-y-4">
                                <div className="h-44 w-full flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Tooltip content={<CategoryTooltip />} />
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={48}
                                                outerRadius={68}
                                                paddingAngle={4}
                                                dataKey="gmv"
                                                onMouseEnter={(_, index) => setHoveredCategoryIndex(index)}
                                                onMouseLeave={() => setHoveredCategoryIndex(null)}
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell 
                                                        key={`cell-${index}`} 
                                                        fill={entry.isEmpty ? '#e7e5e4' : PIE_COLORS[index % PIE_COLORS.length]} 
                                                        opacity={hoveredCategoryIndex === null || hoveredCategoryIndex === index ? 1 : 0.4}
                                                        className="transition-opacity duration-200 outline-hidden"
                                                    />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                                    {categories.map((item, index) => (
                                        <div 
                                            key={item.category} 
                                            className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-stone-50 transition"
                                            onMouseEnter={() => setHoveredCategoryIndex(index)}
                                            onMouseLeave={() => setHoveredCategoryIndex(null)}
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
                            <div className="text-center py-10 text-stone-400">No data available</div>
                        )}
                    </div>
                </div>
            </div>

            {/* BOTTOM SECTION: TOP PERFORMING ARTISANS & SELLER ACTIVITY OUTREACH */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Top Performing Artisans Leaderboard */}
                <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/30 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-stone-900 text-sm sm:text-base flex items-center gap-2">
                                <Award className="text-amber-500" size={16} />
                                Top Performing Artisans
                            </h3>
                            <p className="text-xs font-medium text-stone-500 mt-0.5">Leading shops driving marketplace sales and orders.</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        {topArtisans?.length > 0 ? (
                            <table className="w-full text-left min-w-[420px] border-collapse">
                                <thead className="bg-stone-50 border-b border-stone-100">
                                    <tr>
                                        <th className="px-5 py-3 text-[9px] font-bold text-stone-400 uppercase tracking-widest">Rank &amp; Artisan</th>
                                        <th className="px-5 py-3 text-right text-[9px] font-bold text-stone-400 uppercase tracking-widest">Sales &amp; Orders</th>
                                        <th className="px-5 py-3 text-right text-[9px] font-bold text-stone-400 uppercase tracking-widest">Storefront</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {topArtisans.map((artisan, index) => (
                                        <tr key={artisan.id} className="hover:bg-[#FCF7F2]/20 transition duration-150">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold shrink-0 ${
                                                        index === 0 ? 'bg-amber-100 text-amber-800' :
                                                        index === 1 ? 'bg-stone-200 text-stone-700' :
                                                        index === 2 ? 'bg-orange-100 text-orange-800' :
                                                        'bg-stone-100 text-stone-500'
                                                    }`}>
                                                        {index + 1}
                                                    </span>
                                                    <UserAvatar user={artisan} className="w-8 h-8 shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-stone-900 text-xs tracking-tight truncate">{artisan.name}</p>
                                                        <p className="text-[10px] font-medium text-stone-500 truncate">{artisan.shop_name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <p className="font-extrabold text-stone-900 text-xs">₱{Number(artisan.total_gmv).toLocaleString()}</p>
                                                <p className="text-[10px] text-stone-400 font-medium">{artisan.orders_count} {artisan.orders_count === 1 ? 'order' : 'orders'}</p>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <a
                                                    href={artisan.shop_slug ? route('shop.seller', artisan.shop_slug) : '#'}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 rounded-lg bg-stone-50 hover:bg-stone-100 px-2.5 py-1 text-[10px] font-bold text-stone-700 transition border border-stone-200 shadow-sm"
                                                    title="View Public Storefront"
                                                >
                                                    <span>View</span>
                                                    <ExternalLink size={10} />
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-12 text-center">
                                <p className="text-sm font-bold text-stone-400">No sales recorded yet.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Seller Activity & Outreach */}
                <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/30">
                        <h3 className="font-bold text-stone-900 text-sm sm:text-base flex items-center gap-2">
                            <AlertTriangle className="text-amber-500" size={16} />
                            Seller Activity &amp; Outreach
                        </h3>
                        <p className="text-xs font-medium text-stone-500 mt-0.5">Artisans needing check-in due to storefront inactivity.</p>
                    </div>
                    <div className="px-5 py-3 bg-stone-50/50 border-b border-stone-100 flex items-center justify-around text-center text-xs">
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#10b981' }}></span>
                            <span className="text-stone-500 text-[10px] uppercase font-bold tracking-wider">Active Recently:</span>
                            <span className="text-emerald-700 font-extrabold text-xs">{churn.active}</span>
                        </div>
                        <div className="border-l border-stone-200 h-3"></div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#d97706' }}></span>
                            <span className="text-stone-500 text-[10px] uppercase font-bold tracking-wider">Needs Check-in:</span>
                            <span className="text-amber-700 font-extrabold text-xs">{churn.atRisk}</span>
                        </div>
                        <div className="border-l border-stone-200 h-3"></div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#78716c' }}></span>
                            <span className="text-stone-500 text-[10px] uppercase font-bold tracking-wider">Inactive:</span>
                            <span className="text-stone-700 font-extrabold text-xs">{churn.churned}</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        {churn.atRiskList?.length > 0 ? (
                            <table className="w-full text-left min-w-[420px] border-collapse">
                                <thead className="bg-stone-50 border-b border-stone-100">
                                    <tr>
                                        <th className="px-5 py-3 text-[9px] font-bold text-stone-400 uppercase tracking-widest">Artisan</th>
                                        <th className="px-4 py-3 text-left text-[9px] font-bold text-stone-400 uppercase tracking-widest">Activity Status</th>
                                        <th className="px-5 py-3 text-right text-[9px] font-bold text-stone-400 uppercase tracking-widest">Outreach</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {churn.atRiskList.map(artisan => (
                                        <tr key={artisan.id} className="hover:bg-[#FCF7F2]/20 transition duration-150">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar user={artisan} className="w-8 h-8 shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-stone-900 text-xs tracking-tight truncate">{artisan.name}</p>
                                                        <p className="text-[10px] font-medium text-stone-500 truncate">{artisan.shop_name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className={`inline-flex self-start px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                                                        artisan.status === 'Needs Check-in' || artisan.status === 'At Risk'
                                                            ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                                            : 'bg-stone-100 text-stone-600 border border-stone-200'
                                                    }`}>
                                                        {artisan.status === 'At Risk' ? 'Needs Check-in' : (artisan.status || 'Inactive')}
                                                    </span>
                                                    <span className="text-[10px] text-stone-450 font-medium">
                                                        {artisan.last_seen === 'Never' ? 'No recent activity' : artisan.last_seen}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <button
                                                    type="button"
                                                    disabled={reengagingId === artisan.id}
                                                    onClick={() => handleReengageArtisan(artisan)}
                                                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold transition border shadow-sm min-h-[30px] active:scale-95 disabled:opacity-60 ${
                                                        contactedIds.has(artisan.id)
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                            : 'bg-stone-150 hover:bg-stone-200 text-stone-700 border-stone-200'
                                                    }`}
                                                    title={`Send friendly check-in reminder to ${artisan.email || artisan.name}`}
                                                >
                                                    {reengagingId === artisan.id ? (
                                                        <>
                                                            <Loader2 size={11} className="animate-spin text-stone-500" />
                                                            <span>Sending...</span>
                                                        </>
                                                    ) : contactedIds.has(artisan.id) ? (
                                                        <>
                                                            <Check size={12} className="text-emerald-600" />
                                                            <span>Reminded</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Mail size={12} className="text-stone-500" />
                                                            <span>Send Reminder</span>
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-12 text-center">
                                <p className="text-sm font-bold text-stone-400">All sellers active.</p>
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