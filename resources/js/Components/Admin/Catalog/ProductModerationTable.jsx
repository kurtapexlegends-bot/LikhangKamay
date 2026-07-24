import React, { useState, useEffect, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { 
    XCircle, 
    ShieldAlert, 
    Package, 
    CheckCircle2, 
    Clock, 
    AlertTriangle, 
    Search, 
    Loader2,
    Eye,
    Store
} from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import CompactPagination from '@/Components/CompactPagination';
import EmptyState from '@/Components/WorkspaceEmptyState';
import ProductInspectionDrawer from '@/Components/Admin/Catalog/ProductInspectionDrawer';
import TextInput from '@/Components/TextInput';

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

    useEffect(() => {
        if (filters?.product_status && filters.product_status !== currentStatusFilter) {
            setCurrentStatusFilter(filters.product_status);
        }
        if (filters?.shop_id !== undefined && filters.shop_id !== selectedShopId) {
            setSelectedShopId(filters.shop_id || '');
        }
    }, [filters?.product_status, filters?.shop_id]);

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

    const handleProductStatusFilterChange = (status) => {
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <ModerationMetricCard 
                    title="Pending Review" 
                    value={statusCounts?.pending_review || 0} 
                    icon={Clock} 
                    tone="amber" 
                />
                <ModerationMetricCard 
                    title="Active Listings" 
                    value={statusCounts?.Active || 0} 
                    icon={CheckCircle2} 
                    tone="emerald" 
                />
                <ModerationMetricCard 
                    title="Flagged Listings" 
                    value={statusCounts?.flagged || 0} 
                    icon={ShieldAlert} 
                    tone="rose" 
                />
                <ModerationMetricCard 
                    title="Rejected Listings" 
                    value={statusCounts?.rejected || 0} 
                    icon={XCircle} 
                    tone="stone" 
                />
            </div>

            {/* Search & Filter Dashboard Card Container */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-6 space-y-6 shadow-sm">
                
                {/* Search & Filter Controls Grid */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                    {/* Left: Summary Title */}
                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-clay-500"></span>
                        Product Moderation Catalog
                    </div>

                    {/* Right: Filter Inputs Row */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                        {/* Status Filter Selection Dropdown */}
                        <div className="relative w-full sm:w-52">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                            <select
                                value={currentStatusFilter}
                                onChange={(e) => handleProductStatusFilterChange(e.target.value)}
                                className="pl-9 pr-8 text-xs py-2 w-full min-h-[38px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer"
                            >
                                <option value="pending_review">Pending Review ({statusCounts?.pending_review || 0})</option>
                                <option value="Active">Approved / Active ({statusCounts?.Active || 0})</option>
                                <option value="rejected">Rejected ({statusCounts?.rejected || 0})</option>
                                <option value="flagged">Flagged ({statusCounts?.flagged || 0})</option>
                                <option value="all">All Listings ({statusCounts?.all || 0})</option>
                            </select>
                        </div>

                        {/* Per-Shop Filter Selection */}
                        {shops.length > 0 && (
                            <div className="relative w-full sm:w-52">
                                <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                                <select
                                    value={selectedShopId}
                                    onChange={(e) => handleShopFilterChange(e.target.value)}
                                    className="pl-9 pr-8 text-xs py-2 w-full min-h-[38px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer"
                                >
                                    <option value="">All Artisan Shops ({shops.length})</option>
                                    {shops.map((shop) => (
                                        <option key={shop.id} value={shop.id}>
                                            {shop.shop_name || shop.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Search Input Bar */}
                        <div className="relative w-full sm:w-60">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                            <TextInput 
                                placeholder="Search by title or SKU..." 
                                className="pl-9 text-xs py-2 w-full min-h-[38px] bg-white hover:border-stone-300 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {isValidating && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 size={14} className="text-stone-400 animate-spin" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

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
                                            <tr key={product.id} className="hover:bg-stone-50/30 transition duration-150 group">
                                                <td className="py-4 pl-8 pr-4 align-middle">
                                                    <div className="flex items-center justify-start gap-4 cursor-pointer" onClick={() => setInspectedProduct(product)}>
                                                        <div className="w-12 h-12 rounded-xl border border-stone-200 bg-stone-50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                            {product.img || product.cover_photo_path ? (
                                                                <img
                                                                    src={product.img || (product.cover_photo_path?.startsWith('http') ? product.cover_photo_path : `/storage/${product.cover_photo_path}`)}
                                                                    alt={product.name || ''}
                                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                                    onError={(e) => {
                                                                        e.target.onerror = null;
                                                                        e.target.src = '/images/placeholder.svg';
                                                                    }}
                                                                />
                                                            ) : (
                                                                <Package size={16} className="text-stone-300" />
                                                            )}
                                                        </div>
                                                        <div className="max-w-[200px] text-left">
                                                            <p className="text-xs font-bold text-stone-900 truncate hover:text-clay-600 transition-colors">{product.name}</p>
                                                            <p className="text-[10px] text-stone-550 font-mono tracking-wider bg-stone-100/80 rounded px-1.5 py-0.5 w-fit mt-1">SKU: {product.sku}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 align-middle text-xs font-bold text-stone-850">
                                                    <div className="text-left">
                                                        <p className="text-stone-900">{product.user?.shop_name || 'Individual Seller'}</p>
                                                        <p className="text-[10px] text-stone-500 font-medium mt-0.5">{product.user?.name}</p>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-center align-middle text-xs font-semibold text-stone-500">
                                                    {product.created_at ? new Date(product.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                                                </td>
                                                <td className="py-4 px-4 text-center align-middle whitespace-nowrap">
                                                    {product.status === 'Active' ? (
                                                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-100/40"><CheckCircle2 size={12}/> Active</span>
                                                    ) : product.status === 'pending_review' ? (
                                                        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-100/40"><Clock size={12}/> Pending Review</span>
                                                    ) : product.status === 'rejected' ? (
                                                        <span className="inline-flex items-center gap-1.5 bg-red-55/10 text-red-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-red-100/40"><XCircle size={12}/> Rejected</span>
                                                    ) : product.status === 'flagged' ? (
                                                        <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-rose-200/40"><ShieldAlert size={12}/> Flagged</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 bg-stone-50 text-stone-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-stone-200/40"><AlertTriangle size={12}/> {product.status}</span>
                                                    )}
                                                    {product.rejection_reason && (
                                                        <p className="text-[10px] text-red-550 mt-1.5 max-w-[180px] truncate font-bold mx-auto text-left w-fit" title={product.rejection_reason}>
                                                            Reason: {product.rejection_reason}
                                                        </p>
                                                    )}
                                                    {product.status === 'pending_review' && product.latest_resubmission?.notes && (
                                                        <div className="mt-1.5 text-[10px] text-stone-600 bg-stone-50 p-2 rounded-lg border border-stone-200 max-w-[200px] break-words font-medium mx-auto text-left w-fit">
                                                            <span className="font-bold text-stone-700">Seller Notes:</span> "{product.latest_resubmission.notes}"
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-4 pl-4 pr-8 align-middle">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {/* Mandatory Pre-Viewing Inspect Action */}
                                                        <button
                                                            onClick={() => setInspectedProduct(product)}
                                                            className="px-3.5 py-1.5 rounded-xl bg-clay-50 hover:bg-clay-600 text-clay-700 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-clay-200/60 hover:border-transparent active:scale-95 transition-all duration-200 shadow-sm"
                                                            title="Inspect Product Details"
                                                        >
                                                            <Eye size={14} />
                                                            <span>Inspect</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
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
                            {products.data.map((product) => {
                                return (
                                    <div 
                                        key={product.id}
                                        className="bg-white border border-stone-200/80 hover:border-stone-300 rounded-2xl p-4 flex flex-col justify-between gap-4 transition-all duration-200 hover:shadow-md"
                                    >
                                        <div className="flex gap-4">
                                            {/* Left Column: Image */}
                                            <div className="w-16 h-16 rounded-xl border border-stone-200 bg-stone-50 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                {product.img || product.cover_photo_path ? (
                                                    <img
                                                        src={product.img || (product.cover_photo_path?.startsWith('http') ? product.cover_photo_path : `/storage/${product.cover_photo_path}`)}
                                                        alt={product.name || ''}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = '/images/placeholder.svg';
                                                        }}
                                                    />
                                                ) : (
                                                    <Package className="text-stone-300" size={24} />
                                                )}
                                            </div>

                                            {/* Right Column: Title / Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 
                                                        onClick={() => setInspectedProduct(product)}
                                                        className="font-bold text-stone-900 text-sm hover:text-clay-600 transition-colors cursor-pointer truncate"
                                                        title={product.name}
                                                    >
                                                        {product.name}
                                                    </h3>
                                                    <span className="text-[10px] font-bold text-stone-400 whitespace-nowrap bg-stone-50 px-2 py-0.5 rounded-md border border-stone-150">
                                                        ₱{product.price}
                                                    </span>
                                                </div>
                                                
                                                <p className="text-[10px] text-stone-500 mt-0.5 truncate">
                                                    SKU: {product.sku || 'N/A'}
                                                </p>

                                                <div className="mt-2 space-y-1">
                                                    <p className="text-[11px] font-semibold text-stone-700 flex items-center gap-1">
                                                        <span className="text-stone-400 font-normal">Shop:</span> {product.user?.shop_name || product.user?.name}
                                                    </p>
                                                    <p className="text-[10px] text-stone-400">
                                                        Submitted: {new Date(product.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status & Actions Row */}
                                        <div className="flex items-center justify-between gap-3 pt-3 border-t border-stone-100 mt-auto">
                                            {/* Status Badge */}
                                            <div>
                                                {product.status === 'pending_review' && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-250">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                        Pending Review
                                                    </span>
                                                )}
                                                {product.status === 'Active' && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-250">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                        Approved
                                                    </span>
                                                )}
                                                {product.status === 'rejected' && (
                                                    <div className="flex flex-col">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-250 w-fit">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                                            Rejected
                                                        </span>
                                                        {product.rejection_reason && (
                                                            <span className="text-[9px] text-red-550 mt-1 max-w-[150px] truncate" title={product.rejection_reason}>
                                                                {product.rejection_reason}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {product.status === 'flagged' && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-250">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-stone-500"></span>
                                                        Flagged
                                                    </span>
                                                )}
                                            </div>

                                            {/* Action Button */}
                                            <button
                                                onClick={() => setInspectedProduct(product)}
                                                className="px-4 py-2 rounded-xl bg-clay-50 hover:bg-clay-600 text-clay-700 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-clay-200/60 hover:border-transparent active:scale-95 transition-all duration-200 shadow-sm"
                                            >
                                                <Eye size={13} />
                                                <span>Inspect</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
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
