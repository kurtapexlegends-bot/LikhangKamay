import React from 'react';
import { Link } from '@inertiajs/react';
import { ShoppingCart } from 'lucide-react';

export default function BuyerCartDropdown({ localCartCount = 0, isMobile = false }) {
    if (isMobile) {
        return (
            <Link
                href={route('cart.index')}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-500 hover:text-clay-600 active:scale-90 transition-transform rounded-full hover:bg-stone-50 relative"
                id="mobile-cart-icon-nav"
                aria-label="View Cart"
            >
                <ShoppingCart size={20} strokeWidth={2} className="cart-icon-svg" />
                {localCartCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-clay-600 text-[8px] font-black text-white shadow-sm ring-2 ring-white cart-badge">
                        {localCartCount}
                    </span>
                )}
            </Link>
        );
    }

    return (
        <Link 
            id="navbar-cart-icon"
            href={route('cart.index')} 
            className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-clay-600 hover:bg-clay-50 rounded-full transition-all active:scale-95 group relative"
            aria-label="View Shopping Cart"
        >
            <div className="relative inline-flex">
                <ShoppingCart size={20} className="group-hover:scale-110 transition-transform cart-icon-svg" />
                {localCartCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[8px] font-bold leading-none text-white shadow-sm transition-transform duration-300 cart-badge">
                        {localCartCount}
                    </span>
                )}
            </div>
        </Link>
    );
}
