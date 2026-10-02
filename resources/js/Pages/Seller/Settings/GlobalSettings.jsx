import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';
import ShopStorefrontTab from '@/Components/Seller/Settings/Tabs/ShopStorefrontTab';
import WorkplaceLocationsTab from '@/Components/Seller/Settings/Tabs/WorkplaceLocationsTab';
import PayrollRulesTab from '@/Components/Seller/Settings/Tabs/PayrollRulesTab';
import FinancePayoutsTab from '@/Components/Seller/Settings/Tabs/FinancePayoutsTab';
import PickupScheduleSettings from '@/Components/Seller/Settings/PickupScheduleSettings';

export default function GlobalSettings({ auth, sellerOwner, stats, locations = [], products = [], permissions = {}, pickupSchedule }) {
    const { openSidebar } = useSellerWorkspaceShell();
    const [activeTab, setActiveTab] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const requestedTab = params.get('tab');
            if (requestedTab && ['storefront', 'pickup', 'locations', 'payroll', 'finance'].includes(requestedTab)) {
                return requestedTab;
            }
        }
        return 'storefront';
    });

    const isPremiumOrElite = permissions.is_premium_tier ?? (sellerOwner?.premium_tier === 'premium' || sellerOwner?.premium_tier === 'super_premium');

    const tabs = [
        { id: 'storefront', label: 'Shop Storefront', show: Boolean(permissions.can_edit_shop_settings) },
        { id: 'pickup', label: 'Store Pickup & Hours', show: Boolean(permissions.can_edit_shop_settings) },
        { id: 'locations', label: 'Workplace Locations', show: Boolean(permissions.can_edit_shop_settings && isPremiumOrElite) },
        { id: 'payroll', label: 'People & Payroll', show: Boolean(permissions.can_edit_hr_settings && isPremiumOrElite) },
        { id: 'finance', label: 'Finance & Payouts', show: Boolean(permissions.can_edit_shop_settings) },
    ].filter((t) => t.show);

    return (
        <>
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
                    {activeTab === 'pickup' && (
                        <PickupScheduleSettings
                            schedule={pickupSchedule}
                            locations={locations}
                            canEdit={Boolean(permissions.can_edit_shop_settings)}
                        />
                    )}
                    {activeTab === 'locations' && <WorkplaceLocationsTab locations={locations} permissions={permissions} />}
                    {activeTab === 'payroll' && <PayrollRulesTab sellerOwner={sellerOwner} permissions={permissions} />}
                    {activeTab === 'finance' && <FinancePayoutsTab sellerOwner={sellerOwner} permissions={permissions} />}
                </div>
            </main>
        </>
    );
}

GlobalSettings.layout = (page) => <SellerWorkspaceLayout active="settings">{page}</SellerWorkspaceLayout>;
