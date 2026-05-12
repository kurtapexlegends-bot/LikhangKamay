import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { 
    Clock3, 
    AlertCircle, 
    CheckCircle2, 
    ChevronRight, 
    History,
    ShieldAlert,
    TrendingUp,
    Store,
    MessageCircle,
    Award
} from 'lucide-react';
import { motion } from 'framer-motion';

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

export default function SLA({ metrics, staleQueue }) {
    return (
        <>
            <Head title="SLA Monitoring" />

            <div className="space-y-6">
                {/* Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <SLACard 
                        title="Artisan Approval" 
                        value={metrics.avgArtisanApprovalHours} 
                        unit="Hrs"
                        subtitle="Avg. Time to Approved"
                        icon={Store}
                        compliance={metrics.artisanSLACompliance}
                        color="text-clay-600"
                    />
                    <SLACard 
                        title="Dispute Resolution" 
                        value={metrics.avgDisputeResolutionHours} 
                        unit="Hrs"
                        subtitle="Avg. Time to Resolved"
                        icon={ShieldAlert}
                        compliance={metrics.disputeSLACompliance}
                        color="text-indigo-600"
                    />
                    <SLACard 
                        title="Sponsorship Approval" 
                        value={metrics.avgSponsorshipApprovalHours} 
                        unit="Hrs"
                        subtitle="Avg. Time to Approved"
                        icon={Award}
                        compliance={metrics.sponsorshipSLACompliance}
                        color="text-amber-600"
                    />
                    <SLACard 
                        title="Total Stale Items" 
                        value={metrics.totalStaleItems} 
                        unit="Items"
                        subtitle="Pending > 48 Hours"
                        icon={Clock3}
                        color="text-red-600"
                    />
                </div>

                {/* Stale Queue Section */}
                <div className="bg-white rounded-3xl border border-clay-100 overflow-hidden shadow-sm">
                    <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Stale Action Queue</h3>
                            <p className="text-xs text-gray-500 font-medium">Platform governance exceptions requiring immediate attention</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Updates</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-stone-50/50">
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
                                        <td colSpan="5" className="px-8 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                                                    <CheckCircle2 className="text-emerald-500" size={24} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">SLA Fully Compliant</p>
                                                    <p className="text-xs text-gray-400">All pending applications and disputes are within safe limits.</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    staleQueue.map((item, idx) => (
                                        <tr key={`${item.type}-${item.id}`} className="group hover:bg-stone-50/50 transition-colors">
                                            <td className="px-8 py-5">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                                    item.priority === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {item.priority}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-gray-900">{item.name}</span>
                                                    <span className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">{item.type}</span>
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
                                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-clay-600 hover:text-clay-700 transition-colors"
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
                </div>

                {/* Performance History Section (Mocked for UI/UX) */}
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
                        <div className="mx-auto w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center mb-4">
                            <History className="text-stone-400" size={24} />
                        </div>
                        <h4 className="text-sm font-bold text-gray-900">Historical Benchmarking</h4>
                        <p className="text-xs text-gray-500 mt-2 max-w-xs mx-auto">
                            The platform is currently operating at <strong className="text-gray-900">88%</strong> of its peak efficiency recorded in Q1 2026.
                        </p>
                        <button className="mt-6 text-[11px] font-bold text-clay-600 hover:underline">
                            Export Compliance Audit Log
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

SLA.layout = page => <AdminLayout title="SLA Monitoring">{page}</AdminLayout>;
