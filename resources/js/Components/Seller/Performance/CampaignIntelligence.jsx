import React, { useState } from 'react';
import { BarChart3, Activity, TrendingUp, DollarSign } from 'lucide-react';
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area } from 'recharts';
import KPICard from '@/Components/KPICard';

const formatPeso = (value) => {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Number(value || 0));
};

export default function CampaignIntelligence({
    sellerSubscription,
    sponsorshipMetrics,
    sponsorshipChartData,
    sponsorshipAnalyticsAvailability,
    animate = true
}) {
    const [sponsorshipFilter, setSponsorshipFilter] = useState('Daily');

    const canViewSponsoredPerformance = !!sellerSubscription?.canRequestSponsorships;
    const sponsorshipIsAvailable = !!sponsorshipAnalyticsAvailability?.is_available;
    const sponsorshipHasActivity = !!sponsorshipAnalyticsAvailability?.has_activity;
    const sponsorshipMessage = sponsorshipAnalyticsAvailability?.message || 'No sponsorship activity yet.';

    const currentSponsorshipChartData = sponsorshipChartData?.[sponsorshipFilter.toLowerCase()] || [];

    if (!canViewSponsoredPerformance) {
        return null; // Don't render anything if standard user can't have sponsorships
    }

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
            <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1 bg-amber-50 rounded-lg border border-amber-100">
                                <Activity size={14} className="text-amber-600" />
                            </div>
                            <h3 className="text-lg font-bold text-stone-900 leading-none">Campaign Intelligence</h3>
                        </div>
                        <p className="text-xs text-stone-500">Real-time tracking for sponsored product placements.</p>
                    </div>

                    {sponsorshipIsAvailable && (
                        <div className="flex bg-stone-100 p-0.5 rounded-lg border border-stone-200/50">
                            {['Daily', 'Monthly'].map((filterName) => (
                                <button
                                    key={filterName}
                                    onClick={() => setSponsorshipFilter(filterName)}
                                    className={`px-3 py-1.2 rounded-md text-[10px] font-bold transition-all ${
                                        sponsorshipFilter === filterName 
                                            ? 'bg-white text-stone-900 shadow-sm border border-stone-200/50' 
                                            : 'text-stone-500 hover:text-stone-700'
                                    }`}
                                >
                                    {filterName}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {!sponsorshipIsAvailable ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 px-5 py-8 flex flex-col items-center text-center">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 border border-amber-100">
                            <BarChart3 className="text-amber-500" size={18} />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Analytics Sync Needed</p>
                        <p className="mt-1.5 text-xs leading-relaxed text-amber-800 max-w-sm">{sponsorshipMessage}</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Grid parameters */}
                        <div className="flex overflow-x-auto pb-2.5 gap-4 flex-nowrap snap-x snap-mandatory lg:grid lg:grid-cols-4 no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 campaign-kpis-container">
                            <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                                <KPICard title="Impressions" value={sponsorshipMetrics?.impressions || 0} icon={BarChart3} bg="bg-stone-50" color="text-clay-600" animate={animate} />
                            </div>
                            <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                                <KPICard title="Total Clicks" value={sponsorshipMetrics?.clicks || 0} icon={Activity} bg="bg-stone-50" color="text-amber-600" animate={animate} />
                            </div>
                            <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                                <KPICard title="CTR" value={`${Number(sponsorshipMetrics?.ctr || 0).toFixed(2)}%`} icon={TrendingUp} bg="bg-emerald-50" color="text-emerald-600" animate={animate} />
                            </div>
                            <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                                <KPICard title="Ad Revenue" value={sponsorshipMetrics?.sponsored_revenue || 0} icon={DollarSign} bg="bg-clay-50" color="text-clay-600" animate={animate} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 campaign-details-container">
                            {/* Chart */}
                            <div className="xl:col-span-2 bg-stone-50/50 rounded-2xl border border-stone-100 p-4 min-h-[250px]">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <span>Growth Performance</span>
                                        <span className="hidden print:inline-block normal-case font-extrabold text-[8px] tracking-wider text-amber-700 bg-amber-50/50 px-1.5 py-0.5 rounded border border-amber-100">
                                            {sponsorshipFilter}
                                        </span>
                                    </p>
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-clay-500" /><span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">Impressions</span></div>
                                        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /><span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">Clicks</span></div>
                                    </div>
                                </div>
                                <div className="h-[200px] w-full">
                                    {sponsorshipHasActivity ? (
                                        <>
                                            {/* Screen Chart */}
                                            <div className="print:hidden h-full w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={currentSponsorshipChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                        <defs>
                                                            <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#c07251" stopOpacity={0.15} />
                                                                <stop offset="95%" stopColor="#c07251" stopOpacity={0} />
                                                            </linearGradient>
                                                            <linearGradient id="colorClk" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#d97706" stopOpacity={0.15} />
                                                                <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 10 }} dy={10} />
                                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 10 }} />
                                                        <Tooltip
                                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                                                            formatter={(value, name) => {
                                                                const labels = { impressions: 'Impressions', clicks: 'Clicks' };
                                                                return [name === 'sponsored_revenue' ? formatPeso(value) : value, labels[name] || name];
                                                            }}
                                                        />
                                                        <Area type="monotone" dataKey="impressions" stroke="#c07251" strokeWidth={2} fillOpacity={1} fill="url(#colorImp)" activeDot={{ r: 4, strokeWidth: 0 }} />
                                                        <Area type="monotone" dataKey="clicks" stroke="#d97706" strokeWidth={2} fillOpacity={1} fill="url(#colorClk)" activeDot={{ r: 4, strokeWidth: 0 }} />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                            {/* Print Chart (Fixed width to bypass ResponsiveContainer collapse) */}
                                            <div className="hidden print:flex print:justify-center w-full h-[190px]">
                                                <AreaChart width={445} height={180} data={currentSponsorshipChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="colorImpPrint" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#c07251" stopOpacity={0.15} />
                                                            <stop offset="95%" stopColor="#c07251" stopOpacity={0} />
                                                        </linearGradient>
                                                        <linearGradient id="colorClkPrint" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#d97706" stopOpacity={0.15} />
                                                            <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 10 }} dy={10} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 10 }} />
                                                    <Area type="monotone" dataKey="impressions" stroke="#c07251" strokeWidth={2} fillOpacity={1} fill="url(#colorImpPrint)" dot={{ r: 3, fill: '#c07251', strokeWidth: 1.5, stroke: '#fff' }} />
                                                    <Area type="monotone" dataKey="clicks" stroke="#d97706" strokeWidth={2} fillOpacity={1} fill="url(#colorClkPrint)" dot={{ r: 3, fill: '#d97706', strokeWidth: 1.5, stroke: '#fff' }} />
                                                </AreaChart>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="h-full flex items-center justify-center border border-dashed border-stone-200 rounded-xl bg-stone-50 py-10">
                                            <p className="text-[10px] text-stone-400 italic">Awaiting active data session history...</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Info */}
                            <div className="bg-stone-50/40 rounded-2xl p-5 border border-stone-150 flex flex-col justify-between">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-stone-900">Impact Summary</h4>
                                        <span className="bg-amber-50 border border-amber-100 px-2 py-0.5 rounded text-[8px] font-black uppercase text-amber-700">Premium Campaign</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/60 p-3 rounded-xl border border-stone-150 hover:shadow-sm transition-all duration-300">
                                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-1">Ad Sales</p>
                                            <p className="text-xl font-black text-stone-950">{Number(sponsorshipMetrics?.sponsored_orders || 0).toLocaleString()}</p>
                                        </div>
                                        <div className="bg-white/60 p-3 rounded-xl border border-stone-150 hover:shadow-sm transition-all duration-300">
                                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-1">LTV Attribution</p>
                                            <p className="text-xl font-black text-clay-700">{formatPeso(sponsorshipMetrics?.sponsored_revenue || 0)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-stone-150 mt-4">
                                    <div className="flex justify-between items-center text-[10px] font-extrabold text-stone-500 uppercase">
                                        <span>Click Conversion CTR</span>
                                        <span className="text-emerald-650 font-black">{Number(sponsorshipMetrics?.ctr || 0).toFixed(2)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
