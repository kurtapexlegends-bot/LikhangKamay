import React, { useState, useEffect, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { 
    Check, 
    XCircle, 
    ShieldAlert, 
    Package, 
    CheckCircle2, 
    Clock, 
    AlertTriangle, 
    Search, 
    Loader2 
} from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import CompactPagination from '@/Components/CompactPagination';
import EmptyState from '@/Components/WorkspaceEmptyState';
import BulkActionPill, { ActionTooltip } from '@/Components/Admin/Layout/BulkActionPill';
import ProductModerationModal from '@/Components/Admin/Catalog/ProductModerationModal';
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
                <p className="text-stone-500 text-[10px] font-bold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-black text-stone-900 tracking-tight">{value}</h3>
                <p className="text-[10px] font-medium text-stone-400 mt-1">Listing count</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${tones[tone] || tones.amber}`}>
                <Icon size={18} />
            </div>
        </div>
    );
};

export default function ProductModerationTable({ products, filters, statusCounts }) {
    const { addToast } = useToast();
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [currentStatusFilter, setCurrentStatusFilter] = useState(filters?.product_status || 'pending_review');
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [isModifyingProduct, setIsModifyingProduct] = useState(false);
    const [moderationModal, setModerationModal] = useState({ isOpen: false, type: null, ids: [] });
    const [moderationFeedback, setModerationFeedback] = useState('');
    const [lastType, setLastType] = useState('reject');
    const [isValidating, setIsValidating] = useState(false);

    useEffect(() => {
        if (filters?.product_status && filters.product_status !== currentStatusFilter) {
            setCurrentStatusFilter(filters.product_status);
        }
    }, [filters?.product_status]);

    // Debounced Search Handler
    useEffect(() => {
        if (searchQuery === (filters?.search || '')) return;

        setIsValidating(true);
        const timeoutId = setTimeout(() => {
            router.get(route('admin.catalog.index'), {
                tab: 'moderation',
                product_status: currentStatusFilter,
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
        setSelectedProductIds([]);
        router.get(route('admin.catalog.index'), { 
            tab: 'moderation', 
            product_status: status,
            search: searchQuery
        }, { preserveScroll: true, preserveState: true });
    };

    const handleSelectAllProducts = (e) => {
        if (e.target.checked) {
            setSelectedProductIds(products?.data?.map(p => p.id) || []);
        } else {
            setSelectedProductIds([]);
        }
    };

    const handleSelectProduct = (productId) => {
        setSelectedProductIds(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    const triggerModeration = (ids, type) => {
        setModerationFeedback('');
        setModerationModal({ isOpen: true, type, ids: Array.isArray(ids) ? ids : [ids] });
        if (type === 'reject' || type === 'flag') {
            setLastType(type);
        }
    };

    const confirmModerationAction = () => {
        const { type, ids } = moderationModal;

        if (type !== 'approve' && !moderationFeedback.trim()) {
            addToast('Feedback/reason is required.', 'error');
            return;
        }

        setIsModifyingProduct(true);
        router.post(route('admin.catalog.moderate'), {
            ids,
            action: type,
            feedback: moderationFeedback.trim()
        }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setSelectedProductIds([]);
                setModerationModal({ isOpen: false, type: null, ids: [] });
                setModerationFeedback('');
                addToast(`Product(s) successfully ${type}d.`, 'success');
            },
            onError: (err) => {
                addToast(err.feedback || 'Failed to moderate product(s).', 'error');
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
                
                {/* Search Bar & Inline Category Filter Selection */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    {/* Status selection pills with count numbers */}
                    <div className="flex flex-wrap gap-2">
                        {[
                            { value: 'pending_review', label: 'Pending Review', count: statusCounts?.pending_review || 0 },
                            { value: 'Active', label: 'Approved / Active', count: statusCounts?.Active || 0 },
                            { value: 'rejected', label: 'Rejected', count: statusCounts?.rejected || 0 },
                            { value: 'flagged', label: 'Flagged', count: statusCounts?.flagged || 0 },
                            { value: 'all', label: 'All Listings', count: statusCounts?.all || 0 }
                        ].map((pill) => (
                            <button
                                key={pill.value}
                                type="button"
                                onClick={() => handleProductStatusFilterChange(pill.value)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 min-h-[38px] ${
                                    currentStatusFilter === pill.value
                                        ? 'bg-clay-600 text-white shadow-md shadow-clay-600/10'
                                        : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200/40'
                                }`}
                            >
                                <span>{pill.label}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black tracking-wider ${
                                    currentStatusFilter === pill.value ? 'bg-white/20 text-white' : 'bg-stone-200/50 text-stone-500'
                                }`}>
                                    {pill.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Search Input Bar */}
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                        <TextInput 
                            placeholder="Search by title or SKU..." 
                            className="pl-9 text-xs py-2 w-full min-h-[38px] bg-stone-50/20"
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

                {/* Products Moderation Grid/List */}
                <div className="overflow-x-auto no-scrollbar -mx-6 sm:mx-0">
                    <div className="inline-block min-w-full align-middle px-6 sm:px-0">
                        <div className="overflow-hidden border border-stone-200/60 rounded-xl">
                            <table className="w-full min-w-[940px] text-left border-collapse">
                                <thead>
                                    <tr className="bg-stone-50 border-b border-stone-100">
                                        <th className="py-4 px-6 w-12 text-center align-middle">
                                            <div className="flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    onChange={handleSelectAllProducts}
                                                    checked={products?.data?.length > 0 && selectedProductIds.length === products.data.length}
                                                    className="rounded-md border-stone-300 text-clay-600 focus:ring-clay-500/30 focus:ring-offset-0 h-4.5 w-4.5 cursor-pointer"
                                                />
                                            </div>
                                        </th>
                                        <th className="py-4 px-6 text-[10px] font-bold text-stone-500 uppercase tracking-widest w-[30%]">Product</th>
                                        <th className="py-4 px-6 text-[10px] font-bold text-stone-500 uppercase tracking-widest w-[20%]">Artisan Seller</th>
                                        <th className="py-4 px-6 text-[10px] font-bold text-stone-500 uppercase tracking-widest w-[15%]">Submitted</th>
                                        <th className="py-4 px-6 text-[10px] font-bold text-stone-500 uppercase tracking-widest w-[20%]">Status</th>
                                        <th className="py-4 px-6 text-[10px] font-bold text-stone-500 uppercase tracking-widest w-[15%] text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {products?.data?.length > 0 ? (
                                        products.data.map((product) => (
                                            <tr key={product.id} className="hover:bg-stone-50/30 transition duration-150 group">
                                                <td className="py-4 px-6 text-center align-middle w-12">
                                                    <div className="flex items-center justify-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedProductIds.includes(product.id)}
                                                            onChange={() => handleSelectProduct(product.id)}
                                                            className="rounded-md border-stone-300 text-clay-600 focus:ring-clay-500/30 focus:ring-offset-0 h-4.5 w-4.5 cursor-pointer"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 align-middle">
                                                    <div className="flex items-center gap-4">
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
                                                        <div className="max-w-[200px]">
                                                            <p className="text-xs font-bold text-stone-900 truncate">{product.name}</p>
                                                            <p className="text-[10px] text-stone-550 font-mono tracking-wider bg-stone-100/80 rounded px-1.5 py-0.5 w-fit mt-1">SKU: {product.sku}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 align-middle text-xs font-bold text-stone-850">
                                                    <div>
                                                        <p className="text-stone-900">{product.user?.shop_name || 'Individual Seller'}</p>
                                                        <p className="text-[10px] text-stone-500 font-medium mt-0.5">{product.user?.name}</p>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 align-middle text-xs font-semibold text-stone-500">
                                                    {product.created_at ? new Date(product.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                                                </td>
                                                <td className="py-4 px-6 align-middle whitespace-nowrap">
                                                    {product.status === 'Active' ? (
                                                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-100/40"><CheckCircle2 size={12}/> Active</span>
                                                    ) : product.status === 'pending_review' ? (
                                                        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-100/40"><Clock size={12}/> Pending Review</span>
                                                    ) : product.status === 'rejected' ? (
                                                        <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-red-100/40"><XCircle size={12}/> Rejected</span>
                                                    ) : product.status === 'flagged' ? (
                                                        <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-rose-200/40"><ShieldAlert size={12}/> Flagged</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 bg-stone-50 text-stone-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-stone-200/40"><AlertTriangle size={12}/> {product.status}</span>
                                                    )}
                                                    {product.rejection_reason && (
                                                        <p className="text-[10px] text-red-550 mt-1.5 max-w-[180px] truncate font-bold" title={product.rejection_reason}>
                                                            Reason: {product.rejection_reason}
                                                        </p>
                                                    )}
                                                    {product.status === 'pending_review' && product.latest_resubmission?.notes && (
                                                        <div className="mt-1.5 text-[10px] text-stone-600 bg-stone-50 p-2 rounded-lg border border-stone-200 max-w-[200px] break-words font-medium">
                                                            <span className="font-bold text-stone-700">Seller Notes:</span> "{product.latest_resubmission.notes}"
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6 align-middle text-right">
                                                    <div className="flex items-center justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                        {product.status !== 'Active' && (
                                                            <button
                                                                onClick={() => triggerModeration(product.id, 'approve')}
                                                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100/30 transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center shadow-sm"
                                                                title="Approve Listing"
                                                            >
                                                                <Check size={16} strokeWidth={2.5} />
                                                            </button>
                                                        )}
                                                        {product.status !== 'rejected' && (
                                                            <button
                                                                onClick={() => triggerModeration(product.id, 'reject')}
                                                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100/30 transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center shadow-sm"
                                                                title="Reject Listing"
                                                            >
                                                                <XCircle size={16} strokeWidth={2.5} />
                                                            </button>
                                                        )}
                                                        {product.status !== 'flagged' && (
                                                            <button
                                                                onClick={() => triggerModeration(product.id, 'flag')}
                                                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-100/30 transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center shadow-sm"
                                                                title="Flag Listing"
                                                            >
                                                                <ShieldAlert size={16} strokeWidth={2.5} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="py-16">
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
                            search: searchQuery,
                            products_page 
                        }, { preserveScroll: true, preserveState: true })}
                        itemLabel="products"
                    />
                )}
            </div>

            {/* Moderation Modal Dialog */}
            <ProductModerationModal
                isOpen={moderationModal.isOpen}
                type={moderationModal.type}
                ids={moderationModal.ids}
                processing={isModifyingProduct}
                feedback={moderationFeedback}
                setFeedback={setModerationFeedback}
                onClose={() => setModerationModal({ isOpen: false, type: null, ids: [] })}
                onConfirm={confirmModerationAction}
                lastType={lastType}
            />

            {/* Sticky Bulk Actions Bar */}
            <BulkActionPill selectedCount={selectedProductIds.length} onClear={() => setSelectedProductIds([])}>
                <ActionTooltip text="Approve Selected">
                    <button
                        onClick={() => triggerModeration(selectedProductIds, 'approve')}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50/40 text-emerald-600 hover:bg-emerald-100/60 hover:text-emerald-700 transition-all duration-205 active:scale-90 shadow-sm"
                    >
                        <Check size={18} strokeWidth={2.5} />
                    </button>
                </ActionTooltip>

                <ActionTooltip text="Reject Selected">
                    <button
                        onClick={() => triggerModeration(selectedProductIds, 'reject')}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-100 bg-rose-50/40 text-rose-600 hover:bg-rose-100/60 hover:text-rose-700 transition-all duration-205 active:scale-90 shadow-sm"
                    >
                        <XCircle size={18} />
                    </button>
                </ActionTooltip>

                <ActionTooltip text="Flag Selected">
                    <button
                        onClick={() => triggerModeration(selectedProductIds, 'flag')}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-100 bg-amber-50/40 text-amber-600 hover:bg-amber-100/60 hover:text-amber-700 transition-all duration-205 active:scale-90 shadow-sm"
                    >
                        <ShieldAlert size={18} />
                    </button>
                </ActionTooltip>
            </BulkActionPill>
        </div>
    );
}
