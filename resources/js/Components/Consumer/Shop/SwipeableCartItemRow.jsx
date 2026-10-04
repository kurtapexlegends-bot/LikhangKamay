import React, { useState, useRef } from 'react';
import { Link } from '@inertiajs/react';
import { Check, Minus, Plus, Trash2, Loader2 } from 'lucide-react';

/**
 * SwipeableCartItemRow
 * Displays an individual cart item row with touch swipe-to-action on mobile devices
 * and standard responsive grid layout on desktop.
 */
export default function SwipeableCartItemRow({
    item,
    cartKey,
    isSelected,
    onToggle,
    onRemove,
    onUpdateQty,
    isRemoving,
    isUpdating,
    currency
}) {
    const [translateX, setTranslateX] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const isHorizontalSwipe = useRef(null);

    const SWIPE_ACTION_WIDTH = 80;

    const handleTouchStart = (e) => {
        if (!e.touches || e.touches.length !== 1) return;
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        isHorizontalSwipe.current = null;
        setIsDragging(true);
    };

    const handleTouchMove = (e) => {
        if (!isDragging || !e.touches || e.touches.length !== 1) return;
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const deltaX = currentX - touchStartX.current;
        const deltaY = currentY - touchStartY.current;

        // Determine swipe orientation if not yet decided
        if (isHorizontalSwipe.current === null) {
            if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
                isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
            }
        }

        // If not a horizontal swipe, allow vertical native scrolling
        if (!isHorizontalSwipe.current) return;

        // Calculate clamped translation
        const baseOffset = isOpen ? -SWIPE_ACTION_WIDTH : 0;
        let newX = baseOffset + deltaX;

        // Apply resistance when swiping past limits
        if (newX > 0) {
            newX = Math.min(newX * 0.2, 16);
        } else if (newX < -SWIPE_ACTION_WIDTH) {
            const overshoot = newX + SWIPE_ACTION_WIDTH;
            newX = -SWIPE_ACTION_WIDTH + overshoot * 0.2;
        }

        setTranslateX(newX);
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        if (!isHorizontalSwipe.current) return;

        // Snap open if swiped past threshold (-40px), otherwise snap closed
        if (translateX < -35) {
            setTranslateX(-SWIPE_ACTION_WIDTH);
            setIsOpen(true);
        } else {
            setTranslateX(0);
            setIsOpen(false);
        }
        isHorizontalSwipe.current = null;
    };

    const closeSwipe = () => {
        setTranslateX(0);
        setIsOpen(false);
    };

    const minQty = (item.is_b2b_supply && item.moq) ? Number(item.moq) : 1;

    return (
        <div className="relative overflow-hidden border-b border-gray-100 last:border-b-0">
            {/* Background Revealed Action on Mobile */}
            <div className="absolute inset-y-0 right-0 w-20 flex sm:hidden items-center justify-center bg-rose-600 text-white z-0">
                <button
                    type="button"
                    onClick={() => {
                        closeSwipe();
                        onRemove(cartKey);
                    }}
                    disabled={isRemoving}
                    className="w-full h-full flex flex-col items-center justify-center gap-1 active:bg-rose-700 transition"
                    aria-label={`Remove ${item.name} from cart`}
                >
                    {isRemoving ? (
                        <Loader2 size={18} className="animate-spin text-white" />
                    ) : (
                        <>
                            <Trash2 size={18} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Delete</span>
                        </>
                    )}
                </button>
            </div>

            {/* Sliding Foreground Card */}
            <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    transform: translateX !== 0 ? `translateX(${translateX}px)` : undefined,
                    transitionProperty: isDragging ? 'none' : 'transform',
                    transitionDuration: isDragging ? '0ms' : '200ms'
                }}
                className={`relative z-10 grid grid-cols-1 gap-3 px-4 py-4 items-center bg-white sm:grid-cols-12 sm:gap-4 sm:transform-none ${
                    isRemoving ? 'opacity-50' : ''
                } ${!isSelected ? 'bg-gray-50/40' : ''}`}
            >
                {/* Product Info with Checkbox */}
                <div className="sm:col-span-6 flex gap-3 items-start">
                    <button
                        type="button"
                        onClick={() => {
                            if (isOpen) closeSwipe();
                            else onToggle(cartKey);
                        }}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition flex-shrink-0 mt-1 ${
                            isSelected 
                                ? 'bg-clay-600 border-clay-600 text-white' 
                                : 'border-gray-300 hover:border-clay-400'
                        }`}
                        aria-label={isSelected ? 'Deselect item' : 'Select item'}
                    >
                        {isSelected && <Check size={12} />}
                    </button>

                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        <img 
                            src={item.img ? (item.img.startsWith('http') || item.img.startsWith('/storage') ? item.img : `/storage/${item.img}`) : '/images/no-image.png'} 
                            alt={item.name} 
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.src = '/images/no-image.png'; }}
                        />
                    </div>

                    <div className="min-w-0 flex-1">
                        {item.slug ? (
                            <Link
                                href={route('product.show', item.slug)}
                                className="text-sm font-medium text-gray-900 hover:text-clay-600 transition line-clamp-2"
                            >
                                {item.name}
                            </Link>
                        ) : (
                            <span className="text-sm font-medium text-gray-500 line-clamp-2">
                                {item.name}
                            </span>
                        )}
                        <p className="text-xs text-gray-400 mt-1">SKU: {item.sku || 'Unavailable'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Variant: {item.variant || 'Standard'}</p>

                        {/* Inline button as mobile backup if swipe isn't used */}
                        <button 
                            type="button"
                            onClick={() => onRemove(cartKey)}
                            disabled={isRemoving}
                            className="text-xs text-red-500 hover:text-red-700 mt-1.5 flex items-center gap-1 sm:hidden font-medium"
                        >
                            {isRemoving ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            <span>Remove</span>
                        </button>
                    </div>
                </div>

                {/* Unit Price */}
                <div className="sm:col-span-2 flex items-center justify-between sm:block sm:text-center">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 sm:hidden">Unit Price</span>
                    <div>
                        <span className="text-sm font-bold text-clay-700">{currency.format(Number(item.price) || 0)}</span>
                        {(item.has_discount || item.discount_info || (item.original_price && item.original_price > item.price)) && (
                            <div className="text-[10px] text-gray-400 line-through">
                                {currency.format(Number(item.original_price || item.discount_info?.original_price) || 0)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quantity */}
                <div className="sm:col-span-2 flex items-center justify-between sm:block">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 sm:hidden">Quantity</span>
                    <div className="flex justify-end sm:justify-center">
                        <div className="flex items-center border border-gray-200 rounded">
                            <button
                                type="button"
                                onClick={() => onUpdateQty(cartKey, item.qty, -1, minQty)}
                                disabled={item.qty <= minQty || isUpdating}
                                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <Minus size={12} />
                            </button>
                            <span className="w-8 text-center text-sm font-medium text-gray-900">
                                {isUpdating ? <Loader2 size={12} className="animate-spin mx-auto" /> : item.qty}
                            </span>
                            <button
                                type="button"
                                onClick={() => onUpdateQty(cartKey, item.qty, 1, minQty)}
                                disabled={isUpdating}
                                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                            >
                                <Plus size={12} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Total & Desktop Delete */}
                <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 sm:hidden">Total</span>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-clay-600">
                            {currency.format((Number(item.price) || 0) * (Number(item.qty) || 0))}
                        </span>
                        <button 
                            type="button"
                            onClick={() => onRemove(cartKey)}
                            disabled={isRemoving}
                            className="hidden sm:flex w-7 h-7 items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                            title="Remove from cart"
                        >
                            {isRemoving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
