/* global route */
import React from 'react';
import { Head, Link } from '@inertiajs/react';
import SupplierLayout from '@/Layouts/SupplierLayout';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { 
    Box, ClipboardList, TrendingUp, AlertTriangle, 
    ArrowRight, Plus, Building2, PackageCheck,
    Truck, Store
} from 'lucide-react';

export default function SupplierDashboard({ 
    metrics = {}, 
    recentOrders = [], 
    lowStockMaterials = [], 
    supplier = {} 
}) {
    const materialsCount = Number(metrics?.materialsCount) || 0;
    const totalUnits = Number(metrics?.totalUnits) || 0;
    const activeOrdersCount = Number(metrics?.activeOrdersCount) || 0;
    const totalRevenue = Number(metrics?.totalRevenue) || 0;

    const statusBadgeClasses = {
        'Pending': 'bg-amber-50 text-amber-800 border-amber-200/70',
        'Accepted': 'bg-teal-50 text-teal-800 border-teal-200/70',
        'Processing': 'bg-blue-50 text-blue-800 border-blue-200/70',
        'Shipped': 'bg-indigo-50 text-indigo-800 border-indigo-200/70',
        'Ready for Pickup': 'bg-purple-50 text-purple-800 border-purple-200/70',
        'Delivered': 'bg-emerald-50 text-emerald-800 border-emerald-200/70',
        'Cancelled': 'bg-stone-100 text-stone-600 border-stone-200',
    };

    const headerActions = (
        <Link
            href={route('supplier.materials.index')}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-clay-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-clay-700 transition-colors active:scale-95 shrink-0 min-h-[40px]"
        >
            <Plus size={15} />
            <span>List Raw Material</span>
        </Link>
    );

    const greeting = (() => {
        const hour = new Date().getHours();
        const name = supplier?.shop_name || supplier?.name || 'Supplier';
        if (hour < 12) return `Good morning, ${name}`;
        if (hour < 18) return `Good afternoon, ${name}`;
        return `Good evening, ${name}`;
    })();

    const hasOperationalAlerts = activeOrdersCount > 0 || lowStockMaterials.length > 0;

    return (
        <SupplierLayout 
            active="dashboard" 
            title={greeting}
            subtitle={`${supplier?.city ? supplier.city + ' • ' : ''}B2B Raw Materials Supply Hub`}
            actions={headerActions}
        >
            <Head title="Supplier Dashboard" />

            <div className="space-y-6">
                {/* Warehouse Operational Health Alert Strip (Only rendered when attention needed) */}
                {hasOperationalAlerts && (
                    <div className="flex flex-wrap items-center gap-2.5 bg-white border border-stone-200/80 rounded-2xl p-3 px-4 shadow-2xs">
                        <div className="flex items-center gap-2 pr-3 border-r border-stone-200">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                                Attention Required
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {activeOrdersCount > 0 && (
                                <Link 
                                    href={route('supplier.orders.index', { status: 'Pending' })}
                                    className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100/80 text-amber-800 px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-200/60 transition-colors"
                                >
                                    <ClipboardList size={14} className="text-amber-600" />
                                    <span>{activeOrdersCount} Inbound Order{activeOrdersCount === 1 ? '' : 's'} Pending Dispatch</span>
                                </Link>
                            )}

                            {lowStockMaterials.length > 0 && (
                                <Link 
                                    href={route('supplier.materials.index')}
                                    className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100/80 text-rose-800 px-3 py-1.5 rounded-xl text-xs font-bold border border-rose-200/60 transition-colors"
                                >
                                    <AlertTriangle size={14} className="text-rose-600" />
                                    <span>{lowStockMaterials.length} Raw Material{lowStockMaterials.length === 1 ? '' : 's'} Below Stock Threshold</span>
                                </Link>
                            )}
                        </div>
                    </div>
                )}

                {/* Wholesale KPI Metric Cards Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                    {/* 1. Wholesale Catalog */}
                    <div className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow flex items-start justify-between group">
                        <div>
                            <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                                Wholesale Catalog
                            </p>
                            <p className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight font-sans tabular-nums">
                                {materialsCount}
                            </p>
                            <p className="text-[11px] font-medium text-stone-500 mt-1">
                                Active raw materials
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-teal-50 text-teal-700 group-hover:scale-105 transition-transform shrink-0 border border-teal-100/80">
                            <Box size={20} />
                        </div>
                    </div>

                    {/* 2. Inventory Units */}
                    <div className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow flex items-start justify-between group">
                        <div>
                            <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                                Inventory Units
                            </p>
                            <p className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight font-sans tabular-nums">
                                {totalUnits.toLocaleString()}
                            </p>
                            <p className="text-[11px] font-medium text-stone-500 mt-1">
                                Bulk units in warehouse
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-blue-700 group-hover:scale-105 transition-transform shrink-0 border border-blue-100/80">
                            <PackageCheck size={20} />
                        </div>
                    </div>

                    {/* 3. Inbound Orders */}
                    <div className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow flex items-start justify-between group">
                        <div>
                            <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                                Inbound Orders
                            </p>
                            <p className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight font-sans tabular-nums">
                                {activeOrdersCount}
                            </p>
                            <p className="text-[11px] font-medium text-stone-500 mt-1">
                                Pending fulfillment
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 text-amber-700 group-hover:scale-105 transition-transform shrink-0 border border-amber-100/80">
                            <ClipboardList size={20} />
                        </div>
                    </div>

                    {/* 4. Wholesale Revenue Volume */}
                    <div className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow flex items-start justify-between group">
                        <div>
                            <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                                Wholesale Volume
                            </p>
                            <p className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight font-sans tabular-nums">
                                ₱{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-[11px] font-medium text-stone-500 mt-1">
                                Delivered studio volume
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-clay-50 text-clay-700 group-hover:scale-105 transition-transform shrink-0 border border-clay-100/80">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                </div>

                {/* Split Content: Recent Orders & Stock Watchlist */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Recent Incoming Workshop Orders */}
                    <div className="lg:col-span-2 rounded-2xl border border-stone-200/80 bg-white shadow-2xs p-5 sm:p-6 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                                <div>
                                    <h2 className="text-base font-bold text-stone-900 tracking-tight">
                                        Recent Workshop Orders
                                    </h2>
                                    <p className="text-xs text-stone-500 mt-0.5">
                                        Inbound procurement requests placed by verified Cavite artisan studios
                                    </p>
                                </div>
                                <Link
                                    href={route('supplier.orders.index')}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-clay-700 hover:text-clay-800 transition-colors"
                                >
                                    <span>View All</span>
                                    <ArrowRight size={13} />
                                </Link>
                            </div>

                            {recentOrders.length === 0 ? (
                                <div className="py-12">
                                    <WorkspaceEmptyState
                                        compact
                                        icon={ClipboardList}
                                        title="No wholesale orders received yet"
                                        description="When artisan workshops purchase your raw materials through the B2B Supply Hub, their orders will appear here for fulfillment."
                                    />
                                </div>
                            ) : (
                                <div className="divide-y divide-stone-100 mt-2">
                                    {recentOrders.map((order) => (
                                        <Link
                                            key={order.id}
                                            href={route('supplier.orders.index')}
                                            className="py-3.5 flex items-center justify-between gap-4 group hover:bg-stone-50/60 -mx-2 px-2 rounded-xl transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="h-10 w-10 rounded-xl bg-stone-100 border border-stone-200/70 overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-stone-700 shadow-2xs">
                                                    {order.avatar ? (
                                                        <img
                                                            src={order.avatar}
                                                            alt={order.workshop_name}
                                                            className="h-full w-full object-cover"
                                                            onError={(e) => {
                                                                e.currentTarget.onerror = null;
                                                                e.currentTarget.src = '/images/placeholder.svg';
                                                            }}
                                                        />
                                                    ) : (
                                                        <Store size={18} className="text-stone-400" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-xs font-bold text-stone-900 truncate group-hover:text-clay-700 transition-colors">
                                                            {order.workshop_name}
                                                        </h3>
                                                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider whitespace-nowrap shrink-0 ${statusBadgeClasses[order.status] || 'bg-stone-50 text-stone-700 border-stone-200'}`}>
                                                            {order.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-stone-500 truncate mt-0.5">
                                                        #{order.order_number} • {order.item_count} material item{order.item_count === 1 ? '' : 's'} {order.city ? `• ${order.city}` : ''}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <p className="text-xs font-bold text-stone-900 tabular-nums">
                                                    ₱{Number(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                                <p className="text-[10px] text-stone-400 mt-0.5">
                                                    {order.created_at}
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Cavite B2B Supply Network Distribution Banner */}
                        <div className="mt-6 pt-4 border-t border-stone-100">
                            <div className="rounded-xl border border-teal-200/70 bg-gradient-to-r from-teal-50/60 via-stone-50/50 to-white p-3.5 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="p-2 rounded-lg bg-teal-100 text-teal-800 shrink-0">
                                        <Truck size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-teal-950">
                                            Cavite B2B Supply Hub Logistics
                                        </p>
                                        <p className="text-[11px] text-teal-700 truncate">
                                            Direct warehouse-to-studio delivery powered by local Cavite courier hubs
                                        </p>
                                    </div>
                                </div>
                                <Link
                                    href={route('supplier.orders.index')}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-900 hover:text-teal-700 shrink-0 whitespace-nowrap"
                                >
                                    <span>Fulfillment Hub</span>
                                    <ArrowRight size={13} />
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Low Stock Watchlist & Quick Actions */}
                    <div className="space-y-6">
                        {/* Low Stock Watchlist */}
                        <div className="rounded-2xl border border-stone-200/80 bg-white shadow-2xs p-5">
                            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3.5">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                                    <div>
                                        <h2 className="text-sm font-bold text-stone-900">
                                            Low Stock Watchlist
                                        </h2>
                                        <p className="text-[10.5px] text-stone-500">
                                            Materials below threshold (≤10 units)
                                        </p>
                                    </div>
                                </div>
                                <Link
                                    href={route('supplier.materials.index')}
                                    className="text-[10px] font-bold text-clay-700 hover:text-clay-800"
                                >
                                    Manage All
                                </Link>
                            </div>

                            {lowStockMaterials.length === 0 ? (
                                <div className="py-6 text-center text-stone-400">
                                    <PackageCheck size={28} className="mx-auto mb-1.5 text-emerald-500/70" />
                                    <p className="text-xs font-bold text-stone-700">Stock levels healthy</p>
                                    <p className="text-[11px] text-stone-400 mt-0.5">All wholesale materials are stocked above 10 units.</p>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {lowStockMaterials.map((mat) => (
                                        <div 
                                            key={mat.id} 
                                            className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-3 hover:bg-amber-50/70 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold text-stone-900 truncate">
                                                        {mat.name}
                                                    </p>
                                                    <p className="text-[10px] text-stone-500 mt-0.5">
                                                        MOQ: {mat.moq} {mat.supply_unit} • ₱{Number(mat.price).toLocaleString()}
                                                    </p>
                                                </div>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-900 whitespace-nowrap shrink-0">
                                                    {mat.stock} {mat.supply_unit} left
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quick Warehouse Shortcuts */}
                        <div className="rounded-2xl border border-stone-200/80 bg-white shadow-2xs p-5 space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                                Quick Operations
                            </h3>
                            <div className="space-y-2">
                                <Link
                                    href={route('supplier.materials.index')}
                                    className="flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-stone-100/80 border border-stone-200/60 text-xs font-bold text-stone-800 transition-colors group"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Box size={16} className="text-teal-700" />
                                        <span>Manage Wholesale Catalog</span>
                                    </div>
                                    <ArrowRight size={13} className="text-stone-400 group-hover:text-stone-700 transition-colors" />
                                </Link>
                                <Link
                                    href={route('supplier.orders.index')}
                                    className="flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-stone-100/80 border border-stone-200/60 text-xs font-bold text-stone-800 transition-colors group"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <ClipboardList size={16} className="text-amber-700" />
                                        <span>Process Inbound Orders</span>
                                    </div>
                                    <ArrowRight size={13} className="text-stone-400 group-hover:text-stone-700 transition-colors" />
                                </Link>
                                <Link
                                    href={route('profile.edit')}
                                    className="flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-stone-100/80 border border-stone-200/60 text-xs font-bold text-stone-800 transition-colors group"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Building2 size={16} className="text-clay-700" />
                                        <span>Warehouse &amp; Payout Settings</span>
                                    </div>
                                    <ArrowRight size={13} className="text-stone-400 group-hover:text-stone-700 transition-colors" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SupplierLayout>
    );
}
