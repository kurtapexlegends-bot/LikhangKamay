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
    'pending': 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-100',
    'finance_approved': 'bg-stone-100 text-stone-700 border-stone-200 ring-1 ring-stone-100',
    'accounting_approved': 'bg-[#F8EEE6] text-clay-700 border-[#E7D8C9] ring-1 ring-[#F4E7DB]',
    'ordered': 'bg-[#FBF1E8] text-clay-700 border-[#E7D8C9] ring-1 ring-[#F4E7DB]',
    'partially_received': 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-100',
    'received': 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-100',
    'completed': 'bg-green-50 text-green-700 border-green-200 ring-1 ring-green-100',
    'rejected': 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-100',
};

export const STATUS_LABELS = {
    'pending': 'Pending Accounting',
    'finance_approved': 'Pending Accounting',
    'accounting_approved': 'Funds Released',
    'ordered': 'Ordered',
    'partially_received': 'Partially Received',
    'received': 'Received (Buffer)',
    'completed': 'Completed',
    'rejected': 'Rejected',
};

export const getStatusBadgeDotColor = (status) => {
    if (status === 'completed') return 'bg-green-500';
    if (status === 'rejected') return 'bg-red-500';
    if (status === 'ordered' || status === 'accounting_approved') return 'bg-clay-500';
    if (status === 'received') return 'bg-emerald-500';
    return 'bg-amber-500';
};
