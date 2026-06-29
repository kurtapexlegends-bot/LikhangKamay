import React, { useMemo, useState, useEffect } from 'react';
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
                actions={
                    <div className="flex items-center gap-2">
                        <ExportButton onClick={() => window.print()} icon={Printer} variant="secondary">
                            Print Report
                        </ExportButton>
                        {financials_masked ? (
                            <ExportButton icon={Download} disabled>
                                Revenue View Required
                            </ExportButton>
                        ) : sellerSubscription?.canExportAnalytics ? (
                            <ExportButton href={route('analytics.export')} icon={Download} variant="primary">
                                Download Report
                            </ExportButton>
                        ) : (
                            <ExportButton icon={DollarSign} disabled>
                                Premium Export
                            </ExportButton>
                        )}
                    </div>
                }
            />

            <main className="flex-1 w-full px-4 pt-0 pb-4 sm:px-6 sm:pt-0 sm:pb-6 lg:px-8 lg:pt-0 lg:pb-8 overflow-y-auto space-y-6">
                
                {/* Single Page Layout */}
                <div className="space-y-8 print:space-y-6">
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

                    <hr className="border-stone-200/60 print:hidden" />

                    <OperationsControl 
                        metrics={metrics} 
                        insights={insights} 
                        topProducts={topProducts} 
                        salesHeatmap={salesHeatmap} 
                        stats={stats}
                    />

                    <hr className="border-stone-200/60 print:hidden" />

                    <CampaignIntelligence 
                        sellerSubscription={sellerSubscription} 
                        sponsorshipMetrics={sponsorshipMetrics} 
                        sponsorshipChartData={sponsorshipChartData} 
                        sponsorshipAnalyticsAvailability={sponsorshipAnalyticsAvailability} 
                        animate={shouldAnimateKPI}
                    />
                </div>

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
