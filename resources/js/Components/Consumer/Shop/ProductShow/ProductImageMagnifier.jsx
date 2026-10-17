import React, { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

export default function ProductImageMagnifier({ src, alt, id, onOpenLightbox }) {
    const [position, setPosition] = useState({ x: 50, y: 50 });
    const [isMagnifying, setIsMagnifying] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(2.5);
    const containerRef = useRef(null);

    const handleMouseMove = (e) => {
        if (!isMagnifying) return;
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - left) / width) * 100;
        const y = ((e.clientY - top) / height) * 100;
        setPosition({ x, y });
    };

    // Native non-passive wheel listener so e.preventDefault() prevents page scrolling during zoom
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !isMagnifying) return;

        const onWheelNative = (e) => {
            e.preventDefault();
            e.stopPropagation();
            setZoomLevel(prev => {
                const newZoom = prev - e.deltaY * 0.005;
                return Math.min(Math.max(newZoom, 1.5), 5.0);
            });
        };

        container.addEventListener('wheel', onWheelNative, { passive: false });
        return () => {
            container.removeEventListener('wheel', onWheelNative);
        };
    }, [isMagnifying]);

    return (
        <div 
            ref={containerRef}
            className={`w-full h-full relative overflow-hidden group ${isMagnifying ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
            onMouseMove={handleMouseMove}
            onClick={() => setIsMagnifying(!isMagnifying)}
            onDoubleClick={(e) => {
                e.stopPropagation();
                onOpenLightbox?.();
            }}
            onMouseLeave={() => setIsMagnifying(false)}
        >
            <img
                id={id}
                src={src}
                alt={alt}
                loading="lazy"
                onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/images/placeholder.svg';
                }}
                className="w-full h-full object-cover transition-transform duration-200 ease-out"
                style={{
                    transform: isMagnifying ? `scale(${zoomLevel})` : 'scale(1)',
                    transformOrigin: `${position.x}% ${position.y}%`
                }}
            />
            {/* Overlay Hint */}
            <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg transition-opacity duration-300 flex items-center gap-2 ${isMagnifying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                {isMagnifying ? (
                    <>
                        <ZoomOut size={12} /> Click to close • Scroll to zoom
                    </>
                ) : (
                    <>
                        <ZoomIn size={12} /> Click to zoom
                    </>
                )}
            </div>
        </div>
    );
}
