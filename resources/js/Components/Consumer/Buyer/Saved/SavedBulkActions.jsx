import React from 'react';
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
    if (!isBulkEdit) return null;

    return (
        <div className="fixed bottom-0 inset-x-0 z-50 animate-in slide-in-from-bottom-6 duration-300 ease-out md:bottom-6 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-xl md:px-4">
            <div className="flex items-center justify-between gap-3 bg-stone-900/95 backdrop-blur-xl px-5 py-3.5 border-t border-stone-800 md:border md:border-white/10 md:rounded-2xl md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.45)]">
                {/* Count indicator */}
                <p className="text-sm font-medium text-stone-200 shrink-0">
                    {selectedCount > 0 ? (
                        <span className="flex items-center gap-1.5">
                            <span className="inline-flex items-center justify-center w-5.5 h-5.5 rounded-full bg-white/10 border border-white/10 text-white text-[11px] font-bold font-sans px-1.5 py-0.5">
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
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-clay-600 px-3.5 text-xs font-bold text-white transition-all hover:bg-clay-500 hover:shadow-lg hover:shadow-clay-600/20 disabled:opacity-30 disabled:pointer-events-none active:scale-95"
                    >
                        <ShoppingCart size={13} /> 
                        <span className="hidden sm:inline">Add to Cart</span>
                    </button>
                    <button 
                        type="button"
                        onClick={onBulkCheckout}
                        disabled={!selectedCount || isProcessing}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-3.5 text-xs font-bold text-stone-950 transition-all hover:bg-stone-100 hover:shadow-lg hover:shadow-white/10 disabled:opacity-30 disabled:pointer-events-none active:scale-95"
                    >
                        <ShoppingBag size={13} /> 
                        <span className="hidden sm:inline">Checkout</span>
                    </button>
                    
                    <div className="h-6 w-px bg-white/10 mx-0.5 hidden sm:block" />

                    <button 
                        type="button"
                        onClick={onBulkRemove}
                        disabled={!selectedCount || isProcessing}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 transition-all hover:bg-rose-600 hover:text-white disabled:opacity-30 disabled:pointer-events-none active:scale-95"
                        title="Remove selected"
                    >
                        <Trash2 size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-stone-400 transition-all hover:bg-white/10 hover:text-white active:scale-95"
                        title="Cancel selection"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
