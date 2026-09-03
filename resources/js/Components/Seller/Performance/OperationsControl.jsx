import React from 'react';
import { Link } from '@inertiajs/react';
import { Package, ArrowUpRight, Sparkles, TrendingUp } from 'lucide-react';
import SatisfactionBreakdown from './SatisfactionBreakdown';

const pesoFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const formatPeso = (value) => pesoFormatter.format(Number(value || 0));

export default function OperationsControl({ insights, topProducts = [], salesHeatmap = [], stats }) {
    const [hoveredCell, setHoveredCell] = React.useState(null);
    const heatmapCardRef = React.useRef(null);
    const slowMovers = insights?.slow_movers || [];
    const salesVelocity = insights?.sales_velocity || [];

    return (
        <>
            <div className="space-y-6 print:hidden">
                {/* Row 1: Peak Sales Heatmap (2/3) & Customer Ratings (1/3) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
                    {/* Peak Activity Heatmap */}
                    <div ref={heatmapCardRef} className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-2xs border border-stone-200/80 flex flex-col justify-between min-h-[340px] relative">
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
                                    <div className="w-2.5 h-2.5 rounded-sm bg-clay-600" />
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
                                            const colorClass = count === 0 ? 'bg-stone-50 border border-stone-100/30' : 
                                                               count < 2 ? 'bg-clay-100' :
                                                               count < 5 ? 'bg-clay-300' : 'bg-clay-600 shadow-sm';
                                            return (
                                                <div 
                                                    key={hour} 
                                                    className={`h-7 rounded-md ${colorClass} transition-all hover:scale-105 cursor-help flex items-center justify-center`}
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

                        <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50/50 rounded-xl border border-amber-100/50">
                            <Sparkles className="text-amber-600 shrink-0 mt-0.5" size={13} />
                            <p className="text-[10px] text-amber-800 leading-normal font-medium">
                                <strong>Logistics Recommendation:</strong> Schedule products updates, flash inventory drops, or sponsored campaign placements matching the darker peak blocks.
                            </p>
                        </div>

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

                    {/* Customer Ratings */}
                    <div className="lg:col-span-1">
                        <SatisfactionBreakdown stats={stats} compact={true} />
                    </div>
                </div>

                {/* Row 2: Catalog Merchandising & Velocity (Top Products, Sales Velocity, Slow Movers) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
                    {/* Card 1: Top Performing Products */}
                    <div className="bg-white p-5 rounded-2xl shadow-2xs border border-stone-200/80 flex flex-col justify-between min-h-[340px]">
                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
                                <div>
                                    <h3 className="text-base font-bold text-stone-900 leading-none">Top Products</h3>
                                    <p className="text-[11px] text-stone-500 mt-1.5 leading-tight">Best sellers by profit & sales volume</p>
                                </div>
                                <div className="h-8 w-8 rounded-xl bg-clay-50 border border-clay-100 flex items-center justify-center text-clay-700 shrink-0">
                                    <TrendingUp size={15} />
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                {topProducts.length > 0 ? (
                                    topProducts.slice(0, 3).map((item, index) => {
                                        const imageUrl = item.img ? (item.img.startsWith('http') || item.img.startsWith('/storage') ? item.img : `/storage/${item.img}`) : null;
                                        return (
                                            <div key={index} className="flex items-center gap-3 bg-stone-50/60 p-2.5 rounded-xl border border-stone-100/80 hover:bg-white hover:shadow-xs hover:border-stone-200 transition-all duration-200">
                                                <div className="w-9 h-9 rounded-lg overflow-hidden bg-stone-200 border border-white shrink-0">
                                                    {imageUrl ? (
                                                        <img 
                                                            src={imageUrl} 
                                                            alt="" 
                                                            className="w-full h-full object-cover" 
                                                            onError={(e) => { e.target.style.display = 'none'; }} 
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-stone-400 bg-stone-100"><Package size={14} /></div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-bold text-stone-900 truncate text-xs leading-none">{item.name}</p>
                                                        <span className="text-xs font-black text-clay-700">{formatPeso(item.profit)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[10px] text-stone-400 mt-1">
                                                        <span>{item.sales} sold</span>
                                                        <span className="font-medium text-stone-500">{item.margin}% margin</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="py-8 text-center">
                                        <p className="text-xs text-stone-400 italic">No sales recorded yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-3 border-t border-stone-100/80 text-[10px] text-stone-400 font-medium">
                            Ranked by net contribution margin
                        </div>
                    </div>

                    {/* Card 2: Sales Velocity */}
                    <div className="bg-white p-5 rounded-2xl shadow-2xs border border-stone-200/80 flex flex-col justify-between min-h-[340px]">
                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
                                <div>
                                    <h3 className="text-base font-bold text-stone-900 leading-none">Sales Velocity</h3>
                                    <p className="text-[11px] text-stone-500 mt-1.5 leading-tight">Average turnaround days after listing</p>
                                </div>
                                <div className="h-8 w-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                                    <Sparkles size={15} />
                                </div>
                            </div>

                            <div className="space-y-3">
                                {salesVelocity.length > 0 ? (
                                    salesVelocity.slice(0, 4).map((v, i) => (
                                        <div key={i} className="space-y-1.5 bg-stone-50/60 p-2.5 rounded-xl border border-stone-100/80">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-stone-800 truncate max-w-[150px]">{v.name}</span>
                                                <span className={`text-xs font-black ${v.avg_days_to_sell <= 3 ? 'text-emerald-600' : 'text-stone-700'}`}>
                                                    {Math.round(v.avg_days_to_sell)} {Math.round(v.avg_days_to_sell) === 1 ? 'day' : 'days'}
                                                </span>
                                            </div>
                                            <div className="w-full bg-stone-200/70 h-1.5 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all ${v.avg_days_to_sell <= 3 ? 'bg-emerald-500' : 'bg-stone-400'}`} 
                                                    style={{ width: `${Math.min(100, (3 / Math.max(1, v.avg_days_to_sell)) * 100)}%` }} 
                                                />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-8 text-center">
                                        <p className="text-xs text-stone-400 italic">Awaiting recent sales velocity.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-3 border-t border-stone-100/80 text-[10px] text-stone-400 font-medium">
                            Faster turnaround indicates high market demand
                        </div>
                    </div>

                    {/* Card 3: Slow-Moving Items */}
                    <div className="bg-white p-5 rounded-2xl shadow-2xs border border-stone-200/80 flex flex-col justify-between min-h-[340px]">
                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
                                <div>
                                    <h3 className="text-base font-bold text-stone-900 leading-none">Slow Movers</h3>
                                    <p className="text-[11px] text-stone-500 mt-1.5 leading-tight">Items with 0 orders in 30+ days</p>
                                </div>
                                <div className="h-8 w-8 rounded-xl bg-stone-100 border border-stone-200/70 flex items-center justify-center text-stone-600 shrink-0">
                                    <Package size={15} />
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                {slowMovers.length > 0 ? (
                                    slowMovers.slice(0, 3).map((p, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs bg-stone-50/60 p-2.5 rounded-xl border border-stone-100/80 hover:bg-white hover:shadow-xs hover:border-stone-200 transition-all duration-200">
                                            <div className="min-w-0 pr-2">
                                                <p className="font-bold text-stone-900 truncate max-w-[140px] text-xs">{p.name}</p>
                                                <p className="text-[10px] text-stone-400 font-medium mt-0.5">Inactive {Number(p.days_inactive || 0).toFixed(0)} days</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200/60">
                                                    {p.stock} units
                                                </span>
                                                <Link href={route('products.index')} className="p-1 bg-white border border-stone-200/80 rounded-lg text-stone-500 hover:bg-stone-50 hover:text-stone-800 transition-colors shadow-2xs">
                                                    <ArrowUpRight size={11} />
                                                </Link>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-8 text-center">
                                        <p className="text-xs text-stone-400 italic">All catalog items have healthy customer demand!</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-3 border-t border-stone-100/80 text-[10px] text-stone-400 font-medium">
                            Consider bundling or discounting stagnant items
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
