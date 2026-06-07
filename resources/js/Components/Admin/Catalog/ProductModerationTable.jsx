import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Check, XCircle, ShieldAlert, Package, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import CompactPagination from '@/Components/CompactPagination';
import EmptyState from '@/Components/WorkspaceEmptyState';
import BulkActionPill, { ActionTooltip } from '@/Components/Admin/Layout/BulkActionPill';
import ProductModerationModal from '@/Components/Admin/Catalog/ProductModerationModal';

export default function ProductModerationTable({ products, filters }) {
    const { addToast } = useToast();
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [currentStatusFilter, setCurrentStatusFilter] = useState(filters?.product_status || 'pending_review');
    const [isModifyingProduct, setIsModifyingProduct] = useState(false);
    const [moderationModal, setModerationModal] = useState({ isOpen: false, type: null, ids: [] });
    const [moderationFeedback, setModerationFeedback] = useState('');
    const [lastType, setLastType] = useState('reject');

    useEffect(() => {
        if (filters?.product_status && filters.product_status !== currentStatusFilter) {
            setCurrentStatusFilter(filters.product_status);
        }
    }, [filters?.product_status]);

    const handleProductStatusFilterChange = (status) => {
        setCurrentStatusFilter(status);
        setSelectedProductIds([]);
        router.get(route('admin.catalog.index'), { tab: 'moderation', product_status: status }, { preserveScroll: true, preserveState: true });
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
        <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
                {/* Desktop view */}
                <div className="hidden md:flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-stone-500 uppercase tracking-widest whitespace-nowrap">Filter Status:</label>
                        <select
                            value={currentStatusFilter}
                            onChange={(e) => handleProductStatusFilterChange(e.target.value)}
                            className="rounded-xl border-stone-200 text-xs font-bold text-stone-700 bg-stone-50 focus:bg-white focus:border-clay-300 focus:ring-1 focus:ring-clay-300 transition min-h-[44px]"
                        >
                            <option value="pending_review">Pending Review</option>
                            <option value="rejected">Rejected</option>
                            <option value="flagged">Flagged</option>
                            <option value="Active">Approved / Active</option>
                            <option value="all">All Listings</option>
                        </select>
                    </div>
                </div>

                {/* Mobile view: horizontal scroll filter pills */}
                <div className="md:hidden flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Filter Status</label>
                    <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1 flex-nowrap -mx-4 px-4">
                        {[
                            { value: 'pending_review', label: 'Pending Review' },
                            { value: 'Active', label: 'Approved' },
                            { value: 'rejected', label: 'Rejected' },
                            { value: 'flagged', label: 'Flagged' },
                            { value: 'all', label: 'All Listings' }
                        ].map(pill => (
                            <button
                                key={pill.value}
                                type="button"
                                onClick={() => handleProductStatusFilterChange(pill.value)}
                                className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 border min-h-[44px] ${
                                    currentStatusFilter === pill.value
                                        ? 'bg-clay-600 text-white border-clay-600 shadow-sm'
                                        : 'bg-stone-50 text-stone-600 border-stone-205 border-stone-200/60 hover:bg-stone-100'
                                }`}
                            >
                                {pill.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto no-scrollbar -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <div className="overflow-hidden bg-white rounded-2xl border border-stone-200 shadow-sm">
                        <table className="w-full min-w-[940px] text-left border-collapse">
                            <thead>
                                <tr className="bg-stone-50 border-b border-stone-100">
                                    <th className="py-4 px-6 w-12 text-center align-middle">
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAllProducts}
                                            checked={products?.data?.length > 0 && selectedProductIds.length === products.data.length}
                                            className="rounded text-clay-600 focus:ring-clay-500"
                                        />
                                    </th>
                                    <th className="py-4 px-6 text-[10px] font-bold text-stone-500 uppercase tracking-widest w-1/3">Product</th>
                                    <th className="py-4 px-6 text-[10px] font-bold text-stone-500 uppercase tracking-widest">Artisan Seller</th>
                                    <th className="py-4 px-6 text-[10px] font-bold text-stone-500 uppercase tracking-widest">Submitted</th>
                                    <th className="py-4 px-6 text-[10px] font-bold text-stone-500 uppercase tracking-widest">Status</th>
                                    <th className="py-4 px-6 text-[10px] font-bold text-stone-500 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {products?.data?.length > 0 ? (
                                    products.data.map((product) => (
                                        <tr key={product.id} className="hover:bg-stone-50/50 transition duration-150">
                                            <td className="py-4 px-6 text-center align-middle">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedProductIds.includes(product.id)}
                                                    onChange={() => handleSelectProduct(product.id)}
                                                    className="rounded text-clay-600 focus:ring-clay-500"
                                                />
                                            </td>
                                            <td className="py-4 px-6 align-middle">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl border border-stone-200 bg-stone-50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                        {product.cover_photo_path ? (
                                                            <img
                                                                src={`/storage/${product.cover_photo_path}`}
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                                            />
                                                        ) : (
                                                            <Package size={16} className="text-stone-300" />
                                                        )}
                                                    </div>
                                                    <div className="max-w-[200px]">
                                                        <p className="text-sm font-bold text-stone-900 truncate">{product.name}</p>
                                                        <p className="text-[10px] text-stone-500 mt-0.5 truncate">SKU: {product.sku}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 align-middle text-sm font-bold text-stone-850">
                                                <div>
                                                    <p className="text-stone-905">{product.user?.shop_name || 'Individual Seller'}</p>
                                                    <p className="text-[10px] text-stone-500 font-medium mt-0.5">{product.user?.name}</p>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 align-middle text-xs font-semibold text-stone-550">
                                                {product.created_at ? new Date(product.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                                            </td>
                                            <td className="py-4 px-6 align-middle">
                                                {product.status === 'Active' ? (
                                                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-emerald-100/30"><CheckCircle2 size={12}/> Active</span>
                                                ) : product.status === 'pending_review' ? (
                                                    <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-amber-100/30"><Clock size={12}/> Pending Review</span>
                                                ) : product.status === 'rejected' ? (
                                                    <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-red-100/30"><XCircle size={12}/> Rejected</span>
                                                ) : product.status === 'flagged' ? (
                                                    <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-rose-200/30"><ShieldAlert size={12}/> Flagged</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 bg-stone-50 text-stone-705 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-stone-200/30"><AlertTriangle size={12}/> {product.status}</span>
                                                )}
                                                {product.rejection_reason && (
                                                    <p className="text-[10px] text-red-500 mt-1.5 max-w-[180px] truncate" title={product.rejection_reason}>
                                                        Reason: {product.rejection_reason}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 align-middle text-right">
                                                <div className="flex items-center justify-end gap-2.5">
                                                    {product.status !== 'Active' && (
                                                        <button
                                                            onClick={() => triggerModeration(product.id, 'approve')}
                                                            className="p-2.5 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition min-h-[44px] min-w-[44px] flex items-center justify-center shadow-sm"
                                                            title="Approve Listing"
                                                        >
                                                            <Check size={14} strokeWidth={2.5} />
                                                        </button>
                                                    )}
                                                    {product.status !== 'rejected' && (
                                                        <button
                                                            onClick={() => triggerModeration(product.id, 'reject')}
                                                            className="p-2.5 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition min-h-[44px] min-w-[44px] flex items-center justify-center shadow-sm"
                                                            title="Reject Listing"
                                                        >
                                                            <XCircle size={14} strokeWidth={2.5} />
                                                        </button>
                                                    )}
                                                    {product.status !== 'flagged' && (
                                                        <button
                                                            onClick={() => triggerModeration(product.id, 'flag')}
                                                            className="p-2.5 text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition min-h-[44px] min-w-[44px] flex items-center justify-center shadow-sm"
                                                            title="Flag Listing"
                                                        >
                                                            <ShieldAlert size={14} strokeWidth={2.5} />
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
                    onPageChange={(products_page) => router.get(route('admin.catalog.index'), { tab: 'moderation', product_status: currentStatusFilter, products_page }, { preserveScroll: true, preserveState: true })}
                    itemLabel="products"
                />
            )}

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
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-90 min-h-[44px]"
                    >
                        <Check size={20} />
                    </button>
                </ActionTooltip>

                <ActionTooltip text="Reject Selected">
                    <button
                        onClick={() => triggerModeration(selectedProductIds, 'reject')}
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500 text-white shadow-lg shadow-rose-500/20 transition-all hover:bg-rose-600 active:scale-90 min-h-[44px]"
                    >
                        <XCircle size={20} />
                    </button>
                </ActionTooltip>

                <ActionTooltip text="Flag Selected">
                    <button
                        onClick={() => triggerModeration(selectedProductIds, 'flag')}
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-600 active:scale-90 min-h-[44px]"
                    >
                        <ShieldAlert size={20} />
                    </button>
                </ActionTooltip>
            </BulkActionPill>
        </div>
    );
}
