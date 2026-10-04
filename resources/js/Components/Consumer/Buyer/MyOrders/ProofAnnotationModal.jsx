import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    Pencil,
    Circle,
    Square,
    ArrowUpRight,
    Undo2,
    RotateCcw,
    Check,
    X,
    Maximize2
} from 'lucide-react';

const TOOLS = [
    { id: 'pen', label: 'Pen', icon: Pencil },
    { id: 'circle', label: 'Circle Ring', icon: Circle },
    { id: 'arrow', label: 'Arrow', icon: ArrowUpRight },
    { id: 'rect', label: 'Box', icon: Square },
];

const COLORS = [
    { hex: '#EF4444', label: 'Red' },
    { hex: '#F59E0B', label: 'Amber' },
    { hex: '#FFFFFF', label: 'White' },
];

export default function ProofAnnotationModal({
    isOpen,
    onClose,
    imageUrl,
    onSave
}) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [selectedTool, setSelectedTool] = useState('circle');
    const [selectedColor, setSelectedColor] = useState('#EF4444');
    const [lineWidth, setLineWidth] = useState(4);
    const [history, setHistory] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const imageObjRef = useRef(null);
    const currentPathRef = useRef([]);

    // Load source image
    useEffect(() => {
        if (!isOpen || !imageUrl) return;

        const img = new Image();
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            img.crossOrigin = 'anonymous';
        }
        img.onload = () => {
            imageObjRef.current = img;
            initCanvas(img);
        };
        img.onerror = (err) => {
            console.error('Failed to load annotation image:', err);
        };
        img.src = imageUrl;
    }, [isOpen, imageUrl]);

    // Handle Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                e.preventDefault();
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [isOpen, onClose]);

    const initCanvas = (img) => {
        const canvas = canvasRef.current;
        if (!canvas || !img) return;

        // Scale canvas to fit container while preserving image aspect ratio
        const maxWidth = 700;
        const maxHeight = 500;
        const width = img.naturalWidth || img.width || 600;
        const height = img.naturalHeight || img.height || 400;

        const scale = Math.min(maxWidth / width, maxHeight / height, 1);
        canvas.width = Math.max(100, Math.round(width * scale));
        canvas.height = Math.max(100, Math.round(height * scale));

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Save initial state to history
        const initialState = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory([initialState]);
    };

    const getCanvasCoordinates = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const startDraw = (e) => {
        e.preventDefault();
        const pos = getCanvasCoordinates(e);
        setStartPos(pos);
        setIsDrawing(true);

        if (selectedTool === 'pen') {
            currentPathRef.current = [pos];
        }
    };

    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const currentPos = getCanvasCoordinates(e);

        // Restore last saved state before previewing drag shapes
        if (history.length > 0) {
            ctx.putImageData(history[history.length - 1], 0, 0);
        }

        ctx.strokeStyle = selectedColor;
        ctx.fillStyle = selectedColor;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (selectedTool === 'pen') {
            currentPathRef.current.push(currentPos);
            ctx.beginPath();
            ctx.moveTo(currentPathRef.current[0].x, currentPathRef.current[0].y);
            for (let i = 1; i < currentPathRef.current.length; i++) {
                ctx.lineTo(currentPathRef.current[i].x, currentPathRef.current[i].y);
            }
            ctx.stroke();
        } else if (selectedTool === 'circle') {
            const rx = Math.abs(currentPos.x - startPos.x) / 2;
            const ry = Math.abs(currentPos.y - startPos.y) / 2;
            const cx = Math.min(startPos.x, currentPos.x) + rx;
            const cy = Math.min(startPos.y, currentPos.y) + ry;

            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
            ctx.stroke();
        } else if (selectedTool === 'rect') {
            const w = currentPos.x - startPos.x;
            const h = currentPos.y - startPos.y;
            ctx.strokeRect(startPos.x, startPos.y, w, h);
        } else if (selectedTool === 'arrow') {
            // Draw arrow stem
            ctx.beginPath();
            ctx.moveTo(startPos.x, startPos.y);
            ctx.lineTo(currentPos.x, currentPos.y);
            ctx.stroke();

            // Draw arrowhead
            const angle = Math.atan2(currentPos.y - startPos.y, currentPos.x - startPos.x);
            const headlen = 16;
            ctx.beginPath();
            ctx.moveTo(currentPos.x, currentPos.y);
            ctx.lineTo(
                currentPos.x - headlen * Math.cos(angle - Math.PI / 6),
                currentPos.y - headlen * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
                currentPos.x - headlen * Math.cos(angle + Math.PI / 6),
                currentPos.y - headlen * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
        }
    };

    const stopDraw = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        currentPathRef.current = [];

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const newState = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory((prev) => [...prev, newState]);
    };

    const handleUndo = () => {
        if (history.length <= 1) return;
        const newHistory = history.slice(0, -1);
        setHistory(newHistory);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.putImageData(newHistory[newHistory.length - 1], 0, 0);
    };

    const handleClear = () => {
        if (!imageObjRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imageObjRef.current, 0, 0, canvas.width, canvas.height);
        const resetState = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory([resetState]);
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.toBlob((blob) => {
            if (!blob) return;
            const file = new File([blob], `annotated_proof_${Date.now()}.jpg`, { type: 'image/jpeg' });
            const previewUrl = URL.createObjectURL(blob);
            onSave(file, previewUrl);
            onClose();
        }, 'image/jpeg', 0.9);
    };

    if (!isOpen) return null;
    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-stone-900/80 backdrop-blur-sm overflow-y-auto"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="relative w-full max-w-3xl flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150"
            >
                {/* Header */}
                <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between bg-[#FCFBF9]">
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                            <Maximize2 size={15} />
                        </span>
                        <div>
                            <h3 className="text-sm font-bold text-stone-900">
                                Damage Annotation Studio
                            </h3>
                            <p className="text-[11px] text-stone-500 font-medium">
                                Highlight chips, tears, or defective areas so the artisan and admin can clearly review
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-lg text-stone-400 hover:text-stone-700 transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="px-5 py-2.5 border-b border-stone-100 bg-stone-50/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                    {/* Tool Selection */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 shadow-2xs">
                        {TOOLS.map((tool) => {
                            const Icon = tool.icon;
                            const isActive = selectedTool === tool.id;
                            return (
                                <button
                                    key={tool.id}
                                    type="button"
                                    onClick={() => setSelectedTool(tool.id)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                                        isActive
                                            ? 'bg-clay-600 text-white shadow-xs'
                                            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                                    }`}
                                >
                                    <Icon size={12} />
                                    <span>{tool.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Color Palette */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Color:</span>
                        {COLORS.map((c) => (
                            <button
                                key={c.hex}
                                type="button"
                                onClick={() => setSelectedColor(c.hex)}
                                style={{ backgroundColor: c.hex }}
                                title={c.label}
                                className={`w-5 h-5 rounded-full border transition-transform ${
                                    selectedColor === c.hex
                                        ? 'scale-115 ring-2 ring-clay-600 border-white'
                                        : 'border-stone-300 opacity-70 hover:opacity-100'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Thickness */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Size:</span>
                        {[2, 4, 7].map((w) => (
                            <button
                                key={w}
                                type="button"
                                onClick={() => setLineWidth(w)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                                    lineWidth === w
                                        ? 'bg-stone-800 text-white border-stone-800'
                                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                                }`}
                            >
                                {w === 2 ? 'Fine' : w === 4 ? 'Med' : 'Thick'}
                            </button>
                        ))}
                    </div>

                    {/* History Actions */}
                    <div className="flex items-center gap-1.5 ml-auto">
                        <button
                            type="button"
                            onClick={handleUndo}
                            disabled={history.length <= 1}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 font-bold hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                            title="Undo last stroke"
                        >
                            <Undo2 size={12} />
                            <span>Undo</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleClear}
                            disabled={history.length <= 1}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 font-bold hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                            title="Reset all highlights"
                        >
                            <RotateCcw size={12} />
                            <span>Reset</span>
                        </button>
                    </div>
                </div>

                {/* Canvas Workspace */}
                <div
                    ref={containerRef}
                    className="p-4 bg-stone-900 flex items-center justify-center min-h-[380px] max-h-[550px] overflow-auto select-none"
                >
                    <canvas
                        ref={(el) => {
                            canvasRef.current = el;
                            if (el && imageObjRef.current && history.length === 0) {
                                initCanvas(imageObjRef.current);
                            }
                        }}
                        onMouseDown={startDraw}
                        onMouseMove={draw}
                        onMouseUp={stopDraw}
                        onMouseLeave={stopDraw}
                        onTouchStart={startDraw}
                        onTouchMove={draw}
                        onTouchEnd={stopDraw}
                        className="rounded-lg shadow-2xl cursor-crosshair max-w-full touch-none"
                    />
                </div>

                {/* Footer Actions */}
                <div className="px-5 py-3 border-t border-stone-200 bg-white flex items-center justify-between">
                    <span className="text-[11px] text-stone-400 font-medium">
                        Drag on the image to place rings, arrows, or freehand circles
                    </span>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-clay-600 hover:bg-clay-700 text-white text-xs font-bold shadow-sm transition active:scale-95"
                        >
                            <Check size={14} />
                            <span>Apply Annotations</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
