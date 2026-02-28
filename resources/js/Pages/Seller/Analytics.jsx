import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import SellerSidebar from '@/Components/SellerSidebar';
import Dropdown from '@/Components/Dropdown';
import NotificationDropdown from '@/Components/NotificationDropdown'; 
import { 
    Package, ShoppingBag, BarChart3, Box, 
    Calendar, Download, TrendingUp, TrendingDown, DollarSign, 
    CreditCard, PieChart as PieIcon,
    ChevronDown, User, LogOut, Menu, Star
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

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

const COLORS = ['#c07251', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ef4444'];

export default function Analytics({ auth, metrics, chartData, categoryData, topProducts, categories, filters }) {

    // Manage Filters State
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [chartFilter, setChartFilter] = useState('Monthly');
    const [catFilter, setCatFilter] = useState(filters.category);

    // Client-side toggle between monthly/yearly data
    const currentChartData = chartData[chartFilter.toLowerCase()] || [];
    const stats = metrics.review_stats; // Backend data

    const updateCategoryFilter = (newCat) => {
        setCatFilter(newCat);
        router.get(route('analytics.index'), { category: newCat }, { preserveState: true, preserveScroll: true });
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9] flex font-sans text-gray-800">
            <Head title="Shop Analytics" />
            <SellerSidebar active="analytics" user={auth.user} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0 lg:ml-56 transition-all duration-300">
                
                {/* --- STANDARDIZED HEADER --- */}
                <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-40">
                    
                    {/* LEFT: Title */}
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-clay-600">
                            <Menu size={24} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
                            <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">Financial performance & insights</p>
                        </div>
                    </div>

                    {/* RIGHT: Actions & Profile */}
                    <div className="flex items-center gap-6">
                        
                        {/* 1. Action Buttons */}
                        <div className="flex items-center gap-3">
                            <a 
                                href={route('analytics.export')} 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 text-gray-600 transition shadow-sm"
                            >
                                <Download size={16} /> <span>Download Report</span>
                            </a>
                            
                            <NotificationDropdown />
                        </div>

                        {/* Divider */}
                        <div className="h-8 w-px bg-gray-200"></div>

                        {/* 2. Profile Dropdown (Classic Layout) */}
                        <div className="relative">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <span className="inline-flex rounded-md">
                                        <button type="button" className="inline-flex items-center gap-3 px-1 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-transparent hover:text-gray-700 focus:outline-none transition ease-in-out duration-150">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-sm font-bold text-gray-900">{auth.user.shop_name || auth.user.name}</p>
                                                <p className="text-[10px] text-gray-500">Seller Account</p>
                                            </div>
                                            <div className="w-9 h-9 rounded-full bg-clay-100 flex items-center justify-center text-clay-700 font-bold border border-clay-200 uppercase overflow-hidden">
                                                {auth.user.avatar ? (
                                                    <img 
                                                        src={auth.user.avatar.startsWith('http') ? auth.user.avatar : `/storage/${auth.user.avatar}`} 
                                                        alt={auth.user.name} 
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    (auth.user.shop_name || auth.user.name).charAt(0)
                                                )}
                                            </div>
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
                    {/* METRICS GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        <MetricCard title="Total Revenue" value={`₱${Number(metrics.total_revenue).toLocaleString()}`} growth={metrics.growth.revenue} icon={DollarSign} bg="bg-blue-100" text="text-blue-600" />
                        <MetricCard title="Gross Profit" value={`₱${Number(metrics.gross_profit).toLocaleString()}`} growth={metrics.growth.profit} icon={TrendingUp} bg="bg-green-100" text="text-green-600" />
                        <MetricCard title="Total Orders" value={Number(metrics.total_orders).toLocaleString()} growth={metrics.growth.orders} icon={ShoppingBag} bg="bg-purple-100" text="text-purple-600" />
                        <MetricCard title="Average Order" value={`₱${Number(metrics.avg_order_value).toLocaleString()}`} growth={metrics.growth.avg} icon={CreditCard} bg="bg-amber-100" text="text-amber-600" />
                        <MetricCard title="Shop Rating" value={`${metrics.average_rating} / 5.0`} icon={Star} bg="bg-yellow-100" text="text-yellow-500" />
                    </div>

                    {/* Category Filter (above charts) */}
                    <div className="flex items-center gap-2">
                        <select value={catFilter} onChange={(e) => updateCategoryFilter(e.target.value)} className="bg-white border border-gray-200 text-gray-700 text-xs font-bold py-1.5 pl-3 pr-8 rounded-lg focus:ring-clay-500 focus:border-clay-500 cursor-pointer">
                            <option value="All Categories">All Categories</option>
                            {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                        </select>
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

                            {/* Custom Legend */}
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

                    {/* BOTTOM GRID: Top Products & Review Block */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Top Products Table */}
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
                                                <p className="text-sm font-bold text-gray-900">₱{Number(item.profit).toLocaleString()}</p>
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

                        {/* Customer Reviews Stats (Integrated into Standard Layout) */}
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
                                    const count = stats?.stars ? stats.stars[star] : 0;
                                    const percentage = (stats?.total > 0) ? (count / stats.total) * 100 : 0;
                                    return (
                                        <div key={star} className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-gray-500 w-12 flex items-center justify-end gap-1">
                                                {star} <Star size={10} className="fill-amber-400 text-amber-400" />
                                            </span>
                                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${percentage}%` }}></div>
                                            </div>
                                            <span className="text-xs font-bold text-gray-400 w-6 text-right">{count || 0}</span>
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