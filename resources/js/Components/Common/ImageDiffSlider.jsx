import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MoveHorizontal, RotateCcw, ImageIcon, AlertCircle } from 'lucide-react';

/**
 * Reusable Side-by-Side Image Diff Slider for visual dispute inspections.
 * Allows comparing baseline/pre-shipment photos against buyer defect proof photos.
 */
export default function ImageDiffSlider({
    beforeImage,
    afterImage,
    beforeLabel = 'Artisan Pre-Shipment',
    afterLabel = 'Buyer Reported Defect',
    beforeOptions = [],
    afterOptions = [],
    selectedBeforeIndex = 0,
    selectedAfterIndex = 0,
    onSelectBefore,
    onSelectAfter,
    className = ''
}) {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef(null);

    const normalizeUrl = (url) => {
        if (!url) return '';
        if (typeof url !== 'string') return '';
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/storage') || url.startsWith('data:')) {
            return url;
        }
        return `/storage/${url.replace(/^\/+/, '')}`;
    };

    const beforeSrc = normalizeUrl(beforeImage);
    const afterSrc = normalizeUrl(afterImage);

    const updateSliderPosition = useCallback((clientX) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const rawX = clientX - rect.left;
        const boundedX = Math.max(0, Math.min(rawX, rect.width));
        const percentage = (boundedX / rect.width) * 100;
        setSliderPosition(Math.round(percentage));
    }, []);

    // Mouse drag handlers
    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    // Touch drag handlers
    const handleTouchMove = (e) => {
        if (!isDragging && e.type !== 'touchmove') return;
        if (e.touches && e.touches[0]) {
            updateSliderPosition(e.touches[0].clientX);
        }
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            updateSliderPosition(e.clientX);
        };

        const handleMouseUp = () => {
            if (isDragging) setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, updateSliderPosition]);

    const handleReset = () => {
        setSliderPosition(50);
    };

    if (!beforeSrc && !afterSrc) {
        return (
            <div className={`p-8 text-center bg-stone-50 border border-stone-200 rounded-2xl ${className}`}>
                <ImageIcon className="w-8 h-8 mx-auto text-stone-300 mb-2" />
                <p className="text-xs text-stone-500 font-medium">No comparison images available for diff inspection.</p>
            </div>
        );
    }

    return (
        <div className={`flex flex-col bg-white border border-stone-200/90 rounded-2xl overflow-hidden shadow-2xs ${className}`}>
            {/* Header controls & description */}
            <div className="px-4 py-3 bg-[#FCFBF9] border-b border-stone-100 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-clay-100 text-clay-700 border border-clay-200/60">
                        <MoveHorizontal size={14} />
                    </span>
                    <div>
                        <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider">
                            Evidence Comparison Slider
                        </h4>
                        <p className="text-[10px] text-stone-500 font-medium">
                            Drag the center divider or use arrow keys to inspect surface discrepancies
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-stone-500 bg-white px-2 py-0.5 rounded border border-stone-200">
                        {sliderPosition}% : {100 - sliderPosition}%
                    </span>
                    <button
                        type="button"
                        onClick={handleReset}
                        title="Reset slider to 50%"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-50 border border-stone-200 px-2 py-0.5 rounded-lg transition"
                    >
                        <RotateCcw size={11} />
                        <span>Center</span>
                    </button>
                </div>
            </div>

            {/* Interactive Split Frame */}
            <div
                ref={containerRef}
                className="relative w-full aspect-[16/10] sm:aspect-[16/9] max-h-[380px] bg-stone-900 select-none overflow-hidden cursor-ew-resize"
                onMouseDown={handleMouseDown}
                onTouchStart={() => setIsDragging(true)}
                onTouchMove={handleTouchMove}
                onTouchEnd={() => setIsDragging(false)}
            >
                {/* Background Layer: After image (Buyer's defect proof) */}
                <div className="absolute inset-0 w-full h-full">
                    {afterSrc ? (
                        <img
                            src={afterSrc}
                            alt={afterLabel}
                            className="w-full h-full object-contain pointer-events-none"
                            draggable={false}
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-stone-950 text-stone-400 p-4 text-center">
                            <AlertCircle size={24} className="mb-1 text-stone-500" />
                            <p className="text-xs font-medium">No buyer defect proof uploaded</p>
                        </div>
                    )}
                </div>

                {/* Foreground Layer (Clipped): Before image (Seller pre-shipment / catalog) */}
                <div
                    className="absolute inset-0 h-full overflow-hidden"
                    style={{ width: `${sliderPosition}%` }}
                >
                    <div
                        className="absolute inset-0 h-full"
                        style={{
                            width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%',
                            maxWidth: 'none'
                        }}
                    >
                        {beforeSrc ? (
                            <img
                                src={beforeSrc}
                                alt={beforeLabel}
                                className="w-full h-full object-contain pointer-events-none"
                                draggable={false}
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-stone-900 text-stone-400 p-4 text-center">
                                <AlertCircle size={24} className="mb-1 text-stone-500" />
                                <p className="text-xs font-medium">No artisan dispatch photo</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Interactive Divider Line & Thumb */}
                <div
                    className="absolute top-0 bottom-0 z-20 pointer-events-none flex flex-col items-center"
                    style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                >
                    <div className="w-0.5 h-full bg-white shadow-[0_0_8px_rgba(0,0,0,0.6)]" />
                    <div className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white border-2 border-white shadow-lg pointer-events-auto cursor-ew-resize hover:scale-105 active:scale-95 transition-transform">
                        <MoveHorizontal size={14} className="text-clay-300" />
                    </div>
                </div>

                {/* Floating Labels */}
                <div className="absolute top-3 left-3 z-10 pointer-events-none">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-900/80 backdrop-blur-sm text-stone-100 text-[10px] font-bold border border-white/20 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-indigo-400" />
                        {beforeLabel}
                    </span>
                </div>
                <div className="absolute top-3 right-3 z-10 pointer-events-none">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-900/80 backdrop-blur-sm text-stone-100 text-[10px] font-bold border border-white/20 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-rose-400" />
                        {afterLabel}
                    </span>
                </div>

                {/* Accessible range input for keyboard navigation */}
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderPosition}
                    onChange={(e) => setSliderPosition(Number(e.target.value))}
                    className="sr-only"
                    aria-label="Image comparison divider position"
                />
            </div>

            {/* Evidence Selector Switchers (if multiple photos available on either side) */}
            {(beforeOptions.length > 1 || afterOptions.length > 1) && (
                <div className="p-3 bg-stone-50/80 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Before Image Selectors */}
                    {beforeOptions.length > 1 && (
                        <div className="space-y-1.5">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
                                Artisan Photos ({beforeOptions.length})
                            </span>
                            <div className="flex gap-1.5 overflow-x-auto pb-1">
                                {beforeOptions.map((opt, idx) => {
                                    const optSrc = normalizeUrl(typeof opt === 'string' ? opt : opt?.url);
                                    const isSelected = selectedBeforeIndex === idx;
                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => onSelectBefore && onSelectBefore(idx)}
                                            className={`relative w-12 h-12 rounded-lg overflow-hidden border shrink-0 transition-all ${
                                                isSelected
                                                    ? 'border-indigo-600 ring-2 ring-indigo-500/30'
                                                    : 'border-stone-200 opacity-60 hover:opacity-100'
                                            }`}
                                        >
                                            <img src={optSrc} alt={`Option ${idx + 1}`} className="w-full h-full object-cover" />
                                            {isSelected && (
                                                <span className="absolute bottom-0 inset-x-0 bg-indigo-600 text-[8px] text-white text-center font-bold">
                                                    Active
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* After Image Selectors */}
                    {afterOptions.length > 1 && (
                        <div className="space-y-1.5">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
                                Buyer Proof Photos ({afterOptions.length})
                            </span>
                            <div className="flex gap-1.5 overflow-x-auto pb-1">
                                {afterOptions.map((opt, idx) => {
                                    const optSrc = normalizeUrl(typeof opt === 'string' ? opt : opt?.url);
                                    const isSelected = selectedAfterIndex === idx;
                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => onSelectAfter && onSelectAfter(idx)}
                                            className={`relative w-12 h-12 rounded-lg overflow-hidden border shrink-0 transition-all ${
                                                isSelected
                                                    ? 'border-rose-600 ring-2 ring-rose-500/30'
                                                    : 'border-stone-200 opacity-60 hover:opacity-100'
                                            }`}
                                        >
                                            <img src={optSrc} alt={`Proof ${idx + 1}`} className="w-full h-full object-cover" />
                                            {isSelected && (
                                                <span className="absolute bottom-0 inset-x-0 bg-rose-600 text-[8px] text-white text-center font-bold">
                                                    Active
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
