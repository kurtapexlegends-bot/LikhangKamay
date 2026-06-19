import React, { useMemo } from 'react';
import { Link } from '@inertiajs/react';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import KPICard from '@/Components/KPICard';
import StaggerContainer from '@/Components/StaggerContainer';
import ContentTransition from '@/Components/ContentTransition';
import ArtisanSkeleton from '@/Components/Consumer/ArtisanSkeleton';
import OperationsControl from '@/Components/Seller/Performance/OperationsControl';
import CustomerLoyalty from '@/Components/Seller/Performance/CustomerLoyalty';
import SatisfactionBreakdown from '@/Components/Seller/Performance/SatisfactionBreakdown';
import CampaignIntelligence from '@/Components/Seller/Performance/CampaignIntelligence';
import {
    Package,
    DollarSign,
    TrendingUp,
    Activity,
    Star
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip as RechartsTooltip
} from 'recharts';

const COLORS = ['#c07251', '#d97706', '#059669', '#57534e', '#e11d48', '#8c5a44'];

const pesoFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const formatPeso = (value) => pesoFormatter.format(Number(value || 0));

export default function PrintReportView({
    isLoading,
    metrics,
    insights,
    dataContext,
    chartFilter,
    chartData,
    categoryData,
    topProducts,
    sellerSubscription,
    sponsorshipMetrics,
    sponsorshipChartData,
    sponsorshipAnalyticsAvailability,
    shouldAnimateKPI,
    updateCategoryFilter,
}) {
    const currentChartData = chartData[chartFilter.toLowerCase()] || [];
    const stats = metrics.review_stats;
    const vipCustomers = insights?.vip_customers || [];
    const loyaltyStats = insights?.loyalty_stats || { new: 0, returning: 0, total_unique: 0 };
    const salesHeatmap = insights?.sales_heatmap || [];

    const revenueTrend = useMemo(() => {
        return (chartData.monthly || []).slice(-7).map(d => d.revenue);
    }, [chartData.monthly]);

    const profitTrend = useMemo(() => {
        return (chartData.monthly || []).slice(-7).map(d => d.profit || (d.revenue * 0.4));
    }, [chartData.monthly]);

    const revenueBreakdown = useMemo(() => {
        const result = {};
        (categoryData || []).forEach(item => {
            const label = item.name || item.category || 'Other';
            if (label !== 'Other' || item.value > 0) {
                result[label] = item.value;
            }
        });
        return result;
    }, [categoryData]);

    return (
        <div className="hidden print:block space-y-6">
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

                    .lg\\:ml-52 {
                        margin-left: 0 !important;
                    }

                    /* Apply border styles to white boxes in print and avoid breaking */
                    .bg-white {
                        border: 1px solid #e5e7eb !important;
                        box-shadow: none !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        border-radius: 12px !important;
                    }

                    /* Page-Break Helpers */
                    .print-page-1 {
                        page-break-after: always !important;
                        break-after: page !important;
                    }
                    .print-page-2 {
                        page-break-after: always !important;
                        break-after: page !important;
                    }

                    /* 1. KPIs Layout */
                    .performance-kpis-container {
                        display: grid !important;
                        grid-template-columns: repeat(4, 1fr) !important;
                        gap: 16px !important;
                        width: 100% !important;
                        margin-bottom: 24px !important;
                    }

                    /* 2. Charts Layout */
                    .performance-charts-container {
                        display: grid !important;
                        grid-template-columns: 2fr 1fr !important;
                        gap: 20px !important;
                        width: 100% !important;
                    }

                    /* Force chart responsiveness under print */
                    .recharts-responsive-container {
                        width: 100% !important;
                        height: 250px !important;
                    }

                    /* 3. Heatmap & Operations Control Layout */
                    .performance-heatmap-ops-container {
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 24px !important;
                        width: 100% !important;
                    }
                    
                    /* Heatmap Row Alignment */
                    .performance-heatmap-row {
                        display: grid !important;
                        grid-template-columns: 60px repeat(7, 1fr) !important;
                        gap: 4px !important;
                        align-items: center !important;
                        width: 100% !important;
                    }

                    /* Operations print layout grid */
                    .operations-print-grid {
                        display: grid !important;
                        grid-template-columns: repeat(3, 1fr) !important;
                        gap: 16px !important;
                        width: 100% !important;
                    }

                    /* 4. Campaign Intelligence Print Rules */
                    .campaign-kpis-container {
                        display: grid !important;
                        grid-template-columns: repeat(4, 1fr) !important;
                        gap: 16px !important;
                        width: 100% !important;
                        margin-bottom: 16px !important;
                    }
                    .campaign-details-container {
                        display: grid !important;
                        grid-template-columns: 2fr 1fr !important;
                        gap: 20px !important;
                        width: 100% !important;
                    }

                    /* 5. Loyalty, Ratings, and Top Products Row */
                    .performance-loyalty-ratings-container {
                        display: grid !important;
                        grid-template-columns: repeat(3, 1fr) !important;
                        gap: 20px !important;
                        width: 100% !important;
                    }

                    /* Nested card ratios */
                    .customer-loyalty-grid {
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 16px !important;
                        }
                    .satisfaction-breakdown-grid {
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 16px !important;
                        align-items: center !important;
                    }

                    /* Image Sizing and rendering constraints */
                    img {
                        max-width: 100% !important;
                        display: inline-block !important;
                        object-fit: cover !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .w-10 {
                        width: 40px !important;
                        min-width: 40px !important;
                        height: 40px !important;
                    }
                    .w-9 {
                        width: 36px !important;
                        min-width: 36px !important;
                        height: 36px !important;
                    }

                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}} />

            {/* Print-Only Document Header */}
            <div className="border-b-2 border-stone-200 pb-4 mb-6 mx-4 sm:mx-6 lg:mx-8">
                <h1 className="text-2xl font-bold text-stone-900">LikhangKamay Shop Performance Report</h1>
                <p className="text-xs text-stone-500 mt-1">
                    Generated on: {new Date(dataContext.generated_at).toLocaleString()} • Plan: {sellerSubscription?.tierLabel || 'Standard'}
                </p>
            </div>

            {/* Level 1: Key Performance Indicators */}
            <StaggerContainer className="flex overflow-x-auto pb-2.5 gap-4 flex-nowrap snap-x snap-mandatory sm:grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 performance-kpis-container">
                {isLoading ? (
                    <ArtisanSkeleton variant="stat" count={4} />
                ) : (
                    <>
                        <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto">
                            <KPICard 
                                title="Total Revenue" 
                                value={metrics.total_revenue} 
                                growth={metrics.growth?.revenue} 
                                growthSuffix=" vs last month"
                                trendData={revenueTrend}
                                breakdown={Object.keys(revenueBreakdown || {}).length > 0 ? revenueBreakdown : null}
                                icon={DollarSign} 
                                bg="bg-stone-50" 
                                color="text-clay-600" 
                                animate={shouldAnimateKPI}
                            />
                        </div>
                        <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto">
                            <KPICard 
                                title="Gross Profit" 
                                value={metrics.gross_profit} 
                                growth={metrics.growth?.profit} 
                                growthSuffix=" vs last month"
                                trendData={profitTrend}
                                icon={TrendingUp} 
                                bg="bg-emerald-50" 
                                color="text-emerald-600" 
                                animate={shouldAnimateKPI}
                            />
                        </div>
                        <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto">
                            <KPICard 
                                title="Profit Margin" 
                                value={`${Number(metrics.profit_margin || 0).toFixed(1)}%`} 
                                growth={metrics.growth?.margin} 
                                growthSuffix=" vs last month"
                                icon={Activity} 
                                bg="bg-emerald-50" 
                                color="text-emerald-600" 
                                animate={shouldAnimateKPI} 
                            />
                        </div>
                        <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto">
                            <KPICard 
                                title="Shop Rating" 
                                value={`${metrics.average_rating} / 5.0`} 
                                growth={metrics.growth?.rating} 
                                growthSuffix=" vs last month"
                                icon={Star} 
                                bg="bg-amber-50" 
                                color="text-amber-600" 
                                formatter={(v) => v.toFixed(1)} 
                                animate={shouldAnimateKPI} 
                            />
                        </div>
                    </>
                )}
            </StaggerContainer>

            {/* Level 2: Financial Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 performance-charts-container print-page-1">
                <div className="min-w-0 lg:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex flex-col relative overflow-hidden">
                    <ContentTransition
                        isShowingPlaceholder={isLoading}
                        placeholder={
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
                                <div className="h-full w-full relative overflow-hidden bg-stone-50/30">
                                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
                                </div>
                            </div>
                        }
                    >
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                                    <span>Revenue Analytics</span>
                                    <span className="hidden print:inline-block text-[10px] font-extrabold uppercase tracking-wider text-clay-700 bg-stone-50 px-2 py-0.5 rounded border border-stone-200">
                                        {chartFilter}
                                    </span>
                                </h3>
                                <p className="text-sm text-stone-500">Income over time</p>
                            </div>
                        </div>

                        <div className="h-64 min-h-[250px] w-full min-w-0">
                            {currentChartData.length > 0 ? (
                                <>
                                    {/* Screen Chart */}
                                    <div className="print:hidden h-full w-full">
                                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                            <AreaChart data={currentChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorRevenuePrintScreen" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#c07251" stopOpacity={0.15} />
                                                        <stop offset="95%" stopColor="#c07251" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 12 }} dy={15} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 12 }} tickFormatter={(val) => formatPeso(val)} />
                                                <RechartsTooltip
                                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                    formatter={(value) => formatPeso(value)}
                                                    cursor={{ stroke: '#c07251', strokeWidth: 1, strokeDasharray: '4 4' }}
                                                />
                                                <Area type="monotone" dataKey="value" stroke="#c07251" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenuePrintScreen)" dot={{ r: 4, fill: '#c07251', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                    {/* Print Chart (Fixed width to bypass ResponsiveContainer collapse) */}
                                    <div className="hidden print:flex print:justify-center w-full h-[230px]">
                                        <AreaChart width={445} height={220} data={currentChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorRevenuePrintPrint" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#c07251" stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor="#c07251" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 12 }} dy={15} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 12 }} tickFormatter={(val) => formatPeso(val)} />
                                            <Area type="monotone" dataKey="value" stroke="#c07251" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenuePrintPrint)" dot={{ r: 4, fill: '#c07251', strokeWidth: 2, stroke: '#fff' }} />
                                        </AreaChart>
                                    </div>
                                </>
                            ) : (
                                <div className="h-full">
                                    <WorkspaceEmptyState
                                        compact
                                        icon={DollarSign}
                                        title="No revenue data yet"
                                        description="Completed orders for this filter will appear here once your shop starts converting sales."
                                        actionLabel="View Orders"
                                        actionHref={route('orders.index')}
                                    />
                                </div>
                            )}
                        </div>
                    </ContentTransition>
                </div>

                <div className="min-w-0 bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex flex-col justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-stone-900">Sales by Category</h3>
                        <p className="text-sm text-stone-500 mb-4">Total items sold</p>
                    </div>

                    <div className="h-[180px] w-full flex items-center justify-center relative">
                        {categoryData.length > 0 ? (
                            <PieChart width={160} height={160}>
                                <Pie
                                    data={categoryData}
                                    nameKey="category"
                                    cx={80}
                                    cy={80}
                                    innerRadius={45}
                                    outerRadius={70}
                                    paddingAngle={4}
                                    dataKey="value"
                                    stroke="none"
                                    onClick={updateCategoryFilter ? (data) => updateCategoryFilter(data.category || data.name) : undefined}
                                    className={updateCategoryFilter ? "cursor-pointer" : ""}
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 600 }}
                                    formatter={(value, name) => [`${value} items`, name]}
                                />
                            </PieChart>
                        ) : (
                            <div className="absolute inset-0">
                                <WorkspaceEmptyState
                                    compact
                                    icon={Package}
                                    title="No category sales yet"
                                    description="Category performance becomes available after your first completed orders."
                                    actionLabel="Manage Products"
                                    actionHref={route('products.index')}
                                />
                            </div>
                        )}
                    </div>

                    {categoryData.length > 0 && (
                        <div className="mt-4 space-y-2 pt-3 border-t border-stone-100 max-h-[140px] overflow-y-auto pr-1">
                            {(() => {
                                const total = categoryData.reduce((sum, item) => sum + item.value, 0);
                                return categoryData.map((item, index) => (
                                    <div key={index} className="flex flex-col gap-0.5">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                <span className="font-bold text-stone-900 truncate max-w-[120px]">{item.category || item.name}</span>
                                            </div>
                                            <span className="font-black text-clay-700">{formatPeso(item.profit)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-stone-400">
                                            <span>{item.value} sold • {item.margin}% margin</span>
                                            <span className="font-bold">{total > 0 ? Math.round((item.value / total) * 100) : 0}% share</span>
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    )}
                </div>
            </div>

            {/* Level 3: Peak Heatmap & Operations Control */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 performance-heatmap-ops-container print-page-2">
                {/* Peak Sales Heatmap */}
                <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex flex-col justify-between">
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4">
                        <div>
                            <h3 className="text-base font-bold text-stone-900 leading-none">Peak Activity Heatmap</h3>
                            <p className="text-[11px] text-stone-500 mt-1.5 leading-tight">When your customers are most likely to buy</p>
                        </div>
                        <div className="flex items-center gap-3 text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                            <span>Quiet</span>
                            <div className="flex gap-0.5">
                                <div className="w-2.5 h-2.5 rounded-sm bg-stone-50 border border-stone-100" />
                                <div className="w-2.5 h-2.5 rounded-sm bg-clay-100" />
                                <div className="w-2.5 h-2.5 rounded-sm bg-clay-300" />
                                <div className="w-2.5 h-2.5 rounded-sm bg-clay-500" />
                            </div>
                            <span>Peak</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-x-auto pb-2">
                        <div className="min-w-[500px]">
                            <div className="grid grid-cols-8 gap-1 performance-heatmap-row">
                                <div className="col-span-1" />
                                {['12 AM', '4 AM', '8 AM', '12 PM', '4 PM', '8 PM', '11 PM'].map((h, i) => (
                                    <div key={i} className="text-[9px] font-bold text-stone-400 text-center uppercase">{h}</div>
                                ))}
                            </div>
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                                <div key={day} className="grid grid-cols-8 gap-1 mt-1 performance-heatmap-row">
                                    <div className="text-[10px] font-bold text-stone-600 flex items-center pr-2">{day}</div>
                                    {[0, 4, 8, 12, 16, 20, 23].map((hour) => {
                                        const match = salesHeatmap.find(h => h.day === day && h.hour === hour);
                                        const count = match ? match.count : 0;
                                        const opacity = count === 0 ? 'bg-stone-50' : 
                                                        count < 2 ? 'bg-clay-100' :
                                                        count < 5 ? 'bg-clay-300' : 'bg-clay-600 shadow-sm';
                                        return (
                                            <div 
                                                key={hour} 
                                                className={`h-7 rounded-md ${opacity} transition-all hover:scale-105 cursor-help flex items-center justify-center`}
                                                title={`${count} orders at ${hour}:00 on ${day}`}
                                            >
                                                {count > 0 && <span className={`text-[9px] font-bold ${count > 4 ? 'text-white' : 'text-clay-800'}`}>{count}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                    <p className="mt-3 text-[9px] text-stone-400 italic">Recommendation: Schedule product updates or campaigns matching dark heatmap blocks.</p>
                </div>

                {/* Operations Control */}
                <div className="lg:col-span-1">
                    <OperationsControl metrics={metrics} insights={insights} />
                </div>
            </div>

            {/* Level 4: Campaign Placements */}
            <CampaignIntelligence 
                sellerSubscription={sellerSubscription} 
                sponsorshipMetrics={sponsorshipMetrics} 
                sponsorshipChartData={sponsorshipChartData} 
                sponsorshipAnalyticsAvailability={sponsorshipAnalyticsAvailability} 
                animate={shouldAnimateKPI}
            />

            {/* Level 5: Customer Retention, VIP Patrons, Customer Ratings & Top Products */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 performance-loyalty-ratings-container">
                <div className="lg:col-span-1">
                    <CustomerLoyalty vipCustomers={vipCustomers} loyaltyStats={loyaltyStats} />
                </div>

                <div className="lg:col-span-1">
                    <SatisfactionBreakdown stats={stats} />
                </div>

                <div className="lg:col-span-1 bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex flex-col justify-between min-h-[300px]">
                    <div className="flex justify-between items-center pb-3 border-b border-stone-50 mb-3">
                        <div>
                            <h3 className="text-base font-bold text-stone-900 leading-none">Top Products</h3>
                            <p className="text-[11px] text-stone-500 mt-1.5 leading-tight">Best performers by sales volume</p>
                        </div>
                        <Link href={route('products.index')} className="text-xs font-bold text-clay-600 hover:underline">Manage</Link>
                    </div>

                    <div className="flex-1 space-y-2 overflow-y-auto max-h-[220px] pr-1">
                        {topProducts.length > 0 ? (
                            topProducts.slice(0, 3).map((item, index) => {
                                const imageUrl = item.img ? (item.img.startsWith('http') || item.img.startsWith('/storage') ? item.img : `/storage/${item.img}`) : null;
                                return (
                                    <div key={index} className="flex items-center gap-3 bg-stone-50/50 p-2 rounded-xl border border-stone-100 hover:bg-white hover:shadow-sm transition-all duration-300">
                                        <div className="relative shrink-0">
                                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-200 border border-white">
                                                {imageUrl ? (
                                                    <img 
                                                        src={imageUrl} 
                                                        alt="" 
                                                        className="w-full h-full object-cover" 
                                                        onError={(e) => { e.target.style.display = 'none'; }} 
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-stone-400 bg-stone-100"><Package size={14} /></div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="min-w-0 flex-1 flex flex-col justify-between">
                                            <div className="flex items-center justify-between">
                                                <p className="font-bold text-stone-900 truncate text-xs leading-none">{item.name}</p>
                                                <span className="text-xs font-black text-clay-700">{formatPeso(item.profit)}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] text-stone-400 mt-1">
                                                <span>{item.sales} sold</span>
                                                <span>{item.margin}% margin</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="h-full flex items-center justify-center py-6 bg-stone-50 border border-stone-100 rounded-xl">
                                <p className="text-[10px] text-stone-400 italic">No sales data recorded yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
