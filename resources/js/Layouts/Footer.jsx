import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
    const { platform } = usePage().props;

    return (
        <footer className="bg-white border-t border-gray-100 py-10 mt-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
                <div className="col-span-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                         <img src={platform.logo} className="h-8 w-auto" alt="Small Logo" />
                         <span className="font-serif text-xl font-bold text-gray-900">{platform.name}</span>
                    </div>
                    <p className="text-gray-500 leading-relaxed mx-auto md:mx-0 max-w-xs text-xs">
                        {platform.seo.description}
                    </p>
                </div>
                <div className="text-center md:text-left">
                    <h4 className="font-bold text-gray-900 mb-4 uppercase tracking-wider text-xs">Platform</h4>
                    <div className="flex flex-col gap-3 text-gray-500">
                        <Link href={route('shop.index')} className="hover:text-clay-600 transition">Shop Ceramics</Link>
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
                <div className="text-center md:text-left">
                    <h4 className="font-bold text-gray-900 mb-4 uppercase tracking-wider text-xs">Contact Us</h4>
                    <div className="flex flex-col gap-3 text-gray-500 text-xs">
                        {platform.contact?.email && (
                            <a href={`mailto:${platform.contact.email}`} className="flex items-center justify-center md:justify-start gap-2 hover:text-clay-600 transition">
                                <Mail size={14} className="text-stone-400 shrink-0" />
                                <span className="truncate">{platform.contact.email}</span>
                            </a>
                        )}
                        {platform.contact?.phone && (
                            <a href={`tel:${platform.contact.phone}`} className="flex items-center justify-center md:justify-start gap-2 hover:text-clay-600 transition">
                                <Phone size={14} className="text-stone-400 shrink-0" />
                                <span>{platform.contact.phone}</span>
                            </a>
                        )}
                        {platform.contact?.address && (
                            <div className="flex items-start justify-center md:justify-start gap-2">
                                <MapPin size={14} className="text-stone-400 shrink-0 mt-0.5" />
                                <span className="leading-relaxed text-left">{platform.contact.address}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 pt-6 border-t border-gray-50 text-center text-xs text-gray-400">
                © {new Date().getFullYear()} {platform.name}. All rights reserved.
            </div>
        </footer>
    );
}
