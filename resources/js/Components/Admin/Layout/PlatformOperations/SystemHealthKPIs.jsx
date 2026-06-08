import React from 'react';
import { Mail, RefreshCw, HardDrive, ShieldAlert, Activity } from 'lucide-react';

export default function SystemHealthKPIs({ queueStatus = {} }) {
    const cards = [
        {
            title: 'Queued Emails',
            value: queueStatus.emails ?? 0,
            icon: Mail,
            bgClass: 'bg-indigo-50 text-indigo-600',
            status: queueStatus.emails > 0 ? 'Processing' : 'Idle',
            statusClass: queueStatus.emails > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700',
            footer: 'Transactional Alerts'
        },
        {
            title: 'Report Generation',
            value: queueStatus.reports ?? 0,
            icon: RefreshCw,
            bgClass: 'bg-emerald-50 text-emerald-600',
            status: queueStatus.reports > 0 ? 'Generating' : 'Idle',
            statusClass: queueStatus.reports > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700',
            footer: 'BI & Exports'
        },
        {
            title: 'Image Processing',
            value: queueStatus.images ?? 0,
            icon: HardDrive,
            bgClass: 'bg-amber-50 text-amber-600',
            status: queueStatus.images > 0 ? 'Optimizing' : 'Idle',
            statusClass: queueStatus.images > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700',
            footer: 'Media Compression'
        },
        {
            title: 'Failed Jobs',
            value: queueStatus.failed_jobs ?? 0,
            icon: ShieldAlert,
            bgClass: 'bg-rose-50 text-rose-600',
            status: queueStatus.failed_jobs > 0 ? 'Attention' : 'Healthy',
            statusClass: queueStatus.failed_jobs > 0 ? 'bg-rose-100 text-rose-700' : 'bg-stone-100 text-stone-500',
            footer: 'Requires Retry'
        },
        {
            title: 'Total Jobs',
            value: queueStatus.total_jobs ?? 0,
            icon: Activity,
            bgClass: 'bg-stone-50 text-stone-600',
            status: 'Total',
            statusClass: 'bg-stone-100 text-stone-600',
            footer: 'Overall Queue Load'
        }
    ];

    return (
        <section>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-black text-stone-400 uppercase tracking-widest">Background Job Intelligence</h2>
                <div className="flex items-center gap-2 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
                    <Activity size={12} className="text-stone-500" />
                    <span className="text-[9px] font-black text-stone-600 uppercase tracking-wider">Real-time Monitor</span>
                </div>
            </div>

            <div className="relative">
                {/* Horizontal scroll fade overlay on mobile */}
                <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-stone-50/90 to-transparent pointer-events-none z-10 lg:hidden" />
                
                <div className="flex overflow-x-auto lg:grid lg:grid-cols-5 gap-4 pb-4 lg:pb-0 scrollbar-hide snap-x snap-mandatory flex-nowrap lg:flex-wrap -mx-4 px-4 sm:-mx-0 sm:px-0">
                    {cards.map((card, idx) => {
                        const Icon = card.icon;
                        return (
                            <div key={idx} className="w-[75vw] sm:w-[45vw] lg:w-auto shrink-0 snap-center bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div className={`p-2 rounded-lg ${card.bgClass}`}>
                                        <Icon size={18} />
                                    </div>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${card.statusClass}`}>
                                        {card.status}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">{card.title}</p>
                                    <p className="text-xl font-black text-stone-900 leading-none">{card.value}</p>
                                </div>
                                <div className="pt-3 border-t border-stone-50">
                                    <p className="text-[10px] text-stone-500 font-medium">{card.footer}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
