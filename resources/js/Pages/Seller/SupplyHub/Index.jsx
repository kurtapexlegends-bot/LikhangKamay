import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import { useToast } from '@/Components/ToastContext';
import { CheckCircle2, Store, Layers, Truck } from 'lucide-react';

// Modular Subcomponents
import SupplyHubKPIs from '@/Components/Seller/SupplyHub/SupplyHubKPIs';
import SourcingSuppliesTable from '@/Components/Seller/SupplyHub/SourcingSuppliesTable';

export default function SupplyHubIndex({ 
    supplies, 
    categories = [], 
    filters = {}, 
    stats = {} 
}) {
    const { openSidebar } = useSellerWorkspaceShell();

    const [shouldAnimateKPI, setShouldAnimateKPI] = useState(true);
    useEffect(() => {
        const timer = setTimeout(() => setShouldAnimateKPI(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <>
            <Head title="Artisan Supply & Materials Hub" />

            <SellerHeader
                title="Supply Hub"
                subtitle="Source bulk raw materials, processed clay, glazes, and blanks directly from verified local peer studios."
                onMenuClick={openSidebar}
                badge={{ label: 'Wholesale B2B', iconColor: 'text-clay-500' }}
            />

            <div className="p-4 sm:p-6 lg:p-8 space-y-6 pb-12">
                {/* Studio Workspace Tab Navigation */}
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                    <div className="flex items-center gap-2">
                        <Link
                            href={route('seller.supply-hub.index')}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-bold text-white shadow-2xs"
                        >
                            <Store size={13} />
                            <span>Browse Peer Supplies</span>
                        </Link>
                        <Link
                            href={route('seller.supply-hub.my-listings')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors shadow-2xs"
                        >
                            <Layers size={13} className="text-clay-600" />
                            <span>My Wholesale Listings</span>
                            {stats.my_published_count > 0 && (
                                <span className="rounded-full bg-clay-100 text-clay-700 px-1.5 py-0.2 text-[10px] font-extrabold">
                                    {stats.my_published_count}
                                </span>
                            )}
                        </Link>
                    </div>

                    <Link
                        href={route('procurement.index')}
                        className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-clay-700 transition-colors"
                    >
                        <span>View Studio Materials Inventory</span>
                        <Truck size={13} />
                    </Link>
                </div>

                {/* Metric Summary Ribbon */}
                <SupplyHubKPIs stats={stats} shouldAnimate={shouldAnimateKPI} />

                {/* Auto-Restock Closed-Loop Guarantee Card */}
                <div className="rounded-xl border border-stone-200 bg-white p-4 text-xs text-stone-700 flex items-start gap-3 shadow-2xs">
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-600 mt-0.5" />
                    <div className="flex-1 space-y-0.5">
                        <span className="font-bold text-stone-900">Automated Closed-Loop Inventory Sync:</span>
                        <p className="text-stone-500 leading-relaxed">
                            Delivered B2B material orders automatically increment your Studio Materials inventory with exact quantities and unit costs when confirmed.
                        </p>
                    </div>
                </div>

                {/* Dense Studio Data Table */}
                <SourcingSuppliesTable
                    supplies={supplies}
                    categories={categories}
                    filters={filters}
                />
            </div>
        </>
    );
}

SupplyHubIndex.layout = (page) => <SellerWorkspaceLayout active="supply-hub">{page}</SellerWorkspaceLayout>;
