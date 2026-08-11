import React, { useState, useRef, useEffect } from 'react';
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
    Check, Search, Filter, Eye, X, ChevronRight, SlidersHorizontal, RotateCcw, ChevronDown
} from 'lucide-react';

export default function TimeCardAudit({ auth, employee, summary, selectedMonth, canEdit }) {
    const { openSidebar } = useSellerWorkspaceShell();
    const { addToast } = useToast();

    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [month, setMonth] = useState(selectedMonth || new Date().toISOString().slice(0, 7));
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [rejectingSessionId, setRejectingSessionId] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [submittingActionId, setSubmittingActionId] = useState(null);

    // Standard Filter States
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [draftStatus, setDraftStatus] = useState('all');
    const [draftMonth, setDraftMonth] = useState(month);
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
                addToast('Attendance session approved.', 'success');
                refreshLogs();
            })
            .catch((err) => {
                addToast(err.response?.data?.message || 'Failed to approve session.', 'error');
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
                addToast('Attendance session rejected and excluded from payroll.', 'info');
                setRejectingSessionId(null);
                setRejectionReason('');
                refreshLogs();
            })
            .catch((err) => {
                addToast(err.response?.data?.message || 'Failed to reject session.', 'error');
            })
            .finally(() => setSubmittingActionId(null));
    };

    const applyDraftFilters = () => {
        setActiveTab(draftStatus);
        if (draftMonth !== month) {
            handleMonthChange(draftMonth);
        }
        setIsPopoverOpen(false);
        setIsDrawerOpen(false);
    };

    const resetFilters = () => {
        setActiveTab('all');
        setSearchQuery('');
        setDraftStatus('all');
        setDraftMonth(new Date().toISOString().slice(0, 7));
        handleMonthChange(new Date().toISOString().slice(0, 7));
        setIsPopoverOpen(false);
        setIsDrawerOpen(false);
    };

    const rawSessions = summary?.sessions || [];

    // Sort raw sessions DESCENDING (latest date on top)
    const sortedSessions = [...rawSessions].sort((a, b) => {
        const timeA = a.clock_in_at ? new Date(a.clock_in_at).getTime() : (a.date ? new Date(a.date).getTime() : 0);
        const timeB = b.clock_in_at ? new Date(b.clock_in_at).getTime() : (b.date ? new Date(b.date).getTime() : 0);
        return timeB - timeA;
    });

    // Filter sessions based on active tab & search query
    const filteredSessions = sortedSessions.filter((session) => {
        const isOffSite = session.distance_meters !== null && !session.is_within_geofence;
        const isPending = session.approval_status === 'pending' || session.is_flagged;
        const isApproved = session.approval_status === 'approved' && !session.is_flagged;
        const isRejected = session.approval_status === 'rejected';

        if (activeTab === 'pending' && (!isPending || isRejected)) return false;
        if (activeTab === 'offsite' && !isOffSite) return false;
        if (activeTab === 'approved' && !isApproved) return false;
        if (activeTab === 'rejected' && !isRejected) return false;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const dateMatch = session.date?.toLowerCase().includes(query);
            const flagMatch = session.flag_reason?.toLowerCase().includes(query);
            return dateMatch || flagMatch;
        }

        return true;
    });

    const pendingCount = rawSessions.filter((s) => (s.approval_status === 'pending' || s.is_flagged) && s.approval_status !== 'rejected').length;
    const offSiteCount = rawSessions.filter((s) => s.distance_meters !== null && !s.is_within_geofence).length;

    const filterFieldsGrid = (
        <div className="space-y-3.5 text-left">
            <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                    Audit Status
                </label>
                <select
                    value={draftStatus}
                    onChange={(e) => setDraftStatus(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-800 outline-none focus:border-clay-500 bg-white"
                >
                    <option value="all">All Sessions ({rawSessions.length})</option>
                    <option value="pending">Pending Review ({pendingCount})</option>
                    <option value="offsite">Off-Site Flagged ({offSiteCount})</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>

            <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                    Month Period
                </label>
                <input
                    type="month"
                    value={draftMonth}
                    onChange={(e) => setDraftMonth(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-800 outline-none focus:border-clay-500 bg-white"
                />
            </div>
        </div>
    );

    // Active filters counter
    const activeFiltersCount = (activeTab !== 'all' ? 1 : 0) + (searchQuery.trim() ? 1 : 0);

    // Resolve user avatar representation for sync
    const avatarUser = employee.login_account || employee.loginAccount || {
        name: employee.name,
        avatar: employee.avatar,
        avatar_url: employee.avatar_url,
    };

    return (
        <>
            <Head title={`${employee.name} - Time-Card Audit - Artisan Dashboard`} />
            <SellerHeader
                title="Time-Card Audit"
                subtitle={`Time-card audit logs and shift approvals for ${employee.name}.`}
                auth={auth}
                onMenuClick={openSidebar}
            />

            <div className="flex-1 w-full min-w-0 px-4 py-4 sm:py-6 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
                
                {/* ── BREADCRUMBS ── */}
                <nav className="flex items-center gap-2 text-xs text-stone-500 font-medium overflow-x-auto scrollbar-none">
                    <Link href={route('hr.index')} className="hover:text-stone-900 transition shrink-0">
                        People &amp; HR
                    </Link>
                    <ChevronRight size={12} className="text-stone-400 shrink-0" />
                    <span className="text-stone-400 font-medium shrink-0">Time-Card Audit</span>
                    <ChevronRight size={12} className="text-stone-400 shrink-0" />
                    <span className="text-stone-900 font-bold tracking-tight truncate">{employee.name}</span>
                </nav>

                {/* ── HEADER PROFILE & ACTION BANNER ── */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200/80 p-4 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 sm:gap-4">
                        <UserAvatar user={avatarUser} className="w-12 h-12 sm:w-14 sm:h-14 text-lg sm:text-xl shrink-0" />
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight truncate">{employee.name}</h1>
                                <span className="text-[11px] sm:text-xs font-semibold text-stone-600 bg-stone-100 border border-stone-200/60 px-2.5 py-0.5 rounded-full">
                                    {employee.role || 'Staff Member'}
                                </span>
                            </div>
                            <p className="text-xs text-stone-500 font-medium mt-1 flex flex-wrap items-center gap-2">
                                <span>ID: <span className="font-mono text-stone-700">{employee.employee_id || `#EMP-${employee.id}`}</span></span>
                                <span className="hidden sm:inline">•</span>
                                <span>Assigned Site: <span className="font-bold text-stone-700">{employee.assigned_location?.name || 'Main Artisan Workshop'}</span></span>
                            </p>
                        </div>
                    </div>

                    <div className="hidden lg:flex items-center gap-3 w-auto justify-end">
                        <Link
                            href={route('hr.index')}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition shadow-xs min-h-[36px] active:scale-[0.98]"
                        >
                            <ArrowLeft size={14} /> Back to Directory
                        </Link>
                    </div>
                </div>

                {/* ── METRICS SUMMARY GRID ── */}
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">Total Worked</p>
                        <p className="text-xl sm:text-2xl font-black text-stone-900 mt-1 tracking-tight">
                            {summary?.total_worked_hours || 0} <span className="text-xs font-semibold text-stone-500">hrs</span>
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-stone-500 font-medium mt-1">{summary?.total_sessions || 0} shifts logged</p>
                    </div>

                    <div className="p-3.5 sm:p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100/80 shadow-xs">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">Approved Overtime</p>
                        <p className="text-xl sm:text-2xl font-black text-emerald-950 mt-1 tracking-tight">
                            {summary?.overtime_hours || 0} <span className="text-xs font-semibold text-emerald-800">hrs</span>
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-emerald-700 font-medium mt-1">Calculated over 8h</p>
                    </div>

                    <div className="p-3.5 sm:p-4 bg-amber-50/40 rounded-2xl border border-amber-100/80 shadow-xs">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">Undertime / Tardy</p>
                        <p className="text-xl sm:text-2xl font-black text-amber-950 mt-1 tracking-tight">
                            {summary?.undertime_hours || 0} <span className="text-xs font-semibold text-amber-800">hrs</span>
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-amber-700 font-medium mt-1">Short of workday goal</p>
                    </div>

                    <div className="p-3.5 sm:p-4 bg-clay-50/40 rounded-2xl border border-clay-100/80 shadow-xs">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-clay-800">Rest Day OT</p>
                        <p className="text-xl sm:text-2xl font-black text-clay-950 mt-1 tracking-tight">
                            {summary?.rest_day_ot_hours || 0} <span className="text-xs font-semibold text-clay-800">hrs</span>
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-clay-700 font-medium mt-1">Special weekend shifts</p>
                    </div>
                </div>

                {/* ── UNIFIED SINGLE-SURFACE CARD CONTAINER ── */}
                <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs relative">
                    <FilterToolbarHeader
                        tabs={[
                            { key: 'all', label: 'All' },
                            { key: 'pending', label: 'Pending Review', count: pendingCount },
                            { key: 'offsite', label: 'Off-Site', count: offSiteCount },
                            { key: 'approved', label: 'Approved' },
                            { key: 'rejected', label: 'Rejected' },
                        ]}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        searchPlaceholder="Search logs..."
                        activeFiltersCount={activeFiltersCount}
                        filterPopoverTitle="Filter Audit Logs"
                        filterPopoverFields={filterFieldsGrid}
                        onApplyFilters={applyDraftFilters}
                        onResetFilters={resetFilters}
                        activeFilterTags={[
                            activeTab !== 'all' && {
                                label: `Status: ${activeTab === 'pending' ? 'Pending Review' : activeTab === 'offsite' ? 'Off-Site' : activeTab === 'approved' ? 'Approved' : 'Rejected'}`,
                                onRemove: () => setActiveTab('all'),
                            },
                            searchQuery.trim() && {
                                label: `Search: "${searchQuery}"`,
                                onRemove: () => setSearchQuery(''),
                            },
                        ].filter(Boolean)}
                        containerClassName="rounded-t-3xl border-x-0 border-t-0 border-b border-stone-200/80 shadow-none bg-stone-50/40"
                    />

                    {/* ── DESKTOP VIEW: FULL-WIDTH DATA TABLE (hidden lg:block) ── */}
                    <div className="hidden lg:block rounded-b-3xl overflow-hidden">
                    {filteredSessions.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-stone-700 border-collapse">
                                <thead>
                                    <tr className="bg-stone-50/80 border-b border-stone-200/80 text-[10px] uppercase font-black text-stone-500 tracking-wider">
                                        <th className="py-4 px-6">Shift Date (Latest First)</th>
                                        <th className="py-4 px-4">Selfie Proof</th>
                                        <th className="py-4 px-4">Clock In / Out</th>
                                        <th className="py-4 px-4">Geofence Distance</th>
                                        <th className="py-4 px-4">Audit Status</th>
                                        <th className="py-4 px-4 text-right">Worked Hours</th>
                                        <th className="py-4 px-6 text-right">Manager Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {filteredSessions.map((session) => {
                                        const isRejected = session.approval_status === 'rejected';
                                        const isPending = session.approval_status === 'pending' || session.is_flagged;
                                        const isApproved = session.approval_status === 'approved' && !session.is_flagged;

                                        return (
                                            <tr
                                                key={session.id}
                                                className={`transition hover:bg-stone-50/60 ${
                                                    isRejected ? 'bg-rose-50/20' : isPending ? 'bg-amber-50/20' : ''
                                                }`}
                                            >
                                                <td className="py-4 px-6 font-bold text-stone-900">
                                                    {session.date}
                                                </td>

                                                <td className="py-4 px-4">
                                                    {session.photo_url ? (
                                                        <div
                                                            className="relative group w-10 h-10 shrink-0 cursor-pointer"
                                                            onClick={() => setSelectedPhoto(session.photo_url)}
                                                        >
                                                            <img
                                                                src={session.photo_url}
                                                                alt="Selfie proof"
                                                                className="w-10 h-10 rounded-xl object-cover border border-stone-200 shadow-xs group-hover:opacity-80 transition"
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                                                                <Eye size={14} />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400">
                                                            <Clock size={16} />
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="py-4 px-4 font-medium text-stone-700">
                                                    <div>
                                                        <span>{session.clock_in_at ? new Date(session.clock_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                                                        <span className="text-stone-400 mx-1.5">-</span>
                                                        <span>{session.clock_out_at ? new Date(session.clock_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}</span>
                                                    </div>
                                                    {session.close_mode === 'paused' && (
                                                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100/60 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                                                            Auto-Paused
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-4 px-4">
                                                    {session.distance_meters !== null ? (
                                                        session.is_within_geofence ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-2.5 py-1 rounded-full">
                                                                <MapPin size={11} /> On-Site ({session.distance_meters}m)
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100/80 border border-rose-200 px-2.5 py-1 rounded-full">
                                                                <ShieldAlert size={11} /> Off-Site ({session.distance_meters}m)
                                                            </span>
                                                        )
                                                    ) : (
                                                        <span className="text-stone-400 text-[11px]">Unverified</span>
                                                    )}
                                                </td>

                                                <td className="py-4 px-4">
                                                    {isApproved && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-2.5 py-1 rounded-full">
                                                            <CheckCircle2 size={11} /> Approved
                                                        </span>
                                                    )}
                                                    {isPending && !isRejected && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/90 border border-amber-200 px-2.5 py-1 rounded-full">
                                                            <AlertCircle size={11} /> Pending Review
                                                        </span>
                                                    )}
                                                    {isRejected && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-full">
                                                            <Ban size={11} /> Rejected
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-4 px-4 text-right font-black text-stone-900 text-sm">
                                                    {session.worked_hours_label}
                                                </td>

                                                <td className="py-4 px-6 text-right">
                                                    {canEdit && (session.is_flagged || session.approval_status === 'pending') && !isRejected ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                disabled={submittingActionId === session.id}
                                                                onClick={() => handleApproveSession(session.id)}
                                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-3 py-1.5 rounded-xl shadow-xs transition disabled:opacity-50 min-h-[32px]"
                                                            >
                                                                {submittingActionId === session.id ? (
                                                                    <span className="animate-spin text-white">...</span>
                                                                ) : (
                                                                    <>
                                                                        <Check size={12} /> Approve
                                                                    </>
                                                                )}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={submittingActionId === session.id}
                                                                onClick={() => {
                                                                    setRejectingSessionId(session.id);
                                                                    setRejectionReason('');
                                                                }}
                                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 border border-rose-200 px-3 py-1.5 rounded-xl transition disabled:opacity-50 min-h-[32px]"
                                                            >
                                                                <Ban size={12} /> Reject
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[11px] text-stone-400 font-medium">No action needed</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-12 text-center text-stone-400 text-xs font-medium space-y-2">
                            <Clock size={28} className="mx-auto text-stone-300 mb-2" />
                            <p className="font-bold text-stone-600">No attendance sessions found</p>
                            <p className="text-stone-400">Try adjusting your status filter tab or month selection above.</p>
                        </div>
                    )}
                </div>

                {/* ── MOBILE & TABLET VIEW: TIMELINE CARDS (block lg:hidden) ── */}
                <div className="block lg:hidden space-y-3">
                    {filteredSessions.length > 0 ? (
                        filteredSessions.map((session) => {
                            const isRejected = session.approval_status === 'rejected';
                            const isPending = session.approval_status === 'pending' || session.is_flagged;
                            const isApproved = session.approval_status === 'approved' && !session.is_flagged;

                            return (
                                <div
                                    key={session.id}
                                    className={`p-4 rounded-2xl border bg-white shadow-xs space-y-3 ${
                                        isRejected ? 'border-rose-200 bg-rose-50/20' : isPending ? 'border-amber-200 bg-amber-50/20' : 'border-stone-200/80'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            {session.photo_url ? (
                                                <div className="relative group w-11 h-11 shrink-0" onClick={() => setSelectedPhoto(session.photo_url)}>
                                                    <img
                                                        src={session.photo_url}
                                                        alt="Selfie proof"
                                                        className="w-11 h-11 rounded-xl object-cover border border-stone-200 shadow-xs"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-11 h-11 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 shrink-0">
                                                    <Clock size={18} />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-bold text-stone-900 text-xs">{session.date}</p>
                                                <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                                                    {session.clock_in_at ? new Date(session.clock_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'} - {session.clock_out_at ? new Date(session.clock_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-black text-stone-900 text-sm block">{session.worked_hours_label}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-100">
                                        {session.distance_meters !== null && (
                                            session.is_within_geofence ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-full">
                                                    <MapPin size={10} /> On-Site ({session.distance_meters}m)
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100/80 border border-rose-200 px-2 py-0.5 rounded-full">
                                                    <ShieldAlert size={10} /> Off-Site ({session.distance_meters}m)
                                                </span>
                                            )
                                        )}

                                        {isApproved && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-2 py-0.5 rounded-full">
                                                <CheckCircle2 size={10} /> Approved
                                            </span>
                                        )}
                                        {isPending && !isRejected && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/90 border border-amber-200 px-2 py-0.5 rounded-full">
                                                <AlertCircle size={10} /> Pending Review
                                            </span>
                                        )}
                                        {isRejected && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full">
                                                <Ban size={10} /> Rejected
                                            </span>
                                        )}
                                    </div>

                                    {canEdit && (session.is_flagged || session.approval_status === 'pending') && !isRejected && (
                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
                                            <button
                                                type="button"
                                                disabled={submittingActionId === session.id}
                                                onClick={() => handleApproveSession(session.id)}
                                                className="w-full inline-flex items-center justify-center gap-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 py-2.5 rounded-xl transition min-h-[44px] active:scale-[0.98]"
                                            >
                                                <Check size={14} /> Approve
                                            </button>
                                            <button
                                                type="button"
                                                disabled={submittingActionId === session.id}
                                                onClick={() => {
                                                    setRejectingSessionId(session.id);
                                                    setRejectionReason('');
                                                }}
                                                className="w-full inline-flex items-center justify-center gap-1 text-xs font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 py-2.5 rounded-xl transition min-h-[44px] active:scale-[0.98]"
                                            >
                                                <Ban size={14} /> Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-8 bg-white rounded-2xl border border-stone-200 text-center text-stone-400 text-xs font-medium">
                            No attendance sessions found.
                        </div>
                    )}
                </div>
            </div>

        </div>

            {/* ── MOBILE SLIDE-OVER FILTER DRAWER (MOBILE ONLY) ── */}
            <SlideOverDrawer
                show={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                title="Filter Time-Card Logs"
                position="bottom"
                widthClass="max-w-md"
                footer={
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="flex-1 rounded-xl border border-stone-200 bg-white py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition min-h-[44px]"
                        >
                            Reset Filters
                        </button>
                        <button
                            type="button"
                            onClick={applyDraftFilters}
                            className="flex-1 rounded-xl bg-clay-700 py-2.5 text-xs font-bold text-white shadow-md shadow-clay-200 hover:bg-clay-800 transition min-h-[44px]"
                        >
                            Apply Filters
                        </button>
                    </div>
                }
            >
                <div className="space-y-4 py-2">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                            Audit Status
                        </label>
                        <select
                            value={draftStatus}
                            onChange={(e) => setDraftStatus(e.target.value)}
                            className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-xs font-semibold text-stone-800 outline-none focus:border-clay-500 shadow-xs"
                        >
                            <option value="all">All Sessions ({rawSessions.length})</option>
                            <option value="pending">Pending Review ({pendingCount})</option>
                            <option value="offsite">Off-Site Flagged ({offSiteCount})</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                            Month Period
                        </label>
                        <input
                            type="month"
                            value={draftMonth}
                            onChange={(e) => setDraftMonth(e.target.value)}
                            className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-xs font-semibold text-stone-800 outline-none focus:border-clay-500 shadow-xs"
                        />
                    </div>
                </div>
            </SlideOverDrawer>

            {/* ── HIGH-RES PHOTO PROOF PREVIEW MODAL (SYSTEM MODAL WITH z-[150] OVERLAY & MOBILE BOTTOM SHEET) ── */}
            <Modal
                show={!!selectedPhoto}
                onClose={() => setSelectedPhoto(null)}
                maxWidth="md"
                bottomSheet={true}
            >
                <div className="p-5 space-y-4 bg-white rounded-3xl">
                    <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                        <span className="text-sm font-extrabold text-stone-900">Attendance Selfie Verification Proof</span>
                        <button type="button" onClick={() => setSelectedPhoto(null)} className="text-stone-400 hover:text-stone-700 p-1">
                            <X size={18} />
                        </button>
                    </div>
                    {selectedPhoto && (
                        <img
                            src={selectedPhoto}
                            alt="Clock-in selfie proof"
                            className="w-full rounded-2xl object-cover border border-stone-200 max-h-[440px] shadow-xs"
                        />
                    )}
                </div>
            </Modal>

            {/* ── MANAGER REJECTION MODAL (SYSTEM MODAL WITH z-[150] OVERLAY & MOBILE BOTTOM SHEET) ── */}
            <Modal
                show={!!rejectingSessionId}
                onClose={() => setRejectingSessionId(null)}
                maxWidth="md"
                bottomSheet={true}
            >
                <div className="p-6 space-y-4 bg-white rounded-3xl">
                    <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                        <h3 className="text-sm font-extrabold text-stone-900">Reject Attendance Session</h3>
                        <button type="button" onClick={() => setRejectingSessionId(null)} className="text-stone-400 hover:text-stone-700 p-1">
                            <X size={18} />
                        </button>
                    </div>
                    <p className="text-xs text-stone-500 font-medium leading-relaxed">
                        Rejecting this session will exclude its logged worked hours from payroll calculations for this period.
                    </p>
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                            Rejection Reason (Optional)
                        </label>
                        <input
                            type="text"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g. Unverified off-site clock-in"
                            className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-xs text-stone-800 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 shadow-xs min-h-[44px]"
                        />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                        <button
                            type="button"
                            onClick={() => setRejectingSessionId(null)}
                            className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition min-h-[44px]"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={submittingActionId === rejectingSessionId}
                            onClick={handleRejectSession}
                            className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs disabled:opacity-50 min-h-[44px]"
                        >
                            Confirm Rejection
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

TimeCardAudit.layout = (page) => <SellerWorkspaceLayout active="hr">{page}</SellerWorkspaceLayout>;
