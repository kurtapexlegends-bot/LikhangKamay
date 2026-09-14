/* global route */
import React, { useState, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import SellerHeader from '@/Layouts/SellerHeader';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import { useToast } from '@/Components/ToastContext';
import UserAvatar from '@/Components/UserAvatar';
import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';
import {
    ArrowLeft, Clock, AlertCircle,
    ChevronRight, TrendingUp,
    AlertTriangle, Building2, ShieldCheck
} from 'lucide-react';

import TimeCardFilterPopover, { TimeCardFilterFields } from '@/Components/Seller/HR/TimeCardFilterPopover';
import ShiftRejectModal from '@/Components/Seller/HR/ShiftRejectModal';
import TimeCardSessionsTable from '@/Components/Seller/HR/TimeCardSessionsTable';
import TimeCardPhotoModal from '@/Components/Seller/HR/TimeCardPhotoModal';

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

    // Advanced Filter States
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [anomalyFilter, setAnomalyFilter] = useState('all');
    const [workdayFilter, setWorkdayFilter] = useState('all');
    const [photoFilter, setPhotoFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('date_desc');

    // Draft filter state for popover/drawer
    const [draftStatus, setDraftStatus] = useState(activeTab);
    const [draftAnomaly, setDraftAnomaly] = useState('all');
    const [draftWorkday, setDraftWorkday] = useState('all');
    const [draftPhoto, setDraftPhoto] = useState('all');
    const [draftSort, setDraftSort] = useState('date_desc');

    const handleMonthChange = (newMonth) => {
        setMonth(newMonth);
        router.get(
            route('hr.employees.time-card', employee.id),
            { month: newMonth },
            { preserveState: true, preserveScroll: true }
        );
    };

    const refreshLogs = () => {
        router.reload({
            preserveState: true,
            preserveScroll: true,
        });
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
        setActiveTab(draftStatus);
        setAnomalyFilter(draftAnomaly);
        setWorkdayFilter(draftWorkday);
        setPhotoFilter(draftPhoto);
        setSortOrder(draftSort);
        setIsDrawerOpen(false);
    };

    const resetFilters = () => {
        setActiveTab('all');
        setDraftStatus('all');
        setSearchQuery('');
        setAnomalyFilter('all');
        setWorkdayFilter('all');
        setPhotoFilter('all');
        setSortOrder('date_desc');
        setDraftAnomaly('all');
        setDraftWorkday('all');
        setDraftPhoto('all');
        setDraftSort('date_desc');
        setIsDrawerOpen(false);
    };

    const rawSessions = summary?.sessions || [];

    // Filter and Sort sessions
    const filteredSessions = useMemo(() => {
        return rawSessions
            .filter((session) => {
                const isOffSite = session.distance_meters !== null && !session.is_within_geofence;
                const isRejected = session.approval_status === 'rejected';
                const isApproved = session.approval_status === 'approved';
                const isPending = session.approval_status === 'pending' || (!session.approval_status && session.is_flagged);

                if (activeTab === 'pending' && !isPending) return false;
                if (activeTab === 'offsite' && !isOffSite) return false;
                if (activeTab === 'approved' && !isApproved) return false;
                if (activeTab === 'rejected' && !isRejected) return false;

                const isOvertime = (session.worked_minutes || 0) > 480;
                const isUndertime = session.is_early_departure || session.is_late || (session.undertime_minutes || 0) > 0;
                const isAutoPaused = session.close_mode === 'paused';

                if (anomalyFilter === 'overtime' && !isOvertime) return false;
                if (anomalyFilter === 'undertime' && !isUndertime) return false;
                if (anomalyFilter === 'autopaused' && !isAutoPaused) return false;

                if (workdayFilter !== 'all' && session.date) {
                    const d = new Date(session.date);
                    const day = d.getDay();
                    const isWeekend = day === 0 || day === 6;
                    if (workdayFilter === 'weekdays' && isWeekend) return false;
                    if (workdayFilter === 'weekends' && !isWeekend) return false;
                }

                if (photoFilter === 'with_photo' && !session.photo_url) return false;
                if (photoFilter === 'without_photo' && !session.photo_url) return false;

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
                return timeB - timeA;
            });
    }, [rawSessions, activeTab, anomalyFilter, workdayFilter, photoFilter, sortOrder, searchQuery]);

    const pendingCount = rawSessions.filter((s) => s.approval_status === 'pending' || (!s.approval_status && s.is_flagged)).length;
    const offSiteCount = rawSessions.filter((s) => s.distance_meters !== null && !s.is_within_geofence).length;
    const approvedCount = rawSessions.filter((s) => s.approval_status === 'approved').length;
    const rejectedCount = rawSessions.filter((s) => s.approval_status === 'rejected').length;

    const activeFiltersCount = (activeTab !== 'all' ? 1 : 0)
        + (anomalyFilter !== 'all' ? 1 : 0)
        + (workdayFilter !== 'all' ? 1 : 0)
        + (photoFilter !== 'all' ? 1 : 0)
        + (sortOrder !== 'date_desc' ? 1 : 0)
        + (searchQuery.trim() ? 1 : 0);

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

    const formatSessionDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    const getCleanOperationalFlag = (reason) => {
        if (!reason) return null;
        if (/off-site|assigned workplace|meters|distance/i.test(reason)) {
            return null;
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
                <div className="flex overflow-x-auto pb-2.5 gap-3.5 flex-nowrap snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div className="w-[82vw] max-w-[280px] shrink-0 snap-center sm:w-auto sm:max-w-none p-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
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

                    <div className="w-[82vw] max-w-[280px] shrink-0 snap-center sm:w-auto sm:max-w-none p-4 bg-white rounded-2xl border border-emerald-200/80 shadow-xs flex flex-col justify-between">
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

                    <div className="w-[82vw] max-w-[280px] shrink-0 snap-center sm:w-auto sm:max-w-none p-4 bg-white rounded-2xl border border-amber-200/80 shadow-xs flex flex-col justify-between">
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

                    <div className={`w-[82vw] max-w-[280px] shrink-0 snap-center sm:w-auto sm:max-w-none p-4 rounded-2xl border shadow-xs flex flex-col justify-between ${
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
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200/80 shadow-xs relative min-h-[420px] flex flex-col">
                    <FilterToolbarHeader
                        tabs={[
                            { key: 'all', label: 'All Shifts' },
                            { key: 'pending', label: 'Pending Review', count: pendingCount },
                            { key: 'offsite', label: 'Off-Site', count: offSiteCount },
                            { key: 'approved', label: 'Approved', count: approvedCount },
                            { key: 'rejected', label: 'Rejected', count: rejectedCount },
                        ]}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        searchPlaceholder="Search date or reason..."
                        activeFiltersCount={activeFiltersCount}
                        filterPopoverTitle="Advanced Shift Filters"
                        filterPopoverFields={
                            <TimeCardFilterFields
                                draftAnomaly={draftAnomaly}
                                setDraftAnomaly={setDraftAnomaly}
                                draftWorkday={draftWorkday}
                                setDraftWorkday={setDraftWorkday}
                                draftPhoto={draftPhoto}
                                setDraftPhoto={setDraftPhoto}
                                draftSort={draftSort}
                                setDraftSort={setDraftSort}
                                draftStatus={draftStatus}
                                setDraftStatus={setDraftStatus}
                                department={employee.role || employee.department}
                            />
                        }
                        onApplyFilters={applyDraftFilters}
                        onResetFilters={resetFilters}
                        activeFilterTags={[
                            activeTab !== 'all' && {
                                label: `Status: ${activeTab === 'pending' ? 'Pending Review' : activeTab === 'offsite' ? 'Off-Site' : activeTab === 'approved' ? 'Approved' : 'Rejected'}`,
                                onRemove: () => { setActiveTab('all'); setDraftStatus('all'); },
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
                        ].filter(Boolean)}
                    />

                    {/* Sessions Table */}
                    <div className="flex-1">
                        <TimeCardSessionsTable
                            sessions={filteredSessions}
                            canEdit={canEdit}
                            submittingActionId={submittingActionId}
                            onApproveSession={handleApproveSession}
                            onOpenRejectModal={(id) => {
                                setRejectingSessionId(id);
                                setRejectionReason('');
                            }}
                            onViewPhoto={setSelectedPhotoData}
                            formatSessionDate={formatSessionDate}
                            getCleanOperationalFlag={getCleanOperationalFlag}
                        />
                    </div>
                </div>
            </div>

            {/* ── MOBILE SLIDE-OVER ADVANCED FILTER DRAWER ── */}
            <TimeCardFilterPopover
                isDrawerOpen={isDrawerOpen}
                setIsDrawerOpen={setIsDrawerOpen}
                onReset={resetFilters}
                onApply={applyDraftFilters}
                draftAnomaly={draftAnomaly}
                setDraftAnomaly={setDraftAnomaly}
                draftWorkday={draftWorkday}
                setDraftWorkday={setDraftWorkday}
                draftPhoto={draftPhoto}
                setDraftPhoto={setDraftPhoto}
                draftSort={draftSort}
                setDraftSort={setDraftSort}
                draftStatus={draftStatus}
                setDraftStatus={setDraftStatus}
                department={employee.role || employee.department}
                month={month}
                onMonthChange={handleMonthChange}
            />

            {/* ── PHOTO PROOF INSPECTOR MODAL ── */}
            <TimeCardPhotoModal
                photoData={selectedPhotoData}
                onClose={() => setSelectedPhotoData(null)}
            />

            {/* ── MANAGER REJECTION MODAL ── */}
            <ShiftRejectModal
                isOpen={Boolean(rejectingSessionId)}
                onClose={() => setRejectingSessionId(null)}
                rejectionReason={rejectionReason}
                setRejectionReason={setRejectionReason}
                onConfirm={handleRejectSession}
                isSubmitting={submittingActionId === rejectingSessionId}
            />
        </>
    );
}

TimeCardAudit.layout = (page) => <SellerWorkspaceLayout active="hr">{page}</SellerWorkspaceLayout>;
