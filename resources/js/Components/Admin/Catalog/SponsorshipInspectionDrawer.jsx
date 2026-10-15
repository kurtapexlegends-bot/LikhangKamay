/* global route */
import React, { useState, useMemo, Suspense, lazy } from 'react';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import { 
    ExternalLink, 
    CheckCircle2, 
    AlertTriangle, 
    Rotate3d, 
    Box,
    Image as ImageIcon, 
    Store, 
    Tag, 
    RotateCcw,
    ChevronLeft,
    ChevronRight,
    Maximize2
} from 'lucide-react';
import { formatMoney } from '@/utils/accountingFormatters';
import { resolveImageUrl } from '@/lib/media';
import ProductImageLightboxModal from '@/Components/Consumer/Shop/ProductShow/ProductImageLightboxModal';
import { ThreeDModelBoundary, ThreeDModelUnavailable } from '@/Components/ThreeD/ThreeDModelBoundary';
import useNetworkStatus from '@/hooks/useNetworkStatus';

const ProductViewer3D = lazy(() => import('@/Components/ThreeD/ProductViewer3D'));

export default function SponsorshipInspectionDrawer({
    isOpen,
    request,
    onClose,
    onApprove,
    onReject,
    isProcessing = false
}) {
    const { isDegraded } = useNetworkStatus();
    const [hasConfirmed3D, setHasConfirmed3D] = useState(false);
    const isLowBandwidth = isDegraded || (typeof navigator !== 'undefined' && Boolean(navigator.connection?.saveData));
    const showLowBandwidthPrompt = isLowBandwidth && !hasConfirmed3D;

    const [prevRequestId, setPrevRequestId] = useState(request?.id);
    const [viewingMode, setViewingMode] = useState('image'); // 'image' | '3d'
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [lightboxMode, setLightboxMode] = useState('image');
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [validationError, setValidationError] = useState('');

    if (request?.id !== prevRequestId) {
        setPrevRequestId(request?.id);
        setViewingMode('image');
        setActiveImageIndex(0);
        setIsLightboxOpen(false);
        setShowRejectInput(false);
        setRejectionReason('');
        setValidationError('');
        setHasConfirmed3D(false);
    }

    const product = request?.product;
    const user = request?.user;
    const isPending = request?.status === 'pending';
    const isOutOfStock = !product || Number(product.stock || 0) <= 0;

    const coverUrl = product?.img || (product?.cover_photo_path ? resolveImageUrl(product.cover_photo_path) : '/images/placeholder.svg');
    const rawGalleryUrls = (product?.gallery_urls && product.gallery_urls.length > 0)
        ? product.gallery_urls
        : (product?.gallery_paths || []).map(path => resolveImageUrl(path));

    const allImages = useMemo(() => {
        const list = [coverUrl, ...rawGalleryUrls].filter(Boolean);
        return Array.from(new Set(list));
    }, [coverUrl, rawGalleryUrls]);

    const activeImageUrl = allImages[activeImageIndex] || coverUrl;
    const has3D = !!(product?.has3D || product?.model_3d_path);
    const model3dUrl = product?.model_3d_url || (product?.model_3d_path ? resolveImageUrl(product.model_3d_path) : null);

    const handlePrevImage = (e) => {
        e?.stopPropagation();
        setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
    };

    const handleNextImage = (e) => {
        e?.stopPropagation();
        setActiveImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
    };

    const openLightbox = (index = 0, mode = 'image') => {
        setActiveImageIndex(index);
        setLightboxMode(mode);
        setIsLightboxOpen(true);
    };

    if (!request) return null;

    const handleRejectClick = () => {
        if (!showRejectInput) {
            setShowRejectInput(true);
            return;
        }

        if (!rejectionReason.trim()) {
            setValidationError('Please share constructive feedback for the artisan before returning this request.');
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
                                Feedback for Artisan (Required)
                            </label>
                            <textarea
                                rows={2}
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Share constructive notes (e.g. lighting needs improvement, missing craft dimensions, low inventory)..."
                                className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:ring-amber-500"
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
                                    ? 'bg-amber-600 text-white hover:bg-amber-700 border-amber-600 shadow-sm'
                                    : 'text-amber-800 bg-amber-50 hover:bg-amber-100/80 border-amber-250/70'
                            }`}
                        >
                            <RotateCcw size={15} />
                            <span>{showRejectInput ? (isProcessing ? 'Sending Feedback...' : 'Send Feedback & Return') : 'Return with Feedback'}</span>
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
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-stone-600">Product Media</label>
                            {allImages.length > 0 && (
                                <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
                                    {allImages.length} {allImages.length === 1 ? 'photo' : 'photos'}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {allImages.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => openLightbox(activeImageIndex, viewingMode)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-xl text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 shadow-2xs transition min-h-[36px] cursor-pointer"
                                    title="Open expansive fullscreen carousel"
                                >
                                    <Maximize2 size={13} className="text-clay-600" />
                                    <span>View Carousel</span>
                                </button>
                            )}

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
                    </div>

                    <div className="w-full h-80 sm:h-96 rounded-2xl border border-stone-200 bg-stone-50 overflow-hidden relative flex items-center justify-center group">
                        {viewingMode === '3d' && has3D && model3dUrl ? (
                            showLowBandwidthPrompt ? (
                                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-stone-50">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3 shadow-2xs">
                                        <Box size={24} />
                                    </div>
                                    <h4 className="text-xs font-bold text-stone-900 mb-1">Slow Cellular Connection</h4>
                                    <p className="text-[11px] text-stone-500 max-w-xs mb-4 leading-relaxed">
                                        Interactive 3D craft inspection requires additional mobile data (~1.5–3.5 MB).
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setHasConfirmed3D(true)}
                                        className="px-4 py-2.5 rounded-xl bg-clay-600 hover:bg-clay-700 active:scale-95 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer min-h-[44px]"
                                    >
                                        <Box size={14} />
                                        <span>Load 3D View</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="w-full h-full relative">
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
                                                productName={product?.name || 'Craft Piece'}
                                                dimensions={{
                                                    height: product?.height,
                                                    width: product?.width,
                                                    depth: product?.depth
                                                }}
                                                compact
                                                hideBadge
                                                topLeftAction={
                                                    <button
                                                        type="button"
                                                        onClick={() => openLightbox(0, '3d')}
                                                        className="px-2.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition shadow-xs cursor-pointer bg-white/90 backdrop-blur text-stone-700 border-gray-200 hover:bg-white active:scale-95 min-h-[38px] shrink-0"
                                                        title="Open interactive 3D inspector with real-life scale ruler"
                                                    >
                                                        <Maximize2 size={13} className="text-clay-600" />
                                                        <span>Enlarge 3D & Scale</span>
                                                    </button>
                                                }
                                                className="w-full h-full"
                                            />
                                        </Suspense>
                                    </ThreeDModelBoundary>
                                </div>
                            )
                        ) : (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <img
                                    loading="lazy"
                                    decoding="async"
                                    src={activeImageUrl}
                                    alt={product?.name || 'Product'}
                                    onClick={() => openLightbox(activeImageIndex, 'image')}
                                    className="w-full h-full object-contain p-2 cursor-pointer hover:opacity-95 transition"
                                    title="Click to open expansive carousel"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = '/images/placeholder.svg';
                                    }}
                                />

                                {allImages.length > 1 && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={handlePrevImage}
                                            aria-label="Previous photo"
                                            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-stone-900/60 hover:bg-stone-900/80 text-white flex items-center justify-center backdrop-blur-xs transition shadow-md active:scale-95 z-10 cursor-pointer"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleNextImage}
                                            aria-label="Next photo"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-stone-900/60 hover:bg-stone-900/80 text-white flex items-center justify-center backdrop-blur-xs transition shadow-md active:scale-95 z-10 cursor-pointer"
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-stone-900/70 backdrop-blur-xs text-white text-[11px] font-bold shadow-xs flex items-center gap-1.5 z-10 pointer-events-none">
                                            <ImageIcon size={12} className="text-stone-300" />
                                            <span>{activeImageIndex + 1} / {allImages.length}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Gallery Thumbnail Strip */}
                    {allImages.length > 1 && viewingMode === 'image' && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {allImages.map((imgUrl, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setActiveImageIndex(idx)}
                                    className={`w-14 h-14 rounded-xl border shrink-0 overflow-hidden transition-all cursor-pointer ${
                                        activeImageIndex === idx
                                            ? 'ring-2 ring-clay-600 border-transparent shadow-xs'
                                            : 'border-stone-200 hover:border-stone-400 opacity-70 hover:opacity-100'
                                    }`}
                                >
                                    <img
                                        loading="lazy"
                                        decoding="async"
                                        src={imgUrl}
                                        alt={`Thumbnail ${idx + 1}`}
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

                {/* Existing feedback if previously returned for revision */}
                {request.status === 'rejected' && request.rejection_reason && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                            Previous Feedback Provided to Artisan
                        </span>
                        <p className="font-semibold text-stone-900 leading-relaxed">
                            {request.rejection_reason}
                        </p>
                    </div>
                )}
            </div>

            {/* Lightbox Carousel Modal: Expansive zoom, pan, rotate, real-life scale ruler and 3D preview */}
            {isLightboxOpen && (
                <ProductImageLightboxModal
                    isOpen={isLightboxOpen}
                    onClose={() => setIsLightboxOpen(false)}
                    productName={product?.name || 'Craft Piece'}
                    gallery={allImages}
                    activeIndex={activeImageIndex}
                    onChangeIndex={setActiveImageIndex}
                    has3D={has3D}
                    modelUrl={model3dUrl}
                    dimensions={{
                        height: product?.height,
                        width: product?.width,
                        depth: product?.depth
                    }}
                    initialMode={lightboxMode}
                />
            )}
        </SlideOverDrawer>
    );
}
