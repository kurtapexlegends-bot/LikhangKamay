import React from 'react';
import { Link } from '@inertiajs/react';
import { 
    Store, 
    ShieldAlert, 
    Award, 
    Clock3, 
    CheckCircle2, 
    ChevronRight, 
    TrendingUp, 
    History 
} from 'lucide-react';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';

const SLACard = ({ title, value, unit, subtitle, icon: Icon, compliance, color }) => (
    <div className="bg-white rounded-2xl border border-clay-100 p-6 flex flex-col justify-between h-full group hover:shadow-xl hover:shadow-clay-500/5 transition-all duration-300">
        <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
                <Icon className={color} size={24} />
            </div>
            {compliance !== undefined && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    compliance >= 95 ? 'bg-emerald-50 text-emerald-600' : 
                    compliance >= 80 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                }`}>
                    {compliance}% Compliance
                </div>
            )}
        </div>
        
        <div>
            <div className="flex items-baseline gap-1">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">{value}</h2>
                <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">{unit}</span>
            </div>
            <p className="text-xs font-bold text-gray-900 mt-1">{title}</p>
            <p className="text-[10px] text-gray-400 font-medium mt-1 uppercase tracking-widest">{subtitle}</p>
        </div>
    </div>
);

export default function PlatformPerformanceCharts({ slaMetrics = {}, staleQueue = [] }) {
    return (
        <div className="space-y-6">
            {/* SLA Metric cards */}
            <div className="relative">
                <div className="flex overflow-x-auto lg:grid lg:grid-cols-4 gap-6 pb-3 lg:pb-0 no-scrollbar snap-x snap-mandatory flex-nowrap lg:flex-wrap -mx-4 px-4 lg:-mx-0 lg:px-0">
                    <div className="min-w-[240px] lg:min-w-0 snap-start shrink-0 flex-1">
                        <SLACard 
                            title="Artisan Approval" 
                            value={slaMetrics.avgArtisanApprovalHours ?? 0} 
                            unit="Hrs"
                            subtitle="Avg. Time to Approved"
                            icon={Store}
                            compliance={slaMetrics.artisanSLACompliance}
                            color="text-clay-600"
                        />
                    </div>
                    <div className="min-w-[240px] lg:min-w-0 snap-start shrink-0 flex-1">
                        <SLACard 
                            title="Dispute Resolution" 
                            value={slaMetrics.avgDisputeResolutionHours ?? 0} 
                            unit="Hrs"
                            subtitle="Avg. Time to Resolved"
                            icon={ShieldAlert}
                            compliance={slaMetrics.disputeSLACompliance}
                            color="text-indigo-600"
                        />
                    </div>
                    <div className="min-w-[240px] lg:min-w-0 snap-start shrink-0 flex-1">
                        <SLACard 
                            title="Sponsorship Approval" 
                            value={slaMetrics.avgSponsorshipApprovalHours ?? 0} 
                            unit="Hrs"
                            subtitle="Avg. Time to Approved"
                            icon={Award}
                            compliance={slaMetrics.sponsorshipSLACompliance}
                            color="text-amber-600"
                        />
                    </div>
                    <div className="min-w-[240px] lg:min-w-0 snap-start shrink-0 flex-1">
                        <SLACard 
                            title="Total Stale Items" 
                            value={slaMetrics.totalStaleItems ?? 0} 
                            unit="Items"
                            subtitle="Pending > 48 Hours"
                            icon={Clock3}
                            color="text-red-600"
                        />
                    </div>
                </div>
                {/* Right Edge Fade Indicator for Mobile */}
                <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-8 bg-gradient-to-l from-[#FAF9F5] to-transparent lg:hidden" />
            </div>

            {/* Table of Stale Items */}
            <div className="bg-white rounded-3xl border border-clay-100 overflow-hidden shadow-sm">
                <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-gray-900">Stale Action Queue</h3>
                        <p className="text-xs text-gray-500 font-medium">Platform governance exceptions requiring immediate attention</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Updates</span>
                    </div>
                </div>

                <div className="relative">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#FAF9F5]">
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">SLA Status</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Item / Subject</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Shop Context</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Time Overdue</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {staleQueue.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-12 text-center bg-white">
                                            <WorkspaceEmptyState
                                                icon={CheckCircle2}
                                                title="SLA Fully Compliant"
                                                description="All pending applications and disputes are within safe limits."
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    staleQueue.map((item) => (
                                        <tr key={`${item.type}-${item.id}`} className="group hover:bg-stone-50/50 transition-colors">
                                            <td className="px-8 py-5">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                    item.priority === 'Critical' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
                                                }`}>
                                                    {item.priority}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-gray-900">{item.name}</span>
                                                    <span className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">{item.type}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-xs font-medium text-gray-600 italic">
                                                    {item.shop_name !== 'N/A' ? item.shop_name : '—'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2">
                                                    <Clock3 className="text-red-400" size={14} />
                                                    <span className="text-xs font-mono font-bold text-red-600">
                                                        +{item.hours_pending}h Overdue
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <Link 
                                                    href={item.route}
                                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-clay-600 hover:text-clay-700 transition-colors min-h-[44px] px-4 py-2"
                                                >
                                                    Resolve Now <ChevronRight size={14} />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Stacked Card View */}
                    <div className="md:hidden divide-y divide-gray-100">
                        {staleQueue.length === 0 ? (
                            <div className="px-6 py-8 text-center bg-white">
                                <WorkspaceEmptyState
                                    icon={CheckCircle2}
                                    title="SLA Fully Compliant"
                                    description="All pending applications and disputes are within safe limits."
                                />
                            </div>
                        ) : (
                            staleQueue.map((item) => (
                                <div key={`${item.type}-${item.id}`} className="p-5 space-y-4 hover:bg-stone-50/50 transition">
                                    <div className="flex items-start justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-gray-900">{item.name}</span>
                                            <span className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">{item.type}</span>
                                        </div>
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                            item.priority === 'Critical' ? 'bg-red-50 text-red-700 border border-red-200/50' : 'bg-amber-50 text-amber-700 border border-amber-200/50'
                                        }`}>
                                            {item.priority}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-xs font-medium text-gray-600 bg-stone-50 p-3 rounded-xl border border-stone-100/50">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[8px] font-bold text-stone-400 uppercase tracking-wider">Shop Context</span>
                                            <span className="font-bold text-stone-700">{item.shop_name !== 'N/A' ? item.shop_name : 'No Shop'}</span>
                                        </div>
                                        <div className="flex flex-col gap-0.5 items-end">
                                            <span className="text-[8px] font-bold text-stone-400 uppercase tracking-wider">Time Overdue</span>
                                            <div className="flex items-center gap-1.5">
                                                <Clock3 className="text-red-500" size={12} />
                                                <span className="font-mono font-bold text-red-600">+{item.hours_pending}h</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Link
                                        href={item.route}
                                        className="w-full flex items-center justify-center gap-1 bg-clay-600 hover:bg-clay-700 text-white rounded-xl py-2.5 font-bold text-xs shadow-sm transition-all active:scale-95 min-h-[44px]"
                                    >
                                        Resolve Now <ChevronRight size={14} />
                                    </Link>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Custom Charts & History */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl border border-clay-100 p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h4 className="text-sm font-bold text-gray-900">SLA Trend Analysis</h4>
                            <p className="text-[10px] text-gray-400 font-medium">Last 7 days performance volatility</p>
                        </div>
                        <TrendingUp className="text-emerald-500" size={18} />
                    </div>
                    <div className="h-32 flex items-end gap-2 pb-2">
                        {[40, 65, 45, 90, 85, 30, 45].map((height, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                <div 
                                    className={`w-full rounded-t-lg ${i === 6 ? 'bg-clay-500' : 'bg-clay-100'}`} 
                                    style={{ height: `${height}%` }} 
                                />
                                <span className="text-[9px] font-bold text-gray-400 uppercase">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-clay-100 p-8 flex flex-col justify-center text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center mb-4 border border-stone-100">
                        <History className="text-stone-400" size={24} />
                    </div>
                    <h4 className="text-sm font-bold text-gray-900">Historical Benchmarking</h4>
                    <p className="text-xs text-gray-500 mt-2 max-w-xs mx-auto">
                        The platform is currently operating at <strong className="text-gray-900">88%</strong> of its peak efficiency recorded in Q1 2026.
                    </p>
                    <button className="mt-6 text-[11px] font-bold text-clay-600 hover:underline min-h-[44px] px-4 py-2 flex items-center justify-center mx-auto">
                        Export Compliance Audit Log
                    </button>
                </div>
            </div>
        </div>
    );
}
