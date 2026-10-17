import React, { lazy, Suspense, useRef, useEffect, useState, useCallback } from 'react';
import { Image as ImageIcon, Box, Flag, Heart, Loader2, Maximize2 } from 'lucide-react';
import ProductImageMagnifier from './ProductImageMagnifier';
import ProductImageLightboxModal from './ProductImageLightboxModal';
import { ThreeDModelBoundary, ThreeDModelUnavailable } from '@/Components/ThreeD/ThreeDModelBoundary';
import useNetworkStatus from '@/hooks/useNetworkStatus';

const ProductViewer3D = lazy(() => import('@/Components/ThreeD/ProductViewer3D'));

export default function ProductImageGallery({
    product,
    gallery,
    viewMode,
    setViewMode,
    activeImageIndex,
    setActiveImageIndex,
    isWishlisted,
    wishlistLabel,
    handleWishlistToggle,
    auth,
    setIsReporting,
    onOpenHeightComparison,
}) {
    const { isDegraded } = useNetworkStatus();
    const [hasConfirmed3D, setHasConfirmed3D] = useState(false);
    const isLowBandwidth = isDegraded || (typeof navigator !== 'undefined' && Boolean(navigator.connection?.saveData));
    const showLowBandwidthPrompt = isLowBandwidth && !hasConfirmed3D;

    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [lightboxInitialMode, setLightboxInitialMode] = useState('image');
    const [isScaleBenchmarkActive, setIsScaleBenchmarkActive] = useState(false);
    const scrollRef = useRef(null);
    const hasPreloaded3DRef = useRef(false);

    const handlePreload3D = useCallback(() => {
        if (hasPreloaded3DRef.current || isLowBandwidth) return;
        const modelUrl = product.model_3d_url || product.model_url;
        if (!modelUrl) return;

        hasPreloaded3DRef.current = true;
        import('@/Components/ThreeD/ProductViewer3D').then((module) => {
            module?.preloadProduct3D?.(modelUrl);
        }).catch(() => {
            // Silently ignore prefetch/offline errors
        });
    }, [product.model_3d_url, product.model_url, isLowBandwidth]);

    const handleScroll = (e) => {
        const width = e.target.offsetWidth;
        if (width <= 0) return;
        const index = Math.round(e.target.scrollLeft / width);
        if (index !== activeImageIndex && index < gallery.length) {
            setActiveImageIndex(index);
        }
    };

    useEffect(() => {
        if (scrollRef.current && viewMode === 'image') {
            const width = scrollRef.current.offsetWidth;
            if (width > 0) {
                const targetScrollLeft = activeImageIndex * width;
                if (Math.abs(scrollRef.current.scrollLeft - targetScrollLeft) > 5) {
                    scrollRef.current.scrollTo({
                        left: targetScrollLeft,
                        behavior: 'smooth'
                    });
                }
            }
        }
    }, [activeImageIndex, viewMode]);

    return (
        <div className="p-3.5 sm:p-4 lg:col-span-5 lg:border-r lg:border-gray-100">
            {/* Main Image & 3D Container */}
            <div className="relative aspect-square bg-gray-50 rounded-xl overflow-hidden mb-3">
                {/* Expand / View Fullscreen Button (Active for 2D Photo Mode) */}
                {viewMode === 'image' && (
                    <button
                        type="button"
                        onClick={() => {
                            setLightboxInitialMode('image');
                            setIsLightboxOpen(true);
                        }}
                        aria-label="Expand image in fullscreen lightbox"
                        title="Expand image fullscreen"
                        className="absolute top-3 left-3 z-20 flex items-center justify-center w-[38px] h-[38px] rounded-xl bg-stone-900/80 hover:bg-stone-900 text-white backdrop-blur-md border border-white/10 shadow-md transition-all active:scale-95 cursor-pointer group"
                    >
                        <Maximize2 size={16} className="text-stone-300 group-hover:text-white transition-colors" />
                    </button>
                )}

                {viewMode === 'image' ? (
                    <>
                        {/* Desktop/Tablet View */}
                        <div className="hidden md:block h-full">
                            <ProductImageMagnifier 
                                id="main-product-image"
                                src={gallery[activeImageIndex] || '/images/placeholder.svg'} 
                                alt={product.name} 
                                onOpenLightbox={() => setIsLightboxOpen(true)}
                            />
                        </div>

                        {/* Mobile Swipe Carousel View */}
                        <div className="block md:hidden relative h-full">
                            <div 
                                ref={scrollRef}
                                className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none h-full w-full"
                                onScroll={handleScroll}
                            >
                                {gallery.map((img, index) => (
                                    <div 
                                        key={index} 
                                        className="w-full h-full shrink-0 snap-center cursor-pointer"
                                        onClick={() => {
                                            setActiveImageIndex(index);
                                            setIsLightboxOpen(true);
                                        }}
                                    >
                                        <img 
                                            loading={index === 0 ? 'eager' : 'lazy'}
                                            decoding="async"
                                            src={img} 
                                            alt={`${product.name} - image ${index + 1}`}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src = '/images/placeholder.svg';
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                            {/* Numerical Pager Overlay */}
                            {gallery.length > 1 && (
                                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-[10px] font-bold text-white px-2.5 py-1 rounded-full select-none z-10">
                                    {activeImageIndex + 1} / {gallery.length}
                                </div>
                            )}
                        </div>
                    </>
                ) : showLowBandwidthPrompt ? (
                    <div className="flex flex-col h-full items-center justify-center bg-gradient-to-b from-stone-50 to-white p-6 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3 shadow-2xs">
                            <Box size={24} />
                        </div>
                        <h4 className="text-xs font-bold text-stone-900 mb-1">Slow Cellular Connection</h4>
                        <p className="text-[11px] text-stone-500 max-w-xs mb-4 leading-relaxed">
                            Interactive 3D craft models require additional mobile data (~1.5–3.5 MB).
                        </p>
                        <button
                            type="button"
                            onClick={() => setHasConfirmed3D(true)}
                            className="px-4 py-2.5 rounded-xl bg-clay-600 hover:bg-clay-700 active:scale-95 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer min-h-[44px]"
                        >
                            <Box size={14} />
                            <span>Load 3D Model</span>
                        </button>
                    </div>
                ) : (
                    <ThreeDModelBoundary
                        resetKey={product.model_3d_url || product.model_url}
                        fallback={({ onRetry }) => (
                            <ThreeDModelUnavailable
                                compact
                                title={`${product.name} 3D view is unavailable`}
                                description="Could not load the 3D viewer. Please check your network connection."
                                onRetry={onRetry}
                                className="h-full"
                            />
                        )}
                    >
                        <Suspense fallback={
                            <div className="flex flex-col h-full items-center justify-center bg-gradient-to-b from-gray-50 to-white text-sm font-medium text-stone-500 gap-2">
                                <Loader2 className="w-6 h-6 animate-spin text-clay-600" />
                                <span>Loading 3D view...</span>
                            </div>
                        }>
                            <ProductViewer3D
                                modelUrl={product.model_3d_url || product.model_url}
                                productName={product.name}
                                dimensions={{
                                    height: product.height,
                                    width: product.width,
                                    depth: product.depth
                                }}
                                onOpenHeightChart={onOpenHeightComparison}
                                onScaleBenchmarkChange={setIsScaleBenchmarkActive}
                                compact
                                hideBadge
                                topLeftAction={
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLightboxInitialMode('3d');
                                            setIsLightboxOpen(true);
                                        }}
                                        aria-label="Expand 3D interactive viewer in fullscreen"
                                        title="Expand 3D view"
                                        className="flex items-center justify-center w-[38px] h-[38px] rounded-xl bg-stone-900/80 hover:bg-stone-900 text-white backdrop-blur-md border border-white/10 shadow-md transition-all active:scale-95 cursor-pointer group shrink-0"
                                    >
                                        <Maximize2 size={16} className="text-stone-300 group-hover:text-white transition-colors" />
                                    </button>
                                }
                                className="h-full rounded-none border-0 bg-gradient-to-b from-gray-50 to-white"
                            />
                        </Suspense>
                    </ThreeDModelBoundary>
                )}

                {/* View Toggle */}
                {product.has3D && (viewMode === 'image' || !isScaleBenchmarkActive) && (
                    <div className="absolute top-3 right-3 z-10 flex bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <button
                            onClick={() => setViewMode('image')}
                            aria-label="Show product images"
                            title="Show product images"
                            className={`flex items-center justify-center h-11 px-4 lg:h-8 lg:px-3 text-xs font-bold transition ${
                                viewMode === 'image' ? 'bg-clay-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            <ImageIcon size={14} />
                        </button>
                        <button
                            onClick={() => setViewMode('3d')}
                            onMouseEnter={handlePreload3D}
                            onFocus={handlePreload3D}
                            onTouchStart={handlePreload3D}
                            aria-label="Show 3D product view"
                            title="Show 3D product view"
                            className={`flex items-center justify-center h-11 px-4 lg:h-8 lg:px-3 text-xs font-bold transition ${
                                viewMode === '3d' ? 'bg-clay-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            <Box size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* Thumbnails */}
            <div className="flex gap-2 overflow-x-auto px-0.5 pb-1.5 scrollbar-hide">
                {gallery.map((img, index) => (
                    <button
                        key={index}
                        onClick={() => { setActiveImageIndex(index); setViewMode('image'); }}
                        aria-label={`Show product image ${index + 1}`}
                        title={`Show product image ${index + 1}`}
                        className={`flex-shrink-0 w-16 h-16 rounded-xl border-2 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm ${
                            activeImageIndex === index && viewMode === 'image'
                                ? 'border-clay-600'
                                : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <img
                            loading="lazy"
                            decoding="async"
                            src={img}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = '/images/placeholder.svg';
                            }}
                        />
                    </button>
                ))}
                {product.has3D && (
                    <button
                        onClick={() => setViewMode('3d')}
                        onMouseEnter={handlePreload3D}
                        onFocus={handlePreload3D}
                        onTouchStart={handlePreload3D}
                        aria-label="Show 3D product view"
                        title="Show 3D product view"
                        className={`flex-shrink-0 w-16 h-16 rounded-xl border-2 flex items-center justify-center transition ${
                            viewMode === '3d' ? 'border-clay-600 bg-clay-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <Box size={20} className="text-gray-400" />
                    </button>
                )}
            </div>

            {/* Wishlist & Report */}
            <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                {auth?.user && (
                    <button
                        onClick={() => setIsReporting(true)}
                        aria-label="Report this product"
                        className="flex items-center gap-1.5 h-11 px-4 lg:h-8 lg:px-3 rounded-full text-xs font-bold transition bg-gray-50 text-gray-400 hover:text-red-500"
                    >
                        <Flag size={14} /> Report
                    </button>
                )}
                <button
                    onClick={handleWishlistToggle}
                    aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                    className={`flex items-center gap-1.5 h-11 px-4 lg:h-8 lg:px-3 rounded-full text-xs font-bold transition ${
                        isWishlisted ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400 hover:text-red-500'
                    }`}
                >
                    <Heart size={14} className={isWishlisted ? 'fill-current' : ''} />
                    {wishlistLabel}
                </button>
            </div>

            {/* Full-Screen Photo & 3D Lightbox Modal */}
            <ProductImageLightboxModal
                isOpen={isLightboxOpen}
                onClose={() => setIsLightboxOpen(false)}
                productName={product.name}
                gallery={gallery}
                activeIndex={activeImageIndex}
                onChangeIndex={setActiveImageIndex}
                has3D={Boolean(product.has3D)}
                modelUrl={product.model_3d_url || product.model_url}
                dimensions={{
                    height: product.height,
                    width: product.width,
                    depth: product.depth,
                }}
                onOpenHeightComparison={onOpenHeightComparison}
                initialMode={lightboxInitialMode}
            />
        </div>
    );
}
