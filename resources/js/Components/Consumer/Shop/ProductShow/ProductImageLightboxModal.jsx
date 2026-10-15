import React, { lazy, Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { 
    X, 
    ChevronLeft, 
    ChevronRight, 
    ZoomIn, 
    ZoomOut, 
    RotateCcw, 
    Download,
    Box,
    Loader2
} from 'lucide-react';
import { ThreeDModelBoundary, ThreeDModelUnavailable } from '@/Components/ThreeD/ThreeDModelBoundary';

const ProductViewer3D = lazy(() => import('@/Components/ThreeD/ProductViewer3D'));

export default function ProductImageLightboxModal({
    isOpen = false,
    onClose,
    productName = 'Product Photo',
    gallery = [],
    activeIndex = 0,
    onChangeIndex,
    has3D = false,
    modelUrl = null,
    dimensions = null,
    onOpenHeightComparison,
    initialMode = 'image',
}) {
    const [viewMode, setViewMode] = useState(initialMode || 'image');
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    
    const panStartRef = useRef({ x: 0, y: 0 });
    const touchStartRef = useRef(null);
    const thumbnailRefs = useRef([]);

    const [prevInitialMode, setPrevInitialMode] = useState(initialMode);
    if (initialMode !== prevInitialMode) {
        setPrevInitialMode(initialMode);
        setViewMode(initialMode || 'image');
    }

    const resetTransforms = useCallback(() => {
        setZoom(1);
        setRotation(0);
        setPan({ x: 0, y: 0 });
    }, []);

    // Auto-scroll active thumbnail into view
    useEffect(() => {
        if (isOpen && viewMode === 'image' && thumbnailRefs.current[activeIndex]) {
            thumbnailRefs.current[activeIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center',
            });
        }
    }, [activeIndex, isOpen, viewMode]);

    const handleSelectImageIndex = useCallback((idx) => {
        setViewMode('image');
        if (idx === activeIndex) return;
        resetTransforms();
        onChangeIndex?.(idx);
    }, [activeIndex, onChangeIndex, resetTransforms]);

    const handleSelect3D = useCallback(() => {
        setViewMode('3d');
        resetTransforms();
    }, [resetTransforms]);

    const handleNext = useCallback(() => {
        if (viewMode === '3d') {
            if (gallery.length > 0) {
                setViewMode('image');
                resetTransforms();
                onChangeIndex?.(0);
            }
            return;
        }

        if (activeIndex === gallery.length - 1) {
            if (has3D) {
                setViewMode('3d');
                resetTransforms();
            } else if (gallery.length > 1) {
                resetTransforms();
                onChangeIndex?.(0);
            }
            return;
        }

        const nextIndex = activeIndex + 1;
        resetTransforms();
        onChangeIndex?.(nextIndex);
    }, [activeIndex, gallery.length, has3D, onChangeIndex, resetTransforms, viewMode]);

    const handlePrev = useCallback(() => {
        if (viewMode === '3d') {
            if (gallery.length > 0) {
                setViewMode('image');
                resetTransforms();
                onChangeIndex?.(gallery.length - 1);
            }
            return;
        }

        if (activeIndex === 0) {
            if (has3D) {
                setViewMode('3d');
                resetTransforms();
            } else if (gallery.length > 1) {
                resetTransforms();
                onChangeIndex?.(gallery.length - 1);
            }
            return;
        }

        const prevIndex = activeIndex - 1;
        resetTransforms();
        onChangeIndex?.(prevIndex);
    }, [activeIndex, gallery.length, has3D, onChangeIndex, resetTransforms, viewMode]);

    const handleClose = useCallback(() => {
        resetTransforms();
        onClose?.();
    }, [onClose, resetTransforms]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Escape') handleClose();
            if (viewMode === 'image') {
                if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.5, 3));
                if (e.key === '-') setZoom(z => Math.max(z - 0.5, 1));
                if (e.key === '0') {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                }
                if (e.key === 'r') setRotation(r => (r + 90) % 360);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleNext, handlePrev, handleClose, viewMode]);

    // Mouse drag for panning when zoomed
    const handleMouseDown = (e) => {
        if (viewMode !== 'image' || zoom <= 1) return;
        setIsPanning(true);
        panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    };

    const handleMouseMove = (e) => {
        if (viewMode !== 'image' || !isPanning || zoom <= 1) return;
        setPan({
            x: e.clientX - panStartRef.current.x,
            y: e.clientY - panStartRef.current.y,
        });
    };

    const handleMouseUp = () => setIsPanning(false);

    // Double-click to toggle zoom (only for 2D image)
    const handleDoubleClick = () => {
        if (viewMode !== 'image') return;
        if (zoom > 1) {
            setZoom(1);
            setPan({ x: 0, y: 0 });
        } else {
            setZoom(2);
        }
    };

    // Mobile touch swipe (only for 2D image)
    const handleTouchStart = (e) => {
        if (viewMode !== 'image' || zoom > 1) return;
        touchStartRef.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e) => {
        if (viewMode !== 'image' || zoom > 1 || touchStartRef.current === null) return;
        const touchEndX = e.changedTouches[0].clientX;
        const delta = touchStartRef.current - touchEndX;
        if (Math.abs(delta) > 40) {
            if (delta > 0) {
                handleNext();
            } else {
                handlePrev();
            }
        }
        touchStartRef.current = null;
    };

    // Download photo or 3D asset
    const handleDownload = () => {
        const cleanName = (productName || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const link = document.createElement('a');

        if (viewMode === '3d' && modelUrl) {
            link.href = modelUrl;
            link.download = `${cleanName}-model-3d.glb`;
        } else {
            const currentUrl = gallery[activeIndex];
            if (!currentUrl) return;
            link.href = currentUrl;
            link.download = `${cleanName}-photo-${activeIndex + 1}.jpg`;
        }

        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen || (gallery.length === 0 && !has3D)) return null;

    const currentImage = gallery[activeIndex] || '/images/placeholder.svg';
    const totalItems = gallery.length + (has3D ? 1 : 0);

    return (
        <Transition show={isOpen} as={React.Fragment}>
            <Dialog as="div" className="relative z-[150]" onClose={handleClose}>
                {/* Backdrop with earthy dark tone */}
                <TransitionChild
                    as={React.Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-stone-950/95 backdrop-blur-xl transition-opacity" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-hidden flex flex-col">
                    <DialogPanel className="relative w-full h-full flex flex-col justify-between select-none">
                        
                        {/* Top Header Controls Bar */}
                        <div className="w-full flex items-center justify-between px-3.5 py-2.5 sm:px-6 sm:py-3.5 bg-stone-950/80 backdrop-blur-md border-b border-stone-850 z-50">
                            {/* Left: Product Name & Counter Badge */}
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                {viewMode === '3d' ? (
                                    <span className="px-2.5 py-1 rounded-lg bg-clay-600/90 text-white text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1.5 shadow-sm">
                                        <Box size={12} /> 3D View
                                    </span>
                                ) : (
                                    <span className="px-2.5 py-1 rounded-lg bg-stone-800 text-stone-200 text-[10px] font-black uppercase tracking-wider shrink-0 border border-stone-750">
                                        Gallery
                                    </span>
                                )}
                                
                                <h3 className="text-white text-xs sm:text-sm font-bold truncate max-w-[160px] sm:max-w-md">
                                    {productName}
                                </h3>

                                <span className="hidden sm:inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700/60 shrink-0">
                                    {viewMode === '3d' ? '3D' : `${activeIndex + 1} / ${gallery.length}`}
                                </span>
                            </div>

                            {/* Right: Actions */}
                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                {viewMode === 'image' && (
                                    /* 2D Zoom Controls */
                                    <div className="hidden sm:flex items-center gap-1 bg-stone-900/90 rounded-xl p-0.5 border border-stone-800">
                                        <button
                                            type="button"
                                            onClick={() => setZoom(z => Math.max(z - 0.5, 1))}
                                            disabled={zoom <= 1}
                                            aria-label="Zoom out"
                                            title="Zoom out (-)"
                                            className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                        >
                                            <ZoomOut size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                                            title="Reset zoom (0)"
                                            className="px-2 py-1 text-[11px] font-bold text-stone-300 hover:text-white transition"
                                        >
                                            {Math.round(zoom * 100)}%
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setZoom(z => Math.min(z + 0.5, 3))}
                                            disabled={zoom >= 3}
                                            aria-label="Zoom in"
                                            title="Zoom in (+)"
                                            className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                        >
                                            <ZoomIn size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRotation(r => (r + 90) % 360)}
                                            aria-label="Rotate image"
                                            title="Rotate image (R)"
                                            className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 transition"
                                        >
                                            <RotateCcw size={15} />
                                        </button>
                                    </div>
                                )}

                                {/* Download */}
                                <button
                                    type="button"
                                    onClick={handleDownload}
                                    aria-label={viewMode === '3d' ? "Download 3D model asset" : "Download photo"}
                                    title={viewMode === '3d' ? "Download 3D model asset" : "Download high-res photo"}
                                    className="p-2 sm:p-2.5 rounded-xl bg-stone-850 hover:bg-stone-800 text-stone-300 hover:text-white transition-all active:scale-95 border border-stone-750 flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                                >
                                    <Download size={17} />
                                </button>

                                <div className="w-px h-5 bg-stone-800 mx-0.5 hidden sm:block" />

                                {/* Close Button */}
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    aria-label="Close photo view"
                                    title="Close photo viewer (Esc)"
                                    className="p-2 sm:p-2.5 rounded-xl bg-stone-850 hover:bg-red-950/50 hover:text-red-400 hover:border-red-800/60 text-stone-200 transition-all active:scale-95 border border-stone-750 flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Main Center Viewport */}
                        <div 
                            className="flex-1 relative w-full flex items-center justify-center p-2 sm:p-6 md:p-8 overflow-hidden"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onTouchStart={handleTouchStart}
                            onTouchEnd={handleTouchEnd}
                        >
                            {/* Navigation Arrow: Previous */}
                            {totalItems > 1 && (
                                <button
                                    type="button"
                                    onClick={handlePrev}
                                    aria-label="Previous item"
                                    title="Previous item (Left Arrow)"
                                    className="absolute left-2.5 sm:left-6 z-40 p-3 sm:p-3.5 rounded-full bg-stone-900/85 hover:bg-stone-800 text-white border border-stone-750 backdrop-blur-md shadow-xl transition-all active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                            )}

                            {/* Center Content: 3D Model or 2D Image */}
                            {viewMode === '3d' ? (
                                <div className="w-full h-full max-w-4xl max-h-[58vh] sm:max-h-[64vh] md:max-h-[70vh] rounded-2xl overflow-hidden bg-stone-900 border border-stone-800 shadow-2xl relative">
                                    <ThreeDModelBoundary
                                        resetKey={modelUrl}
                                        fallback={({ onRetry }) => (
                                            <ThreeDModelUnavailable
                                                compact
                                                title={`${productName} 3D view is unavailable`}
                                                description="Could not load the 3D model viewer."
                                                onRetry={onRetry}
                                                className="h-full bg-stone-900 text-stone-300"
                                            />
                                        )}
                                    >
                                        <Suspense fallback={
                                            <div className="flex flex-col h-full items-center justify-center bg-stone-900 text-stone-400 gap-2">
                                                <Loader2 className="w-8 h-8 animate-spin text-clay-500" />
                                                <span className="text-xs font-bold">Loading 3D model...</span>
                                            </div>
                                        }>
                                            <ProductViewer3D
                                                modelUrl={modelUrl}
                                                productName={productName}
                                                dimensions={dimensions}
                                                onOpenHeightChart={onOpenHeightComparison}
                                                hideBadge
                                                className="h-full rounded-2xl border-0 bg-stone-900"
                                            />
                                        </Suspense>
                                    </ThreeDModelBoundary>
                                </div>
                            ) : (
                                <div 
                                    className={`relative max-w-full max-h-full flex items-center justify-center ${zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
                                    onDoubleClick={handleDoubleClick}
                                >
                                    <img
                                        key={currentImage}
                                        src={currentImage}
                                        alt={`${productName} photo ${activeIndex + 1}`}
                                        decoding="async"
                                        className="max-h-[58vh] sm:max-h-[64vh] md:max-h-[70vh] max-w-[94vw] w-auto h-auto object-contain rounded-xl shadow-2xl transition-transform duration-200"
                                        style={{
                                            transform: `scale(${zoom}) rotate(${rotation}deg) translate(${pan.x}px, ${pan.y}px)`,
                                            filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.6))',
                                        }}
                                        onError={(e) => { e.target.src = '/images/placeholder.svg'; }}
                                        draggable={false}
                                    />
                                </div>
                            )}

                            {/* Navigation Arrow: Next */}
                            {totalItems > 1 && (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    aria-label="Next item"
                                    title="Next item (Right Arrow)"
                                    className="absolute right-2.5 sm:right-6 z-40 p-3 sm:p-3.5 rounded-full bg-stone-900/85 hover:bg-stone-800 text-white border border-stone-750 backdrop-blur-md shadow-xl transition-all active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                >
                                    <ChevronRight size={24} />
                                </button>
                            )}
                        </div>

                        {/* Bottom Thumbnail Strip (Album photo row + 3D) */}
                        <div className="w-full flex flex-col items-center px-4 pt-2 pb-4 sm:pb-5 bg-gradient-to-t from-stone-950 via-stone-950/90 to-transparent z-40">
                            {totalItems > 1 && (
                                <div className="flex items-center gap-2 overflow-x-auto max-w-full px-3 py-2 rounded-2xl bg-stone-900/90 backdrop-blur-md border border-stone-800 shadow-2xl scrollbar-none">
                                    {/* 2D Photo Thumbnails */}
                                    {gallery.map((img, idx) => {
                                        const isActive = viewMode === 'image' && idx === activeIndex;
                                        return (
                                            <button
                                                key={idx}
                                                ref={(el) => (thumbnailRefs.current[idx] = el)}
                                                type="button"
                                                onClick={() => handleSelectImageIndex(idx)}
                                                aria-label={`View photo ${idx + 1}`}
                                                className={`relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-xl overflow-hidden transition-all duration-200 active:scale-95 ${
                                                    isActive
                                                        ? 'border-2 border-clay-500 ring-2 ring-clay-500/50 scale-105 opacity-100 shadow-md'
                                                        : 'border border-stone-700/60 opacity-50 hover:opacity-90 hover:border-stone-500'
                                                }`}
                                            >
                                                <img
                                                    src={img}
                                                    alt=""
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.target.src = '/images/placeholder.svg'; }}
                                                />
                                                {isActive && (
                                                    <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-clay-400 ring-1 ring-white" />
                                                )}
                                            </button>
                                        );
                                    })}

                                    {/* 3D Model Thumbnail */}
                                    {has3D && (
                                        <button
                                            type="button"
                                            onClick={handleSelect3D}
                                            aria-label="View 3D interactive model"
                                            title="View 3D interactive model"
                                            className={`relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-xl overflow-hidden transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-0.5 ${
                                                viewMode === '3d'
                                                    ? 'border-2 border-clay-500 ring-2 ring-clay-500/50 scale-105 bg-stone-850 text-clay-400 opacity-100 shadow-md'
                                                    : 'border border-stone-700/60 bg-stone-900/90 text-stone-400 opacity-60 hover:opacity-100 hover:border-stone-500'
                                            }`}
                                        >
                                            <Box size={20} className={viewMode === '3d' ? 'text-clay-400' : 'text-stone-400'} />
                                            <span className="text-[10px] font-black uppercase tracking-wider">3D</span>
                                            {viewMode === '3d' && (
                                                <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-clay-400 ring-1 ring-white" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Pager info & keyboard guide */}
                            <div className="mt-2 flex items-center gap-3 text-[11px] text-stone-400 font-medium select-none">
                                <span>
                                    {viewMode === '3d' ? 'Interactive 3D Model' : `${activeIndex + 1} of ${gallery.length}`}
                                </span>
                                <span className="hidden sm:inline text-stone-600">•</span>
                                <span className="hidden sm:inline">Use arrow keys ← → to browse</span>
                                <span className="hidden sm:inline text-stone-600">•</span>
                                <span className="hidden sm:inline">
                                    {viewMode === '3d' ? 'Drag to orbit 360° • Scroll to zoom' : 'Double-click to zoom'}
                                </span>
                            </div>
                        </div>

                    </DialogPanel>
                </div>
            </Dialog>
        </Transition>
    );
}
