/* global route */
import React, { useState, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import SellerHeader from '@/Layouts/SellerHeader';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import { useToast } from '@/Components/ToastContext';
import UserAvatar from '@/Components/UserAvatar';
import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';
import KPICard from '@/Components/KPICard';
import {
    ArrowLeft, Clock, AlertCircle,
    TrendingUp, AlertTriangle, Building2, ShieldCheck, Plus
} from 'lucide-react';

import { TimeCardFilterFields } from '@/Components/Seller/HR/TimeCardFilterPopover';
import ShiftRejectModal from '@/Components/Seller/HR/ShiftRejectModal';
import TimeCardSessionsTable from '@/Components/Seller/HR/TimeCardSessionsTable';
import TimeCardPhotoModal from '@/Components/Seller/HR/TimeCardPhotoModal';
import EmployeeDocumentsTable from '@/Components/Seller/HR/EmployeeDocumentsTable';
import EmployeeDocumentUploadModal from '@/Components/Seller/HR/EmployeeDocumentUploadModal';

export default function TimeCardAudit({
    auth,
    employee,
    summary,
    selectedMonth,
    canEdit,
    documents = [],
    documentTypes = {},
    initialTab = 'shifts',
}) {
    const { openSidebar } = useSellerWorkspaceShell();
    const { addToast } = useToast();

    const [activeTab, setActiveTab] = useState(initialTab === 'documents' ? 'documents' : 'all');
    const [searchQuery, setSearchQuery] = useState('');
    const [month, setMonth] = useState(selectedMonth || new Date().toISOString().slice(0, 7));
    const [selectedPhotoData, setSelectedPhotoData] = useState(null);
    const [rejectingSessionId, setRejectingSessionId] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [submittingActionId, setSubmittingActionId] = useState(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    // Document Filter States
    const [docCategoryFilter, setDocCategoryFilter] = useState('all');
    const [draftDocCategory, setDraftDocCategory] = useState('all');

    // Advanced Filter States
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
            { month: newMonth, tab: activeTab === 'documents' ? 'documents' : 'shifts' },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleTabChange = (nextTab) => {
        setActiveTab(nextTab);
        if (nextTab !== 'documents') {
            setDraftStatus(nextTab);
        }
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', nextTab === 'documents' ? 'documents' : 'shifts');
            const currentState = window.history.state;
            const nextState = currentState && typeof currentState === 'object'
                ? { ...currentState, url: `${url.pathname}${url.search}${url.hash}` }
                : currentState;
            window.history.replaceState(nextState, '', url.toString());
        }
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
                addToast('Shift declined and excluded from payroll calculation.', 'info');
                setRejectingSessionId(null);
                setRejectionReason('');
                refreshLogs();
            })
            .catch((err) => {
                addToast(err.response?.data?.message || 'Failed to decline shift.', 'error');
            })
            .finally(() => setSubmittingActionId(null));
    };

    const applyDraftFilters = () => {
        if (activeTab === 'documents') {
            setDocCategoryFilter(draftDocCategory);
            return;
        }
        setActiveTab(draftStatus);
        setAnomalyFilter(draftAnomaly);
        setWorkdayFilter(draftWorkday);
        setPhotoFilter(draftPhoto);
        setSortOrder(draftSort);
    };

    const resetFilters = () => {
        setSearchQuery('');
        if (activeTab === 'documents') {
            setDocCategoryFilter('all');
            setDraftDocCategory('all');
            return;
        }
        setActiveTab('all');
        setDraftStatus('all');
        setAnomalyFilter('all');
        setWorkdayFilter('all');
        setPhotoFilter('all');
        setSortOrder('date_desc');
        setDraftAnomaly('all');
        setDraftWorkday('all');
        setDraftPhoto('all');
        setDraftSort('date_desc');
    };

    const rawSessions = useMemo(() => summary?.sessions || [], [summary?.sessions]);
    const isDocumentsTab = activeTab === 'documents';

    const filteredDocuments = useMemo(() => {
        return (Array.isArray(documents) ? documents : []).filter((doc) => {
            if (docCategoryFilter !== 'all' && doc.document_type !== docCategoryFilter) {
                return false;
            }
            if (isDocumentsTab && searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return (
                    (doc.title && doc.title.toLowerCase().includes(q)) ||
                    (doc.original_filename && doc.original_filename.toLowerCase().includes(q)) ||
                    (doc.document_type_label && doc.document_type_label.toLowerCase().includes(q)) ||
                    (doc.notes && doc.notes.toLowerCase().includes(q))
                );
            }
            return true;
        });
    }, [documents, docCategoryFilter, isDocumentsTab, searchQuery]);

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

    const activeFiltersCount = isDocumentsTab
        ? (docCategoryFilter !== 'all' ? 1 : 0) + (searchQuery.trim() ? 1 : 0)
        : (activeTab !== 'all' ? 1 : 0)
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
            <Head title={`${employee.name} - Employee Records`} />
            <SellerHeader
                title="Employee Records"
                subtitle={`Manage shift logs and employee documents for ${employee.name}.`}
                auth={auth}
                onMenuClick={openSidebar}
            />

            <main className="flex-1 w-full min-w-0 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 space-y-6">
                {/* ── HEADER PROFILE BANNER ── */}
                <div className="bg-white rounded-3xl border border-stone-200/80 p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                        <div className="relative shrink-0">
                            <UserAvatar user={avatarUser} className="w-12 h-12 sm:w-14 sm:h-14 text-base sm:text-lg rounded-2xl" />
                            <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ${statusDotColor} border-2 border-white`} title={statusTitle} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-base sm:text-lg font-black text-stone-900 tracking-tight truncate">{employee.name}</h1>
                                <span className="text-[11px] font-bold text-stone-700 bg-stone-100 border border-stone-200/80 px-2.5 py-0.5 rounded-full">
                                    {employee.role || 'Staff Member'}
                                </span>
                            </div>
                            <div className="text-xs text-stone-500 font-medium mt-1.5 flex flex-wrap items-center gap-2 sm:gap-2.5">
                                <span className="inline-flex items-center font-mono text-[11px] font-bold text-stone-700 bg-stone-100/80 px-2 py-0.5 rounded-md border border-stone-200/80">
                                    {employee.employee_id || `#EMP-${employee.id}`}
                                </span>
                                <span className="text-stone-300">•</span>
                                <span className="inline-flex items-center gap-1.5 text-stone-700 font-semibold truncate">
                                    <Building2 size={13} className="text-stone-400 shrink-0" />
                                    {employee.assigned_location?.name || 'Main Workshop'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end shrink-0 pt-2.5 md:pt-0 border-t md:border-t-0 border-stone-100">
                        {!isDocumentsTab && (
                            <div className="flex items-center gap-2">
                                <label htmlFor="employee-record-period" className="text-xs font-semibold text-stone-500">
                                    Period:
                                </label>
                                <input
                                    id="employee-record-period"
                                    type="month"
                                    value={month}
                                    onChange={(e) => handleMonthChange(e.target.value)}
                                    className="rounded-xl border border-stone-200 bg-stone-50/70 px-3 py-2 text-xs font-bold text-stone-800 outline-none focus:border-clay-500 focus:bg-white transition shadow-2xs min-h-[42px]"
                                />
                            </div>
                        )}
                        <Link
                            href={route('hr.index')}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-stone-700 bg-white border border-stone-200/90 hover:bg-stone-50 rounded-xl transition min-h-[42px] active:scale-95 shadow-2xs"
                        >
                            <ArrowLeft size={14} /> Back
                        </Link>
                    </div>
                </div>

                {/* ── 4 NATIVE OPERATIONAL KPI STAT CARDS ── */}
                <div className="flex overflow-x-auto pb-2.5 gap-3 flex-nowrap snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div className="w-[82vw] max-w-[280px] shrink-0 snap-center sm:w-auto sm:max-w-none">
                        <KPICard
                            title="Total Worked"
                            value={`${summary?.total_worked_hours || 0} hrs`}
                            subtitle={`${summary?.total_sessions || 0} shifts recorded`}
                            icon={Clock}
                            color="text-clay-600"
                            bg="bg-[#FCF7F2]"
                            animate={false}
                        />
                    </div>

                    <div className="w-[82vw] max-w-[280px] shrink-0 snap-center sm:w-auto sm:max-w-none">
                        <KPICard
                            title="Approved Overtime"
                            value={`${summary?.overtime_hours || 0} hrs`}
                            subtitle="Beyond daily shift"
                            icon={TrendingUp}
                            color="text-emerald-600"
                            bg="bg-emerald-50"
                            animate={false}
                        />
                    </div>

                    <div className="w-[82vw] max-w-[280px] shrink-0 snap-center sm:w-auto sm:max-w-none">
                        <KPICard
                            title="Undertime Deduction"
                            value={`${summary?.undertime_hours || 0} hrs`}
                            subtitle="Short of scheduled hours"
                            icon={AlertTriangle}
                            color="text-amber-600"
                            bg="bg-amber-50"
                            animate={false}
                        />
                    </div>

                    <div className="w-[82vw] max-w-[280px] shrink-0 snap-center sm:w-auto sm:max-w-none">
                        <KPICard
                            title="Audit Review Queue"
                            value={pendingCount > 0 ? `${pendingCount} pending` : 'All Cleared'}
                            subtitle={pendingCount > 0 ? 'Requires manager review' : 'Ready for payroll run'}
                            icon={pendingCount > 0 ? AlertCircle : ShieldCheck}
                            color={pendingCount > 0 ? 'text-amber-600' : 'text-emerald-600'}
                            bg={pendingCount > 0 ? 'bg-amber-50' : 'bg-emerald-50'}
                            animate={false}
                        />
                    </div>
                </div>

                {/* ── UNIFIED TABLE & FILTER CARD ── */}
                <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm relative min-h-[360px] flex flex-col">
                    <FilterToolbarHeader
                        containerClassName="rounded-t-3xl border-x-0 border-t-0 border-b border-stone-200/80 shadow-none bg-stone-50/40"
                        tabs={[
                            { key: 'all', label: 'All Shifts' },
                            { key: 'pending', label: 'Pending Review', count: pendingCount },
                            { key: 'offsite', label: 'Off-Site', count: offSiteCount },
                            { key: 'approved', label: 'Approved', count: approvedCount },
                            { key: 'rejected', label: 'Declined', count: rejectedCount },
                            { key: 'documents', label: 'Documents', count: documents.length },
                        ]}
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        searchPlaceholder={isDocumentsTab ? 'Search document title, filename, category...' : 'Search date or reason...'}
                        activeFiltersCount={activeFiltersCount}
                        filterPopoverTitle={isDocumentsTab ? 'Filter Document Category' : 'Advanced Shift Filters'}
                        filterPopoverFields={
                            isDocumentsTab ? (
                                <div>
                                    <label
                                        htmlFor="doc-category-filter"
                                        className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5"
                                    >
                                        Document Category
                                    </label>
                                    <select
                                        id="doc-category-filter"
                                        value={draftDocCategory}
                                        onChange={(e) => setDraftDocCategory(e.target.value)}
                                        className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-800 outline-none focus:border-clay-500 bg-white cursor-pointer"
                                    >
                                        <option value="all">All Categories</option>
                                        {Object.entries(documentTypes).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
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
                            )
                        }
                        extraActions={
                            isDocumentsTab && canEdit ? (
                                <button
                                    type="button"
                                    onClick={() => setIsUploadModalOpen(true)}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-clay-600 px-3.5 h-[38px] min-h-[38px] text-xs font-bold text-white shadow-2xs transition hover:bg-clay-700 active:scale-95 shrink-0 cursor-pointer"
                                >
                                    <Plus size={14} />
                                    <span className="hidden sm:inline">Add Document</span>
                                    <span className="sm:hidden">Add</span>
                                </button>
                            ) : null
                        }
                        onApplyFilters={applyDraftFilters}
                        onResetFilters={resetFilters}
                        activeFilterTags={
                            isDocumentsTab
                                ? [
                                    docCategoryFilter !== 'all' && {
                                        label: `Category: ${documentTypes[docCategoryFilter] || docCategoryFilter}`,
                                        onRemove: () => { setDocCategoryFilter('all'); setDraftDocCategory('all'); },
                                    },
                                ].filter(Boolean)
                                : [
                                    activeTab !== 'all' && {
                                        label: `Status: ${activeTab === 'pending' ? 'Pending Review' : activeTab === 'offsite' ? 'Off-Site' : activeTab === 'approved' ? 'Approved' : 'Declined'}`,
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
                                ].filter(Boolean)
                        }
                    />

                    {/* Tab Table Content */}
                    <div className="flex-1">
                        {isDocumentsTab ? (
                            <EmployeeDocumentsTable
                                employeeId={employee.id}
                                documents={filteredDocuments}
                                documentTypes={documentTypes}
                                canEdit={canEdit}
                                onOpenUploadModal={() => setIsUploadModalOpen(true)}
                            />
                        ) : (
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
                        )}
                    </div>
                </div>
            </main>

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

            {/* ── EMPLOYEE DOCUMENT UPLOAD MODAL ── */}
            <EmployeeDocumentUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                employeeId={employee.id}
                documentTypes={documentTypes}
            />
        </>
    );
}

TimeCardAudit.layout = (page) => <SellerWorkspaceLayout active="hr">{page}</SellerWorkspaceLayout>;
