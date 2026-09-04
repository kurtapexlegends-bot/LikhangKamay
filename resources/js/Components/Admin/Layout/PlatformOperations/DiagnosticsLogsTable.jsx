import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, router } from '@inertiajs/react';
import { Search, X, Clock, Calendar, Shield, SlidersHorizontal, ChevronDown, RotateCcw, Filter, User, Download } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import ExportButton from '@/Components/ExportButton';
import { getActionIcon, getActionColor, formatActionLabel } from '@/utils/platformOperationsHelpers';

export default function DiagnosticsLogsTable({ activities, filters = {}, availableActions = [], admins = [], exportUrl = null }) {
    const [search, setSearch] = useState(filters.search || '');
    const [actionType, setActionType] = useState(filters.action_type || '');
    const [adminId, setAdminId] = useState(filters.admin_id || '');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');

    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const popoverRef = useRef(null);
    const isInitialMount = useRef(true);

    // Staged draft filter states
    const [draftActionType, setDraftActionType] = useState(actionType);
    const [draftAdminId, setDraftAdminId] = useState(adminId);
    const [draftStartDate, setDraftStartDate] = useState(startDate);
    const [draftEndDate, setDraftEndDate] = useState(endDate);


    // Handle outside clicks to close desktop popover
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setIsPopoverOpen(false);
            }
        };
        if (isPopoverOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isPopoverOpen]);

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

    const handleOpenFilters = () => {
        setDraftActionType(actionType);
        setDraftAdminId(adminId);
        setDraftStartDate(startDate);
        setDraftEndDate(endDate);
        if (window.innerWidth < 1024) {
            setIsDrawerOpen(true);
        } else {
            setIsPopoverOpen((prev) => !prev);
        }
    };

    const applyDraftFilters = () => {
        setActionType(draftActionType);
        setAdminId(draftAdminId);
        setStartDate(draftStartDate);
        setEndDate(draftEndDate);
        setIsPopoverOpen(false);
        setIsDrawerOpen(false);

        router.get(
            route('admin.operations'),
            {
                search,
                action_type: draftActionType,
                admin_id: draftAdminId,
                start_date: draftStartDate,
                end_date: draftEndDate,
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    const resetFilters = () => {
        setDraftActionType('');
        setDraftAdminId('');
        setDraftStartDate('');
        setDraftEndDate('');
        setActionType('');
        setAdminId('');
        setStartDate('');
        setEndDate('');
        setIsPopoverOpen(false);
        setIsDrawerOpen(false);

        router.get(
            route('admin.operations'),
            { search },
            { preserveState: true, preserveScroll: true }
        );
    };

    const activeFiltersCount = [!!actionType, !!adminId, !!startDate, !!endDate].filter(Boolean).length;
    const draftActiveCount = [!!draftActionType, !!draftAdminId, !!draftStartDate, !!draftEndDate].filter(Boolean).length;

    const filterFieldsGrid = (
        <div className="space-y-4">
            {/* 1. Date Range Section */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                    Date Range
                </label>
                <div className="flex items-center bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-clay-100 focus-within:border-clay-500 transition-all h-[42px]">
                    <label className="flex flex-1 h-full items-center gap-2 px-3 hover:bg-stone-50 transition cursor-pointer min-h-[42px]">
                        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400 shrink-0">From</span>
                        <input
                            type="date"
                            value={draftStartDate}
                            onChange={(e) => setDraftStartDate(e.target.value)}
                            className="flex-1 w-full bg-transparent text-xs font-bold text-stone-700 border-none outline-none focus:ring-0 p-0"
                        />
                    </label>
                    <div className="h-full w-px bg-stone-200 shrink-0"></div>
                    <label className="flex flex-1 h-full items-center gap-2 px-3 hover:bg-stone-50 transition cursor-pointer min-h-[42px]">
                        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400 shrink-0">To</span>
                        <input
                            type="date"
                            value={draftEndDate}
                            onChange={(e) => setDraftEndDate(e.target.value)}
                            className="flex-1 w-full bg-transparent text-xs font-bold text-stone-700 border-none outline-none focus:ring-0 p-0"
                        />
                    </label>
                </div>
            </div>

            {/* 2. Action Type Filter */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                    Action Type
                </label>
                <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                    <select
                        value={draftActionType}
                        onChange={(e) => setDraftActionType(e.target.value)}
                        className="pl-9 pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer appearance-none"
                    >
                        <option value="">All Action Types ({availableActions.length})</option>
                        {availableActions.map((action) => (
                            <option key={action} value={action}>
                                {formatActionLabel(action)}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                </div>
            </div>

            {/* 3. Administrator Filter */}
            {admins.length > 0 && (
                <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                        Administrator
                    </label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                        <select
                            value={draftAdminId}
                            onChange={(e) => setDraftAdminId(e.target.value)}
                            className="pl-9 pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer appearance-none"
                        >
                            <option value="">All Administrators ({admins.length})</option>
                            {admins.map((admin) => (
                                <option key={admin.id} value={admin.id}>
                                    {admin.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Search & Filter bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-clay-100 shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                    <input 
                        type="text" 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by action, description or admin..."
                        className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9F5] border border-stone-200/60 rounded-xl text-xs font-bold text-stone-800 focus:border-clay-500 focus:ring-2 focus:ring-clay-100 placeholder:text-stone-400 min-h-[42px]"
                    />
                </div>
                
                <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
                    {exportUrl && (
                        <ExportButton
                            href={exportUrl}
                            icon={Download}
                            variant="primary"
                            className="h-[42px] min-h-[42px] px-4 rounded-xl shadow-2xs font-bold text-xs"
                        >
                            <span className="hidden sm:inline">Export CSV</span>
                            <span className="sm:hidden">Export</span>
                        </ExportButton>
                    )}

                    {/* Unified Popover Trigger Button */}
                    <div className="relative inline-block text-left" ref={popoverRef}>
                        <button
                            type="button"
                            onClick={handleOpenFilters}
                            className={`inline-flex h-[42px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold transition-all shadow-sm active:scale-95 ${
                                activeFiltersCount > 0
                                    ? 'bg-clay-700 text-white border-clay-800 shadow-clay-200 hover:bg-clay-800'
                                    : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                            }`}
                        >
                            <SlidersHorizontal size={14} strokeWidth={2.2} />
                            <span>Filters</span>
                            {activeFiltersCount > 0 && (
                                <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-black text-white">
                                    {activeFiltersCount}
                                </span>
                            )}
                            <ChevronDown size={14} strokeWidth={2.5} className={`transition-transform duration-200 ${isPopoverOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Desktop Popover Card */}
                        {isPopoverOpen && (
                            <div className="hidden lg:flex flex-col absolute right-0 z-[100] mt-2 w-[400px] max-h-[calc(100vh-180px)] rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
                                <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <Filter size={15} className="text-clay-700" />
                                        <h3 className="text-sm font-bold text-stone-900">Filter Diagnostic Logs</h3>
                                    </div>
                                    {draftActiveCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDraftActionType('');
                                                setDraftAdminId('');
                                                setDraftStartDate('');
                                                setDraftEndDate('');
                                            }}
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-500 hover:text-clay-700 transition"
                                        >
                                            <RotateCcw size={12} />
                                            <span>Reset Selection</span>
                                        </button>
                                    )}
                                </div>

                                <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[50vh] no-scrollbar">
                                    {filterFieldsGrid}
                                </div>

                                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between shrink-0 bg-white">
                                    <button
                                        type="button"
                                        onClick={() => setIsPopoverOpen(false)}
                                        className="rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={applyDraftFilters}
                                        className="rounded-xl bg-clay-700 px-5 py-2 text-xs font-bold text-white shadow-md shadow-clay-200 hover:bg-clay-800 transition active:scale-95"
                                    >
                                        Apply & Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Reset Button */}
                    {(activeFiltersCount > 0 || search) && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch('');
                                resetFilters();
                            }}
                            className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-clay-700 transition px-2 py-2"
                        >
                            <RotateCcw size={13} />
                            <span>Reset</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Active Filter Tag Pills */}
            {activeFiltersCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1 px-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mr-1">
                        Active Filters:
                    </span>
                    {actionType && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 shadow-sm">
                            <span>Action: {actionType.replace(/_/g, ' ')}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setActionType('');
                                    setDraftActionType('');
                                    router.get(
                                        route('admin.operations'),
                                        { search, action_type: '', admin_id: adminId, start_date: startDate, end_date: endDate },
                                        { preserveState: true, preserveScroll: true }
                                    );
                                }}
                                className="rounded-full p-0.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        </span>
                    )}
                    {adminId && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 shadow-sm">
                            <span>Admin: {admins.find((a) => String(a.id) === String(adminId))?.name || 'Selected Admin'}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setAdminId('');
                                    setDraftAdminId('');
                                    router.get(
                                        route('admin.operations'),
                                        { search, action_type: actionType, admin_id: '', start_date: startDate, end_date: endDate },
                                        { preserveState: true, preserveScroll: true }
                                    );
                                }}
                                className="rounded-full p-0.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        </span>
                    )}
                    {startDate && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 shadow-sm">
                            <span>From: {startDate}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setStartDate('');
                                    setDraftStartDate('');
                                    router.get(
                                        route('admin.operations'),
                                        { search, action_type: actionType, admin_id: adminId, start_date: '', end_date: endDate },
                                        { preserveState: true, preserveScroll: true }
                                    );
                                }}
                                className="rounded-full p-0.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        </span>
                    )}
                    {endDate && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 shadow-sm">
                            <span>To: {endDate}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setEndDate('');
                                    setDraftEndDate('');
                                    router.get(
                                        route('admin.operations'),
                                        { search, action_type: actionType, admin_id: adminId, start_date: startDate, end_date: '' },
                                        { preserveState: true, preserveScroll: true }
                                    );
                                }}
                                className="rounded-full p-0.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={resetFilters}
                        className="text-[11px] font-bold text-clay-700 hover:underline ml-1"
                    >
                        Clear All
                    </button>
                </div>
            )}

            {/* Mobile Bottom-Sheet Filter Drawer */}
            <SlideOverDrawer
                show={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                title="Filter Diagnostic Logs"
                position="bottom"
                widthClass="max-w-md"
                footer={
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="flex-1 rounded-xl border border-stone-200 bg-white py-2.5 text-xs font-bold text-stone-700 min-h-[44px]"
                        >
                            Reset All
                        </button>
                        <button
                            type="button"
                            onClick={applyDraftFilters}
                            className="flex-1 rounded-xl bg-clay-700 py-2.5 text-xs font-bold text-white shadow-lg shadow-clay-200 min-h-[44px]"
                        >
                            Apply Filters
                        </button>
                    </div>
                }
            >
                <div className="py-2">
                    {filterFieldsGrid}
                </div>
            </SlideOverDrawer>

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
