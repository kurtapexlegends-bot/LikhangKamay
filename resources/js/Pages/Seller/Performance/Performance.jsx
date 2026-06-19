import React, { useMemo, useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import {
    Activity,
    DollarSign,
    Download,
    Printer,
    LayoutGrid,
    Megaphone,
    Users
} from 'lucide-react';
import ExportButton from '@/Components/ExportButton';

// Modular UI Components
import OperationsControl from '@/Components/Seller/Performance/OperationsControl';
import CustomerLoyalty from '@/Components/Seller/Performance/CustomerLoyalty';
import SatisfactionBreakdown from '@/Components/Seller/Performance/SatisfactionBreakdown';
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
    const [activeTab, setActiveTab] = useState('overview');

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutGrid },
        { id: 'operations', label: 'Operations', icon: Activity },
        { id: 'customers', label: 'Customers', icon: Users },
        { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
    ];

    useEffect(() => {
        const timer = setTimeout(() => setShouldAnimateKPI(false), 2000);
        return () => clearTimeout(timer);
    }, []);

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
                
                {/* Tab Switcher */}
                <div className="print:hidden flex overflow-x-auto whitespace-nowrap scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 justify-start">
                    <div className="inline-flex bg-stone-100/60 p-1 rounded-2xl border border-stone-200/30">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 ${
                                        isActive
                                            ? 'bg-white text-clay-800 shadow-sm'
                                            : 'text-stone-600 hover:text-stone-900'
                                    }`}
                                >
                                    <Icon size={16} className={isActive ? 'text-clay-600' : 'text-stone-500'} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Screen-Only Tabbed Layout */}
                <div className="print:hidden space-y-6">
                    {activeTab === 'overview' && (
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
                    )}

                    {activeTab === 'operations' && (
                        <OperationsControl 
                            metrics={metrics} 
                            insights={insights} 
                            topProducts={topProducts} 
                            salesHeatmap={salesHeatmap} 
                        />
                    )}

                    {activeTab === 'customers' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <CustomerLoyalty vipCustomers={vipCustomers} loyaltyStats={loyaltyStats} />
                            <SatisfactionBreakdown stats={stats} />
                        </div>
                    )}

                    {activeTab === 'campaigns' && (
                        <CampaignIntelligence 
                            sellerSubscription={sellerSubscription} 
                            sponsorshipMetrics={sponsorshipMetrics} 
                            sponsorshipChartData={sponsorshipChartData} 
                            sponsorshipAnalyticsAvailability={sponsorshipAnalyticsAvailability} 
                            animate={shouldAnimateKPI}
                        />
                    )}
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
