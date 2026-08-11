import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import SellerWorkspaceLayout from '@/Layouts/SellerWorkspaceLayout';
import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';
import AccountProfileTab from '@/Components/Seller/Settings/Tabs/AccountProfileTab';
import ShopStorefrontTab from '@/Components/Seller/Settings/Tabs/ShopStorefrontTab';
import WorkplaceLocationsTab from '@/Components/Seller/Settings/Tabs/WorkplaceLocationsTab';
import PayrollRulesTab from '@/Components/Seller/Settings/Tabs/PayrollRulesTab';
import FinancePayoutsTab from '@/Components/Seller/Settings/Tabs/FinancePayoutsTab';
import { User, Store, MapPin, Clock, Banknote } from 'lucide-react';

export default function GlobalSettings({ sellerOwner, locations = [], permissions = {} }) {
    const [activeTab, setActiveTab] = useState('account');

    const tabs = [
        { id: 'account', label: 'Account Profile', icon: User, show: true },
        { id: 'storefront', label: 'Shop Storefront', icon: Store, show: permissions.can_edit_shop_settings },
        { id: 'locations', label: 'Workplace Locations', icon: MapPin, show: permissions.can_edit_shop_settings },
        { id: 'payroll', label: 'People & Payroll', icon: Clock, show: permissions.can_edit_hr_settings },
        { id: 'finance', label: 'Finance & Payouts', icon: Banknote, show: permissions.can_edit_accounting },
    ].filter((t) => t.show);

    return (
        <SellerWorkspaceLayout title="Global Settings">
            <Head title="Global Settings | LikhangKamay" />

            <div className="mx-auto max-w-7xl space-y-6">
                {/* Page Title & Description */}
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">Workspace & Account Settings</h1>
                    <p className="text-xs text-stone-500 mt-1">
                        Manage your profile details, shop storefront branding, GPS locations, payroll configuration, and payout settlement.
                    </p>
                </div>

                {/* FilterToolbarHeader Tabs */}
                <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
                    <FilterToolbarHeader
                        tabs={tabs.map((t) => ({ id: t.id, label: t.label }))}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        searchPlaceholder="Search setting features..."
                    />

                    <div className="p-6 bg-[#FAF8F5]/50 border-t border-stone-100">
                        {activeTab === 'account' && <AccountProfileTab />}
                        {activeTab === 'storefront' && <ShopStorefrontTab sellerOwner={sellerOwner} />}
                        {activeTab === 'locations' && <WorkplaceLocationsTab locations={locations} permissions={permissions} />}
                        {activeTab === 'payroll' && <PayrollRulesTab sellerOwner={sellerOwner} permissions={permissions} />}
                        {activeTab === 'finance' && <FinancePayoutsTab sellerOwner={sellerOwner} permissions={permissions} />}
                    </div>
                </div>
            </div>
        </SellerWorkspaceLayout>
    );
}
