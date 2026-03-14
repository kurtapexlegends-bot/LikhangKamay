import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { X, ZoomIn, ZoomOut, RotateCcw, Download, ChevronLeft, ChevronRight } from 'lucide-react';

export default function MediaViewer({ show, media, onClose, mediaList = [], initialIndex = 0 }) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);

    // Sync currentIndex when initialIndex changes or dialog opens
    useEffect(() => {
        if (show) {
            setCurrentIndex(initialIndex);
            setZoom(1);
            setRotation(0);
        }
    }, [show, initialIndex]);

    const currentMedia = mediaList.length > 0 ? mediaList[currentIndex] : media;

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
    const handleRotate = () => setRotation(prev => (prev + 90) % 360);
    const handleReset = () => {
        setZoom(1);
        setRotation(0);
    };

    const handleNext = () => {
        if (currentIndex < mediaList.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setZoom(1);
            setRotation(0);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setZoom(1);
            setRotation(0);
        }
    };

    const handleDownload = () => {
        if (!currentMedia?.url) return;
        const link = document.createElement('a');
        link.href = currentMedia.url;
        link.download = currentMedia.url.split('/').pop() || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Keyboard navigation
    useEffect(() => {
        if (!show) return;
        
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Escape') onClose();
            if (e.key === '+') handleZoomIn();
            if (e.key === '-') handleZoomOut();
            if (e.key === 'r') handleRotate();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [show, currentIndex, mediaList.length]);

    if (!currentMedia) return null;

    return (
        <Transition show={show} as={React.Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={onClose}>
                {/* Backdrop with extreme glassmorphism */}
                <TransitionChild
                    as={React.Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl transition-opacity" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-0 text-center">
                        <TransitionChild
                            as={React.Fragment}
                            enter="ease-out duration-300 scale-95 opacity-0"
                            enterTo="scale-100 opacity-100"
                            leave="ease-in duration-200 scale-100 opacity-100"
                            leaveTo="scale-95 opacity-0"
                        >
                            <DialogPanel className="relative w-full h-full min-h-screen flex flex-col items-center justify-center transition-all bg-transparent">
                                
                                {/* Header Controls */}
                                <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex items-center justify-between z-50 bg-gradient-to-b from-black/60 to-transparent">
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={onClose}
                                            className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-md border border-white/10 hover:scale-110 active:scale-95"
                                            title="Close (Esc)"
                                        >
                                            <X size={22} />
                                        </button>
                                        <div className="flex flex-col">
                                            <div className="text-white text-sm font-bold flex items-center gap-2">
                                                <span className="px-2.5 py-1 rounded-lg bg-clay-500 text-[10px] uppercase tracking-wider">Lightbox</span>
                                                {mediaList.length > 0 && (
                                                    <span className="text-white/60 font-medium">
                                                        {currentIndex + 1} / {mediaList.length}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={handleZoomOut}
                                            className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10"
                                            title="Zoom Out (-)"
                                        >
                                            <ZoomOut size={18} />
                                        </button>
                                        <button 
                                            onClick={handleZoomIn}
                                            className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10"
                                            title="Zoom In (+)"
                                        >
                                            <ZoomIn size={18} />
                                        </button>
                                        <button 
                                            onClick={handleRotate}
                                            className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10"
                                            title="Rotate (R)"
                                        >
                                            <RotateCcw size={18} />
                                        </button>
                                        <button 
                                            onClick={handleReset}
                                            className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10 text-xs font-bold"
                                            title="Reset View"
                                        >
                                            1:1
                                        </button>
                                        <div className="w-px h-6 bg-white/20 mx-1" />
                                        <button 
                                            onClick={handleDownload}
                                            className="p-2.5 rounded-full bg-clay-500 text-white hover:bg-clay-600 shadow-lg shadow-clay-900/20 transition-all hover:scale-110 active:scale-90"
                                            title="Download"
                                        >
                                            <Download size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Navigation Arrows */}
                                {mediaList.length > 1 && (
                                    <>
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-50">
                                            <button 
                                                onClick={handlePrev}
                                                disabled={currentIndex === 0}
                                                className={`p-4 rounded-full transition-all backdrop-blur-md border border-white/10 ${
                                                    currentIndex === 0 
                                                    ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                                                    : 'bg-white/10 text-white hover:bg-white/20 hover:scale-110 active:scale-90'
                                                }`}
                                                title="Previous (Left Arrow)"
                                            >
                                                <ChevronLeft size={32} />
                                            </button>
                                        </div>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50">
                                            <button 
                                                onClick={handleNext}
                                                disabled={currentIndex === mediaList.length - 1}
                                                className={`p-4 rounded-full transition-all backdrop-blur-md border border-white/10 ${
                                                    currentIndex === mediaList.length - 1 
                                                    ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                                                    : 'bg-white/10 text-white hover:bg-white/20 hover:scale-110 active:scale-90'
                                                }`}
                                                title="Next (Right Arrow)"
                                            >
                                                <ChevronRight size={32} />
                                            </button>
                                        </div>
                                    </>
                                )}

                                {/* Main Content Wrapper */}
                                <div className="w-full flex-1 flex items-center justify-center p-4 md:p-12 overflow-hidden bg-transparent">
                                    <div 
                                        className="relative transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) select-none cursor-grab active:cursor-grabbing"
                                        style={{ 
                                            transform: `scale(${zoom}) rotate(${rotation}deg)`,
                                            filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.5))'
                                        }}
                                    >
                                        <img 
                                            key={currentMedia.url} // Force animation reset on change
                                            src={currentMedia.url} 
                                            alt="Media Content" 
                                            className="max-w-full max-h-[80vh] md:max-h-[85vh] object-contain rounded-xl pointer-events-none animate-in fade-in zoom-in-95 duration-500"
                                            onDragStart={(e) => e.preventDefault()}
                                        />
                                    </div>
                                </div>

                                {/* Bottom Thumbnails / Info */}
                                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-50">
                                    {Math.abs(zoom - 1) > 0.01 && (
                                        <div className="px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white/90 text-[10px] font-bold tracking-widest uppercase">
                                            {Math.round(zoom * 100)}% Scale
                                        </div>
                                    )}
                                    
                                    {/* Gallery Dots */}
                                    {mediaList.length > 1 && (
                                        <div className="flex gap-1.5 p-1.5 bg-black/20 backdrop-blur-md rounded-full border border-white/5">
                                            {mediaList.map((_, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setCurrentIndex(idx)}
                                                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                                                        idx === currentIndex 
                                                        ? 'bg-clay-400 w-4' 
                                                        : 'bg-white/20 hover:bg-white/40'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
