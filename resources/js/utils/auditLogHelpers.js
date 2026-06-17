import { ClipboardList, Settings2, ShieldCheck, Banknote, Crown } from 'lucide-react';

export const summaryCards = [
    { key: 'total_events', label: 'Total Logged Events', icon: ClipboardList, tone: 'bg-[#FCF7F2] text-clay-700' },
    { key: 'operations_events', label: 'Operational Events', icon: Settings2, tone: 'bg-sky-50 text-sky-700' },
    { key: 'staff_events', label: 'Staff Activity', icon: ShieldCheck, tone: 'bg-stone-100 text-stone-700' },
    { key: 'finance_events', label: 'Finance Reviews', icon: Banknote, tone: 'bg-[#F2FAF6] text-emerald-700' },
    { key: 'billing_events', label: 'Billing Activity', icon: Crown, tone: 'bg-[#FFF7ED] text-amber-700' },
];

export const categoryOptions = [
    { key: 'all', label: 'All activity' },
    { key: 'operations', label: 'Operations' },
    { key: 'staff', label: 'Staff access' },
    { key: 'finance', label: 'Finance' },
    { key: 'billing', label: 'Billing' },
];

export const categoryMeta = {
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

export const severityTone = {
    info: 'bg-sky-50 text-sky-700 border-sky-200/70',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/70',
    danger: 'bg-red-50 text-red-700 border-red-200/70',
};

export const statusTone = {
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

export const actorTypeLabel = {
    owner: 'Owner',
    staff: 'Staff',
    admin: 'Admin',
    buyer: 'Buyer',
    system: 'System',
};

export const moduleLabel = {
    orders: 'Orders',
    products: 'Products',
    reviews: 'Reviews',
    shop_settings: 'Shop Settings',
    hr: 'People & Payroll',
    accounting: 'Finance',
    stock_requests: 'Restock Requests',
    subscription: 'Subscription',
};

export const formatDateTime = (value) => value
    ? new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(value))
    : 'No logged time';

export const formatRelative = (value) => {
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

export const formatStatusLabel = (status) => String(status || 'logged')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const dayLabel = (value) => value
    ? new Intl.DateTimeFormat('en-PH', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(value))
    : 'Unknown Date';

export const toDateInputValue = (value) => {
    if (!value) return '';

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return '';
    }

    return parsed.toISOString().slice(0, 10);
};
