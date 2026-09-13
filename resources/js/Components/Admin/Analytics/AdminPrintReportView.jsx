import React, { useMemo } from 'react';
import { 
    Users, ShoppingBag, ClipboardCheck, AlertTriangle, 
    Award, TrendingUp, CheckCircle, Clock 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

const PIE_COLORS = ['#c07251', '#d97706', '#10b981', '#78716c', '#a8a29e', '#d6d3d1'];

export default function AdminPrintReportView({
    transactions = {},
    churn = { active: 0, atRisk: 0, churned: 0, atRiskList: [] },
    categories = [],
    health = { completionRate: 0, aov: 0, reviewRate: 0, refundRate: 0 },
    topArtisans = [],
    chartFilter = 'Monthly',
    currentChartData = [],
    pieData = [],
}) {
    const formattedGeneratedDate = useMemo(() => {
        return new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
    }, []);

    const totalCategoryGmv = useMemo(() => {
        return categories.reduce((sum, c) => sum + Number(c.gmv || 0), 0);
    }, [categories]);

    return (
        <div className="hidden print:block space-y-4">
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    /* Hide layout chrome and screen-only elements */
                    aside,
                    nav,
                    header,
                    .no-print,
                    .mobile-dock,
                    #nprogress,
                    .fixed,
                    button,
                    select,
                    input,
                    a {
                        display: none !important;
                    }

                    /* Page Setup */
                    @page {
                        size: portrait;
                        margin: 8mm 10mm 8mm 10mm !important;
                    }

                    /* Reset root containers */
                    html, body, #app, .h-screen, .overflow-hidden, [scroll-region="true"], main {
                        background: #ffffff !important;
                        color: #1c1917 !important;
                        height: auto !important;
                        min-height: 0 !important;
                        overflow: visible !important;
                        position: static !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    .lg\\:ml-52 {
                        margin-left: 0 !important;
                    }

                    /* Strict 2-Page Pagination */
                    .print-page-1 {
                        page-break-after: always !important;
                        break-after: page !important;
                    }

                    .print-page-2 {
                        page-break-before: always !important;
                        break-before: page !important;
                    }

                    .print-avoid-break {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }

                    .print-card {
                        border: 1px solid #e7e5e4 !important;
                        background-color: #ffffff !important;
                        border-radius: 12px !important;
                        box-shadow: none !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }

                    /* Exact color rendering */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}} />

            {/* ============================================================ */}
            {/* PAGE 1: Financial Performance, 4 KPIs & Marketplace Growth   */}
            {/* ============================================================ */}
            <div className="print-page-1 space-y-3.5">
                {/* Standardized LikhangKamay Executive Print Header */}
                <div className="border-b-2 border-stone-900 pb-2.5">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-clay-700">LikhangKamay Platform Administration</span>
                                <span className="text-stone-300">•</span>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                                    Executive Analytics Report
                                </span>
                            </div>
                            <h1 className="text-xl font-black text-stone-900 tracking-tight mt-0.5">
                                Platform Insights &amp; Advanced Analytics
                            </h1>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Report Generated</p>
                            <p className="text-xs font-bold text-stone-800">
                                {formattedGeneratedDate}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-stone-100 text-[10px] text-stone-500 font-medium">
                        <span className="font-bold text-stone-700">Active Scope:</span>
                        <span className="bg-stone-50 px-2 py-0.5 rounded border border-stone-200 text-stone-700 font-bold">{chartFilter} View</span>
                        <span className="bg-stone-50 px-2 py-0.5 rounded border border-stone-200 text-stone-700 font-bold">Platform-Wide Marketplace</span>
                        <span className="ml-auto text-stone-400">Source: LikhangKamay Transaction &amp; Order Intelligence</span>
                    </div>
                </div>

                {/* Section 1: Standard 4 Key Performance Indicators */}
                <div className="grid grid-cols-4 gap-3 w-full print-avoid-break">
                    {/* Active Sellers */}
                    <div className="print-card p-3 rounded-xl bg-white">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Active Sellers</span>
                            <div className="w-6 h-6 rounded-lg bg-clay-50 flex items-center justify-center text-clay-600">
                                <Users size={13} />
                            </div>
                        </div>
                        <p className="text-xl font-black text-stone-900 mt-1.5">{churn.active}</p>
                        <p className="text-[10px] font-medium text-stone-400 mt-0.5">{churn.atRisk} needing check-in</p>
                    </div>

                    {/* Avg Order Value */}
                    <div className="print-card p-3 rounded-xl bg-white">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Avg Order Value</span>
                            <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <ShoppingBag size={13} />
                            </div>
                        </div>
                        <p className="text-xl font-black text-stone-900 mt-1.5">₱{Math.round(Number(health.aov || 0)).toLocaleString()}</p>
                        <p className="text-[10px] font-medium text-stone-400 mt-0.5">Average spent per order</p>
                    </div>

                    {/* Completion Rate */}
                    <div className="print-card p-3 rounded-xl bg-white">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Completion Rate</span>
                            <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                <ClipboardCheck size={13} />
                            </div>
                        </div>
                        <p className="text-xl font-black text-stone-900 mt-1.5">{health.completionRate}%</p>
                        <p className="text-[10px] font-medium text-stone-400 mt-0.5">Delivered order volume</p>
                    </div>

                    {/* Refund Rate */}
                    <div className="print-card p-3 rounded-xl bg-white">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Refund Rate</span>
                            <div className={`w-6 h-6 rounded-lg ${health.refundRate > 5 ? 'bg-red-50 text-red-600' : 'bg-stone-50 text-stone-500'} flex items-center justify-center`}>
                                <AlertTriangle size={13} />
                            </div>
                        </div>
                        <p className={`text-xl font-black mt-1.5 ${health.refundRate > 5 ? 'text-red-600' : 'text-stone-900'}`}>{health.refundRate}%</p>
                        <p className="text-[10px] font-medium text-stone-400 mt-0.5">{health.refundRate > 5 ? 'Above safety threshold' : 'Returns within safety limit'}</p>
                    </div>
                </div>

                {/* Section 2: Marketplace Growth & Categories by GMV (Side-by-side 2fr : 1fr) */}
                <div className="grid grid-cols-3 gap-3.5 w-full print-avoid-break">
                    {/* Left 2 Columns: Marketplace Growth & Sales */}
                    <div className="col-span-2 print-card p-3.5 rounded-xl bg-white flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <div>
                                    <h3 className="text-xs font-bold text-stone-900 leading-none">Marketplace Growth &amp; Sales</h3>
                                    <p className="text-[10px] text-stone-500 mt-0.5 font-medium">Order volume and platform sales over time ({chartFilter.toLowerCase()} view)</p>
                                </div>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-clay-700 bg-clay-50 px-2 py-0.5 rounded border border-clay-200/60">
                                    {chartFilter}
                                </span>
                            </div>

                            {/* Static Vector AreaChart with fixed width and no ResponsiveContainer */}
                            {currentChartData.length > 0 ? (
                                <div className="flex justify-center w-full my-1">
                                    <AreaChart width={425} height={170} data={currentChartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="adminPrintGmvFill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#c07251" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#c07251" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                                        <XAxis dataKey="name" stroke="#a8a29e" fontSize={9} tickLine={false} axisLine={false} />
                                        <YAxis 
                                            stroke="#a8a29e" 
                                            fontSize={9} 
                                            tickLine={false} 
                                            axisLine={false} 
                                            tickFormatter={(v) => {
                                                const num = Number(v || 0);
                                                if (num === 0) return '₱0';
                                                const abs = Math.abs(num);
                                                return abs >= 1000 ? `₱${(abs / 1000).toFixed(0)}k` : `₱${abs}`;
                                            }} 
                                        />
                                        <Area type="monotone" dataKey="gmv" stroke="#c07251" strokeWidth={2.5} fillOpacity={1} fill="url(#adminPrintGmvFill)" isAnimationActive={false} />
                                    </AreaChart>
                                </div>
                            ) : (
                                <div className="py-8 text-center text-xs text-stone-400">No transaction records found for this period.</div>
                            )}
                        </div>

                        {/* Structured Data Table Breakdown */}
                        <div className="border-t border-stone-100 pt-2 mt-1">
                            <table className="w-full text-[10px] text-left border-collapse">
                                <thead>
                                    <tr className="text-stone-400 uppercase tracking-wider font-bold border-b border-stone-100">
                                        <th className="pb-1">Period</th>
                                        <th className="pb-1 text-right">Orders</th>
                                        <th className="pb-1 text-right">GMV</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {currentChartData.slice(-4).map((d, i) => (
                                        <tr key={i}>
                                            <td className="py-1 font-semibold text-stone-700">{d.name}</td>
                                            <td className="py-1 text-right text-stone-600">{Number(d.orders || 0).toLocaleString()}</td>
                                            <td className="py-1 text-right font-bold text-stone-900">₱{Number(d.gmv || 0).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right 1 Column: Categories by GMV */}
                    <div className="print-card p-3.5 rounded-xl bg-white flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-xs font-bold text-stone-900">Categories by GMV</h3>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-stone-500 bg-stone-50 px-1.5 py-0.5 rounded border border-stone-200">
                                    Catalog
                                </span>
                            </div>
                            <p className="text-[10px] text-stone-500 mb-1.5 font-medium">Top product categories driving sales</p>

                            {/* Static Donut PieChart */}
                            <div className="flex justify-center items-center h-[115px] my-1">
                                <PieChart width={120} height={115}>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={34}
                                        outerRadius={50}
                                        paddingAngle={3}
                                        dataKey="gmv"
                                        isAnimationActive={false}
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={entry.isEmpty ? '#e7e5e4' : PIE_COLORS[index % PIE_COLORS.length]} 
                                            />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </div>
                        </div>

                        {/* Category List */}
                        <div className="space-y-1 border-t border-stone-100 pt-2">
                            {categories.slice(0, 5).map((item, index) => (
                                <div key={item.category || index} className="flex items-center justify-between text-[10px]">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                                        <span className="font-semibold text-stone-700 truncate max-w-[90px]">{item.category}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="font-bold text-stone-900">₱{Number(item.gmv || 0).toLocaleString()}</span>
                                        <span className="text-stone-400 text-[9px] w-6 text-right font-medium">
                                            {totalCategoryGmv > 0 ? Math.round((Number(item.gmv) / totalCategoryGmv) * 100) : 0}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Page 1 Footer */}
                <div className="border-t border-stone-200 pt-2 flex items-center justify-between text-[9px] text-stone-400 font-medium">
                    <span>LikhangKamay Platform Administration • Analytics Intelligence</span>
                    <span>Page 1 of 2 • Financial &amp; Sales Performance Overview</span>
                    <span>Verified Platform Analytics</span>
                </div>
            </div>

            {/* ============================================================ */}
            {/* PAGE 2: Operations, Artisan Leaderboard & Outreach           */}
            {/* ============================================================ */}
            <div className="print-page-2 space-y-3.5 pt-1">
                {/* Page 2 Running Header */}
                <div className="border-b-2 border-stone-900 pb-2.5 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-clay-700">LikhangKamay Platform Administration</span>
                            <span className="text-stone-300">•</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                                Ecosystem Health
                            </span>
                        </div>
                        <h2 className="text-base font-black text-stone-900 tracking-tight mt-0.5">
                            Operations, Artisan Leaderboard &amp; Outreach
                        </h2>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Page 2 of 2</p>
                        <p className="text-xs font-bold text-stone-800">{formattedGeneratedDate}</p>
                    </div>
                </div>

                {/* Section 3 & 4: Top Performing Artisans & Seller Activity side-by-side (2 equal columns) */}
                <div className="grid grid-cols-2 gap-3.5 w-full print-avoid-break">
                    {/* Left Column: Top Performing Artisans */}
                    <div className="print-card p-3.5 rounded-xl bg-white flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between pb-2 border-b border-stone-100 mb-2.5">
                                <div>
                                    <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                                        <Award className="text-amber-500" size={14} />
                                        Top Performing Artisans
                                    </h3>
                                    <p className="text-[10px] text-stone-500 font-medium">Ranked by marketplace sales and orders</p>
                                </div>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                                    Leaderboard
                                </span>
                            </div>

                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-stone-100 bg-stone-50/60 text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                                        <th className="py-1.5 px-2">Rank &amp; Artisan</th>
                                        <th className="py-1.5 px-2 text-right">Sales &amp; Orders</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {topArtisans.length > 0 ? topArtisans.slice(0, 5).map((artisan, index) => (
                                        <tr key={artisan.id || index}>
                                            <td className="py-2 px-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black shrink-0 ${
                                                        index === 0 ? 'bg-amber-100 text-amber-900' :
                                                        index === 1 ? 'bg-stone-200 text-stone-800' :
                                                        index === 2 ? 'bg-orange-100 text-orange-900' :
                                                        'bg-stone-100 text-stone-600'
                                                    }`}>
                                                        {index + 1}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-stone-900 text-xs truncate">{artisan.name}</p>
                                                        <p className="text-[10px] font-medium text-stone-500 truncate">{artisan.shop_name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-2 px-2 text-right">
                                                <p className="font-extrabold text-stone-900 text-xs">₱{Number(artisan.total_gmv || 0).toLocaleString()}</p>
                                                <p className="text-[9px] text-stone-400 font-medium">{artisan.orders_count} {artisan.orders_count === 1 ? 'order' : 'orders'}</p>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="2" className="py-6 text-center text-[10px] text-stone-400 italic">No sales recorded yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right Column: Seller Activity & Outreach */}
                    <div className="print-card p-3.5 rounded-xl bg-white flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between pb-2 border-b border-stone-100 mb-2.5">
                                <div>
                                    <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                                        <AlertTriangle className="text-amber-500" size={14} />
                                        Seller Activity &amp; Outreach
                                    </h3>
                                    <p className="text-[10px] text-stone-500 font-medium">Inactivity monitoring &amp; retention health</p>
                                </div>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-stone-500 bg-stone-50 px-2 py-0.5 rounded border border-stone-200">
                                    Retention
                                </span>
                            </div>

                            {/* Status Bar */}
                            <div className="grid grid-cols-3 gap-1.5 p-2 bg-stone-50 rounded-lg border border-stone-100 text-center mb-2.5">
                                <div>
                                    <p className="text-[9px] uppercase font-bold text-stone-400">Active</p>
                                    <p className="text-xs font-extrabold text-emerald-700">{churn.active}</p>
                                </div>
                                <div className="border-x border-stone-200">
                                    <p className="text-[9px] uppercase font-bold text-stone-400">Needs Check-in</p>
                                    <p className="text-xs font-extrabold text-amber-700">{churn.atRisk}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] uppercase font-bold text-stone-400">Inactive</p>
                                    <p className="text-xs font-extrabold text-stone-600">{churn.churned ?? 0}</p>
                                </div>
                            </div>

                            {/* At-Risk Sellers Table */}
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-stone-100 bg-stone-50/60 text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                                        <th className="py-1.5 px-2">Artisan</th>
                                        <th className="py-1.5 px-2 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {(churn.atRiskList && churn.atRiskList.length > 0 ? churn.atRiskList.slice(0, 5) : []).map((artisan, index) => (
                                        <tr key={artisan.id || index}>
                                            <td className="py-2 px-2">
                                                <p className="font-bold text-stone-900 text-xs truncate">{artisan.name}</p>
                                                <p className="text-[10px] font-medium text-stone-500 truncate">{artisan.shop_name}</p>
                                            </td>
                                            <td className="py-2 px-2 text-right">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                    Inactive {artisan.days_since_last_order ? `(${artisan.days_since_last_order}d)` : 'No orders'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!churn.atRiskList || churn.atRiskList.length === 0) && (
                                        <tr>
                                            <td colSpan="2" className="py-6 text-center text-[10px] text-emerald-600 font-medium italic">All artisans actively engaged.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Page 2 Footer */}
                <div className="border-t border-stone-200 pt-2 flex items-center justify-between text-[9px] text-stone-400 font-medium">
                    <span>LikhangKamay Platform Administration • Operations &amp; Retention Audit</span>
                    <span>Page 2 of 2 • All metrics calculated from database-backed transaction records</span>
                    <span>Confidential</span>
                </div>
            </div>
        </div>
    );
}
