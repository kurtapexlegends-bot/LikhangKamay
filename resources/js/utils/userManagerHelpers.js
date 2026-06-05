import { FileText } from 'lucide-react';

export const roleTabs = ['all', 'artisan', 'buyer', 'super_admin'];

export const roleBadgeClasses = {
    artisan: 'bg-amber-50 text-amber-900 border-amber-200/60',
    staff: 'bg-[#F2EAE1] text-[#7A5037] border-[#E8D9CB]',
    buyer: 'bg-stone-50 text-stone-700 border-stone-200',
    super_admin: 'bg-stone-900 text-stone-100 border-stone-800',
};

export const stateClasses = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
    warning: 'bg-amber-50 text-amber-800 border-amber-200/60',
    danger: 'bg-red-50 text-red-800 border-red-200/60',
    neutral: 'bg-stone-50 text-stone-700 border-stone-200/80',
};

export const staffPresetLabels = {
    accounting: 'Accounting',
    customer_support: 'Customer Support',
    custom: 'Custom',
    hr: 'HR',
    procurement: 'Procurement',
};

export const getAutoExpandedRows = (accounts) =>
    accounts.reduce((expandedMap, account) => {
        if ((account.matched_staff_count ?? 0) > 0) {
            expandedMap[String(account.id)] = true;
        }
        return expandedMap;
    }, {});

export const isExpandableAccount = (account) => account.role === 'artisan' && (account.staff_count ?? 0) > 0;

export const formatStaffPreset = (presetKey) => {
    if (!presetKey) return 'Custom';
    return staffPresetLabels[presetKey] || presetKey.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const normalizeModulePermissionLevel = (value) => {
    if (value === 'can_edit' || value === 'update_access' || value === 'full_access' || value === true) {
        return 'can_edit';
    }
    if (value === 'read_only') return 'read_only';
    return null;
};

export const summarizeModulePermissions = (modulePermissions = {}) => {
    const values = Object.values(modulePermissions)
        .map((value) => normalizeModulePermissionLevel(value))
        .filter(Boolean);
    return {
        readOnlyCount: values.filter((value) => value === 'read_only').length,
        canEditCount: values.filter((value) => value === 'can_edit').length,
    };
};

export const ARTISAN_DOCUMENTS = [
    { key: 'business_permit', label: 'Business Permit', icon: FileText },
    { key: 'dti_registration', label: 'DTI Registration', icon: FileText },
    { key: 'valid_id', label: 'Valid ID', icon: FileText },
    { key: 'tin_id', label: 'TIN ID', icon: FileText },
];

export const buildViewedDocumentMap = (artisanRows) =>
    (artisanRows || []).reduce((carry, artisan) => {
        carry[artisan.id] = artisan.viewed_document_keys ?? [];
        return carry;
    }, {});
