import React from 'react';
import UserAvatar from '@/Components/UserAvatar';
import {
    AlertTriangle,
    Package,
    User,
    Store,
    Eye,
    X,
    CheckCircle2,
    ArrowLeft
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
    onBack
}) {
    const order = dispute.order;
    const buyerName = order?.user?.name || order?.customer_name || 'Buyer';
    const buyerEmail = order?.user?.email || '';
    const shopName = order?.artisan?.shop_name || order?.artisan?.name || 'Artisan Shop';
    const ownerName = order?.artisan?.name || '';
    const totalAmount = order?.total_amount ? Number(order.total_amount) : 0;
    const items = order?.items || [];
    const proofPhotos = Array.isArray(dispute.proof_photos) ? dispute.proof_photos : [];

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

                <div className="shrink-0">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 border border-amber-200/80">
                        <AlertTriangle size={11} className="text-amber-600" /> Needs Platform Review
                    </span>
                </div>
            </div>

            {/* Scrollable Case Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-[#FAF9F6] custom-scrollbar">
                {/* 1. Disputed Order Summary */}
                <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                        <div className="flex items-center gap-2">
                            <Package size={15} className="text-clay-700" />
                            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                                Disputed Order Information
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

                {/* 2. Side-by-Side Comparison: Buyer vs Seller */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Buyer Request Box */}
                    <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5">
                        <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
                            <User size={14} className="text-clay-700" />
                            <h4 className="text-[11px] font-black text-stone-800 uppercase tracking-wider">
                                Buyer Request & Photos
                            </h4>
                        </div>

                        {/* Buyer Profile */}
                        <div className="flex items-center gap-2.5">
                            <UserAvatar user={order?.user} className="h-8 w-8 border border-stone-200" />
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-stone-900 truncate">{buyerName}</p>
                                {buyerEmail && <p className="text-[10px] text-stone-400 truncate">{buyerEmail}</p>}
                            </div>
                        </div>

                        {/* Reason */}
                        <div>
                            <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                                Reason for Request
                            </span>
                            <div className="bg-[#FCFBF9] p-3 rounded-xl border border-stone-200/70">
                                <p className="text-xs text-stone-800 leading-relaxed font-medium">
                                    &ldquo;{dispute.reason}&rdquo;
                                </p>
                            </div>
                        </div>

                        {/* Additional Details */}
                        {dispute.escalation_reason && (
                            <div>
                                <span className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                                    Additional Details from Buyer
                                </span>
                                <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200/70">
                                    <p className="text-xs text-amber-950 italic leading-relaxed font-medium">
                                        &ldquo;{dispute.escalation_reason}&rdquo;
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Proof Photos Gallery */}
                        <div>
                            <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                                Attached Photos ({proofPhotos.length})
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
                                                <img src={photoUrl} className="h-full w-full object-cover" alt={`Proof ${pIdx + 1}`} />
                                                <div className="absolute inset-0 bg-stone-900/20 group-hover:bg-stone-900/40 transition-colors flex items-center justify-center text-white opacity-0 group-hover:opacity-100">
                                                    <Eye size={14} />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-[11px] text-stone-400 font-medium italic">No photos attached.</p>
                            )}
                        </div>
                    </div>

                    {/* Artisan Response Box */}
                    <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5">
                        <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
                            <Store size={14} className="text-indigo-700" />
                            <h4 className="text-[11px] font-black text-stone-800 uppercase tracking-wider">
                                Artisan&apos;s Response
                            </h4>
                        </div>

                        {/* Seller Profile */}
                        <div className="flex items-center gap-2.5">
                            <UserAvatar user={order?.artisan} className="h-8 w-8 border border-stone-200" />
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-stone-900 truncate">{shopName}</p>
                                {ownerName && <p className="text-[10px] text-stone-400 truncate">Artisan: {ownerName}</p>}
                            </div>
                        </div>

                        {/* Response Type */}
                        <div>
                            <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                                Artisan Action
                            </span>
                            <span className="inline-flex rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-[10px] font-bold uppercase text-stone-700">
                                {dispute.seller_response_type === 'replacement' ? 'Proposed Replacement' : dispute.seller_response_type === 'reject' ? 'Rejected Request' : dispute.seller_response_type || 'No Response'}
                            </span>
                        </div>

                        {/* Proposed Replacement */}
                        {dispute.seller_proposed_description && (
                            <div>
                                <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                                    Proposed Replacement Details
                                </span>
                                <div className="bg-[#FCFBF9] p-3 rounded-xl border border-stone-200/70">
                                    <p className="text-xs text-stone-800 leading-relaxed font-medium">
                                        {dispute.seller_proposed_description}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Rejection Explanation */}
                        {dispute.seller_explanation && (
                            <div>
                                <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                                    Artisan Explanation
                                </span>
                                <div className="bg-[#FCFBF9] p-3 rounded-xl border border-stone-200/70">
                                    <p className="text-xs text-stone-800 leading-relaxed font-medium">
                                        {dispute.seller_explanation}
                                    </p>
                                </div>
                            </div>
                        )}

                        {!dispute.seller_proposed_description && !dispute.seller_explanation && (
                            <p className="text-xs text-stone-400 font-medium italic pt-2">
                                The artisan did not submit additional explanation details.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Pinned Decision Footer */}
            <div className="px-5 py-4 border-t border-stone-100 bg-white shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                        Resolution Reason <span className="text-rose-600">*</span>
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
                    placeholder="Document your findings and reasons for this resolution..."
                    className="w-full border-stone-200 rounded-xl focus:border-clay-500 focus:ring-1 focus:ring-clay-500 shadow-2xs text-xs font-medium resize-none"
                />

                {error && (
                    <p className="text-xs font-bold text-rose-600 flex items-center gap-1">
                        <AlertTriangle size={12} /> {error}
                    </p>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-1">
                    <button
                        type="button"
                        onClick={() => openConfirmModal('reject')}
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white border border-stone-200 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-50 transition shadow-2xs min-h-[38px] cursor-pointer disabled:opacity-50 shrink-0"
                    >
                        <X size={13} className="text-rose-600" />
                        <span>Decline Claim (Release to Seller)</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => openConfirmModal('refund')}
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-clay-700 text-white rounded-xl text-xs font-bold hover:bg-clay-800 transition shadow-2xs min-h-[38px] cursor-pointer disabled:opacity-50 shrink-0"
                    >
                        <CheckCircle2 size={13} />
                        <span>Approve Full Refund</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
