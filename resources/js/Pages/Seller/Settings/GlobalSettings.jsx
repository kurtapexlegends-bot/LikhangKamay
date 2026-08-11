import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import SellerWorkspaceLayout from '@/Layouts/SellerWorkspaceLayout';
import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';
import AccountProfileTab from '@/Components/Seller/Settings/Tabs/AccountProfileTab';
import ShopStorefrontTab from '@/Components/Seller/Settings/Tabs/ShopStorefrontTab';
import WorkplaceLocationsTab from '@/Components/Seller/Settings/Tabs/WorkplaceLocationsTab';
import PayrollRulesTab from '@/Components/Seller/Settings/Tabs/PayrollRulesTab';
import FinancePayoutsTab from '@/Components/Seller/Settings/Tabs/FinancePayoutsTab';

export default function GlobalSettings({ sellerOwner, locations = [], permissions = {} }) {
    const [activeTab, setActiveTab] = useState('account');

    const tabs = [
        { id: 'account', label: 'Account Profile', show: true },
        { id: 'storefront', label: 'Shop Storefront', show: permissions.can_edit_shop_settings },
        { id: 'locations', label: 'Workplace Locations', show: permissions.can_edit_shop_settings },
        { id: 'payroll', label: 'People & Payroll', show: permissions.can_edit_hr_settings },
        { id: 'finance', label: 'Finance & Payouts', show: permissions.can_edit_accounting },
    ].filter((t) => t.show);

    return (
        <SellerWorkspaceLayout title="Global Settings">
            <Head title="Global Settings | LikhangKamay" />

            <div className="mx-auto max-w-6xl space-y-6">
                {/* Page Title & Subtitle */}
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">Workspace & Account Settings</h1>
                    <p className="text-xs text-stone-500 mt-1">
                        Manage your profile details, shop storefront branding, GPS locations, payroll configuration, and payout settlement.
                    </p>
                </div>

                {/* FilterToolbarHeader Segmented Pill Tab Bar */}
                <FilterToolbarHeader
                    tabs={tabs.map((t) => ({ id: t.id, label: t.label }))}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />

                {/* Tab Content Panel */}
                <div>
                    {activeTab === 'account' && <AccountProfileTab />}
                    {activeTab === 'storefront' && <ShopStorefrontTab sellerOwner={sellerOwner} />}
                    {activeTab === 'locations' && <WorkplaceLocationsTab locations={locations} permissions={permissions} />}
                    {activeTab === 'payroll' && <PayrollRulesTab sellerOwner={sellerOwner} permissions={permissions} />}
                    {activeTab === 'finance' && <FinancePayoutsTab sellerOwner={sellerOwner} permissions={permissions} />}
                </div>
            </div>
        </SellerWorkspaceLayout>
    );
}
