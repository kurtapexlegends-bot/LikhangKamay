import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Head, router, usePage } from '@inertiajs/react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import {
    Activity,
    DollarSign,
    Download,
    Printer,
    Users
} from 'lucide-react';
import ExportButton from '@/Components/ExportButton';

// Modular UI Components
import OperationsControl from '@/Components/Seller/Performance/OperationsControl';
import CampaignIntelligence from '@/Components/Seller/Performance/CampaignIntelligence';
import OverviewTab from '@/Components/Seller/Performance/OverviewTab';
import PrintReportView from '@/Components/Seller/Performance/PrintReportView';

export default function Analytics({
    auth,
    metrics,
    insights,
    dataContext,
    chartData,
    categoryData,
    topProducts,
    categories,
    filters,
    sponsorshipMetrics,
    sponsorshipChartData,
    sponsorshipAnalyticsAvailability,
    financials_masked,
}) {
    const { sellerSubscription } = usePage().props;
    const { openSidebar } = useSellerWorkspaceShell();
    const [chartFilter, setChartFilter] = useState('Monthly');
    const [catFilter, setCatFilter] = useState(filters.category);
    const [isLoading, setIsLoading] = useState(false);
    const [shouldAnimateKPI, setShouldAnimateKPI] = useState(true);


    useEffect(() => {
        const timer = setTimeout(() => setShouldAnimateKPI(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    const currentChartData = chartData[chartFilter.toLowerCase()] || [];
    const stats = metrics.review_stats;
    const salesHeatmap = insights?.sales_heatmap || [];

    const revenueTrend = useMemo(() => {
        return (chartData.monthly || []).slice(-7).map(d => d.revenue);
    }, [chartData.monthly]);

    const profitTrend = useMemo(() => {
        return (chartData.monthly || []).slice(-7).map(d => d.profit || (d.revenue * 0.4));
    }, [chartData.monthly]);

    const updateCategoryFilter = (newCat) => {
        setCatFilter(newCat);
        setIsLoading(true);
        router.get(route('analytics.index'), { category: newCat }, { 
            preserveState: true, 
            preserveScroll: true,
            onFinish: () => setIsLoading(false)
        });
    };

    return (
        <>
            <Head title="Shop Analytics" />
            <SellerHeader
                title="Analytics"
                subtitle="View shop sales, active orders, and category performance."
                auth={auth}
                onMenuClick={openSidebar}
            />

            <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
                {/* Unified Dashboard Command Bar */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200/80 shadow-2xs print:hidden">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-clay-50 border border-clay-100 flex items-center justify-center text-clay-700 shrink-0">
                            <Activity size={18} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-bold text-stone-900 leading-none">Performance Overview</h2>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                    Live Data
                                </span>
                            </div>
                            <p className="text-xs text-stone-500 font-medium mt-1">Real-time store traffic, conversions, and sales metrics.</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
                        {/* Time Period Filter Pill */}
                        <div className="flex items-center bg-stone-100 p-0.5 rounded-xl border border-stone-200/60">
                            {['Monthly', 'Yearly'].map((filter) => (
                                <button
                                    key={filter}
                                    type="button"
                                    onClick={() => setChartFilter(filter)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        chartFilter === filter
                                            ? 'bg-white text-stone-900 shadow-2xs border border-stone-200/60'
                                            : 'text-stone-500 hover:text-stone-800'
                                    }`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>

                        {/* Category Dropdown Filter */}
                        {categories && categories.length > 0 && (
                            <select
                                value={catFilter || 'All Categories'}
                                onChange={(e) => updateCategoryFilter(e.target.value)}
                                aria-label="Filter by Product Category"
                                className="h-[38px] text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-xl px-2.5 py-1 focus:ring-1 focus:ring-clay-500 focus:border-clay-500 shadow-2xs"
                            >
                                <option value="All Categories">All Categories</option>
                                {categories.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        )}

                        <ExportButton 
                            onClick={() => setTimeout(() => window.print(), 150)} 
                            icon={Printer} 
                            variant="secondary" 
                            className="h-[38px] min-h-[38px] px-3.5 rounded-xl shadow-2xs font-bold text-xs"
                        >
                            <span className="hidden sm:inline">Print Report</span>
                            <span className="sm:hidden">Print</span>
                        </ExportButton>

                        {financials_masked ? (
                            <ExportButton icon={Download} disabled className="h-[38px] min-h-[38px] px-3.5 rounded-xl shadow-2xs font-bold text-xs">
                                Revenue Masked
                            </ExportButton>
                        ) : sellerSubscription?.canExportAnalytics ? (
                            <ExportButton href={route('analytics.export')} icon={Download} variant="primary" className="h-[38px] min-h-[38px] px-3.5 rounded-xl shadow-2xs font-bold text-xs">
                                <span className="hidden sm:inline">Export CSV</span>
                                <span className="sm:hidden">Export</span>
                            </ExportButton>
                        ) : (
                            <ExportButton icon={DollarSign} disabled className="h-[38px] min-h-[38px] px-3.5 rounded-xl shadow-2xs font-bold text-xs">
                                Premium Export
                            </ExportButton>
                        )}
                    </div>
                </div>

                {/* Single Page Layout with Visual Zones */}
                <motion.div 
                    initial="hidden"
                    animate="show"
                    variants={{
                        hidden: { opacity: 0 },
                        show: {
                            opacity: 1,
                            transition: {
                                staggerChildren: 0.12,
                                delayChildren: 0.05
                            }
                        }
                    }}
                    className="space-y-8 pb-12 print:hidden"
                >
                    {/* Zone 1: Core Financial Performance */}
                    <motion.section 
                        variants={{
                            hidden: { opacity: 0, y: 15 },
                            show: { 
                                opacity: 1, 
                                y: 0, 
                                transition: { 
                                    type: "spring", 
                                    stiffness: 100, 
                                    damping: 18 
                                } 
                            }
                        }}
                    >
                        <OverviewTab 
                            isLoading={isLoading}
                            metrics={metrics}
                            revenueTrend={revenueTrend}
                            profitTrend={profitTrend}
                            shouldAnimateKPI={shouldAnimateKPI}
                            chartFilter={chartFilter}
                            currentChartData={currentChartData}
                            categoryData={categoryData}
                            updateCategoryFilter={updateCategoryFilter}
                        />
                    </motion.section>

                    {/* Zone 2: Store Operations & Inventory */}
                    <motion.section 
                        variants={{
                            hidden: { opacity: 0, y: 15 },
                            show: { 
                                opacity: 1, 
                                y: 0, 
                                transition: { 
                                    type: "spring", 
                                    stiffness: 100, 
                                    damping: 18 
                                } 
                            }
                        }}
                        className="space-y-4"
                    >
                        <div className="flex items-center gap-2 pt-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Operations & Catalog Health</span>
                            <div className="h-px bg-stone-200/60 flex-1" />
                        </div>

                        <OperationsControl 
                            metrics={metrics} 
                            insights={insights} 
                            topProducts={topProducts} 
                            salesHeatmap={salesHeatmap} 
                            stats={stats}
                        />
                    </motion.section>

                    {/* Zone 3: Campaign Intelligence (Elite Tier) */}
                    {sponsorshipMetrics && (
                        <motion.section 
                            variants={{
                                hidden: { opacity: 0, y: 15 },
                                show: { 
                                    opacity: 1, 
                                    y: 0, 
                                    transition: { 
                                        type: "spring", 
                                        stiffness: 100, 
                                        damping: 18 
                                    } 
                                }
                            }}
                            className="space-y-4"
                        >
                            <div className="flex items-center gap-2 pt-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Promotions & Placement</span>
                                <div className="h-px bg-stone-200/60 flex-1" />
                            </div>

                            <CampaignIntelligence 
                                sellerSubscription={sellerSubscription} 
                                sponsorshipMetrics={sponsorshipMetrics} 
                                sponsorshipChartData={sponsorshipChartData} 
                                sponsorshipAnalyticsAvailability={sponsorshipAnalyticsAvailability} 
                                animate={shouldAnimateKPI}
                            />
                        </motion.section>
                    )}
                </motion.div>

                {/* Print-Only Layout (Hidden on screen, visible during print) */}
                <PrintReportView
                    isLoading={isLoading}
                    metrics={metrics}
                    insights={insights}
                    dataContext={dataContext}
                    chartFilter={chartFilter}
                    chartData={chartData}
                    categoryData={categoryData}
                    topProducts={topProducts}
                    sellerSubscription={sellerSubscription}
                    sponsorshipMetrics={sponsorshipMetrics}
                    sponsorshipChartData={sponsorshipChartData}
                    sponsorshipAnalyticsAvailability={sponsorshipAnalyticsAvailability}
                    shouldAnimateKPI={shouldAnimateKPI}
                    updateCategoryFilter={updateCategoryFilter}
                />

            </main>
        </>
    );
}

Analytics.layout = (page) => <SellerWorkspaceLayout active="analytics">{page}</SellerWorkspaceLayout>;
