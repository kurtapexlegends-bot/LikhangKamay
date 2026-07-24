import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingBag, ShoppingCart, Trash2, X } from 'lucide-react';

export default function SavedBulkActions({
    isBulkEdit,
    selectedCount,
    isProcessing,
    onBulkAddToCart,
    onBulkCheckout,
    onBulkRemove,
    onCancel,
}) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!isBulkEdit || !mounted) return null;

    return createPortal(
        <div className="fixed bottom-0 inset-x-0 z-50 animate-in slide-in-from-bottom-6 duration-300 ease-out md:bottom-6 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-xl md:px-4">
            <div className="flex items-center justify-between gap-3 bg-white/95 backdrop-blur-xl px-5 py-3.5 border-t border-stone-200 md:border md:border-stone-200/60 md:rounded-2xl shadow-[0_-8px_30px_rgba(27,27,27,0.06),0_15px_30px_rgba(0,0,0,0.04)] md:shadow-[0_20px_50px_rgba(27,27,27,0.12)]">
                {/* Count indicator */}
                <p className="text-sm font-medium text-stone-700 shrink-0">
                    {selectedCount > 0 ? (
                        <span className="flex items-center gap-1.5">
                            <span className="inline-flex items-center justify-center w-5.5 h-5.5 rounded-full bg-clay-50 border border-clay-100 text-clay-700 text-[11px] font-bold font-sans px-1.5 py-0.5">
                                {selectedCount}
                            </span> 
                            <span>selected</span>
                        </span>
                    ) : (
                        <span className="text-stone-400 text-xs">Tap items to select</span>
                    )}
                </p>

                {/* Actions container */}
                <div className="flex items-center gap-2">
                    <button 
                        type="button"
                        onClick={onBulkAddToCart}
                        disabled={!selectedCount || isProcessing}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-clay-650 px-3.5 text-xs font-bold text-white transition-all hover:bg-clay-700 hover:shadow-lg hover:shadow-clay-650/20 disabled:opacity-30 disabled:pointer-events-none active:scale-95"
                    >
                        <ShoppingCart size={13} /> 
                        <span className="hidden sm:inline">Add to Cart</span>
                    </button>
                    <button 
                        type="button"
                        onClick={onBulkCheckout}
                        disabled={!selectedCount || isProcessing}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-stone-950 px-3.5 text-xs font-bold text-white transition-all hover:bg-stone-900 hover:shadow-lg hover:shadow-stone-950/15 disabled:opacity-30 disabled:pointer-events-none active:scale-95"
                    >
                        <ShoppingBag size={13} /> 
                        <span className="hidden sm:inline">Checkout</span>
                    </button>
                    
                    <div className="h-6 w-px bg-stone-200 mx-0.5 hidden sm:block" />

                    <button 
                        type="button"
                        onClick={onBulkRemove}
                        disabled={!selectedCount || isProcessing}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition-all hover:bg-rose-600 hover:text-white disabled:opacity-30 disabled:pointer-events-none active:scale-95"
                        title="Remove selected"
                    >
                        <Trash2 size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-500 transition-all hover:bg-stone-100 hover:text-stone-700 active:scale-95"
                        title="Cancel selection"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
