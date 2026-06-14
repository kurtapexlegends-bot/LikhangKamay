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
            {/* Status Pills */}
            <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1.5 flex-nowrap px-1">
                {[
                    { value: 'pending_review', label: 'Pending Review' },
                    { value: 'Active', label: 'Approved / Active' },
                    { value: 'rejected', label: 'Rejected' },
                    { value: 'flagged', label: 'Flagged' },
                    { value: 'all', label: 'All Listings' }
                ].map((pill) => (
                    <button
                        key={pill.value}
                        type="button"
                        onClick={() => handleProductStatusFilterChange(pill.value)}
                        className={`px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 min-h-[44px] sm:min-h-0 ${
                            currentStatusFilter === pill.value
                                ? 'bg-clay-600 text-white shadow-md shadow-clay-600/15'
                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200/50'
                        }`}
                    >
                        {pill.label}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto no-scrollbar -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <div className="overflow-hidden bg-white rounded-[24px] border border-stone-150 shadow-sm">
                        <table className="w-full min-w-[940px] text-left border-collapse">
                            <thead>
                                <tr className="bg-stone-50 border-b border-stone-100">
                                    <th className="py-4 px-6 w-12 text-center align-middle">
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAllProducts}
                                            checked={products?.data?.length > 0 && selectedProductIds.length === products.data.length}
                                            className="rounded-md border-stone-300 text-clay-600 focus:ring-clay-500/30 focus:ring-offset-0 h-4.5 w-4.5 cursor-pointer"
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
                                                    className="rounded-md border-stone-300 text-clay-600 focus:ring-clay-500/30 focus:ring-offset-0 h-4.5 w-4.5 cursor-pointer"
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
                                                        <p className="text-[10px] text-stone-500 font-mono tracking-wider bg-stone-100 rounded px-1.5 py-0.5 w-fit mt-1">SKU: {product.sku}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 align-middle text-sm font-bold text-stone-850">
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
                                                    <span className="inline-flex items-center gap-1.5 bg-emerald-50/50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-100/40"><CheckCircle2 size={12}/> Active</span>
                                                ) : product.status === 'pending_review' ? (
                                                    <span className="inline-flex items-center gap-1.5 bg-amber-50/50 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-100/40"><Clock size={12}/> Pending Review</span>
                                                ) : product.status === 'rejected' ? (
                                                    <span className="inline-flex items-center gap-1.5 bg-red-50/50 text-red-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-red-100/40"><XCircle size={12}/> Rejected</span>
                                                ) : product.status === 'flagged' ? (
                                                    <span className="inline-flex items-center gap-1.5 bg-rose-50/50 text-rose-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-rose-200/40"><ShieldAlert size={12}/> Flagged</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 bg-stone-50/50 text-stone-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-stone-200/40"><AlertTriangle size={12}/> {product.status}</span>
                                                )}
                                                {product.rejection_reason && (
                                                    <p className="text-[10px] text-red-500 mt-1.5 max-w-[180px] truncate font-medium" title={product.rejection_reason}>
                                                        Reason: {product.rejection_reason}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 align-middle text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {product.status !== 'Active' && (
                                                        <button
                                                            onClick={() => triggerModeration(product.id, 'approve')}
                                                            className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100/30 transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                            title="Approve Listing"
                                                        >
                                                            <Check size={16} strokeWidth={2.5} />
                                                        </button>
                                                    )}
                                                    {product.status !== 'rejected' && (
                                                        <button
                                                            onClick={() => triggerModeration(product.id, 'reject')}
                                                            className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100/30 transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                            title="Reject Listing"
                                                        >
                                                            <XCircle size={16} strokeWidth={2.5} />
                                                        </button>
                                                    )}
                                                    {product.status !== 'flagged' && (
                                                        <button
                                                            onClick={() => triggerModeration(product.id, 'flag')}
                                                            className="p-2 rounded-xl text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-100/30 transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
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
