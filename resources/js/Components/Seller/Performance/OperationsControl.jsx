import React from 'react';
import { Link } from '@inertiajs/react';
import { Activity, Package, ArrowUpRight, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react';

const pesoFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const formatPeso = (value) => pesoFormatter.format(Number(value || 0));

export default function OperationsControl({ metrics, insights, topProducts = [], salesHeatmap = [] }) {
    const [hoveredCell, setHoveredCell] = React.useState(null);
    const heatmapCardRef = React.useRef(null);
    const lowStockProducts = insights?.low_stock_products || [];
    const slowMovers = insights?.slow_movers || [];
    const salesVelocity = insights?.sales_velocity || [];

    return (
        <>
            <div className="space-y-6 print:hidden">
                {/* Row 1: Peak Sales Heatmap */}
                <div className="grid grid-cols-1 gap-6">

                    {/* Peak Activity Heatmap */}
                    <div ref={heatmapCardRef} className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex flex-col justify-between min-h-[350px] relative">
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4">
                            <div>
                                <h3 className="text-base font-bold text-stone-900 leading-none">Peak Activity Heatmap</h3>
                                <p className="text-[11px] text-stone-500 mt-1.5 leading-tight">When your customers are most likely to buy</p>
                            </div>
                            <div className="flex items-center gap-3 text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                                <span>Quiet</span>
                                <div className="flex gap-0.5">
                                    <div className="w-2.5 h-2.5 rounded-sm bg-stone-50 border border-stone-100" />
                                    <div className="w-2.5 h-2.5 rounded-sm bg-clay-100" />
                                    <div className="w-2.5 h-2.5 rounded-sm bg-clay-300" />
                                    <div className="w-2.5 h-2.5 rounded-sm bg-clay-500" />
                                </div>
                                <span>Peak</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-x-auto pb-2 flex items-center">
                            <div className="min-w-[500px] w-full">
                               <div className="grid grid-cols-8 gap-1">
                                   <div className="col-span-1" />
                                   {['12 AM', '4 AM', '8 AM', '12 PM', '4 PM', '8 PM', '11 PM'].map((h, i) => (
                                       <div key={i} className="text-[9px] font-bold text-stone-400 text-center uppercase">{h}</div>
                                   ))}
                               </div>
                               {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                                   <div key={day} className="grid grid-cols-8 gap-1 mt-1">
                                       <div className="text-[10px] font-bold text-stone-600 flex items-center pr-2">{day}</div>
                                       {[0, 4, 8, 12, 16, 20, 23].map((hour) => {
                                           const match = salesHeatmap.find(h => h.day === day && h.hour === hour);
                                           const count = match ? match.count : 0;
                                           const opacity = count === 0 ? 'bg-stone-50' : 
                                                           count < 2 ? 'bg-clay-100' :
                                                           count < 5 ? 'bg-clay-300' : 'bg-clay-600 shadow-sm';
                                           return (
                                               <div 
                                                   key={hour} 
                                                   className={`h-7 rounded-md ${opacity} transition-all hover:scale-105 cursor-help flex items-center justify-center`}
                                                   onMouseEnter={(e) => {
                                                       const rect = e.currentTarget.getBoundingClientRect();
                                                       if (heatmapCardRef.current) {
                                                           const containerRect = heatmapCardRef.current.getBoundingClientRect();
                                                           setHoveredCell({
                                                               day,
                                                               hour,
                                                               count,
                                                               hourLabel: hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour === 23 ? '11 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`,
                                                               x: rect.left - containerRect.left + rect.width / 2,
                                                               y: rect.top - containerRect.top - 6,
                                                           });
                                                       }
                                                   }}
                                                   onMouseLeave={() => setHoveredCell(null)}
                                               >
                                                   {count > 0 && <span className={`text-[9px] font-bold ${count > 4 ? 'text-white' : 'text-clay-800'}`}>{count}</span>}
                                               </div>
                                           );
                                       })}
                                   </div>
                               ))}
                           </div>
                        </div>
                        <p className="mt-3 text-[9px] text-stone-400 italic">Recommendation: Schedule product updates or campaigns matching dark heatmap blocks.</p>

                        {/* Custom Floating Tooltip */}
                        {hoveredCell && (
                            <div 
                                className="absolute z-30 pointer-events-none drop-shadow-md flex flex-col items-center transition-all duration-75"
                                style={{
                                    left: `${hoveredCell.x}px`,
                                    top: `${hoveredCell.y}px`,
                                    transform: 'translate(-50%, -100%)',
                                }}
                            >
                                <div className="bg-stone-900/95 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl whitespace-nowrap leading-none border border-stone-800">
                                    {hoveredCell.count} {hoveredCell.count === 1 ? 'order' : 'orders'} on {hoveredCell.day} ({hoveredCell.hourLabel})
                                </div>
                                <div className="w-1.5 h-1.5 bg-stone-900 rotate-45 -mt-1 border-r border-b border-stone-800" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Row 2: Inventory Alert Hub (2/3) & Product Performance (1/3) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Inventory Alert Hub */}
                    <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex flex-col justify-between">
                        <div className="pb-3 border-b border-stone-100 mb-4">
                            <h3 className="text-base font-bold text-stone-900 leading-none">Inventory Alert Hub</h3>
                            <p className="text-[11px] text-stone-500 mt-1.5 leading-tight">Critical stock items and slow moving catalog</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                            {/* Low Stock Alerts */}
                            <div className="bg-rose-50/30 p-4 rounded-2xl border border-rose-100/50 flex flex-col">
                                <p className="text-[10px] text-rose-700 mb-3 font-bold uppercase tracking-wider flex justify-between items-center shrink-0">
                                    <span className="flex items-center gap-1.5"><ShieldAlert size={12} /> Critical Low Stock</span>
                                    {lowStockProducts.length > 0 && <span className="bg-rose-600 text-white rounded-full px-2 py-0.5 text-[9px] font-black">{lowStockProducts.length}</span>}
                                </p>
                                <div className="space-y-2.5 overflow-y-auto max-h-[160px] pr-1 flex-1">
                                    {lowStockProducts.length > 0 ? lowStockProducts.map((p, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-stone-100 hover:shadow-sm transition-shadow">
                                            <div className="min-w-0">
                                                <p className="font-bold text-stone-900 truncate max-w-[150px]">{p.name}</p>
                                                <p className="text-[9px] text-stone-400 font-medium">SKU: {p.sku || 'N/A'}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-right">
                                                    <p className="font-black text-rose-600">{p.stock} left</p>
                                                </div>
                                                <Link href={route('products.index')} className="p-1 bg-stone-50 border border-stone-200/50 rounded-lg text-stone-500 hover:bg-stone-100 transition-colors">
                                                    <ArrowUpRight size={11} />
                                                </Link>
                                            </div>
                                        </div>
                                    )) : <p className="text-[10px] text-stone-500 text-center py-8 italic font-medium">All items have healthy stock.</p>}
                                </div>
                            </div>

                            {/* Slow Movers */}
                            <div className="bg-stone-50/50 p-4 rounded-2xl border border-stone-100 flex flex-col">
                                <p className="text-[10px] text-stone-600 mb-3 font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                                    <Package size={12} /> Slow Movers (0 sales in 30 days)
                                </p>
                                <div className="space-y-2.5 overflow-y-auto max-h-[160px] pr-1 flex-1">
                                    {slowMovers.length > 0 ? slowMovers.map((p, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-stone-100 hover:shadow-sm transition-shadow">
                                            <div className="min-w-0">
                                                <p className="font-bold text-stone-900 truncate max-w-[150px]">{p.name}</p>
                                                <p className="text-[9px] text-stone-400 font-medium">Inactive {Number(p.days_inactive || 0).toFixed(2)} days</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-right">
                                                    <p className="font-black text-stone-700">{p.stock} units</p>
                                                </div>
                                                <Link href={route('products.index')} className="p-1 bg-stone-50 border border-stone-200/50 rounded-lg text-stone-500 hover:bg-stone-100 transition-colors">
                                                    <ArrowUpRight size={11} />
                                                </Link>
                                            </div>
                                        </div>
                                    )) : <p className="text-[10px] text-stone-500 text-center py-8 italic font-medium">All products are moving healthy!</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Product Performance & Velocity */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex flex-col justify-between min-h-[300px]">
                        <div className="pb-3 border-b border-stone-50 mb-3">
                            <h3 className="text-base font-bold text-stone-900 leading-none">Velocity & Top Volume</h3>
                            <p className="text-[11px] text-stone-500 mt-1.5 leading-tight">Delivery velocity & top items</p>
                        </div>

                        <div className="flex-1 space-y-4 flex flex-col justify-between">
                            {/* Sales Velocity */}
                            <div className="space-y-2 border-b border-stone-50 pb-3">
                                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                    <Sparkles size={11} /> Avg Days to Sell
                                </p>
                                <div className="space-y-2.5 max-h-[110px] overflow-y-auto pr-1">
                                    {salesVelocity.length > 0 ? salesVelocity.slice(0, 3).map((v, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-stone-700 truncate max-w-[130px]">{v.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-black ${v.avg_days_to_sell <= 3 ? 'text-emerald-600' : 'text-stone-900'}`}>
                                                    {Math.round(v.avg_days_to_sell)}d
                                                </span>
                                                <div className="w-12 h-1 bg-stone-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full ${v.avg_days_to_sell <= 3 ? 'bg-emerald-500' : 'bg-stone-400'}`} 
                                                        style={{ width: `${Math.min(100, (3 / v.avg_days_to_sell) * 100)}%` }} 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )) : <p className="text-[10px] text-stone-400 text-center py-4 italic">Waiting for sales...</p>}
                                </div>
                            </div>

                            {/* Top Products Volume */}
                            <div className="space-y-2">
                                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                    <TrendingUp size={11} /> Top Sales Volume
                                </p>
                                <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                                    {topProducts.length > 0 ? (
                                        topProducts.slice(0, 2).map((item, index) => {
                                            const imageUrl = item.img ? (item.img.startsWith('http') || item.img.startsWith('/storage') ? item.img : `/storage/${item.img}`) : null;
                                            return (
                                                <div key={index} className="flex items-center gap-2.5 bg-stone-50/50 p-2 rounded-xl border border-stone-100 hover:bg-white hover:shadow-sm transition-all duration-300">
                                                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-stone-200 border border-white shrink-0">
                                                        {imageUrl ? (
                                                            <img 
                                                                src={imageUrl} 
                                                                alt="" 
                                                                className="w-full h-full object-cover" 
                                                                onError={(e) => { e.target.style.display = 'none'; }} 
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-stone-400 bg-stone-100"><Package size={12} /></div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1 flex flex-col justify-between">
                                                        <div className="flex items-center justify-between">
                                                            <p className="font-bold text-stone-900 truncate text-[11px] leading-none">{item.name}</p>
                                                            <span className="text-[11px] font-black text-clay-700">{formatPeso(item.profit)}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-[9px] text-stone-400 mt-1">
                                                            <span>{item.sales} sold</span>
                                                            <span>{item.margin}% margin</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="h-full flex items-center justify-center py-2 bg-stone-50 border border-stone-100 rounded-xl">
                                            <p className="text-[10px] text-stone-400 italic">No sales recorded yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print-Only Expanded View */}
            <div className="hidden print:block bg-white p-5 rounded-2xl border border-stone-100 mt-6 page-break-inside-avoid">
                <div className="pb-3 border-b border-stone-100 mb-4">
                    <h3 className="text-base font-bold text-stone-900 leading-none">Operations Control Dashboard</h3>
                    <p className="text-[11px] text-stone-500 mt-1.5 leading-tight">Key logistics, inventory health, and delivery metrics</p>
                </div>
                <div className="grid grid-cols-2 gap-6 operations-print-grid">
                    {/* Stock Health */}
                    <div className="border-r border-stone-100 pr-4">
                        <h4 className="text-[10px] font-black uppercase text-stone-400 mb-3 tracking-wider">Stock Health</h4>
                        <div className="space-y-3 max-h-[140px] overflow-y-auto pr-1">
                            {lowStockProducts.length > 0 ? (
                                <div>
                                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1">Low Stock Alerts</p>
                                    {lowStockProducts.slice(0, 3).map((p, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs mt-1">
                                            <span className="font-bold text-stone-900 truncate max-w-[100px]">{p.name}</span>
                                            <span className="font-black text-rose-600 shrink-0">{p.stock} left</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[10px] text-stone-400 italic">Stock is healthy.</p>
                            )}
                            {slowMovers.length > 0 && (
                                <div className="border-t border-stone-100 pt-2 mt-2">
                                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mb-1">Slow Movers</p>
                                    {slowMovers.slice(0, 2).map((p, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs gap-2 mt-1">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold text-stone-900 truncate">{p.name}</p>
                                                <p className="text-[9px] text-stone-400 font-medium">Inactive {Number(p.days_inactive || 0).toFixed(2)} days</p>
                                            </div>
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
        </>
    );
}
