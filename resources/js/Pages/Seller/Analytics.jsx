import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { motion, useSpring, useTransform, animate } from 'framer-motion';
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
    Minus,
    Download,
    Users,
    ArrowUpRight,
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
import ExportButton from '@/Components/ExportButton';
import ArtisanSkeleton from '@/Components/ArtisanSkeleton';

const AnimatedCounter = ({ value, formatter = (v) => Math.round(v).toLocaleString(), duration = 2 }) => {
    const nodeRef = useRef(null);
    const [hasAnimated, setHasAnimated] = useState(false);

    useEffect(() => {
        if (!nodeRef.current) return;
        
        const controls = animate(0, value, {
            duration: duration,
            onUpdate(value) {
                if (nodeRef.current) {
                    nodeRef.current.textContent = formatter(value);
                }
            }
        });

        return () => controls.stop();
    }, [value, hasAnimated]);

    return <span ref={nodeRef}>{formatter(0)}</span>;
};

const MetricCard = ({ title, value, growth, icon: Icon, bg, text }) => {
    let growthColor = 'text-stone-500';
    let GrowthIcon = Minus;
    let growthPrefix = '';

    if (growth > 0) {
        growthColor = 'text-emerald-600';
        GrowthIcon = TrendingUp;
        growthPrefix = '+';
    } else if (growth < 0) {
        growthColor = 'text-rose-600';
        GrowthIcon = TrendingDown;
        growthPrefix = ''; // The negative sign is inherently part of the number
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex items-start justify-between hover:shadow-md transition-shadow group"
        >
            <div>
                <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-stone-900 tracking-tight">
                    {typeof value === 'number' ? (
                        <AnimatedCounter value={value} formatter={(v) => title.includes('Rating') ? v.toFixed(1) : Math.round(v).toLocaleString()} />
                    ) : value.includes('₱') ? (
                        <AnimatedCounter value={parseFloat(value.replace(/[^\d.]/g, ''))} formatter={(v) => `₱${Math.round(v).toLocaleString()}`} />
                    ) : (
                        value
                    )}
                </h3>

                {growth !== undefined && (
                    <div className={`flex items-center gap-1 text-[10px] font-bold mt-1 ${growthColor}`}>
                        <GrowthIcon size={12} />
                        <span>{growthPrefix}{growth}% vs last month</span>
                    </div>
                )}
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} ${text} group-hover:scale-110 transition-transform`}>
                <Icon size={20} />
            </div>
        </motion.div>
    );
};

const COLORS = ['#c07251', '#d97706', '#059669', '#57534e', '#e11d48', '#8c5a44']; // Clay, Amber, Emerald, Stone, Rose, Earth

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
    const [isLoading, setIsLoading] = useState(false);

    const currentChartData = chartData[chartFilter.toLowerCase()] || [];
    const currentSponsorshipChartData = sponsorshipChartData?.[sponsorshipFilter.toLowerCase()] || [];
    const stats = metrics.review_stats;
    const canViewSponsoredPerformance = !!sellerSubscription?.canRequestSponsorships;
    const sponsorshipIsAvailable = !!sponsorshipAnalyticsAvailability?.is_available;
    const sponsorshipHasActivity = !!sponsorshipAnalyticsAvailability?.has_activity;
    const sponsorshipMessage = sponsorshipAnalyticsAvailability?.message || 'No sponsorship activity yet.';
    const lowStockProducts = insights?.low_stock_products || [];
    const vipCustomers = insights?.vip_customers || [];
    const loyaltyStats = insights?.loyalty_stats || { new: 0, returning: 0, total_unique: 0 };
    const salesHeatmap = insights?.sales_heatmap || [];
    const salesVelocity = insights?.sales_velocity || [];
    const slowMovers = insights?.slow_movers || [];
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

    const sortedVipCustomers = useMemo(() => {
        const nextBuyers = [...vipCustomers];

        return nextBuyers.sort((left, right) => {
            if (repeatBuyerSort === 'spend') {
                return Number(right.clv || 0) - Number(left.clv || 0);
            }

            if (repeatBuyerSort === 'name') {
                return String(left.name || '').localeCompare(String(right.name || ''));
            }

            return Number(right.orders_count || 0) - Number(left.orders_count || 0);
        });
    }, [vipCustomers, repeatBuyerSort]);

    const loyaltyData = useMemo(() => [
        { name: 'New Customers', value: loyaltyStats.new, color: '#f5f5f4' },
        { name: 'Returning Fans', value: loyaltyStats.returning, color: '#c07251' }
    ], [loyaltyStats]);

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
                subtitle="Revenue, orders, and category performance in one view."
                auth={auth}
                onMenuClick={openSidebar}
                actions={sellerSubscription?.canExportAnalytics ? (
                    <ExportButton href={route('analytics.export')} icon={Download} variant="primary" className="hidden sm:inline-flex">
                        Download Report
                    </ExportButton>
                ) : (
                    <div className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-stone-100 bg-stone-50 px-4 py-2 text-[11px] font-bold text-stone-500 shadow-sm">
                        <DollarSign size={15} />
                        <span>Premium Export</span>
                    </div>
                )}
            />

                <main className="flex-1 w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                        {isLoading ? (
                            <ArtisanSkeleton variant="stat" count={4} />
                        ) : (
                            <>
                                <MetricCard title="Total Revenue" value={formatPeso(metrics.total_revenue)} growth={metrics.growth.revenue} icon={DollarSign} bg="bg-stone-50" text="text-clay-600" />
                                <MetricCard title="Gross Profit" value={formatPeso(metrics.gross_profit)} growth={metrics.growth.profit} icon={TrendingUp} bg="bg-emerald-50" text="text-emerald-600" />
                                <MetricCard title="Profit Margin" value={`${Number(metrics.profit_margin || 0).toFixed(1)}%`} growth={metrics.growth.profit} icon={Activity} bg="bg-emerald-50" text="text-emerald-600" />
                                <MetricCard title="Shop Rating" value={`${metrics.average_rating} / 5.0`} icon={Star} bg="bg-amber-50" text="text-amber-600" />
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                        <div className="min-w-0 lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-stone-100 flex flex-col relative overflow-hidden">
                            {isLoading && (
                                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
                                    <div className="h-full w-full relative overflow-hidden bg-stone-50/30">
                                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
                                    </div>
                                </div>
                            )}
                            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-stone-900">Revenue Analytics</h3>
                                    <p className="text-sm text-stone-500">Income over time</p>
                                </div>
                                <div className="flex w-full sm:w-auto overflow-x-auto bg-stone-100 p-1 rounded-lg">
                                    {['Monthly', 'Yearly'].map((filter) => (
                                        <button
                                            key={filter}
                                            onClick={() => setChartFilter(filter)}
                                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${chartFilter === filter ? 'bg-white text-clay-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
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
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 12 }} dy={15} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 12 }} tickFormatter={(val) => formatPeso(val)} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                formatter={(value) => formatPeso(value)}
                                                cursor={{ stroke: '#c07251', strokeWidth: 1, strokeDasharray: '4 4' }}
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

                        <div className="min-w-0 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-stone-100 flex flex-col">
                            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-stone-900">Sales by Category</h3>
                                    <p className="text-sm text-stone-500">Total items sold</p>
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
                                            onClick={(data) => updateCategoryFilter(data.category || data.name)}
                                            className="cursor-pointer"
                                        >
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 600 }}
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
                                <div className="mt-4 space-y-4 pt-4 border-t border-stone-100">
                                    {(() => {
                                        const total = categoryData.reduce((sum, item) => sum + item.value, 0);
                                        return categoryData.map((item, index) => (
                                            <div key={index} className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                        <span className="font-bold text-stone-900 truncate max-w-[120px]">{item.category || item.name}</span>
                                                    </div>
                                                    <span className="font-black text-clay-700">{formatPeso(item.profit)}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-stone-400 font-medium">{item.value} items sold</span>
                                                        <span className="text-[10px] text-stone-300">•</span>
                                                        <span className={`text-[10px] font-bold ${item.margin >= 30 ? 'text-emerald-600' : 'text-stone-500'}`}>{item.margin}% margin</span>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-stone-400">{total > 0 ? Math.round((item.value / total) * 100) : 0}% share</span>
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                        {/* CUSTOMER LOYALTY & VIPs */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex flex-col min-h-[280px] lg:col-span-3">
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                                {/* Loyalty Breakdown */}
                                <div className="lg:col-span-1 flex flex-col">
                                    <div>
                                        <h3 className="text-base font-bold text-stone-900 leading-none">Customer Retention</h3>
                                        <p className="text-[11px] text-stone-500 mt-1.5 leading-tight">New vs. Returning buyers</p>
                                    </div>
                                    <div className="flex-1 flex flex-col justify-center py-4">
                                        <div className="h-32 w-full relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={loyaltyData}
                                                        innerRadius={35}
                                                        outerRadius={50}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                        stroke="none"
                                                    >
                                                        {loyaltyData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip 
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-2 text-stone-500"><span className="w-2 h-2 rounded-full bg-[#f5f5f4]" /> New</span>
                                                <span className="font-bold">{loyaltyStats.new}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-2 text-stone-500"><span className="w-2 h-2 rounded-full bg-[#c07251]" /> Returning</span>
                                                <span className="font-bold">{loyaltyStats.returning}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* VIP List */}
                                <div className="lg:col-span-3 flex flex-col">
                                    <div className="flex items-start justify-between gap-2 mb-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-base font-bold text-stone-900 leading-none">VIP Hall of Fame</h3>
                                                {sortedVipCustomers.length > 0 && (
                                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100">
                                                        TOP PATRONS
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-stone-500 mt-1.5 leading-tight">Customers ranked by lifetime value (CLV)</p>
                                        </div>
                                        <select
                                            value={repeatBuyerSort}
                                            onChange={(event) => setRepeatBuyerSort(event.target.value)}
                                            className="rounded-lg border-0 bg-stone-50 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-stone-600 outline-none hover:bg-stone-100 cursor-pointer focus:ring-0"
                                        >
                                            <option value="spend">Highest CLV</option>
                                            <option value="orders">Most orders</option>
                                            <option value="name">Name</option>
                                        </select>
                                    </div>

                                    <div className="flex-1 mt-2">
                                        {sortedVipCustomers.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {sortedVipCustomers.map((buyer) => (
                                                    <div key={buyer.id} className="group relative flex items-center gap-3 rounded-2xl border border-stone-100 bg-stone-50 p-3 transition hover:bg-white hover:shadow-md hover:border-emerald-100">
                                                        <div className="relative shrink-0">
                                                            <div className="w-12 h-12 rounded-full overflow-hidden bg-stone-100 flex items-center justify-center text-sm font-bold border-2 border-white shadow-sm text-stone-600 relative">
                                                                {buyer.avatar ? (
                                                                    <img
                                                                        src={buyer.avatar.startsWith('http') || buyer.avatar.startsWith('/storage') ? buyer.avatar : `/storage/${buyer.avatar}`}
                                                                        alt=""
                                                                        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
                                                                        onError={(e) => { e.target.style.opacity = '0'; }}
                                                                    />
                                                                ) : null}
                                                                <span className="relative z-0">{buyer.name.charAt(0)}</span>
                                                            </div>
                                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-600 rounded-full border-2 border-white flex items-center justify-center shadow-sm z-10">
                                                                <Star size={8} className="text-white fill-white" />
                                                            </div>
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <p className="truncate text-sm font-bold text-stone-900">{buyer.name}</p>
                                                                <p className="text-sm font-black text-clay-700">{formatPeso(buyer.clv)}</p>
                                                            </div>
                                                            <div className="flex items-center justify-between mt-0.5">
                                                                <p className="text-[10px] text-stone-500 font-medium">{buyer.orders_count} orders • Active {buyer.last_active}</p>
                                                                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Lifetime Value</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="h-full rounded-2xl border border-stone-100 bg-stone-50 min-h-[150px]">
                                                <WorkspaceEmptyState
                                                    compact
                                                    icon={Users}
                                                    title="No VIPs discovered yet"
                                                    description="High-value patrons will be crowned here once your shop builds its loyal base."
                                                    actionLabel="View Orders"
                                                    actionHref={route('orders.index')}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PHASE 3: SALES INTELLIGENCE */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Peak Sales Heatmap */}
                            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex flex-col">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-base font-bold text-stone-900 leading-none">Peak Activity Heatmap</h3>
                                        <p className="text-[11px] text-stone-500 mt-1.5 leading-tight">When your customers are most likely to buy</p>
                                    </div>
                                    <div className="flex items-center gap-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                                        <span>Quiet</span>
                                        <div className="flex gap-1">
                                            <div className="w-3 h-3 rounded-sm bg-stone-50 border border-stone-100" />
                                            <div className="w-3 h-3 rounded-sm bg-clay-100" />
                                            <div className="w-3 h-3 rounded-sm bg-clay-300" />
                                            <div className="w-3 h-3 rounded-sm bg-clay-500" />
                                        </div>
                                        <span>Peak</span>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-x-auto pb-2">
                                    <div className="min-w-[600px]">
                                        <div className="grid grid-cols-8 gap-1.5">
                                            <div className="col-span-1" />
                                            {['12 AM', '4 AM', '8 AM', '12 PM', '4 PM', '8 PM', '11 PM'].map((h, i) => (
                                                <div key={i} className="text-[9px] font-bold text-stone-400 text-center uppercase">{h}</div>
                                            ))}
                                        </div>
                                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                                            <div key={day} className="grid grid-cols-8 gap-1.5 mt-1.5">
                                                <div className="text-[10px] font-bold text-stone-600 flex items-center pr-2">{day}</div>
                                                {[0, 4, 8, 12, 16, 20, 23].map((hour) => {
                                                    const match = salesHeatmap.find(h => h.day === day && h.hour === hour);
                                                    const count = match ? match.count : 0;
                                                    const opacity = count === 0 ? 'bg-stone-50' : 
                                                                    count < 2 ? 'bg-clay-100' :
                                                                    count < 5 ? 'bg-clay-300' : 'bg-clay-600 shadow-sm shadow-clay-200';
                                                    return (
                                                        <div 
                                                            key={hour} 
                                                            className={`h-8 rounded-lg ${opacity} transition-all hover:scale-105 cursor-help flex items-center justify-center`}
                                                            title={`${count} orders at ${hour}:00 on ${day}`}
                                                        >
                                                            {count > 0 && <span className={`text-[10px] font-bold ${count > 4 ? 'text-white' : 'text-clay-800'}`}>{count}</span>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <p className="mt-4 text-[10px] text-stone-400 italic">Recommendation: Schedule new product drops on your darkest-colored blocks.</p>
                            </div>

                            {/* Sales Velocity & Slow Movers */}
                            <div className="space-y-4">
                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex flex-col">
                                    <h3 className="text-sm font-bold text-stone-900 mb-1">Sales Velocity</h3>
                                    <p className="text-[10px] text-stone-500 mb-4">Avg. days from listing to first sale</p>
                                    
                                    <div className="space-y-3">
                                        {salesVelocity.length > 0 ? salesVelocity.map((v, i) => (
                                            <div key={i} className="flex items-center justify-between">
                                                <span className="text-xs font-medium text-stone-600 truncate max-w-[150px]">{v.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-black ${v.avg_days_to_sell <= 3 ? 'text-emerald-600' : 'text-stone-900'}`}>
                                                        {Math.round(v.avg_days_to_sell)} days
                                                    </span>
                                                    <div className="w-12 h-1 bg-stone-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full ${v.avg_days_to_sell <= 3 ? 'bg-emerald-500' : 'bg-stone-400'}`} 
                                                            style={{ width: `${Math.min(100, (3 / v.avg_days_to_sell) * 100)}%` }} 
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )) : <p className="text-[10px] text-stone-400 text-center py-4 italic">Waiting for more sales data...</p>}
                                    </div>
                                </div>

                                <div className="bg-rose-50 p-5 rounded-2xl shadow-sm border border-rose-100 flex flex-col">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Activity size={14} className="text-rose-600" />
                                        <h3 className="text-sm font-bold text-rose-900">Inventory Health</h3>
                                    </div>
                                    <p className="text-[10px] text-rose-600/70 mb-4 font-medium uppercase tracking-wider">Slow Movers (0 sales in 30 days)</p>
                                    
                                    <div className="space-y-3">
                                        {slowMovers.length > 0 ? slowMovers.map((p, i) => (
                                            <div key={i} className="flex items-center justify-between group">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-rose-900 truncate max-w-[120px]">{p.name}</p>
                                                    <p className="text-[10px] text-rose-700/60 font-medium">Inactive {p.days_inactive} days</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <p className="text-xs font-black text-rose-800">{p.stock} units</p>
                                                        <p className="text-[9px] font-bold text-rose-500 uppercase">In Stock</p>
                                                    </div>
                                                    <Link href={route('products.index')} className="p-1.5 bg-white rounded-lg text-rose-600 hover:bg-rose-100 transition-colors shadow-sm">
                                                        <ArrowUpRight size={14} />
                                                    </Link>
                                                </div>
                                            </div>
                                        )) : <p className="text-[10px] text-rose-700/60 text-center py-4 italic font-medium">All products are moving healthy!</p>}
                                    </div>
                                </div>
                            </div>
                    </div>
                    {canViewSponsoredPerformance && (
                        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">

                            <div className="p-6">
                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="p-1 bg-amber-50 rounded-lg border border-amber-100">
                                                <Activity size={14} className="text-amber-600" />
                                            </div>
                                            <h3 className="text-lg font-bold text-stone-900 leading-none">Campaign Intelligence</h3>
                                        </div>
                                        <p className="text-sm text-stone-500">Real-time tracking for sponsored product placements.</p>
                                    </div>

                                    {/* Action Group */}
                                    <div className="flex items-center gap-3">
                                        {sponsorshipIsAvailable && (
                                            <div className="flex bg-stone-100 p-1 rounded-xl w-fit border border-stone-200">
                                                {['Daily', 'Monthly'].map((filterName) => (
                                                    <button
                                                        key={filterName}
                                                        onClick={() => setSponsorshipFilter(filterName)}
                                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${sponsorshipFilter === filterName ? 'bg-white text-stone-900 shadow-sm border border-stone-200/50' : 'text-stone-500 hover:text-stone-700'}`}
                                                    >
                                                        {filterName}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {!sponsorshipIsAvailable ? (
                                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-10 flex flex-col items-center text-center">
                                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 border border-amber-100">
                                            <BarChart3 className="text-amber-500" size={24} />
                                        </div>
                                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Analytics Schema Required</p>
                                        <p className="mt-2 text-sm leading-relaxed text-amber-800 max-w-sm">{sponsorshipMessage}</p>
                                        <p className="mt-3 text-xs text-amber-700/60 max-w-xs">
                                            Sponsored impressions, clicks, and revenue appear once the campaign tracking data is synchronized.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {/* Metrics Row */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                            <MetricCard title="Impressions" value={sponsorshipMetrics?.impressions || 0} icon={BarChart3} bg="bg-stone-50" text="text-clay-600" />
                                            <MetricCard title="Total Clicks" value={sponsorshipMetrics?.clicks || 0} icon={Activity} bg="bg-stone-50" text="text-amber-600" />
                                            <MetricCard title="CTR" value={`${Number(sponsorshipMetrics?.ctr || 0).toFixed(2)}%`} icon={TrendingUp} bg="bg-emerald-50" text="text-emerald-600" />
                                            <MetricCard title="Ad Revenue" value={formatPeso(sponsorshipMetrics?.sponsored_revenue || 0)} icon={DollarSign} bg="bg-clay-50" text="text-clay-600" />
                                        </div>

                                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
                                            {/* Chart Panel */}
                                            <div className="xl:col-span-2 bg-stone-50/50 rounded-2xl border border-stone-100 p-5 min-h-[350px]">
                                                <div className="flex items-center justify-between mb-6">
                                                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Growth Performance</p>
                                                    <div className="flex gap-4">
                                                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-clay-500" /><span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Impressions</span></div>
                                                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Clicks</span></div>
                                                    </div>
                                                </div>
                                                <div className="h-[280px] w-full">
                                                    {sponsorshipHasActivity ? (
                                                        <ResponsiveContainer width="100%" height="100%">
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
                                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 12 }} dy={15} />
                                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 12 }} />
                                                                <Tooltip
                                                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                                    formatter={(value, name) => {
                                                                        const labels = { impressions: 'Impressions', clicks: 'Clicks', ctr: 'CTR (%)', sponsored_orders: 'Sponsored Orders' };
                                                                        return [name === 'sponsored_revenue' ? formatPeso(value) : value, labels[name] || name];
                                                                    }}
                                                                />
                                                                <Area type="monotone" dataKey="impressions" stroke="#c07251" strokeWidth={3} fillOpacity={1} fill="url(#colorSponsoredImpressions)" activeDot={{ r: 6, strokeWidth: 0 }} />
                                                                <Area type="monotone" dataKey="clicks" stroke="#d97706" strokeWidth={3} fillOpacity={1} fill="url(#colorSponsoredClicks)" activeDot={{ r: 6, strokeWidth: 0 }} />
                                                            </AreaChart>
                                                        </ResponsiveContainer>
                                                    ) : (
                                                        <div className="h-full flex items-center justify-center border border-dashed border-stone-200 rounded-xl bg-stone-50">
                                                            <WorkspaceEmptyState compact icon={BarChart3} title="Awaiting Data" description="Campaign metrics will populate here once active." />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Elevated Insight Panel */}
                                            <div className="bg-gradient-to-br from-white to-amber-50/30 rounded-2xl p-6 border border-stone-100 flex flex-col justify-between shadow-sm relative overflow-hidden group">
                                                {/* Subtle Inner Glow */}
                                                <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-200/20 blur-3xl rounded-full" />

                                                <div className="relative z-10">
                                                    <div className="flex items-center justify-between mb-8">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-white border border-amber-100 flex items-center justify-center shadow-sm">
                                                                <Activity size={18} className="text-amber-500" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600/80 leading-none">Premium Tracking</p>
                                                                <h4 className="text-sm font-bold text-stone-900 mt-1">Campaign Snapshot</h4>
                                                            </div>
                                                        </div>
                                                        <div className="bg-emerald-50 text-emerald-600 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                                                            ACTIVE
                                                        </div>
                                                    </div>

                                                    <div className="space-y-6">
                                                        <div>
                                                            <p className="text-xs text-stone-500 mb-1 font-medium">Sponsored Sales</p>
                                                            <p className="text-3xl font-bold text-stone-900 tracking-tight leading-none">{Number(sponsorshipMetrics?.sponsored_orders || 0).toLocaleString()}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-stone-500 mb-1 font-medium">Total Impact</p>
                                                            <p className="text-3xl font-bold text-clay-700 tracking-tight leading-none">{formatPeso(sponsorshipMetrics?.sponsored_revenue || 0)}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pt-6 border-t border-stone-200/60 mt-8 relative z-10">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Efficiency Rating</span>
                                                        <span className="text-xs font-bold text-emerald-600">{Number(sponsorshipMetrics?.ctr || 0).toFixed(1)}%</span>
                                                    </div>
                                                    <div className="w-full bg-stone-200/50 h-1 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${Math.min(100, Number(sponsorshipMetrics?.ctr || 0) * 10)}%` }}
                                                            className="h-full bg-emerald-500"
                                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-stone-100 relative overflow-hidden">
                            {isLoading && (
                                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col">
                                    <div className="h-20 shrink-0"></div>
                                    <ArtisanSkeleton variant="list" count={5} />
                                </div>
                            )}
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-stone-900">Top Products</h3>
                                    <p className="text-sm text-stone-500">Best performers by volume</p>
                                </div>
                                <Link href={route('products.index')} className="text-sm font-bold text-clay-600 hover:underline">Manage Products</Link>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {topProducts.length > 0 ? (
                                    topProducts.map((item, index) => {
                                        const isHighMargin = item.margin >= 30;
                                        const imageUrl = item.img ? (item.img.startsWith('http') || item.img.startsWith('/storage') ? item.img : `/storage/${item.img}`) : null;

                                        return (
                                            <div key={index} className="group relative bg-stone-50 rounded-2xl p-4 border border-stone-100 hover:bg-white hover:shadow-xl hover:border-clay-100 transition-all duration-300 flex flex-col">
                                                <div className="flex gap-4">
                                                    {/* Visual Section */}
                                                    <div className="relative shrink-0">
                                                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-stone-200 border border-white shadow-sm">
                                                            {imageUrl ? (
                                                                <img 
                                                                    src={imageUrl} 
                                                                    alt="" 
                                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                                                    onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.classList.add('flex', 'items-center', 'justify-center'); }} 
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-stone-400 bg-stone-100"><Package size={24} /></div>
                                                            )}
                                                        </div>
                                                        {/* Styled Rank Badge */}
                                                        <div className={`absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm border-2 border-white
                                                            ${index === 0 ? 'bg-amber-400 text-amber-950' :
                                                                index === 1 ? 'bg-stone-300 text-stone-800' :
                                                                    index === 2 ? 'bg-orange-300 text-orange-950' : 'bg-white text-stone-400'}`}>
                                                            {index + 1}
                                                        </div>
                                                    </div>

                                                    {/* Info Section */}
                                                    <div className="flex-1 min-w-0 flex flex-col">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <p className="font-bold text-stone-900 truncate text-sm leading-tight">{item.name}</p>
                                                            {isHighMargin && (
                                                                <span className="shrink-0 bg-emerald-50 text-emerald-600 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter border border-emerald-100">
                                                                    High Margin
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
                                                            <div>
                                                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Net Profit</p>
                                                                <p className="text-sm font-black text-clay-700 leading-none mt-1">{formatPeso(item.profit)}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Efficiency</p>
                                                                <p className={`text-sm font-black leading-none mt-1 ${isHighMargin ? 'text-emerald-600' : 'text-stone-600'}`}>{item.margin}%</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Progress Bar (Volume Indicator) */}
                                                <div className="mt-4 w-full bg-stone-200/50 h-1.5 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${(item.sales / topProducts[0].sales) * 100}%` }}
                                                        className="h-full bg-clay-500 rounded-full"
                                                        transition={{ duration: 1, ease: "easeOut" }}
                                                    />
                                                </div>
                                                <div className="mt-1 flex justify-between items-center text-[10px] font-bold text-stone-400 uppercase tracking-tighter">
                                                    <span>Sales Volume</span>
                                                    <span>{item.sales} units</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-full">
                                        <WorkspaceEmptyState
                                            compact
                                            icon={ShoppingBag}
                                            title="No product sales yet"
                                            description="Top products will appear here after completed orders start coming in."
                                            actionLabel="Manage Products"
                                            actionHref={route('products.index')}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-stone-100 flex flex-col relative overflow-hidden">
                            {isLoading && (
                                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center p-12">
                                    <ArtisanSkeleton variant="circle" className="w-full aspect-square max-w-[200px]" />
                                </div>
                            )}
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-stone-900">Customer Ratings</h3>
                                    <p className="text-sm text-stone-500">Shop quality feedback</p>
                                </div>
                                <Link href={route('reviews.index')} className="text-sm font-bold text-clay-600 hover:underline">View All</Link>
                            </div>

                            <div className="flex flex-col items-center mb-6">
                                <h1 className="text-5xl font-black text-stone-900 mb-2">{stats?.average ? stats.average.toFixed(1) : '0.0'}</h1>
                                <div className="flex items-center gap-1 mb-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            size={20}
                                            className={star <= Math.round(stats?.average || 0) ? 'fill-amber-500 text-amber-500' : 'text-stone-200'}
                                        />
                                    ))}
                                </div>
                                <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">{stats?.total || 0} Reviews</p>
                            </div>

                            <div className="mt-auto space-y-2 border-t border-stone-100 pt-4">
                                {[5, 4, 3, 2, 1].map((star) => {
                                    const count = Number(stats?.breakdown?.[String(star)] || 0);
                                    const percentage = stats?.total > 0 ? (count / stats.total) * 100 : 0;
                                    return (
                                        <div key={star} className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-stone-500 w-12 flex items-center justify-end gap-1">
                                                {star} <Star size={10} className="fill-amber-500 text-amber-500" />
                                            </span>
                                            <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${percentage}%` }}></div>
                                            </div>
                                            <span className="text-xs font-bold text-stone-400 w-6 text-right">{count}</span>
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
