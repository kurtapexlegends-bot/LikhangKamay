import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { 
    Clock, 
    User as UserIcon, 
    Shield, 
    ChevronLeft, 
    Calendar,
    Search,
    Filter,
    Activity,
    Settings,
    ShieldAlert,
    Palette,
    Globe,
    CreditCard,
    X
} from 'lucide-react';

export default function ActivityLog({ auth, activities, filters, availableActions }) {
    const [search, setSearch] = useState(filters.search || '');
    const [actionType, setActionType] = useState(filters.action_type || '');
    const isInitialMount = useRef(true);

    // Simple custom debounce implementation to avoid lodash dependency
    const debounceRequest = useCallback((query, type) => {
        const timeoutId = setTimeout(() => {
            router.get(
                route('admin.activity.index'),
                { search: query, action_type: type },
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 300);
        return () => clearTimeout(timeoutId);
    }, []);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const cleanup = debounceRequest(search, actionType);
        return cleanup;
    }, [search, actionType, debounceRequest]);

    const clearFilters = () => {
        setSearch('');
        setActionType('');
        router.get(route('admin.activity.index'), {}, { preserveState: true, preserveScroll: true });
    };

    const getActionIcon = (action) => {
        if (action.includes('branding') || action.includes('color')) return Palette;
        if (action.includes('setting') || action.includes('config')) return Settings;
        if (action.includes('maintenance')) return ShieldAlert;
        if (action.includes('cache')) return Activity;
        if (action.includes('seo')) return Globe;
        if (action.includes('payment') || action.includes('gateway')) return CreditCard;
        return Shield;
    };

    const getActionColor = (action) => {
        if (action.includes('purged') || action.includes('deleted')) return 'text-amber-600 bg-amber-50 border-amber-100';
        if (action.includes('updated') || action.includes('changed')) return 'text-clay-600 bg-clay-50 border-clay-100';
        if (action.includes('enabled')) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
        if (action.includes('disabled')) return 'text-rose-600 bg-rose-50 border-rose-100';
        return 'text-stone-600 bg-stone-50 border-stone-100';
    };

    return (
        <>
            <Head title="Administrative Activity Log" />

            <div className="max-w-6xl mx-auto space-y-6 animate-page-enter">
                {/* Compact Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-2xl border border-clay-100 p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <Link 
                            href={route('admin.settings.index')}
                            className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-stone-400 hover:text-clay-600 hover:bg-clay-50 transition-all border border-stone-100 shadow-sm"
                        >
                            <ChevronLeft size={20} />
                        </Link>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Administrative Logs</h2>
                            <p className="text-xs text-gray-500 font-medium italic">Maintain a detailed audit trail of administrative actions and platform configuration changes.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 bg-clay-50 rounded-lg border border-clay-100">
                        <Activity size={14} className="text-clay-600" />
                        <span className="text-[10px] font-black text-clay-700 uppercase tracking-widest">{activities.total} Total Events</span>
                    </div>
                </div>

                {/* Dense Action Bar */}
                <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2 rounded-2xl border border-clay-100 shadow-sm">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" size={16} />
                        <input 
                            type="text" 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by action, description or admin..."
                            className="w-full pl-10 pr-4 py-2 bg-stone-50/50 border-none rounded-xl text-xs font-medium focus:ring-0 placeholder:text-stone-300"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <select 
                            value={actionType}
                            onChange={(e) => setActionType(e.target.value)}
                            className="bg-white border border-stone-100 rounded-xl text-[10px] font-black text-gray-600 hover:bg-stone-50 transition-all uppercase tracking-widest py-2 px-4 focus:ring-clay-500/20 focus:border-clay-500"
                        >
                            <option value="">All Action Types</option>
                            {availableActions.map(action => (
                                <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
                            ))}
                        </select>

                        {(search || actionType) && (
                            <button 
                                onClick={clearFilters}
                                className="p-2 bg-rose-50 text-rose-500 rounded-xl border border-rose-100 hover:bg-rose-100 transition-all shrink-0"
                                title="Clear Filters"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Compact Activity List */}
                <div className="bg-white rounded-3xl border border-clay-100 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-stone-50 border-b border-stone-100">
                                    <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Event & Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Description</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Administrator</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest text-right">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-50">
                                {activities.data.length > 0 ? (
                                    activities.data.map((log) => {
                                        const ActionIcon = getActionIcon(log.action);
                                        const colorClasses = getActionColor(log.action);

                                        return (
                                            <tr key={log.id} className="hover:bg-stone-50/50 transition-all group">
                                                <td className="px-6 py-5 align-top">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm ${colorClasses}`}>
                                                            <ActionIcon size={14} />
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${colorClasses}`}>
                                                            {log.action.split('_')[0]}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 align-top max-w-md">
                                                    <p className="text-sm font-bold text-gray-800 leading-snug mb-2">{log.description}</p>
                                                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {Object.entries(log.metadata).map(([key, value]) => (
                                                                <div key={key} className="flex items-center gap-1.5 px-2 py-0.5 bg-stone-100 rounded-md border border-stone-200">
                                                                    <span className="text-[8px] font-black text-stone-400 uppercase tracking-tighter">{key.replace(/_/g, ' ')}:</span>
                                                                    <span className="text-[9px] font-bold text-stone-600">
                                                                        {typeof value === 'boolean' ? (value ? 'YES' : 'NO') : String(value)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5 align-top">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-clay-50 border border-clay-100 overflow-hidden flex-shrink-0">
                                                            {log.user.avatar ? (
                                                                <img src={log.user.avatar} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-clay-300">
                                                                    <UserIcon size={14} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-gray-900 leading-none">{log.user.name}</p>
                                                            <p className="text-[9px] font-bold text-clay-600 uppercase tracking-widest mt-1">{log.user.role.replace('_', ' ')}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 align-top text-right">
                                                    <div className="inline-flex flex-col items-end gap-1">
                                                        <div className="flex items-center gap-1.5 text-gray-900 font-bold text-xs leading-none">
                                                            <Clock size={10} className="text-stone-400" />
                                                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-stone-400 font-bold text-[10px] uppercase tracking-tighter">
                                                            <Calendar size={10} />
                                                            {new Date(log.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-20 text-center">
                                            <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-200">
                                                <Shield size={32} />
                                            </div>
                                            <h3 className="text-base font-bold text-gray-900">No activity logs found</h3>
                                            <p className="text-xs text-gray-500 italic mt-1 text-stone-400">Governance events will appear here once recorded.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Compact Pagination */}
                    {activities.last_page > 1 && (
                        <div className="bg-stone-50 px-6 py-4 border-t border-stone-100 flex items-center justify-between">
                            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                                Showing {activities.from} to {activities.to} of {activities.total}
                            </span>
                            <div className="flex items-center gap-2">
                                {activities.links.map((link, i) => (
                                    <Link
                                        key={i}
                                        href={link.url || '#'}
                                        preserveScroll
                                        preserveState
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`
                                            px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border uppercase tracking-widest
                                            ${link.active 
                                                ? 'bg-clay-600 text-white border-clay-600 shadow-md shadow-clay-600/20' 
                                                : 'bg-white border-stone-100 text-gray-500 hover:text-clay-600'}
                                            ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}
                                        `}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

ActivityLog.layout = page => <AdminLayout title="Activity Logs">{page}</AdminLayout>;
