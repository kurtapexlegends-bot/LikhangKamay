import React from 'react';

export const getWorkspaceAccountLabel = (user) => {
    if (!user) return 'Workspace Account';

    if (user.role === 'super_admin') return 'Super Admin';
    if (user.role === 'staff') return 'Staff Account';

    return 'Seller Account';
};

export const getWorkspaceAccountDisplayName = (user) => {
    if (!user) return '';

    if (user.role === 'artisan') {
        return user.shop_name || user.name;
    }

    return user.name;
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
