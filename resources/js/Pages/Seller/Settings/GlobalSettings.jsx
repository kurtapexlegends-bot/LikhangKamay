import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';
import ShopStorefrontTab from '@/Components/Seller/Settings/Tabs/ShopStorefrontTab';
import WorkplaceLocationsTab from '@/Components/Seller/Settings/Tabs/WorkplaceLocationsTab';
import PayrollRulesTab from '@/Components/Seller/Settings/Tabs/PayrollRulesTab';
import FinancePayoutsTab from '@/Components/Seller/Settings/Tabs/FinancePayoutsTab';

export default function GlobalSettings({ auth, sellerOwner, stats, locations = [], products = [], permissions = {} }) {
    const { openSidebar } = useSellerWorkspaceShell();
    const [activeTab, setActiveTab] = useState('storefront');

    const isPremiumOrElite = permissions.is_premium_tier ?? (sellerOwner?.premium_tier === 'premium' || sellerOwner?.premium_tier === 'super_premium');

    const tabs = [
        { id: 'storefront', label: 'Shop Storefront', show: Boolean(permissions.can_edit_shop_settings) },
        { id: 'locations', label: 'Workplace Locations', show: Boolean(permissions.can_edit_shop_settings && isPremiumOrElite) },
        { id: 'payroll', label: 'People & Payroll', show: Boolean(permissions.can_edit_hr_settings && isPremiumOrElite) },
        { id: 'finance', label: 'Finance & Payouts', show: Boolean(permissions.can_edit_accounting && isPremiumOrElite) },
    ].filter((t) => t.show);

    return (
        <SellerWorkspaceLayout active="settings">
            <Head title="Shop Settings | LikhangKamay" />

            <SellerHeader
                title="Shop Settings"
                subtitle="Configure your shop branding, storefront profile, and workspace preferences."
                auth={auth}
                onMenuClick={openSidebar}
            />

            <main className="flex-1 w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 space-y-6">
                {/* FilterToolbarHeader Segmented Pill Tab Bar */}
                <FilterToolbarHeader
                    tabs={tabs.map((t) => ({ id: t.id, label: t.label }))}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />

                {/* Tab Content Panel */}
                <div className="pt-2">
                    {activeTab === 'storefront' && (
                        <ShopStorefrontTab
                            sellerOwner={sellerOwner}
                            stats={stats}
                            products={products}
                            permissions={permissions}
                        />
                    )}
                    {activeTab === 'locations' && <WorkplaceLocationsTab locations={locations} permissions={permissions} />}
                    {activeTab === 'payroll' && <PayrollRulesTab sellerOwner={sellerOwner} permissions={permissions} />}
                    {activeTab === 'finance' && <FinancePayoutsTab sellerOwner={sellerOwner} permissions={permissions} />}
                </div>
            </main>
        </SellerWorkspaceLayout>
    );
}
