import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, router } from '@inertiajs/react';
import { Search, X, Clock, Calendar, Shield } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { getActionIcon, getActionColor } from '@/utils/platformOperationsHelpers';

export default function DiagnosticsLogsTable({ activities, filters = {}, availableActions = [] }) {
    const [search, setSearch] = useState(filters.search || '');
    const [actionType, setActionType] = useState(filters.action_type || '');
    const isInitialMount = useRef(true);

    const debounceRequest = useCallback((query, type) => {
        const timeoutId = setTimeout(() => {
            router.get(
                route('admin.operations'),
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
        router.get(route('admin.operations'), {}, { preserveState: true, preserveScroll: true });
    };

    return (
        <div className="space-y-6">
            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2 rounded-2xl border border-clay-100 shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" size={16} />
                    <input 
                        type="text" 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by action, description or admin..."
                        className="w-full pl-10 pr-4 py-3 bg-[#FAF9F5] border-none rounded-xl text-xs font-medium focus:ring-0 placeholder:text-stone-300 min-h-[44px]"
                    />
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select 
                        value={actionType}
                        onChange={(e) => setActionType(e.target.value)}
                        className="bg-white border border-stone-100 rounded-xl text-[10px] font-black text-gray-600 hover:bg-[#FAF9F5] transition-all uppercase tracking-widest py-3 px-4 focus:ring-clay-500/20 focus:border-clay-500 outline-none min-h-[44px] w-full sm:w-auto"
                    >
                        <option value="">All Action Types</option>
                        {availableActions.map(action => (
                            <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
                        ))}
                    </select>

                    {(search || actionType) && (
                        <button 
                            onClick={clearFilters}
                            className="p-3 bg-rose-50 text-rose-500 rounded-xl border border-rose-100 hover:bg-rose-100 transition-all shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Clear Filters"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Activities Table */}
            <div className="bg-white rounded-3xl border border-clay-100 overflow-hidden shadow-sm">
                <div className="relative">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#FAF9F5] border-b border-stone-100">
                                    <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Event & Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Description</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Administrator</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest text-right">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-50">
                                {activities && activities.data && activities.data.length > 0 ? (
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
                                                    <p className="text-xs sm:text-sm font-bold text-gray-800 leading-snug mb-2">{log.description}</p>
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
                                                        <UserAvatar user={log.user} className="w-8 h-8" />
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
                                                        <div className="flex items-center gap-1.5 text-stone-400 font-bold text-[9px] uppercase tracking-wider">
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
                                        <td colSpan="4" className="px-6 py-12 text-center bg-white">
                                            <WorkspaceEmptyState
                                                icon={Shield}
                                                title="No activity logs found"
                                                description="Governance events will appear here once recorded."
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Log Cards View */}
                    <div className="md:hidden divide-y divide-stone-100">
                        {activities && activities.data && activities.data.length > 0 ? (
                            activities.data.map((log) => {
                                const ActionIcon = getActionIcon(log.action);
                                const colorClasses = getActionColor(log.action);

                                return (
                                    <div key={log.id} className="p-4 space-y-3 hover:bg-stone-50/50 transition">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center border shadow-sm ${colorClasses}`}>
                                                    <ActionIcon size={12} />
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${colorClasses}`}>
                                                    {log.action.split('_')[0]}
                                                </span>
                                            </div>
                                            <div className="text-right text-[9px] text-stone-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                                <Calendar size={10} />
                                                {new Date(log.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                <span className="text-stone-300">|</span>
                                                <Clock size={10} />
                                                {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-xs font-bold text-gray-800 leading-snug">{log.description}</p>
                                            
                                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 pt-1">
                                                    {Object.entries(log.metadata).map(([key, value]) => (
                                                        <div key={key} className="flex items-center gap-1 px-1.5 py-0.5 bg-stone-100 rounded-md border border-stone-200/60">
                                                            <span className="text-[8px] font-black text-stone-400 uppercase tracking-tight">{key.replace(/_/g, ' ')}:</span>
                                                            <span className="text-[8px] font-bold text-stone-600">
                                                                {typeof value === 'boolean' ? (value ? 'YES' : 'NO') : String(value)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between pt-2.5 border-t border-stone-50">
                                            <span className="text-[8px] font-bold text-stone-400 uppercase tracking-wider">Administrator</span>
                                            <div className="flex items-center gap-2">
                                                <UserAvatar user={log.user} className="w-6 h-6 border border-stone-200" />
                                                <div className="text-left">
                                                    <p className="text-[10px] font-black text-gray-900 leading-none">{log.user.name}</p>
                                                    <p className="text-[8px] font-bold text-clay-600 uppercase tracking-widest mt-0.5">{log.user.role.replace('_', ' ')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-6 text-center">
                                <WorkspaceEmptyState
                                    icon={Shield}
                                    title="No activity logs found"
                                    description="Governance events will appear here once recorded."
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Pagination */}
                {activities && activities.last_page > 1 && (
                    <div className="bg-stone-50 px-6 py-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                            Showing {activities.from} to {activities.to} of {activities.total}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                            {activities.links.map((link, i) => (
                                <Link
                                    key={i}
                                    href={link.url || '#'}
                                    preserveScroll
                                    preserveState
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                    className={`
                                        px-3.5 py-2.5 rounded-lg text-[10px] font-black transition-all border uppercase tracking-widest min-h-[44px] flex items-center justify-center
                                        ${link.active 
                                            ? 'bg-clay-600 text-white border-clay-600 shadow-md shadow-clay-600/20' 
                                            : 'bg-white border-stone-100 text-gray-500 hover:text-clay-600'}
                                        ${!link.url ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
                                    `}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
