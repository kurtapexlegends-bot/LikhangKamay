import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { Activity, Package, ArrowUpRight, ShieldAlert, Sparkles } from 'lucide-react';

export default function OperationsControl({ metrics, insights }) {
    const [activeTab, setActiveTab] = useState('fulfillment');

    const lowStockProducts = insights?.low_stock_products || [];
    const slowMovers = insights?.slow_movers || [];
    const salesVelocity = insights?.sales_velocity || [];
    const latency = metrics?.fulfillment_latency || {
        avg_acceptance_hours: 0,
        avg_fulfillment_hours: 0,
        avg_delivery_hours: 0
    };

    const tabs = [
        { id: 'fulfillment', label: 'Fulfillment', icon: Activity },
        { id: 'stock', label: 'Stock Health', icon: Package, badge: lowStockProducts.length > 0 ? lowStockProducts.length : null },
        { id: 'velocity', label: 'Sales Velocity', icon: Sparkles }
    ];

    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex flex-col h-full min-h-[350px]">
            {/* Header with Navigation */}
            <div className="flex flex-col gap-3 pb-3 border-b border-stone-100 mb-4">
                <div>
                    <h3 className="text-base font-bold text-stone-900 leading-none">Operations Control</h3>
                    <p className="text-[11px] text-stone-500 mt-1.5 leading-tight">Key workspace logistics & health indicators</p>
                </div>
                <div className="grid grid-cols-3 bg-stone-100 p-1 rounded-xl border border-stone-200/50 w-full text-center print:hidden">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-extrabold transition-all relative ${
                                    isActive 
                                        ? 'bg-white text-clay-700 shadow-sm border border-stone-200/10' 
                                        : 'text-stone-500 hover:text-stone-700'
                                    }`}
                            >
                                <Icon size={11} className="shrink-0" />
                                <span className="truncate">{tab.label}</span>
                                {tab.badge && (
                                    <span className="bg-rose-500 text-white rounded-full px-1 text-[8px] font-black min-w-[12px] h-3 flex items-center justify-center">
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab content area */}
            <div className="flex-1 flex flex-col justify-between print:hidden">
                {activeTab === 'fulfillment' && (
                    <div className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-stone-600">Acceptance Latency</span>
                                <span className="font-black text-clay-700">{Number(latency.avg_acceptance_hours).toFixed(1)}h</span>
                            </div>
                            <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-clay-500 rounded-full transition-all duration-500" 
                                    style={{ width: `${Math.min(100, (Number(latency.avg_acceptance_hours) / 24) * 100)}%` }} 
                                />
                            </div>
                            <span className="text-[9px] text-stone-400 font-medium uppercase tracking-wider">Time to accept new orders</span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-stone-600">Fulfillment Latency</span>
                                <span className="font-black text-emerald-600">{Number(latency.avg_fulfillment_hours).toFixed(1)}h</span>
                            </div>
                            <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                                    style={{ width: `${Math.min(100, (Number(latency.avg_fulfillment_hours) / 48) * 100)}%` }} 
                                />
                            </div>
                            <span className="text-[9px] text-stone-400 font-medium uppercase tracking-wider">Time to ship accepted orders</span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-stone-600">Transit/Delivery Latency</span>
                                <span className="font-black text-amber-600">{Number(latency.avg_delivery_hours).toFixed(1)}h</span>
                            </div>
                            <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                                    style={{ width: `${Math.min(100, (Number(latency.avg_delivery_hours) / 72) * 100)}%` }} 
                                />
                            </div>
                            <span className="text-[9px] text-stone-400 font-medium uppercase tracking-wider">Time in transit to customer</span>
                        </div>
                    </div>
                )}

                {activeTab === 'stock' && (
                    <div className="space-y-4">
                        {/* Low Stock Alerts */}
                        <div className="bg-rose-50/30 p-3 rounded-xl border border-rose-100/50">
                            <p className="text-[10px] text-rose-700 mb-2.5 font-black uppercase tracking-wider flex justify-between">
                                <span className="flex items-center gap-1.5"><ShieldAlert size={11} /> Critical Low Stock</span>
                                {lowStockProducts.length > 0 && <span className="bg-rose-600 text-white rounded-full px-1.5 text-[8px] font-black">{lowStockProducts.length}</span>}
                            </p>
                            <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                                {lowStockProducts.length > 0 ? lowStockProducts.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs bg-white/70 p-2 rounded-lg border border-rose-100/20 hover:border-rose-200 hover:shadow-sm transition-all duration-300">
                                        <div className="min-w-0">
                                            <p className="font-extrabold text-stone-900 truncate max-w-[120px]">{p.name}</p>
                                            <p className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">SKU: {p.sku || 'N/A'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-right">
                                                <p className="font-black text-rose-600">{p.stock} left</p>
                                            </div>
                                            <Link href={route('products.index')} className="p-1 bg-white border border-stone-200/50 rounded-lg text-stone-500 hover:bg-stone-50 transition-colors">
                                                <ArrowUpRight size={10} />
                                            </Link>
                                        </div>
                                    </div>
                                )) : <p className="text-[10px] text-stone-400 text-center py-3 italic font-medium">All items have healthy stock.</p>}
                            </div>
                        </div>

                        {/* Slow Movers */}
                        <div className="bg-stone-50/50 p-3 rounded-xl border border-stone-150">
                            <p className="text-[10px] text-stone-600 mb-2.5 font-bold uppercase tracking-wider">Slow Movers (0 sales in 30 days)</p>
                            <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                                {slowMovers.length > 0 ? slowMovers.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs bg-white/60 p-2 rounded-lg border border-stone-200/20 hover:border-stone-300 hover:shadow-sm transition-all duration-300">
                                        <div className="min-w-0">
                                            <p className="font-extrabold text-stone-900 truncate max-w-[120px]">{p.name}</p>
                                            <p className="text-[9px] text-stone-400 font-medium">Inactive {p.days_inactive} days</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-right">
                                                <p className="font-black text-stone-700">{p.stock} units</p>
                                            </div>
                                            <Link href={route('products.index')} className="p-1 bg-white border border-stone-200/50 rounded-lg text-stone-500 hover:bg-stone-50 transition-colors">
                                                <ArrowUpRight size={10} />
                                            </Link>
                                        </div>
                                    </div>
                                )) : <p className="text-[10px] text-stone-400 text-center py-3 italic font-medium">All products are moving healthy!</p>}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'velocity' && (
                    <div className="space-y-3 flex-1 flex flex-col justify-center">
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
                        )) : <p className="text-[10px] text-stone-400 text-center py-6 italic">Waiting for more sales data...</p>}
                    </div>
                )}
            </div>

            {/* Print-Only Expanded View */}
            <div className="hidden print:grid print:grid-cols-3 print:gap-6 print:flex-1 operations-print-grid">
                {/* Fulfillment */}
                <div className="border-r border-stone-100 pr-4">
                    <h4 className="text-[10px] font-black uppercase text-stone-400 mb-3 tracking-wider">Fulfillment Latency</h4>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-stone-600">Acceptance Latency</span>
                                <span className="font-black text-clay-700">{Number(latency.avg_acceptance_hours).toFixed(1)}h</span>
                            </div>
                            <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full bg-clay-500 rounded-full" style={{ width: `${Math.min(100, (Number(latency.avg_acceptance_hours) / 24) * 100)}%` }} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-stone-600">Fulfillment Latency</span>
                                <span className="font-black text-emerald-600">{Number(latency.avg_fulfillment_hours).toFixed(1)}h</span>
                            </div>
                            <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (Number(latency.avg_fulfillment_hours) / 48) * 100)}%` }} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-stone-600">Transit/Delivery Latency</span>
                                <span className="font-black text-amber-600">{Number(latency.avg_delivery_hours).toFixed(1)}h</span>
                            </div>
                            <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (Number(latency.avg_delivery_hours) / 72) * 100)}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stock Health */}
                <div className="border-r border-stone-100 px-4">
                    <h4 className="text-[10px] font-black uppercase text-stone-400 mb-3 tracking-wider">Stock Health</h4>
                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                        {lowStockProducts.length > 0 ? (
                            lowStockProducts.slice(0, 3).map((p, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-stone-900 truncate max-w-[100px]">{p.name}</span>
                                    <span className="font-black text-rose-600 shrink-0">{p.stock} left</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-[10px] text-stone-400 italic">Stock is healthy.</p>
                        )}
                        {slowMovers.length > 0 && (
                            <div className="border-t border-stone-100 pt-2 mt-2">
                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1">Slow Movers</p>
                                {slowMovers.slice(0, 2).map((p, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-stone-900 truncate max-w-[100px]">{p.name}</span>
                                        <span className="font-bold text-stone-500 shrink-0">{p.stock} units</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sales Velocity */}
                <div className="pl-4">
                    <h4 className="text-[10px] font-black uppercase text-stone-400 mb-3 tracking-wider">Sales Velocity</h4>
                    <div className="space-y-3">
                        {salesVelocity.length > 0 ? (
                            salesVelocity.slice(0, 3).map((v, i) => (
                                <div key={i} className="flex flex-col gap-1.5">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-medium text-stone-600 truncate max-w-[95px]">{v.name}</span>
                                        <span className="font-black text-stone-900">{Math.round(v.avg_days_to_sell)}d</span>
                                    </div>
                                    <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                                        <div className="h-full bg-stone-400 rounded-full" style={{ width: `${Math.min(100, (3 / v.avg_days_to_sell) * 100)}%` }} />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-[10px] text-stone-400 italic">No activity yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
