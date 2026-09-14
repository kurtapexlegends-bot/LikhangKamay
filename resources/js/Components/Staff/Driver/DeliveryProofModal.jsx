import React, { useState, useRef, useEffect } from 'react';
import Modal from '@/Components/Modal';
import { Camera, X, LoaderCircle, CheckCircle2, PenLine, RotateCcw } from 'lucide-react';

export default function DeliveryProofModal({
    isOpen,
    onClose,
    delivery,
    onSubmit,
    isSubmitting = false,
}) {
    const [podPhoto, setPodPhoto] = useState(null);
    const [podPreview, setPodPreview] = useState(null);
    const [podNotes, setPodNotes] = useState('');
    const [hasSignature, setHasSignature] = useState(false);
    const signatureCanvasRef = useRef(null);
    const isDrawingRef = useRef(false);

    useEffect(() => {
        if (!isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPodPhoto(null);
            setPodPreview(null);
            setPodNotes('');
            setHasSignature(false);
        }
    }, [isOpen]);

    useEffect(() => {
        return () => {
            if (podPreview?.startsWith('blob:')) {
                URL.revokeObjectURL(podPreview);
            }
        };
    }, [podPreview]);

    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (podPreview?.startsWith('blob:')) {
                URL.revokeObjectURL(podPreview);
            }
            setPodPhoto(file);
            setPodPreview(URL.createObjectURL(file));
        }
    };

    const getCanvasCoordinates = (e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
        const scaleX = canvas.width / (rect.width || 1);
        const scaleY = canvas.height / (rect.height || 1);
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    };

    // Simple canvas signature pad
    const startDrawing = (e) => {
        const canvas = signatureCanvasRef.current;
        if (!canvas) return;
        isDrawingRef.current = true;
        const ctx = canvas.getContext('2d');
        const coords = getCanvasCoordinates(e, canvas);
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
    };

    const draw = (e) => {
        if (!isDrawingRef.current) return;
        const canvas = signatureCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const coords = getCanvasCoordinates(e, canvas);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#292524';
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
        if (!hasSignature) setHasSignature(true);
    };

    const stopDrawing = () => {
        isDrawingRef.current = false;
    };

    const clearSignature = () => {
        const canvas = signatureCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!delivery) return;

        let signatureDataUrl = null;
        if (hasSignature && signatureCanvasRef.current) {
            signatureDataUrl = signatureCanvasRef.current.toDataURL('image/png');
        }

        onSubmit({
            delivery,
            podPhoto,
            podNotes,
            signatureDataUrl,
        });
    };

    if (!isOpen || !delivery) return null;

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="lg">
            <form onSubmit={handleSubmit} className="p-6 bg-white rounded-2xl">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                            <Camera size={18} />
                        </div>
                        <h3 className="text-sm font-bold text-stone-900">
                            Proof of Delivery: Order #{delivery.order_number}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-stone-400 hover:text-stone-700 rounded-lg p-1 hover:bg-stone-100 transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Capture Photo Proof */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                            Capture Photo Proof (Required)
                        </label>
                        <div className="relative border-2 border-dashed border-stone-300 rounded-2xl p-4 text-center hover:border-stone-400 transition bg-stone-50/50">
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handlePhotoChange}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                            {podPreview ? (
                                <div className="space-y-2">
                                    <img
                                        src={podPreview}
                                        alt="Proof Preview"
                                        className="max-h-48 mx-auto rounded-xl object-cover shadow-xs"
                                    />
                                    <p className="text-[11px] font-bold text-clay-700">
                                        Tap to retake photo
                                    </p>
                                </div>
                            ) : (
                                <div className="py-6 flex flex-col items-center justify-center text-stone-400">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-stone-200 text-stone-500 mb-2 shadow-2xs">
                                        <Camera size={22} />
                                    </div>
                                    <p className="text-xs font-bold text-stone-700">
                                        Take Photo / Upload Proof
                                    </p>
                                    <p className="text-[10px] text-stone-400 mt-0.5">
                                        Photo of parcel delivered to customer or doorstep
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Touch / Stylus Customer Signature Canvas (Optional) */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                                <PenLine size={12} className="text-clay-600" />
                                <span>Customer Signature (Optional)</span>
                            </label>
                            {hasSignature && (
                                <button
                                    type="button"
                                    onClick={clearSignature}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-500 hover:text-stone-800 transition"
                                >
                                    <RotateCcw size={10} />
                                    <span>Clear</span>
                                </button>
                            )}
                        </div>
                        <div className="border border-stone-200 rounded-xl bg-stone-50/60 overflow-hidden relative touch-none">
                            <canvas
                                ref={signatureCanvasRef}
                                width={400}
                                height={90}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                                className="w-full h-24 cursor-crosshair bg-white"
                            />
                            {!hasSignature && (
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-stone-300 text-xs font-medium">
                                    Sign here on touchscreen or drag
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Delivery Notes */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                            Delivery Remarks (Optional)
                        </label>
                        <textarea
                            rows={2}
                            value={podNotes}
                            onChange={(e) => setPodNotes(e.target.value)}
                            placeholder="e.g. Received by buyer at gate, or left with security reception..."
                            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-medium text-stone-800 focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100 mt-5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!podPhoto || isSubmitting}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition disabled:opacity-50 shadow-xs"
                    >
                        {isSubmitting ? (
                            <LoaderCircle size={14} className="animate-spin" />
                        ) : (
                            <CheckCircle2 size={14} />
                        )}
                        <span>{isSubmitting ? "Submitting..." : "Confirm Delivery"}</span>
                    </button>
                </div>
            </form>
        </Modal>
    );
}
