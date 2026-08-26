import { 
    ClipboardList, Timer, Banknote, BadgeCheck, Truck, PackageCheck, Inbox, CheckCircle, XCircle 
} from 'lucide-react';

export const STATUS_TABS = [
    { id: 'all', label: 'All Requests', icon: ClipboardList },
    { id: 'pending', label: 'Pending Approval', icon: Timer },
    { id: 'finance_approved', label: 'Budget Approved', icon: Banknote },
    { id: 'accounting_approved', label: 'Ready to Order', icon: BadgeCheck },
    { id: 'ordered', label: 'On Process', icon: Truck },
    { id: 'partially_received', label: 'Partially Received', icon: PackageCheck },
    { id: 'received', label: 'In Buffer', icon: Inbox },
    { id: 'completed', label: 'Completed', icon: CheckCircle },
    { id: 'rejected', label: 'Rejected', icon: XCircle },
];

const pesoFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

export const formatPeso = (value) => pesoFormatter.format(Number(value || 0));

export const STATUS_STYLES = {
    'pending': 'bg-amber-50 text-amber-800 border-amber-200/80 ring-1 ring-amber-100/50',
    'finance_approved': 'bg-stone-100 text-stone-700 border-stone-200/80 ring-1 ring-stone-100/50',
    'accounting_approved': 'bg-clay-50 text-clay-800 border-clay-200/80 ring-1 ring-clay-100/50',
    'ordered': 'bg-amber-50/70 text-amber-800 border-amber-200/80 ring-1 ring-amber-100/50',
    'partially_received': 'bg-orange-50 text-orange-800 border-orange-200/80 ring-1 ring-orange-100/50',
    'received': 'bg-emerald-50 text-emerald-800 border-emerald-200/80 ring-1 ring-emerald-100/50',
    'completed': 'bg-emerald-50 text-emerald-800 border-emerald-200/80 ring-1 ring-emerald-100/50',
    'rejected': 'bg-red-50 text-red-700 border-red-200/80 ring-1 ring-red-100/50',
};

export const STATUS_LABELS = {
    'pending': 'Pending Approval',
    'finance_approved': 'Budget Approved',
    'accounting_approved': 'Ready to Order',
    'ordered': 'Ordered',
    'partially_received': 'Partially Received',
    'received': 'In Buffer',
    'completed': 'Completed',
    'rejected': 'Rejected',
};

export const getStatusBadgeDotColor = (status) => {
    if (status === 'completed' || status === 'received') return 'bg-emerald-500';
    if (status === 'rejected') return 'bg-red-500';
    if (status === 'accounting_approved') return 'bg-clay-600';
    if (status === 'ordered') return 'bg-amber-600';
    return 'bg-amber-500';
};
