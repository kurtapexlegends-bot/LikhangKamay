import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Head, usePage } from '@inertiajs/react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import {
    DollarSign,
    Download,
    Printer
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
    sponsorshipMetrics,
    sponsorshipChartData,
    sponsorshipAnalyticsAvailability,
    financials_masked,
}) {
    const { sellerSubscription } = usePage().props;
    const { openSidebar } = useSellerWorkspaceShell();
    const [chartFilter, setChartFilter] = useState('Monthly');
    const [isLoading] = useState(false);
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
                {/* Page Action Bar */}
                <div className="flex items-center justify-end gap-2 print:hidden">
                    <ExportButton 
                        onClick={() => setTimeout(() => window.print(), 150)} 
                        icon={Printer} 
                        variant="secondary" 
                        className="h-9 min-h-[36px] px-3.5 rounded-xl shadow-2xs font-bold text-xs"
                    >
                        <span className="hidden sm:inline">Print Report</span>
                        <span className="sm:hidden">Print</span>
                    </ExportButton>

                    {financials_masked ? (
                        <ExportButton icon={Download} disabled className="h-9 min-h-[36px] px-3.5 rounded-xl shadow-2xs font-bold text-xs">
                            Revenue Masked
                        </ExportButton>
                    ) : sellerSubscription?.canExportAnalytics ? (
                        <ExportButton href={route('analytics.export')} icon={Download} variant="primary" className="h-9 min-h-[36px] px-3.5 rounded-xl shadow-2xs font-bold text-xs">
                            <span className="hidden sm:inline">Export CSV</span>
                            <span className="sm:hidden">Export</span>
                        </ExportButton>
                    ) : (
                        <ExportButton icon={DollarSign} disabled className="h-9 min-h-[36px] px-3.5 rounded-xl shadow-2xs font-bold text-xs">
                            Premium Export
                        </ExportButton>
                    )}
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
                            setChartFilter={setChartFilter}
                            currentChartData={currentChartData}
                            categoryData={categoryData}
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
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Catalog Performance & Customer Demand</span>
                            <div className="h-px bg-stone-200/60 flex-1" />
                        </div>

                        <OperationsControl 
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
                    auth={auth}
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
                />

            </main>
        </>
    );
}

Analytics.layout = (page) => <SellerWorkspaceLayout active="analytics">{page}</SellerWorkspaceLayout>;
