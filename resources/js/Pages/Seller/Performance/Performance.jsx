import React, { useMemo, useState, useEffect, lazy, Suspense } from 'react';
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
import ErrorBoundary from '@/Components/ErrorBoundary';

const CampaignIntelligence = lazy(() => import('@/Components/Seller/Performance/CampaignIntelligence'));
const OverviewTab = lazy(() => import('@/Components/Seller/Performance/OverviewTab'));
const PrintReportView = lazy(() => import('@/Components/Seller/Performance/PrintReportView'));

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
    const [isPrinting, setIsPrinting] = useState(false);

    const handlePrint = async () => {
        setIsPrinting(true);
        try {
            await import('@/Components/Seller/Performance/PrintReportView');
            setTimeout(() => {
                window.print();
                setIsPrinting(false);
            }, 150);
        } catch {
            setIsPrinting(false);
            window.print();
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => setShouldAnimateKPI(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    const currentChartData = chartData[chartFilter.toLowerCase()] || [];
    const stats = metrics.review_stats;
    const salesHeatmap = insights?.sales_heatmap || [];

    const revenueTrend = useMemo(() => {
        return (chartData.monthly || []).slice(-7).map(d => Number(d.revenue ?? d.value ?? 0));
    }, [chartData.monthly]);

    const profitTrend = useMemo(() => {
        return (chartData.monthly || []).slice(-7).map(d => Number(d.profit ?? ((d.revenue ?? d.value ?? 0) * 0.4)));
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
                        onClick={handlePrint} 
                        disabled={isPrinting}
                        icon={Printer} 
                        variant="secondary" 
                        className="h-9 min-h-[36px] px-3.5 rounded-xl shadow-2xs font-bold text-xs"
                    >
                        <span className="hidden sm:inline">{isPrinting ? 'Preparing Print...' : 'Print Report'}</span>
                        <span className="sm:hidden">{isPrinting ? 'Preparing...' : 'Print'}</span>
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
                        <ErrorBoundary
                            resetKey={chartFilter}
                            fallback={({ retry }) => (
                                <div className="p-8 bg-white rounded-2xl border border-stone-200/80 text-center space-y-3">
                                    <p className="text-xs text-stone-500 font-medium">Unable to load analytics charts.</p>
                                    <button
                                        type="button"
                                        onClick={retry}
                                        className="px-3.5 py-1.5 text-xs font-bold text-clay-700 hover:text-clay-800 bg-clay-50 hover:bg-clay-100 rounded-xl transition"
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}
                        >
                            <Suspense fallback={
                                <div className="space-y-6 animate-pulse">
                                    <div className="flex overflow-x-auto pb-2.5 gap-3.5 sm:gap-4 lg:gap-5 flex-nowrap snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                                        <div className="w-[82vw] max-w-[280px] shrink-0 snap-center sm:w-auto h-28 bg-white rounded-2xl border border-stone-200/80" />
                                        <div className="w-[82vw] max-w-[280px] shrink-0 snap-center sm:w-auto h-28 bg-white rounded-2xl border border-stone-200/80" />
                                        <div className="w-[82vw] max-w-[280px] shrink-0 snap-center sm:w-auto h-28 bg-white rounded-2xl border border-stone-200/80" />
                                        <div className="w-[82vw] max-w-[280px] shrink-0 snap-center sm:w-auto h-28 bg-white rounded-2xl border border-stone-200/80" />
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        <div className="lg:col-span-2 h-80 bg-white rounded-2xl border border-stone-200/80" />
                                        <div className="h-80 bg-white rounded-2xl border border-stone-200/80" />
                                    </div>
                                </div>
                            }>
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
                            </Suspense>
                        </ErrorBoundary>
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

                            <ErrorBoundary
                                fallback={({ retry }) => (
                                    <div className="p-6 bg-white rounded-2xl border border-stone-200/80 text-center space-y-2">
                                        <p className="text-xs text-stone-500 font-medium">Unable to load campaign intelligence.</p>
                                        <button
                                            type="button"
                                            onClick={retry}
                                            className="px-3.5 py-1.5 text-xs font-bold text-clay-700 hover:text-clay-800 bg-clay-50 hover:bg-clay-100 rounded-xl transition"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                )}
                            >
                                <Suspense fallback={<div className="h-64 bg-white rounded-2xl border border-stone-200/80 animate-pulse" />}>
                                    <CampaignIntelligence 
                                        sellerSubscription={sellerSubscription} 
                                        sponsorshipMetrics={sponsorshipMetrics} 
                                        sponsorshipChartData={sponsorshipChartData} 
                                        sponsorshipAnalyticsAvailability={sponsorshipAnalyticsAvailability} 
                                        animate={shouldAnimateKPI}
                                    />
                                </Suspense>
                            </ErrorBoundary>
                        </motion.section>
                    )}
                </motion.div>

                {/* Print-Only Layout (Hidden on screen, visible during print) */}
                <Suspense fallback={null}>
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
                </Suspense>

            </main>
        </>
    );
}

Analytics.layout = (page) => <SellerWorkspaceLayout active="analytics">{page}</SellerWorkspaceLayout>;
