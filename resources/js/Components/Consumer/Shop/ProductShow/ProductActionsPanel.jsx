import React from 'react';
import { Minus, Plus, Loader2, Check, ShoppingCart } from 'lucide-react';

export default function ProductActionsPanel({
    product,
    quantity,
    setQuantity,
    isPendingArtisan,
    auth,
    addToCart,
    isAddingToCart,
    addedToCart,
    handleBuyNow,
}) {
    const isAdmin = auth?.user?.role === 'super_admin' || auth?.user?.role === 'admin';

    return (
        <div className="p-3.5 sm:p-5 lg:col-span-7 !pt-0">
            {/* Quantity */}
            <div className="mb-5 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide w-full sm:w-24 flex-shrink-0">Quantity</span>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <div className="flex items-center">
                        <button
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            aria-label="Decrease quantity"
                            className="flex h-11 w-11 items-center justify-center rounded-l-xl border border-stone-200 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/20 sm:h-8 sm:w-8 sm:rounded-l-lg"
                        >
                            <Minus size={16} className="sm:w-3.5 sm:h-3.5" />
                        </button>
                        <span className="flex h-11 w-14 items-center justify-center border-y border-stone-200 text-base font-bold text-stone-900 sm:h-8 sm:w-10 sm:text-xs">
                            {quantity}
                        </span>
                        <button
                            onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))}
                            aria-label="Increase quantity"
                            className="flex h-11 w-11 items-center justify-center rounded-r-xl border border-stone-200 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/20 sm:h-8 sm:w-8 sm:rounded-r-lg"
                        >
                            <Plus size={16} className="sm:w-3.5 sm:h-3.5" />
                        </button>
                    </div>
                    <span className="text-[11px] font-medium text-gray-500 sm:ml-3">{product.stock || 0} in stock</span>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="mb-6 hidden gap-3 sm:flex sm:flex-row">
                {isPendingArtisan ? (
                    <div className="flex w-full items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-[13px] font-bold text-amber-700 shadow-sm">
                        Purchasing is disabled while your shop application is under review.
                    </div>
                ) : isAdmin ? (
                    <div className="flex w-full items-center justify-center rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-center text-[13px] font-bold text-stone-700 shadow-sm">
                        Purchasing is disabled for administrator accounts.
                    </div>
                ) : (
                    <>
                        <button
                            onClick={addToCart}
                            disabled={product.stock === 0 || isAddingToCart}
                            className={`flex h-11 sm:h-10 flex-1 items-center justify-center gap-2 rounded-lg border-2 border-clay-600 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30 ${
                                addedToCart
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : 'bg-white text-clay-600 hover:bg-clay-50'
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                            {isAddingToCart ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : addedToCart ? (
                                <><Check size={16} /> Added!</>
                            ) : (
                                <><ShoppingCart size={16} /> Add To Cart</>
                            )}
                        </button>
                        <button
                            onClick={handleBuyNow}
                            disabled={product.stock === 0}
                            className="h-11 sm:h-10 flex-1 rounded-lg bg-clay-600 text-sm font-bold text-white shadow-sm shadow-clay-200 transition-colors hover:bg-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Buy Now
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
