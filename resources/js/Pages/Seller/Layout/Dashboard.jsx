import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';

// Subcomponents
import DashboardKPIs from '@/Components/Seller/Dashboard/DashboardKPIs';
import ShopHealthStrip from '@/Components/Seller/Dashboard/ShopHealthStrip';
import RevenueAnalyticsChart from '@/Components/Seller/Dashboard/RevenueAnalyticsChart';
import SalesByCategoryChart from '@/Components/Seller/Dashboard/SalesByCategoryChart';
import RecentOrdersPreview from '@/Components/Seller/Dashboard/RecentOrdersPreview';
import WelcomeModal from '@/Components/Seller/Dashboard/WelcomeModal';

export default function Dashboard({ auth }) {
    const { metrics, chartData, categoryData, recentOrders, filters } = usePage().props;
    const { openSidebar } = useSellerWorkspaceShell();
    const [chartFilter, setChartFilter] = useState('Monthly');
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'All');
    const [date, setDate] = useState(filters.date || '');
    const [isLoading, setIsLoading] = useState(false);
    const searchTimeoutRef = useRef(null);
    
    const [shouldAnimateKPI, setShouldAnimateKPI] = useState(true);
    useEffect(() => {
        const timer = setTimeout(() => setShouldAnimateKPI(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    const isNewlyApproved = auth.user.approved_at 
        ? (new Date() - new Date(auth.user.approved_at)) / (1000 * 60 * 60 * 24) <= 7 
        : false;

    const [showWelcome, setShowWelcome] = useState(
        auth.user.role === 'artisan' && 
        (auth.user.artisan_welcomed === 0 || auth.user.artisan_welcomed === false) &&
        isNewlyApproved
    );

    const closeWelcomeModal = () => {
        setShowWelcome(false);
        router.post(route('artisan.welcome.dismiss'), {}, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const currentChartData = chartFilter === 'Monthly' ? chartData.monthly : chartData.yearly;

    // Shared partial-reload helper — only refetches 'recentOrders' and 'filters',
    // leaving metrics, charts, and categories untouched (no full-page reload).
    const applyFilters = useCallback((overrides = {}) => {
        const params = { search, status, date, ...overrides };
        setIsLoading(true);
        router.get(route('dashboard'), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ['recentOrders', 'filters'],
            onFinish: () => setIsLoading(false),
        });
    }, [search, status, date]);

    // Search — debounced 400ms so it fires automatically as you type
    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearch(val);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => applyFilters({ search: val }), 400);
    };

    // Cleanup timeout on unmount
    useEffect(() => () => clearTimeout(searchTimeoutRef.current), []);

    // Status & Date — fire immediately (no debounce needed for dropdowns/pickers)
    const handleStatusChange = (e) => {
        const val = e.target.value;
        setStatus(val);
        applyFilters({ status: val });
    };
    const handleDateChange = (e) => {
        const val = e.target.value;
        setDate(val);
        applyFilters({ date: val });
    };

    return (
        <>
            <Head title="Dashboard" />
            <SellerHeader
                title={(() => {
                    const hour = new Date().getHours();
                    if (hour < 12) return `Good morning, ${auth.user.name.split(' ')[0]}`;
                    if (hour < 18) return `Good afternoon, ${auth.user.name.split(' ')[0]}`;
                    return `Good evening, ${auth.user.name.split(' ')[0]}`;
                })()}
                subtitle="Monitor daily sales, active orders, and shop performance."
                auth={auth}
                onMenuClick={openSidebar}
            />
            <main className="flex-1 p-6 overflow-y-auto space-y-6">
                {/* Key Metrics Overview Grid */}
                <DashboardKPIs 
                    metrics={metrics} 
                    isLoading={isLoading} 
                    shouldAnimateKPI={shouldAnimateKPI} 
                />

                {/* Shop Operational Health Strip */}
                <ShopHealthStrip metrics={metrics} />

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <RevenueAnalyticsChart 
                        chartFilter={chartFilter} 
                        setChartFilter={setChartFilter} 
                        currentChartData={currentChartData} 
                        isLoading={isLoading} 
                    />
                    <SalesByCategoryChart 
                        categoryData={categoryData} 
                        isLoading={isLoading} 
                />
                </div>

                {/* Recent Orders Preview Card Grid/Table */}
                <RecentOrdersPreview 
                    recentOrders={recentOrders}
                    search={search}
                    handleSearchChange={handleSearchChange}
                    status={status}
                    handleStatusChange={handleStatusChange}
                    date={date}
                    handleDateChange={handleDateChange}
                    isLoading={isLoading}
                />
            </main>

            {/* Welcome Flow Modal / SlideOverDrawer */}
            <WelcomeModal 
                show={showWelcome} 
                onClose={closeWelcomeModal} 
            />
        </>
    );
}

Dashboard.layout = (page) => (
    <SellerWorkspaceLayout active="overview">{page}</SellerWorkspaceLayout>
);
