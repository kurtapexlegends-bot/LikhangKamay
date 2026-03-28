import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import SellerSidebar from '@/Components/SellerSidebar';
import Dropdown from '@/Components/Dropdown';
import NotificationDropdown from '@/Components/NotificationDropdown';
import {
    Package,
    ShoppingBag,
    BarChart3,
    DollarSign,
    CreditCard,
    PieChart as PieIcon,
    ChevronDown,
    User,
    LogOut,
    Menu,
    Star,
    TrendingUp,
    TrendingDown,
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
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceAccountSummary from '@/Components/WorkspaceAccountSummary';

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
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [chartFilter, setChartFilter] = useState('Monthly');
    const [sponsorshipFilter, setSponsorshipFilter] = useState('Daily');
    const [catFilter, setCatFilter] = useState(filters.category);

    const currentChartData = chartData[chartFilter.toLowerCase()] || [];
    const currentSponsorshipChartData = sponsorshipChartData?.[sponsorshipFilter.toLowerCase()] || [];
    const stats = metrics.review_stats;
    const canViewSponsoredPerformance = !!sellerSubscription?.canRequestSponsorships;
    const sponsorshipIsAvailable = !!sponsorshipAnalyticsAvailability?.is_available;
    const sponsorshipHasActivity = !!sponsorshipAnalyticsAvailability?.has_activity;
    const sponsorshipMessage = sponsorshipAnalyticsAvailability?.message || 'No sponsorship activity yet.';

    const updateCategoryFilter = (newCat) => {
        setCatFilter(newCat);
        router.get(route('analytics.index'), { category: newCat }, { preserveState: true, preserveScroll: true });
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9] flex font-sans text-gray-800">
            <Head title="Shop Analytics" />
            <SellerSidebar active="analytics" user={auth.user} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0 lg:ml-56 transition-all duration-300">
                <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8 sticky top-0 z-40">
                    <div className="flex min-w-0 items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-clay-600">
                            <Menu size={24} />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
                            <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Financial performance & insights</p>
                        </div>
                    </div>

                    <div className="flex w-auto shrink-0 items-center gap-2 sm:gap-6">
                        <div className="flex items-center gap-2 sm:gap-3">
                            {sellerSubscription?.canExportAnalytics ? (
                                <a
                                    href={route('analytics.export')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 text-gray-600 transition shadow-sm"
                                >
                                    <DollarSign size={16} />
                                    <span>Download Report</span>
                                </a>
                            ) : (
                                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-stone-100 border border-stone-200 rounded-xl text-[11px] font-bold text-stone-500 shadow-sm">
                                    <DollarSign size={15} />
                                    <span>Premium Export</span>
                                </div>
                            )}

                            <NotificationDropdown />
                        </div>

                        <div className="hidden sm:block h-8 w-px bg-gray-200"></div>

                        <div className="relative">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <span className="inline-flex rounded-md">
                                        <button type="button" className="inline-flex items-center gap-2 sm:gap-3 px-1 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-transparent hover:text-gray-700 focus:outline-none transition ease-in-out duration-150">
                                            <WorkspaceAccountSummary user={auth.user} className="hidden lg:block text-right" />
                                            <UserAvatar user={auth.user} />
                                            <ChevronDown size={16} className="text-gray-400" />
                                        </button>
                                    </span>
                                </Dropdown.Trigger>

                                <Dropdown.Content>
                                    <Dropdown.Link href={route('profile.edit')} className="flex items-center gap-2">
                                        <User size={16} /> Profile
                                    </Dropdown.Link>
                                    <Dropdown.Link href={route('logout')} method="post" as="button" className="flex items-center gap-2 text-red-600 hover:text-red-700">
                                        <LogOut size={16} /> Log Out
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
                        <MetricCard title="Total Revenue" value={formatPeso(metrics.total_revenue)} growth={metrics.growth.revenue} icon={DollarSign} bg="bg-blue-100" text="text-blue-600" />
                        <MetricCard title="Gross Profit" value={formatPeso(metrics.gross_profit)} growth={metrics.growth.profit} icon={TrendingUp} bg="bg-green-100" text="text-green-600" />
                        <MetricCard title="Total Orders" value={Number(metrics.total_orders).toLocaleString()} growth={metrics.growth.orders} icon={ShoppingBag} bg="bg-purple-100" text="text-purple-600" />
                        <MetricCard title="Average Order" value={formatPeso(metrics.avg_order_value)} growth={metrics.growth.avg} icon={CreditCard} bg="bg-amber-100" text="text-amber-600" />
                        <MetricCard title="Shop Rating" value={`${metrics.average_rating} / 5.0`} icon={Star} bg="bg-yellow-100" text="text-yellow-500" />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <select value={catFilter} onChange={(e) => updateCategoryFilter(e.target.value)} className="bg-white border border-gray-200 text-gray-700 text-xs font-bold py-1.5 pl-3 pr-8 rounded-lg focus:ring-clay-500 focus:border-clay-500 cursor-pointer">
                            <option value="All Categories">All Categories</option>
                            {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
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

                            <div className="h-80 w-full">
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
                                    <div className="h-full flex items-center justify-center text-gray-400">
                                        No revenue data available for this period.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
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
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-2">
                                        <Package size={32} className="text-gray-300" />
                                        <span className="text-sm font-medium">No sales data yet</span>
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
                                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                                                    sponsorshipFilter === filterName ? 'bg-white text-clay-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
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
                                        <div className="xl:col-span-2 h-80">
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
                                                <div className="h-full flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-6">
                                                    <p className="text-sm font-bold text-stone-700">No sponsorship activity yet</p>
                                                    <p className="mt-2 max-w-sm text-xs leading-relaxed text-stone-500">
                                                        This section only reflects real impressions, clicks, and completed sponsored orders. Once activity is recorded, the chart will appear here.
                                                    </p>
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
                                    <p className="text-gray-400 text-center py-4">No product sales yet.</p>
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
            </div>
        </div>
    );
}

