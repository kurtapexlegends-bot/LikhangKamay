import React, { useState, useEffect, Suspense, lazy } from 'react';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import { 
    ExternalLink, 
    CheckCircle2, 
    XCircle, 
    AlertTriangle, 
    Rotate3d, 
    Image as ImageIcon, 
    Store, 
    Tag
} from 'lucide-react';
import { formatMoney } from '@/utils/accountingFormatters';
import { resolveImageUrl } from '@/lib/media';
import { ThreeDModelBoundary, ThreeDModelUnavailable } from '@/Components/ThreeD/ThreeDModelBoundary';

const ProductViewer3D = lazy(() => import('@/Components/ThreeD/ProductViewer3D'));

export default function SponsorshipInspectionDrawer({
    isOpen,
    request,
    onClose,
    onApprove,
    onReject,
    isProcessing = false
}) {
    const [viewingMode, setViewingMode] = useState('image'); // 'image' | '3d'
    const [selectedImage, setSelectedImage] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [validationError, setValidationError] = useState('');

    useEffect(() => {
        setViewingMode('image');
        setSelectedImage(null);
        setShowRejectInput(false);
        setRejectionReason('');
        setValidationError('');
    }, [request?.id]);

    if (!request) return null;

    const product = request.product;
    const user = request.user;
    const isPending = request.status === 'pending';
    const isOutOfStock = !product || Number(product.stock || 0) <= 0;

    const coverUrl = product?.img || resolveImageUrl(product?.cover_photo_path) || '/images/placeholder.svg';
    const galleryUrls = product?.gallery_urls || [];
    const activeImageUrl = selectedImage || coverUrl;
    const has3D = !!(product?.has3D || product?.model_3d_path);
    const model3dUrl = product?.model_3d_url;

    const handleRejectClick = () => {
        if (!showRejectInput) {
            setShowRejectInput(true);
            return;
        }

        if (!rejectionReason.trim()) {
            setValidationError('Please provide a reason for declining the sponsorship.');
            return;
        }

        setValidationError('');
        onReject(request, rejectionReason.trim());
    };

    const handleApproveClick = () => {
        if (isOutOfStock) {
            setValidationError('Cannot approve sponsorship for an item with 0 stock.');
            return;
        }
        setValidationError('');
        onApprove(request);
    };

    const handleClose = () => {
        setShowRejectInput(false);
        setRejectionReason('');
        setValidationError('');
        onClose();
    };

    const renderFooter = () => (
        <div className="w-full space-y-3">
            {validationError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 flex items-center gap-2">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>{validationError}</span>
                </div>
            )}

            {isPending ? (
                <div className="space-y-3">
                    {showRejectInput && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500">
                                Reason for Declining (Required)
                            </label>
                            <textarea
                                rows={2}
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Explain why the sponsorship cannot be approved (e.g. poor image quality, misleading description, stock issues)..."
                                className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs text-stone-800 placeholder-stone-400 focus:border-rose-400 focus:ring-rose-400"
                                autoFocus
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={handleRejectClick}
                            disabled={isProcessing}
                            className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition border min-h-[44px] flex items-center justify-center gap-1.5 ${
                                showRejectInput
                                    ? 'bg-rose-600 text-white hover:bg-rose-700 border-rose-600 shadow-sm'
                                    : 'text-rose-600 bg-rose-50/80 hover:bg-rose-100/70 border-rose-200'
                            }`}
                        >
                            <XCircle size={15} />
                            <span>{showRejectInput ? (isProcessing ? 'Submitting Decline...' : 'Confirm Decline') : 'Decline Request'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleApproveClick}
                            disabled={isProcessing || isOutOfStock}
                            className="flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-sm min-h-[44px] flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={isOutOfStock ? 'Cannot sponsor out-of-stock items' : 'Approve 7-day sponsorship'}
                        >
                            <CheckCircle2 size={15} />
                            <span>{isProcessing ? 'Approving...' : 'Approve (7 Days)'}</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between text-xs text-stone-500">
                    <span className="font-medium">
                        Processed on {new Date(request.approved_at || request.updated_at).toLocaleDateString()}
                    </span>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 rounded-xl transition min-h-[40px]"
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <SlideOverDrawer
            isOpen={isOpen}
            onClose={handleClose}
            title="Inspect Sponsorship Request"
            subtitle={`Request #${request.id} • Submitted ${new Date(request.created_at).toLocaleDateString()}`}
            footer={renderFooter()}
        >
            <div className="space-y-5 pb-4">
                {/* Out of Stock Warning Banner */}
                {isOutOfStock && isPending && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-800 flex items-start gap-3">
                        <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                        <div>
                            <strong className="block text-rose-900 font-bold">Security Hold: Out of Stock (0 Inventory)</strong>
                            <p className="mt-0.5 text-rose-700 leading-relaxed font-medium">
                                This product cannot be featured while at 0 stock. Sponsoring unavailable items degrades buyer trust and exhausts artisan credits prematurely.
                            </p>
                        </div>
                    </div>
                )}

                {/* Media Section (Images / 3D Model Toggle) */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-stone-600">Product Media</label>
                        {has3D && (
                            <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
                                <button
                                    type="button"
                                    onClick={() => setViewingMode('image')}
                                    className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                                        viewingMode === 'image' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
                                    }`}
                                >
                                    <ImageIcon size={14} /> Photos
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewingMode('3d')}
                                    className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                                        viewingMode === '3d' ? 'bg-clay-600 text-white shadow-sm' : 'text-stone-500 hover:text-stone-800'
                                    }`}
                                >
                                    <Rotate3d size={14} /> 3D Canvas
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="w-full h-72 rounded-2xl border border-stone-200 bg-stone-50 overflow-hidden relative flex items-center justify-center">
                        {viewingMode === '3d' && has3D && model3dUrl ? (
                            <div className="w-full h-full">
                                <ThreeDModelBoundary
                                    resetKey={model3dUrl}
                                    fallback={({ onRetry }) => (
                                        <ThreeDModelUnavailable
                                            compact
                                            title="3D Canvas unavailable"
                                            description="Could not load the 3D preview."
                                            onRetry={onRetry}
                                            className="h-full"
                                        />
                                    )}
                                >
                                    <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-xs text-stone-400">Loading 3D Canvas...</div>}>
                                        <ProductViewer3D 
                                            modelUrl={model3dUrl} 
                                            adjustCamera={2.2}
                                        />
                                    </Suspense>
                                </ThreeDModelBoundary>
                            </div>
                        ) : (
                            <img
                                src={activeImageUrl}
                                alt={product?.name || 'Product'}
                                className="w-full h-full object-contain p-2"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/images/placeholder.svg';
                                }}
                            />
                        )}
                    </div>

                    {/* Gallery Thumbnail Strip */}
                    {galleryUrls.length > 0 && viewingMode === 'image' && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                            <button
                                type="button"
                                onClick={() => setSelectedImage(coverUrl)}
                                className={`w-14 h-14 rounded-xl border shrink-0 overflow-hidden transition-all ${
                                    selectedImage === coverUrl || !selectedImage ? 'ring-2 ring-clay-600 border-transparent' : 'border-stone-200 hover:border-stone-400'
                                }`}
                                title="Cover Photo"
                            >
                                <img
                                    src={coverUrl}
                                    alt="Cover"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = '/images/placeholder.svg';
                                    }}
                                />
                            </button>
                            {galleryUrls.map((gUrl, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setSelectedImage(gUrl)}
                                    className={`w-14 h-14 rounded-xl border shrink-0 overflow-hidden transition-all ${
                                        selectedImage === gUrl ? 'ring-2 ring-clay-600 border-transparent' : 'border-stone-200 hover:border-stone-400'
                                    }`}
                                    title={`Gallery Image ${idx + 1}`}
                                >
                                    <img
                                        src={gUrl}
                                        alt={`Gallery ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = '/images/placeholder.svg';
                                        }}
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Product Essential Information */}
                <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-clay-700 bg-clay-50 border border-clay-200 px-2.5 py-1 rounded-lg">
                                <Tag size={12} className="text-clay-500" />
                                {product?.category || 'General Craft'}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                                isOutOfStock 
                                    ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                                {isOutOfStock ? '0 Stock' : `${product?.stock} in Stock`}
                            </span>
                        </div>

                        <span className="text-base font-extrabold text-clay-700">
                            {formatMoney(product?.price || 0)}
                        </span>
                    </div>

                    <h3 className="text-lg font-black text-stone-900 leading-snug tracking-tight">
                        {product?.name || 'Unknown Product'}
                    </h3>

                    {product?.description && (
                        <div className="pt-2 border-t border-stone-100">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 block mb-1">
                                Product Description
                            </span>
                            <p className="text-xs text-stone-700 leading-relaxed font-medium">
                                {product.description}
                            </p>
                        </div>
                    )}

                    {product?.slug && (
                        <div className="pt-2 border-t border-stone-100">
                            <a
                                href={route('product.show', product.slug)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-clay-700 transition"
                            >
                                <ExternalLink size={13} />
                                <span>View Live Marketplace Listing</span>
                            </a>
                        </div>
                    )}
                </div>

                {/* Artisan Workshop Profile */}
                <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm space-y-3">
                    <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
                        <Store size={15} className="text-stone-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                            Artisan Workshop Profile
                        </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 block">Shop Name</span>
                            <span className="font-bold text-stone-900">{user?.shop_name || 'Individual Artisan'}</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 block">Artisan Owner</span>
                            <span className="font-semibold text-stone-800">{user?.name || 'N/A'}</span>
                        </div>
                        <div className="sm:col-span-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 block">Email Address</span>
                            <span className="font-medium text-stone-600">{user?.email || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Existing Decline Reason if already rejected */}
                {request.status === 'rejected' && request.rejection_reason && (
                    <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-xs space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">
                            Previous Decline Reason
                        </span>
                        <p className="font-semibold text-red-900 leading-relaxed">
                            {request.rejection_reason}
                        </p>
                    </div>
                )}
            </div>
        </SlideOverDrawer>
    );
}
