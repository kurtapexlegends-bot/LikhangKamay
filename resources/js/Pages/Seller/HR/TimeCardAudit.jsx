import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import SellerHeader from '@/Layouts/SellerHeader';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import { useToast } from '@/Components/ToastContext';
import UserAvatar from '@/Components/UserAvatar';
import Modal from '@/Components/Modal';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';
import {
    ArrowLeft, Clock, Calendar, MapPin, CheckCircle2, AlertCircle, Ban, ShieldAlert,
    Check, Search, Eye, X, ChevronRight, SlidersHorizontal, RotateCcw, TrendingUp,
    AlertTriangle, Sparkles, Building2, UserCheck, ShieldCheck
} from 'lucide-react';

export default function TimeCardAudit({ auth, employee, summary, selectedMonth, canEdit }) {
    const { openSidebar } = useSellerWorkspaceShell();
    const { addToast } = useToast();

    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [month, setMonth] = useState(selectedMonth || new Date().toISOString().slice(0, 7));
    const [selectedPhotoData, setSelectedPhotoData] = useState(null);
    const [rejectingSessionId, setRejectingSessionId] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [submittingActionId, setSubmittingActionId] = useState(null);

    // Advanced Filter States (Orthogonal to Quick Status Tabs)
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [anomalyFilter, setAnomalyFilter] = useState('all');
    const [workdayFilter, setWorkdayFilter] = useState('all');
    const [photoFilter, setPhotoFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('date_desc');

    // Draft filter state for popover/drawer
    const [draftAnomaly, setDraftAnomaly] = useState('all');
    const [draftWorkday, setDraftWorkday] = useState('all');
    const [draftPhoto, setDraftPhoto] = useState('all');
    const [draftSort, setDraftSort] = useState('date_desc');

    const popoverRef = useRef(null);

    // Click outside listener for desktop popover
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                setIsPopoverOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMonthChange = (newMonth) => {
        setMonth(newMonth);
        router.get(
            route('hr.employees.time-card', employee.id),
            { month: newMonth },
            { preserveState: true, preserveScroll: true }
        );
    };

    const refreshLogs = () => {
        router.get(
            route('hr.employees.time-card', employee.id),
            { month },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleApproveSession = (sessionId) => {
        setSubmittingActionId(sessionId);
        window.axios
            .post(route('hr.attendance-sessions.approve', { session: sessionId }))
            .then(() => {
                addToast('Attendance shift approved.', 'success');
                refreshLogs();
            })
            .catch((err) => {
                addToast(err.response?.data?.message || 'Failed to approve shift.', 'error');
            })
            .finally(() => setSubmittingActionId(null));
    };

    const handleRejectSession = () => {
        if (!rejectingSessionId) return;
        setSubmittingActionId(rejectingSessionId);
        window.axios
            .post(route('hr.attendance-sessions.reject', { session: rejectingSessionId }), {
                reason: rejectionReason,
            })
            .then(() => {
                addToast('Shift rejected and excluded from payroll calculation.', 'info');
                setRejectingSessionId(null);
                setRejectionReason('');
                refreshLogs();
            })
            .catch((err) => {
                addToast(err.response?.data?.message || 'Failed to reject shift.', 'error');
            })
            .finally(() => setSubmittingActionId(null));
    };

    const applyDraftFilters = () => {
        setAnomalyFilter(draftAnomaly);
        setWorkdayFilter(draftWorkday);
        setPhotoFilter(draftPhoto);
        setSortOrder(draftSort);
        setIsPopoverOpen(false);
        setIsDrawerOpen(false);
    };

    const resetFilters = () => {
        setActiveTab('all');
        setSearchQuery('');
        setAnomalyFilter('all');
        setWorkdayFilter('all');
        setPhotoFilter('all');
        setSortOrder('date_desc');
        setDraftAnomaly('all');
        setDraftWorkday('all');
        setDraftPhoto('all');
        setDraftSort('date_desc');
        setIsPopoverOpen(false);
        setIsDrawerOpen(false);
    };

    const rawSessions = summary?.sessions || [];

    // Filter and Sort sessions
    const filteredSessions = useMemo(() => {
        return rawSessions
            .filter((session) => {
                // 1. Status tab filter
                const isOffSite = session.distance_meters !== null && !session.is_within_geofence;
                const isPending = session.approval_status === 'pending' || session.is_flagged;
                const isApproved = session.approval_status === 'approved' && !session.is_flagged;
                const isRejected = session.approval_status === 'rejected';

                if (activeTab === 'pending' && (!isPending || isRejected)) return false;
                if (activeTab === 'offsite' && !isOffSite) return false;
                if (activeTab === 'approved' && !isApproved) return false;
                if (activeTab === 'rejected' && !isRejected) return false;

                // 2. Anomaly & duration filter
                const isOvertime = (session.worked_minutes || 0) > 480;
                const isUndertime = session.is_early_departure || session.is_late || (session.undertime_minutes || 0) > 0;
                const isAutoPaused = session.close_mode === 'paused';

                if (anomalyFilter === 'overtime' && !isOvertime) return false;
                if (anomalyFilter === 'undertime' && !isUndertime) return false;
                if (anomalyFilter === 'autopaused' && !isAutoPaused) return false;

                // 3. Workday type filter (Mon-Fri vs Sat-Sun)
                if (workdayFilter !== 'all' && session.date) {
                    const d = new Date(session.date);
                    const day = d.getDay(); // 0 = Sun, 6 = Sat
                    const isWeekend = day === 0 || day === 6;
                    if (workdayFilter === 'weekdays' && isWeekend) return false;
                    if (workdayFilter === 'weekends' && !isWeekend) return false;
                }

                // 4. Photo verification filter
                if (photoFilter === 'with_photo' && !session.photo_url) return false;
                if (photoFilter === 'without_photo' && !!session.photo_url) return false;

                // 5. Search query match
                if (searchQuery.trim()) {
                    const query = searchQuery.toLowerCase();
                    const dateMatch = session.date?.toLowerCase().includes(query);
                    const flagMatch = session.flag_reason?.toLowerCase().includes(query);
                    const hoursMatch = String(session.worked_hours_label || '').toLowerCase().includes(query);
                    return dateMatch || flagMatch || hoursMatch;
                }

                return true;
            })
            .sort((a, b) => {
                const timeA = a.clock_in_at ? new Date(a.clock_in_at).getTime() : (a.date ? new Date(a.date).getTime() : 0);
                const timeB = b.clock_in_at ? new Date(b.clock_in_at).getTime() : (b.date ? new Date(b.date).getTime() : 0);
                const durA = a.worked_minutes || 0;
                const durB = b.worked_minutes || 0;

                if (sortOrder === 'date_asc') return timeA - timeB;
                if (sortOrder === 'duration_desc') return durB - durA;
                if (sortOrder === 'duration_asc') return durA - durB;
                return timeB - timeA; // default date_desc
            });
    }, [rawSessions, activeTab, anomalyFilter, workdayFilter, photoFilter, sortOrder, searchQuery]);

    const pendingCount = rawSessions.filter((s) => (s.approval_status === 'pending' || s.is_flagged) && s.approval_status !== 'rejected').length;
    const offSiteCount = rawSessions.filter((s) => s.distance_meters !== null && !s.is_within_geofence).length;

    // Advanced Popover Filter Form (Zero redundancy with tabs & header)
    const filterFieldsGrid = (
        <div className="space-y-3.5 text-left text-xs">
            <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    Shift Condition
                </label>
                <select
                    value={draftAnomaly}
                    onChange={(e) => setDraftAnomaly(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-800 outline-none focus:border-clay-500 bg-white"
                >
                    <option value="all">All Shift Durations</option>
                    <option value="overtime">Overtime Shifts (Over 8 hrs)</option>
                    <option value="undertime">Undertime / Tardy Shifts</option>
                    <option value="autopaused">Auto-Paused Shifts</option>
                </select>
            </div>

            <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    Workday Type
                </label>
                <select
                    value={draftWorkday}
                    onChange={(e) => setDraftWorkday(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-800 outline-none focus:border-clay-500 bg-white"
                >
                    <option value="all">All Days (Mon–Sun)</option>
                    <option value="weekdays">Regular Weekdays (Mon–Fri)</option>
                    <option value="weekends">Weekends & Rest Days (Sat–Sun)</option>
                </select>
            </div>

            <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    Photo Verification
                </label>
                <select
                    value={draftPhoto}
                    onChange={(e) => setDraftPhoto(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-800 outline-none focus:border-clay-500 bg-white"
                >
                    <option value="all">All Shifts</option>
                    <option value="with_photo">With Face Photo Check</option>
                    <option value="without_photo">Without Photo Check</option>
                </select>
            </div>

            <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    Sort Order
                </label>
                <select
                    value={draftSort}
                    onChange={(e) => setDraftSort(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-800 outline-none focus:border-clay-500 bg-white"
                >
                    <option value="date_desc">Date: Newest First</option>
                    <option value="date_asc">Date: Oldest First</option>
                    <option value="duration_desc">Duration: Longest First</option>
                    <option value="duration_asc">Duration: Shortest First</option>
                </select>
            </div>
        </div>
    );

    // Active filters counter
    const activeFiltersCount = (activeTab !== 'all' ? 1 : 0)
        + (anomalyFilter !== 'all' ? 1 : 0)
        + (workdayFilter !== 'all' ? 1 : 0)
        + (photoFilter !== 'all' ? 1 : 0)
        + (sortOrder !== 'date_desc' ? 1 : 0)
        + (searchQuery.trim() ? 1 : 0);

    // Resolve user avatar representation for sync
    const avatarUser = employee.login_account || employee.loginAccount || {
        name: employee.name,
        avatar: employee.avatar,
        avatar_url: employee.avatar_url,
    };

    const isSuspended = String(employee?.status || '').trim().toLowerCase() === 'suspended';
    const hasOpenSession = Boolean(summary?.open_session || employee?.attendance?.open_session || employee?.login_account?.current_state === 'clocked_in');
    const isPaused = Boolean(employee?.attendance?.current_state === 'paused' || employee?.login_account?.current_state === 'paused');

    let statusDotColor = 'bg-stone-300';
    let statusTitle = 'Off Duty (Clocked Out)';

    if (isSuspended) {
        statusDotColor = 'bg-rose-500';
        statusTitle = 'Account Suspended';
    } else if (hasOpenSession) {
        statusDotColor = 'bg-emerald-500 animate-pulse';
        statusTitle = 'Active Shift (Clocked In)';
    } else if (isPaused) {
        statusDotColor = 'bg-amber-500';
        statusTitle = 'On Break (Paused)';
    }

    // Format human date label
    const formatSessionDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Clean operational flag (strips duplicate distance text since the Store Distance column handles it)
    const getCleanOperationalFlag = (reason) => {
        if (!reason) return null;
        if (/off-site|assigned workplace|meters|distance/i.test(reason)) {
            return null; // Omit location text in date column
        }
        return reason;
    };

    return (
        <>
            <Head title={`${employee.name} - Time-Card Audit - Artisan Dashboard`} />
            <SellerHeader
                title="Time-Card Audit"
                subtitle={`Work logs, shift verification, and attendance reviews for ${employee.name}.`}
                auth={auth}
                onMenuClick={openSidebar}
            />

            <div className="flex-1 w-full min-w-0 px-3.5 py-4 sm:py-5 sm:px-5 lg:px-6 space-y-4 sm:space-y-5">
                
                {/* ── BREADCRUMBS ── */}
                <nav className="flex items-center gap-2 text-xs text-stone-500 font-medium overflow-x-auto scrollbar-none">
                    <Link href={route('hr.index')} className="hover:text-stone-900 transition shrink-0">
                        People &amp; Payroll
                    </Link>
                    <ChevronRight size={12} className="text-stone-400 shrink-0" />
                    <span className="text-stone-400 font-medium shrink-0">Time-Card Audit</span>
                    <ChevronRight size={12} className="text-stone-400 shrink-0" />
                    <span className="text-stone-900 font-bold tracking-tight truncate">{employee.name}</span>
                </nav>

                {/* ── HEADER PROFILE BANNER ── */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200/80 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                        <div className="relative shrink-0">
                            <UserAvatar user={avatarUser} className="w-12 h-12 sm:w-13 sm:h-13 text-base sm:text-lg rounded-2xl" />
                            <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ${statusDotColor} border-2 border-white`} title={statusTitle} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-base sm:text-lg font-black text-stone-900 tracking-tight truncate">{employee.name}</h1>
                                <span className="text-[11px] font-bold text-stone-700 bg-stone-100 border border-stone-200/80 px-2.5 py-0.5 rounded-full">
                                    {employee.role || 'Staff Member'}
                                </span>
                            </div>
                            <div className="text-xs text-stone-500 font-medium mt-1 flex flex-wrap items-center gap-2 sm:gap-3">
                                <span className="inline-flex items-center gap-1 font-mono text-stone-700 bg-stone-50 px-2 py-0.5 rounded border border-stone-200/60">
                                    {employee.employee_id || `#EMP-${employee.id}`}
                                </span>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 text-stone-700 font-semibold truncate">
                                    <Building2 size={13} className="text-stone-400 shrink-0" />
                                    {employee.assigned_location?.name || 'Main Workshop'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-stone-500">Period:</span>
                            <input
                                type="month"
                                value={month}
                                onChange={(e) => handleMonthChange(e.target.value)}
                                className="rounded-xl border border-stone-200 bg-stone-50/70 px-3 py-1.5 text-xs font-bold text-stone-800 outline-none focus:border-clay-500 focus:bg-white transition shadow-2xs"
                            />
                        </div>
                        <Link
                            href={route('hr.index')}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition min-h-[32px]"
                        >
                            <ArrowLeft size={13} /> Back
                        </Link>
                    </div>
                </div>

                {/* ── 4 REFINED OPERATIONAL KPI STAT CARDS ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* 1. Total Worked */}
                    <div className="p-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Total Worked</span>
                            <Clock size={16} className="text-stone-400" />
                        </div>
                        <div className="mt-2">
                            <p className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                                {summary?.total_worked_hours || 0} <span className="text-xs font-bold text-stone-400">hrs</span>
                            </p>
                            <p className="text-[11px] text-stone-500 font-medium mt-0.5">{summary?.total_sessions || 0} shifts recorded</p>
                        </div>
                    </div>

                    {/* 2. Overtime */}
                    <div className="p-4 bg-white rounded-2xl border border-emerald-200/80 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Approved Overtime</span>
                            <TrendingUp size={16} className="text-emerald-600" />
                        </div>
                        <div className="mt-2">
                            <p className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight">
                                {summary?.overtime_hours || 0} <span className="text-xs font-bold text-emerald-700">hrs</span>
                            </p>
                            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">Past daily shift window</p>
                        </div>
                    </div>

                    {/* 3. Undertime */}
                    <div className="p-4 bg-white rounded-2xl border border-amber-200/80 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Undertime Deduction</span>
                            <AlertTriangle size={16} className="text-amber-600" />
                        </div>
                        <div className="mt-2">
                            <p className="text-2xl sm:text-3xl font-black text-amber-950 tracking-tight">
                                {summary?.undertime_hours || 0} <span className="text-xs font-bold text-amber-700">hrs</span>
                            </p>
                            <p className="text-[11px] text-amber-700 font-medium mt-0.5">Short of workday goal</p>
                        </div>
                    </div>

                    {/* 4. Action Needed / Review Queue (Replacing redundant Rest Day OT) */}
                    <div className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between ${
                        pendingCount > 0 ? 'bg-amber-50/40 border-amber-300/80' : 'bg-white border-stone-200/80'
                    }`}>
                        <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                pendingCount > 0 ? 'text-amber-900' : 'text-stone-500'
                            }`}>
                                Audit Review Queue
                            </span>
                            {pendingCount > 0 ? (
                                <AlertCircle size={16} className="text-amber-600 animate-pulse" />
                            ) : (
                                <ShieldCheck size={16} className="text-emerald-600" />
                            )}
                        </div>
                        <div className="mt-2">
                            <p className={`text-2xl sm:text-3xl font-black tracking-tight ${
                                pendingCount > 0 ? 'text-amber-950' : 'text-emerald-700'
                            }`}>
                                {pendingCount > 0 ? (
                                    <span>{pendingCount} <span className="text-xs font-bold text-amber-800">Pending</span></span>
                                ) : (
                                    <span className="text-xl sm:text-2xl">All Cleared</span>
                                )}
                            </p>
                            <p className={`text-[11px] font-medium mt-0.5 ${
                                pendingCount > 0 ? 'text-amber-800' : 'text-stone-500'
                            }`}>
                                {pendingCount > 0 ? 'Requires manager review' : 'Ready for payroll run'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── UNIFIED TABLE & FILTER CARD ── */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
                    <FilterToolbarHeader
                        tabs={[
                            { key: 'all', label: 'All Shifts' },
                            { key: 'pending', label: 'Pending Review', count: pendingCount },
                            { key: 'offsite', label: 'Off-Site', count: offSiteCount },
                            { key: 'approved', label: 'Approved' },
                            { key: 'rejected', label: 'Rejected' },
                        ]}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        searchPlaceholder="Search date or reason..."
                        activeFiltersCount={activeFiltersCount}
                        filterPopoverTitle="Advanced Shift Filters"
                        filterPopoverFields={filterFieldsGrid}
                        onApplyFilters={applyDraftFilters}
                        onResetFilters={resetFilters}
                        activeFilterTags={[
                            activeTab !== 'all' && {
                                label: `Status: ${activeTab === 'pending' ? 'Pending Review' : activeTab === 'offsite' ? 'Off-Site' : activeTab === 'approved' ? 'Approved' : 'Rejected'}`,
                                onRemove: () => setActiveTab('all'),
                            },
                            anomalyFilter !== 'all' && {
                                label: `Condition: ${anomalyFilter === 'overtime' ? 'Overtime (>8h)' : anomalyFilter === 'undertime' ? 'Undertime/Tardy' : 'Auto-Paused'}`,
                                onRemove: () => { setAnomalyFilter('all'); setDraftAnomaly('all'); },
                            },
                            workdayFilter !== 'all' && {
                                label: `Days: ${workdayFilter === 'weekdays' ? 'Weekdays' : 'Weekends'}`,
                                onRemove: () => { setWorkdayFilter('all'); setDraftWorkday('all'); },
                            },
                            photoFilter !== 'all' && {
                                label: `Photo: ${photoFilter === 'with_photo' ? 'With Photo' : 'No Photo'}`,
                                onRemove: () => { setPhotoFilter('all'); setDraftPhoto('all'); },
                            },
                            sortOrder !== 'date_desc' && {
                                label: `Sort: ${sortOrder === 'date_asc' ? 'Oldest First' : sortOrder === 'duration_desc' ? 'Longest Duration' : 'Shortest Duration'}`,
                                onRemove: () => { setSortOrder('date_desc'); setDraftSort('date_desc'); },
                            },
                            searchQuery.trim() && {
                                label: `Search: "${searchQuery}"`,
                                onRemove: () => setSearchQuery(''),
                            },
                        ].filter(Boolean)}
                        containerClassName="rounded-t-2xl sm:rounded-t-3xl border-x-0 border-t-0 border-b border-stone-200/80 bg-stone-50/50"
                    />

                    {/* ── DESKTOP DATA TABLE (hidden lg:block) ── */}
                    <div className="hidden lg:block overflow-x-auto">
                        {filteredSessions.length > 0 ? (
                            <table className="w-full text-left text-xs text-stone-700 border-collapse">
                                <thead>
                                    <tr className="bg-stone-50/80 border-b border-stone-200/80 text-[10px] uppercase font-bold text-stone-500 tracking-wider select-none">
                                        <th className="py-2.5 pl-4 pr-2 whitespace-nowrap">Shift Date</th>
                                        <th className="py-2.5 px-2 text-center whitespace-nowrap">Photo</th>
                                        <th className="py-2.5 px-2.5 whitespace-nowrap">Clock-In / Out</th>
                                        <th className="py-2.5 px-2.5 whitespace-nowrap">Store Distance</th>
                                        <th className="py-2.5 px-2.5 whitespace-nowrap">Status</th>
                                        <th className="py-2.5 px-2.5 text-right whitespace-nowrap">Duration</th>
                                        <th className="py-2.5 pl-2 pr-4 text-right whitespace-nowrap min-w-[140px]">Manager Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {filteredSessions.map((session) => {
                                        const isRejected = session.approval_status === 'rejected';
                                        const isPending = session.approval_status === 'pending' || session.is_flagged;
                                        const isApproved = session.approval_status === 'approved' && !session.is_flagged;
                                        const cleanFlag = getCleanOperationalFlag(session.flag_reason);

                                        return (
                                            <tr
                                                key={session.id}
                                                className={`transition hover:bg-stone-50/60 ${
                                                    isRejected ? 'bg-rose-50/20' : isPending ? 'bg-amber-50/15' : ''
                                                }`}
                                            >
                                                {/* Shift Date */}
                                                <td className="py-2.5 pl-4 pr-2 whitespace-nowrap">
                                                    <span className="font-bold text-stone-900 block">
                                                        {formatSessionDate(session.date)}
                                                    </span>
                                                    {cleanFlag && (
                                                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 mt-0.5 inline-block">
                                                            {cleanFlag}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Photo Check */}
                                                <td className="py-2.5 px-2 text-center whitespace-nowrap">
                                                    {session.photo_url ? (
                                                        <button
                                                            type="button"
                                                            className="relative inline-block group w-8 h-8 rounded-lg overflow-hidden border border-stone-200 shadow-2xs hover:ring-2 hover:ring-clay-500 transition cursor-pointer"
                                                            onClick={() => setSelectedPhotoData({
                                                                url: session.photo_url,
                                                                date: formatSessionDate(session.date),
                                                                time: session.clock_in_at ? new Date(session.clock_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
                                                                distance: session.distance_meters,
                                                                onSite: session.is_within_geofence
                                                            })}
                                                            title="Click to inspect photo verification"
                                                        >
                                                            <img
                                                                src={session.photo_url}
                                                                alt="Clock-in face photo"
                                                                className="w-full h-full object-cover group-hover:scale-105 transition"
                                                            />
                                                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                                                                <Eye size={12} />
                                                            </div>
                                                        </button>
                                                    ) : (
                                                        <div className="inline-flex w-8 h-8 rounded-lg bg-stone-100 border border-stone-200/80 items-center justify-center text-stone-400" title="No photo required">
                                                            <Clock size={13} />
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Clock In / Out */}
                                                <td className="py-2.5 px-2.5 whitespace-nowrap">
                                                    <div className="flex items-center gap-1 font-medium text-stone-700">
                                                        <span className="font-semibold text-stone-900">
                                                            {session.clock_in_at ? new Date(session.clock_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                                        </span>
                                                        <span className="text-stone-400 text-[10px]">→</span>
                                                        <span>
                                                            {session.clock_out_at ? new Date(session.clock_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                                                        </span>
                                                    </div>
                                                    {session.close_mode === 'paused' && (
                                                        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-1 py-0.2 rounded mt-0.5 inline-block">
                                                            Auto-Paused
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Store Distance */}
                                                <td className="py-2.5 px-2.5 whitespace-nowrap">
                                                    {session.distance_meters !== null ? (
                                                        session.is_within_geofence ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                                                                <MapPin size={10} className="text-emerald-600 shrink-0" />
                                                                <span>On-Site ({session.distance_meters}m)</span>
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-full">
                                                                <ShieldAlert size={10} className="text-rose-600 shrink-0" />
                                                                <span>Off-Site ({session.distance_meters}m)</span>
                                                            </span>
                                                        )
                                                    ) : (
                                                        <span className="text-stone-400 text-[10px]">Unverified</span>
                                                    )}
                                                </td>

                                                {/* Status */}
                                                <td className="py-2.5 px-2.5 whitespace-nowrap">
                                                    {isApproved && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                                                            <CheckCircle2 size={10} className="text-emerald-600 shrink-0" />
                                                            <span>Approved</span>
                                                        </span>
                                                    )}
                                                    {isPending && !isRejected && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                                                            <AlertCircle size={10} className="text-amber-600 shrink-0" />
                                                            <span>Pending</span>
                                                        </span>
                                                    )}
                                                    {isRejected && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-full">
                                                            <Ban size={10} className="text-rose-600 shrink-0" />
                                                            <span>Rejected</span>
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Worked Duration */}
                                                <td className="py-2.5 px-2.5 text-right whitespace-nowrap font-black text-stone-900 text-xs">
                                                    {session.worked_hours_label}
                                                </td>

                                                {/* Actions */}
                                                <td className="py-2.5 pl-2 pr-4 text-right whitespace-nowrap">
                                                    {canEdit && (session.is_flagged || session.approval_status === 'pending') && !isRejected ? (
                                                        <div className="inline-flex items-center justify-end gap-1.5">
                                                            <button
                                                                type="button"
                                                                disabled={submittingActionId === session.id}
                                                                onClick={() => handleApproveSession(session.id)}
                                                                className="inline-flex items-center gap-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-2.5 py-1 rounded-lg shadow-2xs transition disabled:opacity-50 min-h-[26px]"
                                                            >
                                                                <Check size={11} strokeWidth={2.5} />
                                                                <span>Approve</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={submittingActionId === session.id}
                                                                onClick={() => {
                                                                    setRejectingSessionId(session.id);
                                                                    setRejectionReason('');
                                                                }}
                                                                className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition disabled:opacity-50 min-h-[26px]"
                                                            >
                                                                <Ban size={11} />
                                                                <span>Reject</span>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[11px] text-stone-400 font-medium">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-12 text-center text-stone-400 text-xs font-medium space-y-2">
                                <Clock size={28} className="mx-auto text-stone-300 mb-2" />
                                <p className="font-bold text-stone-700 text-sm">No attendance shifts found</p>
                                <p className="text-stone-400">Try adjusting your filter criteria or search query above.</p>
                            </div>
                        )}
                    </div>

                    {/* ── MOBILE TIMELINE CARDS (block lg:hidden) ── */}
                    <div className="block lg:hidden divide-y divide-stone-100">
                        {filteredSessions.length > 0 ? (
                            filteredSessions.map((session) => {
                                const isRejected = session.approval_status === 'rejected';
                                const isPending = session.approval_status === 'pending' || session.is_flagged;
                                const isApproved = session.approval_status === 'approved' && !session.is_flagged;
                                const cleanFlag = getCleanOperationalFlag(session.flag_reason);

                                return (
                                    <div
                                        key={session.id}
                                        className={`p-4 space-y-3 ${
                                            isRejected ? 'bg-rose-50/20' : isPending ? 'bg-amber-50/20' : ''
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                {session.photo_url ? (
                                                    <button
                                                        type="button"
                                                        className="w-11 h-11 rounded-xl overflow-hidden border border-stone-200 shrink-0"
                                                        onClick={() => setSelectedPhotoData({
                                                            url: session.photo_url,
                                                            date: formatSessionDate(session.date),
                                                            time: session.clock_in_at ? new Date(session.clock_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
                                                            distance: session.distance_meters,
                                                            onSite: session.is_within_geofence
                                                        })}
                                                    >
                                                        <img
                                                            src={session.photo_url}
                                                            alt="Face photo check"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </button>
                                                ) : (
                                                    <div className="w-11 h-11 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 shrink-0">
                                                        <Clock size={18} />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="font-bold text-stone-900 text-xs">{formatSessionDate(session.date)}</p>
                                                    <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                                                        {session.clock_in_at ? new Date(session.clock_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'} → {session.clock_out_at ? new Date(session.clock_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                                                    </p>
                                                    {cleanFlag && (
                                                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 mt-0.5 inline-block">
                                                            {cleanFlag}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="font-black text-stone-900 text-sm shrink-0">{session.worked_hours_label}</span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                            {session.distance_meters !== null && (
                                                session.is_within_geofence ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                                                        <MapPin size={10} className="text-emerald-600" />
                                                        <span>On-Site ({session.distance_meters}m)</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-full">
                                                        <ShieldAlert size={10} className="text-rose-600" />
                                                        <span>Off-Site ({session.distance_meters}m)</span>
                                                    </span>
                                                )
                                            )}

                                            {isApproved && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                                                    <CheckCircle2 size={10} className="text-emerald-600" />
                                                    <span>Approved</span>
                                                </span>
                                            )}
                                            {isPending && !isRejected && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                                                    <AlertCircle size={10} className="text-amber-600" />
                                                    <span>Pending Review</span>
                                                </span>
                                            )}
                                            {isRejected && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-full">
                                                    <Ban size={10} className="text-rose-600" />
                                                    <span>Rejected</span>
                                                </span>
                                            )}
                                        </div>

                                        {canEdit && (session.is_flagged || session.approval_status === 'pending') && !isRejected && (
                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
                                                <button
                                                    type="button"
                                                    disabled={submittingActionId === session.id}
                                                    onClick={() => handleApproveSession(session.id)}
                                                    className="w-full inline-flex items-center justify-center gap-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 py-2 rounded-xl transition min-h-[38px] active:scale-[0.98]"
                                                >
                                                    <Check size={13} /> Approve
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={submittingActionId === session.id}
                                                    onClick={() => {
                                                        setRejectingSessionId(session.id);
                                                        setRejectionReason('');
                                                    }}
                                                    className="w-full inline-flex items-center justify-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 py-2 rounded-xl transition min-h-[38px] active:scale-[0.98]"
                                                >
                                                    <Ban size={13} /> Reject
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-8 text-center text-stone-400 text-xs font-medium">
                                No attendance shifts found.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── MOBILE SLIDE-OVER ADVANCED FILTER DRAWER ── */}
            <SlideOverDrawer
                show={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                title="Filter Shifts"
                position="bottom"
                widthClass="max-w-md"
                footer={
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="flex-1 rounded-xl border border-stone-200 bg-white py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition min-h-[42px]"
                        >
                            Reset
                        </button>
                        <button
                            type="button"
                            onClick={applyDraftFilters}
                            className="flex-1 rounded-xl bg-clay-700 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-clay-800 transition min-h-[42px]"
                        >
                            Apply Filters
                        </button>
                    </div>
                }
            >
                <div className="space-y-4 py-2">
                    {filterFieldsGrid}
                </div>
            </SlideOverDrawer>

            {/* ── PHOTO PROOF INSPECTOR MODAL ── */}
            <Modal
                show={!!selectedPhotoData}
                onClose={() => setSelectedPhotoData(null)}
                maxWidth="md"
                bottomSheet={true}
            >
                <div className="p-5 space-y-4 bg-white rounded-3xl">
                    <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                        <div>
                            <h3 className="text-sm font-extrabold text-stone-900">Clock-In Photo Verification</h3>
                            <p className="text-[11px] text-stone-500 font-medium">Captured face check at shift start</p>
                        </div>
                        <button type="button" onClick={() => setSelectedPhotoData(null)} className="text-stone-400 hover:text-stone-700 p-1">
                            <X size={18} />
                        </button>
                    </div>

                    {selectedPhotoData && (
                        <div className="space-y-3">
                            <div className="relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-900 max-h-[380px] flex items-center justify-center">
                                <img
                                    src={selectedPhotoData.url}
                                    alt="Clock-in face verification"
                                    className="w-full h-auto max-h-[380px] object-contain"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs bg-stone-50 p-3 rounded-2xl border border-stone-200/60">
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-stone-400 block">Shift Date & Time</span>
                                    <span className="font-bold text-stone-800">{selectedPhotoData.date} • {selectedPhotoData.time}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-stone-400 block">Store Distance</span>
                                    <span className={`font-bold ${selectedPhotoData.onSite ? 'text-emerald-700' : 'text-rose-700'}`}>
                                        {selectedPhotoData.distance !== null ? `${selectedPhotoData.onSite ? 'On-Site' : 'Off-Site'} (${selectedPhotoData.distance}m)` : 'Unverified'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* ── MANAGER REJECTION MODAL ── */}
            <Modal
                show={!!rejectingSessionId}
                onClose={() => setRejectingSessionId(null)}
                maxWidth="md"
                bottomSheet={true}
            >
                <div className="p-6 space-y-4 bg-white rounded-3xl">
                    <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                        <div>
                            <h3 className="text-sm font-extrabold text-stone-900">Reject Attendance Shift</h3>
                            <p className="text-[11px] text-stone-500 font-medium">Flag and exclude from payroll computation</p>
                        </div>
                        <button type="button" onClick={() => setRejectingSessionId(null)} className="text-stone-400 hover:text-stone-700 p-1">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 text-xs text-rose-900 space-y-1">
                        <p className="font-bold">Excluded from Monthly Payroll</p>
                        <p className="text-[11px] text-rose-700/90 leading-relaxed">
                            Rejecting this shift removes its logged work hours from this period's automated payroll calculations.
                        </p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                            Rejection Note (Optional)
                        </label>
                        <input
                            type="text"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g. Unverified off-site clock-in"
                            className="w-full rounded-xl border border-stone-200 px-3.5 py-2 text-xs text-stone-800 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 shadow-2xs min-h-[40px]"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                        <button
                            type="button"
                            onClick={() => setRejectingSessionId(null)}
                            className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl transition min-h-[38px]"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={submittingActionId === rejectingSessionId}
                            onClick={handleRejectSession}
                            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition shadow-xs disabled:opacity-50 min-h-[38px]"
                        >
                            {submittingActionId === rejectingSessionId ? 'Rejecting...' : 'Confirm Rejection'}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

TimeCardAudit.layout = (page) => <SellerWorkspaceLayout active="hr">{page}</SellerWorkspaceLayout>;
