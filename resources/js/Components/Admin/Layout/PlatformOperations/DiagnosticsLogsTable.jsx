import React, { useState, useEffect, useRef } from 'react';
import { Link, router } from '@inertiajs/react';
import { Clock, Calendar, Shield, Eye } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { getActionIcon, getActionColor, formatActionLabel } from '@/utils/platformOperationsHelpers';
import DiagnosticsFilterToolbar from './DiagnosticsFilterToolbar';
import DiagnosticsLogDetailsModal from './DiagnosticsLogDetailsModal';

export default function DiagnosticsLogsTable({ activities, filters = {}, availableActions = [], admins = [], exportUrl = null }) {
    const [search, setSearch] = useState(filters.search || '');
    const [actionType, setActionType] = useState(filters.action_type || '');
    const [adminId, setAdminId] = useState(filters.admin_id || '');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');

    const [selectedLog, setSelectedLog] = useState(null);
    const isInitialMount = useRef(true);

    // Debounce search query updates
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        const timeoutId = setTimeout(() => {
            router.get(
                route('admin.operations'),
                { search, action_type: actionType, admin_id: adminId, start_date: startDate, end_date: endDate },
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [search]);

    const handleApplyFilters = (newFilters) => {
        router.get(
            route('admin.operations'),
            {
                search,
                action_type: newFilters.action_type,
                admin_id: newFilters.admin_id,
                start_date: newFilters.start_date,
                end_date: newFilters.end_date,
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleResetFilters = () => {
        setActionType('');
        setAdminId('');
        setStartDate('');
        setEndDate('');

        router.get(
            route('admin.operations'),
            { search },
            { preserveState: true, preserveScroll: true }
        );
    };

    return (
        <div className="space-y-4">
            {/* Filter Toolbar */}
            <DiagnosticsFilterToolbar
                search={search}
                setSearch={setSearch}
                actionType={actionType}
                setActionType={setActionType}
                adminId={adminId}
                setAdminId={setAdminId}
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                availableActions={availableActions}
                admins={admins}
                exportUrl={exportUrl}
                onApplyFilters={handleApplyFilters}
                onResetFilters={handleResetFilters}
            />

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
                                            <tr 
                                                key={log.id} 
                                                onClick={() => setSelectedLog(log)}
                                                className="hover:bg-stone-50/70 transition-all group cursor-pointer"
                                                title="Click to view full log details"
                                            >
                                                <td className="px-6 py-5 align-top">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shadow-xs ${colorClasses}`}>
                                                            <ActionIcon size={14} />
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${colorClasses}`}>
                                                            {formatActionLabel(log.action)}
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
                                    <div 
                                        key={log.id} 
                                        onClick={() => setSelectedLog(log)}
                                        className="p-4 space-y-3 hover:bg-stone-50/50 transition cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center border shadow-xs ${colorClasses}`}>
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

            {/* Details Modal */}
            <DiagnosticsLogDetailsModal
                isOpen={!!selectedLog}
                onClose={() => setSelectedLog(null)}
                log={selectedLog}
            />
        </div>
    );
}
