import React, { useState, useMemo, Suspense, lazy } from 'react';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import { 
    CheckCircle2, 
    XCircle, 
    ShieldAlert, 
    Clock, 
    Box, 
    Tag, 
    Flame, 
    FileText, 
    Rotate3d, 
    Image as ImageIcon,
    ChevronLeft,
    ChevronRight,
    Maximize2
} from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import { resolveImageUrl } from '@/lib/media';
import ProductImageLightboxModal from '@/Components/Consumer/Shop/ProductShow/ProductImageLightboxModal';
import { ThreeDModelBoundary, ThreeDModelUnavailable } from '@/Components/ThreeD/ThreeDModelBoundary';
import useNetworkStatus from '@/hooks/useNetworkStatus';

const ProductViewer3D = lazy(() => import('@/Components/ThreeD/ProductViewer3D'));

export default function ProductInspectionDrawer({
    isOpen,
    product,
    onClose,
    onApprove,
    onReject,
    onFlag,
    isProcessing = false
}) {
    const { isDegraded } = useNetworkStatus();
    const [hasConfirmed3D, setHasConfirmed3D] = useState(false);
    const isLowBandwidth = isDegraded || (typeof navigator !== 'undefined' && Boolean(navigator.connection?.saveData));
    const showLowBandwidthPrompt = isLowBandwidth && !hasConfirmed3D;

    const [prevProductId, setPrevProductId] = useState(product?.id);
    const [viewingMode, setViewingMode] = useState('image'); // 'image' | '3d'
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [lightboxMode, setLightboxMode] = useState('image');
    const [feedback, setFeedback] = useState('');
    const [actionError, setActionError] = useState('');

    if (product?.id !== prevProductId) {
        setPrevProductId(product?.id);
        setActiveImageIndex(0);
        setViewingMode('image');
        setFeedback('');
        setActionError('');
        setIsLightboxOpen(false);
        setHasConfirmed3D(false);
    }

    const coverUrl = product?.img || (product?.cover_photo_path ? resolveImageUrl(product.cover_photo_path) : '/images/placeholder.svg');
    const rawGalleryUrls = (product?.gallery_urls && product.gallery_urls.length > 0)
        ? product.gallery_urls
        : (product?.gallery_paths || []).map(path => resolveImageUrl(path));

    const allImages = useMemo(() => {
        const list = [coverUrl, ...rawGalleryUrls].filter(Boolean);
        return Array.from(new Set(list));
    }, [coverUrl, rawGalleryUrls]);

    const activeImageUrl = allImages[activeImageIndex] || coverUrl;
    const has3D = Boolean(product?.model_3d_path || product?.model_3d_url);
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

    if (!product) return null;

    const handleApprove = () => {
        setActionError('');
        onApprove(product.id);
    };

    const handleReject = () => {
        if (!feedback.trim()) {
            setActionError('Please provide revision notes so the seller can update their listing.');
            return;
        }
        setActionError('');
        onReject(product.id, feedback.trim());
    };

    const handleFlag = () => {
        if (!feedback.trim()) {
            setActionError('Please provide a compliance reason for flagging this listing.');
            return;
        }
        setActionError('');
        onFlag(product.id, feedback.trim());
    };

    const renderFooter = () => (
        <div className="flex items-center justify-between gap-3 w-full">
            <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-50 active:scale-98 transition-all"
            >
                Close
            </button>

            <div className="flex items-center gap-2">
                {/* Status-aware contextual moderation controls */}
                {product.status === 'Active' && (
                    <button
                        type="button"
                        disabled={isProcessing}
                        onClick={handleFlag}
                        className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-600/10 hover:shadow-lg hover:shadow-amber-600/15 active:scale-95 disabled:opacity-50 transition-all"
                    >
                        <ShieldAlert size={15} /> Flag Listing
                    </button>
                )}

                {product.status === 'pending_review' && (
                    <>
                        <button
                            type="button"
                            disabled={isProcessing}
                            onClick={handleReject}
                            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-650/10 hover:shadow-lg hover:shadow-rose-650/15 active:scale-95 disabled:opacity-50 transition-all"
                        >
                            <XCircle size={15} /> Request Revision
                        </button>
                        <button
                            type="button"
                            disabled={isProcessing}
                            onClick={handleApprove}
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-650/10 hover:shadow-lg hover:shadow-emerald-650/15 active:scale-95 disabled:opacity-50 transition-all"
                        >
                            <CheckCircle2 size={15} /> Approve Listing
                        </button>
                    </>
                )}

                {product.status === 'flagged' && (
                    <>
                        <button
                            type="button"
                            disabled={isProcessing}
                            onClick={handleReject}
                            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-650/10 hover:shadow-lg hover:shadow-rose-650/15 active:scale-95 disabled:opacity-50 transition-all"
                        >
                            <XCircle size={15} /> Request Revision
                        </button>
                        <button
                            type="button"
                            disabled={isProcessing}
                            onClick={handleApprove}
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-650/10 hover:shadow-lg hover:shadow-emerald-650/15 active:scale-95 disabled:opacity-50 transition-all"
                        >
                            <CheckCircle2 size={15} /> Approve Listing
                        </button>
                    </>
                )}

                {product.status === 'rejected' && (
                    <>
                        <button
                            type="button"
                            disabled={isProcessing}
                            onClick={handleFlag}
                            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-600/10 hover:shadow-lg hover:shadow-amber-600/15 active:scale-95 disabled:opacity-50 transition-all"
                        >
                            <ShieldAlert size={15} /> Flag Listing
                        </button>
                        <button
                            type="button"
                            disabled={isProcessing}
                            onClick={handleApprove}
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-650/10 hover:shadow-lg hover:shadow-emerald-650/15 active:scale-95 disabled:opacity-50 transition-all"
                        >
                            <CheckCircle2 size={15} /> Approve Listing
                        </button>
                    </>
                )}
            </div>
        </div>
    );

    return (
        <SlideOverDrawer
            show={isOpen}
            onClose={onClose}
            title="Inspect Product Listing"
            widthClass="max-w-2xl"
            position="bottom"
            footer={renderFooter()}
        >
            <div className="space-y-6 pb-6">
                {/* Header Status & Artisan Summary */}
                <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-200/80">
                    <div className="flex items-center gap-3">
                        <UserAvatar user={product.user} className="w-10 h-10" />
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-stone-900">{product.user?.shop_name || 'Individual Seller'}</p>
                                {product.user && (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                        product.user.premium_tier === 'super_premium'
                                            ? 'bg-violet-50 text-violet-700 border-violet-200/40'
                                            : product.user.premium_tier === 'premium'
                                                ? 'bg-amber-50 text-amber-800 border-amber-250/30'
                                                : 'bg-stone-100 text-stone-600 border-stone-200'
                                    }`}>
                                        {product.user.premium_tier === 'super_premium' ? 'Elite' : product.user.premium_tier === 'premium' ? 'Premium' : 'Standard'}
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-stone-500 font-medium">{product.user?.name} {product.user?.email ? `• ${product.user.email}` : ''}</p>
                        </div>
                    </div>

                    <div>
                        {product.status === 'Active' ? (
                            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200/60">
                                <CheckCircle2 size={14} /> Approved / Active
                            </span>
                        ) : product.status === 'pending_review' ? (
                            <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-200/60">
                                <Clock size={14} /> Pending Review
                            </span>
                        ) : product.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200/60">
                                <XCircle size={14} /> Needs Revision
                            </span>
                        ) : product.status === 'flagged' ? (
                            <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-xs font-bold border border-rose-200/60">
                                <ShieldAlert size={14} /> Flagged
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 bg-stone-100 text-stone-700 px-3 py-1 rounded-full text-xs font-bold border border-stone-200">
                                {product.status}
                            </span>
                        )}
                    </div>
                </div>

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
                                    alt={product.name}
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

                {/* Product Name & Basic Info Banner */}
                <div className="space-y-1">
                    <h2 className="text-lg font-black text-stone-900 tracking-tight leading-snug">{product.name}</h2>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-150 text-stone-700 text-[10px] font-bold uppercase tracking-wider">
                            <Tag size={12} className="text-stone-400" /> {product.category || 'General'}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-750 text-[10px] font-bold border border-emerald-100 uppercase tracking-wider">
                            ₱{Number(product.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-50 text-stone-600 text-[10px] font-bold border border-stone-200/60 uppercase tracking-wider">
                            <Box size={12} className="text-stone-400" /> Stock: {product.stock ?? 0}
                        </span>
                    </div>
                </div>

                {/* Description Block */}
                {product.description && (
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Description</label>
                        <div className="p-4 bg-stone-50/50 rounded-2xl border border-stone-200/80 text-xs text-stone-700 leading-relaxed whitespace-pre-line">
                            {product.description}
                        </div>
                    </div>
                )}

                {/* Craftsmanship & Spec Sections */}
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 block mb-2 flex items-center gap-1.5">
                            <Flame size={13} className="text-clay-600" /> Craftsmanship Details
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            <div className="p-3.5 bg-stone-50/40 rounded-xl border border-stone-200/60">
                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Clay Type</p>
                                <p className="text-xs font-bold text-stone-800 mt-1">{product.clay_type || 'N/A'}</p>
                            </div>
                            <div className="p-3.5 bg-stone-50/40 rounded-xl border border-stone-200/60">
                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Glaze Finish</p>
                                <p className="text-xs font-bold text-stone-800 mt-1">{product.glaze_type || 'N/A'}</p>
                            </div>
                            <div className="p-3.5 bg-stone-50/40 rounded-xl border border-stone-200/60">
                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Firing Method</p>
                                <p className="text-xs font-bold text-stone-800 mt-1">{product.firing_method || 'N/A'}</p>
                            </div>
                            <div className="p-3.5 bg-stone-50/40 rounded-xl border border-stone-200/60">
                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Food Safe</p>
                                <p className={`text-xs font-bold mt-1 ${product.food_safe ? 'text-emerald-700' : 'text-stone-500'}`}>
                                    {product.food_safe ? 'Yes (Food Safe)' : 'No'}
                                </p>
                            </div>
                            <div className="p-3.5 bg-stone-50/40 rounded-xl border border-stone-200/60">
                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Lead Time</p>
                                <p className="text-xs font-bold text-stone-800 mt-1">{product.lead_time ? `${product.lead_time} days` : 'Ready stock'}</p>
                            </div>
                            <div className="p-3.5 bg-stone-50/40 rounded-xl border border-stone-200/60">
                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Dimensions / Weight</p>
                                <p className="text-xs font-bold text-stone-800 mt-1">
                                    {product.height || product.width ? `${product.height || 0}×${product.width || 0} cm` : 'N/A'} {product.weight ? `(${Number(product.weight) >= 1000 ? `${(Number(product.weight) / 1000).toFixed(1)} kg` : `${product.weight} g`})` : ''}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Seller Resubmission Notes / Rejection Reason (if any) */}
                {product.latest_resubmission?.notes && (
                    <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-250/20">
                        <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                            <FileText size={14} className="text-amber-700" /> Seller Resubmission Note:
                        </p>
                        <p className="text-xs text-amber-850 mt-1.5 italic font-medium">"{product.latest_resubmission.notes}"</p>
                    </div>
                )}

                {product.rejection_reason && (
                    <div className="p-4 bg-red-55/10 rounded-2xl border border-red-250/15">
                        <p className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                            <XCircle size={14} className="text-red-700" /> Current Revision Feedback:
                        </p>
                        <p className="text-xs text-red-800 mt-1.5 font-medium">"{product.rejection_reason}"</p>
                    </div>
                )}

                {/* Feedback Input Block for Rejection / Flagging */}
                <div className="pt-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2">
                        Moderation Feedback / Compliance Reason
                    </label>
                    <textarea
                        value={feedback}
                        onChange={(e) => {
                            setFeedback(e.target.value);
                            setActionError('');
                        }}
                        rows={3}
                        className="w-full rounded-2xl border border-stone-200 focus:border-clay-500 focus:ring focus:ring-clay-500/10 text-xs p-3.5 transition-all"
                        placeholder="Provide details or feedback if requesting revisions or flagging this product..."
                    />
                    {actionError && (
                        <p className="text-xs font-bold text-rose-600 mt-2">{actionError}</p>
                    )}
                </div>
            </div>

            {/* Lightbox Carousel Modal: Expansive zoom, pan, rotate, scale measurement, 3D orbit */}
            {isLightboxOpen && (
                <ProductImageLightboxModal
                    isOpen={isLightboxOpen}
                    onClose={() => setIsLightboxOpen(false)}
                    productName={product?.name || 'Craft Listing'}
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
