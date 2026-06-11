import React, { useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

export default function ProductImageMagnifier({ src, alt, id }) {
    const [position, setPosition] = useState({ x: 50, y: 50 });
    const [isMagnifying, setIsMagnifying] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(2.5);

    const handleMouseMove = (e) => {
        if (!isMagnifying) return;
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - left) / width) * 100;
        const y = ((e.clientY - top) / height) * 100;
        setPosition({ x, y });
    };

    const handleWheel = (e) => {
        if (!isMagnifying) return;
        e.preventDefault();
        setZoomLevel(prev => {
            const newZoom = prev - e.deltaY * 0.005;
            return Math.min(Math.max(newZoom, 1.5), 5.0);
        });
    };

    return (
        <div 
            className={`w-full h-full relative overflow-hidden group ${isMagnifying ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
            onMouseMove={handleMouseMove}
            onWheel={handleWheel}
            onClick={() => setIsMagnifying(!isMagnifying)}
            onMouseLeave={() => setIsMagnifying(false)}
        >
            <img
                id={id}
                src={src}
                alt={alt}
                loading="lazy"
                onError={(e) => { e.target.src = '/images/no-image.png'; }}
                className="w-full h-full object-cover transition-transform duration-200 ease-out"
                style={{
                    transform: isMagnifying ? `scale(${zoomLevel})` : 'scale(1)',
                    transformOrigin: `${position.x}% ${position.y}%`
                }}
            />
            {/* Overlay Hint */}
            <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg transition-opacity duration-300 flex items-center gap-1.5 ${isMagnifying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                {isMagnifying ? (
                    <>
                        <ZoomOut size={12} /> Click to close • Scroll to zoom
                    </>
                ) : (
                    <>
                        <ZoomIn size={12} /> Click to magnify
                    </>
                )}
            </div>
        </div>
    );
}
