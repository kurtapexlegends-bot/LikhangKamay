/* global route */
import React from 'react';
import { Head, Link } from '@inertiajs/react';
import SupplierLayout from '@/Layouts/SupplierLayout';
import { 
    Box, ClipboardList, TrendingUp, AlertTriangle, 
    ArrowRight, Plus, MapPin, Building2, PackageCheck 
} from 'lucide-react';

export default function SupplierDashboard({ metrics, recentOrders = [], lowStockMaterials = [], supplier }) {
    return (
        <SupplierLayout active="dashboard">
            <Head title="Supplier Dashboard" />

            {/* Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-clay-600" />
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                            {supplier?.city ? `${supplier.city}, ${supplier.province}` : 'Wholesale Distribution Hub'}
                        </span>
                    </div>
                    <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 font-serif">
                        {supplier?.company_name || 'Wholesale Supplier Dashboard'}
                    </h1>
                </div>

                <Link
                    href={route('supplier.materials.index')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-clay-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-clay-700 transition-colors active:scale-95 self-start sm:self-auto"
                >
                    <Plus size={16} /> List Raw Material
                </Link>
            </div>

            {/* KPI Cards Grid */}
            <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Wholesale Catalog</span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <Box size={18} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-serif">
                            {metrics?.materialsCount || 0}
                        </span>
                        <span className="text-xs text-stone-500 font-medium">active materials</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Inventory Units</span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <PackageCheck size={18} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-serif">
                            {Number(metrics?.totalUnits || 0).toLocaleString()}
                        </span>
                        <span className="text-xs text-stone-500 font-medium">units in stock</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Inbound Orders</span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <ClipboardList size={18} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-serif">
                            {metrics?.activeOrdersCount || 0}
                        </span>
                        <span className="text-xs text-stone-500 font-medium">pending fulfillment</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Wholesale Volume</span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-clay-50 text-clay-700">
                            <TrendingUp size={18} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-serif">
                            ₱{Number(metrics?.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Split Content: Recent Orders & Low Stock Alerts */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Incoming Orders from Workshops */}
                <div className="lg:col-span-2 rounded-2xl border border-stone-200 bg-white shadow-sm p-6">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                        <div>
                            <h2 className="text-base font-bold text-stone-900 font-serif">Recent Workshop Orders</h2>
                            <p className="text-xs text-stone-500">Orders placed by verified artisan studios</p>
                        </div>
                        <Link
                            href={route('supplier.orders.index')}
                            className="inline-flex items-center gap-1 text-xs font-bold text-clay-600 hover:text-clay-700"
                        >
                            View All <ArrowRight size={14} />
                        </Link>
                    </div>

                    {recentOrders.length === 0 ? (
                        <div className="py-12 text-center text-stone-400">
                            <ClipboardList size={36} className="mx-auto mb-2 opacity-40" />
                            <p className="text-sm font-medium">No wholesale orders received yet.</p>
                            <p className="text-xs text-stone-400 mt-1">Listed materials will appear in the B2B Supply Hub for artisans.</p>
                        </div>
                    ) : (
                        <div className="mt-4 divide-y divide-stone-100">
                            {recentOrders.map((order) => (
                                <div key={order.id} className="py-3.5 flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-stone-900">
                                                #{order.order_number}
                                            </span>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-stone-100 text-stone-700">
                                                {order.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-stone-600 truncate mt-0.5">
                                            {order.workshop_name} • {order.item_count} items
                                        </p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <span className="text-sm font-bold text-stone-900 font-serif">
                                            ₱{order.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                        <p className="text-[11px] text-stone-400">{order.created_at}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Stock Replenishment Alerts */}
                <div className="rounded-2xl border border-stone-200 bg-white shadow-sm p-6">
                    <div className="flex items-center gap-2 border-b border-stone-100 pb-4">
                        <AlertTriangle size={18} className="text-amber-600" />
                        <div>
                            <h2 className="text-base font-bold text-stone-900 font-serif">Low Stock Watchlist</h2>
                            <p className="text-xs text-stone-500">Materials below replenishment threshold</p>
                        </div>
                    </div>

                    {lowStockMaterials.length === 0 ? (
                        <div className="py-12 text-center text-stone-400">
                            <PackageCheck size={36} className="mx-auto mb-2 text-emerald-500/50" />
                            <p className="text-sm font-medium text-stone-600">Stock levels healthy</p>
                            <p className="text-xs text-stone-400 mt-1">All wholesale inventory above 10 units.</p>
                        </div>
                    ) : (
                        <div className="mt-4 space-y-3">
                            {lowStockMaterials.map((mat) => (
                                <div key={mat.id} className="rounded-xl border border-amber-200/60 bg-amber-50/40 p-3 flex items-center justify-between">
                                    <div className="min-w-0 pr-2">
                                        <p className="text-xs font-bold text-stone-900 truncate">{mat.name}</p>
                                        <p className="text-[11px] text-stone-500">MOQ: {mat.moq} {mat.supply_unit}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <span className="inline-block px-2 py-0.5 rounded text-xs font-extrabold bg-amber-100 text-amber-900">
                                            {mat.stock} {mat.supply_unit} left
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </SupplierLayout>
    );
}
