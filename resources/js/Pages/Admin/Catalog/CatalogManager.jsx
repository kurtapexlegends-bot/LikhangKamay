import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Award, Package, ShoppingBag, Star } from 'lucide-react';

// Extracted Subcomponents
import CatalogKPIs from '@/Components/Admin/Catalog/CatalogKPIs';
import SponsorshipRequestsTable from '@/Components/Admin/Catalog/SponsorshipRequestsTable';
import ProductModerationTable from '@/Components/Admin/Catalog/ProductModerationTable';

export default function CatalogManager({ requests, products, filters, statusCounts, shops = [] }) {
    const { url } = usePage();
    const activeTab = useMemo(() => {
        if (typeof window === 'undefined') return 'moderation';
        const params = new URL(url, window.location.origin).searchParams;
        return params.get('tab') || 'moderation';
    }, [url]);

    const handleTabSwitch = (tab) => {
        router.get(
            route('admin.catalog.index', { tab }),
            {},
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    // Calculate Sponsorship metrics
    const requestRows = requests?.data || [];
    const totalRequests = requestRows.length;
    const pendingRequests = useMemo(() => requestRows.filter(r => r.status === 'pending').length, [requestRows]);
    const approvedRequests = useMemo(() => requestRows.filter(r => r.status === 'approved').length, [requestRows]);
    const uniqueShops = useMemo(() => new Set(requestRows.map(r => r.user?.id).filter(Boolean)).size, [requestRows]);

    const tabs = [
        { id: 'moderation', label: 'Product Approvals', icon: ShoppingBag, count: statusCounts?.pending_review ?? statusCounts?.pending },
        { id: 'sponsorships', label: 'Sponsorship Requests', icon: Star, count: pendingRequests > 0 ? pendingRequests : null },
    ];

    return (
        <>
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Catalog Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-stone-200/80 pb-3 overflow-x-auto">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => handleTabSwitch(tab.id)}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap min-h-[38px] ${
                                    isActive
                                        ? 'bg-stone-900 text-white shadow-xs'
                                        : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                                }`}
                            >
                                <Icon size={14} className={isActive ? 'text-white' : 'text-stone-400'} />
                                <span>{tab.label}</span>
                                {tab.count !== undefined && tab.count !== null && (
                                    <span
                                        className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                            isActive
                                                ? 'bg-stone-800 text-stone-200'
                                                : 'bg-stone-100 text-stone-600'
                                        }`}
                                    >
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Switchable Views */}
                <AnimatePresence mode="wait">
                    {activeTab === 'sponsorships' && (
                        <motion.div
                            key="sponsorships-tab"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                        >
                            {/* Metric Cards Grid */}
                            <CatalogKPIs
                                totalRequests={totalRequests}
                                pendingRequests={pendingRequests}
                                approvedRequests={approvedRequests}
                                uniqueShops={uniqueShops}
                            />

                            {/* Sponsorship Requests Table */}
                            <SponsorshipRequestsTable requests={requests} />
                        </motion.div>
                    )}

                    {activeTab === 'moderation' && (
                        <motion.div
                            key="moderation-tab"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                        >
                            {/* Product Moderation Table */}
                            <ProductModerationTable products={products} filters={filters} statusCounts={statusCounts} shops={shops} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}

CatalogManager.layout = (page) => (
    <AdminLayout title="Catalog Manager">{page}</AdminLayout>
);
