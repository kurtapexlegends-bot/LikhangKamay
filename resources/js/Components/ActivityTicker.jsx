import React from 'react';
import { UserPlus, Package, Store, AlertTriangle, ShieldAlert, CheckCircle, CreditCard, Box, Clock } from 'lucide-react';
import { formatChatRelative } from '@/lib/chatTime';

export default function ActivityTicker({ activities }) {
    const getActionDetails = (action) => {
        switch(action) {
            case 'artisan_registered': return { color: 'bg-clay-100 text-clay-600', icon: Store };
            case 'buyer_registered': return { color: 'bg-emerald-100 text-emerald-600', icon: UserPlus };
            case 'product_created': return { color: 'bg-sky-100 text-sky-600', icon: Package };
            case 'order_placed': return { color: 'bg-amber-100 text-amber-600', icon: Box };
            case 'order_disputed': return { color: 'bg-red-100 text-red-600', icon: AlertTriangle };
            case 'content_flagged': return { color: 'bg-purple-100 text-purple-600', icon: ShieldAlert };
            case 'payout_processed': return { color: 'bg-green-100 text-green-600', icon: CreditCard };
            case 'app_approved': return { color: 'bg-teal-100 text-teal-600', icon: CheckCircle };
            default: return { color: 'bg-stone-100 text-stone-500', icon: CheckCircle };
        }
    };

    if (!activities || activities.length === 0) {
        return (
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center h-full">
                <div className="w-12 h-12 bg-stone-50 rounded-full flex items-center justify-center mb-3">
                    <Clock size={20} className="text-stone-300" />
                </div>
                <h3 className="text-sm font-bold text-stone-900">No Recent Activity</h3>
                <p className="text-xs text-stone-500 mt-1 max-w-[200px]">Platform events will appear here as users interact with the marketplace.</p>
            </div>
        );
    }

    const now = Date.now();

    return (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm h-[500px] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/50 shrink-0">
                <h3 className="font-bold text-stone-900 flex items-center gap-2 text-sm tracking-tight">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
                    Live Platform Activity
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-stone-200 scrollbar-track-transparent">
                <div className="relative border-l-2 border-stone-100 ml-4 space-y-6 pb-4">
                    {activities.map((activity, index) => {
                        const { color, icon: Icon } = getActionDetails(activity.action);
                        return (
                            <div key={activity.id} className="relative pl-6 animate-in slide-in-from-right-4 fade-in duration-500" style={{ animationDelay: `${index * 50}ms` }}>
                                <div className={`absolute -left-3.5 top-0 w-7 h-7 rounded-full flex items-center justify-center shadow-sm border-2 border-white ${color}`}>
                                    <Icon size={12} />
                                </div>
                                <div>
                                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                                        <p className="text-xs font-bold text-stone-900">
                                            {activity.user ? (activity.user.shop_name || activity.user.name) : 'System'}
                                        </p>
                                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest shrink-0">
                                            {formatChatRelative(activity.created_at, now, { compact: true })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-stone-600 leading-relaxed">{activity.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}