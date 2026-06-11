import React, { lazy, Suspense, useRef, useEffect } from 'react';
import { Image as ImageIcon, Box, Flag, Heart } from 'lucide-react';
import ProductImageMagnifier from './ProductImageMagnifier';

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
}) {
    const scrollRef = useRef(null);

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
            {/* Main Image */}
            <div className="relative aspect-square bg-gray-50 rounded-xl overflow-hidden mb-3">
                {viewMode === 'image' ? (
                    <>
                        {/* Desktop/Tablet View */}
                        <div className="hidden md:block h-full">
                            <ProductImageMagnifier 
                                id="main-product-image"
                                src={gallery[activeImageIndex] || '/images/no-image.png'} 
                                alt={product.name} 
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
                                    <div key={index} className="w-full h-full shrink-0 snap-center">
                                        <img 
                                            src={img} 
                                            alt={`${product.name} - image ${index + 1}`}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.target.src = '/images/no-image.png'; }}
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
                ) : (
                    <Suspense fallback={<div className="flex h-full items-center justify-center bg-gradient-to-b from-gray-50 to-white text-sm font-medium text-gray-500">Loading 3D view...</div>}>
                        <ProductViewer3D
                            modelUrl={product.model_url}
                            productName={product.name}
                            compact
                            className="h-full rounded-none border-0 bg-gradient-to-b from-gray-50 to-white"
                        />
                    </Suspense>
                )}

                {/* View Toggle */}
                {product.has3D && (
                    <div className="absolute top-3 right-3 flex bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                            src={img}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.src = '/images/no-image.png'; }}
                        />
                    </button>
                ))}
                {product.has3D && (
                    <button
                        onClick={() => setViewMode('3d')}
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
        </div>
    );
}
