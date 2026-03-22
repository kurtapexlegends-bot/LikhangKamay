import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import SellerSidebar from '@/Components/SellerSidebar';
import Dropdown from '@/Components/Dropdown';
import NotificationDropdown from '@/Components/NotificationDropdown';
import { 
    LayoutDashboard, Package, ShoppingBag, BarChart3, Box, 
    Search, Calendar, ChevronDown, 
    TrendingUp, TrendingDown, DollarSign, Users, CreditCard,
    MoreHorizontal, Filter, ArrowUpRight, XCircle, CheckCircle2, Truck, AlertCircle, Check,
    LogOut, User, Download, Plus, Menu, Crown
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceAccountSummary from '@/Components/WorkspaceAccountSummary';

const COLORS = ['#c07251', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ef4444'];

const MetricCard = ({ title, value, growth, icon: Icon, bg, text }) => {
    const isPositive = growth >= 0;
    
    return (
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{value}</h3>
                
                {growth !== undefined && (
                    <div className={`flex items-center gap-1 text-[10px] font-bold mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                        <span>{isPositive ? '+' : ''}{growth}% vs last month</span>
                    </div>
                )}
                {growth === undefined && <p className="text-[10px] font-medium text-gray-400 mt-1">Real-time status</p>}
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} ${text}`}>
                <Icon size={20} />
            </div>
        </div>
    );
};

const StatusBadge = ({ status }) => {
    const styles = {
        'Pending': 'bg-amber-100 text-amber-700 border-amber-200',
        'Accepted': 'bg-indigo-100 text-indigo-700 border-indigo-200',
        'Shipped': 'bg-blue-100 text-blue-700 border-blue-200',
        'Delivered': 'bg-teal-100 text-teal-700 border-teal-200',
        'Completed': 'bg-green-100 text-green-700 border-green-200',
        'Rejected': 'bg-red-100 text-red-700 border-red-200',
        'Cancelled': 'bg-gray-100 text-gray-600 border-gray-200',
    };
    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${styles[status] || 'bg-gray-100'}`}>
            {status}
        </span>
    );
};

export default function Dashboard({ auth }) {
    const { metrics: initialMetrics, chartData, categoryData, recentOrders, filters, subscription } = usePage().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [chartFilter, setChartFilter] = useState('Monthly');
    const [metrics, setMetrics] = useState(initialMetrics);
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'All');
    const [date, setDate] = useState(filters.date || '');
    const [pendingRequests, setPendingRequests] = useState(initialMetrics.pending_requests || 0);
    const searchTimeoutRef = useRef(null);

    const currentChartData = chartFilter === 'Monthly' ? chartData.monthly : chartData.yearly;

    // Shared partial-reload helper — only refetches 'recentOrders' and 'filters',
    // leaving metrics, charts, and categories untouched (no full-page reload).
    const applyFilters = useCallback((overrides = {}) => {
        const params = { search, status, date, ...overrides };
        router.get(route('dashboard'), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ['recentOrders', 'filters'],
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

    // Polling API logic has been removed as it was hitting a 404.

    return (
        <div className="min-h-screen bg-[#FDFBF9] flex font-sans text-gray-800">
            <Head title="Dashboard" />
            <SellerSidebar active="overview" user={auth.user} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0 lg:ml-56 transition-all duration-300">
                <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-40">
                    
                    {/* LEFT: Page Title */}
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-clay-600">
                            <Menu size={24} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
                            <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Overview of your shop's performance</p>
                        </div>
                    </div>

                    {/* RIGHT: Actions & Profile */}
                    <div className="flex items-center gap-6">
                        
                        {/* 1. ACTION BUTTONS (Beside Profile) */}
                        <div className="flex items-center gap-3">
                            <NotificationDropdown />
                        </div>

                        {/* Divider */}
                        <div className="h-8 w-px bg-gray-200"></div>

                        {/* 2. PROFILE DROPDOWN (Classic Layout) */}
                        <div className="relative">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <span className="inline-flex rounded-md">
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-3 px-1 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-transparent hover:text-gray-700 focus:outline-none transition ease-in-out duration-150"
                                        >
                                            <WorkspaceAccountSummary user={auth.user} />

                                            <UserAvatar user={auth.user} className="w-9 h-9 border border-clay-200" />

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

                <main className="flex-1 p-6 overflow-y-auto space-y-6">
                    
                    {/* 1. KEY METRICS CARDS WITH REAL GROWTH DATA */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <MetricCard 
                            title="Total Revenue" 
                            value={`₱${Number(metrics.revenue).toLocaleString()}`} 
                            growth={metrics.revenue_growth} 
                            icon={DollarSign} 
                            bg="bg-blue-100" 
                            text="text-blue-600" 
                        />
                        <MetricCard 
                            title="Total Orders" 
                            value={metrics.orders} 
                            growth={metrics.orders_growth} 
                            icon={ShoppingBag} 
                            bg="bg-purple-100" 
                            text="text-purple-600" 
                        />
                        <MetricCard 
                            title="Total Customers" 
                            value={metrics.customers} 
                            growth={metrics.customers_growth} 
                            icon={Users} 
                            bg="bg-red-100" 
                            text="text-red-600" 
                        />
                        <MetricCard 
                            title="Avg. Order Value" 
                            value={`₱${Number(metrics.avg_value).toLocaleString()}`} 
                            growth={metrics.avg_growth} 
                            icon={CreditCard} 
                            bg="bg-amber-100" 
                            text="text-amber-600" 
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* 2. REVENUE ANALYTICS CHART */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Revenue Analytics</h3>
                                    <p className="text-sm text-gray-500">Income over time</p>
                                </div>
                                <div className="flex bg-gray-100 p-1 rounded-lg">
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
                                                    <stop offset="5%" stopColor="#c07251" stopOpacity={0.15}/>
                                                    <stop offset="95%" stopColor="#c07251" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={15} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} tickFormatter={(val) => `₱${val}`} />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                formatter={(value) => `₱${Number(value).toLocaleString()}`} 
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

                        {/* 3. SALES BY CATEGORY */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Sales by Category</h3>
                                    <p className="text-sm text-gray-500">Total items sold</p>
                                </div>
                            </div>
                            
                            <div className="flex-1 min-h-[220px] relative">
                                {categoryData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                        <PieChart>
                                            <Pie
                                                data={categoryData}
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
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-2">
                                        <Package size={32} className="text-gray-300" />
                                        <span className="text-sm font-medium">No sales data yet</span>
                                    </div>
                                )}
                            </div>

                            {/* Custom Legend */}
                            {categoryData.length > 0 && (
                                <div className="mt-2 space-y-2 pt-4 border-t border-gray-50">
                                    {(() => {
                                        const total = categoryData.reduce((sum, item) => sum + item.value, 0);
                                        return categoryData.map((item, index) => (
                                            <div key={index} className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                    <span className="font-medium text-gray-700 truncate max-w-[120px]">{item.name}</span>
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

                    {/* 4. RECENT ORDERS TABLE */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <h3 className="text-lg font-bold text-gray-900">Recent Orders</h3>
                            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                {/* Search input */}
                                <div className="relative flex-1 sm:flex-none sm:min-w-[200px]">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Order ID or Name..." 
                                        value={search}
                                        onChange={handleSearchChange}
                                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-clay-500/20" 
                                    />
                                </div>

                                {/* Status filter */}
                                <div className="relative flex-1 sm:flex-none min-w-[120px]">
                                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    <select 
                                        value={status}
                                        onChange={handleStatusChange}
                                        className="w-full pl-9 pr-8 py-2 bg-gray-50 border-none rounded-xl text-xs appearance-none focus:ring-2 focus:ring-clay-500/20"
                                    >
                                        <option value="All">All Status</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Accepted">Accepted</option>
                                        <option value="Shipped">Shipped</option>
                                        <option value="Delivered">Delivered</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Rejected">Rejected</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>

                                {/* Date filter */}
                                <div className="relative flex-1 sm:flex-none min-w-[140px]">
                                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    <input 
                                        type="date" 
                                        value={date}
                                        onChange={handleDateChange}
                                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-clay-500/20" 
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Order ID</th>
                                        <th className="px-6 py-4">Customer</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Amount</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {recentOrders.data.length > 0 ? (
                                        recentOrders.data.map((order) => (
                                            <tr key={order.id} className="hover:bg-gray-50/50 transition">
                                                <td className="px-6 py-4 font-bold text-gray-900">{order.id}</td>
                                                <td className="px-6 py-4 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-clay-100 flex items-center justify-center text-clay-700 font-bold text-xs overflow-hidden border border-clay-200">
                                                        {order.customer_avatar ? (
                                                            <img 
                                                                src={order.customer_avatar.startsWith('http') || order.customer_avatar.startsWith('/storage') ? order.customer_avatar : `/storage/${order.customer_avatar}`} 
                                                                alt={order.customer} 
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            order.customer.charAt(0)
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700">{order.customer}</span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{order.date}</td>
                                                <td className="px-6 py-4 font-bold text-gray-900">₱{Number(order.amount).toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    <StatusBadge status={order.status} />
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Link href={route('orders.index')} className="text-clay-600 hover:text-clay-800 font-bold text-xs flex items-center gap-1 justify-end">
                                                        Details <ArrowUpRight size={14} />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                                                No orders found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Links */}
                        {recentOrders.total > 0 && (
                            <div className="bg-gray-50/50 px-6 py-4 flex items-center justify-between border-t border-gray-100">
                                <p className="text-xs text-gray-500">
                                    Showing <span className="font-bold text-gray-900">{recentOrders.data.length}</span> of <span className="font-bold text-gray-900">{recentOrders.total}</span> orders
                                </p>
                                <div className="flex gap-1">
                                    {recentOrders.links.map((link, i) => (
                                        <button
                                            key={i}
                                            disabled={!link.url}
                                            onClick={() => link.url && router.get(link.url, {}, {
                                                preserveState: true,
                                                preserveScroll: true,
                                                replace: true,
                                                only: ['recentOrders', 'filters'],
                                            })}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                link.active 
                                                    ? 'bg-clay-600 text-white shadow-sm' 
                                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                            } ${!link.url ? 'opacity-50 cursor-not-allowed hidden' : ''}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                </main>
            </div>
        </div>
    );
}
