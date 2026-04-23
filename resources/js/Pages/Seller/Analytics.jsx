import React, { useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Components/SellerHeader';
import {
    Package,
    ShoppingBag,
    Activity,
    BarChart3,
    DollarSign,
    CreditCard,
    PieChart as PieIcon,
    Star,
    TrendingUp,
    TrendingDown,
    Download,
    Users,
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';

const MetricCard = ({ title, value, growth, icon: Icon, bg, text }) => {
    const isPositive = growth >= 0;

    return (
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{value}</h3>

                {growth !== undefined ? (
                    <div className={`flex items-center gap-1 text-[10px] font-bold mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        <span>{isPositive ? '+' : ''}{growth}% vs last month</span>
                    </div>
                ) : (
                    <p className="text-[10px] font-medium text-gray-400 mt-1">Real data only</p>
                )}
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} ${text}`}>
                <Icon size={20} />
            </div>
        </div>
    );
};

const COLORS = ['#c07251', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ef4444'];

const pesoFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const formatPeso = (value) => pesoFormatter.format(Number(value || 0));

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
}) {
    const { sellerSubscription } = usePage().props;
    const { openSidebar } = useSellerWorkspaceShell();
    const [chartFilter, setChartFilter] = useState('Monthly');
    const [sponsorshipFilter, setSponsorshipFilter] = useState('Daily');
    const [catFilter, setCatFilter] = useState(filters.category);
    const [lowStockSort, setLowStockSort] = useState('stock_low');
    const [repeatBuyerSort, setRepeatBuyerSort] = useState('orders');

    const currentChartData = chartData[chartFilter.toLowerCase()] || [];
    const currentSponsorshipChartData = sponsorshipChartData?.[sponsorshipFilter.toLowerCase()] || [];
    const stats = metrics.review_stats;
    const canViewSponsoredPerformance = !!sellerSubscription?.canRequestSponsorships;
    const sponsorshipIsAvailable = !!sponsorshipAnalyticsAvailability?.is_available;
    const sponsorshipHasActivity = !!sponsorshipAnalyticsAvailability?.has_activity;
    const sponsorshipMessage = sponsorshipAnalyticsAvailability?.message || 'No sponsorship activity yet.';
    const lowStockProducts = insights?.low_stock_products || [];
    const repeatBuyers = insights?.repeat_buyers || [];
    const stalledOrders = Number(insights?.stalled_orders || metrics?.stalled_orders || 0);
    const pendingOrders = Number(metrics?.pending_orders || 0);
    const analyticsGeneratedAt = dataContext?.generated_at;
    const completedOrdersCount = Number(dataContext?.completed_orders_count || 0);
    const selectedCategoryLabel = dataContext?.category_filter || 'All Categories';

    const generatedRelativeLabel = useMemo(() => {
        if (!analyticsGeneratedAt) {
            return 'freshly generated';
        }

        const now = Date.now();
        const target = new Date(analyticsGeneratedAt).getTime();

        if (Number.isNaN(target)) {
            return 'freshly generated';
        }

        const diffMinutes = Math.round((target - now) / 60000);
        const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

        if (Math.abs(diffMinutes) < 60) {
            return formatter.format(diffMinutes, 'minute');
        }

        const diffHours = Math.round(diffMinutes / 60);
        if (Math.abs(diffHours) < 24) {
            return formatter.format(diffHours, 'hour');
        }

        const diffDays = Math.round(diffHours / 24);
        return formatter.format(diffDays, 'day');
    }, [analyticsGeneratedAt]);

    const sortedLowStockProducts = useMemo(() => {
        const nextProducts = [...lowStockProducts];

        return nextProducts.sort((left, right) => {
            if (lowStockSort === 'sold_high') {
                return Number(right.sold || 0) - Number(left.sold || 0);
            }

            if (lowStockSort === 'name') {
                return String(left.name || '').localeCompare(String(right.name || ''));
            }

            return Number(left.stock || 0) - Number(right.stock || 0);
        });
    }, [lowStockProducts, lowStockSort]);

    const sortedRepeatBuyers = useMemo(() => {
        const nextBuyers = [...repeatBuyers];

        return nextBuyers.sort((left, right) => {
            if (repeatBuyerSort === 'spend') {
                return Number(right.total_spend || 0) - Number(left.total_spend || 0);
            }

            if (repeatBuyerSort === 'name') {
                return String(left.name || '').localeCompare(String(right.name || ''));
            }

            return Number(right.orders_count || 0) - Number(left.orders_count || 0);
        });
    }, [repeatBuyers, repeatBuyerSort]);

    const updateCategoryFilter = (newCat) => {
        setCatFilter(newCat);
        router.get(route('analytics.index'), { category: newCat }, { preserveState: true, preserveScroll: true });
    };

    return (
        <>
            <Head title="Shop Analytics" />
            <SellerHeader
                title="Analytics"
                subtitle="Revenue, orders, and category performance in one view."
                auth={auth}
                onMenuClick={openSidebar}
                actions={sellerSubscription?.canExportAnalytics ? (
                    <a
                        href={route('analytics.export')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-600 shadow-sm transition hover:bg-stone-50"
                    >
                        <Download size={16} />
                        <span>Download Report</span>
                    </a>
                ) : (
                    <div className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-100 px-4 py-2 text-[11px] font-bold text-stone-500 shadow-sm">
                        <DollarSign size={15} />
                        <span>Premium Export</span>
                    </div>
                )}
            />

                <main className="mx-auto flex-1 w-full max-w-[1400px] p-4 sm:p-6 overflow-y-auto space-y-6">
                    <div className="flex flex-col gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
                                <Activity size={16} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-stone-900">Analytics uses live shop data</p>
                                <p className="text-xs text-stone-500">
                                    Updated {generatedRelativeLabel}. Based on {completedOrdersCount.toLocaleString()} completed orders, active product records, and review activity.
                                </p>
                            </div>
                        </div>
                        <div className="inline-flex w-fit rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-stone-600">
                            {selectedCategoryLabel === 'All Categories' ? 'All categories' : selectedCategoryLabel}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
                        <MetricCard title="Total Revenue" value={formatPeso(metrics.total_revenue)} growth={metrics.growth.revenue} icon={DollarSign} bg="bg-blue-100" text="text-blue-600" />
                        <MetricCard title="Gross Profit" value={formatPeso(metrics.gross_profit)} growth={metrics.growth.profit} icon={TrendingUp} bg="bg-green-100" text="text-green-600" />
                        <MetricCard title="Total Orders" value={Number(metrics.total_orders).toLocaleString()} growth={metrics.growth.orders} icon={ShoppingBag} bg="bg-purple-100" text="text-purple-600" />
                        <MetricCard title="Average Order" value={formatPeso(metrics.avg_order_value)} growth={metrics.growth.avg} icon={CreditCard} bg="bg-amber-100" text="text-amber-600" />
                        <MetricCard title="Shop Rating" value={`${metrics.average_rating} / 5.0`} icon={Star} bg="bg-yellow-100" text="text-yellow-500" />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 flex flex-col min-h-[250px]">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-base font-bold text-gray-900">Low Stock Watch</h3>
                                    <p className="text-xs text-gray-500">Products that need attention soon</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                    <select
                                        value={lowStockSort}
                                        onChange={(event) => setLowStockSort(event.target.value)}
                                        className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-stone-600 outline-none"
                                    >
                                        <option value="stock_low">Least stock</option>
                                        <option value="sold_high">Most sold</option>
                                        <option value="name">Name</option>
                                    </select>
                                    <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                        {sortedLowStockProducts.length} flagged
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex-1">
                                {sortedLowStockProducts.length > 0 ? (
                                    <div className="space-y-2.5">
                                        {sortedLowStockProducts.map((product) => (
                                            <Link
                                                key={product.id}
                                                href={route('products.index')}
                                                className="flex items-center justify-between gap-3 rounded-xl border border-stone-100 bg-stone-50 px-3.5 py-3 transition hover:bg-stone-100"
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-bold text-gray-900">{product.name}</p>
                                                    <p className="mt-0.5 text-xs text-gray-500">{product.stock} left in stock</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-lg font-black text-clay-700">{product.stock}</p>
                                                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{product.sold} sold</p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full rounded-2xl border border-stone-100 bg-stone-50">
                                        <WorkspaceEmptyState
                                            compact
                                            icon={Package}
                                            title="No low-stock products"
                                            description="Your active listings still have healthy stock levels."
                                            actionLabel="Manage Products"
                                            actionHref={route('products.index')}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 flex flex-col min-h-[250px]">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-base font-bold text-gray-900">Repeat Buyers</h3>
                                    <p className="text-xs text-gray-500">Customers who already came back</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                    <select
                                        value={repeatBuyerSort}
                                        onChange={(event) => setRepeatBuyerSort(event.target.value)}
                                        className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-stone-600 outline-none"
                                    >
                                        <option value="orders">Most orders</option>
                                        <option value="spend">Highest spend</option>
                                        <option value="name">Name</option>
                                    </select>
                                    <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                                        {sortedRepeatBuyers.length} buyers
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex-1">
                                {sortedRepeatBuyers.length > 0 ? (
                                    <div className="space-y-2.5">
                                        {sortedRepeatBuyers.map((buyer) => (
                                            <div key={buyer.id} className="rounded-xl border border-stone-100 bg-stone-50 px-3.5 py-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-bold text-gray-900">{buyer.name}</p>
                                                        <p className="mt-0.5 text-xs text-gray-500">{buyer.orders_count} completed orders</p>
                                                    </div>
                                                    <p className="shrink-0 text-lg font-black text-clay-700">{formatPeso(buyer.total_spend)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full rounded-2xl border border-stone-100 bg-stone-50">
                                        <WorkspaceEmptyState
                                            compact
                                            icon={Users}
                                            title="No repeat buyers yet"
                                            description="Returning customers will show up here once your shop starts retaining buyers."
                                            actionLabel="View Orders"
                                            actionHref={route('orders.index')}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 flex flex-col min-h-[250px]">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-base font-bold text-gray-900">Order Attention</h3>
                                    <p className="text-xs text-gray-500">Queues that may need follow-up</p>
                                </div>
                                <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-stone-600">
                                    {pendingOrders} pending
                                </div>
                            </div>

                            <div className="mt-4 space-y-3">
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">Pending Orders</p>
                                    <p className="mt-2 text-3xl font-black tracking-tight text-amber-800">{pendingOrders}</p>
                                </div>
                                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-700">Stalled Open Orders</p>
                                    <p className="mt-2 text-3xl font-black tracking-tight text-rose-700">{stalledOrders}</p>
                                    <p className="mt-2 text-xs leading-6 text-rose-500">
                                        Open orders older than 3 days without completion or cancellation.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <select value={catFilter} onChange={(e) => updateCategoryFilter(e.target.value)} className="bg-white border border-gray-200 text-gray-700 text-xs font-bold py-1.5 pl-3 pr-8 rounded-lg focus:ring-clay-500 focus:border-clay-500 cursor-pointer">
                            <option value="All Categories">All Categories</option>
                            {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                        <div className="min-w-0 lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Revenue Analytics</h3>
                                    <p className="text-sm text-gray-500">Income over time</p>
                                </div>
                                <div className="flex w-full sm:w-auto overflow-x-auto bg-gray-100 p-1 rounded-lg">
                                    {['Monthly', 'Yearly'].map((filter) => (
                                        <button
                                            key={filter}
                                            onClick={() => setChartFilter(filter)}
                                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${chartFilter === filter ? 'bg-white text-clay-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            {filter}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="h-80 min-h-[320px] w-full min-w-0">
                                {currentChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                        <AreaChart data={currentChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#c07251" stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor="#c07251" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={15} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(val) => formatPeso(val)} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                formatter={(value) => formatPeso(value)}
                                            />
                                            <Area type="monotone" dataKey="value" stroke="#c07251" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" dot={{ r: 4, fill: '#c07251', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
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
                        </div>

                        <div className="min-w-0 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Sales by Category</h3>
                                    <p className="text-sm text-gray-500">Total items sold</p>
                                </div>
                            </div>

                            <div className="h-[220px] w-full flex items-center justify-center relative">
                                {categoryData.length > 0 ? (
                                    <PieChart width={200} height={200}>
                                        <Pie
                                            data={categoryData}
                                            nameKey="category"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={85}
                                            paddingAngle={4}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 600 }}
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
                                <div className="mt-2 space-y-2 pt-4 border-t border-gray-50">
                                    {(() => {
                                        const total = categoryData.reduce((sum, item) => sum + item.value, 0);
                                        return categoryData.map((item, index) => (
                                            <div key={index} className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                    <span className="font-medium text-gray-700 truncate max-w-[120px]">{item.category || item.name}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-gray-900">{item.value}</span>
                                                    <span className="text-gray-400 w-10 text-right">{total > 0 ? Math.round((item.value / total) * 100) : 0}%</span>
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                    {canViewSponsoredPerformance && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Sponsored Performance</h3>
                                    <p className="text-sm text-gray-500">Track how sponsored placements convert into clicks and completed orders.</p>
                                </div>
                                {sponsorshipIsAvailable && (
                                    <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
                                        {['Daily', 'Monthly'].map((filterName) => (
                                            <button
                                                key={filterName}
                                                onClick={() => setSponsorshipFilter(filterName)}
                                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${sponsorshipFilter === filterName ? 'bg-white text-clay-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                {filterName}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {!sponsorshipIsAvailable ? (
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">Sponsored Tracking Unavailable</p>
                                    <p className="mt-2 text-sm leading-relaxed text-amber-800">{sponsorshipMessage}</p>
                                    <p className="mt-3 text-xs text-amber-700/80">
                                        Sponsored impressions, clicks, orders, and revenue only appear after the sponsorship analytics schema is installed.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                                        <MetricCard title="Sponsored Impressions" value={Number(sponsorshipMetrics?.impressions || 0).toLocaleString()} icon={BarChart3} bg="bg-orange-100" text="text-orange-600" />
                                        <MetricCard title="Sponsored Clicks" value={Number(sponsorshipMetrics?.clicks || 0).toLocaleString()} icon={TrendingUp} bg="bg-amber-100" text="text-amber-700" />
                                        <MetricCard title="CTR" value={`${Number(sponsorshipMetrics?.ctr || 0).toLocaleString()}%`} icon={PieIcon} bg="bg-emerald-100" text="text-emerald-600" />
                                        <MetricCard title="Sponsored Revenue" value={formatPeso(sponsorshipMetrics?.sponsored_revenue || 0)} icon={DollarSign} bg="bg-blue-100" text="text-blue-600" />
                                    </div>

                                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                        <div className="min-w-0 xl:col-span-2 h-80 min-h-[320px]">
                                            {sponsorshipHasActivity ? (
                                                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                                    <AreaChart data={currentSponsorshipChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                        <defs>
                                                            <linearGradient id="colorSponsoredImpressions" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#c07251" stopOpacity={0.18} />
                                                                <stop offset="95%" stopColor="#c07251" stopOpacity={0} />
                                                            </linearGradient>
                                                            <linearGradient id="colorSponsoredClicks" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#d97706" stopOpacity={0.18} />
                                                                <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={15} />
                                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                                        <Tooltip
                                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                            formatter={(value, name) => {
                                                                if (name === 'sponsored_revenue') {
                                                                    return [formatPeso(value), 'Sponsored Revenue'];
                                                                }

                                                                const labels = {
                                                                    impressions: 'Impressions',
                                                                    clicks: 'Clicks',
                                                                    ctr: 'CTR (%)',
                                                                    sponsored_orders: 'Sponsored Orders',
                                                                };

                                                                return [value, labels[name] || name];
                                                            }}
                                                        />
                                                        <Area type="monotone" dataKey="impressions" stroke="#c07251" strokeWidth={3} fillOpacity={1} fill="url(#colorSponsoredImpressions)" />
                                                        <Area type="monotone" dataKey="clicks" stroke="#d97706" strokeWidth={3} fillOpacity={1} fill="url(#colorSponsoredClicks)" />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="h-full rounded-2xl border border-dashed border-stone-200 bg-stone-50">
                                                    <WorkspaceEmptyState
                                                        compact
                                                        icon={BarChart3}
                                                        title="No sponsorship activity yet"
                                                        description="This section only reflects real impressions, clicks, and completed sponsored orders after a campaign starts generating activity."
                                                        actionLabel="Open Sponsorships"
                                                        actionHref={route('seller.sponsorships')}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-stone-50 rounded-2xl border border-stone-100 p-5">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-4">Campaign Snapshot</p>
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-xs text-stone-500 mb-1">Sponsored Orders</p>
                                                    <p className="text-2xl font-black text-stone-900">{Number(sponsorshipMetrics?.sponsored_orders || 0).toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-stone-500 mb-1">Sponsored Revenue</p>
                                                    <p className="text-2xl font-black text-clay-700">{formatPeso(sponsorshipMetrics?.sponsored_revenue || 0)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-stone-500 mb-1">Click-Through Rate</p>
                                                    <p className="text-2xl font-black text-amber-700">{Number(sponsorshipMetrics?.ctr || 0).toLocaleString()}%</p>
                                                </div>
                                                <p className="text-xs leading-relaxed text-stone-500 pt-2 border-t border-stone-200">
                                                    Sponsored orders and revenue are snapshot-based at checkout, so completed sales stay attributed even after a sponsorship period ends.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Top Products</h3>
                                    <p className="text-sm text-gray-500">Best performers by volume</p>
                                </div>
                                <Link href={route('products.index')} className="text-sm font-bold text-clay-600 hover:underline">Manage Products</Link>
                            </div>
                            <div className="space-y-4">
                                {topProducts.length > 0 ? (
                                    topProducts.map((item, index) => (
                                        <div key={index} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors group">
                                            <span className="text-gray-400 font-bold w-4">#{index + 1}</span>
                                            {item.img ? (
                                                <img src={item.img.startsWith('http') || item.img.startsWith('/storage') ? item.img : `/storage/${item.img}`} alt={item.name} className="w-12 h-12 rounded-lg object-cover bg-gray-100 border border-gray-200" onError={(e) => { e.target.style.display = 'none'; }} />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200"><Package size={20} /></div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-800 truncate">{item.name}</p>
                                                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 max-w-[200px]">
                                                    <div className="bg-clay-500 h-1.5 rounded-full" style={{ width: `${(item.sales / topProducts[0].sales) * 100}%` }}></div>
                                                </div>
                                            </div>
                                            <div className="text-right min-w-[80px]">
                                                <p className="text-sm font-bold text-gray-900">{formatPeso(item.profit)}</p>
                                            </div>
                                            <div className="text-right min-w-[60px]">
                                                <p className="text-sm font-bold text-gray-600">{item.sales}</p>
                                                <p className="text-[10px] text-gray-500 tracking-wide uppercase">Sold</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <WorkspaceEmptyState
                                        compact
                                        icon={ShoppingBag}
                                        title="No product sales yet"
                                        description="Top products will appear here after completed orders start coming in."
                                        actionLabel="Manage Products"
                                        actionHref={route('products.index')}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Customer Ratings</h3>
                                    <p className="text-sm text-gray-500">Shop quality feedback</p>
                                </div>
                                <Link href={route('reviews.index')} className="text-sm font-bold text-clay-600 hover:underline">View All</Link>
                            </div>

                            <div className="flex flex-col items-center mb-6">
                                <h1 className="text-5xl font-black text-gray-900 mb-2">{stats?.average ? stats.average.toFixed(1) : '0.0'}</h1>
                                <div className="flex items-center gap-1 mb-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            size={20}
                                            className={star <= Math.round(stats?.average || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}
                                        />
                                    ))}
                                </div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{stats?.total || 0} Reviews</p>
                            </div>

                            <div className="mt-auto space-y-2 border-t border-gray-50 pt-4">
                                {[5, 4, 3, 2, 1].map((star) => {
                                    const count = Number(stats?.breakdown?.[String(star)] || 0);
                                    const percentage = stats?.total > 0 ? (count / stats.total) * 100 : 0;
                                    return (
                                        <div key={star} className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-gray-500 w-12 flex items-center justify-end gap-1">
                                                {star} <Star size={10} className="fill-amber-400 text-amber-400" />
                                            </span>
                                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${percentage}%` }}></div>
                                            </div>
                                            <span className="text-xs font-bold text-gray-400 w-6 text-right">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </main>
        </>
    );
}

Analytics.layout = (page) => <SellerWorkspaceLayout active="analytics">{page}</SellerWorkspaceLayout>;
