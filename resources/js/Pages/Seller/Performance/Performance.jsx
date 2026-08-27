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
                {/* Header Action Strip */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200/80 shadow-2xs print:hidden">
                    <div>
                        <h2 className="text-sm font-bold text-stone-900">Performance Report</h2>
                        <p className="text-xs text-stone-500 font-medium">Real-time store traffic, conversions, and revenue insights.</p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <ExportButton onClick={() => setTimeout(() => window.print(), 150)} icon={Printer} variant="secondary" className="h-[38px] min-h-[38px] px-3.5 rounded-xl shadow-2xs font-bold text-xs">
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

                {/* Single Page Layout */}
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
                            revenueBreakdown={revenueBreakdown}
                            profitTrend={profitTrend}
                            shouldAnimateKPI={shouldAnimateKPI}
                            chartFilter={chartFilter}
                            setChartFilter={setChartFilter}
                            currentChartData={currentChartData}
                            categoryData={categoryData}
                            updateCategoryFilter={updateCategoryFilter}
                        />
                    </motion.section>

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
                        <OperationsControl 
                            metrics={metrics} 
                            insights={insights} 
                            topProducts={topProducts} 
                            salesHeatmap={salesHeatmap} 
                            stats={stats}
                        />
                    </motion.section>

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
                        <CampaignIntelligence 
                            sellerSubscription={sellerSubscription} 
                            sponsorshipMetrics={sponsorshipMetrics} 
                            sponsorshipChartData={sponsorshipChartData} 
                            sponsorshipAnalyticsAvailability={sponsorshipAnalyticsAvailability} 
                            animate={shouldAnimateKPI}
                        />
                    </motion.section>
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
