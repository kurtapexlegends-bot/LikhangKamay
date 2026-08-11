import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';
import ShopStorefrontTab from '@/Components/Seller/Settings/Tabs/ShopStorefrontTab';
import WorkplaceLocationsTab from '@/Components/Seller/Settings/Tabs/WorkplaceLocationsTab';
import PayrollRulesTab from '@/Components/Seller/Settings/Tabs/PayrollRulesTab';
import FinancePayoutsTab from '@/Components/Seller/Settings/Tabs/FinancePayoutsTab';

export default function GlobalSettings({ auth, sellerOwner, stats, locations = [], permissions = {} }) {
    const { openSidebar } = useSellerWorkspaceShell();
    const [activeTab, setActiveTab] = useState('storefront');

    const tabs = [
        { id: 'storefront', label: 'Shop Storefront', show: permissions.can_edit_shop_settings },
        { id: 'locations', label: 'Workplace Locations', show: permissions.can_edit_shop_settings },
        { id: 'payroll', label: 'People & Payroll', show: permissions.can_edit_hr_settings },
        { id: 'finance', label: 'Finance & Payouts', show: permissions.can_edit_accounting },
    ].filter((t) => t.show);

    return (
        <SellerWorkspaceLayout title="Shop Settings">
            <Head title="Shop Settings | LikhangKamay" />

            <SellerHeader
                title="Shop Settings"
                subtitle="Configure shop storefront branding, GPS locations, payroll configuration, and payout settlement."
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
                    {activeTab === 'storefront' && <ShopStorefrontTab sellerOwner={sellerOwner} stats={stats} permissions={permissions} />}
                    {activeTab === 'locations' && <WorkplaceLocationsTab locations={locations} permissions={permissions} />}
                    {activeTab === 'payroll' && <PayrollRulesTab sellerOwner={sellerOwner} permissions={permissions} />}
                    {activeTab === 'finance' && <FinancePayoutsTab sellerOwner={sellerOwner} permissions={permissions} />}
                </div>
            </main>
        </SellerWorkspaceLayout>
    );
}
