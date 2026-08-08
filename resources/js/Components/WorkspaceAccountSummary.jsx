import React from 'react';

export const getWorkspaceAccountLabel = (user) => {
    if (!user) return 'Workspace Account';

    if (user.role === 'super_admin') return 'Super Admin';
    if (user.role === 'staff') {
        const presetKey = user.staff_role_preset_key || user.role_preset_key;
        const labels = {
            shop_manager: 'Shop Manager',
            accountant: 'Accountant',
            stock_clerk: 'Stock Clerk',
            customer_support: 'Customer Care',
            hr: 'People & Payroll',
            accounting: 'Finance Review',
            procurement: 'Procurement',
            custom: 'Custom Access',
        };
        return labels[presetKey] || 'Staff Account';
    }

    return 'Shop Owner (Seller)';
};

export const getWorkspaceAccountDisplayName = (user) => {
    if (!user) return '';

    if (user.role === 'artisan') {
        return user.shop_name || user.first_name;
    }

    return user.first_name;
};

export default function WorkspaceAccountSummary({
    user,
    className = 'text-right hidden sm:block',
    nameClassName = 'text-sm font-bold text-gray-900',
    labelClassName = 'text-[10px] text-gray-500',
}) {
    return (
        <div className={className}>
            <p className={nameClassName}>{getWorkspaceAccountDisplayName(user)}</p>
            <p className={labelClassName}>{getWorkspaceAccountLabel(user)}</p>
        </div>
    );
}
