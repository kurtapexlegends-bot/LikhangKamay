import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import FloatingModuleActions from '@/Components/FloatingModuleActions';
import { FolderTree, Plus, Award, Package } from 'lucide-react';

// Extracted Subcomponents
import CatalogKPIs from '@/Components/Admin/Catalog/CatalogKPIs';
import CategoryManagerTable from '@/Components/Admin/Catalog/CategoryManagerTable';
import CreateCategoryModal from '@/Components/Admin/Catalog/CreateCategoryModal';
import SponsorshipRequestsTable from '@/Components/Admin/Catalog/SponsorshipRequestsTable';
import ProductModerationTable from '@/Components/Admin/Catalog/ProductModerationTable';

export default function CatalogManager({ categories, requests, products, filters }) {
    const { url } = usePage();
    const activeTab = useMemo(() => {
        if (typeof window === 'undefined') return 'taxonomy';
        const params = new URL(url, window.location.origin).searchParams;
        return params.get('tab') || 'taxonomy';
    }, [url]);

    const [isAddOpen, setIsAddOpen] = useState(false);

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
                    {activeTab === 'taxonomy' && (
                        <motion.div
                            key="taxonomy-tab"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                        >
                            <div className="max-w-5xl pt-4">
                                <FloatingModuleActions actions={(
                                    <button
                                        onClick={() => setIsAddOpen(true)}
                                        className="flex items-center gap-1.5 bg-clay-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-clay-700 active:scale-95 transition-all shadow-lg shadow-clay-600/20 whitespace-nowrap min-h-[44px]"
                                    >
                                        <Plus size={14} strokeWidth={3} /> Add Category
                                    </button>
                                )} />

                                {/* Categories Table */}
                                <CategoryManagerTable categories={categories} />
                            </div>

                            {/* ADD MODAL */}
                            <CreateCategoryModal show={isAddOpen} onClose={() => setIsAddOpen(false)} />
                        </motion.div>
                    )}

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
