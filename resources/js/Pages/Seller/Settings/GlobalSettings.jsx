import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import SellerWorkspaceLayout from '@/Layouts/SellerWorkspaceLayout';
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

            <div className="mx-auto max-w-6xl space-y-6 pt-2 pb-12">
                {/* Page Title & Subtitle */}
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">Workspace & Account Settings</h1>
                    <p className="text-xs text-stone-500 mt-1">
                        Manage your profile details, shop storefront branding, GPS locations, payroll configuration, and payout settlement.
                    </p>
                </div>

                {/* Modern Borderless Tab Subnav */}
                <div className="border-b border-stone-200/80">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto scrollbar-none" aria-label="Settings tabs">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`inline-flex items-center gap-2 py-3 border-b-2 text-xs font-bold whitespace-nowrap transition-colors min-h-[44px] ${
                                        isActive
                                            ? 'border-clay-600 text-clay-700 font-extrabold'
                                            : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
                                    }`}
                                >
                                    <Icon size={16} className={isActive ? 'text-clay-600' : 'text-stone-400'} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Active Tab View Content */}
                <div className="pt-2">
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
