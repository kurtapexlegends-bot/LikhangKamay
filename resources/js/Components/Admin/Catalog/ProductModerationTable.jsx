import React, { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import { 
    XCircle, 
    ShieldAlert, 
    Package, 
    CheckCircle2, 
    Clock, 
} from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import CompactPagination from '@/Components/CompactPagination';
import EmptyState from '@/Components/WorkspaceEmptyState';
import ProductInspectionDrawer from '@/Components/Admin/Catalog/ProductInspectionDrawer';
import ModerationRowItem, { ModerationCardItem } from '@/Components/Admin/Catalog/ModerationRowItem';
import ModerationFilterToolbar from '@/Components/Admin/Catalog/ModerationFilterToolbar';

// Custom inline MetricCard for dashboard telemetry
const ModerationMetricCard = ({ title, value, icon: Icon, tone = 'amber' }) => {
    const tones = {
        amber: 'bg-amber-50 text-amber-700 border-amber-100/50',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100/50',
        rose: 'bg-rose-50 text-rose-700 border-rose-100/50',
        stone: 'bg-stone-50 text-stone-700 border-stone-200/50',
    };

    return (
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm flex items-start justify-between hover:shadow-md transition-all duration-200">
            <div>
                <p className="text-stone-550 text-[10px] font-bold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-black text-stone-900 tracking-tight">{value}</h3>
                <p className="text-[10px] font-medium text-stone-400 mt-1">Listing count</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${tones[tone] || tones.amber}`}>
                <Icon size={18} />
            </div>
        </div>
    );
};

export default function ProductModerationTable({ products, filters, statusCounts, shops = [] }) {
    const { addToast } = useToast();
    const [currentStatusFilter, setCurrentStatusFilter] = useState(filters?.product_status || 'pending_review');
    const [selectedShopId, setSelectedShopId] = useState(filters?.shop_id || '');
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [isModifyingProduct, setIsModifyingProduct] = useState(false);
    const [inspectedProduct, setInspectedProduct] = useState(null);
    const [isValidating, setIsValidating] = useState(false);

    // Popover & Drawer filter state
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const popoverRef = useRef(null);

    // Staged draft filter states
    const [draftStatus, setDraftStatus] = useState(currentStatusFilter);
    const [draftShopId, setDraftShopId] = useState(selectedShopId);

    useEffect(() => {
        if (filters?.product_status && filters.product_status !== currentStatusFilter) {
            setCurrentStatusFilter(filters.product_status);
        }
        if (filters?.shop_id !== undefined && filters.shop_id !== selectedShopId) {
            setSelectedShopId(filters.shop_id || '');
        }
    }, [filters?.product_status, filters?.shop_id]);

    useEffect(() => {
        setDraftStatus(currentStatusFilter);
        setDraftShopId(selectedShopId);
    }, [currentStatusFilter, selectedShopId]);

    // Handle outside clicks to close desktop popover
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setIsPopoverOpen(false);
            }
        };
        if (isPopoverOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isPopoverOpen]);

    // Debounced Search Handler
    useEffect(() => {
        if (searchQuery === (filters?.search || '')) return;

        setIsValidating(true);
        const timeoutId = setTimeout(() => {
            router.get(route('admin.catalog.index'), {
                tab: 'moderation',
                product_status: currentStatusFilter,
                shop_id: selectedShopId,
                search: searchQuery
            }, {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                onFinish: () => setIsValidating(false)
            });
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const handleOpenFilters = () => {
        setDraftStatus(currentStatusFilter);
        setDraftShopId(selectedShopId);
        if (window.innerWidth < 1024) {
            setIsDrawerOpen(true);
        } else {
            setIsPopoverOpen(prev => !prev);
        }
    };

    const applyDraftFilters = () => {
        setCurrentStatusFilter(draftStatus);
        setSelectedShopId(draftShopId);
        setIsPopoverOpen(false);
        setIsDrawerOpen(false);

        router.get(route('admin.catalog.index'), {
            tab: 'moderation',
            product_status: draftStatus,
            shop_id: draftShopId,
            search: searchQuery
        }, { preserveScroll: true, preserveState: true });
    };

    const resetFilters = () => {
        setDraftStatus('pending_review');
        setDraftShopId('');
        setCurrentStatusFilter('pending_review');
        setSelectedShopId('');
        setIsPopoverOpen(false);
        setIsDrawerOpen(false);

        router.get(route('admin.catalog.index'), {
            tab: 'moderation',
            product_status: 'pending_review',
            shop_id: '',
            search: searchQuery
        }, { preserveScroll: true, preserveState: true });
    };

    const handleStatusFilterChange = (status) => {
        setCurrentStatusFilter(status);
        router.get(route('admin.catalog.index'), {
            tab: 'moderation',
            product_status: status,
            shop_id: selectedShopId,
            search: searchQuery
        }, { preserveScroll: true, preserveState: true });
    };

    const handleShopFilterChange = (shopId) => {
        setSelectedShopId(shopId);
        router.get(route('admin.catalog.index'), {
            tab: 'moderation',
            product_status: currentStatusFilter,
            shop_id: shopId,
            search: searchQuery
        }, { preserveScroll: true, preserveState: true });
    };

    const activeFiltersCount = (currentStatusFilter !== 'pending_review' ? 1 : 0) + (selectedShopId !== '' ? 1 : 0);
    const draftActiveCount = (draftStatus !== 'pending_review' ? 1 : 0) + (draftShopId !== '' ? 1 : 0);

    const statusLabels = {
        pending_review: `Pending Review (${statusCounts?.pending_review || 0})`,
        Active: `Approved / Active (${statusCounts?.Active || 0})`,
        rejected: `Needs Revision (${statusCounts?.rejected || 0})`,
        flagged: `Flagged (${statusCounts?.flagged || 0})`,
        all: `All Listings (${statusCounts?.all || 0})`,
    };

    const handleDrawerApprove = (productId) => {
        executeSingleModeration(productId, 'approve', '');
    };

    const handleDrawerReject = (productId, feedbackReason) => {
        executeSingleModeration(productId, 'reject', feedbackReason);
    };

    const handleDrawerFlag = (productId, feedbackReason) => {
        executeSingleModeration(productId, 'flag', feedbackReason);
    };

    const executeSingleModeration = (productId, actionType, feedbackText = '') => {
        setIsModifyingProduct(true);
        router.post(route('admin.catalog.moderate'), {
            ids: [productId],
            action: actionType,
            feedback: feedbackText
        }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setInspectedProduct(null);
                addToast(`Product listing successfully ${actionType}d.`, 'success');
            },
            onError: (err) => {
                addToast(err.feedback || 'Failed to process moderation action.', 'error');
            },
            onFinish: () => {
                setIsModifyingProduct(false);
            }
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* KPI Telemetry Cards Panel */}
            <div className="flex overflow-x-auto gap-4 pb-2.5 flex-nowrap snap-x snap-mandatory lg:grid lg:grid-cols-4 no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
                <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                    <ModerationMetricCard 
                        title="Pending Review" 
                        value={statusCounts?.pending_review || 0} 
                        icon={Clock} 
                        tone="amber" 
                    />
                </div>
                <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                    <ModerationMetricCard 
                        title="Active Listings" 
                        value={statusCounts?.Active || 0} 
                        icon={CheckCircle2} 
                        tone="emerald" 
                    />
                </div>
                <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                    <ModerationMetricCard 
                        title="Flagged Listings" 
                        value={statusCounts?.flagged || 0} 
                        icon={ShieldAlert} 
                        tone="rose" 
                    />
                </div>
                <div className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto">
                    <ModerationMetricCard 
                        title="Needs Revision" 
                        value={statusCounts?.rejected || 0} 
                        icon={XCircle} 
                        tone="stone" 
                    />
                </div>
            </div>

            {/* Search & Filter Dashboard Card Container */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-6 space-y-4 shadow-sm">
                
                <ModerationFilterToolbar
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    isValidating={isValidating}
                    statusCounts={statusCounts}
                    shops={shops}
                    currentStatusFilter={currentStatusFilter}
                    setCurrentStatusFilter={setCurrentStatusFilter}
                    selectedShopId={selectedShopId}
                    setSelectedShopId={setSelectedShopId}
                    draftStatus={draftStatus}
                    setDraftStatus={setDraftStatus}
                    draftShopId={draftShopId}
                    setDraftShopId={setDraftShopId}
                    activeFiltersCount={activeFiltersCount}
                    draftActiveCount={draftActiveCount}
                    statusLabels={statusLabels}
                    handleOpenFilters={handleOpenFilters}
                    applyDraftFilters={applyDraftFilters}
                    resetFilters={resetFilters}
                    isPopoverOpen={isPopoverOpen}
                    setIsPopoverOpen={setIsPopoverOpen}
                    popoverRef={popoverRef}
                    isDrawerOpen={isDrawerOpen}
                    setIsDrawerOpen={setIsDrawerOpen}
                    onStatusFilterChange={handleStatusFilterChange}
                    onShopFilterChange={handleShopFilterChange}
                />

                {/* Products Moderation Grid/List - Desktop Table */}
                <div className="hidden lg:block overflow-x-auto no-scrollbar -mx-6 sm:mx-0">
                    <div className="inline-block min-w-full align-middle px-6 sm:px-0">
                        <div className="overflow-hidden border border-stone-200/60 rounded-xl">
                            <table className="w-full min-w-[940px] text-left border-collapse">
                                <thead>
                                    <tr className="bg-stone-50 border-b border-stone-100">
                                        <th className="py-4 pl-8 pr-4 text-[10px] font-bold text-stone-500 uppercase tracking-widest w-[32%] text-left align-middle">Product</th>
                                        <th className="py-4 px-4 text-[10px] font-bold text-stone-500 uppercase tracking-widest w-[22%] text-left align-middle">Artisan Seller</th>
                                        <th className="py-4 px-4 text-[10px] font-bold text-stone-500 uppercase tracking-widest w-[14%] text-center align-middle">Submitted</th>
                                        <th className="py-4 px-4 text-[10px] font-bold text-stone-500 uppercase tracking-widest w-[18%] text-center align-middle">Status</th>
                                        <th className="py-4 pl-4 pr-8 text-[10px] font-bold text-stone-500 uppercase tracking-widest w-[14%] text-right align-middle">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {products?.data?.length > 0 ? (
                                        products.data.map((product) => (
                                            <ModerationRowItem
                                                key={product.id}
                                                product={product}
                                                onInspect={setInspectedProduct}
                                            />
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="py-16">
                                                <EmptyState
                                                    compact
                                                    icon={Package}
                                                    title="No products matching status"
                                                    description="Currently no artisan listings are listed with this status moderation."
                                                />
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Mobile & Tablet Card Grid (lg:hidden) */}
                <div className="block lg:hidden space-y-4">
                    {products?.data?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {products.data.map((product) => (
                                <ModerationCardItem
                                    key={product.id}
                                    product={product}
                                    onInspect={setInspectedProduct}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 bg-white rounded-2xl border border-stone-200/80">
                            <EmptyState
                                compact
                                icon={Package}
                                title="No products matching status"
                                description="Currently no artisan listings are listed with this status moderation."
                            />
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {products?.last_page > 1 && (
                    <CompactPagination
                        currentPage={products.current_page}
                        totalPages={products.last_page}
                        totalItems={products.total}
                        itemsPerPage={products.per_page}
                        onPageChange={(products_page) => router.get(route('admin.catalog.index'), { 
                            tab: 'moderation', 
                            product_status: currentStatusFilter, 
                            shop_id: selectedShopId,
                            search: searchQuery,
                            products_page 
                        }, { preserveScroll: true, preserveState: true })}
                        itemLabel="products"
                    />
                )}
            </div>

            {/* Product Inspection & Moderation Drawer */}
            <ProductInspectionDrawer
                isOpen={!!inspectedProduct}
                product={inspectedProduct}
                onClose={() => setInspectedProduct(null)}
                onApprove={handleDrawerApprove}
                onReject={handleDrawerReject}
                onFlag={handleDrawerFlag}
                isProcessing={isModifyingProduct}
            />
        </div>
    );
}
