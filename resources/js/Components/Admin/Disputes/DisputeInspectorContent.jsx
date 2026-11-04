import React, { useState } from 'react';
import UserAvatar from '@/Components/UserAvatar';
import ImageDiffSlider from '@/Components/Common/ImageDiffSlider';
import {
    AlertTriangle,
    Package,
    Store,
    Eye,
    X,
    CheckCircle2,
    ArrowLeft,
    Scale,
    Clock
} from 'lucide-react';

export default function DisputeInspectorContent({
    dispute,
    notes,
    setNotes,
    error,
    setError,
    isSubmitting,
    openConfirmModal,
    openLightbox,
    onBack,
    onClose
}) {
    const [selectedBeforeIdx, setSelectedBeforeIdx] = useState(0);
    const [selectedAfterIdx, setSelectedAfterIdx] = useState(0);

    const order = dispute.order;
    const buyerName = order?.user?.name || order?.customer_name || 'Customer';
    const shopName = order?.artisan?.shop_name || order?.artisan?.name || 'Shop';
    const totalAmount = order?.total_amount ? Number(order.total_amount) : 0;
    const items = order?.items || [];
    const proofPhotos = Array.isArray(dispute.proof_photos) ? dispute.proof_photos : [];
    const sellerPhotos = Array.isArray(dispute.seller_proof_photos) 
        ? dispute.seller_proof_photos 
        : (Array.isArray(order?.packing_photos) 
            ? order.packing_photos 
            : (order?.proof_of_delivery ? [order.proof_of_delivery] : []));
    
    const catalogPhotos = items
        .map((i) => i.product_img || i.product?.cover_photo_path || (i.product?.img && !i.product.img.includes('placeholder') ? i.product.img : null))
        .filter(Boolean);
    const comparisonSellerPhotos = sellerPhotos.length > 0 ? sellerPhotos : catalogPhotos;
    const isCatalogFallback = sellerPhotos.length === 0 && catalogPhotos.length > 0;
    const beforeLabel = isCatalogFallback ? 'Catalog Reference' : 'Shop Pre-Shipment';
    const hasComparisonImages = proofPhotos.length > 0 || comparisonSellerPhotos.length > 0;

    const getInspectorStatusBadge = () => {
        switch (dispute.status) {
            case 'escalated':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 border border-amber-200/80">
                        <AlertTriangle size={11} className="text-amber-600" /> Needs Review
                    </span>
                );
            case 'resolved_refunded':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800 border border-emerald-200/80">
                        <CheckCircle2 size={11} className="text-emerald-600" /> Refund Approved
                    </span>
                );
            case 'resolved_rejected':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-700 border border-stone-200/80">
                        <X size={11} className="text-stone-500" /> Payment Released to Shop
                    </span>
                );
            case 'seller_accepted':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800 border border-emerald-200/80">
                        <CheckCircle2 size={11} className="text-emerald-600" /> Shop Accepted Refund
                    </span>
                );
            case 'seller_proposed_replacement':
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-800 border border-indigo-200/80">
                        <Store size={11} className="text-indigo-600" /> Replacement Offered
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-800 border border-sky-200/80">
                        <Clock size={11} className="text-sky-600" /> In Progress
                    </span>
                );
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white">
            {/* Pinned Lean Header */}
            <div className="px-5 py-3.5 border-b border-stone-100 shrink-0 flex flex-wrap items-center justify-between gap-2.5 bg-[#FCFBF9]">
                <div className="flex items-center gap-2 flex-wrap">
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="lg:hidden inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg transition mr-1 cursor-pointer"
                        >
                            <ArrowLeft size={13} />
                            <span>Back</span>
                        </button>
                    )}
                    <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-200/60">
                        Dispute #{dispute.id}
                    </span>
                    <span className="text-[11px] font-medium text-stone-400">
                        {dispute.updated_at ? new Date(dispute.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                    </span>
                    <span className="text-stone-300">•</span>
                    <span className="text-xs text-stone-500 font-medium">
                        Order <strong className="text-stone-800 font-bold">#{order?.order_number || dispute.order_id}</strong>
                    </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {getInspectorStatusBadge()}
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="hidden lg:flex p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                            title="Close Inspector"
                        >
                            <X size={15} />
                        </button>
                    )}
                </div>
            </div>

            {/* Scrollable Case Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-[#FAF9F6] custom-scrollbar">
                {/* 1. Disputed Order Summary */}
                <div className="bg-white border border-stone-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                        <div className="flex items-center gap-2">
                            <Package size={15} className="text-clay-700" />
                            <h4 className="text-xs font-bold text-stone-900">
                                Order Summary
                            </h4>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-stone-900">
                                Total: ₱{totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </span>
                            {order?.payment_status && (
                                <span className="inline-flex rounded-md bg-stone-100 px-2 py-0.5 text-[9px] font-bold uppercase text-stone-600 border border-stone-200">
                                    {order.payment_status}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Order Items Preview */}
                    {items.length > 0 ? (
                        <div className="divide-y divide-stone-100">
                            {items.map((item, idx) => {
                                const imgSrc = item.product_img || item.product?.cover_photo_path;
                                return (
                                    <div key={idx} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {imgSrc ? (
                                                <img
                                                    src={imgSrc.startsWith('http') || imgSrc.startsWith('/storage') ? imgSrc : `/storage/${imgSrc}`}
                                                    alt={item.product_name}
                                                    className="w-10 h-10 object-cover rounded-lg border border-stone-200 shrink-0"
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        e.currentTarget.onerror = null;
                                                        e.currentTarget.src = '/images/placeholder.svg';
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 shrink-0">
                                                    <Package size={16} />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-stone-900 truncate">
                                                    {item.product_name}
                                                </p>
                                                <p className="text-[10px] text-stone-500 font-medium">
                                                    Qty: {item.quantity} {item.variant ? `· Variant: ${item.variant}` : ''}
                                                </p>
                                            </div>
                                        </div>

                                        <span className="text-xs font-bold text-stone-900 shrink-0">
                                            ₱{Number(item.price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-xs text-stone-500 font-medium">Order #{order?.order_number || dispute.order_id}</p>
                    )}
                </div>

                {/* 2. Visual Evidence Diff Slider */}
                {hasComparisonImages && (
                    <ImageDiffSlider
                        beforeImage={comparisonSellerPhotos[selectedBeforeIdx] || comparisonSellerPhotos[0] || null}
                        afterImage={proofPhotos[selectedAfterIdx] || proofPhotos[0] || null}
                        beforeLabel={beforeLabel}
                        afterLabel="Customer Defect Photo"
                        beforeOptions={comparisonSellerPhotos}
                        afterOptions={proofPhotos}
                        selectedBeforeIndex={selectedBeforeIdx}
                        selectedAfterIndex={selectedAfterIdx}
                        onSelectBefore={setSelectedBeforeIdx}
                        onSelectAfter={setSelectedAfterIdx}
                    />
                )}

                {/* 3. Detailed Side-by-Side Dossier: Customer vs Shop */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Customer Request Box */}
                    <div className="bg-white border border-stone-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5">
                        <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <UserAvatar user={order?.user} className="h-6 w-6 border border-stone-200 shrink-0" />
                                <div className="min-w-0">
                                    <h4 className="text-xs font-bold text-stone-900 truncate">
                                        {buyerName}
                                    </h4>
                                    <span className="text-[10px] font-medium text-stone-400 block truncate">
                                        Customer Request
                                    </span>
                                </div>
                            </div>

                            <span className="inline-flex rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 shrink-0">
                                Customer Claim
                            </span>
                        </div>

                        {/* Stated Reason */}
                        <div>
                            <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                                Customer&apos;s Issue
                            </span>
                            <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200/60">
                                <p className="text-xs font-bold text-stone-900 leading-relaxed">
                                    &ldquo;{dispute.reason}&rdquo;
                                </p>
                            </div>
                        </div>

                        {/* Customer Additional Notes / Escalation Reason */}
                        {dispute.escalation_reason && (
                            <div>
                                <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                                    Customer&apos;s Note
                                </span>
                                <div className="bg-[#FCFBF9] p-3 rounded-xl border border-stone-200/70">
                                    <p className="text-xs text-stone-800 leading-relaxed font-medium">
                                        &ldquo;{dispute.escalation_reason}&rdquo;
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Attached Proof Photos */}
                        <div>
                            <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                                Customer Photos ({proofPhotos.length})
                            </span>
                            {proofPhotos.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {proofPhotos.map((photo, pIdx) => {
                                        const photoUrl = photo.startsWith('http') || photo.startsWith('/storage') ? photo : `/storage/${photo}`;
                                        return (
                                            <button
                                                key={pIdx}
                                                type="button"
                                                onClick={() => openLightbox(proofPhotos, pIdx)}
                                                className="relative group border border-stone-200 bg-white rounded-xl overflow-hidden h-16 w-16 shadow-2xs hover:ring-2 hover:ring-clay-500 transition-all shrink-0 cursor-pointer"
                                            >
                                                <img
                                                    src={photoUrl}
                                                    className="h-full w-full object-cover"
                                                    alt={`Customer Evidence ${pIdx + 1}`}
                                                    onError={(e) => {
                                                        e.currentTarget.onerror = null;
                                                        e.currentTarget.src = '/images/placeholder.svg';
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-stone-900/20 group-hover:bg-stone-900/40 transition-colors flex items-center justify-center text-white opacity-0 group-hover:opacity-100">
                                                    <Eye size={14} />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-[11px] text-stone-400 font-medium italic">
                                    No photos uploaded by customer.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Shop Response Box */}
                    <div className="bg-white border border-stone-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5">
                        <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <UserAvatar user={order?.artisan} className="h-6 w-6 border border-stone-200 shrink-0" />
                                <div className="min-w-0">
                                    <h4 className="text-xs font-bold text-stone-900 truncate">
                                        {shopName}
                                    </h4>
                                    <span className="text-[10px] font-medium text-stone-400 block truncate">
                                        Shop Response
                                    </span>
                                </div>
                            </div>

                            <span className="inline-flex rounded-lg border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-bold text-stone-700 shrink-0">
                                {dispute.seller_response_type === 'replacement' ? 'Offered Replacement' : dispute.seller_response_type === 'reject' ? 'Declined Refund' : dispute.seller_response_type || 'No Response Yet'}
                            </span>
                        </div>

                        {/* Proposed Replacement */}
                        {dispute.seller_proposed_description && (
                            <div>
                                <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                                    Replacement Offer
                                </span>
                                <div className="bg-[#FCFBF9] p-3 rounded-xl border border-stone-200/70">
                                    <p className="text-xs text-stone-800 leading-relaxed font-medium">
                                        {dispute.seller_proposed_description}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Rejection / Shop Explanation */}
                        {dispute.seller_explanation && (
                            <div>
                                <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                                    Shop&apos;s Explanation
                                </span>
                                <div className="bg-[#FCFBF9] p-3 rounded-xl border border-stone-200/70">
                                    <p className="text-xs text-stone-800 leading-relaxed font-medium">
                                        &ldquo;{dispute.seller_explanation}&rdquo;
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Pre-Shipment Packing Photos */}
                        <div>
                            <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                                Shop Packing Photos ({sellerPhotos.length})
                            </span>
                            {sellerPhotos.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {sellerPhotos.map((photo, sIdx) => {
                                        const photoUrl = photo.startsWith('http') || photo.startsWith('/storage') ? photo : `/storage/${photo}`;
                                        return (
                                            <button
                                                key={sIdx}
                                                type="button"
                                                onClick={() => openLightbox(sellerPhotos, sIdx)}
                                                className="relative group border border-stone-200 bg-white rounded-xl overflow-hidden h-16 w-16 shadow-2xs hover:ring-2 hover:ring-indigo-500 transition-all shrink-0 cursor-pointer"
                                            >
                                                <img
                                                    src={photoUrl}
                                                    className="h-full w-full object-cover"
                                                    alt={`Packing Photo ${sIdx + 1}`}
                                                    onError={(e) => {
                                                        e.currentTarget.onerror = null;
                                                        e.currentTarget.src = '/images/placeholder.svg';
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-stone-900/20 group-hover:bg-stone-900/40 transition-colors flex items-center justify-center text-white opacity-0 group-hover:opacity-100">
                                                    <Eye size={14} />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-[11px] text-stone-400 font-medium italic">
                                    No pre-shipment packing photos uploaded by the shop.
                                </p>
                            )}
                        </div>

                        {!dispute.seller_proposed_description && !dispute.seller_explanation && sellerPhotos.length === 0 && (
                            <p className="text-xs text-stone-400 font-medium italic pt-2">
                                The shop did not submit an additional explanation.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Pinned Decision Footer or Resolution Notes */}
            {dispute.status === 'escalated' ? (
                <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-stone-100 bg-white shrink-0 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-stone-700">
                            Decision Notes <span className="text-rose-600">*</span>
                        </label>
                        <span className="text-[10px] text-stone-400 font-mono">
                            {notes.length}/1000
                        </span>
                    </div>

                    <textarea
                        rows={2}
                        maxLength={1000}
                        value={notes}
                        onChange={(e) => {
                            setNotes(e.target.value);
                            if (error) setError('');
                        }}
                        placeholder="Add a note explaining your decision for the customer and shop..."
                        className="w-full border-stone-200 rounded-xl focus:border-clay-500 focus:ring-1 focus:ring-clay-500 shadow-2xs text-xs font-medium resize-none placeholder-stone-400 py-1.5 px-3"
                    />

                    {error && (
                        <p className="text-xs font-bold text-rose-600 flex items-center gap-1">
                            <AlertTriangle size={12} /> {error}
                        </p>
                    )}

                    <div className="grid grid-cols-3 gap-2 pt-0.5">
                        <button
                            type="button"
                            onClick={() => openConfirmModal('reject')}
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 py-2 bg-white border border-stone-200 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-50 transition shadow-2xs min-h-[36px] cursor-pointer disabled:opacity-50"
                            title="Decline claim and pay shop"
                        >
                            <Store size={13} className="text-stone-600 shrink-0" />
                            <span className="truncate">Decline (Pay Shop)</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => openConfirmModal('partial_refund')}
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 py-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold hover:bg-amber-100 transition shadow-2xs min-h-[36px] cursor-pointer disabled:opacity-50"
                            title="50% Partial Refund"
                        >
                            <Scale size={13} className="text-amber-700 shrink-0" />
                            <span className="truncate">50% Refund</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => openConfirmModal('refund')}
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 py-2 bg-clay-700 text-white rounded-xl text-xs font-bold hover:bg-clay-800 transition shadow-2xs min-h-[36px] cursor-pointer disabled:opacity-50"
                            title="Approve full refund"
                        >
                            <CheckCircle2 size={13} className="shrink-0" />
                            <span className="truncate">Approve Refund</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="px-5 py-4 border-t border-stone-100 bg-[#FCFBF9] shrink-0 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                            Arbitration Ruling &amp; Decision Notes
                        </span>
                        {dispute.resolved_at && (
                            <span className="text-[10px] text-stone-400 font-medium">
                                Resolved on {new Date(dispute.resolved_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                        )}
                    </div>
                    <div className="p-3 bg-white border border-stone-200/80 rounded-xl text-xs text-stone-700 font-medium leading-relaxed shadow-2xs">
                        {dispute.admin_notes || 'No administrative notes were recorded for this resolution.'}
                    </div>
                </div>
            )}
        </div>
    );
}
