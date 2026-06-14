export const formatMoney = (value) => `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatShortMoney = (value) => `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : 'N/A');

export const formatDateTime = (value) => (value ? new Date(value).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'N/A');

export const formatRole = (role) => (role ? role.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : 'Workspace requester');

export const statusTone = (status) => {
    const normalized = String(status || '').toLowerCase();

    if (['paid', 'completed', 'accounting_approved', 'ordered', 'received', 'partially_received'].includes(normalized)) {
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    }

    if (normalized === 'rejected') {
        return 'bg-red-50 text-red-600 border-red-100';
    }

    return 'bg-amber-50 text-amber-700 border-amber-100';
};

export const typeTone = (type) => {
    if (type === 'payroll') return 'bg-indigo-50 text-indigo-700 border-indigo-100';
    if (type === 'sale') return 'bg-teal-50 text-teal-700 border-teal-100';
    return 'bg-emerald-50 text-emerald-700 border-emerald-100';
};

export const reviewLabel = (status) => {
    const normalized = String(status || '').toLowerCase();

    if (normalized === 'rejected') return 'Rejected';
    if (['paid', 'completed', 'accounting_approved', 'ordered', 'received', 'partially_received'].includes(normalized)) return 'Approved';

    return 'Pending Review';
};
