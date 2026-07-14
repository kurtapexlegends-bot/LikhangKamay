import React, { useDeferredValue, useMemo, useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import SellerHeader from '@/Layouts/SellerHeader';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import { Printer, ReceiptText } from 'lucide-react';
import ExportButton from '@/Components/ExportButton';

import {
    summaryCards,
    categoryOptions,
    actorTypeLabel,
    moduleLabel,
    formatDateTime,
    formatRelative,
    formatStatusLabel,
    dayLabel,
    toDateInputValue
} from '@/utils/auditLogHelpers';

import AuditLogFilters from '@/Components/Seller/Profile/AuditLogFilters';
import AuditLogsList from '@/Components/Seller/Profile/AuditLogsList';
import LogDetailsModal from '@/Components/Seller/Profile/LogDetailsModal';

export default function AuditLog({ auth, auditLog }) {
    const { flash = {} } = usePage().props;
    const { addToast } = useToast();
    useFlashToast(flash, addToast);

    const { openSidebar } = useSellerWorkspaceShell();
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedModule, setSelectedModule] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedSeverity, setSelectedSeverity] = useState('all');
    const [selectedActor, setSelectedActor] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const deferredSearch = useDeferredValue(searchTerm);

    // Selected log entry for mobile bottom sheet details drawer
    const [selectedDetailEntry, setSelectedDetailEntry] = useState(null);

    const entries = auditLog?.entries || [];
    const latestEventAt = auditLog?.summary?.latest_event_at;
    const coverage = auditLog?.summary?.coverage || [];

    const moduleOptions = useMemo(() => {
        const options = Array.from(new Set(entries.map((entry) => entry.module).filter(Boolean)));
        return ['all', ...options];
    }, [entries]);

    const actorOptions = useMemo(() => {
        const options = Array.from(new Set(entries.map((entry) => entry.actor_type).filter(Boolean)));
        return ['all', ...options];
    }, [entries]);

    const statusOptions = useMemo(() => {
        const options = Array.from(new Set(entries.map((entry) => entry.status).filter(Boolean)));
        return ['all', ...options];
    }, [entries]);

    const severityOptions = useMemo(() => {
        const options = Array.from(new Set(entries.map((entry) => entry.severity).filter(Boolean)));
        return ['all', ...options];
    }, [entries]);

    const filteredEntries = useMemo(() => {
        const normalizedSearch = deferredSearch.trim().toLowerCase();
        const startTimestamp = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
        const endTimestamp = endDate ? new Date(`${endDate}T23:59:59`).getTime() : null;

        return entries.filter((entry) => {
            if (selectedCategory !== 'all' && entry.category !== selectedCategory) return false;
            if (selectedModule !== 'all' && entry.module !== selectedModule) return false;
            if (selectedStatus !== 'all' && entry.status !== selectedStatus) return false;
            if (selectedSeverity !== 'all' && entry.severity !== selectedSeverity) return false;
            if (selectedActor !== 'all' && entry.actor_type !== selectedActor) return false;

            if (startTimestamp || endTimestamp) {
                const occurredAt = entry.occurred_at ? new Date(entry.occurred_at).getTime() : null;
                if (!occurredAt) return false;
                if (startTimestamp && occurredAt < startTimestamp) return false;
                if (endTimestamp && occurredAt > endTimestamp) return false;
            }

            if (!normalizedSearch) return true;

            const searchHaystack = [
                entry.title,
                entry.summary,
                entry.subject,
                entry.reference,
                entry.actor_name,
                entry.actor_type,
                entry.module,
                entry.event_type,
                ...(entry.detail_lines || []),
                ...Object.entries(entry.before || {}).map(([key, value]) => `${key} ${value}`),
                ...Object.entries(entry.after || {}).map(([key, value]) => `${key} ${value}`),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return searchHaystack.includes(normalizedSearch);
        });
    }, [deferredSearch, endDate, entries, selectedActor, selectedCategory, selectedModule, selectedSeverity, selectedStatus, startDate]);

    const groupedEntries = useMemo(() => {
        const groups = new Map();

        filteredEntries.forEach((entry) => {
            const key = toDateInputValue(entry.occurred_at) || 'unknown';
            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    label: dayLabel(entry.occurred_at),
                    entries: [],
                });
            }
            groups.get(key).entries.push(entry);
        });

        return Array.from(groups.values());
    }, [filteredEntries]);

    const exportCsv = () => {
        const headers = [
            'Occurred At',
            'Category',
            'Module',
            'Event Type',
            'Severity',
            'Status',
            'Title',
            'Summary',
            'Actor',
            'Actor Type',
            'Subject',
            'Reference',
            'Amount',
            'Details',
        ];

        const rows = filteredEntries.map((entry) => ([
            formatDateTime(entry.occurred_at),
            entry.category || '',
            moduleLabel[entry.module] || formatStatusLabel(entry.module),
            entry.event_type || '',
            formatStatusLabel(entry.severity),
            formatStatusLabel(entry.status),
            entry.title || '',
            entry.summary || '',
            entry.actor_name || '',
            actorTypeLabel[entry.actor_type] || formatStatusLabel(entry.actor_type),
            entry.subject || '',
            entry.reference || '',
            entry.amount_label || '',
            [
                ...(entry.detail_lines || []),
                ...Object.entries(entry.before || {}).map(([key, value]) => `Before ${key}: ${value}`),
                ...Object.entries(entry.after || {}).map(([key, value]) => `After ${key}: ${value}`),
            ].join(' | '),
        ]));

        const csv = [headers, ...rows]
            .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
    };

    const resetFilters = () => {
        setSelectedCategory('all');
        setSelectedModule('all');
        setSelectedStatus('all');
        setSelectedSeverity('all');
        setSelectedActor('all');
        setStartDate('');
        setEndDate('');
        setSearchTerm('');
    };

    const handleEntryClick = (entry) => {
        // Trigger responsive bottom details sheet on mobile/tablet viewports (< 1024px)
        if (window.innerWidth < 1024) {
            setSelectedDetailEntry(entry);
        }
    };

    return (
        <>
            <Head title="Audit Log Center" />
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    /* Hide layout sidebar, header navigation, buttons, and system controls */
                    aside,
                    nav,
                    header,
                    .no-print,
                    .mobile-dock,
                    #nprogress,
                    .fixed,
                    button,
                    a {
                        display: none !important;
                    }

                    /* Reset layout containers margins, paddings, and heights to prevent page cutting */
                    html, body, #app, .h-screen, .overflow-hidden, [scroll-region="true"], main {
                        background: white !important;
                        color: black !important;
                        height: auto !important;
                        min-height: 0 !important;
                        overflow: visible !important;
                        position: static !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    /* Remove sidebar offset margins on print */
                    .lg\\:ml-52,
                    .lg\\:ml-16,
                    .lg\\:ml-20,
                    [class*="lg:ml-"] {
                        margin-left: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    /* Hide filters, header action buttons, and mobile swipe pills */
                    .bg-\\[\\#FCF7F2\\]\\/30,
                    .md\\:hidden.divide-y,
                    .lg\\:hidden.border-b.border-stone-100.bg-\\[\\#FCF7F2\\]\\/30,
                    [class*="AuditLogFilters"] {
                        display: none !important;
                    }

                    /* Apply border styles to white boxes in print */
                    .bg-white {
                        border: 1px solid #e5e7eb !important;
                        box-shadow: none !important;
                        border-radius: 12px !important;
                        background-color: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    @page {
                        size: portrait;
                        margin: 12mm 15mm 12mm 15mm !important;
                    }

                    /* Grid layouts preservation under print */
                    .grid {
                        display: grid !important;
                    }
                    
                    /* Force KPI summary cards to display as a 3-column grid on print */
                    .flex.overflow-x-auto.whitespace-nowrap {
                        display: grid !important;
                        grid-template-columns: repeat(3, 1fr) !important;
                        gap: 16px !important;
                        white-space: normal !important;
                    }
                    .w-\\[200px\\] {
                        width: auto !important;
                    }

                    /* Fix 3D and flex layout elements inside listing articles */
                    article {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }

                    /* Force hidden details and diffs to show on print */
                    .hidden.lg\\:block {
                        display: block !important;
                    }
                    .hidden.lg\\:grid {
                        display: grid !important;
                        grid-template-columns: repeat(2, 1fr) !important;
                        gap: 16px !important;
                    }
                    .hidden.sm\\:inline-flex {
                        display: inline-flex !important;
                    }
                    .hidden.md\\:inline-flex {
                        display: inline-flex !important;
                    }

                    /* Enable backgrounds on badges and labels in print */
                    .bg-stone-50, .bg-emerald-50, .bg-clay-50, .bg-amber-50, .bg-stone-100 {
                        background-color: #f9f9f9 !important;
                        border: 1px solid #e5e7eb !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}} />

            {/* Print-Only Document Header */}
            <div className="hidden print:block border-b-2 border-stone-200 pb-4 mb-6">
                <h1 className="text-2xl font-bold text-stone-900">LikhangKamay Activity Ledger</h1>
                <p className="text-xs text-stone-500 mt-1">
                    Generated on: {new Date().toLocaleString()}
                </p>
            </div>

            <SellerHeader
                title="Activity Log Center"
                subtitle="Review security actions, staff access logs, and billing history."
                auth={auth}
                onMenuClick={openSidebar}
                badge={{ label: 'Workspace Oversight', iconColor: 'text-stone-400' }}
                actions={
                    <>
                        <ExportButton onClick={() => setTimeout(() => window.print(), 150)} icon={Printer}>
                            Print
                        </ExportButton>
                        <ExportButton
                            href={route('audit-log.export', {
                                category: selectedCategory,
                                module: selectedModule,
                                status: selectedStatus,
                                severity: selectedSeverity,
                                actor_type: selectedActor,
                                start_date: startDate,
                                end_date: endDate,
                                search: searchTerm,
                            })}
                            variant="primary"
                        >
                            Export
                        </ExportButton>
                    </>
                }
            />

            <main className="flex-1 w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
                {/* KPI summary cards */}
                <section className="mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div className="flex overflow-x-auto whitespace-nowrap scrollbar-none gap-4 pb-3 sm:grid sm:grid-cols-2 lg:grid-cols-5">
                        {summaryCards.map(({ key, label, icon: Icon, tone }) => (
                            <div key={key} className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-4 lg:p-5 shadow-sm w-[200px] shrink-0 sm:w-auto sm:shrink">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 truncate">{label}</p>
                                        <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mt-1">{auditLog?.summary?.[key] ?? 0}</h3>
                                    </div>
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                                        <Icon size={20} strokeWidth={2.5} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Main activities section */}
                <section className="rounded-[1.5rem] border border-stone-200 bg-white shadow-sm overflow-hidden mb-12 sm:mb-0">
                    {/* Activity Ledger Header */}
                    <div className="border-b border-stone-100 px-5 py-6 sm:px-8">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h2 className="text-xl font-bold tracking-tight text-stone-900">Activity Ledger</h2>
                                <p className="mt-1 max-w-2xl text-[12px] font-medium leading-tight text-stone-500">
                                    Search, filter, and review specific workspace events.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">Latest</span>
                                <span className="h-1 w-1 rounded-full bg-stone-300" />
                                <span className="text-[12px] font-bold text-stone-800">{formatRelative(latestEventAt)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Category Pill Swiper */}
                    <div className="block lg:hidden border-b border-stone-100 bg-[#FCF7F2]/30 px-5 py-3">
                        <div className="flex overflow-x-auto whitespace-nowrap scrollbar-none gap-2">
                            {categoryOptions.map((option) => {
                                const isActive = selectedCategory === option.key;
                                return (
                                    <button
                                        key={option.key}
                                        type="button"
                                        onClick={() => setSelectedCategory(option.key)}
                                        className={`inline-flex items-center justify-center h-9 px-4 rounded-full text-xs font-bold transition-all active:scale-95 ${
                                            isActive
                                                ? 'bg-clay-700 text-white shadow-sm'
                                                : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Unified Filters Component */}
                    <AuditLogFilters
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        startDate={startDate}
                        setStartDate={setStartDate}
                        endDate={endDate}
                        setEndDate={setEndDate}
                        selectedCategory={selectedCategory}
                        setSelectedCategory={setSelectedCategory}
                        selectedModule={selectedModule}
                        setSelectedModule={setSelectedModule}
                        selectedStatus={selectedStatus}
                        setSelectedStatus={setSelectedStatus}
                        selectedSeverity={selectedSeverity}
                        setSelectedSeverity={setSelectedSeverity}
                        selectedActor={selectedActor}
                        setSelectedActor={setSelectedActor}
                        resetFilters={resetFilters}
                        categoryOptions={categoryOptions}
                        moduleOptions={moduleOptions}
                        statusOptions={statusOptions}
                        severityOptions={severityOptions}
                        actorOptions={actorOptions}
                        moduleLabel={moduleLabel}
                        actorTypeLabel={actorTypeLabel}
                        formatStatusLabel={formatStatusLabel}
                        filteredCount={filteredEntries.length}
                    />

                    {/* Grouped Logs Timeline List */}
                    {groupedEntries.length ? (
                        <AuditLogsList
                            groupedEntries={groupedEntries}
                            onEntryClick={handleEntryClick}
                        />
                    ) : (
                        <WorkspaceEmptyState
                            icon={ReceiptText}
                            title="No audit activity found"
                            description="Try a broader date range or clear the filters to review more workspace history."
                        />
                    )}

                    {/* Coverage footer */}
                    <div className="border-t border-stone-100 px-5 py-4 sm:px-8 bg-stone-50/50">
                        <div className="flex flex-wrap gap-2">
                            {coverage.map((source) => (
                                <span
                                    key={source.key}
                                    className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium ${
                                        source.available
                                            ? 'border-stone-200 bg-white text-stone-500'
                                            : 'border-amber-200 bg-amber-50 text-amber-700'
                                    }`}
                                >
                                    <span>{source.label}</span>
                                    <span className="mx-1 h-1 w-1 rounded-full bg-current opacity-50" />
                                    <span>{source.count}</span>
                                </span>
                            ))}
                        </div>
                        {auditLog?.summary?.missing_sources?.length ? (
                            <p className="mt-2 text-[10px] font-bold text-amber-700 uppercase tracking-widest">
                                Partial coverage: {auditLog.summary.missing_sources.join(', ')} missing.
                            </p>
                        ) : null}
                    </div>
                </section>
            </main>

            {/* Mobile / Tablet Details slide-up drawer */}
            <LogDetailsModal
                isOpen={!!selectedDetailEntry}
                onClose={() => setSelectedDetailEntry(null)}
                entry={selectedDetailEntry}
            />
        </>
    );
}

AuditLog.layout = (page) => <SellerWorkspaceLayout active="audit-log">{page}</SellerWorkspaceLayout>;
