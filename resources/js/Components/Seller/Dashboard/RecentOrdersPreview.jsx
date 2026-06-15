import React from 'react';
import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Search, Calendar, ChevronDown, Filter, ShoppingBag, ArrowUpRight } from 'lucide-react';
import ArtisanSkeleton from '@/Components/Consumer/ArtisanSkeleton';
import CompactPagination from '@/Components/CompactPagination';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';

const StatusBadge = ({ status }) => {
    const styles = {
        'Pending': 'bg-amber-50 text-amber-750 border-amber-100',
        'Accepted': 'bg-clay-50 text-clay-700 border-clay-100',
        'Shipped': 'bg-blue-50 text-blue-700 border-blue-100',
        'Delivered': 'bg-emerald-50 text-emerald-700 border-emerald-100',
        'Completed': 'bg-emerald-100 text-emerald-850 border-emerald-200',
        'Rejected': 'bg-rose-50 text-rose-750 border-rose-100',
        'Cancelled': 'bg-stone-100 text-stone-600 border-stone-200',
    };
    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-extrabold border ${styles[status] || 'bg-stone-100'}`}>
            {status}
        </span>
    );
};

export default function RecentOrdersPreview({
    recentOrders,
    search,
    handleSearchChange,
    status,
    handleStatusChange,
    date,
    handleDateChange,
    isLoading
}) {
    const renderOrderCard = (order) => (
        <div 
            key={order.id}
            className="rounded-2xl border border-stone-150 bg-white p-4 shadow-sm hover:shadow-md transition-shadow shrink-0 snap-center w-[85vw] max-w-[290px] sm:w-auto sm:max-w-none"
        >
            <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black text-stone-900">
                    #{order.id}
                </span>
                <StatusBadge status={order.status} />
            </div>

            <div className="mt-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-clay-100 flex items-center justify-center text-clay-700 font-bold text-xs overflow-hidden border border-clay-200 shrink-0">
                    {order.customer_avatar ? (
                        <img 
                            src={order.customer_avatar.startsWith('http') || order.customer_avatar.startsWith('/storage') ? order.customer_avatar : `/storage/${order.customer_avatar}`} 
                            alt={order.customer} 
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    ) : (
                        order.customer.charAt(0)
                    )}
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-850 truncate">{order.customer}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">{order.date}</p>
                </div>
            </div>

            <div className="mt-3.5 pt-3.5 border-t border-stone-100 flex items-center justify-between gap-3">
                <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Amount</p>
                    <p className="text-xs font-black text-stone-900">₱{Number(order.amount).toLocaleString()}</p>
                </div>
                <Link 
                    href={route('orders.index')} 
                    className="inline-flex items-center justify-center rounded-xl bg-stone-50 px-3 py-2 text-[10px] font-bold text-stone-600 border border-stone-200 transition hover:bg-stone-100 min-h-[44px] min-w-[44px]"
                >
                    Details <ArrowUpRight size={12} className="ml-1" />
                </Link>
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-lg font-bold text-gray-900">Recent Orders</h3>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    {/* Search input */}
                    <div className="relative flex-1 sm:flex-none sm:min-w-[200px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input 
                            type="text" 
                            placeholder="Order ID or Name..." 
                            value={search}
                            onChange={handleSearchChange}
                            className="w-full pl-9 pr-4 py-2.5 min-h-[44px] bg-gray-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-clay-500/20" 
                        />
                    </div>

                    {/* Status filter */}
                    <div className="relative flex-1 sm:flex-none min-w-[120px]">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <select 
                            value={status}
                            onChange={handleStatusChange}
                            className="w-full pl-9 pr-8 py-2.5 min-h-[44px] bg-gray-50 border-none rounded-xl text-xs appearance-none focus:ring-2 focus:ring-clay-500/20 cursor-pointer"
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
                            className="w-full pl-9 pr-4 py-2.5 min-h-[44px] bg-gray-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-clay-500/20 cursor-pointer" 
                        />
                    </div>
                </div>
            </div>
            
            <div className="min-h-[300px] relative">
                {isLoading ? (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-20 transition-all flex flex-col">
                        <ArtisanSkeleton variant="list" count={5} />
                    </div>
                ) : null}

                {/* Mobile View: Horizontal Scroll Card Deck (< 640px) */}
                <div className="flex overflow-x-auto pb-4 gap-4 flex-nowrap no-scrollbar snap-x snap-mandatory sm:hidden p-4">
                    {recentOrders.data.length > 0 ? (
                        recentOrders.data.map(renderOrderCard)
                    ) : (
                        <WorkspaceEmptyState
                            icon={ShoppingBag}
                            title={search || status !== 'All' ? "No matching orders" : "No orders yet"}
                            description={search || status !== 'All' ? "Try adjusting your filters to find what you're looking for." : "When customers buy your products, they will appear here."}
                            action={null}
                            compact={true}
                        />
                    )}
                </div>

                {/* Tablet View: 2-column card grid (>= 640px and < 1024px) */}
                <div className="hidden sm:grid lg:hidden grid-cols-1 md:grid-cols-2 gap-4 p-4">
                    {recentOrders.data.length > 0 ? (
                        recentOrders.data.map(renderOrderCard)
                    ) : (
                        <WorkspaceEmptyState
                            icon={ShoppingBag}
                            title={search || status !== 'All' ? "No matching orders" : "No orders yet"}
                            description={search || status !== 'All' ? "Try adjusting your filters to find what you're looking for." : "When customers buy your products, they will appear here."}
                            action={null}
                            compact={true}
                        />
                    )}
                </div>

                {/* Desktop View: Tabular representation (>= 1024px) */}
                <div className="hidden lg:block overflow-x-auto">
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
                                recentOrders.data.map((order, idx) => (
                                    <motion.tr 
                                        key={order.id} 
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="hover:bg-stone-50 transition-colors"
                                    >
                                        <td className="px-6 py-4 font-bold text-gray-900">{order.id}</td>
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-clay-100 flex items-center justify-center text-clay-700 font-bold text-xs overflow-hidden border border-clay-200">
                                                {order.customer_avatar ? (
                                                    <img 
                                                        src={order.customer_avatar.startsWith('http') || order.customer_avatar.startsWith('/storage') ? order.customer_avatar : `/storage/${order.customer_avatar}`} 
                                                        alt={order.customer} 
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { e.target.style.display = 'none'; }}
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
                                            <Link href={route('orders.index')} className="text-clay-600 hover:text-clay-800 font-bold text-xs inline-flex items-center gap-1 justify-end min-h-[44px]">
                                                Details <ArrowUpRight size={14} />
                                            </Link>
                                        </td>
                                    </motion.tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12">
                                        <WorkspaceEmptyState
                                            icon={ShoppingBag}
                                            title={search || status !== 'All' ? "No matching orders" : "No orders yet"}
                                            description={search || status !== 'All' ? "Try adjusting your filters to find what you're looking for." : "When customers buy your products, they will appear here."}
                                            action={null}
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Links */}
            {recentOrders.total > 0 && (
                <CompactPagination 
                    links={recentOrders.links}
                    total={recentOrders.total}
                    currentCount={recentOrders.data.length}
                    label="orders"
                    only={['recentOrders', 'filters']}
                />
            )}
        </div>
    );
}
