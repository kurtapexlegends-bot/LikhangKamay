import React from 'react';
import { Head, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import MonetizationDashboard from '@/Components/Admin/Layout/SystemConfig/MonetizationDashboard';

export default function Monetization({ metrics, recentSubscribers, recentSponsorships }) {
    const { flash } = usePage().props;

    return (
        <>
            <Head title="Subscriptions & Billing" />

            <div className="pb-24 lg:pb-6">
                {(flash?.success || flash?.error) && (
                    <div className={`mb-6 rounded-xl border px-4 py-3 text-xs font-medium ${
                        flash?.success
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-red-200 bg-red-50 text-red-700'
                    }`}>
                        {flash?.success || flash?.error}
                    </div>
                )}

                <MonetizationDashboard
                    metrics={metrics}
                    recentSubscribers={recentSubscribers}
                    recentSponsorships={recentSponsorships}
                />
            </div>
        </>
    );
}

Monetization.layout = page => <AdminLayout title="Subscriptions & Billing">{page}</AdminLayout>;
