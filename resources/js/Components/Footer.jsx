import React from 'react';
import { Link } from '@inertiajs/react';

export default function Footer() {
    return (
        <footer className="bg-white border-t border-gray-100 py-6 mt-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
                <div className="col-span-1 md:col-span-2 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                         <img src="/images/logo.png" className="h-8 w-auto" alt="Small Logo" />
                         <span className="font-serif text-xl font-bold text-gray-900">LikhangKamay</span>
                    </div>
                    <p className="text-gray-500 max-w-xs leading-relaxed mx-auto md:mx-0">
                        A digital home for Cavite’s pottery community. Connecting artisans with admirers through technology and tradition.
                    </p>
                </div>
                <div className="text-center md:text-left">
                    <h4 className="font-bold text-gray-900 mb-4 uppercase tracking-wider text-xs">Platform</h4>
                    <div className="flex flex-col gap-3 text-gray-500">
                        <Link href={route('shop.index')} className="hover:text-clay-600 transition">Shop Ceramics</Link>
                        {/* <Link href="#" className="hover:text-clay-600 transition">Book Workshops</Link> */}
                        <Link href="/artisan/register" className="hover:text-clay-600 transition">Sell on LikhangKamay</Link>
                    </div>
                </div>
                <div className="text-center md:text-left">
                    <h4 className="font-bold text-gray-900 mb-4 uppercase tracking-wider text-xs">Support</h4>
                    <div className="flex flex-col gap-3 text-gray-500">
                        <Link href={route('seller.agreement')} className="hover:text-clay-600 transition">Seller Agreement</Link>
                        <Link href={route('privacy')} className="hover:text-clay-600 transition">Privacy Policy</Link>
                        <Link href={route('terms')} className="hover:text-clay-600 transition">Terms of Service</Link>
                    </div>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 pt-6 border-t border-gray-50 text-center text-xs text-gray-400">
                © {new Date().getFullYear()} LikhangKamay. All rights reserved.
            </div>
        </footer>
    );
}
