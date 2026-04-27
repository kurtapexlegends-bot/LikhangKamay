import React, { useDeferredValue, useMemo, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import SellerHeader from '@/Components/SellerHeader';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import {
    ArrowUpRight,
    Banknote,
    ChevronDown,
    ClipboardList,
    Crown,
    Download,
    Filter,
    LogOut,
    Menu,
    Printer,
    ReceiptText,
    Search,
    Settings2,
    ShieldCheck,
    User,
} from 'lucide-react';
import ExportButton from '@/Components/ExportButton';

const summaryCards = [
    { key: 'total_events', label: 'Total Logged Events', icon: ClipboardList, tone: 'bg-[#FCF7F2] text-clay-700' },
    { key: 'operations_events', label: 'Operational Events', icon: Settings2, tone: 'bg-sky-50 text-sky-700' },
    { key: 'staff_events', label: 'Staff Activity', icon: ShieldCheck, tone: 'bg-stone-100 text-stone-700' },
    { key: 'finance_events', label: 'Finance Reviews', icon: Banknote, tone: 'bg-[#F2FAF6] text-emerald-700' },
    { key: 'billing_events', label: 'Billing Activity', icon: Crown, tone: 'bg-[#FFF7ED] text-amber-700' },
];

const categoryOptions = [
    { key: 'all', label: 'All activity' },
    { key: 'operations', label: 'Operations' },
    { key: 'staff', label: 'Staff access' },
    { key: 'finance', label: 'Finance' },
    { key: 'billing', label: 'Billing' },
];

const categoryMeta = {
    operations: {
        label: 'Operations',
        icon: Settings2,
        chip: 'bg-sky-50 text-sky-700 border-sky-200',
        iconWrap: 'bg-sky-50 text-sky-700 border-sky-100',
    },
    staff: {
        label: 'Staff Management',
        icon: ShieldCheck,
        chip: 'bg-stone-100 text-stone-700 border-stone-200',
        iconWrap: 'bg-stone-50 text-stone-600 border-stone-200',
    },
    finance: {
        label: 'Finance Reviews',
        icon: Banknote,
        chip: 'bg-[#F2FAF6] text-emerald-700 border-emerald-200',
        iconWrap: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    },
    billing: {
        label: 'Shop Billing',
        icon: Crown,
        chip: 'bg-[#FFF7ED] text-amber-700 border-amber-200',
        iconWrap: 'bg-amber-50 text-amber-700 border-amber-100',
    },
};

const severityTone = {
    info: 'bg-sky-50 text-sky-700 border-sky-200/70',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/70',
    danger: 'bg-red-50 text-red-700 border-red-200/70',
};

const statusTone = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200/60',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    rejected: 'bg-red-50 text-red-700 border-red-200/60',
    failed: 'bg-red-50 text-red-700 border-red-200/60',
    cancelled: 'bg-stone-100 text-stone-600 border-stone-200',
    ordered: 'bg-sky-50 text-sky-700 border-sky-200/60',
    accounting_approved: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    completed: 'bg-stone-100 text-stone-600 border-stone-200',
    updated: 'bg-stone-100 text-stone-600 border-stone-200',
    archived: 'bg-stone-100 text-stone-600 border-stone-200',
    removed: 'bg-red-50 text-red-700 border-red-200/60',
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    draft: 'bg-amber-50 text-amber-700 border-amber-200/60',
    refund_return: 'bg-red-50 text-red-700 border-red-200/60',
    refunded: 'bg-red-50 text-red-700 border-red-200/60',
};

const actorTypeLabel = {
    owner: 'Owner',
    staff: 'Staff',
    admin: 'Admin',
    buyer: 'Buyer',
    system: 'System',
};

const moduleLabel = {
    orders: 'Orders',
    products: 'Products',
    reviews: 'Reviews',
    shop_settings: 'Shop Settings',
    hr: 'People & Payroll',
    accounting: 'Finance',
    stock_requests: 'Restock Requests',
    subscription: 'Subscription',
};

const formatDateTime = (value) => value
    ? new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(value))
    : 'No logged time';

const formatRelative = (value) => {
    if (!value) return 'No recent activity';

    const now = Date.now();
    const target = new Date(value).getTime();
    const diffMinutes = Math.round((target - now) / 60000);
    const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    if (Math.abs(diffMinutes) < 60) {
        return formatter.format(diffMinutes, 'minute');
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) {
        return formatter.format(diffHours, 'hour');
    }

    const diffDays = Math.round(diffHours / 24);
    return formatter.format(diffDays, 'day');
};

const formatStatusLabel = (status) => String(status || 'logged')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const dayLabel = (value) => value
    ? new Intl.DateTimeFormat('en-PH', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(value))
    : 'Unknown Date';

const toDateInputValue = (value) => {
    if (!value) return '';

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return '';
    }

    return parsed.toISOString().slice(0, 10);
};

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
            if (selectedCategory !== 'all' && entry.category !== selectedCategory) {
                return false;
            }

            if (selectedModule !== 'all' && entry.module !== selectedModule) {
                return false;
            }

            if (selectedStatus !== 'all' && entry.status !== selectedStatus) {
                return false;
            }

            if (selectedSeverity !== 'all' && entry.severity !== selectedSeverity) {
                return false;
            }

            if (selectedActor !== 'all' && entry.actor_type !== selectedActor) {
                return false;
            }

            if (startTimestamp || endTimestamp) {
                const occurredAt = entry.occurred_at ? new Date(entry.occurred_at).getTime() : null;

                if (!occurredAt) {
                    return false;
                }

                if (startTimestamp && occurredAt < startTimestamp) {
                    return false;
                }

                if (endTimestamp && occurredAt > endTimestamp) {
                    return false;
                }
            }

            if (!normalizedSearch) {
                return true;
            }

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

    return (
        <>
            <Head title="Audit Log Center" />
            <SellerHeader
                title="Activity Log Center"
                subtitle="Owner-only record for staff access, operations, finance reviews, and billing activity."
                auth={auth}
                onMenuClick={openSidebar}
                badge={{ label: 'Workspace Oversight', iconColor: 'text-stone-400' }}
                actions={
                    <>
                        <ExportButton onClick={() => window.print()} icon={Printer}>
                            Print
                        </ExportButton>
                        <ExportButton onClick={exportCsv} variant="primary">
                            Export CSV
                        </ExportButton>
                    </>
                }
            />

            <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <section className="mb-6">
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
                        {summaryCards.map(({ key, label, icon: Icon, tone }) => (
                            <div key={key} className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{label}</p>
                                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{auditLog?.summary?.[key] ?? 0}</h3>
                                    </div>
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                                        <Icon size={20} strokeWidth={2.5} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-[1.5rem] border border-stone-200 bg-white shadow-sm overflow-hidden">
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

                    <div className="px-5 py-4 sm:px-8 border-b border-stone-100 bg-[#FCF7F2]/30">
                        {/* Top Row: Search and Action/Status */}
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <label className="relative flex-1 block w-full">
                                <Search size={16} strokeWidth={2.5} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                                <input
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Search details, actor, subject, reference..."
                                    className="w-full rounded-xl border border-stone-200 bg-white pl-10 pr-4 py-2.5 text-sm font-bold text-stone-900 shadow-sm outline-none transition-all focus:border-clay-500 focus:ring-2 focus:ring-clay-100 placeholder:font-medium placeholder:text-stone-400 hover:border-stone-300"
                                />
                            </label>

                            <div className="flex items-center gap-4 shrink-0 self-end md:self-auto w-full md:w-auto justify-between md:justify-end">
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="text-xs font-bold text-stone-500 hover:text-clay-700 transition"
                                >
                                    Reset filters
                                </button>
                                <span className="inline-flex items-center rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-bold uppercase tracking-widest text-stone-600 shadow-sm">
                                    {filteredEntries.length} Visible
                                </span>
                            </div>
                        </div>

                        {/* Bottom Row: Date Range & Dropdowns */}
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
                            <div className="sm:col-span-2 xl:col-span-3 flex items-center bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-clay-100 focus-within:border-clay-500 transition-all h-[38px]">
                                <DateInput label="From" value={startDate} onChange={setStartDate} />
                                <div className="h-full w-px bg-stone-200 shrink-0"></div>
                                <DateInput label="To" value={endDate} onChange={setEndDate} />
                            </div>
                            
                            <FilterSelect value={selectedCategory} onChange={setSelectedCategory} options={categoryOptions.map((option) => [option.key, option.label])} />
                            <FilterSelect value={selectedModule} onChange={setSelectedModule} options={moduleOptions.map((option) => [option, option === 'all' ? 'All modules' : (moduleLabel[option] || formatStatusLabel(option))])} />
                            <FilterSelect value={selectedStatus} onChange={setSelectedStatus} options={statusOptions.map((option) => [option, option === 'all' ? 'All statuses' : formatStatusLabel(option)])} />
                            <FilterSelect value={selectedSeverity} onChange={setSelectedSeverity} options={severityOptions.map((option) => [option, option === 'all' ? 'All severities' : formatStatusLabel(option)])} />
                            <FilterSelect value={selectedActor} onChange={setSelectedActor} options={actorOptions.map((option) => [option, option === 'all' ? 'All actors' : (actorTypeLabel[option] || formatStatusLabel(option))])} />
                        </div>
                    </div>

                    {groupedEntries.length ? (
                        <div className="divide-y divide-stone-100">
                            {groupedEntries.map((group) => (
                                <div key={group.key}>
                                    <div className="sticky top-0 z-10 border-b border-stone-100 bg-stone-50/90 px-6 py-2 backdrop-blur-sm">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">{group.label}</p>
                                    </div>

                                    <div className="divide-y divide-stone-100">
                                        {group.entries.map((entry) => {
                                            const meta = categoryMeta[entry.category] || categoryMeta.operations;
                                            const Icon = meta.icon;
                                            const statusClass = statusTone[entry.status] || 'bg-stone-100 text-stone-600 border-stone-200';
                                            const severityClass = severityTone[entry.severity] || severityTone.info;

                                            return (
                                                <article key={entry.id} className="group px-5 py-4 sm:px-8 hover:bg-stone-50/50 transition-colors">
                                                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                                        <div className="flex min-w-0 gap-3">
                                                            <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-transform group-hover:scale-105 ${meta.iconWrap}`}>
                                                                <Icon size={16} strokeWidth={2.5} />
                                                            </div>

                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${meta.chip}`}>
                                                                        {meta.label}
                                                                    </span>
                                                                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${severityClass}`}>
                                                                        {formatStatusLabel(entry.severity)}
                                                                    </span>
                                                                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${statusClass}`}>
                                                                        {formatStatusLabel(entry.status)}
                                                                    </span>
                                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">
                                                                        {formatRelative(entry.occurred_at)}
                                                                    </span>
                                                                </div>

                                                                <div className="mt-1.5">
                                                                    <h4 className="text-[13px] font-bold text-stone-900 leading-tight">
                                                                        {entry.title}
                                                                    </h4>
                                                                    <p className="mt-1 text-[12px] font-medium text-stone-500 leading-tight">
                                                                        {entry.summary}
                                                                    </p>
                                                                </div>

                                                                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                                                                    <CompactMeta label="Logged" value={formatDateTime(entry.occurred_at)} />
                                                                    <CompactMeta label="Actor" value={entry.actor_name || 'System'} />
                                                                    <CompactMeta label="Actor Type" value={actorTypeLabel[entry.actor_type] || formatStatusLabel(entry.actor_type)} />
                                                                    <CompactMeta label="Module" value={moduleLabel[entry.module] || formatStatusLabel(entry.module)} />
                                                                    {entry.subject && <CompactMeta label="Subject" value={entry.subject} />}
                                                                    {entry.reference && <CompactMeta label="Ref" value={entry.reference} />}
                                                                    {entry.amount_label && <CompactMeta label="Amount" value={entry.amount_label} color="text-emerald-700" />}
                                                                </div>

                                                                {entry.detail_lines?.length ? (
                                                                    <div className="mt-2.5 rounded-xl border border-stone-100 bg-stone-50/50 px-3 py-2">
                                                                        <ul className="space-y-1 text-[11px] font-medium text-stone-500">
                                                                            {entry.detail_lines.map((line) => (
                                                                                <li key={line} className="flex gap-1.5 items-center">
                                                                                    <span className="h-0.5 w-2 rounded-full bg-stone-300 shrink-0" />
                                                                                    <span className="truncate">{line}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                ) : null}

                                                                {(entry.before || entry.after) ? (
                                                                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                                                        {entry.before ? <DiffBlock title="Before" values={entry.before} /> : <div />}
                                                                        {entry.after ? <DiffBlock title="After" values={entry.after} /> : <div />}
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        </div>

                                                        {entry.target_url ? (
                                                            <Link
                                                                href={entry.target_url}
                                                                preserveScroll
                                                                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-stone-700 shadow-sm transition-all hover:border-stone-300 hover:bg-stone-50 hover:text-clay-700"
                                                            >
                                                                {entry.target_label || 'View Record'}
                                                                <ArrowUpRight size={12} strokeWidth={2.8} />
                                                            </Link>
                                                        ) : null}
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <WorkspaceEmptyState
                            icon={ReceiptText}
                            title="No audit activity found"
                            description="Try a broader date range or clear the filters to review more workspace history."
                        />
                    )}

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
        </>
    );
}

AuditLog.layout = (page) => <SellerWorkspaceLayout active="audit-log">{page}</SellerWorkspaceLayout>;

function CompactMeta({ label, value, color = 'text-stone-700' }) {
    return (
        <div className="flex items-center gap-1.5 whitespace-nowrap bg-stone-50 px-2 py-1 rounded border border-stone-200">
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400">{label}</span>
            <span className={`text-[10px] font-bold ${color}`}>{value}</span>
        </div>
    );
}

function FilterSelect({ value, onChange, options }) {
    return (
        <label className="relative block h-[38px]">
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full h-full appearance-none rounded-xl border border-stone-200 bg-white pl-3 pr-8 text-xs font-bold text-stone-700 shadow-sm outline-none transition-all focus:border-clay-500 focus:ring-2 focus:ring-clay-100 hover:border-stone-300 hover:bg-stone-50 cursor-pointer"
            >
                {options.map(([optionValue, optionLabel]) => (
                    <option key={optionValue} value={optionValue}>
                        {optionLabel}
                    </option>
                ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400">
                <ChevronDown size={14} strokeWidth={2.5} />
            </div>
        </label>
    );
}

function DateInput({ label, value, onChange }) {
    return (
        <label className="flex flex-1 h-full items-center gap-2 px-3 hover:bg-stone-50 transition cursor-pointer">
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400 shrink-0">{label}</span>
            <input
                type="date"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="flex-1 w-full bg-transparent text-xs font-bold text-stone-700 border-none outline-none focus:ring-0 p-0"
            />
        </label>
    );
}

function DiffBlock({ title, values }) {
    return (
        <div className="rounded-xl border border-stone-100 bg-stone-50/70 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400">{title}</p>
            <div className="mt-2 space-y-1">
                {Object.entries(values).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-2 text-[11px]">
                        <span className="min-w-20 font-bold capitalize text-stone-500">{key}</span>
                        <span className="font-medium text-stone-700 break-all">{value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
