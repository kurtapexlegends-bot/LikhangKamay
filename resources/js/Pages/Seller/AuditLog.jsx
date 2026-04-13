import React, { useMemo, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import Dropdown from '@/Components/Dropdown';
import NotificationDropdown from '@/Components/NotificationDropdown';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceAccountSummary from '@/Components/WorkspaceAccountSummary';
import WorkspaceLogoutLink from '@/Components/WorkspaceLogoutLink';
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
    LogOut,
    Menu,
    ReceiptText,
    ShieldCheck,
    User,
} from 'lucide-react';

const summaryCards = [
    { key: 'total_events', label: 'Total Logged Events', icon: ClipboardList, tone: 'bg-[#FCF7F2] text-clay-700 border-[#E7D8C9]' },
    { key: 'staff_events', label: 'Staff Access Events', icon: ShieldCheck, tone: 'bg-[#F9F4FF] text-violet-700 border-violet-200' },
    { key: 'finance_events', label: 'Finance Reviews', icon: Banknote, tone: 'bg-[#F2FAF6] text-emerald-700 border-emerald-200' },
    { key: 'billing_events', label: 'Billing Activity', icon: Crown, tone: 'bg-[#FFF7ED] text-amber-700 border-amber-200' },
];

const categoryOptions = [
    { key: 'all', label: 'All activity' },
    { key: 'staff', label: 'Staff access' },
    { key: 'finance', label: 'Finance' },
    { key: 'billing', label: 'Billing' },
];

const categoryMeta = {
    staff: {
        label: 'Staff Access',
        icon: ShieldCheck,
        chip: 'bg-violet-50 text-violet-700 border-violet-200',
        iconWrap: 'bg-violet-50 text-violet-700 border-violet-100',
    },
    finance: {
        label: 'Finance',
        icon: Banknote,
        chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        iconWrap: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    },
    billing: {
        label: 'Billing',
        icon: Crown,
        chip: 'bg-amber-50 text-amber-700 border-amber-200',
        iconWrap: 'bg-amber-50 text-amber-700 border-amber-100',
    },
};

const statusTone = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    cancelled: 'bg-stone-100 text-stone-700 border-stone-200',
    ordered: 'bg-sky-50 text-sky-700 border-sky-200',
    accounting_approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    completed: 'bg-stone-100 text-stone-700 border-stone-200',
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

export default function AuditLog({ auth, auditLog }) {
    const { flash = {} } = usePage().props;
    const { addToast } = useToast();
    useFlashToast(flash, addToast);

    const { openSidebar } = useSellerWorkspaceShell();
    const [selectedCategory, setSelectedCategory] = useState('all');

    const filteredEntries = useMemo(() => {
        const entries = auditLog?.entries || [];

        if (selectedCategory === 'all') {
            return entries;
        }

        return entries.filter((entry) => entry.category === selectedCategory);
    }, [auditLog?.entries, selectedCategory]);

    const latestEventAt = auditLog?.summary?.latest_event_at;

    return (
        <>
            <Head title="Audit Log Center" />
                <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8 sticky top-0 z-40">
                    <div className="flex min-w-0 items-center gap-3">
                        <button onClick={openSidebar} className="lg:hidden text-gray-500 hover:text-clay-600">
                            <Menu size={24} />
                        </button>
                        <div className="min-w-0">
                            <h1 className="truncate text-lg sm:text-xl font-bold text-gray-900">Audit Log Center</h1>
                            <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">
                                Owner-only workspace history for staff access, finance reviews, and billing activity
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-6">
                        <NotificationDropdown />
                        <div className="hidden sm:block h-8 w-px bg-gray-200"></div>
                        <Dropdown>
                            <Dropdown.Trigger>
                                <span className="inline-flex rounded-md">
                                    <button type="button" className="inline-flex items-center gap-2 px-1 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-transparent hover:text-gray-700 focus:outline-none transition ease-in-out duration-150">
                                        <div className="hidden lg:block">
                                            <WorkspaceAccountSummary user={auth.user} />
                                        </div>
                                        <UserAvatar user={auth.user} />
                                        <ChevronDown size={16} className="text-gray-400" />
                                    </button>
                                </span>
                            </Dropdown.Trigger>
                            <Dropdown.Content>
                                <Dropdown.Link href={route('profile.edit')} className="flex items-center gap-2">
                                    <User size={16} /> Profile
                                </Dropdown.Link>
                                <WorkspaceLogoutLink className="flex items-center gap-2 text-red-600 hover:text-red-700">
                                    <LogOut size={16} /> Log Out
                                </WorkspaceLogoutLink>
                            </Dropdown.Content>
                        </Dropdown>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    <section className="rounded-[1.5rem] border border-stone-200 bg-white shadow-sm overflow-hidden">
                        <div className="border-b border-stone-100 px-6 py-5 sm:px-8">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Workspace Oversight</p>
                                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-stone-900">Activity feed for sensitive seller actions</h2>
                                    <p className="mt-2 max-w-2xl text-[13px] font-medium leading-relaxed text-stone-500">
                                        Review staff access changes, finance approvals, payout requests, procurement updates, and subscription billing history in one place.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-stone-200 bg-[#FCF7F2] px-4 py-3 text-right">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">Latest Logged Event</p>
                                    <p className="mt-1 text-[13px] font-bold text-stone-800">{formatRelative(latestEventAt)}</p>
                                    <p className="mt-1 text-[11px] font-medium text-stone-500">{formatDateTime(latestEventAt)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 border-b border-stone-100 px-6 py-5 sm:grid-cols-2 xl:grid-cols-4 sm:px-8">
                            {summaryCards.map(({ key, label, icon: Icon, tone }) => (
                                <div key={key} className={`rounded-2xl border px-4 py-4 ${tone}`}>
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] font-bold uppercase tracking-[0.16em]">{label}</p>
                                        <Icon size={18} strokeWidth={2.3} />
                                    </div>
                                    <p className="mt-3 text-3xl font-black tracking-tight text-stone-900">
                                        {auditLog?.summary?.[key] ?? 0}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="px-6 py-5 sm:px-8">
                            <div className="flex flex-wrap gap-2">
                                {categoryOptions.map((option) => {
                                    const isActive = selectedCategory === option.key;

                                    return (
                                        <button
                                            key={option.key}
                                            type="button"
                                            onClick={() => setSelectedCategory(option.key)}
                                            className={`rounded-full border px-3 py-1.5 text-[12px] font-bold transition ${
                                                isActive
                                                    ? 'border-clay-600 bg-clay-600 text-white'
                                                    : 'border-stone-200 bg-white text-stone-600 hover:border-clay-200 hover:text-clay-700'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    <section className="mt-6 overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-sm">
                        <div className="border-b border-stone-100 px-6 py-5 sm:px-8">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Recent Entries</p>
                            <h3 className="mt-1 text-[20px] font-bold tracking-tight text-stone-900">Audit activity feed</h3>
                            <p className="mt-1 text-[13px] font-medium text-stone-500">
                                Each item points back to the related workspace area so you can verify the source record quickly.
                            </p>
                        </div>

                        {filteredEntries.length ? (
                            <div className="divide-y divide-stone-100">
                                {filteredEntries.map((entry) => {
                                    const meta = categoryMeta[entry.category] || categoryMeta.finance;
                                    const Icon = meta.icon;
                                    const statusClass = statusTone[entry.status] || 'bg-stone-100 text-stone-700 border-stone-200';

                                    return (
                                        <article key={entry.id} className="px-6 py-5 sm:px-8">
                                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                <div className="flex min-w-0 gap-4">
                                                    <div className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${meta.iconWrap}`}>
                                                        <Icon size={18} strokeWidth={2.3} />
                                                    </div>

                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${meta.chip}`}>
                                                                {meta.label}
                                                            </span>
                                                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${statusClass}`}>
                                                                {formatStatusLabel(entry.status)}
                                                            </span>
                                                        </div>

                                                        <h4 className="mt-3 text-[17px] font-bold tracking-tight text-stone-900">{entry.title}</h4>
                                                        <p className="mt-1 text-[13px] leading-relaxed text-stone-600">{entry.summary}</p>

                                                        <div className="mt-3 grid gap-2 text-[12px] text-stone-500 sm:grid-cols-2 xl:grid-cols-4">
                                                            <MetaLine label="Logged" value={formatDateTime(entry.occurred_at)} />
                                                            <MetaLine label="Actor" value={entry.actor_name || 'System / Seller'} />
                                                            {entry.subject ? <MetaLine label="Subject" value={entry.subject} /> : null}
                                                            {entry.reference ? <MetaLine label="Reference" value={entry.reference} /> : null}
                                                            {entry.amount_label ? <MetaLine label="Amount" value={entry.amount_label} /> : null}
                                                        </div>

                                                        {entry.detail_lines?.length ? (
                                                            <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                                                                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400">Details</p>
                                                                <ul className="mt-2 space-y-1.5 text-[12px] font-medium text-stone-600">
                                                                    {entry.detail_lines.map((line) => (
                                                                        <li key={line} className="flex gap-2">
                                                                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-clay-500 shrink-0" />
                                                                            <span>{line}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                {entry.target_url ? (
                                                    <Link
                                                        href={entry.target_url}
                                                        preserveScroll
                                                        className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-bold text-stone-700 shadow-sm transition hover:bg-stone-50"
                                                    >
                                                        {entry.target_label || 'Open related page'}
                                                        <ArrowUpRight size={14} strokeWidth={2.4} />
                                                    </Link>
                                                ) : null}
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        ) : (
                            <WorkspaceEmptyState
                                icon={ReceiptText}
                                title="No audit activity found"
                                description="Recent staff access changes, finance reviews, payout updates, and subscription billing events will appear here."
                            />
                        )}
                    </section>
                </main>
        </>
    );
}

AuditLog.layout = (page) => <SellerWorkspaceLayout active="audit-log">{page}</SellerWorkspaceLayout>;

function MetaLine({ label, value }) {
    return (
        <div className="rounded-xl border border-stone-100 bg-stone-50/70 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400">{label}</p>
            <p className="mt-1 font-medium text-stone-700">{value}</p>
        </div>
    );
}
