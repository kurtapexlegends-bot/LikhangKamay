import React, { useMemo } from 'react';
import { Link } from '@inertiajs/react';
import OperationsControl from '@/Components/Seller/Performance/OperationsControl';
import SatisfactionBreakdown from '@/Components/Seller/Performance/SatisfactionBreakdown';
import CampaignIntelligence from '@/Components/Seller/Performance/CampaignIntelligence';
import { Package } from 'lucide-react';
import PrintReportKPIs from './PrintReportKPIs';
import PrintReportCharts from './PrintReportCharts';
import PrintReportHeatmap from './PrintReportHeatmap';

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

                    @page {
                        size: portrait;
                        margin: 12mm 15mm 12mm 15mm !important;
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
                        grid-template-columns: repeat(2, 1fr) !important;
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

                    /* 5. Ratings and Top Products Row */
                    .performance-loyalty-ratings-container {
                        display: grid !important;
                        grid-template-columns: repeat(2, 1fr) !important;
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
            <PrintReportKPIs
                isLoading={isLoading}
                metrics={metrics}
                revenueTrend={revenueTrend}
                profitTrend={profitTrend}
                revenueBreakdown={revenueBreakdown}
                shouldAnimateKPI={shouldAnimateKPI}
            />

            {/* Level 2: Financial Charts */}
            <PrintReportCharts
                isLoading={isLoading}
                chartFilter={chartFilter}
                currentChartData={currentChartData}
                categoryData={categoryData}
                updateCategoryFilter={updateCategoryFilter}
            />

            {/* Level 3: Peak Heatmap & Operations Control */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 performance-heatmap-ops-container">
                {/* Peak Sales Heatmap */}
                <PrintReportHeatmap salesHeatmap={salesHeatmap} />

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

            {/* Level 5: Customer Ratings & Top Products */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 performance-loyalty-ratings-container">
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
