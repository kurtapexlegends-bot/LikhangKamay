import React, { useState } from 'react';
import { Download, Maximize2, X, ZoomIn, ZoomOut, ScanText, CheckCircle2, Copy, Check } from 'lucide-react';
import Modal from '@/Components/Modal';

export default function DocumentMagnifierModal({
    viewingDoc,
    onClose,
    subtitle = 'Permit & ID Inspection Magnifier',
}) {
    const [prevKey, setPrevKey] = useState(viewingDoc?.key || viewingDoc?.url || null);
    const [docZoom, setDocZoom] = useState(1);
    const [docPosition, setDocPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [showOcrDetails, setShowOcrDetails] = useState(true);
    const [copiedValue, setCopiedValue] = useState(false);

    const ocrData = viewingDoc?.ocr || viewingDoc?.ocr_data || null;

    const handleCopyExtracted = (val) => {
        if (!val) return;
        try {
            navigator.clipboard?.writeText(String(val))?.catch?.(() => {});
        } catch {
            // Safe fallback if clipboard API unavailable
        }
        setCopiedValue(true);
        setTimeout(() => setCopiedValue(false), 2000);
    };

    const activeKey = viewingDoc?.key || viewingDoc?.url || null;
    if (activeKey !== prevKey) {
        setPrevKey(activeKey);
        setDocZoom(1);
        setDocPosition({ x: 0, y: 0 });
        setIsDragging(false);
    }

    const isPdf = Boolean(
        viewingDoc?.url && String(viewingDoc.url).toLowerCase().split('?')[0].endsWith('.pdf')
    );

    const handleZoomIn = () => setDocZoom((prev) => Math.min(prev + 0.35, 3.5));
    const handleZoomOut = () => {
        setDocZoom((prev) => {
            const next = Math.max(prev - 0.35, 1);
            if (next === 1) setDocPosition({ x: 0, y: 0 });
            return next;
        });
    };
    const handleResetZoom = () => {
        setDocZoom(1);
        setDocPosition({ x: 0, y: 0 });
    };

    const handleMouseDown = (e) => {
        if (docZoom <= 1) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - docPosition.x, y: e.clientY - docPosition.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging || docZoom <= 1) return;
        setDocPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };

    const handleMouseUp = () => setIsDragging(false);

    return (
        <Modal show={Boolean(viewingDoc)} onClose={onClose} maxWidth="7xl" bottomSheet={false}>
            {viewingDoc && (
                <div className="h-[88vh] flex flex-col bg-stone-950 select-none">
                    <div className="bg-stone-900/90 backdrop-blur-md px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 shrink-0">
                        <div>
                            <h3 className="text-sm sm:text-base font-bold text-white leading-tight">{viewingDoc.label}</h3>
                            <p className="text-[11px] text-stone-400 mt-0.5">{viewingDoc.subtitle || subtitle}</p>
                        </div>

                        {!isPdf && (
                            <div className="flex items-center gap-1.5 bg-stone-800/80 p-1 rounded-xl border border-stone-700/60">
                                <button
                                    type="button"
                                    onClick={handleZoomOut}
                                    disabled={docZoom <= 1}
                                    aria-label="Zoom out"
                                    title="Zoom Out (-)"
                                    className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-700/60 transition disabled:opacity-40 cursor-pointer"
                                >
                                    <ZoomOut size={16} />
                                </button>

                                <span className="text-[11px] font-mono font-bold text-stone-300 px-2 min-w-[50px] text-center">
                                    {Math.round(docZoom * 100)}%
                                </span>

                                <button
                                    type="button"
                                    onClick={handleZoomIn}
                                    disabled={docZoom >= 3.5}
                                    aria-label="Zoom in"
                                    title="Zoom In (+)"
                                    className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-700/60 transition disabled:opacity-40 cursor-pointer"
                                >
                                    <ZoomIn size={16} />
                                </button>

                                <div className="h-4 w-[1px] bg-stone-700 mx-0.5" />

                                <button
                                    type="button"
                                    onClick={handleResetZoom}
                                    disabled={docZoom === 1 && docPosition.x === 0 && docPosition.y === 0}
                                    aria-label="Fit to screen"
                                    title="Fit to Screen"
                                    className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-700/60 transition disabled:opacity-40 cursor-pointer"
                                >
                                    <Maximize2 size={15} />
                                </button>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            {ocrData && (
                                <button
                                    type="button"
                                    onClick={() => setShowOcrDetails((prev) => !prev)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                                        showOcrDetails
                                            ? 'bg-clay-600 text-white border-clay-500 shadow-xs'
                                            : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700 hover:text-white'
                                    }`}
                                    title="Toggle Automated OCR Inspection Panel"
                                >
                                    <ScanText size={14} />
                                    <span>OCR Signals</span>
                                </button>
                            )}
                            <a
                                href={viewingDoc.url}
                                download
                                aria-label="Download file"
                                title="Download Document"
                                className="p-2 hover:bg-white/10 rounded-full transition text-stone-400 hover:text-white min-h-[40px] min-w-[40px] flex items-center justify-center"
                            >
                                <Download size={18} />
                            </a>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose?.();
                                }}
                                aria-label="Close preview"
                                title="Close Preview"
                                className="p-2 hover:bg-white/10 rounded-full transition text-stone-400 hover:text-white min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Collapsible Automated OCR Findings Inspector */}
                    {ocrData && showOcrDetails && (
                        <div className="bg-stone-900/95 border-b border-stone-800 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs text-stone-300 transition-all">
                            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold text-[11px] border ${
                                    (ocrData.badge_tone || ocrData.badgeTone) === 'emerald'
                                        ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/80'
                                        : (ocrData.badge_tone || ocrData.badgeTone) === 'amber'
                                        ? 'bg-amber-950/70 text-amber-300 border-amber-700/80'
                                        : 'bg-stone-800 text-stone-300 border-stone-700'
                                }`}>
                                    <CheckCircle2 size={12} className={(ocrData.badge_tone || ocrData.badgeTone) === 'emerald' ? 'text-emerald-400' : 'text-amber-400'} />
                                    <span>{ocrData.badge_text || ocrData.badgeText}</span>
                                </span>

                                {ocrData.confidence !== null && ocrData.confidence !== undefined && (
                                    <span className="text-[11px] text-stone-400">
                                        Confidence: <strong className="text-white">{ocrData.confidence}%</strong>
                                    </span>
                                )}

                                {Array.isArray(ocrData.signals) && ocrData.signals.length > 0 && (
                                    <span className="text-[11px] text-stone-400 hidden sm:inline truncate max-w-md">
                                        Signals: {ocrData.signals.join(' • ')}
                                    </span>
                                )}
                            </div>

                            {(ocrData.extracted_value || ocrData.extractedValue) && (
                                <button
                                    type="button"
                                    onClick={() => handleCopyExtracted(ocrData.extracted_value || ocrData.extractedValue)}
                                    className="inline-flex items-center gap-1.5 rounded-md bg-stone-800 hover:bg-stone-700 px-2.5 py-1 text-[11px] font-mono text-stone-200 border border-stone-700 transition cursor-pointer shrink-0"
                                    title="Copy extracted number"
                                >
                                    {copiedValue ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                    <span>{copiedValue ? 'Copied!' : `Copy #${ocrData.extracted_value || ocrData.extractedValue}`}</span>
                                </button>
                            )}
                        </div>
                    )}

                    <div
                        className="flex-1 overflow-hidden relative flex items-center justify-center bg-stone-950 p-4"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        {isPdf ? (
                            <iframe
                                src={viewingDoc.url}
                                className="h-full w-full rounded-lg bg-white"
                                title={viewingDoc.label}
                            />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center overflow-hidden">
                                <img
                                    src={viewingDoc.url}
                                    alt={viewingDoc.label}
                                    draggable={false}
                                    style={{
                                        transform: `scale(${docZoom}) translate(${docPosition.x / docZoom}px, ${docPosition.y / docZoom}px)`,
                                        cursor: docZoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                                        transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                                    }}
                                    className="max-h-full max-w-full rounded-lg object-contain select-none shadow-2xl"
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = '/images/placeholder.svg';
                                    }}
                                />
                            </div>
                        )}

                        {docZoom > 1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-stone-900/90 border border-stone-700/70 text-stone-300 text-[11px] font-medium px-3.5 py-1.5 rounded-full shadow-lg backdrop-blur-md flex items-center gap-2">
                                <span>Click and drag to pan across image details</span>
                                <button
                                    type="button"
                                    onClick={handleResetZoom}
                                    className="text-amber-400 hover:text-amber-300 font-bold underline ml-1 cursor-pointer"
                                >
                                    Reset (100%)
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
}
