import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { Store, AlertTriangle } from 'lucide-react';

export function CheckoutEmptyCartState() {
    return (
        <div className="min-h-screen bg-stone-50/50 px-4 py-16 flex items-center justify-center font-sans">
            <Head title="Cart Empty - Checkout" />
            <div className="max-w-md w-full rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto w-12 h-12 rounded-full bg-clay-50 flex items-center justify-center text-clay-600 mb-4">
                    <Store size={24} />
                </div>
                <h2 className="text-lg font-bold text-stone-900">Your checkout is empty</h2>
                <p className="text-xs text-stone-500 mt-1 mb-6">
                    All items have been removed from this checkout session.
                </p>
                <Link
                    href={route('cart.index')}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-clay-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-clay-700 transition"
                >
                    Return to Cart
                </Link>
            </div>
        </div>
    );
}

export function CheckoutAdminRestrictedState() {
    return (
        <div className="min-h-screen bg-stone-50/50 px-4 py-16 flex items-center justify-center font-sans">
            <div className="max-w-md w-full rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-4">
                    <AlertTriangle size={24} />
                </div>
                <h2 className="text-lg font-bold text-stone-900">Admin Account Detected</h2>
                <p className="text-xs text-stone-500 mt-1 mb-6">
                    Administrators are restricted from placing commercial marketplace orders to maintain strict platform neutrality.
                </p>
                <Link
                    href={route('admin.dashboard')}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-stone-900 py-3 text-sm font-bold text-white shadow-sm hover:bg-stone-800 transition"
                >
                    Back to Admin Dashboard
                </Link>
            </div>
        </div>
    );
}
