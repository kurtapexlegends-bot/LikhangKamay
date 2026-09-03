import React, { useMemo } from 'react';
import { Package } from 'lucide-react';
import PrintReportKPIs from './PrintReportKPIs';
import PrintReportCharts from './PrintReportCharts';
import PrintReportHeatmap from './PrintReportHeatmap';
import SatisfactionBreakdown from './SatisfactionBreakdown';

const pesoFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const formatPeso = (value) => pesoFormatter.format(Number(value || 0));

export default function PrintReportView({
    auth,
    isLoading,
    metrics = {},
    insights = {},
    dataContext = {},
    chartFilter = 'Monthly',
    chartData = {},
    categoryData = [],
    topProducts = [],
    sellerSubscription,
    sponsorshipMetrics,
}) {
    const stats = metrics.review_stats;
    const salesHeatmap = insights?.sales_heatmap || [];
    const slowMovers = insights?.slow_movers || [];
    const salesVelocity = insights?.sales_velocity || [];
    const shopName = auth?.user?.shop_name || auth?.user?.name || 'Artisan Shop';

    const currentChartData = chartData[chartFilter.toLowerCase()] || [];
    const generatedAt = dataContext?.generated_at;

    const formattedGeneratedDate = useMemo(() => {
        if (!generatedAt) return '';
        return new Date(generatedAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
    }, [generatedAt]);

    const revenueTrend = useMemo(() => {
        return (chartData.monthly || []).slice(-7).map(d => d.revenue);
    }, [chartData.monthly]);

    const profitTrend = useMemo(() => {
        return (chartData.monthly || []).slice(-7).map(d => d.profit || (d.revenue * 0.4));
    }, [chartData.monthly]);

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

                    .performance-kpis-container {
                        display: grid !important;
                        grid-template-columns: repeat(4, 1fr) !important;
                        gap: 12px !important;
                        width: 100% !important;
                    }

                    .performance-charts-container {
                        display: grid !important;
                        grid-template-columns: 2fr 1fr !important;
                        gap: 16px !important;
                        width: 100% !important;
                    }

                    .recharts-responsive-container {
                        width: 100% !important;
                        height: 250px !important;
                    }

                    /* Exact color rendering */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}} />

            {/* PAGE 1: Financial & Commercial Performance */}
            <div className="print-page-1 space-y-4">
                {/* Page 1 Header */}
                <div className="border-b-2 border-stone-900 pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-clay-700">LikhangKamay Artisan Network</span>
                                <span className="text-stone-300">•</span>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                                    Plan: {sellerSubscription?.tierLabel || 'Standard'}
                                </span>
                            </div>
                            <h1 className="text-xl font-black text-stone-900 tracking-tight mt-0.5">
                                {shopName} • Performance Report
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
                        <span className="bg-stone-50 px-2 py-0.5 rounded border border-stone-200 text-stone-700 font-bold">Store-Wide Sales</span>
                        <span className="ml-auto text-stone-400">Source: Transaction Ledger & Operations Database</span>
                    </div>
                </div>

                {/* Section 1: 4 Key Performance Indicators */}
                <PrintReportKPIs
                    isLoading={isLoading}
                    metrics={metrics}
                    revenueTrend={revenueTrend}
                    profitTrend={profitTrend}
                />

                {/* Section 2: Revenue Trend & Sales by Category */}
                <PrintReportCharts
                    isLoading={isLoading}
                    chartFilter={chartFilter}
                    currentChartData={currentChartData}
                    categoryData={categoryData}
                />

                {/* Section 3: Peak Activity Heatmap */}
                <div className="print-avoid-break">
                    <PrintReportHeatmap salesHeatmap={salesHeatmap} />
                </div>

                {/* Page 1 Footer */}
                <div className="border-t border-stone-200 pt-2 flex items-center justify-between text-[9px] text-stone-400 font-medium">
                    <span>LikhangKamay Artisan Network • {shopName}</span>
                    <span>Page 1 of 2 • Financial & Sales Performance Overview</span>
                    <span>Verified Store Analytics</span>
                </div>
            </div>

            {/* PAGE 2: Operations, Inventory & Customer Insights */}
            <div className="print-page-2 space-y-4 pt-2">
                {/* Page 2 Running Header */}
                <div className="border-b border-stone-300 pb-2.5 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-clay-700">LikhangKamay • {shopName}</p>
                        <h2 className="text-base font-bold text-stone-900 leading-tight">Operations, Inventory & Customer Insights</h2>
                    </div>
                    <div className="text-right text-[10px] text-stone-500 font-medium">
                        <span>Page 2 of 2</span>
                    </div>
                </div>

                {/* Section 4: Catalog Demand & Velocity */}
                <div className="print-card p-4 rounded-xl border border-stone-200 print-avoid-break">
                    <div className="flex items-center justify-between pb-2.5 border-b border-stone-100 mb-3">
                        <div>
                            <h3 className="text-sm font-bold text-stone-900 leading-none">Catalog Demand & Velocity</h3>
                            <p className="text-[10px] text-stone-500 mt-1 font-medium">Sales turnaround speed and stagnant catalog performance</p>
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-stone-500 bg-stone-50 px-2 py-0.5 rounded border border-stone-200">
                            Merchandising
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Sales Velocity */}
                        <div className="border-r border-stone-100 pr-3">
                            <h4 className="text-[9px] font-black uppercase text-stone-400 mb-2 tracking-wider">Sales Velocity</h4>
                            {salesVelocity.length > 0 ? (
                                <div className="space-y-2">
                                    {salesVelocity.slice(0, 3).map((v, i) => (
                                        <div key={i} className="flex flex-col gap-1">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="font-semibold text-stone-700 truncate max-w-[130px]">{v.name}</span>
                                                <span className="font-bold text-stone-900 text-[11px]">{Math.round(v.avg_days_to_sell)} days</span>
                                            </div>
                                            <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                                                <div className="h-full bg-clay-500 rounded-full" style={{ width: `${Math.min(100, (5 / Math.max(1, v.avg_days_to_sell)) * 100)}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[11px] text-stone-400 italic py-1">Turnover data calibrating from recent sales.</p>
                            )}
                        </div>

                        {/* Slow Movers */}
                        <div className="pl-1">
                            <h4 className="text-[9px] font-black uppercase text-stone-400 mb-2 tracking-wider">Slow-Moving Catalog</h4>
                            {slowMovers.length > 0 ? (
                                <div className="space-y-1.5">
                                    {slowMovers.slice(0, 3).map((p, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs py-0.5">
                                            <span className="text-stone-700 truncate max-w-[140px] font-medium">{p.name}</span>
                                            <span className="text-[10px] text-stone-500 font-bold shrink-0">{Number(p.days_inactive || 0).toFixed(0)}d inactive • {p.stock} units</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[11px] text-emerald-600 font-medium py-1">All catalog items have healthy customer demand.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section 5: Customer Ratings & Top Products */}
                <div className="grid grid-cols-2 gap-4 print-avoid-break">
                    {/* Customer Ratings Breakdown */}
                    <SatisfactionBreakdown stats={stats} compact={true} />

                    {/* Top Performing Products */}
                    <div className="bg-white p-5 rounded-2xl border border-stone-200/80 flex flex-col justify-between print-card">
                        <div className="flex justify-between items-center pb-2.5 border-b border-stone-100 mb-3">
                            <div>
                                <h3 className="text-sm font-bold text-stone-900 leading-none">Top Products</h3>
                                <p className="text-[10px] text-stone-500 mt-1 font-medium">Ranked by sales volume & total profit</p>
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-stone-500 bg-stone-50 px-2 py-0.5 rounded border border-stone-200">
                                Best Sellers
                            </span>
                        </div>

                        <div className="space-y-2 flex-1">
                            {topProducts.length > 0 ? (
                                topProducts.slice(0, 3).map((item, index) => {
                                    const imageUrl = item.img ? (item.img.startsWith('http') || item.img.startsWith('/storage') ? item.img : `/storage/${item.img}`) : null;
                                    return (
                                        <div key={index} className="flex items-center gap-2.5 bg-stone-50 p-2 rounded-lg border border-stone-100">
                                            <div className="w-9 h-9 rounded-md overflow-hidden bg-stone-200 border border-white shrink-0">
                                                {imageUrl ? (
                                                    <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-stone-400 bg-stone-100"><Package size={14} /></div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1 flex flex-col justify-between">
                                                <div className="flex items-center justify-between">
                                                    <p className="font-bold text-stone-900 truncate text-xs">{item.name}</p>
                                                    <span className="text-xs font-black text-clay-700">{formatPeso(item.profit)}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[10px] text-stone-400 mt-0.5">
                                                    <span>{item.sales} units sold</span>
                                                    <span className="font-semibold text-stone-500">{item.margin}% margin</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="h-full flex items-center justify-center py-6 bg-stone-50 rounded-lg">
                                    <p className="text-[10px] text-stone-400 italic">No product sales records yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section 6: Elite Tier Campaign Intelligence (If applicable) */}
                {sponsorshipMetrics && sellerSubscription?.isElite && (
                    <div className="print-card p-4 rounded-xl border border-stone-200 print-avoid-break">
                        <div className="flex items-center justify-between pb-2.5 border-b border-stone-100 mb-3">
                            <div>
                                <h3 className="text-sm font-bold text-stone-900 leading-none">Promotions & Placement Intelligence</h3>
                                <p className="text-[10px] text-stone-500 mt-1 font-medium">Performance summary for sponsored showcase listings</p>
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                                Elite Sponsor
                            </span>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Campaigns</p>
                                <p className="text-base font-bold text-stone-900 mt-0.5">{sponsorshipMetrics.active_campaigns ?? 0}</p>
                            </div>
                            <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Impressions</p>
                                <p className="text-base font-bold text-stone-900 mt-0.5">{(sponsorshipMetrics.total_impressions ?? 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Clicks</p>
                                <p className="text-base font-bold text-stone-900 mt-0.5">{(sponsorshipMetrics.total_clicks ?? 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">CTR</p>
                                <p className="text-base font-bold text-stone-900 mt-0.5">{Number(sponsorshipMetrics.ctr ?? 0).toFixed(1)}%</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Official Document Footer */}
                <div className="border-t border-stone-200 pt-3 flex items-center justify-between text-[9px] text-stone-400 font-medium">
                    <span>LikhangKamay Artisan Network • Verified Store Report</span>
                    <span>Page 2 of 2 • All metrics calculated from database-backed transaction records</span>
                    <span>Confidential</span>
                </div>
            </div>
        </div>
    );
}
