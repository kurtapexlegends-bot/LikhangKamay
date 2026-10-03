import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingCart, Trash2, X, CheckSquare } from 'lucide-react';

const formatPrice = (value) => Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export default function SavedBulkActions({
    isBulkEdit = false,
    selectedCount = 0,
    totalCount = 0,
    totalSelectedPrice = 0,
    isProcessing = false,
    onSelectAll,
    onDeselectAll,
    onBulkAddToCart,
    onBulkRemove,
    onCancel,
}) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!isBulkEdit || !mounted) return null;

    const allSelected = selectedCount > 0 && selectedCount === totalCount;

    return createPortal(
        <div className="fixed bottom-0 inset-x-0 z-[70] animate-in slide-in-from-bottom-6 duration-300 ease-out sm:bottom-6 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-2xl sm:px-4">
            <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 bg-stone-900/95 backdrop-blur-xl px-4 py-3 sm:px-5 sm:py-3.5 border-t border-stone-800 sm:border sm:rounded-2xl shadow-2xl text-white pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3.5">
                {/* Left: Count & Select All */}
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 text-xs font-bold">
                        <span className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-full bg-clay-600 text-white text-[11px] font-black">
                            {selectedCount}
                        </span>
                        <span className="text-stone-300">selected</span>
                    </span>

                    <button
                        type="button"
                        onClick={allSelected ? onDeselectAll : onSelectAll}
                        className="text-xs font-semibold text-stone-400 hover:text-white underline underline-offset-2 transition-colors"
                    >
                        {allSelected ? 'Deselect All' : `Select All (${totalCount})`}
                    </button>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 ml-auto">
                    {/* Bulk Add to Cart with subtotal */}
                    <button
                        type="button"
                        onClick={onBulkAddToCart}
                        disabled={selectedCount === 0 || isProcessing}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-clay-600 hover:bg-clay-700 px-3.5 text-xs font-bold text-white transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                    >
                        {isProcessing ? (
                            <svg className="animate-spin w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                        ) : (
                            <ShoppingCart size={13} />
                        )}
                        <span>Add to Cart</span>
                        {totalSelectedPrice > 0 && (
                            <span className="opacity-80 text-[11px] font-normal hidden md:inline">
                                (PHP {formatPrice(totalSelectedPrice)})
                            </span>
                        )}
                    </button>

                    {/* Bulk Remove */}
                    <button
                        type="button"
                        onClick={onBulkRemove}
                        disabled={selectedCount === 0 || isProcessing}
                        className="inline-flex h-9 items-center justify-center gap-1 px-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-600 hover:text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                        title="Remove selected items"
                    >
                        <Trash2 size={13} />
                        <span className="hidden sm:inline">Remove</span>
                    </button>

                    <div className="h-5 w-px bg-stone-700 mx-1 hidden sm:block" />

                    {/* Cancel / Done */}
                    <button
                        type="button"
                        onClick={onCancel}
                        className="inline-flex h-9 items-center gap-1 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-bold transition-colors active:scale-95"
                    >
                        <span>Done</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
