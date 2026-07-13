import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Award, Package } from 'lucide-react';

// Extracted Subcomponents
import CatalogKPIs from '@/Components/Admin/Catalog/CatalogKPIs';
import SponsorshipRequestsTable from '@/Components/Admin/Catalog/SponsorshipRequestsTable';
import ProductModerationTable from '@/Components/Admin/Catalog/ProductModerationTable';

export default function CatalogManager({ categories, requests, products, filters }) {
    const { url } = usePage();
    const activeTab = useMemo(() => {
        if (typeof window === 'undefined') return 'moderation';
        const params = new URL(url, window.location.origin).searchParams;
        return params.get('tab') || 'moderation';
    }, [url]);

    // Calculate Sponsorship metrics
    const requestRows = requests?.data || [];
    const totalRequests = requestRows.length;
    const pendingRequests = useMemo(() => requestRows.filter(r => r.status === 'pending').length, [requestRows]);
    const approvedRequests = useMemo(() => requestRows.filter(r => r.status === 'approved').length, [requestRows]);
    const uniqueShops = useMemo(() => new Set(requestRows.map(r => r.user?.id).filter(Boolean)).size, [requestRows]);

    return (
        <>
            <div className="max-w-6xl mx-auto space-y-6">

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
                            <ProductModerationTable products={products} filters={filters} />
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
