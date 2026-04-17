import { usePage } from '@inertiajs/react';

export default function useSellerModuleAccess(moduleKey) {
    const { sellerSidebar } = usePage().props;
    const visibleModules = sellerSidebar?.visibleModules || [];
    const canEditModules = sellerSidebar?.canEditModules || {};

    const canAccess = visibleModules.includes(moduleKey);
    const canEdit = canEditModules[moduleKey] ?? true;

    return {
        canAccess,
        canEdit,
        isReadOnly: canAccess && !canEdit,
    };
}
